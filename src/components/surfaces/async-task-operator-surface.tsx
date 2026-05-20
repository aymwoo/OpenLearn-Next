import Link from "next/link";

import { AlertTriangle, Clock3, ServerCog, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { surfaceWidths } from "@/components/surfaces/surface-widths";
import type { AsyncTaskOperatorOverviewDTO } from "@/lib/dto/async-task-operator";
import { cn } from "@/lib/utils";

export function AsyncTaskOperatorSurface({
  overview,
}: {
  overview: AsyncTaskOperatorOverviewDTO;
}) {
  return (
    <div className={cn(surfaceWidths.workspace, teacherSurfaceRhythm.stack, "p-4 sm:p-5 lg:p-6")}>
      <section className={teacherSurfaceRhythm.hero}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className={surfaceWidths.heroTitle}>
            <Badge variant="accent" className="bg-surface-container-lowest text-primary">
              Async Operator
            </Badge>
            <h1 className="mt-4 text-[2.25rem] font-semibold tracking-[-0.03em] text-on-surface sm:text-[2.7rem]">
              先判断平台是否健康，再进入问题任务
            </h1>
            <p className="mt-3 max-w-[44rem] text-sm leading-7 text-on-surface-variant sm:text-base">
              这里优先展示 worker、queue、backlog 与问题任务，不直接暴露 BullMQ UI。summary-first，方便 operator 先判断平台态，再下钻单任务恢复。
            </p>
          </div>

          <Card className="bg-surface-container-lowest p-5 sm:p-6 xl:max-w-[24rem]">
            <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">
              backlog posture
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Badge className="bg-surface-container-low text-on-surface-variant">
                {overview.platformHealth.backlog.level}
              </Badge>
              <span className="text-sm text-on-surface-variant">
                {overview.platformHealth.backlog.reason}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              仍可信什么：{overview.platformHealth.backlog.trustedFacts}
            </p>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<ServerCog className="size-4" />}
            label="Worker"
            value={overview.platformHealth.workerState}
            note={`heartbeat ${overview.platformHealth.workerHeartbeats.length} 个实例`}
          />
          <MetricCard
            icon={<Workflow className="size-4" />}
            label="Queue"
            value={overview.platformHealth.queueEventsState}
            note={`prefix ${overview.platformHealth.prefix}`}
          />
          <MetricCard
            icon={<Clock3 className="size-4" />}
            label="Backlog"
            value={`${overview.platformHealth.backlog.queuedCount + overview.platformHealth.backlog.retryingCount}`}
            note={`queued ${overview.platformHealth.backlog.queuedCount} / retrying ${overview.platformHealth.backlog.retryingCount}`}
          />
          <MetricCard
            icon={<AlertTriangle className="size-4" />}
            label="Problem Tasks"
            value={`${overview.problemTasks.length}`}
            note={overview.emptyState ?? "优先看 failed / stalled recovery / retrying 超时 / dispatch failed"}
          />
        </div>

        {overview.platformHealth.backlog.level !== "healthy" ? (
          <Card className="mt-6 bg-[#fff7ed] p-5 text-[#9a3412] sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em]">degraded</p>
            <h2 className="mt-2 text-[1.1rem] font-semibold">当前不能把 operator 首页当作“完全健康”</h2>
            <p className="mt-2 text-sm leading-6">
              当前不能信任什么：{overview.platformHealth.backlog.caution}
            </p>
            <p className="mt-2 text-sm leading-6">
              仍可信什么：{overview.platformHealth.backlog.trustedFacts}
            </p>
            <p className="mt-2 text-sm leading-6">
              下一步去哪里排查：{overview.platformHealth.backlog.nextStep}
            </p>
          </Card>
        ) : null}
      </section>

      <section className={teacherSurfaceRhythm.section}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-on-surface-variant">问题任务</p>
            <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">
              失败、恢复中与未成功入队的任务
            </h2>
          </div>
          <Badge className="bg-surface-container-lowest text-on-surface-variant">不是 table-heavy 布局</Badge>
        </div>

        <div className="mt-5 grid gap-4">
          {overview.problemTasks.map((task) => (
            <Card key={task.taskId} className="bg-surface-container-lowest p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-surface-container-low text-on-surface-variant">
                      {task.statusLabel}
                    </Badge>
                    <Badge className="bg-surface-container-low text-on-surface-variant">
                      {task.taskType}
                    </Badge>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-on-surface">
                    {task.entityLabel ?? task.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {task.reason}
                  </p>
                  {task.latestError ? (
                    <p className="mt-2 text-sm leading-6 text-[#b31b25]">
                      latest error: {task.latestError}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                    更新时间 {new Date(task.updatedAt).toLocaleString()}
                  </p>
                  <Button asChild variant="secondary" className="min-h-10 px-4 text-sm shadow-none">
                    <Link href={task.detailHref}>查看任务详情</Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {overview.problemTasks.length === 0 ? (
            <Card className="bg-surface-container-lowest p-5 text-sm leading-6 text-on-surface-variant sm:p-6">
              {overview.emptyState}
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="bg-surface-container-lowest p-5">
      <div className="flex items-center gap-2 text-on-surface-variant">
        {icon}
        <p className="text-xs uppercase tracking-[0.18em]">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold text-on-surface">{value}</p>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{note}</p>
    </Card>
  );
}
