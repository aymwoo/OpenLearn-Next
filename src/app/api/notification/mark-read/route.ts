import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/dal/notification";
import { MarkReadSchema } from "@/lib/dto/notification";

/**
 * POST /api/notification/mark-read
 *
 * Mark notifications as read. Supports two modes via discriminated union:
 * - markAll: true → marks all unread notifications as read for the user
 * - notificationId → marks a single notification as read (ownership guarded)
 *
 * Auth: Requires valid Auth.js session.
 * Security: userId derived from session.user.id only. Ownership guard in DAL.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = MarkReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;

  if (input.markAll) {
    await markAllNotificationsRead({ userId: session.user.id });
  } else {
    await markNotificationRead({
      userId: session.user.id,
      notificationId: input.notificationId,
    });
  }

  return NextResponse.json({ success: true });
}
