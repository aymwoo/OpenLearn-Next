import { z } from "zod";

// ---------------------------------------------------------------------------
// Phase 81: system.notification DTO schemas (NOTIF-01)
// ---------------------------------------------------------------------------

/**
 * Input schema for creating a notification via Command Bus handler.
 *
 * Validated at the governance gate before the handler executes. The
 * notificationType must be present in the sender's manifest allowlist
 * (checked upstream, not validated here).
 */
export const NotificationInsertSchema = z.strictObject({
  recipientUserId: z.string().min(1),
  notificationType: z.string().min(1).max(64),
  title: z.string().min(1).max(256),
  body: z.string().min(1).max(2048),
});

export type NotificationInsertInput = z.infer<typeof NotificationInsertSchema>;

/**
 * DTO shape for API responses (notification list / detail endpoints).
 *
 * Derived from the pluginNotifications DB schema. The readAt field is
 * nullable (NULL = unread), and all other fields are non-null.
 */
export const NotificationDTOSchema = z.object({
  id: z.string().min(1),
  pluginId: z.string().min(1),
  schoolId: z.string().min(1),
  recipientUserId: z.string().min(1),
  notificationType: z.string().min(1),
  title: z.string(),
  body: z.string(),
  readAt: z.number().nullable(),
  createdAt: z.number(),
});

export type NotificationDTO = z.infer<typeof NotificationDTOSchema>;

/**
 * Schema for marking notifications as read.
 *
 * Supports two modes via discriminated union:
 * - `markAll: true` → mark all notifications for the current user as read
 * - `notificationId` → mark a single notification as read by its ID
 */
export const MarkReadSchema = z.discriminatedUnion("markAll", [
  z.strictObject({ markAll: z.literal(true) }),
  z.strictObject({ markAll: z.literal(false), notificationId: z.string().min(1) }),
]);

export type MarkReadInput = z.infer<typeof MarkReadSchema>;
