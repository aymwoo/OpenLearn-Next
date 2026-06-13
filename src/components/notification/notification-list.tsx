"use client";

import { useCallback } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationItem } from "@/components/notification/notification-item";
import { EmptyState } from "@/components/notification/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function NotificationList() {
  const { items, nextCursor, isLoading, loadMore, mutate } =
    useNotifications();

  const handleMarkRead = useCallback(
    async (id: string) => {
      try {
        await fetch("/api/notification/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markAll: false, notificationId: id }),
        });
        // 刷新列表以反映已读状态
        void mutate();
      } catch {
        // 静默失败
      }
    },
    [mutate],
  );

  // Loading state
  if (isLoading && items.length === 0) {
    return (
      <div className="flex flex-col gap-2 px-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[56px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // Empty state
  if (!isLoading && items.length === 0) {
    return (
      <EmptyState title="暂无通知" body="系统通知将在此处显示" />
    );
  }

  return (
    <div className="flex flex-col">
      <div className="divide-y divide-surface-container-low">
        {items.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={handleMarkRead}
            bodyClamp="line-clamp-2"
          />
        ))}
      </div>

      {nextCursor && (
        <div className="flex justify-center px-4 py-6">
          <Button
            variant="secondary"
            onClick={loadMore}
            className="w-full max-w-xs"
          >
            加载更多
          </Button>
        </div>
      )}
    </div>
  );
}
