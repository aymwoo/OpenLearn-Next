import { parse } from "node:url";
import type { IncomingMessage, Server as HttpServer } from "node:http";

import Redis from "ioredis";
import { WebSocketServer, type WebSocket } from "ws";

import { getClassroomSnapshotDTO } from "@/lib/dal/classroom";

import { recordTransportConsumerTrace } from "./gateway";
import {
  ClassroomWebSocketHandshakeError,
  authenticateClassroomWebSocket,
} from "./ws-auth";
import {
  classroomWebSocketConnectionRegistry,
} from "./ws-connection-registry";
import {
  ClassroomWebSocketClientEnvelopeSchema,
  buildClassroomWebSocketServerEnvelope,
} from "./ws-envelope";

type ClassroomWebSocketContext = Awaited<
  ReturnType<typeof authenticateClassroomWebSocket>
> & {
  sessionId: string;
};

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

let redisPublisher: Redis | null = null;

function getRedisPublisher() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  redisPublisher ??= new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  return redisPublisher;
}

async function sendSnapshot(ws: WebSocket, context: ClassroomWebSocketContext, correlationId: string) {
  const snapshot = await getClassroomSnapshotDTO({ sessionId: context.sessionId });
  const envelope = buildClassroomWebSocketServerEnvelope({
    sessionId: context.sessionId,
    actor: {
      userId: context.userId,
      scope: context.actorScope,
      schoolId: context.schoolId,
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
    },
  });
}

async function handleClientMessage(
  raw: string,
  ws: WebSocket,
  context: ClassroomWebSocketContext,
) {
  const parsed = ClassroomWebSocketClientEnvelopeSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    const errorEnvelope = buildClassroomWebSocketServerEnvelope({
      sessionId: context.sessionId,
      actor: {
        userId: context.userId,
        scope: context.actorScope,
        schoolId: context.schoolId,
      },
      kind: "transport.error",
      correlationId: crypto.randomUUID(),
      payload: {
        code: "WEBSOCKET_PAYLOAD_INVALID",
      },
      truthPersisted: false,
    });
    ws.send(JSON.stringify(errorEnvelope));
    return;
  }

  if (parsed.data.kind === "transport.ping") {
    const keepalive = buildClassroomWebSocketServerEnvelope({
      sessionId: context.sessionId,
      actor: {
        userId: context.userId,
        scope: context.actorScope,
        schoolId: context.schoolId,
      },
      kind: "classroom.keepalive",
      correlationId: parsed.data.messageId,
      payload: {
        acknowledged: true,
      },
      truthPersisted: false,
    });
    ws.send(JSON.stringify(keepalive));
    return;
  }

  if (parsed.data.kind === "presence.update") {
    await sendSnapshot(ws, context, parsed.data.messageId);
  }
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
      socket.on("error", onSocketError);
      const { pathname } = parse(request.url ?? "", true);

      if (!matchesClassroomWebSocketPath(pathname)) {
        return;
      }

      const sessionId = extractSessionIdFromPath(pathname);
      if (!sessionId) {
        writeUpgradeFailure(socket, 400, "Bad Request");
        return;
      }

      try {
        const auth = await authenticateClassroomWebSocket(request, sessionId);

        socket.removeListener("error", onSocketError);

        this.server.handleUpgrade(request, socket, head, (ws) => {
          this.server.emit("connection", ws, request, {
            ...auth,
            sessionId,
          } satisfies ClassroomWebSocketContext);
        });
      } catch (error) {
        if (error instanceof ClassroomWebSocketHandshakeError) {
          writeUpgradeFailure(socket, error.status, error.code);
          return;
        }

        writeUpgradeFailure(socket, 500, "WEBSOCKET_HANDSHAKE_FAILED");
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

        const redis = getRedisPublisher();
        if (redis) {
          void redis.connect().catch(() => null);
        }

        await sendSnapshot(ws, context, crypto.randomUUID());

        ws.on("message", async (payload) => {
          try {
            await handleClientMessage(String(payload), ws, context);
          } catch {
            const errorEnvelope = buildClassroomWebSocketServerEnvelope({
              sessionId: context.sessionId,
              actor: {
                userId: context.userId,
                scope: context.actorScope,
                schoolId: context.schoolId,
              },
              kind: "transport.error",
              correlationId: crypto.randomUUID(),
              payload: {
                code: "WEBSOCKET_MESSAGE_FAILED",
              },
              truthPersisted: false,
            });
            ws.send(JSON.stringify(errorEnvelope));
          }
        });

        ws.on("close", async () => {
          classroomWebSocketConnectionRegistry.unregister(context.sessionId, connection.id);
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
