import type { Job, JobProgress } from "bullmq";

import { asyncTaskRegistry } from "@/features/async-tasks/server/registry";
import { ClassroomSessionSummaryTaskPayloadSchema } from "@/lib/dto/classroom";
import { executeClassroomSessionSummaryTask } from "@/lib/dal/classroom";

type ProgressCapableJob = Pick<Job, "name" | "data"> & {
  id?: string | null;
  updateProgress: (progress: JobProgress) => Promise<void>;
};

export async function processClassroomSessionSummaryJob(job: ProgressCapableJob) {
  asyncTaskRegistry[job.name].payloadSchema.parse(job.data);
  const payload = ClassroomSessionSummaryTaskPayloadSchema.parse(job.data);

  await job.updateProgress({
    stage: "running",
    stageLabelKey: "asyncTasks.stage.running",
    messageKey: "asyncTasks.classroom.sessionSummary.progress.running",
    percentComplete: payload.triggerMode === "finalize" ? 15 : 10,
    counters: null,
    detail: {
      jobId: job.id ?? null,
      sessionId: payload.sessionId,
      schoolId: payload.schoolId,
      triggerMode: payload.triggerMode,
      eventType: payload.eventType,
      eventVersion: payload.eventVersion,
    },
    updatedAt: new Date().toISOString(),
  });

  return executeClassroomSessionSummaryTask(payload);
}
