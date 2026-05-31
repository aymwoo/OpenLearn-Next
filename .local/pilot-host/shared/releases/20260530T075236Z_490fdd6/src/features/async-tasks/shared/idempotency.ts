import type { JobsOptions } from "bullmq";

import type { AsyncTaskReliabilityMetadata } from "./contract";

type AsyncTaskIdentityInput = {
  taskId: string;
  taskType: string;
  reliability: AsyncTaskReliabilityMetadata;
};

export function buildAsyncTaskJobId(input: AsyncTaskIdentityInput) {
  switch (input.reliability.idempotency?.strategy) {
    case "task_type_and_task_id":
      return `${input.taskType}:${input.taskId}`;
    case "task_id":
    default:
      return input.taskId;
  }
}

export function buildAsyncTaskDeduplicationKey(input: AsyncTaskIdentityInput) {
  return buildAsyncTaskJobId(input);
}

export function buildAsyncTaskJobOptions(input: AsyncTaskIdentityInput): JobsOptions {
  const { reliability } = input;

  return {
    jobId: buildAsyncTaskJobId(input),
    attempts: reliability.attempts,
    backoff: reliability.backoff,
  } satisfies JobsOptions;
}
