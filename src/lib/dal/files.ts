import "server-only";

import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { pluginFiles } from "@/db/schema";

export type FileRecord = typeof pluginFiles.$inferSelect;

/**
 * 幂等性检查：根据 SHA-256 查询是否已上传相同内容的文件。
 * 只查询 isLatest=true 且 operation="upload" 的记录。
 */
export async function getFileBySha256(
  schoolId: string,
  pluginId: string,
  sha256: string,
) {
  return db.query.pluginFiles.findFirst({
    where: and(
      eq(pluginFiles.schoolId, schoolId),
      eq(pluginFiles.pluginId, pluginId),
      eq(pluginFiles.sha256, sha256),
      eq(pluginFiles.isLatest, true),
      eq(pluginFiles.operation, "upload"),
    ),
  });
}

/**
 * 插入一条新的文件上传记录。
 * operation 固定为 "upload"，isLatest 默认为 true。
 */
export async function insertFileRecord(input: {
  schoolId: string;
  pluginId: string;
  sha256: string;
  fileName: string;
  mimeType: string;
  diskPath: string;
  sizeBytes: number;
}) {
  const [row] = await db
    .insert(pluginFiles)
    .values({
      schoolId: input.schoolId,
      pluginId: input.pluginId,
      operation: "upload",
      sha256: input.sha256,
      fileName: input.fileName,
      mimeType: input.mimeType,
      diskPath: input.diskPath,
      sizeBytes: input.sizeBytes,
      isLatest: true,
    })
    .returning();

  return row;
}

/**
 * 根据文件 ID 查询文件记录（强制 schoolId + pluginId 双重隔离）。
 */
export async function getFileRecord(
  schoolId: string,
  pluginId: string,
  fileId: string,
) {
  return db.query.pluginFiles.findFirst({
    where: and(
      eq(pluginFiles.schoolId, schoolId),
      eq(pluginFiles.pluginId, pluginId),
      eq(pluginFiles.id, fileId),
      eq(pluginFiles.isLatest, true),
    ),
  });
}

/**
 * cursor-based 分页列表文件。
 * 只返回 isLatest=true 且 operation="upload" 的记录。
 * 支持通过 fileName 前缀过滤。
 */
export async function listFiles(input: {
  schoolId: string;
  pluginId: string;
  prefix: string;
  cursor?: string;
  limit: number;
}): Promise<{ files: FileRecord[]; nextCursor: string | null }> {
  const conditions = [
    eq(pluginFiles.schoolId, input.schoolId),
    eq(pluginFiles.pluginId, input.pluginId),
    eq(pluginFiles.isLatest, true),
    eq(pluginFiles.operation, "upload"),
  ];

  const rows = await db.query.pluginFiles.findMany({
    where: and(...conditions),
    orderBy: desc(pluginFiles.createdAt),
    limit: input.limit + 1,
  });

  // 应用 prefix 过滤（在 JavaScript 层实现 prefix 匹配）
  const filtered = input.prefix
    ? rows.filter((row) => row.fileName.startsWith(input.prefix))
    : rows;

  const hasMore = filtered.length > input.limit;
  const files = filtered.slice(0, input.limit);
  const nextCursor = hasMore && files.length > 0
    ? files[files.length - 1].id
    : null;

  return { files, nextCursor };
}

/**
 * 获取文件元数据（与 getFileRecord 相同，但强调返回元数据属性）。
 */
export async function getFileMetadata(
  schoolId: string,
  pluginId: string,
  fileId: string,
) {
  return db.query.pluginFiles.findFirst({
    where: and(
      eq(pluginFiles.schoolId, schoolId),
      eq(pluginFiles.pluginId, pluginId),
      eq(pluginFiles.id, fileId),
      eq(pluginFiles.isLatest, true),
    ),
  });
}

/**
 * 软删除文件：在事务中 (a) 将当前行 isLatest 设为 false，
 * (b) 插入新的 delete 行，保留 fileName 和 previousRowId。
 */
export async function softDeleteFile(
  schoolId: string,
  pluginId: string,
  fileId: string,
) {
  return db.transaction(async (tx) => {
    // 查找当前行
    const existing = await tx.query.pluginFiles.findFirst({
      where: and(
        eq(pluginFiles.schoolId, schoolId),
        eq(pluginFiles.pluginId, pluginId),
        eq(pluginFiles.id, fileId),
        eq(pluginFiles.isLatest, true),
      ),
    });

    if (!existing) {
      return null;
    }

    // (a) 将 isLatest 设为 false
    await tx
      .update(pluginFiles)
      .set({ isLatest: false })
      .where(
        and(
          eq(pluginFiles.id, fileId),
          eq(pluginFiles.isLatest, true),
          eq(pluginFiles.schoolId, schoolId),
          eq(pluginFiles.pluginId, pluginId),
        ),
      );

    // (b) 插入新的 delete 行
    const [deletedRow] = await tx
      .insert(pluginFiles)
      .values({
        schoolId,
        pluginId,
        operation: "delete",
        sha256: null,
        fileName: existing.fileName,
        mimeType: null,
        diskPath: null,
        sizeBytes: null,
        isLatest: true,
        previousRowId: fileId,
      })
      .returning();

    return deletedRow;
  });
}
