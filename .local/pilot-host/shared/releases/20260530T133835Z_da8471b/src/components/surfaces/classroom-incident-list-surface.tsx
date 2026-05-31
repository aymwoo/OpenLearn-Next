import Link from "next/link";

import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ClassroomIncidentListDTO } from "@/lib/dto/classroom-incident-list";
import { cn } from "@/lib/utils";

type IncidentNextHop = {
  title: string;
  description: string;
  href: string;
};

const defaultNextHops: IncidentNextHop[] = [
  {
    title: "Runtime Inspector",
    description: "查看 transport、runtime session 与当前降级边界。",
    href: "/settings/labs/runtime-inspector",
  },
  {
    title: "Async Operator",
    description: "查看 worker backlog、问题任务与恢复尝试。",
    href: "/settings/labs/async-tasks",
  },
  {
    title: "Plugin Governance",
    description: "查看插件治理姿态、阻断原因与推荐恢复入口。",
    href: "/settings/plugins",
  },
];

function formatPosture(posture: ClassroomIncidentListDTO["rows"][number]["posture"]) {
  return posture;
}

function formatImpactScope(scope: ClassroomIncidentListDTO["rows"][number]["impactScope"]) {
  return scope.replaceAll("_", " ");
}

function formatUpdatedAt(updatedAt: string) {
  return new Date(updatedAt).toLocaleString();
}

function getPostureSummary(rows: ClassroomIncidentListDTO["rows"]) {
  if (rows.some((row) => row.posture === "failed" || row.posture === "blocked")) {
    return "当前存在需要 operator 立即介入的课堂事件。先定位受影响课堂，再继续下钻到 runtime、task 或插件治理详情。";
  }

  if (rows.some((row) => row.posture === "degraded")) {
    return "当前有课堂仍可继续，但已经进入 degraded posture。请先确认 trust boundary，再决定是否追加恢复动作。";
  }

  return "当前课堂、插件与异步链路保持可继续状态。若要主动巡检，请进入 Runtime Inspector 或 Async Operator。";
}

export function ClassroomIncidentListSurface({
  list,
  error = null,
  nextHops = defaultNextHops,
}: {
  list: ClassroomIncidentListDTO | null;
  error?: string | null;
  nextHops?: IncidentNextHop[];
}) {
  const rows = list?.rows ?? [];
  const hasRows = rows.length > 0;

  return (
    <div className={teacherSurfaceRhythm.stack}>
      <Card className="bg-surface-container-low p-5 sm:p-6">
        <p className="text-sm text-on-surface-variant">当前 posture summary</p>
        <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">先看课堂事件，再决定下一跳</h2>
        <p className="mt-3 text-sm leading-7 text-on-surface-variant">
          {error
            ? "当前无法加载课堂事件关联真相。请先刷新页面；若仍失败，改从 Runtime Inspector、Async Operator 或插件治理详情继续排查。"
            : hasRows
              ? getPostureSummary(rows)
              : "当前课堂、插件与异步链路保持可继续状态。若要主动巡检，请进入 Runtime Inspector 或 Async Operator。"}
        </p>
      </Card>

      {error ? (
        <Card className="bg-error-container p-5 text-on-error-container sm:p-6">
          <p className="text-[1.35rem] font-semibold">当前无法加载课堂事件关联真相</p>
          <p className="mt-3 text-sm leading-7">
            当前无法加载课堂事件关联真相。请先刷新页面；若仍失败，改从 Runtime Inspector、Async Operator 或插件治理详情继续排查。
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] opacity-80">error: {error}</p>
        </Card>
      ) : hasRows ? (
        <div className="grid gap-4">
          {rows.map((row) => (
            <Card
              key={row.classroomSessionId}
              data-testid={`incident-card-${row.classroomSessionId}`}
              className="bg-surface-container-lowest p-5 sm:p-6"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-surface-container-low text-on-surface-variant">
                      {row.className}
                    </Badge>
                    <Badge className="bg-surface-container-low text-on-surface-variant">
                      {formatPosture(row.posture)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-on-surface">{row.lessonTitle}</p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">{row.summary}</p>
                  </div>
                  <div className="grid gap-2 text-sm leading-6 text-on-surface-variant sm:grid-cols-2">
                    <p>
                      <span className="font-medium text-on-surface">影响范围：</span>
                      {formatImpactScope(row.impactScope)}
                    </p>
                    <p>
                      <span className="font-medium text-on-surface">最后更新时间：</span>
                      {formatUpdatedAt(row.updatedAt)}
                    </p>
                  </div>
                  {row.relationChips.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {row.relationChips.slice(0, 2).map((chip) => (
                        <Link
                          key={`${row.classroomSessionId}-${chip.kind}-${chip.href}`}
                          href={chip.href}
                          data-testid={`incident-chip-${chip.kind}`}
                          className={cn(
                            teacherSurfaceRhythm.card,
                            "bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant transition hover:bg-surface-container-low/80",
                          )}
                        >
                          {chip.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="xl:shrink-0">
                  <Button asChild className="min-h-14 px-5 text-base">
                    <Link href={row.detailHref}>查看课堂事件</Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-surface-container-lowest p-5 sm:p-6">
          <p className="text-[1.35rem] font-semibold text-on-surface">当前没有需要 operator 介入的课堂事件</p>
          <p className="mt-3 text-sm leading-7 text-on-surface-variant">
            当前课堂、插件与异步链路保持可继续状态。若要主动巡检，请进入 Runtime Inspector 或 Async Operator。
          </p>
        </Card>
      )}

      <section className={teacherSurfaceRhythm.section}>
        <div>
          <p className="text-sm text-on-surface-variant">Tool next hops</p>
          <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">继续下钻到正式 operator surfaces</h2>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {nextHops.map((nextHop) => (
            <Card key={nextHop.title} className="bg-surface-container-lowest p-5 sm:p-6">
              <p className="text-lg font-semibold text-on-surface">{nextHop.title}</p>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">{nextHop.description}</p>
              <Button asChild variant="secondary" className="mt-4 min-h-10 px-4 text-sm shadow-none">
                <Link href={nextHop.href}>{nextHop.title}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
