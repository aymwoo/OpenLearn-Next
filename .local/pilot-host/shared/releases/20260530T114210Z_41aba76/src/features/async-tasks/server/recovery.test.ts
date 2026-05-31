import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/features/async-tasks/server/recovery.ts", "utf8");

describe("async task operator recovery", () => {
  it("uses registry operatorRecovery metadata as the recovery truth source", () => {
    expect(source).toContain("definition.operatorRecovery.enabled");
    expect(source).toContain("canOperatorAccessTask(task, scope)");
    expect(source).toContain("ASYNC_TASK_RECOVERY_NOT_SUPPORTED");
    expect(source).toContain('task.status !== "failed"');
  });

  it("uses BullMQ Job.fromId retry instead of enqueueing a second task", () => {
    expect(source).toContain("Job.fromId");
    expect(source).toContain('eq(asyncTasks.status, "failed")');
    expect(source).toContain("await job.retry()");
    expect(source).not.toContain("enqueueAsyncTask(");
  });

  it("writes operator recovery audit plus retry seed events and bumps latestAttemptNumber immediately", () => {
    expect(source).toContain("latestAttemptNumber: nextAttemptNumber");
    expect(source).toContain('eventType: "task.operator_recovery_requested"');
    expect(source).toContain('eventType: "task.retry_seeded"');
    expect(source).toContain("seededAttemptNumber");
    expect(source).toContain('eventType: "task.operator_recovery_failed"');
  });
});
