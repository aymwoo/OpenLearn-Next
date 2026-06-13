import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { listFiles } from "@/lib/dal/files";

export const dynamic = "force-dynamic";

/**
 * GET /api/system/file/list
 * cursor-based 分页列表文件。
 *
 * 查询参数：
 *   prefix (可选) — 文件名前缀过滤，默认 ""
 *   cursor (可选) — 分页游标
 *   limit (可选)  — 每页数量，默认 50，最大 100
 *
 * pluginKey 从 x-plugin-key 请求头获取（FILE-06 双重隔离）。
 */
export async function GET(request: NextRequest) {
  // 1. 认证
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(
      { error: "UNAUTHORIZED", message: "请先登录后查看文件列表。" },
      { status: 401 },
    );
  }

  try {
    // 2. 参数解析
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get("prefix") ?? "";
    const cursorParam = searchParams.get("cursor");
    const cursor = cursorParam && cursorParam.length > 0 ? cursorParam : undefined;
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "50", 10) || 50,
      100,
    );

    // 3. 获取 pluginKey
    const pluginKey = request.headers.get("x-plugin-key") ?? "";
    if (!pluginKey) {
      return Response.json(
        { error: "MISSING_PLUGIN_KEY", message: "请提供 x-plugin-key 请求头。" },
        { status: 400 },
      );
    }

    // 4. 获取 schoolId
    const { getCurrentUserSchoolIds } = await import("@/lib/dal/auth");
    const schoolIds = await getCurrentUserSchoolIds();
    if (schoolIds.length === 0) {
      return Response.json(
        { error: "NO_SCHOOL", message: "用户未关联任何学校。" },
        { status: 403 },
      );
    }
    const schoolId = schoolIds[0];

    // 5. DAL 查询（schoolId + pluginId 双重隔离）
    const result = await listFiles({
      schoolId,
      pluginId: pluginKey,
      prefix,
      cursor,
      limit,
    });

    return Response.json(
      { files: result.files, nextCursor: result.nextCursor },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error: any) {
    const message = error?.message ?? "";
    return Response.json(
      { error: "LIST_FAILED", message },
      { status: 500 },
    );
  }
}
