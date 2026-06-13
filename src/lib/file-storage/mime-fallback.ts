const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".zip": "application/zip",
  ".csv": "text/csv",
  ".xml": "application/xml",
};

/**
 * MIME 类型回退函数。
 * 优先使用 DB 记录的 MIME 类型，回退到基于文件扩展名的查找，
 * 最终回退到 "application/octet-stream"。
 */
export function getMimeType(fileName: string, dbMimeType?: string | null): string {
  if (dbMimeType && dbMimeType.length > 0) return dbMimeType;
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  return EXTENSION_TO_MIME[ext] ?? "application/octet-stream";
}
