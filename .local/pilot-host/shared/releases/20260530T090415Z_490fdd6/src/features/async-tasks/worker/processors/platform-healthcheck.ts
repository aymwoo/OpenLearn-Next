import type { Job, JobProgress } from "bullmq";

import {
  AsyncTaskPlatformHealthCheckResultSchema,
  AsyncTaskPlatformHealthCheckPayloadSchema,
} from "@/features/async-tasks/server/registry";

type ProgressCapableJob = Pick<Job, "name" | "data"> & {
  id?: string | null;
  updateProgress: (progress: JobProgress) => Promise<void>;
};

export async function processPlatformHealthcheckJob(job: ProgressCapableJob) {
  const payload = AsyncTaskPlatformHealthCheckPayloadSchema.parse(job.data);

  await job.updateProgress({
    stage: "running",
    messageKey: "asyncTasks.progress.running",
    detail: {
      jobId: job.id ?? null,
      requestedBy: payload.requestedBy,
      reason: payload.reason,
    },
  });

  return AsyncTaskPlatformHealthCheckResultSchema.parse({
    checksPassed: 1,
    checksFailed: 0,
  });
}
