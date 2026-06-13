import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  body: string;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  body,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 px-4 py-12 text-center",
        className,
      )}
    >
      <div className="text-on-surface-variant/40">
        {icon ?? <Inbox className="size-12" />}
      </div>
      <p className="text-lg font-semibold text-on-surface">{title}</p>
      <p className="text-sm text-on-surface-variant">{body}</p>
    </div>
  );
}
