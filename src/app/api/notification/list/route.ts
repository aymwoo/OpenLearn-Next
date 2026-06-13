import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getNotifications } from "@/lib/dal/notification";

/**
 * GET /api/notification/list
 *
 * Returns paginated notifications for the authenticated user, ordered by
 * createdAt DESC. Supports cursor-based pagination.
 *
 * Query params:
 * - cursor: base64-encoded timestamp for the next page
 * - limit: number of items per page (default 20, max 100)
 *
 * Auth: Requires valid Auth.js session.
 * Security: userId derived from session.user.id only (not from query params).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 20, 100) : 20;

  const result = await getNotifications({
    userId: session.user.id,
    cursor,
    limit,
  });

  return NextResponse.json(result);
}
