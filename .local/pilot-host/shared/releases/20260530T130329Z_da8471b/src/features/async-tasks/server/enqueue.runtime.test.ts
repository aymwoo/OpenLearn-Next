import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const enqueueSource = readFileSync("src/features/async-tasks/server/enqueue.ts", "utf8");

describe("async task runtime enqueue dispatch", () => {
  it("dispatches through the centralized BullMQ queue seam with stable job identity helper", () => {
    expect(enqueueSource).toContain("getAsyncTaskQueue(input.taskType)");
    expect(enqueueSource).toContain("buildAsyncTaskJobOptions");
    expect(enqueueSource).toContain("const dispatchOptions = buildAsyncTaskJobOptions");
    expect(enqueueSource).toContain("queue.add(definition.taskType, payload, dispatchOptions)");
  });

  it("writes queueJobId and queued posture back into SQLite on successful dispatch", () => {
    expect(enqueueSource).toContain("queueJobId: job.id");
    expect(enqueueSource).toContain('status: "queued"');
    expect(enqueueSource).toContain('enqueueIntentStatus: "dispatched"');
    expect(enqueueSource).toContain('eventType: "task.dispatch_requested"');
  });

  it("keeps dispatch failure durable instead of letting BullMQ become truth", () => {
    expect(enqueueSource).toContain('status: "dispatch_failed"');
    expect(enqueueSource).toContain('enqueueIntentStatus: "dispatch_failed"');
    expect(enqueueSource).toContain("latestFailureReason");
    expect(enqueueSource).toContain('eventType: "task.dispatch_failed"');
  });
});
