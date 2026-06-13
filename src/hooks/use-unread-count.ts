"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 未读通知计数轮询 hook
 *
 * - 每 10s 轮询 GET /api/notification/unread-count
 * - 页面不可见时自动暂停轮询（Page Visibility API）
 * - 页面恢复可见时立即触发一次轮询
 *
 * @returns { count: number | undefined, isLoading: boolean, error: Error | undefined }
 */
export function useUnreadCount(): {
  count: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {
  const [count, setCount] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notification/unread-count");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setCount(data.count as number);
      setError(undefined);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("获取未读计数失败"),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 初始加载
    fetchCount();

    // 10s 轮询
    intervalRef.current = setInterval(fetchCount, 10_000);

    // Page Visibility API — 不可见时暂停，可见时恢复
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // 恢复可见时立即拉取
        fetchCount();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(fetchCount, 10_000);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchCount]);

  return { count, isLoading, error };
}
