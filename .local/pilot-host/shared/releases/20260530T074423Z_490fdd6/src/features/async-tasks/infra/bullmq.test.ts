import { beforeEach, describe, expect, it, vi } from "vitest";

const queueCtor = vi.fn();
const workerCtor = vi.fn();
const queueEventsCtor = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("bullmq", () => ({
  Queue: class MockQueue {
    close = vi.fn(async () => undefined);

    constructor(...args: unknown[]) {
      queueCtor(...args);
    }
  },
  Worker: class MockWorker {
    constructor(...args: unknown[]) {
      workerCtor(...args);
    }
  },
  QueueEvents: class MockQueueEvents {
    constructor(...args: unknown[]) {
      queueEventsCtor(...args);
    }
  },
}));

vi.mock("./connection", () => ({
  getBullmqEnvironmentCapability: vi.fn(() => ({
    asyncTasksEnabled: true,
    redisConfigured: true,
    redisUrl: "redis://127.0.0.1:6379/9",
    prefix: "openlearn:test",
  })),
  getBullmqProducerConnection: vi.fn(async () => ({ role: "producer" })),
  getBullmqWorkerConnection: vi.fn(async () => ({ role: "worker" })),
  getBullmqQueueEventsConnection: vi.fn(async () => ({ role: "queue-events" })),
}));

describe("bullmq runtime seam", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("resolves queue names from async task registry metadata", async () => {
    const { resolveAsyncTaskQueueName } = await import("./bullmq");

    expect(resolveAsyncTaskQueueName("platform.healthcheck")).toBe("platform-health");
  });

  it("memoizes queue creation and uses the configured prefix", async () => {
    const { getAsyncTaskQueue } = await import("./bullmq");

    await getAsyncTaskQueue("platform.healthcheck");
    await getAsyncTaskQueue("platform.healthcheck");

    expect(queueCtor).toHaveBeenCalledTimes(1);
    expect(queueCtor).toHaveBeenCalledWith(
      "platform-health",
      expect.objectContaining({
        prefix: "openlearn:test",
      }),
    );
  });

  it("creates worker and QueueEvents instances through centralized helpers", async () => {
    const { createAsyncTaskQueueEvents, createAsyncTaskWorker } = await import("./bullmq");

    await createAsyncTaskWorker("platform-health", vi.fn(async () => ({ ok: true })));
    await createAsyncTaskQueueEvents("platform-health");

    expect(workerCtor).toHaveBeenCalledOnce();
    expect(queueEventsCtor).toHaveBeenCalledOnce();
  });
});
