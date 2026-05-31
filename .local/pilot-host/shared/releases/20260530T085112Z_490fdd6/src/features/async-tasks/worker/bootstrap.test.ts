import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const closeWorker = vi.fn(async () => undefined);
const closeQueueEvents = vi.fn(async () => undefined);
const createAsyncTaskWorker = vi.fn(async () => ({ on: vi.fn(), close: closeWorker }));
const createAsyncTaskQueueEvents = vi.fn(async () => ({ on: vi.fn(), close: closeQueueEvents }));
const projectorStart = vi.fn();
const projectorClose = vi.fn(async () => undefined);
const createAsyncTaskQueueEventsProjector = vi.fn(() => ({
  start: projectorStart,
  close: projectorClose,
}));
const recordAsyncTaskWorkerShutdownRequested = vi.fn(async () => []);
const upsertAsyncWorkerHeartbeat = vi.fn(async () => undefined);
const markAsyncWorkerHeartbeatStopping = vi.fn(async () => undefined);
const markAsyncWorkerHeartbeatStopped = vi.fn(async () => undefined);
const closeAsyncTaskQueues = vi.fn(async () => undefined);
const closeBullmqConnections = vi.fn(async () => undefined);
const getAsyncTaskQueueNames = vi.fn(() => ["platform-health"]);
const buildAsyncTaskQueueProcessor = vi.fn((queueName: string) => async () => ({ queueName }));
const enqueueDueScheduleReminderDispatches = vi.fn(async () => []);

vi.mock("server-only", () => ({}));

vi.mock("@/features/async-tasks/infra/connection", () => ({
  getBullmqEnvironmentCapability: vi.fn(() => ({
    asyncTasksEnabled: true,
    redisConfigured: true,
    redisUrl: "redis://127.0.0.1:6379/9",
    prefix: "openlearn:test",
    instanceId: "worker-test",
  })),
  getBullmqInstanceId: vi.fn(() => "worker-test"),
  closeBullmqConnections,
}));

vi.mock("@/features/async-tasks/infra/bullmq", () => ({
  getAsyncTaskQueueNames,
  createAsyncTaskWorker,
  createAsyncTaskQueueEvents,
  closeAsyncTaskQueues,
}));

vi.mock("@/features/async-tasks/infra/queue-events", () => ({
  createAsyncTaskQueueEventsProjector,
  recordAsyncTaskWorkerShutdownRequested,
}));

vi.mock("@/features/async-tasks/infra/heartbeat", () => ({
  upsertAsyncWorkerHeartbeat,
  markAsyncWorkerHeartbeatStopping,
  markAsyncWorkerHeartbeatStopped,
}));

vi.mock("./registry", () => ({
  buildAsyncTaskQueueProcessor,
}));

vi.mock("@/features/schedule/reminders/server", () => ({
  enqueueDueScheduleReminderDispatches,
}));

const bootstrapSource = readFileSync("src/features/async-tasks/worker/bootstrap.ts", "utf8");

describe("async task worker bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("writes a durable heartbeat on start and refreshes it every 15 seconds", async () => {
    const { startAsyncTaskWorker, stopAsyncTaskWorker } = await import("./bootstrap");

    await startAsyncTaskWorker();
    expect(upsertAsyncWorkerHeartbeat).toHaveBeenCalledWith({
      instanceId: "worker-test",
      status: "ready",
      queueNames: ["platform-health"],
      detail: {
        started: true,
      },
    });

    await vi.advanceTimersByTimeAsync(15_000);
    expect(upsertAsyncWorkerHeartbeat).toHaveBeenCalledTimes(2);
    expect(enqueueDueScheduleReminderDispatches).toHaveBeenCalledTimes(4);

    await stopAsyncTaskWorker();
    vi.useRealTimers();
  });

  it("keeps due reminder dispatch orchestration in an unref'd worker sweep loop", () => {
    expect(bootstrapSource).toContain("enqueueDueScheduleReminderDispatches()");
    expect(bootstrapSource).toContain("this.dueDispatchSweepInterval.unref?.()");
  });

  it("starts one worker runtime per registered queue and memoizes repeated starts", async () => {
    const { startAsyncTaskWorker } = await import("./bootstrap");

    const first = await startAsyncTaskWorker();
    const second = await startAsyncTaskWorker();

    expect(first).toEqual({
      started: true,
      enabled: true,
      queueNames: ["platform-health"],
    });
    expect(second).toEqual(first);
    expect(createAsyncTaskWorker).toHaveBeenCalledTimes(1);
    expect(createAsyncTaskQueueEvents).toHaveBeenCalledTimes(1);
    expect(createAsyncTaskQueueEventsProjector).toHaveBeenCalledTimes(1);
    expect(projectorStart).toHaveBeenCalledTimes(1);
  });

  it("stops worker handles, queue events, queue caches, and Redis connections", async () => {
    const { startAsyncTaskWorker, stopAsyncTaskWorker } = await import("./bootstrap");

    await startAsyncTaskWorker();
    await stopAsyncTaskWorker();

    expect(closeWorker).toHaveBeenCalledOnce();
    expect(closeQueueEvents).toHaveBeenCalledOnce();
    expect(projectorClose).toHaveBeenCalledOnce();
    expect(closeAsyncTaskQueues).toHaveBeenCalledOnce();
    expect(closeBullmqConnections).toHaveBeenCalledOnce();
  });

  it("records durable shutdown recovery posture before closing runtime handles", async () => {
    const { startAsyncTaskWorker, stopAsyncTaskWorker } = await import("./bootstrap");

    await startAsyncTaskWorker();
    await (stopAsyncTaskWorker as (signal?: string) => Promise<void>)("SIGTERM");

    expect(recordAsyncTaskWorkerShutdownRequested).toHaveBeenCalledWith({
      queueNames: ["platform-health"],
        signal: "SIGTERM",
      });
    expect(markAsyncWorkerHeartbeatStopping).toHaveBeenCalledWith({
      instanceId: "worker-test",
      queueNames: ["platform-health"],
      signal: "SIGTERM",
      detail: {
        started: true,
      },
    });
    expect(markAsyncWorkerHeartbeatStopped).toHaveBeenCalledWith({
      instanceId: "worker-test",
      queueNames: [],
      signal: "SIGTERM",
      detail: {
        started: false,
      },
    });
  });

  it("registers the platform healthcheck queue in the runtime bootstrap path", async () => {
    const { startAsyncTaskWorker } = await import("./bootstrap");

    await startAsyncTaskWorker();

    expect(getAsyncTaskQueueNames).toHaveBeenCalledOnce();
    expect(createAsyncTaskWorker).toHaveBeenCalledWith(
      "platform-health",
      expect.any(Function),
    );
  });
});
