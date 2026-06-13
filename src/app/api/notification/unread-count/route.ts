import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getUnreadCount } from "@/lib/dal/notification";

/**
 * GET /api/notification/unread-count
 *
 * Returns the count of unread notifications for the authenticated user.
 *
 * Auth: Requires valid Auth.js session.
 * Security: userId derived from session.user.id only.
 * Cache: no-store (unread count is dynamic per-user).
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await getUnreadCount({ userId: session.user.id });

  return NextResponse.json(
    { count },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
