import type { Job, JobProgress } from "bullmq";

import {
  asyncTaskRegistry,
} from "@/features/async-tasks/server/registry";
import { CourseImportAsyncTaskPayloadSchema } from "@/lib/dto/course-import";
import { executeCourseImportApplyTask } from "@/lib/dal/course-import";

type ProgressCapableJob = Pick<Job, "name" | "data"> & {
  id?: string | null;
  updateProgress: (progress: JobProgress) => Promise<void>;
};

export async function processCourseImportApplyBatchJob(job: ProgressCapableJob) {
  asyncTaskRegistry[job.name].payloadSchema.parse(job.data);
  const payload = CourseImportAsyncTaskPayloadSchema.parse(job.data);

  await job.updateProgress({
    stage: "running",
    stageLabelKey: "asyncTasks.stage.running",
    messageKey: "asyncTasks.courseImport.applyBatch.progress.running",
    percentComplete: 5,
    counters: null,
    detail: {
      jobId: job.id ?? null,
      batchId: payload.batchId,
      schoolId: payload.schoolId,
      actorId: payload.actorId,
    },
    updatedAt: new Date().toISOString(),
  });

  return executeCourseImportApplyTask(payload);
}
