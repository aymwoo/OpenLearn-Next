import "server-only";

import { Job } from "bullmq";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { asyncTaskEvents, asyncTasks } from "@/db/schema";
import { getAsyncTaskQueue } from "@/features/async-tasks/infra/bullmq";
import {
  canOperatorAccessTask,
  type AsyncTaskOperatorScope,
} from "@/features/async-tasks/server/operator-access";
import { asyncTaskRegistry } from "@/features/async-tasks/server/registry";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";

type OperatorScope = AsyncTaskOperatorScope & {
  actorId: string;
};

function readTaskDefinition(taskType: string) {
  const definition = asyncTaskRegistry[taskType as keyof typeof asyncTaskRegistry];

  if (!definition) {
    throw new Error("ASYNC_TASK_TYPE_NOT_FOUND");
  }

  return definition;
}

async function resolveOperatorScope(): Promise<OperatorScope> {
  const user = await getCurrentUserDTO();
  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const activeMemberships = memberships.filter((membership) => membership.status === "active");
  const schoolIds = [...new Set(activeMemberships.map((membership) => membership.schoolId))];

  if (activeMemberships.some((membership) => membership.role === "developer")) {
    return { actorId: user.id, role: "developer", schoolIds };
  }

  if (activeMemberships.some((membership) => membership.role === "admin")) {
    return { actorId: user.id, role: "admin", schoolIds };
  }

  throw new Error("ASYNC_TASK_OPERATOR_FORBIDDEN");
}

export async function retryAsyncTaskForOperator(input: { taskId: string }) {
  const scope = await resolveOperatorScope();
  const task = await db.query.asyncTasks.findFirst({
    where: eq(asyncTasks.id, input.taskId),
  });

  if (!task) {
    throw new Error("ASYNC_TASK_NOT_FOUND");
  }

  if (!canOperatorAccessTask(task, scope)) {
    throw new Error("ASYNC_TASK_OPERATOR_FORBIDDEN");
  }

  const definition = readTaskDefinition(task.taskType);
  if (!definition.operatorRecovery.enabled) {
    throw new Error("ASYNC_TASK_RECOVERY_NOT_SUPPORTED");
  }

  if (task.status !== "failed") {
    throw new Error("ASYNC_TASK_RECOVERY_NOT_ALLOWED");
  }

  const queue = await getAsyncTaskQueue(task.taskType as keyof typeof asyncTaskRegistry);
  const queueJobId = task.queueJobId ?? task.id;
  const job = await Job.fromId(queue, queueJobId);
  if (!job) {
    await db.insert(asyncTaskEvents).values({
      taskId: task.id,
      eventType: "task.operator_recovery_failed",
      status: task.status,
      attemptNumber: task.latestAttemptNumber,
      payloadJson: {
        actorId: scope.actorId,
        failedAt: new Date().toISOString(),
        reason: "ASYNC_TASK_JOB_NOT_FOUND",
      },
    });
    throw new Error("ASYNC_TASK_JOB_NOT_FOUND");
  }

  const previousAttemptNumber = task.latestAttemptNumber;
  const nextAttemptNumber = previousAttemptNumber + 1;
  const now = new Date();
  const timestamp = now.toISOString();

  const seededTaskRows = await db.transaction(async (tx) => {
    const updatedRows = await tx
      .update(asyncTasks)
      .set({
        status: "retrying",
        enqueueIntentStatus: "dispatched",
        latestAttemptNumber: nextAttemptNumber,
        latestFailureReason: null,
        latestProgressJson: {
          stage: "retrying",
          stageLabelKey: "asyncTasks.stage.retrying",
          messageKey: "asyncTasks.progress.retrying",
          percentComplete: 0,
          counters: null,
          detail: {
            queueJobId,
            previousAttemptNumber,
            seededAttemptNumber: nextAttemptNumber,
          },
          updatedAt: timestamp,
        },
        latestRecoveryJson: {
          posture: "retry_requested",
          queueName: definition.reliability.queueName ?? null,
          queueJobId,
          actorId: scope.actorId,
          updatedAt: timestamp,
          triggeredAt: timestamp,
          previousAttemptNumber,
          seededAttemptNumber: nextAttemptNumber,
        },
        updatedAt: now,
      })
      .where(
        and(
          eq(asyncTasks.id, task.id),
          eq(asyncTasks.status, "failed"),
          eq(asyncTasks.latestAttemptNumber, previousAttemptNumber),
        ),
      )
      .returning({ id: asyncTasks.id });

    if (updatedRows.length === 0) {
      throw new Error("ASYNC_TASK_RECOVERY_NOT_ALLOWED");
    }

    await tx.insert(asyncTaskEvents).values([
      {
        taskId: task.id,
        eventType: "task.operator_recovery_requested",
        status: "retrying",
        attemptNumber: previousAttemptNumber,
        payloadJson: {
          nextAttemptNumber,
          actorId: scope.actorId,
          triggeredAt: timestamp,
          queueJobId,
        },
        createdAt: now,
      },
      {
        taskId: task.id,
        eventType: "task.retry_seeded",
        status: "retrying",
        attemptNumber: nextAttemptNumber,
        payloadJson: {
          seededFromAttemptNumber: previousAttemptNumber,
          trigger: "operator_retry",
          seededAt: timestamp,
          queueJobId,
        },
        createdAt: now,
      },
    ]);

    return updatedRows;
  });

  if (seededTaskRows.length === 0) {
    throw new Error("ASYNC_TASK_RECOVERY_NOT_ALLOWED");
  }

  try {
    await job.retry();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "ASYNC_TASK_RETRY_FAILED";
    const failedAt = new Date();
    const failedAtIso = failedAt.toISOString();

    await db.transaction(async (tx) => {
      await tx
        .update(asyncTasks)
        .set({
          status: "failed",
          latestFailureReason: reason,
          latestProgressJson: {
            stage: "failed",
            stageLabelKey: "asyncTasks.stage.failed",
            messageKey: "asyncTasks.progress.failed",
            percentComplete: 0,
            counters: null,
            detail: {
              queueJobId,
              previousAttemptNumber,
              attemptNumber: nextAttemptNumber,
              seededAttemptNumber: nextAttemptNumber,
              failureReason: reason,
            },
            updatedAt: failedAtIso,
          },
          latestRecoveryJson: {
            posture: "retry_failed",
            queueName: definition.reliability.queueName ?? null,
            queueJobId,
            actorId: scope.actorId,
            updatedAt: failedAtIso,
            triggeredAt: timestamp,
            failedAt: failedAtIso,
            previousAttemptNumber,
            seededAttemptNumber: nextAttemptNumber,
            reason,
          },
          updatedAt: failedAt,
        })
        .where(eq(asyncTasks.id, task.id));

      await tx.insert(asyncTaskEvents).values({
        taskId: task.id,
        eventType: "task.operator_recovery_failed",
        status: "failed",
        attemptNumber: nextAttemptNumber,
        payloadJson: {
          actorId: scope.actorId,
          failedAt: failedAtIso,
          reason,
          previousAttemptNumber,
          seededAttemptNumber: nextAttemptNumber,
        },
        createdAt: failedAt,
      });
    });

    throw new Error(reason);
  }

  return {
    taskId: task.id,
    actorId: task.actorId,
    entityType: task.entityType,
    entityId: task.entityId,
    latestAttemptNumber: nextAttemptNumber,
    status: "retrying" as const,
  };
}
