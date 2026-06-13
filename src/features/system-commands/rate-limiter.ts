import "server-only";

import { getBullmqProducerConnection } from "@/features/async-tasks/infra/connection";

// ── Lua Script for Atomic INCR + EXPIRE ──

/**
 * Atomic rate limit check using Redis INCR + conditional EXPIRE.
 *
 * KEYS[1] = rate limit key (e.g. notif:plugin:{id}:{minute})
 * ARGV[1] = TTL in seconds
 *
 * Returns the incremented count (integer).
 */
const RATE_LIMIT_LUA = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`;

// ── Plugin Rate Limiter ──

/** Maximum notifications a single plugin can send per minute. */
const PLUGIN_RATE_LIMIT_MAX = 60;

/**
 * Check if a plugin is within its per-minute rate limit (60 notifications/minute).
 *
 * Key format: `notif:plugin:{pluginId}:{minuteBucket}`
 * TTL: 65 seconds (window + small buffer to prevent edge-case expiry races)
 *
 * Returns true if allowed (under limit or Redis unavailable), false if rate limited.
 * FAIL-OPEN: Redis unreachable → returns true (allows) + console.warn log.
 */
export async function checkPluginRateLimit(pluginId: string): Promise<boolean> {
  const minuteBucket = Math.floor(Date.now() / 60000);
  const key = `notif:plugin:${pluginId}:${minuteBucket}`;

  try {
    const redis = await getBullmqProducerConnection();
    const count = (await redis.eval(RATE_LIMIT_LUA, 1, key, 65)) as number;

    return count <= PLUGIN_RATE_LIMIT_MAX;
  } catch {
    console.warn("[notification-rate-limit] redis unavailable — FAIL-OPEN (plugin rate limit bypassed)");
    return true;
  }
}

// ── User Rate Limiter ──

/** Maximum notifications a single user can receive per hour. */
const USER_RATE_LIMIT_MAX = 30;

/**
 * Check if a user is within their per-hour rate limit (30 notifications/hour).
 *
 * Key format: `notif:user:{userId}:{hourBucket}`
 * TTL: 3660 seconds (61 minutes — hour + small buffer)
 *
 * Returns true if allowed (under limit or Redis unavailable), false if rate limited.
 * FAIL-OPEN: Redis unreachable → returns true (allows) + console.warn log.
 */
export async function checkUserRateLimit(userId: string): Promise<boolean> {
  const hourBucket = Math.floor(Date.now() / 3600000);
  const key = `notif:user:${userId}:${hourBucket}`;

  try {
    const redis = await getBullmqProducerConnection();
    const count = (await redis.eval(RATE_LIMIT_LUA, 1, key, 3660)) as number;

    return count <= USER_RATE_LIMIT_MAX;
  } catch {
    console.warn("[notification-rate-limit] redis unavailable — FAIL-OPEN (user rate limit bypassed)");
    return true;
  }
}
