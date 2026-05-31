import type { Job, JobProgress } from "bullmq";

import { asyncTaskRegistry } from "@/features/async-tasks/server/registry";
import { ScheduleReminderDeliveryTaskPayloadSchema } from "@/features/schedule/shared/dto/reminders";
import { completeScheduleReminderDeliveryAttempt } from "@/features/schedule/reminders/server";
import { dispatchScheduleReminder } from "@/server/schedule/reminder-dispatch";

type ProgressCapableJob = Pick<Job, "name" | "data"> & {
  id?: string | null;
  updateProgress: (progress: JobProgress) => Promise<void>;
};

export async function processScheduleReminderDeliveryJob(job: ProgressCapableJob) {
  asyncTaskRegistry[job.name].payloadSchema.parse(job.data);
  const payload = ScheduleReminderDeliveryTaskPayloadSchema.parse(job.data);

  await job.updateProgress({
    stage: "running",
    stageLabelKey: "asyncTasks.stage.running",
    messageKey: "asyncTasks.schedule.reminderDelivery.progress.running",
    percentComplete: 10,
    counters: null,
    detail: {
      jobId: job.id ?? null,
      dispatchId: payload.dispatchId,
      schoolId: payload.schoolId,
      ruleId: payload.ruleId,
    },
    updatedAt: new Date().toISOString(),
  });

  const delivery = await dispatchScheduleReminder({
    channel: payload.channel,
    payload: payload.payload,
  });

  return completeScheduleReminderDeliveryAttempt(payload, delivery);
}
