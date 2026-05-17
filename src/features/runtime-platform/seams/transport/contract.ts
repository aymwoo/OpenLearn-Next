import { z } from "zod";

export const RuntimeTransportModeSchema = z.enum(["sse", "websocket"]);

export const RuntimeTransportAttemptStatusSchema = z.enum([
  "pending",
  "delivered",
  "failed",
  "skipped",
]);

export const RuntimeTransportConsumerTraceStatusSchema = z.enum([
  "emitted",
  "failed",
  "closed",
]);

export const RuntimeTransportConsumerTraceTypeSchema = z.enum([
  "snapshot",
  "keepalive",
  "stream_closed",
  "stream_failed",
  "runtime_event",
]);

export const RuntimeTransportTruthRefSchema = z.object({
  type: z.enum([
    "runtime-session",
    "classroom-session",
    "classroom-event",
    "governance-audit",
    "plugin-action-audit",
    "plugin-hook-run",
  ]),
  id: z.string().min(1),
  runtimeSessionId: z.string().min(1).optional(),
  classroomSessionId: z.string().min(1).optional(),
  schoolId: z.string().min(1).optional(),
});

export const RuntimeTransportEnvelopeSchema = z.object({
  sessionId: z.string().min(1),
  channel: z.string().min(1),
  kind: z.string().min(1),
  correlationId: z.string().min(1),
  truthRef: RuntimeTransportTruthRefSchema,
  payload: z.record(z.string(), z.unknown()),
});

export const RuntimeTransportPublishInputSchema = RuntimeTransportEnvelopeSchema.extend({
  truthPersisted: z.boolean(),
});

export const RuntimeTransportPublishResultSchema = z.object({
  attemptId: z.string().min(1).nullable(),
  adapterId: z.string().min(1).nullable(),
  adapterMode: RuntimeTransportModeSchema.nullable(),
  truthPersisted: z.boolean(),
  deliveryAttempted: z.boolean(),
  attemptStatus: RuntimeTransportAttemptStatusSchema,
  failureReason: z.string().nullable(),
});

export const RuntimeTransportConsumerTraceInputSchema = z.object({
  attemptId: z.string().min(1).optional(),
  sessionId: z.string().min(1),
  correlationId: z.string().min(1),
  adapterId: z.string().min(1),
  adapterMode: RuntimeTransportModeSchema,
  traceType: RuntimeTransportConsumerTraceTypeSchema,
  status: RuntimeTransportConsumerTraceStatusSchema,
  snapshotVersion: z.number().int().nonnegative().optional(),
  detail: z.record(z.string(), z.unknown()).default({}),
});

export const RuntimeTransportOwnershipSchema = z.object({
  sourceOfTruth: z.literal("classroom-session-write-path"),
  deliveryMode: RuntimeTransportModeSchema,
  posture: z.literal("default-only"),
  notes: z.array(z.string()).default([]),
});

export type RuntimeTransportMode = z.infer<typeof RuntimeTransportModeSchema>;
export type RuntimeTransportAttemptStatus = z.infer<typeof RuntimeTransportAttemptStatusSchema>;
export type RuntimeTransportConsumerTraceStatus = z.infer<typeof RuntimeTransportConsumerTraceStatusSchema>;
export type RuntimeTransportConsumerTraceType = z.infer<typeof RuntimeTransportConsumerTraceTypeSchema>;
export type RuntimeTransportTruthRef = z.infer<typeof RuntimeTransportTruthRefSchema>;
export type RuntimeTransportEnvelope = z.infer<typeof RuntimeTransportEnvelopeSchema>;
export type RuntimeTransportPublishInput = z.infer<typeof RuntimeTransportPublishInputSchema>;
export type RuntimeTransportPublishResult = z.infer<typeof RuntimeTransportPublishResultSchema>;
export type RuntimeTransportConsumerTraceInput = z.infer<typeof RuntimeTransportConsumerTraceInputSchema>;
export type RuntimeTransportOwnership = z.infer<typeof RuntimeTransportOwnershipSchema>;

export interface RuntimeTransportAdapter {
  readonly id: string;
  readonly mode: RuntimeTransportMode;
  readonly ownership: RuntimeTransportOwnership;
  describeOwnership(): RuntimeTransportOwnership;
  deliver(envelope: RuntimeTransportEnvelope): Promise<void>;
}
