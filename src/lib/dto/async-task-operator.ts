import { z } from "zod";

import { createOperatorHonestyCard, type OperatorHonestyCard } from "@/lib/dto/operator-honesty";
import {
  AsyncTaskEnqueueIntentStatusSchema,
  AsyncTaskProgressSnapshotSchema,
  AsyncTaskStatusSchema,
} from "@/features/async-tasks/shared/contract";
import {
  AsyncTaskFailureContextDTOSchema,
  AsyncTaskHistoryEventDTOSchema,
  AsyncTaskRecoveryPostureDTOSchema,
} from "@/features/async-tasks/shared/dto";

export const AsyncTaskOperatorScopeRoleSchema = z.enum(["admin", "developer"]);

export const AsyncTaskOperatorBacklogLevelSchema = z.enum([
  "healthy",
  "backlogged",
  "critical",
]);

export const AsyncTaskOperatorWorkerHeartbeatDTOSchema = z
  .object({
    instanceId: z.string().min(1),
    status: z.enum(["ready", "stopping", "stopped"]),
    queueNames: z.array(z.string().min(1)).default([]),
    lastSeenAt: z.string().nullable().default(null),
    startedAt: z.string().nullable().default(null),
    stoppedAt: z.string().nullable().default(null),
    lastSignal: z.string().nullable().default(null),
  })
  .strict();

export const AsyncTaskOperatorBacklogPostureDTOSchema = z
  .object({
    level: AsyncTaskOperatorBacklogLevelSchema,
    reason: z.string().min(1),
    queuedCount: z.number().int().nonnegative(),
    retryingCount: z.number().int().nonnegative(),
    runningCount: z.number().int().nonnegative(),
    oldestActiveAgeMinutes: z.number().nonnegative().nullable().default(null),
    staleHeartbeat: z.boolean(),
    trustedFacts: z.string().min(1),
    caution: z.string().min(1),
    nextStep: z.string().min(1),
  })
  .strict();

export const AsyncTaskProblemTaskDTOSchema = z
  .object({
    taskId: z.string().min(1),
    taskType: z.string().min(1),
    title: z.string().min(1),
    status: AsyncTaskStatusSchema,
    statusLabel: z.string().min(1),
    entityLabel: z.string().nullable().default(null),
    detailHref: z.string().min(1),
    reason: z.string().min(1),
    latestError: z.string().nullable().default(null),
    updatedAt: z.string().min(1),
  })
  .strict();

export const AsyncTaskPlatformHealthDTOSchema = z
  .object({
    asyncTasksEnabled: z.boolean(),
    redisConfigured: z.boolean(),
    redisReachable: z.boolean(),
    prefix: z.string().min(1),
    instanceId: z.string().min(1),
    producerState: z.enum(["disabled", "connecting", "ready", "degraded"]),
    workerState: z.enum(["disabled", "connecting", "ready", "degraded"]),
    queueEventsState: z.enum(["disabled", "connecting", "ready", "degraded"]),
    lastError: z.string().nullable().default(null),
    lastHealthyAt: z.string().nullable().default(null),
    backlog: AsyncTaskOperatorBacklogPostureDTOSchema,
    workerHeartbeats: z.array(AsyncTaskOperatorWorkerHeartbeatDTOSchema).default([]),
  })
  .strict();

export const AsyncTaskOperatorOverviewDTOSchema = z
  .object({
    scopeRole: AsyncTaskOperatorScopeRoleSchema,
    platformHealth: AsyncTaskPlatformHealthDTOSchema,
    problemTasks: z.array(AsyncTaskProblemTaskDTOSchema).default([]),
    emptyState: z.string().nullable().default(null),
  })
  .strict();

export const AsyncTaskOperatorStatusSummaryDTOSchema = z
  .object({
    taskId: z.string().min(1),
    taskType: z.string().min(1),
    status: AsyncTaskStatusSchema,
    statusLabel: z.string().min(1),
    enqueueIntentStatus: AsyncTaskEnqueueIntentStatusSchema,
    entityLabel: z.string().nullable().default(null),
    detailHref: z.string().min(1),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .strict();

export const AsyncTaskOperatorRetryEligibilityDTOSchema = z
  .object({
    canRetry: z.boolean(),
    reason: z.string().nullable().default(null),
    mode: z.string().nullable().default(null),
    terminalStatuses: z.array(z.string().min(1)).default([]),
    ctaLabel: z.string().min(1).default("重试此任务"),
  })
  .strict();

export const AsyncTaskOperatorAttemptEventDTOSchema = z
  .object({
    id: z.string().min(1),
    attemptNumber: z.number().int().positive(),
    eventType: z.string().min(1),
    status: AsyncTaskStatusSchema,
    occurredAt: z.string().min(1),
    detail: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export const AsyncTaskOperatorAttemptGroupDTOSchema = z
  .object({
    attemptNumber: z.number().int().positive(),
    title: z.string().min(1),
    status: AsyncTaskStatusSchema.nullable().default(null),
    startedAt: z.string().nullable().default(null),
    latestEventAt: z.string().nullable().default(null),
    events: z.array(AsyncTaskOperatorAttemptEventDTOSchema).default([]),
  })
  .strict();

export const AsyncTaskOperatorDetailDTOSchema = z
  .object({
    scopeRole: AsyncTaskOperatorScopeRoleSchema,
    statusSummary: AsyncTaskOperatorStatusSummaryDTOSchema,
    latestErrorCard: AsyncTaskFailureContextDTOSchema.nullable().default(null),
    progressSnapshot: AsyncTaskProgressSnapshotSchema.nullable().default(null),
    recoveryPosture: AsyncTaskRecoveryPostureDTOSchema.nullable().default(null),
    retryEligibility: AsyncTaskOperatorRetryEligibilityDTOSchema,
    attemptGroups: z.array(AsyncTaskOperatorAttemptGroupDTOSchema).default([]),
    auditTimeline: z.array(AsyncTaskHistoryEventDTOSchema).default([]),
  })
  .strict();

export type AsyncTaskOperatorOverviewDTO = z.infer<
  typeof AsyncTaskOperatorOverviewDTOSchema
>;
export type AsyncTaskOperatorDetailDTO = z.infer<
  typeof AsyncTaskOperatorDetailDTOSchema
>;

export function toAsyncTaskOperatorHonestyCard(
  backlog: z.infer<typeof AsyncTaskOperatorBacklogPostureDTOSchema>,
): OperatorHonestyCard {
  return createOperatorHonestyCard({
    title: backlog.level === "critical"
      ? "当前不能把 operator 首页当作完全健康"
      : "当前 async posture 需要继续观察",
    tone: backlog.level === "critical" ? "failed" : "degraded",
    trustedFacts: backlog.trustedFacts,
    untrustedFacts: backlog.caution,
    impactScope: "影响范围：当前课堂及共享 worker 的关联任务。",
    nextStep: backlog.nextStep,
  });
}
