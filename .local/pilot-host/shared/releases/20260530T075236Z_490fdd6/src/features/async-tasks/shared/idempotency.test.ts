import { describe, expect, it } from "vitest";

import { platformHealthCheckTaskDefinition } from "../server/registry";
import {
  buildAsyncTaskDeduplicationKey,
  buildAsyncTaskJobId,
  buildAsyncTaskJobOptions,
} from "./idempotency";

describe("async task idempotency helpers", () => {
  it("builds a stable job identity for the same durable task", () => {
    const first = buildAsyncTaskJobId({
      taskId: "task_123",
      taskType: platformHealthCheckTaskDefinition.taskType,
      reliability: platformHealthCheckTaskDefinition.reliability,
    });
    const second = buildAsyncTaskJobId({
      taskId: "task_123",
      taskType: platformHealthCheckTaskDefinition.taskType,
      reliability: platformHealthCheckTaskDefinition.reliability,
    });

    expect(first).toBe("task_123");
    expect(second).toBe(first);
  });

  it("derives the deduplication key from the same helper posture", () => {
    expect(
      buildAsyncTaskDeduplicationKey({
        taskId: "task_456",
        taskType: platformHealthCheckTaskDefinition.taskType,
        reliability: platformHealthCheckTaskDefinition.reliability,
      }),
    ).toBe("task_456");
  });

  it("builds BullMQ job options from shared reliability metadata", () => {
    expect(
      buildAsyncTaskJobOptions({
        taskId: "task_789",
        taskType: platformHealthCheckTaskDefinition.taskType,
        reliability: platformHealthCheckTaskDefinition.reliability,
      }),
    ).toMatchObject({
      jobId: "task_789",
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
    });
  });
});
