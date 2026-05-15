import { z } from "zod";

export const RuntimeEventBusDeliverySchema = z.enum(["in-process", "redis-streams"]);

export const RuntimeEventEnvelopeSchema = z.object({
  topic: z.string().min(1),
  sessionId: z.string().min(1),
  eventType: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export const RuntimeEventHandlerSchema = z.function({
  input: [RuntimeEventEnvelopeSchema],
  output: z.promise(z.void()),
});

export const RuntimeEventBusOwnershipSchema = z.object({
  sourceOfTruth: z.literal("classroom-session-write-path"),
  delivery: RuntimeEventBusDeliverySchema,
  posture: z.literal("default-only"),
  notes: z.array(z.string()).default([]),
});

export type RuntimeEventEnvelope = z.infer<typeof RuntimeEventEnvelopeSchema>;
export type RuntimeEventBusOwnership = z.infer<typeof RuntimeEventBusOwnershipSchema>;
export type RuntimeEventHandler = (event: RuntimeEventEnvelope) => Promise<void>;

export interface RuntimeEventBusAdapter {
  readonly id: string;
  readonly ownership: RuntimeEventBusOwnership;
  describeOwnership(): RuntimeEventBusOwnership;
  publish(event: RuntimeEventEnvelope): Promise<void>;
  subscribe(topic: string, handler: RuntimeEventHandler): () => void;
}
