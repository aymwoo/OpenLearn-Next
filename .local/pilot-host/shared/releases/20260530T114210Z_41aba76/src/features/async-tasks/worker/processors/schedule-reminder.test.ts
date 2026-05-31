import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

const { completeScheduleReminderDeliveryAttempt } = vi.hoisted(() => ({
  completeScheduleReminderDeliveryAttempt: vi.fn(),
}));

vi.mock("@/features/schedule/reminders/server", () => ({
  completeScheduleReminderDeliveryAttempt,
}));

import { processScheduleReminderDeliveryJob } from "./schedule-reminder";

const processorSource = readFileSync(
  "src/features/async-tasks/worker/processors/schedule-reminder.ts",
  "utf8",
);

describe("schedule reminder delivery processor", () => {
  it("parses payload, records structured progress, and delegates to reminder dispatch execution", async () => {
    completeScheduleReminderDeliveryAttempt.mockResolvedValueOnce({
      dispatchId: "dispatch-1",
      schoolId: "school-1",
      ruleId: "rule-1",
      channel: "wecom-notify",
      deliveryStatus: "sent",
      failureReason: null,
      outcome: "completed",
      titleKey: "asyncTasks.schedule.reminderDelivery.result.sent",
      summaryKey: "asyncTasks.schedule.reminderDelivery.result.sentSummary",
      counts: {
        total: 1,
        succeeded: 1,
        partiallySucceeded: 0,
        failed: 0,
        skipped: 0,
      },
      detail: {
        dispatchId: "dispatch-1",
      },
    });

    const updateProgress = vi.fn(async () => undefined);

    const result = await processScheduleReminderDeliveryJob({
      id: "job-1",
      name: "schedule.reminder_delivery",
      data: {
        dispatchId: "dispatch-1",
        schoolId: "school-1",
        ruleId: "rule-1",
        actorId: "teacher-1",
        channel: "wecom-notify",
        scheduledFor: "2026-05-20T08:00:00.000Z",
        payload: { recipientScope: "teacher" },
      },
      updateProgress,
    });

    expect(updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "running",
        messageKey: "asyncTasks.schedule.reminderDelivery.progress.running",
        detail: expect.objectContaining({
          dispatchId: "dispatch-1",
          schoolId: "school-1",
        }),
      }),
    );
    expect(completeScheduleReminderDeliveryAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ dispatchId: "dispatch-1", schoolId: "school-1" }),
      expect.objectContaining({ status: "sent", failureReason: null }),
    );
    expect(result).toEqual(expect.objectContaining({ deliveryStatus: "sent", outcome: "completed" }));
  });

  it("keeps processor discipline away from ui logic and feature-local recovery", () => {
    expect(processorSource).toContain("completeScheduleReminderDeliveryAttempt(payload, delivery)");
    expect(processorSource).toContain("dispatchScheduleReminder(");
    expect(processorSource).not.toContain("router.refresh(");
    expect(processorSource).not.toContain("retryScheduleReminderDispatch");
  });
});
