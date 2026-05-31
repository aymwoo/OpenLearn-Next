/**
 * 共享测试夹具：ioredis mock helper（固定窗口限流 LUA 契约）。
 *
 * 测试夹具，零真实网络。形状对齐 `connection.test.ts` 的 class-mock 风格，
 * 但以工厂函数返回最小对象，便于按用例独立配置计数 / TTL / 连接失败。
 *
 * 限流 LUA 契约（RESEARCH）：`eval(lua, numKeys, key, windowSec)` 对传入 key
 * 内存自增并返回 `[count, ttl]` 元组（fail-open 计数）。`connect()` 在
 * `failConnect` 时 reject（模拟 Redis 不可达 → 供 fail-closed 限流测试），
 * `quit()` 总是 resolve。
 */

/** makeMockRedis 返回的最小 Redis 形状（仅限流路径所需方法）。 */
export interface MockRedis {
  /** 固定窗口自增：返回 `[count, ttl]`。忽略 lua / numKeys，仅按 key 计数。 */
  eval(
    lua: string,
    numKeys: number,
    key: string,
    windowSec: number,
  ): Promise<[number, number]>;
  /** 在 failConnect 时 reject，否则 resolve 自身。 */
  connect(): Promise<MockRedis>;
  /** 总是 resolve。 */
  quit(): Promise<"OK">;
  /** 暴露内存计数表，便于断言。 */
  readonly counts: Record<string, number>;
}

/**
 * 构造一个内存版 ioredis mock。
 *
 * @param opts.counts      预置计数（key → 已有计数），eval 在此基础上自增。
 * @param opts.ttl         eval 返回的固定 TTL（默认取 eval 入参 windowSec）。
 * @param opts.failConnect connect() 是否 reject（模拟连接失败）。
 */
export function makeMockRedis(opts?: {
  counts?: Record<string, number>;
  ttl?: number;
  failConnect?: boolean;
}): MockRedis {
  const counts: Record<string, number> = { ...(opts?.counts ?? {}) };
  const fixedTtl = opts?.ttl;
  const failConnect = opts?.failConnect ?? false;

  const redis: MockRedis = {
    counts,
    async eval(_lua, _numKeys, key, windowSec) {
      counts[key] = (counts[key] ?? 0) + 1;
      const ttl = fixedTtl ?? windowSec;
      return [counts[key], ttl];
    },
    async connect() {
      if (failConnect) {
        throw new Error("mock redis: connection refused");
      }
      return redis;
    },
    async quit() {
      return "OK";
    },
  };

  return redis;
}
