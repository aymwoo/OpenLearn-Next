"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { runOperatorClassroomRecoveryAction } from "@/actions/operator-classroom-recovery-actions";
import { surfaceWidths } from "@/components/surfaces/surface-widths";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  ClassroomIncidentActionDTO,
  ClassroomIncidentOperatorDTO,
  ClassroomIncidentRelatedCardDTO,
} from "@/lib/dto/classroom-incident-operator";
import { cn } from "@/lib/utils";

export function ClassroomIncidentOperatorSurface({
  detail,
}: {
  detail: ClassroomIncidentOperatorDTO;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const runLightAction = (action: Extract<ClassroomIncidentActionDTO["action"], "retry" | "reconcile">) => {
    setError(null);
    startTransition(async () => {
      const result = await runOperatorClassroomRecoveryAction({
        classroomSessionId: detail.hero.classroomSessionId,
        action,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  };

  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-on-surface sm:px-6 lg:px-8">
      <div className={cn(surfaceWidths.workspace, teacherSurfaceRhythm.stack)}>
        <section className={teacherSurfaceRhythm.hero}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className={surfaceWidths.heroTitle}>
              <div className="flex flex-wrap gap-2">
                <Badge variant="accent" className="bg-surface-container-lowest text-primary">
                  查看课堂事件
                </Badge>
                <Badge className="bg-surface-container-lowest text-on-surface-variant">
                  {detail.hero.className}
                </Badge>
                <Badge className="bg-surface-container-lowest text-on-surface-variant">
                  {detail.hero.lessonVersionLabel}
                </Badge>
              </div>
              <h1 className="mt-4 text-[2.25rem] font-semibold tracking-[-0.03em] text-on-surface sm:text-[2.7rem]">
                这堂课现在发生了什么
              </h1>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant sm:text-base">
                先回答当前课堂状态、信任边界与下一步，再决定是否追加轻量恢复或下钻到 runtime / plugin / command / task 详情。
              </p>
            </div>

            <Card className="bg-surface-container-lowest p-5 sm:p-6 xl:max-w-[24rem]">
              <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">session identity</p>
              <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">
                {detail.hero.lessonTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                session {detail.hero.classroomSessionId} · status {detail.hero.sessionStatus}
              </p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                最近更新 {new Date(detail.hero.updatedAt).toLocaleString()}
              </p>
            </Card>
          </div>
        </section>

        <section className={teacherSurfaceRhythm.section}>
          <div>
            <p className="text-sm text-on-surface-variant">Summary metrics</p>
            <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">当前摘要</h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {detail.metrics.map((metric) => (
              <Card key={metric.key} className="bg-surface-container-lowest p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">{metric.label}</p>
                <p className="mt-3 text-lg font-semibold text-on-surface">{metric.value}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className={teacherSurfaceRhythm.section}>
          <div>
            <p className="text-sm text-on-surface-variant">Trust boundary</p>
            <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">honesty posture</h2>
          </div>
          <Card data-testid="incident-honesty-card" className="mt-5 bg-[#fff7ed] p-5 text-[#9a3412] sm:p-6">
            <div className="grid gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em]">仍可信什么 / 已不可信什么</p>
                <p className="mt-2 text-sm leading-7">{detail.honesty.trustedFacts}</p>
                <p className="mt-2 text-sm leading-7">{detail.honesty.untrustedFacts}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em]">影响范围</p>
                <p className="mt-2 text-sm leading-7">{detail.honesty.impactScope}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em]">推荐下一步</p>
                <p className="mt-2 text-sm leading-7">{detail.honesty.recommendedNextStep}</p>
                <Button asChild variant="secondary" className="mt-4 min-h-10 px-4 text-sm shadow-none">
                  <Link href={detail.honesty.nextStepHref}>查看任务详情</Link>
                </Button>
              </div>
            </div>
          </Card>
        </section>

        <section className={teacherSurfaceRhythm.section}>
          <div>
            <p className="text-sm text-on-surface-variant">Problem-first incidents</p>
            <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">当前问题</h2>
          </div>
          <div className="mt-5 grid gap-4">
            {detail.problemCards.map((card) => (
              <Card key={card.id} className="bg-surface-container-lowest p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-surface-container-low text-on-surface-variant">{card.posture}</Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-on-surface">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">{card.summary}</p>
                  </div>
                  <Button asChild variant="secondary" className="min-h-10 px-4 text-sm shadow-none">
                    <Link href={card.detailHref}>查看课堂事件</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className={teacherSurfaceRhythm.section}>
          <div>
            <p className="text-sm text-on-surface-variant">Related objects</p>
            <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">关联对象与下一跳</h2>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {detail.relatedCards.map((card) => (
              <RelatedObjectCard key={`${card.kind}-${card.id}`} card={card} />
            ))}
          </div>
        </section>

        <section className={teacherSurfaceRhythm.section}>
          <div>
            <p className="text-sm text-on-surface-variant">Light recovery only</p>
            <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">轻量恢复</h2>
          </div>

          <div className="mt-5 grid gap-4">
            <Card className="bg-surface-container-lowest p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                {detail.lightActions.map((action) => (
                  <div key={action.action} className="rounded-[var(--radius-card)] bg-surface-container-low p-4">
                    <p className="text-sm font-semibold text-on-surface">{action.label}</p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      {action.action === "retry"
                        ? "追加一次恢复尝试，并刷新当前 authoritative truth。"
                        : "重新对账当前状态，不改写历史 truth。"}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-4 min-h-10 px-4 text-sm shadow-none"
                      disabled={isPending || !action.enabled}
                      onClick={() => runLightAction(action.action as "retry" | "reconcile")}
                    >
                      {action.label}
                    </Button>
                  </div>
                ))}
              </div>

              {error ? (
                <p className="mt-4 rounded-[1rem] bg-error-container px-4 py-3 text-sm text-on-error-container">
                  {error}
                </p>
              ) : null}
            </Card>

            <Card className="bg-surface-container-lowest p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-3">
                {detail.guardedActions.map((action) => (
                  <div key={action.action} className="rounded-[var(--radius-card)] bg-surface-container-low p-4">
                    <p className="text-sm font-semibold text-on-surface">{action.label}</p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">{action.reason}</p>
                    <Button type="button" variant="secondary" className="mt-4 min-h-10 px-4 text-sm shadow-none" disabled>
                      {action.label}
                    </Button>
                    {action.nextStepHref ? (
                      <Button asChild variant="tertiary" className="mt-3 min-h-10 px-0 text-sm">
                        <Link href={action.nextStepHref}>改去详情确认</Link>
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

function RelatedObjectCard({ card }: { card: ClassroomIncidentRelatedCardDTO }) {
  const detailLabel = card.kind === "action" ? "查看动作详情" : card.kind === "task" ? "查看任务详情" : "继续下钻";

  return (
    <Card className="bg-surface-container-lowest p-5 sm:p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">{card.kind}</p>
      <h3 className="mt-2 text-lg font-semibold text-on-surface">{card.label}</h3>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{card.summary}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild variant="secondary" className="min-h-10 px-4 text-sm shadow-none">
          <Link href={card.href}>{detailLabel}</Link>
        </Button>
        {card.nextStepHref !== card.href ? (
          <Button asChild variant="tertiary" className="min-h-10 px-0 text-sm">
            <Link href={card.nextStepHref}>按推荐继续</Link>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
