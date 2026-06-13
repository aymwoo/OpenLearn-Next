import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { mkdir, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { Transform } from "node:stream";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { sanitizeFilePath, ABSOLUTE_STORAGE_ROOT } from "@/features/system-commands/file-path-guard";
import { buildStoragePath } from "@/lib/file-storage/storage-path";
import { getFileBySha256 } from "@/lib/dal/files";
import { dispatchSystemCommand } from "@/features/system-commands/facade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 流式配额检查 Transform。
 * Phase 80 D-12/D-15: 超限立即中断流并清理由 pipeline error handler 清理。
 */
class QuotaTransform extends Transform {
  private bytesWritten = 0;

  constructor(
    private readonly maxBytes: number,
    private readonly label: string = "upload",
  ) {
    super();
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null, data?: Buffer) => void) {
    this.bytesWritten += chunk.length;
    if (this.bytesWritten > this.maxBytes) {
      callback(new Error(`QUOTA_EXCEEDED:${this.label}`));
      return;
    }
    this.push(chunk);
    callback();
  }

  getTotalBytes(): number {
    return this.bytesWritten;
  }
}

/**
 * POST /api/system/file/upload
 * Binary Bypass 流式上传：接收 multipart/form-data，流式计算 SHA-256 + 配额检查 + 磁盘写入。
 * SHA-256 幂等：相同内容不重复写磁盘，直接返回已有 fileId。
 * 元数据通过 Command Bus 写入（仅元数据入 Bus，二进制走 API Route）。
 */
export async function POST(request: NextRequest) {
  // 1. 认证：从 Auth.js session 获取 actorId
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(
      { error: "UNAUTHORIZED", message: "请先登录后再上传文件。" },
      { status: 401 },
    );
  }
  const actorId = String(session.user.id);

  let tempPath: string | null = null;

  try {
    // 2. 解析 multipart：提取 file 字段和 fileName
    const formData = await request.formData();
    const fileField = formData.get("file");
    const fileNameField = formData.get("fileName");

    if (!fileField || !(fileField instanceof File)) {
      return Response.json(
        { error: "MISSING_FILE", message: "请提供 file 字段。" },
        { status: 400 },
      );
    }

    const file = fileField as File;
    const fileName = typeof fileNameField === "string" && fileNameField.length > 0
      ? fileNameField
      : file.name || "untitled";

    // 3. 路径穿越防护（D-01 多层消毒）
    const sanitized = sanitizeFilePath(fileName);
    if (sanitized === null) {
      return Response.json(
        { error: "INVALID_PATH", message: "文件名包含非法字符。" },
        { status: 400 },
      );
    }

    // 4. 从请求头获取 pluginKey（插件标识）
    const pluginKey = request.headers.get("x-plugin-key") ?? "";

    if (!pluginKey) {
      return Response.json(
        { error: "MISSING_PLUGIN_KEY", message: "请提供 x-plugin-key 请求头。" },
        { status: 400 },
      );
    }

    // 5. 扩展名提取（D-03）
    const ext = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
      : "";

    // 6. 流式管道：SHA-256 + QuotaTransform + 磁盘写入
    const maxSingleSize = parseInt(process.env.FILE_QUOTA_MAX_SINGLE || "52428800", 10); // 默认 50MB
    const hash = createHash("sha256");
    const quotaChecker = new QuotaTransform(maxSingleSize, "upload");

    // 使用 Node.js Readable.fromWeb 将 Web ReadableStream 转为 Node.js Readable
    const { Readable } = await import("node:stream");
    const nodeStream = Readable.fromWeb(file.stream() as any);

    // 暂存到临时路径（后续重命名为最终 SHA-256 路径）
    const extname = ext || "";
    const tempName = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tempDir = join(ABSOLUTE_STORAGE_ROOT, "_tmp");
    await mkdir(tempDir, { recursive: true });
    tempPath = join(tempDir, tempName);

    const writeStream = createWriteStream(tempPath, { flags: "wx" });

    let sha256: string;
    let sizeBytes: number;

    try {
      await pipeline(nodeStream, hash, quotaChecker, writeStream);
      sha256 = hash.digest("hex");
      sizeBytes = quotaChecker.getTotalBytes();
    } catch (pipeErr: any) {
      // 清理部分写入的文件（Pitfall 5）
      if (tempPath) {
        await unlink(tempPath).catch(() => {});
      }
      tempPath = null;

      const message = pipeErr?.message ?? "";
      if (message.includes("QUOTA_EXCEEDED")) {
        return Response.json(
          {
            error: "FILE_TOO_LARGE",
            usage: quotaChecker.getTotalBytes(),
            quota: maxSingleSize,
            exceeded: quotaChecker.getTotalBytes() - maxSingleSize,
          },
          { status: 413 },
        );
      }
      if (message.includes("EEXIST")) {
        return Response.json(
          { error: "CONFLICT", message: "临时文件冲突，请重试。" },
          { status: 409 },
        );
      }
      return Response.json(
        { error: "UPLOAD_FAILED", message: "文件上传失败。" },
        { status: 500 },
      );
    }

    // 7. 从 facade 获取 schoolId（通过治理门派生）
    // 先尝试获取 schoolId：用 system.config.get 间接获取
    // 对于 upload，我们直接把 actorId 和 pluginKey 给 facade，由 facade 的 assertActionExecutable 派生 schoolId
    // 但 getFileBySha256 需要 schoolId + pluginId，我们先跳过幂等检查来获取 schoolId
    // 解决方案：直接尝试调用 dispatchSystemCommand 来通过治理门获取上下文
    // 更好的方案：从 DAL 获取 schoolId 通过用户
    const { getCurrentUserSchoolIds } = await import("@/lib/dal/auth");
    const schoolIds = await getCurrentUserSchoolIds();
    if (schoolIds.length === 0) {
      return Response.json(
        { error: "NO_SCHOOL", message: "用户未关联任何学校。" },
        { status: 403 },
      );
    }
    const schoolId = schoolIds[0];

    // 8. SHA-256 幂等性检查（D-04）
    const existing = await getFileBySha256(schoolId, pluginKey, sha256);
    if (existing) {
      // 已存在相同内容的文件 → 清理临时文件，返回已有 fileId
      if (tempPath) {
        await unlink(tempPath).catch(() => {});
        tempPath = null;
      }
      return Response.json(
        {
          fileId: existing.id,
          sha256: existing.sha256,
          fileName: existing.fileName,
          sizeBytes: existing.sizeBytes,
          mimeType: existing.mimeType,
          existed: true,
        },
        { status: 200 },
      );
    }

    // 9. 构建最终存储路径（D-05/D-06/D-07）
    const storageExt = ext || "";
    const finalPath = buildStoragePath(schoolId, pluginKey, sha256, storageExt);

    // 确保父目录存在（D-07）
    await mkdir(dirname(finalPath), { recursive: true });

    // 重命名临时文件到最终路径
    const { rename } = await import("node:fs/promises");
    try {
      await rename(tempPath, finalPath);
      tempPath = null; // 已移动，不需要清理
    } catch (renameErr: any) {
      // 最终路径可能已存在（并发竞态）
      if (renameErr?.code === "EEXIST" || renameErr?.message?.includes("EEXIST")) {
        // 检查已存在文件的 SHA-256 是否匹配
        const { createHash: ch2 } = await import("node:crypto");
        const { createReadStream } = await import("node:fs");
        const existingHash = await new Promise<string>((resolve, reject) => {
          const h = ch2("sha256");
          const rs = createReadStream(finalPath);
          rs.on("data", (chunk: Buffer) => h.update(chunk));
          rs.on("end", () => resolve(h.digest("hex")));
          rs.on("error", reject);
        });
        if (existingHash === sha256) {
          // SHA-256 匹配 → 幂等成功
          if (tempPath) {
            await unlink(tempPath).catch(() => {});
            tempPath = null;
          }
          const existing = await getFileBySha256(schoolId, pluginKey, sha256);
          return Response.json(
            {
              fileId: existing?.id ?? sha256,
              sha256,
              fileName,
              sizeBytes,
              mimeType: file.type || "application/octet-stream",
              existed: true,
            },
            { status: 200 },
          );
        }
        // SHA-256 不匹配 → 哈希冲突，拒绝
        return Response.json(
          { error: "CONFLICT", message: "文件哈希冲突。" },
          { status: 409 },
        );
      }
      throw renameErr;
    }

    // 10. 通过 Command Bus 写入元数据（Binary Bypass：仅元数据入 Bus）
    const { randomUUID } = await import("node:crypto");
    const fileId = randomUUID();
    const mimeType = file.type || "application/octet-stream";
    const diskPath = join(schoolId, pluginKey, `${sha256}${storageExt}`);

    const result = await dispatchSystemCommand({
      commandType: "system.file.upload",
      pluginKey,
      actorId,
      fileMeta: {
        fileId,
        sha256,
        fileName,
        mimeType,
        sizeBytes,
        diskPath,
      },
    });

    if (!result.success) {
      // 元数据写入失败 → 清理磁盘文件
      await unlink(finalPath).catch(() => {});
      return Response.json(
        { error: "METADATA_WRITE_FAILED", message: "文件元数据写入失败。" },
        { status: 500 },
      );
    }

    // 11. 返回成功
    return Response.json(
      {
        fileId,
        sha256,
        fileName,
        sizeBytes,
        mimeType,
      },
      { status: 201 },
    );
  } catch (error: any) {
    // 清理任何残余临时文件
    if (tempPath) {
      await unlink(tempPath).catch(() => {});
    }

    // 磁盘满等错误（D-12/D-15）
    const message = error?.message ?? "";
    if (message.includes("ENOSPC") || message.includes("QUOTA_EXCEEDED")) {
      return Response.json(
        {
          error: "INSUFFICIENT_STORAGE",
          message: "存储空间不足。",
        },
        { status: 507 },
      );
    }

    return Response.json(
      { error: "INTERNAL_SERVER_ERROR", message: "服务器内部错误。" },
      { status: 500 },
    );
  }
}
