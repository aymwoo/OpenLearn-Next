import { beforeEach, describe, expect, it, vi } from "vitest";

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
const closeAsyncTaskQueues = vi.fn(async () => undefined);
const closeBullmqConnections = vi.fn(async () => undefined);
const getAsyncTaskQueueNames = vi.fn(() => ["platform-health"]);

vi.mock("server-only", () => ({}));

vi.mock("@/features/async-tasks/infra/connection", () => ({
  getBullmqEnvironmentCapability: vi.fn(() => ({
    asyncTasksEnabled: true,
    redisConfigured: true,
    redisUrl: "redis://127.0.0.1:6379/9",
    prefix: "openlearn:test",
  })),
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

describe("async task worker bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
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
