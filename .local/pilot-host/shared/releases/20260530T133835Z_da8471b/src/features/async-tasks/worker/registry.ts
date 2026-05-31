import "server-only";

import type { Job, Processor } from "bullmq";

import {
  asyncTaskRegistry,
} from "@/features/async-tasks/server/registry";

import { processCourseImportApplyBatchJob } from "./processors/course-import";
import { processClassroomSessionSummaryJob } from "./processors/classroom-session-summary";
import { processPlatformHealthcheckJob } from "./processors/platform-healthcheck";
import { processResourceKnowledgeSourceIngestJob } from "./processors/resource-knowledge-source";
import { processScheduleReminderDeliveryJob } from "./processors/schedule-reminder";

type AsyncTaskProcessor = Processor;

const asyncTaskWorkerProcessors: Record<string, AsyncTaskProcessor> = {
  "classroom.session_summary": async (job: Job) => processClassroomSessionSummaryJob(job),
  "course_import.apply_batch": async (job: Job) => processCourseImportApplyBatchJob(job),
  "platform.healthcheck": async (job: Job) => processPlatformHealthcheckJob(job),
  "resource.knowledge_source_ingest": async (job: Job) => processResourceKnowledgeSourceIngestJob(job),
  "schedule.reminder_delivery": async (job: Job) => processScheduleReminderDeliveryJob(job),
};

export function getAsyncTaskWorkerProcessor(taskType: string) {
  return asyncTaskWorkerProcessors[taskType] ?? null;
}

export function buildAsyncTaskQueueProcessor(queueName: string): AsyncTaskProcessor {
  return async (job) => {
    const processor = getAsyncTaskWorkerProcessor(job.name);

    if (!processor) {
      throw new Error(`ASYNC_TASK_PROCESSOR_NOT_FOUND:${queueName}:${job.name}`);
    }

    return processor(job);
  };
}
