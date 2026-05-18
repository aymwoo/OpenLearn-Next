import "server-only";

import type { Job, Processor } from "bullmq";

import {
  AsyncTaskPlatformHealthCheckResultSchema,
  asyncTaskRegistry,
} from "@/features/async-tasks/server/registry";

type AsyncTaskProcessor = Processor;

const asyncTaskWorkerProcessors: Record<string, AsyncTaskProcessor> = {
  "platform.healthcheck": async (job: Job) => {
    const definition = asyncTaskRegistry[job.name];
    const payload = definition?.payloadSchema.parse(job.data);

    return AsyncTaskPlatformHealthCheckResultSchema.parse({
      checksPassed: payload ? 1 : 0,
      checksFailed: 0,
    });
  },
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
