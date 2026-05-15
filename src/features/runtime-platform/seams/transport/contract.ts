import { z } from "zod";

export const RuntimeTransportModeSchema = z.enum(["sse", "websocket"]);

export const RuntimeTransportEnvelopeSchema = z.object({
  sessionId: z.string().min(1),
  channel: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export const RuntimeTransportOwnershipSchema = z.object({
  sourceOfTruth: z.literal("classroom-session-write-path"),
  deliveryMode: RuntimeTransportModeSchema,
  posture: z.literal("default-only"),
  notes: z.array(z.string()).default([]),
});

export type RuntimeTransportMode = z.infer<typeof RuntimeTransportModeSchema>;
export type RuntimeTransportEnvelope = z.infer<typeof RuntimeTransportEnvelopeSchema>;
export type RuntimeTransportOwnership = z.infer<typeof RuntimeTransportOwnershipSchema>;

export interface RuntimeTransportAdapter {
  readonly id: string;
  readonly mode: RuntimeTransportMode;
  readonly ownership: RuntimeTransportOwnership;
  describeOwnership(): RuntimeTransportOwnership;
  deliver(envelope: RuntimeTransportEnvelope): Promise<void>;
}
