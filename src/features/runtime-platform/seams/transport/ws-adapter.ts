import {
  RuntimeTransportEnvelopeSchema,
  RuntimeTransportOwnershipSchema,
  type RuntimeTransportAdapter,
  type RuntimeTransportEnvelope,
  type RuntimeTransportOwnership,
} from "./contract";
import { classroomWebSocketConnectionRegistry } from "./ws-connection-registry";
import { buildClassroomWebSocketServerEnvelope } from "./ws-envelope";

const ownership: RuntimeTransportOwnership = RuntimeTransportOwnershipSchema.parse({
  sourceOfTruth: "classroom-session-write-path",
  deliveryMode: "websocket",
  posture: "default-only",
  notes: [
    "WebSocket transport mirrors canonical classroom/runtime events without becoming a truth source.",
    "Connection ownership stays session-scoped and in-memory until Redis fanout lands in Phase 37.",
    "SSE remains the rollback surface while WebSocket cutover consumers migrate incrementally.",
  ],
});

export function resolveWebSocketTransportKind(kind: string) {
  if (kind.startsWith("runtime.")) {
    return "runtime.event" as const;
  }

  return "classroom.snapshot" as const;
}

class WebSocketRuntimeTransportAdapter implements RuntimeTransportAdapter {
  readonly id = "transport-websocket-adapter";
  readonly mode = "websocket" as const;
  readonly ownership = ownership;

  describeOwnership(): RuntimeTransportOwnership {
    return this.ownership;
  }

  async deliver(envelope: RuntimeTransportEnvelope): Promise<void> {
    const parsed = RuntimeTransportEnvelopeSchema.parse(envelope);

    classroomWebSocketConnectionRegistry.broadcast(
      parsed.sessionId,
      buildClassroomWebSocketServerEnvelope({
        sessionId: parsed.sessionId,
        actor: {
          userId: parsed.truthRef.runtimeSessionId ?? parsed.truthRef.id,
          scope: parsed.kind.startsWith("runtime.") ? "runtime" : "teacher",
          schoolId: parsed.truthRef.schoolId ?? "unknown-school",
        },
        kind: resolveWebSocketTransportKind(parsed.kind),
        correlationId: parsed.correlationId,
        causationId: parsed.truthRef.id,
        payload: {
          channel: parsed.channel,
          kind: parsed.kind,
          ...parsed.payload,
        },
        truthPersisted: true,
      }),
    );
  }
}

export const wsRuntimeTransportAdapter = new WebSocketRuntimeTransportAdapter();
