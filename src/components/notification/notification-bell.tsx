"use client";

import { useCallback, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/hooks/use-unread-count";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationDropdown } from "@/components/notification/notification-dropdown";

/**
 * Bell icon + badge + dropdown trigger 组件
 *
 * - 使用 useUnreadCount hook 获取未读计数（10s 轮询）
 * - 未读时 Bell icon 变 primary 色 + badge pill
 * - 点击展开 NotificationDropdown（最近 5 条）
 */
export function NotificationBell() {
  const { count, isLoading: countLoading } = useUnreadCount();
  const { items: notifications } = useNotifications();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const hasUnread = !countLoading && typeof count === "number" && count > 0;

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  const handleMarkRead = useCallback(
    async (id: string) => {
      try {
        await fetch("/api/notification/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: id }),
        });
        closeDropdown();
      } catch {
        // 静默失败 — 下次轮询会纠正
      }
    },
    [closeDropdown],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleDropdown}
        title="通知"
        aria-label={`通知${hasUnread ? `（${count} 条未读）` : ""}`}
        className={cn(
          "relative rounded-full p-2.5 transition-colors",
          "bg-surface-container-lowest",
          hasUnread ? "text-primary" : "text-on-surface-variant",
          "hover:text-on-surface hover:bg-surface-container-low",
          "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40",
        )}
      >
        <Bell className="size-5" />

        {/* Unread badge */}
        {hasUnread && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-on-primary",
              "transition-opacity duration-200",
            )}
          >
            {(count ?? 0) > 9 ? "9+" : count}
          </span>
        )}
      </button>

      <NotificationDropdown
        isOpen={isDropdownOpen}
        onClose={closeDropdown}
        notifications={notifications}
        onMarkRead={handleMarkRead}
      />
    </div>
  );
}
