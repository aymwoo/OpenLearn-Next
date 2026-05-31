import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const enqueueSource = readFileSync("src/features/async-tasks/server/enqueue.ts", "utf8");

describe("async task enqueue seam", () => {
  it("persists durable task rows and event intent before any future queue integration", () => {
    expect(enqueueSource).toContain(".insert(asyncTasks)");
    expect(enqueueSource).toContain(".insert(asyncTaskEvents)");
    expect(enqueueSource).toContain('eventType: "task.created"');
    expect(enqueueSource).toContain("payloadJson: payload");
  });

  it("dispatches via BullMQ and durably writes queue job identity on success or failure", () => {
    expect(enqueueSource).toContain("getAsyncTaskQueue(");
    expect(enqueueSource).toContain("await queue.add(");
    expect(enqueueSource).toContain("queueJobId");
    expect(enqueueSource).toContain('eventType: "task.dispatch_requested"');
    expect(enqueueSource).toContain('eventType: "task.dispatch_failed"');
  });

  it("invalidates async task cache boundaries after durable writes", () => {
    expect(enqueueSource).toContain("updateTag(cacheTags.asyncTask(finalTask.id))");
    expect(enqueueSource).toContain("updateTag(cacheTags.asyncTaskList(finalTask.actorId))");
    expect(enqueueSource).toContain("updateTag(cacheTags.asyncTaskEntity(finalTask.entityType, finalTask.entityId))");
  });
});
