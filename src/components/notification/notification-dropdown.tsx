"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { NotificationItem } from "@/components/notification/notification-item";
import { EmptyState } from "@/components/notification/empty-state";
import { cn } from "@/lib/utils";
import type { NotificationDTO } from "@/hooks/use-notifications";

type NotificationDropdownProps = {
  isOpen: boolean;
  onClose: () => void;
  notifications: Pick<
    NotificationDTO,
    "id" | "title" | "body" | "notificationType" | "readAt" | "createdAt"
  >[];
  onMarkRead: (id: string) => void;
};

export function NotificationDropdown({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
}: NotificationDropdownProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Escape 键关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute right-0 top-full z-50 mt-2 w-[360px] origin-top-right",
        "animate-in fade-in zoom-in-95",
        "transition duration-150 ease-out",
      )}
    >
      <Card className="overflow-hidden p-0 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold text-on-surface">最近通知</p>
        </div>

        <div className="max-h-[384px] divide-y divide-surface-container-low overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <EmptyState
              title="暂无通知"
              body="系统通知将在此处显示"
              className="py-10"
            />
          ) : (
            recentNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={onMarkRead}
                bodyClamp="line-clamp-1"
              />
            ))
          )}
        </div>

        <div className="border-t border-surface-container-low px-4 py-3">
          <Link
            href="/notifications"
            onClick={onClose}
            className="block text-center text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            查看全部
          </Link>
        </div>
      </Card>
    </div>
  );
}
