"use client";

import { useCallback, useState } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationList } from "@/components/notification/notification-list";
import { useNotifications } from "@/hooks/use-notifications";

/**
 * /notifications 页面的客户端内容组件
 *
 * 因为 "全部标为已读" 需要客户端交互（fetch + mutate），
 * 所以将内容拆分为客户端组件。
 */
export function NotificationPageContent() {
  const { mutate } = useNotifications();
  const [markingAll, setMarkingAll] = useState(false);

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      await fetch("/api/notification/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      void mutate();
    } catch {
      // 静默失败
    } finally {
      setMarkingAll(false);
    }
  }, [mutate]);

  return (
    <div className="mx-auto max-w-[680px] px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-on-surface">通知中心</h1>
        <Button
          variant="secondary"
          onClick={handleMarkAllRead}
          disabled={markingAll}
        >
          <CheckCheck className="mr-2 size-4" />
          全部标为已读
        </Button>
      </div>

      {/* List */}
      <NotificationList />
    </div>
  );
}
