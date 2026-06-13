import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/db";
import { pluginFiles } from "@/db/schema";
import { getFileMetadata } from "@/lib/dal/files";

export const dynamic = "force-dynamic";

/**
 * GET /api/system/file/metadata
 * 返回单个文件的完整元数据 + 插件配额信息。
 *
 * 查询参数：
 *   fileId (required) — 文件 ID
 *
 * pluginKey 从 x-plugin-key 请求头获取（FILE-06 双重隔离）。
 *
 * D-13: 返回配额信息（总文件数、总字节数、配额上限）。
 */
export async function GET(request: NextRequest) {
  // 1. 认证
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(
      { error: "UNAUTHORIZED", message: "请先登录后查看文件信息。" },
      { status: 401 },
    );
  }

  try {
    // 2. 参数解析
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return Response.json(
        { error: "MISSING_FILE_ID", message: "请提供 fileId 参数。" },
        { status: 400 },
      );
    }

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

    // 5. 查询文件元数据（schoolId + pluginId + fileId 三重隔离）
    const record = await getFileMetadata(schoolId, pluginKey, fileId);
    if (!record) {
      return Response.json(
        { error: "FILE_NOT_FOUND", message: "文件不存在或无权访问。" },
        { status: 404 },
      );
    }

    // 6. 聚合查询配额信息（D-13）
    // 统计该插件在该学校的总文件数和总字节数
    let fileCount = 0;
    let totalBytes = 0;

    try {
      const quotaRows = await db.query.pluginFiles.findMany({
        where: and(
          eq(pluginFiles.schoolId, schoolId),
          eq(pluginFiles.pluginId, pluginKey),
          eq(pluginFiles.isLatest, true),
          eq(pluginFiles.operation, "upload"),
        ),
        columns: { sizeBytes: true },
      });
      fileCount = quotaRows.length;
      totalBytes = quotaRows.reduce((sum, row) => sum + (row.sizeBytes ?? 0), 0);
    } catch {
      // 配额查询失败不影响元数据返回
    }

    const maxTotalBytes = parseInt(
      process.env.FILE_QUOTA_TOTAL_PER_PLUGIN || "524288000",
      10,
    ); // 默认 500MB

    return Response.json(
      {
        fileId: record.id,
        sha256: record.sha256,
        fileName: record.fileName,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
        diskPath: record.diskPath,
        createdAt: record.createdAt,
        quota: {
          fileCount,
          totalBytes,
          maxTotalBytes,
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error: any) {
    const message = error?.message ?? "";
    return Response.json(
      { error: "METADATA_FAILED", message },
      { status: 500 },
    );
  }
}
