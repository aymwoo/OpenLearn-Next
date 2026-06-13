import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getFileRecord } from "@/lib/dal/files";
import { resolveStoragePath } from "@/lib/file-storage/storage-path";
import { getMimeType } from "@/lib/file-storage/mime-fallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 解析 Range 请求头（RFC 7233，单 range + suffix range）。
 *
 * 支持两种格式：
 *   "bytes=N-M"   → 返回 { start: N, end: M }
 *   "bytes=-N"    → 后缀范围，返回最后 N 字节
 */
function parseRangeHeader(
  rangeHeader: string,
  fileSize: number,
): { start: number; end: number } | null {
  // 处理 "bytes=-N"（后缀范围）
  const suffixMatch = rangeHeader.match(/^bytes=-(\d+)$/);
  if (suffixMatch) {
    const suffix = parseInt(suffixMatch[1], 10);
    if (suffix > fileSize) return null;
    return { start: fileSize - suffix, end: fileSize - 1 };
  }

  // 处理 "bytes=N-M" 或 "bytes=N-"
  const match = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);
  if (!match) return null;

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

  if (start > end || start >= fileSize) return null;

  return { start, end: Math.min(end, fileSize - 1) };
}

/**
 * GET /api/system/file/download
 * 流式返回文件，支持 HTTP 206 Range 请求（Part 2.2）。
 *
 * 查询参数：
 *   fileId (required) — 文件 ID
 *
 * 响应头：
 *   Content-Type — 优先使用 DB 记录 MIME，回退到扩展名查找
 *   Content-Disposition: attachment; filename="..."
 *   Cache-Control: private, no-cache（Pitfall 4 安全头）
 *   Accept-Ranges: bytes
 *   206 时附加 Content-Range: bytes {start}-{end}/{total}
 */
export async function GET(request: NextRequest) {
  // 1. 认证：从 Auth.js session 获取 actorId、schoolId
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(
      { error: "UNAUTHORIZED", message: "请先登录后再下载文件。" },
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

    // 3. 获取调用者 schoolId 和 pluginKey（FILE-06 双重隔离）
    const { getCurrentUserSchoolIds } = await import("@/lib/dal/auth");
    const schoolIds = await getCurrentUserSchoolIds();
    if (schoolIds.length === 0) {
      return Response.json(
        { error: "NO_SCHOOL", message: "用户未关联任何学校。" },
        { status: 403 },
      );
    }
    const schoolId = schoolIds[0];

    const pluginKey = request.headers.get("x-plugin-key") ?? "";
    if (!pluginKey) {
      return Response.json(
        { error: "MISSING_PLUGIN_KEY", message: "请提供 x-plugin-key 请求头。" },
        { status: 400 },
      );
    }

    // 4. DAL 查询（schoolId + pluginId 双重隔离，T-80-18）
    const record = await getFileRecord(schoolId, pluginKey, fileId);
    if (!record) {
      return Response.json(
        { error: "FILE_NOT_FOUND", message: "文件不存在或无权访问。" },
        { status: 404 },
      );
    }

    // 5. 解析磁盘路径
    if (!record.diskPath) {
      return Response.json(
        { error: "FILE_CORRUPTED", message: "文件记录损坏：无磁盘路径。" },
        { status: 500 },
      );
    }

    const diskPath = resolveStoragePath(record.diskPath);

    // 6. 检查文件是否真实存在于磁盘上
    let fileStat;
    try {
      fileStat = await stat(diskPath);
    } catch {
      return Response.json(
        { error: "FILE_NOT_FOUND", message: "文件实体不存在。" },
        { status: 404 },
      );
    }

    const fileSize = fileStat.size;

    // 7. 解析 Range 请求头
    const rangeHeader = request.headers.get("Range");
    const range = rangeHeader ? parseRangeHeader(rangeHeader, fileSize) : null;

    // 8. 创建 ReadStream
    const start = range?.start ?? 0;
    const end = range?.end ?? fileSize - 1;
    const contentLength = range ? end - start + 1 : fileSize;

    const readStream = createReadStream(diskPath, { start, end });

    // 9. 构建 MIME 类型（D-13 MIME fallback）
    const mimeType = getMimeType(record.fileName, record.mimeType);

    // 10. 构建流式 Response
    const { Readable } = await import("node:stream");
    const webStream = Readable.toWeb(readStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(record.fileName)}"`,
      "Content-Length": String(contentLength),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-cache",
    };

    if (range) {
      headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`;
    }

    return new Response(webStream, {
      status: range ? 206 : 200,
      headers,
    });
  } catch (error: any) {
    const message = error?.message ?? "";
    return Response.json(
      { error: "DOWNLOAD_FAILED", message },
      { status: 500 },
    );
  }
}
