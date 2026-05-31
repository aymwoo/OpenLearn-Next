import "server-only";

import { getBullmqConnectionHealthSnapshot } from "@/features/async-tasks/infra/connection";
import { listAsyncWorkerHeartbeats } from "@/features/async-tasks/infra/heartbeat";
import {
  type AsyncTaskOperatorTaskRow,
  getAsyncTaskWithEvents,
  listOperatorVisibleAsyncTasks,
} from "@/features/async-tasks/server/operator-read-model";
import {
  canOperatorAccessTask,
  type AsyncTaskOperatorScope,
} from "@/features/async-tasks/server/operator-access";
import { asyncTaskRegistry } from "@/features/async-tasks/server/registry";
import { resolveAsyncTaskDisplayStatus } from "@/features/async-tasks/server/status";
import {
  AsyncTaskDetailDTOSchema,
  type AsyncTaskDetailDTO,
  type AsyncTaskHistoryEventDTO,
} from "@/features/async-tasks/shared/dto";
import { toAsyncTaskDetailDTOInput } from "@/features/async-tasks/server/mapper";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import {
  AsyncTaskOperatorDetailDTOSchema,
  AsyncTaskOperatorOverviewDTOSchema,
  type AsyncTaskOperatorDetailDTO,
  type AsyncTaskOperatorOverviewDTO,
} from "@/lib/dto/async-task-operator";

type AsyncTaskRow = AsyncTaskOperatorTaskRow;

type OperatorScope = AsyncTaskOperatorScope & {
  actorId: string;
};

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function readTaskDefinition(taskType: string) {
  const definition = asyncTaskRegistry[taskType as keyof typeof asyncTaskRegistry];

  if (!definition) {
    throw new Error("ASYNC_TASK_TYPE_NOT_FOUND");
  }

  return definition;
}

async function resolveAsyncTaskOperatorScope(): Promise<OperatorScope> {
  const user = await getCurrentUserDTO();
  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const activeMemberships = memberships.filter((membership) => membership.status === "active");
  const schoolIds = [...new Set(activeMemberships.map((membership) => membership.schoolId))];

  if (activeMemberships.some((membership) => membership.role === "developer")) {
    return {
      role: "developer",
      actorId: user.id,
      schoolIds,
    };
  }

  if (activeMemberships.some((membership) => membership.role === "admin")) {
    return {
      role: "admin",
      actorId: user.id,
      schoolIds,
    };
  }

  throw new Error("ASYNC_TASK_OPERATOR_FORBIDDEN");
}

function buildRetryEligibility(task: AsyncTaskRow) {
  const definition = readTaskDefinition(task.taskType);
  const metadata = definition.operatorRecovery;

  if (!metadata.enabled) {
    return {
      canRetry: false,
      reason: "当前任务类型不支持 operator recovery。",
      mode: metadata.mode,
      terminalStatuses: metadata.terminalStatuses,
      ctaLabel: "重试此任务",
    };
  }

  if (!metadata.terminalStatuses.includes("failed") || task.status !== "failed") {
    return {
      canRetry: false,
      reason: "仅失败任务可重试。",
      mode: metadata.mode,
      terminalStatuses: metadata.terminalStatuses,
      ctaLabel: "重试此任务",
    };
  }

  return {
    canRetry: true,
    reason: "当前任务支持在同一 durable task 内追加新的 attempt。",
    mode: metadata.mode,
    terminalStatuses: metadata.terminalStatuses,
    ctaLabel: "重试此任务",
  };
}

function buildProblemReason(task: AsyncTaskRow) {
  switch (task.status) {
    case "failed":
      return task.latestFailureReason ?? "任务已失败，等待 operator 发起恢复。";
    case "stalled_recovery":
      return "worker 检测到 stalled recovery，需要人工确认是否重新接管。";
    case "retrying":
      return "任务正在恢复流程中，且超过 15 分钟仍未回到 running。";
    case "dispatch_failed":
      return "任务已经持久化，但当前没有成功入队。";
    default:
      return "该任务需要 operator 关注。";
  }
}

function buildAttemptGroups(detail: AsyncTaskDetailDTO) {
  const grouped = new Map<number, Array<{
    id: string;
    attemptNumber: number;
    eventType: string;
    status: AsyncTaskHistoryEventDTO["status"];
    occurredAt: string;
    detail: Record<string, unknown>;
  }>>();

  for (const event of detail.history) {
    const attemptNumber =
      typeof event.detail.attemptNumber === "number"
        ? event.detail.attemptNumber
        : null;

    if (!attemptNumber || attemptNumber <= 0) {
      continue;
    }

    const bucket = grouped.get(attemptNumber) ?? [];
    bucket.push({
      id: event.id,
      attemptNumber,
      eventType: event.eventType,
      status: event.status,
      occurredAt: event.occurredAt,
      detail: event.detail,
    });
    grouped.set(attemptNumber, bucket);
  }

  return [...grouped.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([attemptNumber, events]) => {
      const orderedEvents = events
        .slice()
        .sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt));
      const latest = orderedEvents[orderedEvents.length - 1] ?? null;

      return {
        attemptNumber,
        title:
          attemptNumber === detail.latestAttemptNumber
            ? `当前 attempt #${attemptNumber}`
            : `Attempt #${attemptNumber}`,
        status: latest?.status ?? null,
        startedAt: orderedEvents[0]?.occurredAt ?? null,
        latestEventAt: latest?.occurredAt ?? null,
        events: orderedEvents,
      };
    });
}

function mapTaskToProblemCard(task: AsyncTaskRow) {
  return {
    taskId: task.id,
    taskType: task.taskType,
    title: task.entityLabel ?? task.summaryKey,
    status: task.status,
    statusLabel: resolveAsyncTaskDisplayStatus({
      status: task.status,
      enqueueIntentStatus: task.enqueueIntentStatus,
    }),
    entityLabel: task.entityLabel ?? null,
    detailHref: `/settings/labs/async-tasks/${task.id}`,
    reason: buildProblemReason(task),
    latestError: task.latestFailureReason ?? null,
    updatedAt: toIso(task.updatedAt) ?? new Date(0).toISOString(),
  };
}

function buildBacklogPosture(input: {
  visibleTasks: AsyncTaskRow[];
  heartbeatTimestamps: Array<number>;
}) {
  const now = Date.now();
  const queuedCount = input.visibleTasks.filter((task) => task.status === "queued").length;
  const retryingCount = input.visibleTasks.filter((task) => task.status === "retrying").length;
  const runningTasks = input.visibleTasks.filter(
    (task) => task.status === "running" || task.status === "retrying",
  );
  const oldestActiveAgeMinutes =
    runningTasks.length === 0
      ? null
      : Math.max(
          ...runningTasks.map((task) => {
            const startedAt = Number(task.startedAt ?? task.createdAt ?? now);
            return Math.max(0, (now - startedAt) / 60_000);
          }),
        );
  const latestHeartbeatAt = input.heartbeatTimestamps[0] ?? null;
  const staleHeartbeat = latestHeartbeatAt == null || now - latestHeartbeatAt > 45_000;

  if (staleHeartbeat || queuedCount + retryingCount > 25 || (oldestActiveAgeMinutes ?? 0) >= 30) {
    return {
      level: "critical" as const,
      reason: staleHeartbeat
        ? "worker heartbeat 已超过 45 秒未刷新。"
        : queuedCount + retryingCount > 25
          ? "queued + retrying 已超过 25。"
          : "最老 active/retrying 任务已超过 30 分钟。",
      queuedCount,
      retryingCount,
      runningCount: runningTasks.length,
      oldestActiveAgeMinutes,
      staleHeartbeat,
      trustedFacts: "SQLite task ledger 与最近一次 heartbeat 记录仍然可信。",
      caution: "当前不能把页面上的 worker 在线态当作实时健康结论。",
      nextStep: "先检查 worker 进程与 Redis 连接，再回到单任务详情确认是否需要 recovery。",
    };
  }

  if (queuedCount + retryingCount >= 11 || (oldestActiveAgeMinutes ?? 0) >= 10) {
    return {
      level: "backlogged" as const,
      reason:
        queuedCount + retryingCount >= 11
          ? "队列积压开始上升。"
          : "存在处理时间偏长的 active/retrying 任务。",
      queuedCount,
      retryingCount,
      runningCount: runningTasks.length,
      oldestActiveAgeMinutes,
      staleHeartbeat,
      trustedFacts: "worker heartbeat 仍在刷新，队列 ledger 仍然可读。",
      caution: "当前 backlog 已经偏高，问题任务可能继续堆积。",
      nextStep: "先检查失败和重试中的任务，再决定是否需要扩 worker 或人工恢复。",
    };
  }

  return {
    level: "healthy" as const,
    reason: "worker heartbeat 与队列积压都在可接受范围内。",
    queuedCount,
    retryingCount,
    runningCount: runningTasks.length,
    oldestActiveAgeMinutes,
    staleHeartbeat,
    trustedFacts: "当前 worker heartbeat、连接快照和 task ledger 可以互相印证。",
    caution: "当前没有需要优先升级的 operator 风险。",
    nextStep: "继续观察问题任务列表即可。",
  };
}

const OPERATOR_DAL_REQUEST_FRESH_NOTE = "Request-fresh by design";

export async function getAsyncTaskOperatorOverviewDTO(): Promise<AsyncTaskOperatorOverviewDTO> {
  const scope = await resolveAsyncTaskOperatorScope();
  const [connectionHealth, workerHeartbeats, taskRows] = await Promise.all([
    Promise.resolve(getBullmqConnectionHealthSnapshot()),
    listAsyncWorkerHeartbeats(),
    listOperatorVisibleAsyncTasks({
      schoolIds: scope.schoolIds,
      limit: 100,
    }),
  ]);

  const visibleTasks = taskRows.filter((task) => canOperatorAccessTask(task, scope));
  const heartbeatTimestamps = workerHeartbeats
    .map((heartbeat) => Number(heartbeat.lastSeenAt ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => right - left);
  const backlog = buildBacklogPosture({
    visibleTasks,
    heartbeatTimestamps,
  });
  const problemTasks = visibleTasks
    .filter((task) => {
      if (task.status === "retrying") {
        const ageMinutes = Math.max(
          0,
          (Date.now() - Number(task.updatedAt ?? task.createdAt ?? Date.now())) / 60_000,
        );
        return ageMinutes >= 15;
      }

      return (
        task.status === "failed"
        || task.status === "stalled_recovery"
        || task.status === "dispatch_failed"
      );
    })
    .sort((left, right) => {
      const order = new Map([
        ["failed", 0],
        ["stalled_recovery", 1],
        ["retrying", 2],
        ["dispatch_failed", 3],
      ]);
      return (order.get(left.status) ?? 99) - (order.get(right.status) ?? 99);
    })
    .map(mapTaskToProblemCard);

  return AsyncTaskOperatorOverviewDTOSchema.parse({
    scopeRole: scope.role,
    platformHealth: {
      asyncTasksEnabled: connectionHealth.asyncTasksEnabled,
      redisConfigured: connectionHealth.redisConfigured,
      redisReachable: connectionHealth.redisReachable,
      prefix: connectionHealth.prefix,
      instanceId: connectionHealth.instanceId,
      producerState: connectionHealth.connectionStates.producer,
      workerState: connectionHealth.connectionStates.worker,
      queueEventsState: connectionHealth.connectionStates.queue_events,
      lastError: connectionHealth.lastError,
      lastHealthyAt: connectionHealth.lastHealthyAt,
      backlog,
      workerHeartbeats: workerHeartbeats.map((heartbeat) => ({
        instanceId: heartbeat.instanceId,
        status: heartbeat.status,
        queueNames: Array.isArray(heartbeat.queueNamesJson) ? heartbeat.queueNamesJson : [],
        lastSeenAt: toIso(heartbeat.lastSeenAt),
        startedAt: toIso(heartbeat.startedAt),
        stoppedAt: toIso(heartbeat.stoppedAt),
        lastSignal: heartbeat.lastSignal ?? null,
      })),
    },
    problemTasks,
    emptyState: problemTasks.length === 0 ? "当前没有需要优先处理的问题任务。" : null,
  });
}

export async function getAsyncTaskOperatorDetailDTO(input: {
  taskId: string;
}): Promise<AsyncTaskOperatorDetailDTO> {
  const scope = await resolveAsyncTaskOperatorScope();
  void OPERATOR_DAL_REQUEST_FRESH_NOTE;
  const { task, events } = await getAsyncTaskWithEvents(input.taskId);

  if (!task || !canOperatorAccessTask(task, scope)) {
    throw new Error("ASYNC_TASK_NOT_FOUND");
  }
  const detail = AsyncTaskDetailDTOSchema.parse(toAsyncTaskDetailDTOInput(task, events));

  return AsyncTaskOperatorDetailDTOSchema.parse({
    scopeRole: scope.role,
    statusSummary: {
      taskId: task.id,
      taskType: task.taskType,
      status: task.status,
      statusLabel: detail.status,
      enqueueIntentStatus: task.enqueueIntentStatus,
      entityLabel: task.entityLabel ?? null,
      detailHref: `/settings/labs/async-tasks/${task.id}`,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
    },
    latestErrorCard: detail.failure,
    progressSnapshot: detail.progress,
    recoveryPosture: detail.recovery,
    retryEligibility: buildRetryEligibility(task),
    attemptGroups: buildAttemptGroups(detail),
    auditTimeline: detail.history,
  });
}
