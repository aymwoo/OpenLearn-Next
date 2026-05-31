import { z } from "zod";

export const AsyncTaskTypeSchema = z.string().trim().min(1);

export const AsyncTaskFeatureAreaSchema = z.enum([
  "platform",
  "course_import",
  "schedule",
  "runtime",
  "resource_processing",
  "notifications",
]);

export const AsyncTaskVisibilityScopeSchema = z.enum([
  "actor_owned",
  "school_operator",
  "system_operator",
]);

export const AsyncTaskEntityRefSchema = z
  .object({
    entityType: z.string().trim().min(1),
    entityId: z.string().trim().min(1),
    entityLabel: z.string().trim().min(1).nullable().default(null),
  })
  .strict();

export const AsyncTaskStatusSchema = z.enum([
  "pending_enqueue",
  "dispatching",
  "dispatch_failed",
  "queued",
  "running",
  "retrying",
  "stalled_recovery",
  "completed",
  "partially_completed",
  "failed",
  "cancelled",
]);

export const AsyncTaskEnqueueIntentStatusSchema = z.enum([
  "pending_enqueue",
  "dispatching",
  "dispatch_failed",
  "dispatched",
]);

export const AsyncTaskProgressCountersSchema = z
  .object({
    total: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
  })
  .strict();

export const AsyncTaskProgressSnapshotSchema = z
  .object({
    stage: z.string().trim().min(1),
    stageLabelKey: z.string().trim().min(1).nullable().default(null),
    messageKey: z.string().trim().min(1).nullable().default(null),
    percentComplete: z.number().min(0).max(100).nullable().default(null),
    counters: AsyncTaskProgressCountersSchema.nullable().default(null),
    detail: z.record(z.string(), z.unknown()).default({}),
    updatedAt: z.string().nullable().default(null),
  })
  .strict();

export const AsyncTaskOutcomeStatusSchema = z.enum([
  "completed",
  "partially_completed",
  "failed",
  "cancelled",
]);

export const AsyncTaskOutcomeCountsSchema = z
  .object({
    total: z.number().int().nonnegative(),
    succeeded: z.number().int().nonnegative(),
    partiallySucceeded: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
  })
  .strict();

export const AsyncTaskResultSummarySchema = z
  .object({
    outcome: AsyncTaskOutcomeStatusSchema,
    titleKey: z.string().trim().min(1),
    summaryKey: z.string().trim().min(1).nullable().default(null),
    counts: AsyncTaskOutcomeCountsSchema.nullable().default(null),
    detail: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export const AsyncTaskMetadataKeysSchema = z
  .object({
    labelKey: z.string().trim().min(1),
    summaryKey: z.string().trim().min(1),
  })
  .strict();

export const AsyncTaskReliabilityMetadataSchema = z
  .object({
    queueName: z.string().trim().min(1).optional(),
    attempts: z.number().int().positive().default(1),
    backoff: z
      .object({
        type: z.enum(["fixed", "exponential"]),
        delay: z.number().int().nonnegative(),
      })
      .optional(),
    deadLetter: z
      .object({
        terminalStatus: AsyncTaskStatusSchema,
        eventType: z.string().trim().min(1).optional(),
      })
      .optional(),
    idempotency: z
      .object({
        strategy: z.enum(["task_id", "task_type_and_task_id"]).default("task_id"),
      })
      .default({ strategy: "task_id" }),
    idempotencyKey: z.string().trim().min(1).optional(),
    concurrencyKey: z.string().trim().min(1).optional(),
  })
  .strict()
  .default({
    attempts: 1,
    idempotency: {
      strategy: "task_id",
    },
  });

export const AsyncTaskDefinitionMetadataSchema = z
  .object({
    taskType: AsyncTaskTypeSchema,
    featureArea: AsyncTaskFeatureAreaSchema,
    visibilityScope: AsyncTaskVisibilityScopeSchema,
    entityRefKind: z.string().trim().min(1),
    labelKey: z.string().trim().min(1),
    summaryKey: z.string().trim().min(1),
    reliability: AsyncTaskReliabilityMetadataSchema,
  })
  .strict();

export type AsyncTaskType = z.infer<typeof AsyncTaskTypeSchema>;
export type AsyncTaskFeatureArea = z.infer<typeof AsyncTaskFeatureAreaSchema>;
export type AsyncTaskVisibilityScope = z.infer<typeof AsyncTaskVisibilityScopeSchema>;
export type AsyncTaskEntityRef = z.infer<typeof AsyncTaskEntityRefSchema>;
export type AsyncTaskStatus = z.infer<typeof AsyncTaskStatusSchema>;
export type AsyncTaskEnqueueIntentStatus = z.infer<typeof AsyncTaskEnqueueIntentStatusSchema>;
export type AsyncTaskProgressCounters = z.infer<typeof AsyncTaskProgressCountersSchema>;
export type AsyncTaskProgressSnapshot = z.infer<typeof AsyncTaskProgressSnapshotSchema>;
export type AsyncTaskOutcomeStatus = z.infer<typeof AsyncTaskOutcomeStatusSchema>;
export type AsyncTaskOutcomeCounts = z.infer<typeof AsyncTaskOutcomeCountsSchema>;
export type AsyncTaskResultSummary = z.infer<typeof AsyncTaskResultSummarySchema>;
export type AsyncTaskMetadataKeys = z.infer<typeof AsyncTaskMetadataKeysSchema>;
export type AsyncTaskReliabilityMetadata = z.infer<typeof AsyncTaskReliabilityMetadataSchema>;
export type AsyncTaskDefinitionMetadata = z.infer<typeof AsyncTaskDefinitionMetadataSchema>;
