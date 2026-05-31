import { beforeEach, describe, expect, it, vi } from "vitest";

const redisInstances: Array<{ url: string; options: Record<string, unknown> }> = [];
const quit = vi.fn(async () => "OK");

vi.mock("server-only", () => ({}));

vi.mock("ioredis", () => ({
  default: class MockRedis {
    readonly url: string;
    readonly options: Record<string, unknown>;

    constructor(url: string, options: Record<string, unknown>) {
      this.url = url;
      this.options = options;
      redisInstances.push({ url, options });
    }

    on() {
      return this;
    }

    async connect() {
      return this;
    }

    async quit() {
      return quit();
    }
  },
}));

describe("bullmq connection factory", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    redisInstances.length = 0;
    process.env.ASYNC_TASKS_ENABLED = "true";
    process.env.BULLMQ_REDIS_URL = "redis://127.0.0.1:6379/9";
    process.env.BULLMQ_PREFIX = "openlearn:test";
    process.env.WORKER_INSTANCE_ID = "worker-test";
  });

  it("derives dedicated BullMQ env capability", async () => {
    const { getBullmqEnvironmentCapability, getBullmqInstanceId } = await import("./connection");

    expect(getBullmqEnvironmentCapability()).toEqual({
      asyncTasksEnabled: true,
      redisConfigured: true,
      redisUrl: "redis://127.0.0.1:6379/9",
      prefix: "openlearn:test",
    });
    expect(getBullmqInstanceId()).toBe("worker-test");
  });

  it("creates separate producer, worker, and QueueEvents connections by role", async () => {
    const {
      getBullmqProducerConnection,
      getBullmqQueueEventsConnection,
      getBullmqWorkerConnection,
    } = await import("./connection");

    await getBullmqProducerConnection();
    await getBullmqWorkerConnection();
    await getBullmqQueueEventsConnection();

    expect(redisInstances).toHaveLength(3);
    expect(redisInstances[0]?.options.maxRetriesPerRequest).toBe(1);
    expect(redisInstances[1]?.options.maxRetriesPerRequest).toBeNull();
    expect(redisInstances[2]?.options.maxRetriesPerRequest).toBeNull();
  });

  it("closes memoized connections through one helper", async () => {
    const { closeBullmqConnections, getBullmqProducerConnection } = await import("./connection");

    await getBullmqProducerConnection();
    await closeBullmqConnections();

    expect(quit).toHaveBeenCalledTimes(1);
  });
});
