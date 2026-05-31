import {
  RuntimeTransportEnvelopeSchema,
  RuntimeTransportOwnershipSchema,
  type RuntimeTransportAdapter,
  type RuntimeTransportEnvelope,
  type RuntimeTransportOwnership,
} from "./contract";

const ownership: RuntimeTransportOwnership = RuntimeTransportOwnershipSchema.parse({
  sourceOfTruth: "classroom-session-write-path",
  deliveryMode: "sse",
  posture: "default-only",
  notes: [
    "SSE remains the only transport delivery posture during Phase 31.",
    "Transport stays a delivery concern and does not become the classroom truth path.",
    "Business producers publish through the transport gateway instead of calling the SSE adapter directly.",
  ],
});

class SseRuntimeTransportAdapter implements RuntimeTransportAdapter {
  readonly id = "transport-sse-adapter";
  readonly mode = "sse" as const;
  readonly ownership = ownership;

  describeOwnership(): RuntimeTransportOwnership {
    return this.ownership;
  }

  async deliver(envelope: RuntimeTransportEnvelope): Promise<void> {
    RuntimeTransportEnvelopeSchema.parse(envelope);
  }
}

export const sseRuntimeTransportAdapter = new SseRuntimeTransportAdapter();
