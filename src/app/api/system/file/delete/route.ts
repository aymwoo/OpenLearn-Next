import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { dispatchSystemCommand } from "@/features/system-commands/facade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/system/file/delete
 * 通过 Command Bus facade 执行软删除。
 *
 * 请求体：{ fileId: string }
 * pluginKey 从 x-plugin-key 请求头获取。
 * schoolId 由 facade 的 assertActionExecutable 治理门从 session 派生注入（T-79-04）。
 */
export async function POST(request: NextRequest) {
  // 1. 认证
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(
      { error: "UNAUTHORIZED", message: "请先登录后再删除文件。" },
      { status: 401 },
    );
  }
  const actorId = String(session.user.id);

  try {
    // 2. 解析请求体
    const body = await request.json().catch(() => ({}));
    const fileId = typeof body?.fileId === "string" && body.fileId.length > 0
      ? body.fileId
      : null;

    if (!fileId) {
      return Response.json(
        { error: "MISSING_FILE_ID", message: "请提供 fileId。" },
        { status: 400 },
      );
    }

    // 3. 获取 pluginKey（从请求头）
    const pluginKey = request.headers.get("x-plugin-key") ?? "";
    if (!pluginKey) {
      return Response.json(
        { error: "MISSING_PLUGIN_KEY", message: "请提供 x-plugin-key 请求头。" },
        { status: 400 },
      );
    }

    // 4. 通过 Command Bus 执行软删除
    // facade 内部通过 assertActionExecutable 从 session 派生 schoolId 和 pluginId
    const result = await dispatchSystemCommand({
      commandType: "system.file.delete",
      pluginKey,
      actorId,
      fileId,
    });

    if (!result.success) {
      return Response.json(
        {
          success: false,
          error: "DELETE_FAILED",
          message: "文件删除失败。",
          commandId: result.commandId,
        },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      commandId: result.commandId,
    });
  } catch (error: any) {
    const message = error?.message ?? "";

    if (message.includes("permission_denied") || message.includes("not_allowlisted")) {
      return Response.json(
        { error: "FORBIDDEN", message: "无权删除该文件。" },
        { status: 403 },
      );
    }

    if (message.includes("not found") || message.includes("FILE_NOT_FOUND")) {
      return Response.json(
        { error: "FILE_NOT_FOUND", message: "文件不存在。" },
        { status: 404 },
      );
    }

    return Response.json(
      { error: "INTERNAL_SERVER_ERROR", message: "服务器内部错误。" },
      { status: 500 },
    );
  }
}
