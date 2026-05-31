import "server-only";

import Redis from "ioredis";

/**
 * 限流专用 ioredis lazyConnect 单例（PROV-03）。
 *
 * 与 BullMQ 连接（`features/async-tasks/infra/connection.ts`）隔离：本层 N=1
 * 单连接，仅承载固定窗口限流计数（key 命名空间 `openlearn:ai:rl:*`）。
 *
 * 纪律（对齐 connection.ts:153-166）：memoized promise + **连接失败时复位**，
 * 使坏连接不会被永久缓存——下次调用可重新建连。`maxRetriesPerRequest: 1`
 * 为 fail-fast，缩短 Redis 失联探测时间，支撑 rate-limit 的 fail-closed。
 *
 * URL 解析顺序：`AI_REDIS_URL` → `BULLMQ_REDIS_URL` → `REDIS_URL`；
 * 三者皆缺时抛 `AI_REDIS_URL_NOT_CONFIGURED`（部署期暴露配置缺失）。
 */

let connectionPromise: Promise<Redis> | undefined;

/** 获取限流专用 Redis 连接（lazyConnect 单例，失败自动复位以便重连）。 */
export async function getAiRedis(): Promise<Redis> {
  if (!connectionPromise) {
    const url =
      process.env.AI_REDIS_URL?.trim() ||
      process.env.BULLMQ_REDIS_URL?.trim() ||
      process.env.REDIS_URL?.trim();

    if (!url) {
      throw new Error("AI_REDIS_URL_NOT_CONFIGURED");
    }

    const redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectionName: "openlearn-ai-ratelimit",
    });

    connectionPromise = redis
      .connect()
      .then(() => redis)
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  return connectionPromise;
}
