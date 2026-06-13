/**
 * 通知清理 Worker
 *
 * 每天凌晨 3:00（cron: "0 0 3 * * *"）自动删除超过 90 天的已读通知。
 * 使用 BullMQ upsertJobScheduler 确保幂等注册。
 *
 * **Security:**
 * - 仅删除 readAt IS NOT NULL 的通知（保留未读通知）
 * - cutoff 时间由服务端计算，不接参数
 * - DELETE 走 pluginNotif_cleanup_idx 索引优化
 */

import { Queue, type Job } from "bullmq";
import { and, isNotNull, lt } from "drizzle-orm";

import { db } from "@/db";
import { pluginNotifications } from "@/db/schema";
import {
  getBullmqEnvironmentCapability,
  getBullmqProducerConnection,
} from "@/features/async-tasks/infra/connection";

/**
 * 注册通知清理 Job Scheduler
 *
 * 在 worker bootstrap 的 start() 方法中调用。
 * 使用固定 jobSchedulerId "cleanup-notifications" 防止重复注册。
 */
export async function registerNotificationCleanupScheduler(): Promise<void> {
  const capability = getBullmqEnvironmentCapability();

  if (!capability.asyncTasksEnabled) {
    console.warn(
      "[notification-cleanup] async tasks disabled — skipping scheduler registration",
    );
    return;
  }

  const connection = await getBullmqProducerConnection();

  const cleanupQueue = new Queue("notification-cleanup", {
    connection,
    prefix: capability.prefix,
  });

  await cleanupQueue.upsertJobScheduler(
    "cleanup-notifications",
    { pattern: "0 0 3 * * *" },
    {
      name: "notification.cleanup",
      data: {},
      opts: {
        removeOnComplete: true,
        removeOnFail: 10,
      },
    },
  );

  console.log(
    "[notification-cleanup] scheduler registered — daily cleanup at 03:00",
  );
}

/**
 * 处理通知清理 Job
 *
 * DELETE FROM pluginNotifications
 * WHERE readAt IS NOT NULL AND createdAt < now() - 90 days
 */
export async function processNotificationCleanup(
  job: Job,
): Promise<{ deletedCount: number }> {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(cutoff);

  const result = await db
    .delete(pluginNotifications)
    .where(
      and(
        isNotNull(pluginNotifications.readAt),
        lt(pluginNotifications.createdAt, cutoffDate),
      ),
    )
    .returning({ deletedId: pluginNotifications.id });

  console.log(
    `[notification-cleanup] cleaned ${result.length} read notifications older than 90 days`,
  );

  return { deletedCount: result.length };
}
