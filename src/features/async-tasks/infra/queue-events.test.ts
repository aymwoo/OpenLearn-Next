import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const queueEventsSource = readFileSync("src/features/async-tasks/infra/queue-events.ts", "utf8");

describe("async task queue events projector", () => {
  it("listens to BullMQ runtime events and projects them into durable SQLite truth", () => {
    expect(queueEventsSource).toContain('this.queueEvents.on("waiting"');
    expect(queueEventsSource).toContain('this.queueEvents.on("active"');
    expect(queueEventsSource).toContain('this.queueEvents.on("progress"');
    expect(queueEventsSource).toContain('this.queueEvents.on("completed"');
    expect(queueEventsSource).toContain('this.queueEvents.on("failed"');
    expect(queueEventsSource).toContain('this.queueEvents.on("stalled"');
    expect(queueEventsSource).toContain('this.queueEvents.on("deduplicated"');
    expect(queueEventsSource).toContain("update(asyncTasks)");
    expect(queueEventsSource).toContain("insert(asyncTaskEvents)");
  });

  it("keeps failure, attempt, and stalled recovery posture durable", () => {
    expect(queueEventsSource).toContain("latestAttemptNumber");
    expect(queueEventsSource).toContain("latestFailureReason");
    expect(queueEventsSource).toContain("latestRecoveryJson");
    expect(queueEventsSource).toContain('status: "stalled_recovery"');
    expect(queueEventsSource).toContain('eventType: "task.stalled"');
    expect(queueEventsSource).toContain('task.status === "stalled_recovery" ? "task.recovered" : "task.started"');
  });

  it("records durable shutdown recovery intent for in-flight tasks", () => {
    expect(queueEventsSource).toContain("recordAsyncTaskWorkerShutdownRequested");
    expect(queueEventsSource).toContain('eventType: "task.worker_shutdown_requested"');
    expect(queueEventsSource).toContain('posture: "worker_shutdown_requested"');
  });
});
