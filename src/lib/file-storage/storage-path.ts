import { resolve, join } from "node:path";

const STORAGE_ROOT = process.env.FILE_STORAGE_ROOT || "data/files";

/**
 * 构建文件存储的绝对路径。
 * 格式: {FILE_STORAGE_ROOT}/{schoolId}/{pluginKey}/{sha256}.{ext}
 */
export function buildStoragePath(
  schoolId: string,
  pluginKey: string,
  sha256: string,
  extension: string,
): string {
  return resolve(join(STORAGE_ROOT, schoolId, pluginKey, `${sha256}.${extension}`));
}

/**
 * 将相对于 FILE_STORAGE_ROOT 的路径解析为绝对路径。
 * 用于 download Route 将 DB 中存储的 diskPath 转换为文件系统路径。
 */
export function resolveStoragePath(relativePath: string): string {
  return resolve(join(STORAGE_ROOT, relativePath));
}
