import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AsyncTaskOperatorRetryAction } from "@/components/surfaces/async-task-operator-retry-action";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { surfaceWidths } from "@/components/surfaces/surface-widths";
import type { AsyncTaskOperatorDetailDTO } from "@/lib/dto/async-task-operator";
import { cn } from "@/lib/utils";

export function AsyncTaskOperatorDetailSurface({
  detail,
}: {
  detail: AsyncTaskOperatorDetailDTO;
}) {
  return (
    <div className={cn(surfaceWidths.workspace, teacherSurfaceRhythm.stack, "p-4 sm:p-5 lg:p-6")}>
      <section className={teacherSurfaceRhythm.hero}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className={surfaceWidths.heroTitle}>
            <Badge variant="accent" className="bg-surface-container-lowest text-primary">
              Async Operator Detail
            </Badge>
            <h1 className="mt-4 text-[2.1rem] font-semibold tracking-[-0.03em] text-on-surface sm:text-[2.5rem]">
              先看当前状态、进度和恢复姿态，再看 attempts 与 timeline
            </h1>
            <p className="mt-3 text-sm leading-7 text-on-surface-variant sm:text-base">
              这是 summary-first detail：先回答现在发生了什么、能不能恢复、最新做到哪一步，再进入历史轨迹。
            </p>
          </div>
          <Link
            href="/settings/labs/async-tasks"
            className="rounded-full bg-surface-container-lowest px-4 py-2 text-sm font-medium text-primary"
          >
            返回 operator 首页
          </Link>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <Card className="bg-surface-container-lowest p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-surface-container-low text-on-surface-variant">
                {detail.statusSummary.statusLabel}
              </Badge>
              <Badge className="bg-surface-container-low text-on-surface-variant">
                {detail.statusSummary.taskType}
              </Badge>
            </div>
            <h2 className="mt-3 text-[1.35rem] font-semibold text-on-surface">
              {detail.statusSummary.entityLabel ?? detail.statusSummary.taskId}
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              创建于 {new Date(detail.statusSummary.createdAt).toLocaleString()}，最近更新于 {new Date(detail.statusSummary.updatedAt).toLocaleString()}。
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoCard
                label="当前状态"
                body={`${detail.statusSummary.statusLabel} / enqueue ${detail.statusSummary.enqueueIntentStatus}`}
              />
              <InfoCard
                label="Progress Snapshot"
                body={detail.progressSnapshot?.stageLabelKey ?? detail.progressSnapshot?.stage ?? "暂无进度快照"}
                note={
                  detail.progressSnapshot?.updatedAt
                    ? `updated ${new Date(detail.progressSnapshot.updatedAt).toLocaleString()}`
                    : null
                }
              />
              <InfoCard
                label="Recovery Posture"
                body={detail.recoveryPosture?.posture ?? "当前没有 recovery posture"}
              />
              <InfoCard
                label="Retry Eligibility"
                body={detail.retryEligibility.reason ?? "当前没有恢复说明"}
              />
            </div>

            {detail.latestErrorCard ? (
              <Card className="mt-5 bg-[#fff1f2] p-4 text-[#b31b25]">
                <p className="text-xs uppercase tracking-[0.18em]">Latest Error</p>
                <p className="mt-2 text-sm leading-6">
                  {detail.latestErrorCard.reason}
                </p>
              </Card>
            ) : null}
          </Card>

          <Card className="bg-surface-container-lowest p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">
              Recovery
            </p>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              这里只给 detail summary 区一个显式入口：先确认“追加新 attempt + 写 recovery event”，再执行 operator retry。
            </p>
            <div className="mt-4">
              <AsyncTaskOperatorRetryAction
                taskId={detail.statusSummary.taskId}
                retryEligibility={detail.retryEligibility}
              />
            </div>
          </Card>
        </div>
      </section>

      <section className={teacherSurfaceRhythm.section}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-on-surface-variant">Attempts</p>
            <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">
              attempt groups
            </h2>
          </div>
          <Badge className="bg-surface-container-lowest text-on-surface-variant">当前 attempt 默认排在最前</Badge>
        </div>

        <div className="mt-5 grid gap-4">
          {detail.attemptGroups.map((group) => (
            <Card key={group.attemptNumber} className="bg-surface-container-lowest p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-surface-container-low text-on-surface-variant">
                  {group.title}
                </Badge>
                {group.status ? (
                  <Badge className="bg-surface-container-low text-on-surface-variant">
                    {group.status}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3">
                {group.events.map((event) => (
                  <div
                    key={event.id}
                    className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low px-4 py-4")}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-on-surface">{event.eventType}</p>
                        <p className="mt-1 text-sm leading-6 text-on-surface-variant">{event.status}</p>
                      </div>
                      <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                        {new Date(event.occurredAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className={teacherSurfaceRhythm.section}>
        <div>
          <p className="text-sm text-on-surface-variant">Timeline</p>
          <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">
            audit timeline
          </h2>
        </div>

        <div className="mt-5 grid gap-3">
          {detail.auditTimeline.map((event) => (
            <Card key={event.id} className="bg-surface-container-lowest p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-on-surface">{event.eventType}</p>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">{event.status}</p>
                </div>
                <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                  {new Date(event.occurredAt).toLocaleString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function InfoCard({
  label,
  body,
  note,
}: {
  label: string;
  body: string;
  note?: string | null;
}) {
  return (
    <Card className="bg-surface-container-low p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">{label}</p>
      <p className="mt-2 text-sm leading-6 text-on-surface">{body}</p>
      {note ? (
        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-on-surface-variant">{note}</p>
      ) : null}
    </Card>
  );
}
