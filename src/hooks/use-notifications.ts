"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type NotificationDTO = {
  id: string;
  pluginId: string;
  schoolId: string;
  recipientUserId: string;
  notificationType: string;
  title: string;
  body: string;
  readAt: number | null;
  createdAt: number;
};

type ListResponse = {
  items: NotificationDTO[];
  nextCursor: string | null;
};

/**
 * 通知列表 cursor-based 分页 hook
 *
 * @returns { items, nextCursor, isLoading, loadMore, mutate }
 */
export function useNotifications(): {
  items: NotificationDTO[];
  nextCursor: string | null;
  isLoading: boolean;
  loadMore: () => Promise<void>;
  mutate: () => Promise<void>;
} {
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const cursorRef = useRef<string | undefined>(undefined);
  const isLoadingMoreRef = useRef(false);

  const fetchPage = useCallback(
    async (cursor?: string, append = false) => {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) params.set("cursor", cursor);

      const response = await fetch(
        `/api/notification/list?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data: ListResponse = await response.json();

      if (append) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setNextCursor(data.nextCursor);
    },
    [],
  );

  // 初始加载
  useEffect(() => {
    setIsLoading(true);
    fetchPage(undefined, false)
      .catch(() => {
        // 错误状态由调用方通过返回的空 items 处理
      })
      .finally(() => setIsLoading(false));
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || !nextCursor) return;
    isLoadingMoreRef.current = true;
    cursorRef.current = nextCursor;
    try {
      await fetchPage(cursorRef.current, true);
    } finally {
      isLoadingMoreRef.current = false;
    }
  }, [fetchPage, nextCursor]);

  // mutate: 重新加载第一页
  const mutate = useCallback(async () => {
    setIsLoading(true);
    cursorRef.current = undefined;
    await fetchPage(undefined, false);
    setIsLoading(false);
  }, [fetchPage]);

  return { items, nextCursor, isLoading, loadMore, mutate };
}
