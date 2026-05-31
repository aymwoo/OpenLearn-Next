import type { Job, JobProgress } from "bullmq";

import { asyncTaskRegistry } from "@/features/async-tasks/server/registry";
import { ResourceKnowledgeSourceTaskPayloadSchema } from "@/lib/dto/resource-ai";
import { executeResourceKnowledgeSourceTask } from "@/lib/dal/ai-rag";

type ProgressCapableJob = Pick<Job, "name" | "data"> & {
  id?: string | null;
  updateProgress: (progress: JobProgress) => Promise<void>;
};

export async function processResourceKnowledgeSourceIngestJob(job: ProgressCapableJob) {
  asyncTaskRegistry[job.name].payloadSchema.parse(job.data);
  const payload = ResourceKnowledgeSourceTaskPayloadSchema.parse(job.data);

  await job.updateProgress({
    stage: "running",
    stageLabelKey: "asyncTasks.stage.running",
    messageKey: "asyncTasks.resource.knowledgeSourceIngest.progress.running",
    percentComplete: 10,
    counters: null,
    detail: {
      jobId: job.id ?? null,
      knowledgeSourceId: payload.knowledgeSourceId,
      resourceId: payload.resourceId,
      schoolId: payload.schoolId,
      actorId: payload.actorId,
    },
    updatedAt: new Date().toISOString(),
  });

  return executeResourceKnowledgeSourceTask(payload);
}
