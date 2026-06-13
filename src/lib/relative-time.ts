/**
 * 相对时间格式化工具函数
 *
 * 将 Date、毫秒时间戳或 ISO 字符串转换为中文相对时间显示。
 *
 * @example
 *   formatRelativeTime(new Date())              // "刚刚"
 *   formatRelativeTime(Date.now() - 5 * 60000)  // "5分钟前"
 *   formatRelativeTime(Date.now() - 3 * 3600000) // "3小时前"
 *   formatRelativeTime(Date.now() - 2 * 86400000) // "2天前"
 *   formatRelativeTime(Date.now() - 40 * 86400000) // "2026-05-04"
 */

export function formatRelativeTime(date: Date | number | string): string {
  const target = resolveDate(date);
  const now = new Date();

  // 未来时间 → "刚刚"
  if (target > now) {
    return "刚刚";
  }

  const diffMs = now.getTime() - target.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "刚刚";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  }

  if (diffHours < 24) {
    return `${diffHours}小时前`;
  }

  if (diffDays <= 30) {
    return `${diffDays}天前`;
  }

  // 超过 30 天 → YYYY-MM-DD
  return target.toISOString().slice(0, 10);
}

function resolveDate(date: Date | number | string): Date {
  if (date instanceof Date) {
    return date;
  }

  // number 类型视为毫秒时间戳（timestamp_ms，对齐 Drizzle mode）
  if (typeof date === "number") {
    return new Date(date);
  }

  // string → ISO 或时间戳数字字符串
  if (typeof date === "string") {
    // 如果是纯数字字符串，视为毫秒时间戳
    if (/^\d+$/.test(date)) {
      return new Date(parseInt(date, 10));
    }
    return new Date(date);
  }

  return new Date(date);
}
