import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { asyncTaskEvents, asyncTasks } from "@/db/schema";
import { AsyncTaskDetailDTOSchema, asyncTaskRegistry } from "@/features/async-tasks";
import { getAsyncTaskQueue } from "@/features/async-tasks/infra/bullmq";
import { buildAsyncTaskJobOptions } from "@/features/async-tasks/shared/idempotency";
import { toAsyncTaskDetailDTOInput } from "@/features/async-tasks/server/mapper";
import { updateTag } from "next/cache";

import { cacheTags } from "@/lib/cache-policy";

type EnqueueAsyncTaskInput = {
  actorId: string;
  schoolId: string;
  taskType: keyof typeof asyncTaskRegistry;
  entityRef: {
    entityType: string;
    entityId: string;
    entityLabel?: string | null;
  };
  payload: unknown;
  dispatchRequested?: boolean;
  dispatchFailureReason?: string | null;
};

type EnqueueAsyncTaskResult = Awaited<ReturnType<typeof enqueueAsyncTask>>;

type AsyncTaskEventInsert = typeof asyncTaskEvents.$inferInsert;

export async function enqueueAsyncTask(input: EnqueueAsyncTaskInput) {
  const definition = asyncTaskRegistry[input.taskType];

  if (!definition) {
    throw new Error("ASYNC_TASK_TYPE_NOT_FOUND");
  }

  const payload = definition.payloadSchema.parse(input.payload);
  const normalizedEntityRef = {
    entityType: input.entityRef.entityType,
    entityId: input.entityRef.entityId,
    entityLabel: input.entityRef.entityLabel ?? null,
  };

  const initialStatus = input.dispatchRequested ? "dispatching" : "pending_enqueue";
  const initialEnqueueIntentStatus = input.dispatchFailureReason
    ? "dispatch_failed"
    : initialStatus;
  const now = new Date();

  const [task] = await db
    .insert(asyncTasks)
    .values({
      actorId: input.actorId,
      schoolId: input.schoolId,
      taskType: definition.taskType,
      featureArea: definition.featureArea,
      status: input.dispatchFailureReason ? "dispatch_failed" : initialStatus,
      enqueueIntentStatus: initialEnqueueIntentStatus,
      visibilityScope: definition.visibilityScope,
      entityType: normalizedEntityRef.entityType,
      entityId: normalizedEntityRef.entityId,
      entityLabel: normalizedEntityRef.entityLabel,
      labelKey: definition.labelKey,
      summaryKey: definition.summaryKey,
      payloadJson: payload,
      latestProgressJson: {
        stage: "persisted",
        stageLabelKey: "asyncTasks.stage.persisted",
        messageKey: input.dispatchFailureReason
          ? "asyncTasks.progress.dispatchFailed"
          : input.dispatchRequested
            ? "asyncTasks.progress.dispatching"
            : "asyncTasks.progress.pendingEnqueue",
        percentComplete: 0,
        counters: {
          total: 1,
          completed: 0,
          failed: input.dispatchFailureReason ? 1 : 0,
          skipped: 0,
          pending: input.dispatchFailureReason ? 0 : 1,
        },
        detail: input.dispatchFailureReason
          ? { failureReason: input.dispatchFailureReason }
          : { dispatchRequested: Boolean(input.dispatchRequested) },
        updatedAt: now.toISOString(),
      },
      updatedAt: now,
    })
    .returning();

  const eventRows: AsyncTaskEventInsert[] = [
    {
      taskId: task.id,
      eventType: "task.created",
      status: "pending_enqueue",
      payloadJson: {
        actorId: input.actorId,
        schoolId: input.schoolId,
        taskType: definition.taskType,
      },
    },
  ];

  if (input.dispatchRequested) {
    eventRows.push({
      taskId: task.id,
      eventType: input.dispatchFailureReason ? "task.dispatch_failed" : "task.dispatching",
      status: input.dispatchFailureReason ? "dispatch_failed" : "dispatching",
      payloadJson: input.dispatchFailureReason
        ? { failureReason: input.dispatchFailureReason }
        : { dispatchRequested: true },
    });
  }

  const events = await db.insert(asyncTaskEvents).values(eventRows).returning();

  let finalTask = task;
  let finalEvents = events;

  if (input.dispatchRequested && !input.dispatchFailureReason) {
    try {
      const queue = await getAsyncTaskQueue(input.taskType);
      const dispatchOptions = buildAsyncTaskJobOptions({
        taskId: task.id,
        taskType: definition.taskType,
        reliability: definition.reliability,
      });
      const job = await queue.add(definition.taskType, payload, dispatchOptions);
      const dispatchAt = new Date();

      const [updatedTask] = await db
        .update(asyncTasks)
        .set({
          queueJobId: job.id,
          status: "queued",
          enqueueIntentStatus: "dispatched",
          latestProgressJson: {
            stage: "queued",
            stageLabelKey: "asyncTasks.stage.queued",
            messageKey: "asyncTasks.progress.queued",
            percentComplete: 0,
            counters: {
              total: 1,
              completed: 0,
              failed: 0,
              skipped: 0,
              pending: 1,
            },
            detail: {
              dispatchRequested: true,
              queueJobId: job.id,
              jobId: dispatchOptions.jobId,
            },
            updatedAt: dispatchAt.toISOString(),
          },
          updatedAt: dispatchAt,
        })
        .where(eq(asyncTasks.id, task.id))
        .returning();

      const [dispatchEvent] = await db
        .insert(asyncTaskEvents)
        .values({
          taskId: task.id,
          eventType: "task.dispatch_requested",
          status: "queued",
          attemptNumber: 0,
          payloadJson: {
            dispatchRequested: true,
            queueJobId: job.id,
            jobId: dispatchOptions.jobId,
          },
          createdAt: dispatchAt,
        })
        .returning();

      finalTask = updatedTask;
      finalEvents = [dispatchEvent, ...events];
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : "ASYNC_TASK_DISPATCH_FAILED";
      const failedAt = new Date();

      const [updatedTask] = await db
        .update(asyncTasks)
        .set({
          status: "dispatch_failed",
          enqueueIntentStatus: "dispatch_failed",
          latestFailureReason: failureReason,
          latestProgressJson: {
            stage: "dispatch_failed",
            stageLabelKey: "asyncTasks.stage.dispatch_failed",
            messageKey: "asyncTasks.progress.dispatchFailed",
            percentComplete: 0,
            counters: {
              total: 1,
              completed: 0,
              failed: 1,
              skipped: 0,
              pending: 0,
            },
            detail: {
              failureReason,
            },
            updatedAt: failedAt.toISOString(),
          },
          updatedAt: failedAt,
        })
        .where(eq(asyncTasks.id, task.id))
        .returning();

      const [failureEvent] = await db
        .insert(asyncTaskEvents)
        .values({
          taskId: task.id,
          eventType: "task.dispatch_failed",
          status: "dispatch_failed",
          attemptNumber: 0,
          payloadJson: {
            failureReason,
          },
          createdAt: failedAt,
        })
        .returning();

      finalTask = updatedTask;
      finalEvents = [failureEvent, ...events];
    }
  }

  updateTag(cacheTags.asyncTask(finalTask.id));
  updateTag(cacheTags.asyncTaskList(finalTask.actorId));
  updateTag(cacheTags.asyncTaskEntity(finalTask.entityType, finalTask.entityId));

  return AsyncTaskDetailDTOSchema.parse(toAsyncTaskDetailDTOInput(finalTask, finalEvents));
}

export type { EnqueueAsyncTaskInput, EnqueueAsyncTaskResult };
