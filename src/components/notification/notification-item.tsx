"use client";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import type { NotificationDTO } from "@/hooks/use-notifications";

type NotificationItemProps = {
  notification: Pick<
    NotificationDTO,
    "id" | "title" | "body" | "notificationType" | "readAt" | "createdAt"
  >;
  onMarkRead?: (id: string) => void;
  /** 上下文：dropdown 使用 1 行正文截断，page 使用 2 行 */
  bodyClamp?: "line-clamp-1" | "line-clamp-2";
};

export function NotificationItem({
  notification,
  onMarkRead,
  bodyClamp = "line-clamp-1",
}: NotificationItemProps) {
  const isUnread = notification.readAt === null;

  const handleClick = () => {
    if (isUnread && onMarkRead) {
      onMarkRead(notification.id);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "relative flex w-full items-start gap-3 px-4 py-4 text-left transition-colors",
        "min-h-[56px]",
        isUnread
          ? "bg-surface-container-low/40"
          : "bg-surface-container-lowest",
        "hover:bg-surface-container-low",
      )}
    >
      {/* Unread dot */}
      {isUnread && (
        <span className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
      )}

      <div className="ml-0.5 flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-base font-normal leading-snug text-on-surface line-clamp-2">
          {notification.title}
        </p>
        <p
          className={cn(
            "text-sm font-normal leading-relaxed text-on-surface-variant",
            bodyClamp === "line-clamp-1" ? "line-clamp-1" : "line-clamp-2",
          )}
        >
          {notification.body}
        </p>
      </div>

      <time
        className="shrink-0 pt-0.5 text-xs font-normal text-on-surface-variant"
        dateTime={
          typeof notification.createdAt === "number"
            ? new Date(notification.createdAt).toISOString()
            : String(notification.createdAt)
        }
      >
        {formatRelativeTime(notification.createdAt)}
      </time>
    </button>
  );
}
