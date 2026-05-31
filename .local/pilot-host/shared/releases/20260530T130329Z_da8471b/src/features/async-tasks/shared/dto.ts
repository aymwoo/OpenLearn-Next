import { z } from "zod";

import {
  AsyncTaskEnqueueIntentStatusSchema,
  AsyncTaskEntityRefSchema,
  AsyncTaskFeatureAreaSchema,
  AsyncTaskMetadataKeysSchema,
  AsyncTaskProgressSnapshotSchema,
  AsyncTaskResultSummarySchema,
  AsyncTaskStatusSchema,
  AsyncTaskTypeSchema,
  AsyncTaskVisibilityScopeSchema,
} from "./contract";

export const AsyncTaskMetadataDTOSchema = AsyncTaskMetadataKeysSchema.extend({
  featureArea: AsyncTaskFeatureAreaSchema,
}).strict();

export const AsyncTaskHistoryEventDTOSchema = z
  .object({
    id: z.string().trim().min(1),
    eventType: z.string().trim().min(1),
    status: AsyncTaskStatusSchema,
    detail: z.record(z.string(), z.unknown()).default({}),
    occurredAt: z.string().trim().min(1),
  })
  .strict();

export const AsyncTaskAttemptHistoryDTOSchema = z
  .object({
    attemptNumber: z.number().int().positive(),
    eventType: z.string().trim().min(1),
    status: AsyncTaskStatusSchema,
    detail: z.record(z.string(), z.unknown()).default({}),
    occurredAt: z.string().trim().min(1),
  })
  .strict();

export const AsyncTaskFailureContextDTOSchema = z
  .object({
    reason: z.string().trim().min(1),
    attemptNumber: z.number().int().positive().nullable().default(null),
    occurredAt: z.string().nullable().default(null),
  })
  .strict();

export const AsyncTaskRecoveryPostureDTOSchema = z
  .object({
    posture: z.string().trim().min(1),
    detail: z.record(z.string(), z.unknown()).default({}),
    updatedAt: z.string().nullable().default(null),
  })
  .strict();

export const AsyncTaskListItemDTOSchema = z
  .object({
    id: z.string().trim().min(1),
    taskType: AsyncTaskTypeSchema,
    featureArea: AsyncTaskFeatureAreaSchema,
    status: AsyncTaskStatusSchema,
    enqueueIntentStatus: AsyncTaskEnqueueIntentStatusSchema,
    visibilityScope: AsyncTaskVisibilityScopeSchema,
    entityRef: AsyncTaskEntityRefSchema,
    metadata: AsyncTaskMetadataDTOSchema,
    progress: AsyncTaskProgressSnapshotSchema.nullable().default(null),
    result: AsyncTaskResultSummarySchema.nullable().default(null),
    createdAt: z.string().trim().min(1),
    updatedAt: z.string().trim().min(1),
    completedAt: z.string().nullable().default(null),
  })
  .strict();

export const AsyncTaskDetailDTOSchema = AsyncTaskListItemDTOSchema.extend({
  queueJobId: z.string().nullable().default(null),
  latestAttemptNumber: z.number().int().nonnegative(),
  failure: AsyncTaskFailureContextDTOSchema.nullable().default(null),
  recovery: AsyncTaskRecoveryPostureDTOSchema.nullable().default(null),
  attempts: z.array(AsyncTaskAttemptHistoryDTOSchema).default([]),
  history: z.array(AsyncTaskHistoryEventDTOSchema).default([]),
}).strict();

export type AsyncTaskMetadataDTO = z.infer<typeof AsyncTaskMetadataDTOSchema>;
export type AsyncTaskHistoryEventDTO = z.infer<typeof AsyncTaskHistoryEventDTOSchema>;
export type AsyncTaskAttemptHistoryDTO = z.infer<typeof AsyncTaskAttemptHistoryDTOSchema>;
export type AsyncTaskFailureContextDTO = z.infer<typeof AsyncTaskFailureContextDTOSchema>;
export type AsyncTaskRecoveryPostureDTO = z.infer<typeof AsyncTaskRecoveryPostureDTOSchema>;
export type AsyncTaskListItemDTO = z.infer<typeof AsyncTaskListItemDTOSchema>;
export type AsyncTaskDetailDTO = z.infer<typeof AsyncTaskDetailDTOSchema>;
