import { resolve } from "node:path";

const STORAGE_ROOT = process.env.FILE_STORAGE_ROOT || "data/files";
const ABSOLUTE_STORAGE_ROOT = resolve(STORAGE_ROOT);

export { ABSOLUTE_STORAGE_ROOT };

/**
 * 多层路径消毒函数，防护路径穿越攻击。
 *
 * Layer 1: 双重 URI 解码（捕获 %2e%2e%2f 和 %252f 变体）
 * Layer 2: Null byte 拒绝
 * Layer 3: Parent reference (..) 拒绝
 * Layer 4: Absolute path resolve + prefix 验证（确保路径在存储根目录内）
 *
 * @returns 消毒后的绝对路径，或 null 如果路径非法
 */
export function sanitizeFilePath(rawPath: string): string | null {
  // Layer 1: Double URI decode (catches %2e%2e%2f and %252f variants)
  let decoded = rawPath;
  for (let pass = 0; pass < 2; pass++) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return null;
    }
  }

  // Layer 2: Reject null bytes
  if (decoded.includes("\x00")) return null;

  // Layer 3: Reject parent references
  if (decoded.includes("..")) return null;

  // Layer 4: Absolute resolve + prefix verification
  const resolved = resolve(ABSOLUTE_STORAGE_ROOT, decoded);
  if (!resolved.startsWith(ABSOLUTE_STORAGE_ROOT + "/") && resolved !== ABSOLUTE_STORAGE_ROOT) {
    return null;
  }
  return resolved;
}
