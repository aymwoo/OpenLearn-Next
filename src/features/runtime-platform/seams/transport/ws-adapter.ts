import {
  RuntimeTransportEnvelopeSchema,
  RuntimeTransportOwnershipSchema,
  type RuntimeTransportAdapter,
  type RuntimeTransportEnvelope,
  type RuntimeTransportOwnership,
} from "./contract";
import { classroomRedisFanoutManager } from "./redis-fanout-manager";
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
  if (kind === "quiz.answer.received") {
    return "quiz.answer.received" as const;
  }

  if (kind.startsWith("runtime.") || kind.startsWith("governance.")) {
    return "runtime.event" as const;
  }

  return "classroom.snapshot" as const;
}

function resolveEnvelopeActor(input: RuntimeTransportEnvelope) {
  const isRuntimeEvent = input.kind.startsWith("runtime.") || input.kind.startsWith("governance.");
  const actorIdFromPayload = typeof input.payload.actorId === "string" ? input.payload.actorId : null;

  return {
    userId:
      actorIdFromPayload ??
      (isRuntimeEvent
        ? `runtime:${input.truthRef.runtimeSessionId ?? input.truthRef.id}`
        : `teacher:${input.sessionId}`),
    scope: isRuntimeEvent ? "runtime" : "teacher",
    schoolId: input.truthRef.schoolId ?? "unknown-school",
  } as const;
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
    const sessionId = parsed.truthRef.classroomSessionId ?? parsed.sessionId;
    const serverEnvelope = buildClassroomWebSocketServerEnvelope({
      sessionId,
      actor: resolveEnvelopeActor(parsed),
      kind: resolveWebSocketTransportKind(parsed.kind),
      correlationId: parsed.correlationId,
      causationId: parsed.truthRef.id,
      payload: {
        channel: parsed.channel,
        kind: parsed.kind,
        correlationId: parsed.correlationId,
        truthRef: parsed.truthRef,
        ...parsed.payload,
      },
      truthPersisted: true,
    });

    await classroomRedisFanoutManager.deliver({
      envelope: parsed,
      serverEnvelope,
    });
  }
}

export const wsRuntimeTransportAdapter = new WebSocketRuntimeTransportAdapter();
