import type { ReactNode } from "react";

import { Activity, ArrowRight, ShieldCheck, Signal, TimerReset } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { surfaceWidths } from "@/components/surfaces/surface-widths";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import type { RuntimeInspectorDTO } from "@/lib/dto/runtime-inspector";
import { cn } from "@/lib/utils";

export function RuntimeInspectorSurface({ inspector }: { inspector: RuntimeInspectorDTO }) {
  if (inspector.emptyState) {
    return (
      <div className={cn(surfaceWidths.workspace, teacherSurfaceRhythm.stack, "p-4 sm:p-5 lg:p-6")}>
        <section className={teacherSurfaceRhythm.hero}>
          <Badge variant="accent" className="bg-surface-container-lowest text-primary">
            Runtime Inspector
          </Badge>
          <h1 className="mt-4 text-[2.25rem] font-semibold tracking-[-0.03em] text-on-surface sm:text-[2.7rem]">
            当前范围内暂无可排查的 runtime session
          </h1>
          <p className="mt-3 text-sm leading-7 text-on-surface-variant sm:text-base">{inspector.emptyState}</p>
        </section>
      </div>
    );
  }

  return (
    <div className={cn(surfaceWidths.workspace, teacherSurfaceRhythm.stack, "p-4 sm:p-5 lg:p-6")}>
      <section className={teacherSurfaceRhythm.hero}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,22rem)] xl:items-start">
          <div className={surfaceWidths.heroTitle}>
            <Badge variant="accent" className="bg-surface-container-lowest text-primary">
              Runtime Inspector
            </Badge>
            <h1 className="mt-4 text-[2.25rem] font-semibold tracking-[-0.03em] text-on-surface sm:text-[2.7rem]">
              当前 proof 会话与统一运行轨迹
            </h1>
            <p className="mt-3 text-sm leading-7 text-on-surface-variant sm:text-base">
              查看本次运行轨迹，沿时间线排查治理、传输与消费状态；不切换 tabs，也不回退到额外 dashboard。
            </p>
          </div>

          <Card className="bg-surface-container-lowest p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">当前 proof 会话</p>
            <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">
              {inspector.selectedSession?.runtimeId}
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              runtime session: {inspector.selectedRuntimeSessionId} · role: {inspector.scopeRole}
            </p>
          </Card>
        </div>

        {inspector.health ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<Activity className="size-4" />} label="Lifecycle" value={inspector.health.lifecycleState} />
            <MetricCard icon={<ShieldCheck className="size-4" />} label="Governance" value={inspector.health.governanceDecision} />
            <MetricCard icon={<Signal className="size-4" />} label="Transport" value={inspector.health.transportAttemptStatus} />
            <MetricCard icon={<TimerReset className="size-4" />} label="Consumer" value={inspector.health.consumerTraceStatus} />
          </div>
        ) : null}

        {inspector.health?.degraded ? (
          <Card className="mt-6 bg-[#fff7ed] p-5 text-[#9a3412] sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em]">Redis degraded</p>
            <h2 className="mt-2 text-[1.15rem] font-semibold">跨实例 fanout 当前未完全健康</h2>
            <p className="mt-2 text-sm leading-6">
              当前 transport topology：{inspector.health.transportTopology}。
              {inspector.health.degradedReason ? ` 原因：${inspector.health.degradedReason}` : " 当前仅能确认本实例 fallback 仍在工作。"}
            </p>
          </Card>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="bg-surface-container-lowest p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">可见 runtime sessions</p>
          <div className="mt-4 grid gap-3">
            {inspector.sessionOptions.map((session) => {
              const active = session.runtimeSessionId === inspector.selectedRuntimeSessionId;
              return (
                <div
                  key={session.runtimeSessionId}
                  className={cn(
                    teacherSurfaceRhythm.card,
                    "bg-surface-container-low p-4",
                    active && "bg-surface-container-lowest shadow-ambient",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{session.runtimeId}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                        {session.runtimeVersion} · {session.actorScope}
                      </p>
                    </div>
                    {active ? <Badge className="bg-primary text-white">当前</Badge> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="bg-surface-container-lowest p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Unified timeline</p>
              <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">单条时间线</h2>
            </div>
            <Badge className="bg-surface-container-low text-on-surface-variant">不分 tabs</Badge>
          </div>

          <div className="mt-5 grid gap-3">
            {inspector.timeline.map((item) => (
              <article key={item.id} className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low p-4")}> 
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-surface-container-lowest text-on-surface-variant">{item.lane}</Badge>
                      {item.status ? <Badge className="bg-surface-container-lowest text-on-surface-variant">{item.status}</Badge> : null}
                      {item.decision ? <Badge className="bg-surface-container-lowest text-on-surface-variant">{item.decision}</Badge> : null}
                      {item.transportTopology ? <Badge className="bg-surface-container-lowest text-on-surface-variant">{item.transportTopology}</Badge> : null}
                      {item.receivedVia ? <Badge className="bg-surface-container-lowest text-on-surface-variant">{item.receivedVia}</Badge> : null}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-on-surface">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">{item.detail}</p>
                  </div>
                  <div className="text-right text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                    <p>{new Date(item.occurredAt).toLocaleString()}</p>
                    {item.correlationId ? <p className="mt-2 break-all">{item.correlationId}</p> : <ArrowRight className="ml-auto mt-2 size-4" />}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card className="bg-surface-container-lowest p-5">
      <div className="flex items-center gap-2 text-on-surface-variant">
        {icon}
        <p className="text-xs uppercase tracking-[0.18em]">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold text-on-surface">{value}</p>
    </Card>
  );
}
