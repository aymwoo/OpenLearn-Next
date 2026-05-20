import { describe, expect, it } from "vitest";

import {
  courseImportApplyBatchTaskDefinition,
  platformHealthCheckTaskDefinition,
  scheduleReminderDeliveryTaskDefinition,
} from "./registry";

describe("async task registry reliability metadata", () => {
  it("declares retry, backoff, dead-letter, and idempotency posture explicitly", () => {
    expect(platformHealthCheckTaskDefinition.reliability).toMatchObject({
      queueName: "platform-health",
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      deadLetter: {
        terminalStatus: "failed",
      },
      idempotency: {
        strategy: "task_id",
      },
    });
  });

  it("locks course import visibility to school operators", () => {
    expect(courseImportApplyBatchTaskDefinition.visibilityScope).toBe("school_operator");
  });

  it("locks local operator recovery metadata only for supported task types", () => {
    expect(courseImportApplyBatchTaskDefinition.operatorRecovery).toEqual({
      enabled: true,
      mode: "same_task_new_attempt",
      terminalStatuses: ["failed"],
    });
    expect(platformHealthCheckTaskDefinition.operatorRecovery.enabled).toBe(false);
  });

  it("declares reminder delivery as school-operator visible scheduled workload metadata", () => {
    expect(scheduleReminderDeliveryTaskDefinition).toMatchObject({
      taskType: "schedule.reminder_delivery",
      featureArea: "schedule",
      visibilityScope: "school_operator",
      entityRefKind: "schedule_reminder_dispatch",
      operatorRecovery: {
        enabled: true,
        mode: "same_task_new_attempt",
        terminalStatuses: ["failed"],
      },
      reliability: {
        queueName: "schedule-reminders",
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2_000,
        },
        idempotency: {
          strategy: "task_id",
        },
      },
    });
  });
});
