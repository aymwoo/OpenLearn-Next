import { parse } from "node:url";
import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { Socket } from "node:net";

import { WebSocketServer, type WebSocket } from "ws";
import { z } from "zod";

import { RuntimeTeacherControlRequestSchema } from "@/features/runtime-platform/contracts/bridge";
import { recordTeacherControlEvent } from "@/features/runtime-platform/classroom/runtime-session";
import {
  applyWebSocketTeacherControlForActor,
  getClassroomSnapshotForActor,
} from "@/lib/dal/classroom";

import { recordTransportConsumerTrace } from "./gateway";
import {
  ClassroomWebSocketHandshakeError,
  authenticateClassroomWebSocket,
} from "./ws-auth";
import { classroomRedisFanoutManager } from "./redis-fanout-manager";
import { classroomWebSocketConnectionRegistry } from "./ws-connection-registry";
import {
  ClassroomWebSocketClientEnvelopeSchema,
  buildClassroomWebSocketServerEnvelope,
} from "./ws-envelope";

type ClassroomWebSocketContext = Awaited<
  ReturnType<typeof authenticateClassroomWebSocket>
> & {
  sessionId: string;
};

const TeacherControlPayloadSchema = z.object({
  command: z.enum(["focus-step", "lock", "unlock", "set-slide"]),
  expectedVersion: z.number().int().nonnegative(),
  targetStepId: z.string().min(1).optional(),
  slideIndex: z.number().int().nonnegative().optional(),
}).strict();

const RuntimeCommandPayloadSchema = z.object({
  requestKind: z.literal("runtime-teacher-control"),
  runtimeInstanceId: z.string().min(1),
  bridge: RuntimeTeacherControlRequestSchema,
}).strict();

function onSocketError() {
  // Swallow handshake-time socket noise; the server returns explicit HTTP status codes.
}

function matchesClassroomWebSocketPath(pathname: string | null | undefined) {
  return Boolean(pathname?.startsWith("/api/ws/classroom/"));
}

function extractSessionIdFromPath(pathname: string | null | undefined) {
  if (!pathname) {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  const sessionId = segments.at(-1);

  return sessionId && sessionId !== "classroom" ? sessionId : null;
}

function writeUpgradeFailure(
  socket: IncomingMessage["socket"],
  status: number,
  reason: string,
) {
  socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

function buildTransportErrorEnvelope(
  context: ClassroomWebSocketContext,
  input: {
    code: string;
    correlationId?: string;
    requestId?: string;
    payload?: Record<string, unknown>;
  },
) {
  return buildClassroomWebSocketServerEnvelope({
    sessionId: context.sessionId,
    actor: {
      userId: context.userId,
      scope: context.actorScope,
      schoolId: context.schoolId,
      workspaceRole: context.workspaceRole,
    },
    kind: "transport.error",
    correlationId: input.correlationId ?? crypto.randomUUID(),
    requestId: input.requestId,
    payload: {
      code: input.code,
      ...input.payload,
    },
    truthPersisted: false,
  });
}

async function sendClassroomSnapshot(
  ws: WebSocket,
  context: ClassroomWebSocketContext,
  correlationId: string,
  snapshotOverride?: Awaited<ReturnType<typeof getClassroomSnapshotForActor>>,
) {
  const snapshot = snapshotOverride ?? await getClassroomSnapshotForActor({
    sessionId: context.sessionId,
    actorId: context.userId,
    actorScope: context.actorScope,
    schoolId: context.schoolId,
  });
  const envelope = buildClassroomWebSocketServerEnvelope({
    sessionId: context.sessionId,
    actor: {
      userId: context.userId,
      scope: context.actorScope,
      schoolId: context.schoolId,
      workspaceRole: context.workspaceRole,
    },
    kind: "classroom.snapshot",
    correlationId,
    payload: {
      snapshot,
      version: snapshot.version,
      status: snapshot.status,
    },
  });

  ws.send(JSON.stringify(envelope));
  await recordTransportConsumerTrace({
    sessionId: context.sessionId,
    correlationId,
    adapterId: "transport-websocket-adapter",
    adapterMode: "websocket",
    traceType: "snapshot",
    status: "emitted",
    snapshotVersion: snapshot.version,
    detail: {
      status: snapshot.status,
      actorScope: context.actorScope,
    },
  });
}

export async function handleClassroomWebSocketClientMessage(
  raw: string,
  ws: WebSocket,
  context: ClassroomWebSocketContext,
) {
  let decoded: unknown;

  try {
    decoded = JSON.parse(raw);
  } catch {
    ws.send(JSON.stringify(buildTransportErrorEnvelope(context, {
      code: "WEBSOCKET_PAYLOAD_INVALID",
    })));
    return;
  }

  const parsed = ClassroomWebSocketClientEnvelopeSchema.safeParse(decoded);
  if (!parsed.success) {
    ws.send(JSON.stringify(buildTransportErrorEnvelope(context, {
      code: "WEBSOCKET_PAYLOAD_INVALID",
    })));
    return;
  }

  if (parsed.data.kind === "transport.keepalive") {
    const correlationId = parsed.data.correlation.correlationId;
    const keepalive = buildClassroomWebSocketServerEnvelope({
      sessionId: context.sessionId,
      actor: {
        userId: context.userId,
        scope: context.actorScope,
        schoolId: context.schoolId,
        workspaceRole: context.workspaceRole,
      },
      kind: "transport.keepalive",
      correlationId,
      requestId: parsed.data.messageId,
      payload: {
        acknowledged: true,
      },
      truthPersisted: false,
    });
    ws.send(JSON.stringify(keepalive));
    await recordTransportConsumerTrace({
      sessionId: context.sessionId,
      correlationId,
      adapterId: "transport-websocket-adapter",
      adapterMode: "websocket",
      traceType: "keepalive",
      status: "emitted",
      detail: {
        actorScope: context.actorScope,
      },
    });
    return;
  }

  if (context.actorScope !== "teacher") {
    ws.send(JSON.stringify(buildTransportErrorEnvelope(context, {
      code: "WEBSOCKET_UNAUTHORIZED",
      correlationId: parsed.data.correlation.correlationId,
      requestId: parsed.data.messageId,
    })));
    return;
  }

  if (parsed.data.kind === "teacher.control") {
    const controlPayload = TeacherControlPayloadSchema.safeParse(parsed.data.payload);
    if (!controlPayload.success) {
      ws.send(JSON.stringify(buildTransportErrorEnvelope(context, {
        code: "WEBSOCKET_PAYLOAD_INVALID",
        correlationId: parsed.data.correlation.correlationId,
        requestId: parsed.data.messageId,
      })));
      return;
    }

    const result = await applyWebSocketTeacherControlForActor({
      sessionId: context.sessionId,
      actorId: context.userId,
      schoolId: context.schoolId,
      command: controlPayload.data.command,
      expectedVersion: controlPayload.data.expectedVersion,
      targetStepId: controlPayload.data.targetStepId,
      slideIndex: controlPayload.data.slideIndex,
    });

    if (!result.ok) {
      if (result.error === "VERSION_CONFLICT" && result.snapshot) {
        await sendClassroomSnapshot(
          ws,
          context,
          parsed.data.correlation.correlationId,
          result.snapshot,
        );
        return;
      }

      ws.send(JSON.stringify(buildTransportErrorEnvelope(context, {
        code: result.error ?? "WEBSOCKET_MESSAGE_FAILED",
        correlationId: parsed.data.correlation.correlationId,
        requestId: parsed.data.messageId,
      })));
      return;
    }

    if (result.snapshot) {
      await sendClassroomSnapshot(
        ws,
        context,
        parsed.data.correlation.correlationId,
        result.snapshot,
      );
    }
    return;
  }

  const runtimePayload = RuntimeCommandPayloadSchema.safeParse(parsed.data.payload);
  if (!runtimePayload.success) {
    ws.send(JSON.stringify(buildTransportErrorEnvelope(context, {
      code: "WEBSOCKET_PAYLOAD_INVALID",
      correlationId: parsed.data.correlation.correlationId,
      requestId: parsed.data.messageId,
    })));
    return;
  }

  const result = await recordTeacherControlEvent({
    actor: {
      actorId: context.userId,
      actorScope: "teacher",
      schoolId: context.schoolId,
      capabilities: ["runtime:host-action:request"],
      hostPermissions: ["host:classroom:control"],
    },
    payload: runtimePayload.data.bridge,
    messageId: parsed.data.messageId,
    correlationId: parsed.data.correlation.correlationId,
    runtimeInstanceId: runtimePayload.data.runtimeInstanceId,
  });

  const runtimeEventEnvelope = buildClassroomWebSocketServerEnvelope({
    sessionId: context.sessionId,
    actor: {
      userId: context.userId,
      scope: context.actorScope,
      schoolId: context.schoolId,
      workspaceRole: context.workspaceRole,
    },
    kind: "runtime.event",
    correlationId: parsed.data.correlation.correlationId,
    requestId: parsed.data.messageId,
    payload: {
      kind: "runtime.teacher-control",
      requestKind: runtimePayload.data.requestKind,
      runtimeInstanceId: runtimePayload.data.runtimeInstanceId,
      recordedEventId: result.recordedEventId,
      runtimeSessionId: result.sessionId,
      classroomSessionId: result.classroomSessionId,
      applied: result.applied,
    },
  });
  ws.send(JSON.stringify(runtimeEventEnvelope));
  await recordTransportConsumerTrace({
    sessionId: context.sessionId,
    correlationId: parsed.data.correlation.correlationId,
    adapterId: "transport-websocket-adapter",
    adapterMode: "websocket",
    traceType: "runtime_event",
    status: "emitted",
    detail: {
      requestKind: runtimePayload.data.requestKind,
      runtimeInstanceId: runtimePayload.data.runtimeInstanceId,
    },
  });
}

class ClassroomWebSocketTransportServer {
  private readonly server = new WebSocketServer({ noServer: true });
  private initialized = false;

  initialize(httpServer: HttpServer) {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    httpServer.on("upgrade", async (request, socket, head) => {
      const upgradeSocket = socket as Socket;
      upgradeSocket.on("error", onSocketError);
      const { pathname } = parse(request.url ?? "", true);

      if (!matchesClassroomWebSocketPath(pathname)) {
        return;
      }

      const sessionId = extractSessionIdFromPath(pathname);
      if (!sessionId) {
        writeUpgradeFailure(upgradeSocket, 400, "Bad Request");
        return;
      }

      try {
        const auth = await authenticateClassroomWebSocket(request, sessionId);

        upgradeSocket.removeListener("error", onSocketError);

        this.server.handleUpgrade(request, upgradeSocket, head, (ws) => {
          this.server.emit("connection", ws, request, {
            ...auth,
            sessionId,
          } satisfies ClassroomWebSocketContext);
        });
      } catch (error) {
        if (error instanceof ClassroomWebSocketHandshakeError) {
          writeUpgradeFailure(upgradeSocket, error.status, error.code);
          return;
        }

        writeUpgradeFailure(upgradeSocket, 500, "WEBSOCKET_HANDSHAKE_FAILED");
      }
    });

    this.server.on(
      "connection",
      async (ws: WebSocket, _request: IncomingMessage, context: ClassroomWebSocketContext) => {
        const connection = classroomWebSocketConnectionRegistry.register({
          sessionId: context.sessionId,
          actorId: context.userId,
          actorScope: context.actorScope,
          schoolId: context.schoolId,
          socket: ws,
        });

        if (connection.connectionCount === 1) {
          await classroomRedisFanoutManager.ensureSubscribed(
            context.sessionId,
            "classroom",
          );
          await classroomRedisFanoutManager.ensureSubscribed(
            context.sessionId,
            "runtime",
          );
        }

        await sendClassroomSnapshot(ws, context, crypto.randomUUID());

        ws.on("message", async (payload) => {
          try {
            await handleClassroomWebSocketClientMessage(String(payload), ws, context);
          } catch {
            ws.send(JSON.stringify(buildTransportErrorEnvelope(context, {
              code: "WEBSOCKET_MESSAGE_FAILED",
            })));
          }
        });

        ws.on("close", async () => {
          const registryState = classroomWebSocketConnectionRegistry.unregister(
            context.sessionId,
            connection.id,
          );
          if (registryState.remainingConnectionCount === 0) {
            await classroomRedisFanoutManager.releaseSubscription(
              context.sessionId,
              "classroom",
            );
            await classroomRedisFanoutManager.releaseSubscription(
              context.sessionId,
              "runtime",
            );
          }
          await recordTransportConsumerTrace({
            sessionId: context.sessionId,
            correlationId: `classroom:${context.sessionId}:connection:${connection.id}:closed`,
            adapterId: "transport-websocket-adapter",
            adapterMode: "websocket",
            traceType: "stream_closed",
            status: "closed",
            detail: {
              actorScope: context.actorScope,
            },
          });
        });
      },
    );
  }
}

export const classroomWebSocketTransportServer =
  new ClassroomWebSocketTransportServer();
