import { asyncTaskEvents, asyncTasks } from "@/db/schema";

import { AsyncTaskStatusSchema } from "../shared/contract";
import type {
  AsyncTaskAttemptHistoryDTO,
  AsyncTaskDetailDTO,
  AsyncTaskFailureContextDTO,
  AsyncTaskHistoryEventDTO,
  AsyncTaskListItemDTO,
  AsyncTaskRecoveryPostureDTO,
} from "../shared/dto";
import { resolveAsyncTaskDisplayStatus } from "./status";

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function readJsonValue<T>(value: unknown, fallback: T) {
  if (value == null) {
    return fallback;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
}

type AsyncTaskRow = typeof asyncTasks.$inferSelect;
type AsyncTaskEventRow = typeof asyncTaskEvents.$inferSelect;

function resolveAttemptHistory(events: AsyncTaskEventRow[]): AsyncTaskAttemptHistoryDTO[] {
  return events
    .map((event) => ({
      event,
      detail: readJsonValue<Record<string, unknown>>(event.payloadJson, {}),
    }))
    .filter(({ event, detail }) => {
      const attemptNumber = typeof detail.attemptNumber === "number"
        ? detail.attemptNumber
        : event.attemptNumber;
      return attemptNumber > 0;
    })
    .sort((a, b) => Number(a.event.createdAt ?? 0) - Number(b.event.createdAt ?? 0))
    .map(({ event, detail }) => ({
      attemptNumber: typeof detail.attemptNumber === "number"
        ? detail.attemptNumber
        : event.attemptNumber,
      eventType: event.eventType,
      status: AsyncTaskStatusSchema.parse(event.status),
      detail,
      occurredAt: toIso(event.createdAt) ?? new Date(0).toISOString(),
    }));
}

function resolveFailureContext(
  task: AsyncTaskRow,
  events: AsyncTaskEventRow[],
): AsyncTaskFailureContextDTO | null {
  if (!task.latestFailureReason) {
    return null;
  }

  const failedEvent = events
    .slice()
    .sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0))
    .find((event) => {
      if (event.status !== "failed" && event.eventType !== "task.failed") {
        return false;
      }

      const detail = readJsonValue<Record<string, unknown>>(event.payloadJson, {});
      return detail.failureReason === task.latestFailureReason;
    });

  return {
    reason: task.latestFailureReason,
    attemptNumber: failedEvent?.attemptNumber ?? (task.latestAttemptNumber > 0 ? task.latestAttemptNumber : null),
    occurredAt: toIso(failedEvent?.createdAt),
  };
}

function resolveRecoveryPosture(task: AsyncTaskRow): AsyncTaskRecoveryPostureDTO | null {
  const recovery = readJsonValue<Record<string, unknown> | null>(task.latestRecoveryJson, null);

  if (!recovery || typeof recovery.posture !== "string") {
    return null;
  }

  return {
    posture: recovery.posture,
    detail: recovery,
    updatedAt: typeof recovery.updatedAt === "string" ? recovery.updatedAt : null,
  };
}

export function toAsyncTaskHistoryEventDTOInput(
  event: AsyncTaskEventRow,
): AsyncTaskHistoryEventDTO {
  return {
    id: event.id,
    eventType: event.eventType,
    status: AsyncTaskStatusSchema.parse(event.status),
    detail: readJsonValue<Record<string, unknown>>(event.payloadJson, {}),
    occurredAt: toIso(event.createdAt) ?? new Date(0).toISOString(),
  };
}

export function toAsyncTaskListItemDTOInput(task: AsyncTaskRow): AsyncTaskListItemDTO {
  return {
    id: task.id,
    taskType: task.taskType,
    featureArea: task.featureArea,
    status: resolveAsyncTaskDisplayStatus({
      status: task.status,
      enqueueIntentStatus: task.enqueueIntentStatus,
    }),
    enqueueIntentStatus: task.enqueueIntentStatus,
    visibilityScope: task.visibilityScope,
    entityRef: {
      entityType: task.entityType,
      entityId: task.entityId,
      entityLabel: task.entityLabel ?? null,
    },
    metadata: {
      labelKey: task.labelKey,
      summaryKey: task.summaryKey,
      featureArea: task.featureArea,
    },
    progress: readJsonValue(task.latestProgressJson, null),
    result: readJsonValue(task.latestResultJson, null),
    createdAt: toIso(task.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(task.updatedAt) ?? new Date(0).toISOString(),
    completedAt: toIso(task.completedAt),
  };
}

export function toAsyncTaskDetailDTOInput(
  task: AsyncTaskRow,
  events: AsyncTaskEventRow[],
): AsyncTaskDetailDTO {
  const history = events
    .slice()
    .sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0))
    .map(toAsyncTaskHistoryEventDTOInput);

  return {
    ...toAsyncTaskListItemDTOInput(task),
    queueJobId: task.queueJobId ?? null,
    latestAttemptNumber: task.latestAttemptNumber,
    failure: resolveFailureContext(task, events),
    recovery: resolveRecoveryPosture(task),
    attempts: resolveAttemptHistory(events),
    history,
  };
}
