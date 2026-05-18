import { z } from "zod";

export const RuntimeInspectorScopeRoleSchema = z.enum(["teacher", "admin", "developer"]);

export const RuntimeInspectorTimelineLaneSchema = z.enum([
  "runtime",
  "classroom",
  "governance",
  "transport",
  "consumer",
  "plugin",
]);

export const RuntimeInspectorHealthDecisionSchema = z.enum(["allowed", "denied", "unknown"]);

export const RuntimeInspectorHealthTransportSchema = z.enum([
  "pending",
  "delivered",
  "failed",
  "skipped",
  "unknown",
]);

export const RuntimeInspectorHealthConsumerSchema = z.enum([
  "emitted",
  "failed",
  "closed",
  "unknown",
]);

export const RuntimeInspectorInputSchema = z.object({
  runtimeSessionId: z.string().min(1).optional(),
});

export const RuntimeInspectorSessionOptionDTOSchema = z.object({
  runtimeSessionId: z.string(),
  classroomSessionId: z.string().nullable(),
  runtimeId: z.string(),
  runtimeVersion: z.string(),
  actorScope: z.string(),
  schoolId: z.string(),
  createdAt: z.string(),
});

export const RuntimeInspectorHealthSummaryDTOSchema = z.object({
  lifecycleState: z.string(),
  governanceDecision: RuntimeInspectorHealthDecisionSchema,
  transportAttemptStatus: RuntimeInspectorHealthTransportSchema,
  consumerTraceStatus: RuntimeInspectorHealthConsumerSchema,
  transportTopology: z.enum(["local_only", "redis_fanout", "degraded_local_fallback", "unknown"]),
  degraded: z.boolean(),
  degradedReason: z.string().nullable(),
  lastHealthyAt: z.string().nullable(),
  allowedCount: z.number().int().nonnegative(),
  deniedCount: z.number().int().nonnegative(),
  deliveredCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
});

export const RuntimeInspectorTimelineItemDTOSchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  lane: RuntimeInspectorTimelineLaneSchema,
  title: z.string(),
  detail: z.string(),
  runtimeSessionId: z.string().nullable(),
  classroomSessionId: z.string().nullable(),
  correlationId: z.string().nullable(),
  transportTopology: z.string().nullable().optional(),
  receivedVia: z.string().nullable().optional(),
  decision: RuntimeInspectorHealthDecisionSchema.nullable().optional(),
  status: z.string().nullable().optional(),
});

export const RuntimeInspectorDTOSchema = z.object({
  scopeRole: RuntimeInspectorScopeRoleSchema,
  selectedRuntimeSessionId: z.string().nullable(),
  selectedSession: RuntimeInspectorSessionOptionDTOSchema.nullable(),
  sessionOptions: z.array(RuntimeInspectorSessionOptionDTOSchema),
  health: RuntimeInspectorHealthSummaryDTOSchema.nullable(),
  timeline: z.array(RuntimeInspectorTimelineItemDTOSchema),
  emptyState: z.string().nullable(),
});

export type RuntimeInspectorInput = z.infer<typeof RuntimeInspectorInputSchema>;
export type RuntimeInspectorScopeRole = z.infer<typeof RuntimeInspectorScopeRoleSchema>;
export type RuntimeInspectorSessionOptionDTO = z.infer<typeof RuntimeInspectorSessionOptionDTOSchema>;
export type RuntimeInspectorHealthSummaryDTO = z.infer<typeof RuntimeInspectorHealthSummaryDTOSchema>;
export type RuntimeInspectorTimelineItemDTO = z.infer<typeof RuntimeInspectorTimelineItemDTOSchema>;
export type RuntimeInspectorDTO = z.infer<typeof RuntimeInspectorDTOSchema>;
