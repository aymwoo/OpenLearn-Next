import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 限流层测试：覆盖 `redis-client`（lazyConnect 单例 + 失败重连）与
 * `rate-limit`（teacher+global 双层固定窗口 + fail-closed）。
 *
 * 零真实网络：`ioredis` 用 class-mock（对齐 connection.test.ts:8）。
 * 连接成败由模块级 `connectShouldFail` 控制；`eval` 委派给 `evalDelegate`
 * （由各用例用 `makeMockRedis` 注入，统一 `[count, ttl]` 契约）。
 */

/** 记录每次 `new Redis(url, options)`，用于断言「复用一个 / 重连产生新实例」。 */
const redisInstances: Array<{ url: string; options: Record<string, unknown> }> = [];
/** connect() 是否 reject（模拟 Redis 不可达）。 */
let connectShouldFail = false;
/** eval() 的委派实现（限流计数）；默认未设置时抛错。 */
let evalDelegate:
  | ((lua: string, numKeys: number, key: string, windowSec: number) => Promise<[number, number]>)
  | undefined;

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

    async connect() {
      if (connectShouldFail) {
        throw new Error("mock redis: connection refused");
      }
      return this;
    }

    async eval(lua: string, numKeys: number, key: string, windowSec: string | number) {
      if (!evalDelegate) {
        throw new Error("evalDelegate not configured for this test");
      }
      return evalDelegate(lua, numKeys, key, Number(windowSec));
    }

    async quit() {
      return "OK";
    }
  },
}));

/** 清空所有限流相关 env，避免外部环境污染用例。 */
function clearRateLimitEnv(): void {
  delete process.env.AI_REDIS_URL;
  delete process.env.BULLMQ_REDIS_URL;
  delete process.env.REDIS_URL;
  delete process.env.AI_RL_TEACHER_WINDOW_SEC;
  delete process.env.AI_RL_TEACHER_MAX;
  delete process.env.AI_RL_GLOBAL_WINDOW_SEC;
  delete process.env.AI_RL_GLOBAL_MAX;
}

describe("redis-client（限流专用 ioredis lazyConnect 单例）", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    redisInstances.length = 0;
    connectShouldFail = false;
    evalDelegate = undefined;
    clearRateLimitEnv();
    process.env.AI_REDIS_URL = "redis://127.0.0.1:6379/3";
  });

  it("复用同一连接 promise：连续两次 getAiRedis() 只建一个实例", async () => {
    const { getAiRedis } = await import("./redis-client");

    const a = await getAiRedis();
    const b = await getAiRedis();

    expect(a).toBe(b);
    expect(redisInstances).toHaveLength(1);
    expect(redisInstances[0]?.options.lazyConnect).toBe(true);
    expect(redisInstances[0]?.options.maxRetriesPerRequest).toBe(1);
  });

  it("解析顺序回退：AI_REDIS_URL 缺则用 BULLMQ_REDIS_URL", async () => {
    delete process.env.AI_REDIS_URL;
    process.env.BULLMQ_REDIS_URL = "redis://127.0.0.1:6379/9";

    const { getAiRedis } = await import("./redis-client");
    await getAiRedis();

    expect(redisInstances[0]?.url).toBe("redis://127.0.0.1:6379/9");
  });

  it("未配置任何 Redis URL → 抛 AI_REDIS_URL_NOT_CONFIGURED", async () => {
    clearRateLimitEnv();

    const { getAiRedis } = await import("./redis-client");

    await expect(getAiRedis()).rejects.toThrow("AI_REDIS_URL_NOT_CONFIGURED");
  });

  it("connect 失败时复位单例 promise：下次调用重新建连", async () => {
    const { getAiRedis } = await import("./redis-client");

    connectShouldFail = true;
    await expect(getAiRedis()).rejects.toThrow(/connection refused/);

    connectShouldFail = false;
    const recovered = await getAiRedis();

    expect(recovered).toBeDefined();
    expect(redisInstances).toHaveLength(2);
  });
});
