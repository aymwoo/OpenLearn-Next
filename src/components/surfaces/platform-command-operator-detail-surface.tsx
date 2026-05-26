import Link from "next/link";

import type { PlatformCommandOperatorDetailDTO } from "@/features/platform-core/observability/dto";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type PlatformCommandOperatorDetailSurfaceProps = {
  detail: PlatformCommandOperatorDetailDTO;
};

function getStatusTone(status: string) {
  switch (status) {
    case "succeeded":
      return "bg-primary/15 text-primary";
    case "failed":
      return "bg-[#fff1f2] text-[#b31b25]";
    case "running":
      return "bg-[#eef6ff] text-[#1d4ed8]";
    default:
      return "bg-surface-container-low text-on-surface-variant";
  }
}

export function PlatformCommandOperatorDetailSurface({
  detail,
}: PlatformCommandOperatorDetailSurfaceProps) {
  if (!detail.command) {
    return (
      <Card className="bg-surface-container-lowest p-5 shadow-ambient sm:p-6">
        <p className="text-sm text-on-surface-variant">Command Detail</p>
        <h2 className="mt-2 text-2xl font-semibold text-on-surface">未找到命令详情</h2>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          当前 school scope 下没有对应 command，或该 command 不在当前 operator 可见范围内。
        </p>
      </Card>
    );
  }

  const { command, timeline } = detail;

  return (
    <section className="space-y-5">
      <Card className="bg-surface-container-low p-5 shadow-ambient sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm text-on-surface-variant">Command Detail</p>
            <h1 className="mt-2 text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-on-surface">
              {command.commandType} · {command.pluginId ?? command.commandId}
            </h1>
            <p className="mt-3 text-sm leading-7 text-on-surface-variant">
              这里保留 command summary、delegation / approval，以及 event dispatch timeline，避免回退成 raw log page。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={getStatusTone(command.status)}>{command.statusLabel}</Badge>
            <Badge className="bg-surface-container-lowest text-on-surface-variant">
              attempt #{command.latestAttemptNumber}
            </Badge>
            <Badge className="bg-surface-container-lowest text-on-surface-variant">
              school: {command.schoolId}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-surface-container-lowest p-4 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">Result Summary</p>
          <p className="mt-3 text-sm leading-6 text-on-surface">
            {command.failureSummaryLabel ?? command.resultSummaryLabel}
          </p>
        </Card>
        <Card className="bg-surface-container-lowest p-4 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">Invalidation Intent</p>
          <p className="mt-3 text-sm leading-6 text-on-surface">
            {command.invalidationIntent.label}
          </p>
        </Card>
        <Card className="bg-surface-container-lowest p-4 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">Delegation / Approval</p>
          <p className="mt-3 text-sm leading-6 text-on-surface">
            {command.auditSummaryLabel ?? "当前没有 delegation / approval 摘要。"}
          </p>
        </Card>
      </div>

      <Card className="bg-surface-container-low p-5 shadow-ambient sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-on-surface-variant">Timeline</p>
            <h2 className="mt-2 text-2xl font-semibold text-on-surface">event dispatch timeline</h2>
          </div>
          <Link
            href="/settings/labs"
            className="rounded-full bg-surface-container-lowest px-3 py-2 text-xs font-medium text-primary"
          >
            返回 Settings Labs
          </Link>
        </div>

        <div className="mt-5 grid gap-3">
          {timeline.length === 0 ? (
            <div className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-4 text-sm leading-6 text-on-surface-variant shadow-ambient">
              当前 command 还没有持久化 event timeline。
            </div>
          ) : (
            timeline.map((event) => (
              <div
                key={event.id}
                className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-4 shadow-ambient"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-surface-container-low text-on-surface-variant">
                    attempt #{event.attemptNumber}
                  </Badge>
                  <Badge className="bg-surface-container-low text-on-surface-variant">
                    {event.eventType}
                  </Badge>
                  <Badge className="bg-surface-container-low text-on-surface-variant">
                    {event.aggregateType}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-on-surface">{event.payloadSummaryLabel}</p>
                {event.auditSummaryLabel ? (
                  <p className="mt-2 text-xs leading-6 text-on-surface-variant">
                    delegation / approval: {event.auditSummaryLabel}
                  </p>
                ) : null}
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                  {new Date(event.occurredAt).toLocaleString()}
                </p>
                {event.dispatches.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {event.dispatches.map((dispatch) => (
                      <div
                        key={dispatch.dispatchId}
                        className="rounded-[1rem] bg-surface-container-low px-3 py-3 text-xs leading-6 text-on-surface-variant"
                      >
                        <p className="uppercase tracking-[0.16em]">
                          dispatch {dispatch.channel} · {dispatch.status}
                        </p>
                        {dispatch.adapterId ? <p className="mt-1">adapter: {dispatch.adapterId}</p> : null}
                        {dispatch.failureReason ? (
                          <p className="mt-1">failure: {dispatch.failureReason}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>
    </section>
  );
}
