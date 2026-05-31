"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ClassroomConsoleSessionEntryDTO } from "@/lib/dto/classroom";
import { cn } from "@/lib/utils";

export function ClassroomSessionHistoryPanel({
  sessions,
  selectedSessionId,
}: {
  sessions: ClassroomConsoleSessionEntryDTO[];
  selectedSessionId?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectSession = (sessionId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sessionId", sessionId);
    params.delete("detailTab");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Card className="bg-surface-container-low p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-on-surface-variant">课堂记录</p>
          <h3 className="mt-2 text-xl font-semibold text-on-surface">在当前课堂域里回看最近记录</h3>
        </div>
        <Badge className="bg-surface-container-lowest text-on-surface-variant">同路由切换</Badge>
      </div>

      {sessions.length === 0 ? (
        <div className="mt-5 rounded-[1.35rem] bg-surface-container-lowest p-4 text-sm text-on-surface-variant shadow-ambient">
          <p className="font-semibold text-on-surface">还没有课堂记录</p>
          <p className="mt-2 leading-7">开始并结束一节课堂后，这里会保留你的课堂复盘入口。</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {sessions.map((session) => {
            const selected = session.id === selectedSessionId;
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => selectSession(session.id)}
                className={cn(
                  "flex w-full flex-col gap-2 rounded-[1.35rem] p-4 text-left transition-colors",
                  selected
                    ? "bg-primary/10 text-on-surface"
                    : "bg-surface-container-lowest text-on-surface hover:bg-surface-container-high",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{session.lessonTitle}</span>
                  <Badge className={selected ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant"}>
                    {session.status === "live" ? "进行中" : "已结束"}
                  </Badge>
                </div>
                <p className="text-sm text-on-surface-variant">{session.className}</p>
                <p className="text-xs text-on-surface-variant">
                  {session.status === "live"
                    ? `更新于 ${new Date(session.updatedAt).toLocaleString([], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                    : `结束于 ${new Date(session.endedAt ?? session.updatedAt).toLocaleString([], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
