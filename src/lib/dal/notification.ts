import "server-only";

import { z } from "zod";
import { and, eq, lt, isNull, desc, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { pluginNotifications } from "@/db/schema";

// ── DTO / Input Schemas ──
// Reuse existing DTO schemas from dto/notification.ts for response shapes,
// but define input schemas for raw validation inline (DAL pattern).

const NotificationInsertInputSchema = z.strictObject({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
  recipientUserId: z.string().min(1),
  notificationType: z.string().min(1).max(64),
  title: z.string().min(1).max(256),
  body: z.string().min(1).max(2048),
});

export type NotificationInsertInput = z.infer<typeof NotificationInsertInputSchema>;

const GetNotificationsInputSchema = z.strictObject({
  userId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

const MarkNotificationReadInputSchema = z.strictObject({
  userId: z.string().min(1),
  notificationId: z.string().min(1),
});

const MarkAllNotificationsReadInputSchema = z.strictObject({
  userId: z.string().min(1),
});

const GetUnreadCountInputSchema = z.strictObject({
  userId: z.string().min(1),
});

// ── Helpers ──

/**
 * Decode a base64 cursor string to a timestamp (ms) cutoff date.
 * Returns null if cursor is absent or invalid.
 */
function decodeCursor(cursor?: string): number | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const ts = parseInt(decoded, 10);
    if (isNaN(ts) || ts <= 0) return null;
    return ts;
  } catch {
    return null;
  }
}

/**
 * Encode a timestamp (ms) as a base64 cursor string.
 */
function encodeCursor(timestamp: number): string {
  return Buffer.from(timestamp.toString()).toString("base64");
}

// ── DAL Functions ──

/**
 * Insert a notification record into pluginNotifications.
 * Returns the inserted row.
 */
export async function insertNotification(
  rawInput: unknown,
): Promise<typeof pluginNotifications.$inferSelect> {
  const input = NotificationInsertInputSchema.parse(rawInput);

  const [row] = await db
    .insert(pluginNotifications)
    .values({
      schoolId: input.schoolId,
      pluginId: input.pluginId,
      recipientUserId: input.recipientUserId,
      notificationType: input.notificationType,
      title: input.title,
      body: input.body,
    })
    .returning();

  return row;
}

/**
 * Get notifications for a user, ordered by createdAt DESC, with cursor-based pagination.
 *
 * The cursor is a base64-encoded ISO timestamp (ms). When provided, only notifications
 * with createdAt < cursor value are returned (older than the last item from the previous page).
 *
 * Returns { items, nextCursor } where nextCursor is null when there are no more items.
 */
export async function getNotifications(
  rawInput: unknown,
): Promise<{
  items: (typeof pluginNotifications.$inferSelect)[];
  nextCursor: string | null;
}> {
  const input = GetNotificationsInputSchema.parse(rawInput);
  const cutoff = decodeCursor(input.cursor);

  // Build where clause: always filter by recipientUserId, optionally by createdAt < cutoff
  const whereClause = cutoff !== null
    ? and(
        eq(pluginNotifications.recipientUserId, input.userId),
        lt(pluginNotifications.createdAt, new Date(cutoff)),
      )
    : eq(pluginNotifications.recipientUserId, input.userId);

  const rows = await db.query.pluginNotifications.findMany({
    where: whereClause,
    orderBy: desc(pluginNotifications.createdAt),
    limit: input.limit + 1, // fetch one extra to determine if there are more
  });

  const hasMore = rows.length > input.limit;
  const items = rows.slice(0, input.limit);
  const nextCursor = hasMore && items.length > 0
    ? encodeCursor(items[items.length - 1].createdAt!.getTime())
    : null;

  return { items, nextCursor };
}

/**
 * Mark a single notification as read.
 *
 * Ownership check: only updates if recipientUserId matches the caller's userId,
 * ensuring users cannot mark other users' notifications as read.
 * Returns the updated row or null if not found / not owned.
 */
export async function markNotificationRead(
  rawInput: unknown,
): Promise<typeof pluginNotifications.$inferSelect | null> {
  const input = MarkNotificationReadInputSchema.parse(rawInput);

  const [row] = await db
    .update(pluginNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(pluginNotifications.id, input.notificationId),
        eq(pluginNotifications.recipientUserId, input.userId),
      ),
    )
    .returning();

  return row ?? null;
}

/**
 * Mark all unread notifications as read for a user.
 *
 * Only updates rows where readAt IS NULL and recipientUserId matches.
 */
export async function markAllNotificationsRead(
  rawInput: unknown,
): Promise<void> {
  const input = MarkAllNotificationsReadInputSchema.parse(rawInput);

  await db
    .update(pluginNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(pluginNotifications.recipientUserId, input.userId),
        isNull(pluginNotifications.readAt),
      ),
    );
}

/**
 * Get the count of unread notifications for a user.
 *
 * Returns a non-negative integer.
 */
export async function getUnreadCount(
  rawInput: unknown,
): Promise<number> {
  const input = GetUnreadCountInputSchema.parse(rawInput);

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pluginNotifications)
    .where(
      and(
        eq(pluginNotifications.recipientUserId, input.userId),
        isNull(pluginNotifications.readAt),
      ),
    );

  return result?.count ?? 0;
}
