import { describe, expect, it } from "vitest";

import { AsyncTaskDetailDTOSchema, AsyncTaskListItemDTOSchema } from "./dto";

describe("async task DTOs", () => {
  it("parses a task list item with structured progress", () => {
    expect(
      AsyncTaskListItemDTOSchema.parse({
        id: "task-1",
        taskType: "platform.healthcheck",
        featureArea: "platform",
        status: "dispatch_failed",
        enqueueIntentStatus: "dispatch_failed",
        visibilityScope: "actor_owned",
        entityRef: {
          entityType: "system_health_check",
          entityId: "system-1",
          entityLabel: "System health",
        },
        metadata: {
          labelKey: "asyncTasks.platform.healthCheck.label",
          summaryKey: "asyncTasks.platform.healthCheck.summary",
          featureArea: "platform",
        },
        progress: {
          stage: "persisted",
          stageLabelKey: "asyncTasks.stage.persisted",
          messageKey: "asyncTasks.progress.persisted",
          percentComplete: 0,
          counters: {
            total: 1,
            completed: 0,
            failed: 0,
            skipped: 0,
            pending: 1,
          },
          detail: {
            attempt: 1,
          },
          updatedAt: "2026-05-18T12:00:00.000Z",
        },
        result: null,
        createdAt: "2026-05-18T11:59:00.000Z",
        updatedAt: "2026-05-18T12:00:00.000Z",
        completedAt: null,
      }),
    ).toMatchObject({
      status: "dispatch_failed",
      progress: {
        stage: "persisted",
      },
    });
  });

  it("parses a detail DTO with partial-success outcome and timeline entries", () => {
    expect(
      AsyncTaskDetailDTOSchema.parse({
        id: "task-2",
        taskType: "platform.healthcheck",
        featureArea: "platform",
        status: "partially_completed",
        enqueueIntentStatus: "dispatched",
        visibilityScope: "actor_owned",
        entityRef: {
          entityType: "system_health_check",
          entityId: "system-1",
          entityLabel: null,
        },
        metadata: {
          labelKey: "asyncTasks.platform.healthCheck.label",
          summaryKey: "asyncTasks.platform.healthCheck.summary",
          featureArea: "platform",
        },
        progress: {
          stage: "completed",
          stageLabelKey: "asyncTasks.stage.completed",
          messageKey: "asyncTasks.progress.completed",
          percentComplete: 100,
          counters: {
            total: 4,
            completed: 4,
            failed: 0,
            skipped: 0,
            pending: 0,
          },
          detail: {
            durationMs: 125,
          },
          updatedAt: "2026-05-18T12:05:00.000Z",
        },
        result: {
          outcome: "partially_completed",
          titleKey: "asyncTasks.result.partial.title",
          summaryKey: "asyncTasks.result.partial.summary",
          counts: {
            total: 4,
            succeeded: 3,
            partiallySucceeded: 1,
            failed: 0,
            skipped: 0,
          },
          detail: {
            warningCount: 1,
          },
        },
        queueJobId: "job-2",
        latestAttemptNumber: 2,
        failure: {
          reason: "TEMPORARY_FAILURE",
          attemptNumber: 1,
          occurredAt: "2026-05-18T12:03:00.000Z",
        },
        recovery: {
          posture: "stalled_recovery",
          detail: {
            recoveredFrom: "worker_restart",
          },
          updatedAt: "2026-05-18T12:04:00.000Z",
        },
        attempts: [
          {
            attemptNumber: 1,
            eventType: "task.failed",
            status: "failed",
            detail: {
              failureReason: "TEMPORARY_FAILURE",
            },
            occurredAt: "2026-05-18T12:03:00.000Z",
          },
          {
            attemptNumber: 2,
            eventType: "task.recovered",
            status: "running",
            detail: {
              recoveredFrom: "stalled_recovery",
            },
            occurredAt: "2026-05-18T12:04:00.000Z",
          },
        ],
        history: [
          {
            id: "evt-1",
            eventType: "task.created",
            status: "pending_enqueue",
            detail: {
              actorId: "teacher-1",
            },
            occurredAt: "2026-05-18T12:00:00.000Z",
          },
          {
            id: "evt-2",
            eventType: "task.completed",
            status: "partially_completed",
            detail: {
              warningCount: 1,
            },
            occurredAt: "2026-05-18T12:05:00.000Z",
          },
        ],
        createdAt: "2026-05-18T12:00:00.000Z",
        updatedAt: "2026-05-18T12:05:00.000Z",
        completedAt: "2026-05-18T12:05:00.000Z",
      }),
    ).toMatchObject({
      queueJobId: "job-2",
      latestAttemptNumber: 2,
      failure: {
        reason: "TEMPORARY_FAILURE",
      },
      recovery: {
        posture: "stalled_recovery",
      },
      attempts: [
        {
          eventType: "task.failed",
        },
        {
          eventType: "task.recovered",
        },
      ],
      result: {
        outcome: "partially_completed",
      },
      history: [
        {
          eventType: "task.created",
        },
        {
          eventType: "task.completed",
        },
      ],
    });
  });
});
