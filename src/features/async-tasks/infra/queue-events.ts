import "server-only";

import { and, desc, eq, inArray, or } from "drizzle-orm";
import type { QueueEvents } from "bullmq";
import { updateTag } from "next/cache";

import { db } from "@/db";
import { asyncTaskEvents, asyncTasks } from "@/db/schema";
import { asyncTaskRegistry } from "@/features/async-tasks/server/registry";
import {
  AsyncTaskResultSummarySchema,
} from "@/features/async-tasks/shared/contract";
import { cacheTags } from "@/lib/cache-policy";

import { resolveAsyncTaskQueueName } from "./bullmq";
import { getBullmqInstanceId } from "./connection";

type AsyncTaskRow = typeof asyncTasks.$inferSelect;
type AsyncTaskEventInsert = typeof asyncTaskEvents.$inferInsert;

type QueueEventName =
  | "waiting"
  | "active"
  | "progress"
  | "completed"
  | "failed"
  | "stalled"
  | "deduplicated";

type QueueProjectionPayload = {
  jobId?: string;
  prev?: string;
  data?: unknown;
  returnvalue?: unknown;
  failedReason?: string;
  deduplicationId?: string;
};

type QueueProjectionInput = {
  queueName: string;
  eventName: QueueEventName;
  payload: QueueProjectionPayload;
};

type RecoveryPosture = {
  posture: string;
  queueName: string;
  updatedAt: string;
  instanceId: string;
  signal?: string;
  previousStatus?: string;
  recoveredFrom?: string;
};

type PersistedProjection = {
  status: NonNullable<typeof asyncTasks.$inferInsert.status>;
  enqueueIntentStatus?: NonNullable<typeof asyncTasks.$inferInsert.enqueueIntentStatus>;
  latestProgressJson?: Record<string, unknown> | null;
  latestResultJson?: Record<string, unknown> | null;
  latestFailureReason?: string | null;
  latestRecoveryJson?: RecoveryPosture | null;
  latestAttemptNumber?: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  eventType: string;
  eventPayload: Record<string, unknown>;
};

function readJsonRecord(value: unknown) {
  if (!value || typeof value !== "object") {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

function readSeededAttemptNumber(task: AsyncTaskRow) {
  const recovery = readJsonRecord(task.latestRecoveryJson);
  const progress = readJsonRecord(task.latestProgressJson);
  const progressDetail = readJsonRecord(progress.detail);
  const candidate =
    typeof recovery.seededAttemptNumber === "number"
      ? recovery.seededAttemptNumber
      : typeof progressDetail.seededAttemptNumber === "number"
        ? progressDetail.seededAttemptNumber
        : null;

  return candidate && candidate > 0 ? candidate : null;
}

function toIso(value: Date) {
  return value.toISOString();
}

function buildProgressSnapshot(input: {
  stage: string;
  messageKey: string;
  percentComplete?: number | null;
  detail?: Record<string, unknown>;
}) {
  return {
    stage: input.stage,
    stageLabelKey: `asyncTasks.stage.${input.stage}`,
    messageKey: input.messageKey,
    percentComplete: input.percentComplete ?? null,
    counters: null,
    detail: input.detail ?? {},
    updatedAt: new Date().toISOString(),
  };
}

async function findTaskByQueueJobId(jobId: string) {
  return db.query.asyncTasks.findFirst({
    where: or(eq(asyncTasks.queueJobId, jobId), eq(asyncTasks.id, jobId)),
    orderBy: [desc(asyncTasks.updatedAt)],
  });
}

function invalidateAsyncTaskCache(task: AsyncTaskRow) {
  updateTag(cacheTags.asyncTask(task.id));
  updateTag(cacheTags.asyncTaskList(task.actorId));
  updateTag(cacheTags.asyncTaskEntity(task.entityType, task.entityId));

  if (task.entityType === "course_import_batch") {
    updateTag(cacheTags.teacherCourses(task.actorId));
    updateTag(cacheTags.courseImportSchool(task.schoolId));
    updateTag(cacheTags.courseImportBatch(task.entityId));
  }
}

function buildRecoveryPosture(input: {
  posture: string;
  queueName: string;
  previousStatus?: string;
  recoveredFrom?: string;
  signal?: string;
}) {
  return {
    posture: input.posture,
    queueName: input.queueName,
    updatedAt: new Date().toISOString(),
    instanceId: getBullmqInstanceId(),
    previousStatus: input.previousStatus,
    recoveredFrom: input.recoveredFrom,
    signal: input.signal,
  } satisfies RecoveryPosture;
}

function buildCompletedResultSummary(input: {
  queueName: string;
  jobId: string;
  attemptNumber: number;
  returnvalue: unknown;
}) {
  const parsedResult = AsyncTaskResultSummarySchema.safeParse(input.returnvalue);

  if (parsedResult.success) {
    return {
      status:
        parsedResult.data.outcome === "partially_completed"
          ? "partially_completed"
          : parsedResult.data.outcome,
      result: {
        ...parsedResult.data,
        detail: {
          ...parsedResult.data.detail,
          jobId: input.jobId,
          queueName: input.queueName,
          attemptNumber: input.attemptNumber,
        },
      },
      eventType:
        parsedResult.data.outcome === "partially_completed"
          ? "task.partially_completed"
          : "task.completed",
    } as const;
  }

  return {
    status: "completed",
    result: {
      outcome: "completed",
      titleKey: "asyncTasks.result.completed",
      summaryKey: null,
      counts: null,
      detail: {
        jobId: input.jobId,
        queueName: input.queueName,
        returnvalue: input.returnvalue ?? null,
        attemptNumber: input.attemptNumber,
      },
    },
    eventType: "task.completed",
  } as const;
}

function resolveProjection(task: AsyncTaskRow, input: QueueProjectionInput): PersistedProjection | null {
  const now = new Date();
  const jobId = input.payload.jobId ?? task.queueJobId ?? task.id;
  const baseDetail = {
    jobId,
    queueName: input.queueName,
    previousStatus: task.status,
  } satisfies Record<string, unknown>;

  switch (input.eventName) {
    case "waiting": {
      const seededAttemptNumber = readSeededAttemptNumber(task);
      const attemptNumber = seededAttemptNumber ?? task.latestAttemptNumber;
      const status = task.status === "retrying" || attemptNumber > 0 ? "retrying" : "queued";
      return {
        status,
        enqueueIntentStatus: "dispatched",
        latestProgressJson: buildProgressSnapshot({
          stage: status,
          messageKey:
            status === "retrying"
              ? "asyncTasks.progress.retrying"
              : "asyncTasks.progress.queued",
          detail: {
            ...baseDetail,
            attemptNumber,
            seededAttemptNumber: seededAttemptNumber ?? null,
          },
        }),
        latestRecoveryJson:
          status === "retrying"
            ? buildRecoveryPosture({
                posture: "retrying",
                queueName: input.queueName,
                previousStatus: task.status,
              })
            : task.latestRecoveryJson as RecoveryPosture | null,
        eventType: status === "retrying" ? "task.retrying" : "task.queued",
        eventPayload: {
          ...baseDetail,
          attemptNumber,
          seededAttemptNumber: seededAttemptNumber ?? null,
        },
      };
    }
    case "active": {
      const seededAttemptNumber = readSeededAttemptNumber(task);
      const nextAttemptNumber =
        task.status === "retrying"
        && seededAttemptNumber != null
        && task.latestAttemptNumber === seededAttemptNumber
          ? seededAttemptNumber
          : Math.max(task.latestAttemptNumber, 0) + 1;
      const recoveryPosture = task.status === "stalled_recovery"
        ? buildRecoveryPosture({
            posture: "recovered",
            queueName: input.queueName,
            previousStatus: task.status,
            recoveredFrom: "stalled_recovery",
          })
        : task.latestRecoveryJson as RecoveryPosture | null;

      return {
        status: "running",
        enqueueIntentStatus: "dispatched",
        latestAttemptNumber: nextAttemptNumber,
        latestRecoveryJson: recoveryPosture,
        latestProgressJson: buildProgressSnapshot({
          stage: "running",
          messageKey: "asyncTasks.progress.running",
          detail: {
            ...baseDetail,
            attemptNumber: nextAttemptNumber,
            seededAttemptNumber: seededAttemptNumber ?? null,
            recoveredFrom: recoveryPosture?.recoveredFrom ?? null,
            prev: input.payload.prev ?? null,
          },
        }),
        startedAt: task.startedAt ?? now,
        eventType: task.status === "stalled_recovery" ? "task.recovered" : "task.started",
        eventPayload: {
          ...baseDetail,
          attemptNumber: nextAttemptNumber,
          seededAttemptNumber: seededAttemptNumber ?? null,
          recoveredFrom: recoveryPosture?.recoveredFrom ?? null,
          prev: input.payload.prev ?? null,
        },
      };
    }
    case "progress": {
      return {
        status: task.status === "retrying" ? "retrying" : "running",
        latestProgressJson: buildProgressSnapshot({
          stage: "running",
          messageKey: "asyncTasks.progress.running",
          detail: {
            ...baseDetail,
            attemptNumber: task.latestAttemptNumber,
            progress: input.payload.data ?? null,
          },
        }),
        eventType: "task.progressed",
        eventPayload: {
          ...baseDetail,
          attemptNumber: task.latestAttemptNumber,
          progress: input.payload.data ?? null,
        },
      };
    }
    case "completed": {
      const completedResult = buildCompletedResultSummary({
        queueName: input.queueName,
        jobId,
        attemptNumber: task.latestAttemptNumber,
        returnvalue: input.payload.returnvalue,
      });

      return {
        status: completedResult.status,
        latestResultJson: completedResult.result,
        latestProgressJson: buildProgressSnapshot({
          stage: completedResult.status,
          messageKey:
            completedResult.status === "partially_completed"
              ? "asyncTasks.progress.partiallyCompleted"
              : "asyncTasks.progress.completed",
          percentComplete: 100,
          detail: {
            ...baseDetail,
            attemptNumber: task.latestAttemptNumber,
            outcome: completedResult.result.outcome,
          },
        }),
        completedAt: now,
        eventType: completedResult.eventType,
        eventPayload: {
          ...baseDetail,
          attemptNumber: task.latestAttemptNumber,
          returnvalue: input.payload.returnvalue ?? null,
        },
      };
    }
    case "failed": {
      return {
        status: "failed",
        latestFailureReason: input.payload.failedReason ?? "QUEUE_JOB_FAILED",
        latestProgressJson: buildProgressSnapshot({
          stage: "failed",
          messageKey: "asyncTasks.progress.failed",
          detail: {
            ...baseDetail,
            attemptNumber: task.latestAttemptNumber,
            failureReason: input.payload.failedReason ?? "QUEUE_JOB_FAILED",
          },
        }),
        eventType: "task.failed",
        eventPayload: {
          ...baseDetail,
          attemptNumber: task.latestAttemptNumber,
          failureReason: input.payload.failedReason ?? "QUEUE_JOB_FAILED",
        },
      };
    }
    case "stalled": {
      const recovery = buildRecoveryPosture({
        posture: "stalled_recovery",
        queueName: input.queueName,
        previousStatus: task.status,
      });

      return {
        status: "stalled_recovery",
        latestRecoveryJson: recovery,
        latestProgressJson: buildProgressSnapshot({
          stage: "stalled_recovery",
          messageKey: "asyncTasks.progress.stalledRecovery",
          detail: {
            ...baseDetail,
            attemptNumber: task.latestAttemptNumber,
            recovery,
          },
        }),
        eventType: "task.stalled",
        eventPayload: {
          ...baseDetail,
          attemptNumber: task.latestAttemptNumber,
          recovery,
        },
      };
    }
    case "deduplicated": {
      return {
        status: task.status,
        eventType: "task.deduplicated",
        eventPayload: {
          ...baseDetail,
          attemptNumber: task.latestAttemptNumber,
          deduplicationId: input.payload.deduplicationId ?? null,
        },
      };
    }
    default:
      return null;
  }
}

export async function projectAsyncTaskQueueEvent(input: QueueProjectionInput) {
  const jobId = input.payload.jobId?.trim();

  if (!jobId) {
    return null;
  }

  const task = await findTaskByQueueJobId(jobId);

  if (!task) {
    return null;
  }

  const projection = resolveProjection(task, input);

  if (!projection) {
    return task;
  }

  const now = new Date();

  const [updatedTask] = await db.transaction(async (tx) => {
    const [nextTask] = await tx
      .update(asyncTasks)
      .set({
        status: projection.status,
        enqueueIntentStatus: projection.enqueueIntentStatus ?? task.enqueueIntentStatus,
        latestProgressJson:
          projection.latestProgressJson === undefined
            ? task.latestProgressJson
            : projection.latestProgressJson,
        latestResultJson:
          projection.latestResultJson === undefined
            ? task.latestResultJson
            : projection.latestResultJson,
        latestFailureReason:
          projection.latestFailureReason === undefined
            ? task.latestFailureReason
            : projection.latestFailureReason,
        latestRecoveryJson:
          projection.latestRecoveryJson === undefined
            ? task.latestRecoveryJson
            : projection.latestRecoveryJson,
        latestAttemptNumber:
          projection.latestAttemptNumber === undefined
            ? task.latestAttemptNumber
            : projection.latestAttemptNumber,
        startedAt:
          projection.startedAt === undefined
            ? task.startedAt
            : projection.startedAt,
        completedAt:
          projection.completedAt === undefined
            ? task.completedAt
            : projection.completedAt,
        updatedAt: now,
      })
      .where(eq(asyncTasks.id, task.id))
      .returning();

    const eventRow: AsyncTaskEventInsert = {
      taskId: task.id,
      eventType: projection.eventType,
      status: projection.status,
      attemptNumber:
        projection.latestAttemptNumber
        ?? task.latestAttemptNumber,
      payloadJson: {
        ...projection.eventPayload,
        projectedAt: toIso(now),
      },
      createdAt: now,
    };

    await tx.insert(asyncTaskEvents).values(eventRow);

    return [nextTask];
  });

  invalidateAsyncTaskCache(updatedTask);
  return updatedTask;
}

export async function recordAsyncTaskWorkerShutdownRequested(input: {
  queueNames: string[];
  signal: string;
}) {
  const queueNames = new Set(input.queueNames);
  const taskTypes = Object.keys(asyncTaskRegistry).filter((taskType) =>
    queueNames.has(resolveAsyncTaskQueueName(taskType as keyof typeof asyncTaskRegistry)),
  );

  if (taskTypes.length === 0) {
    return [];
  }

  const runningTasks = await db.query.asyncTasks.findMany({
    where: and(
      inArray(asyncTasks.taskType, taskTypes),
      inArray(asyncTasks.status, ["running", "retrying", "stalled_recovery"]),
    ),
  });

  const now = new Date();

  await db.transaction(async (tx) => {
    for (const task of runningTasks) {
      const recovery = buildRecoveryPosture({
        posture: "worker_shutdown_requested",
        queueName: resolveAsyncTaskQueueName(task.taskType as keyof typeof asyncTaskRegistry),
        previousStatus: task.status,
        signal: input.signal,
      });

      await tx
        .update(asyncTasks)
        .set({
          latestRecoveryJson: recovery,
          updatedAt: now,
        })
        .where(eq(asyncTasks.id, task.id));

      await tx.insert(asyncTaskEvents).values({
        taskId: task.id,
        eventType: "task.worker_shutdown_requested",
        status: task.status,
        attemptNumber: task.latestAttemptNumber,
        payloadJson: {
          signal: input.signal,
          queueJobId: task.queueJobId,
          recovery,
          projectedAt: toIso(now),
        },
        createdAt: now,
      });
    }
  });

  runningTasks.forEach(invalidateAsyncTaskCache);
  return runningTasks;
}

export class AsyncTaskQueueEventsProjector {
  private attached = false;

  constructor(
    private readonly queueName: string,
    private readonly queueEvents: QueueEvents,
  ) {}

  start() {
    if (this.attached) {
      return;
    }

    this.attached = true;

    this.queueEvents.on("waiting", (payload) => {
      void projectAsyncTaskQueueEvent({
        queueName: this.queueName,
        eventName: "waiting",
        payload,
      });
    });

    this.queueEvents.on("active", (payload) => {
      void projectAsyncTaskQueueEvent({
        queueName: this.queueName,
        eventName: "active",
        payload,
      });
    });

    this.queueEvents.on("progress", (payload) => {
      void projectAsyncTaskQueueEvent({
        queueName: this.queueName,
        eventName: "progress",
        payload,
      });
    });

    this.queueEvents.on("completed", (payload) => {
      void projectAsyncTaskQueueEvent({
        queueName: this.queueName,
        eventName: "completed",
        payload,
      });
    });

    this.queueEvents.on("failed", (payload) => {
      void projectAsyncTaskQueueEvent({
        queueName: this.queueName,
        eventName: "failed",
        payload,
      });
    });

    this.queueEvents.on("stalled", (payload) => {
      void projectAsyncTaskQueueEvent({
        queueName: this.queueName,
        eventName: "stalled",
        payload,
      });
    });

    this.queueEvents.on("deduplicated", (payload) => {
      void projectAsyncTaskQueueEvent({
        queueName: this.queueName,
        eventName: "deduplicated",
        payload,
      });
    });
  }

  async close() {
    this.attached = false;
  }
}

export function createAsyncTaskQueueEventsProjector(input: {
  queueName: string;
  queueEvents: QueueEvents;
}) {
  return new AsyncTaskQueueEventsProjector(input.queueName, input.queueEvents);
}
