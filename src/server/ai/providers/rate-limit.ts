import "server-only";

import { ProviderRateLimitError } from "./errors";
import { getAiRedis } from "./redis-client";

/**
 * 双层固定窗口限流（PROV-03 / T-61-dos）。
 *
 * 教师维度（防单人刷爆）+ 全局维度（护 provider 成本）各自独立计数，
 * 任一超限即抛 `ProviderRateLimitError`（带 retryAfter = key 剩余 TTL）。
 *
 * **原子计数**：INCR + 首次 EXPIRE 经 Lua 单脚本执行，杜绝「先 INCR 后
 * EXPIRE 之间崩溃 → 永久无 TTL key」的窗口泄漏；脚本同时返回 TTL 供 retryAfter。
 *
 * **fail-closed（T-61-dos）**：Redis 不可达（连接/eval 异常）时拒绝放行，
 * 抛可读 `ProviderRateLimitError`——杜绝「计数后端失效 = 无限放行」的成本失控。
 *
 * 限额/窗口经 env 可调；key 命名空间 `openlearn:ai:rl:*`（与 BullMQ 隔离）。
 */

/**
 * 原子固定窗口计数脚本（RESEARCH）。
 * INCR 目标 key；若为窗口内首次（c==1）则设 EXPIRE；返回 `{count, ttl}`。
 */
const LUA = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local t = redis.call('TTL', KEYS[1])
return {c, t}
`;

/** 读取正整数 env，非法/缺失时回退默认值。 */
function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/** 对单个 key 自增并在超限时抛错；retryAfter 取 key 剩余 TTL。 */
async function hit(
  redis: Awaited<ReturnType<typeof getAiRedis>>,
  key: string,
  limit: number,
  windowSec: number,
): Promise<void> {
  const result = (await redis.eval(LUA, 1, key, String(windowSec))) as [number, number];
  const count = result[0];
  const ttl = result[1];
  if (count > limit) {
    throw new ProviderRateLimitError(
      "AI 请求过于频繁，请稍后再试。",
      ttl > 0 ? ttl : windowSec,
    );
  }
}

/**
 * 强制执行 AI 调用限流：先教师维度、后全局维度，任一超限即抛错。
 *
 * @param teacherId 上游（已鉴权）传入的教师标识，仅作限流维度。
 * @throws ProviderRateLimitError 超限，或 Redis 不可达时 fail-closed 拒绝放行。
 */
export async function enforceRateLimit(teacherId: string): Promise<void> {
  const teacherWindow = envInt("AI_RL_TEACHER_WINDOW_SEC", 60);
  const teacherMax = envInt("AI_RL_TEACHER_MAX", 20);
  const globalWindow = envInt("AI_RL_GLOBAL_WINDOW_SEC", 60);
  const globalMax = envInt("AI_RL_GLOBAL_MAX", 200);

  const now = Math.floor(Date.now() / 1000);
  const teacherBucket = Math.floor(now / teacherWindow);
  const globalBucket = Math.floor(now / globalWindow);

  const teacherKey = `openlearn:ai:rl:teacher:${teacherId}:${teacherBucket}`;
  const globalKey = `openlearn:ai:rl:global:${globalBucket}`;

  try {
    const redis = await getAiRedis();
    await hit(redis, teacherKey, teacherMax, teacherWindow);
    await hit(redis, globalKey, globalMax, globalWindow);
  } catch (error) {
    // 限额命中：原样上抛（保留 retryAfter / 中文文案）。
    if (error instanceof ProviderRateLimitError) {
      throw error;
    }
    // Redis 不可达 / eval 异常：fail-closed —— 拒绝放行，绝不 fall-through。
    console.warn("[ai/rate-limit] fail-closed: redis 计数不可用，拒绝放行", error);
    throw new ProviderRateLimitError("AI 服务暂时不可用，请稍后再试。", globalWindow);
  }
}
