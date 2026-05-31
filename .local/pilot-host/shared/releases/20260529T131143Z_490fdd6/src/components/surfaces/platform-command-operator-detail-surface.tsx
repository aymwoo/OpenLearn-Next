"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";

import { runOperatorPostureRecoveryAction } from "@/actions/operator-posture-recovery-actions";
import type { PlatformCommandOperatorDetailDTO } from "@/features/platform-core/observability/dto";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [selectedRecoveryAction, setSelectedRecoveryAction] = useState<
    "resume" | "suspend" | "fallback" | null
  >(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
  const highRiskEnabled = command.status !== "running" && Boolean(command.pluginId);
  const highRiskReason = !command.pluginId
    ? "当前 command 缺少稳定 plugin scope，无法执行姿态恢复。"
    : command.status === "running"
      ? "当前 command 仍在执行中，需等待稳定结果后再做高风险姿态变更。"
      : null;
  const recoveryReason = command.failureAttribution?.reasonCode ?? "operator_recovery";

  const recoveryCopy = useMemo(() => {
    if (!selectedRecoveryAction) {
      return null;
    }

    switch (selectedRecoveryAction) {
      case "resume":
        return {
          title: "恢复运行姿态",
          impact: "会让当前 plugin 回到可执行姿态，并刷新当前命令 detail 与 operator 列表。",
          posture: "姿态变化：从受限 / 挂起 posture 回到 enabled。",
          audit: `将写入的审计记录：plugin.resume command、delegation / approval 摘要与 timeline event。`,
        };
      case "suspend":
        return {
          title: "暂停当前姿态",
          impact: "会立即收紧当前 plugin 的运行姿态，阻止继续放大异常影响。",
          posture: "姿态变化：切换到 suspended。",
          audit: "将写入的审计记录：plugin.suspend command、delegation / approval 摘要与 timeline event。",
        };
      case "fallback":
        return {
          title: "切换到降级姿态",
          impact: "会打开 kill switch，让 operator 改走降级路径继续观察系统状态。",
          posture: "姿态变化：切换到 fallback / kill-switch posture。",
          audit: "将写入的审计记录：plugin.kill_switch.set command、delegation / approval 摘要与 timeline event。",
        };
    }
  }, [selectedRecoveryAction]);

  const submitHighRiskAction = (action: "resume" | "suspend" | "fallback") => {
    if (!command.pluginId || !highRiskEnabled) {
      return;
    }

    const pluginId = command.pluginId;

    setInlineError(null);
    startTransition(async () => {
      const result = await runOperatorPostureRecoveryAction({
        scope: "plugin",
        pluginId,
        schoolId: command.schoolId,
        recoveryAction: action,
        reason: action === "resume" ? recoveryReason : action === "suspend" ? "operator_suspend" : "operator_fallback",
        revalidatePaths: [
          `/settings/labs/commands/${command.commandId}`,
          "/settings/labs",
        ],
      });

      if (!result.success) {
        setInlineError(result.error);
        return;
      }

      setSelectedRecoveryAction(null);
    });
  };

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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-on-surface-variant">Recovery Actions</p>
            <h2 className="mt-2 text-2xl font-semibold text-on-surface">detail-view 强确认</h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              resume / suspend / fallback 只允许在 detail view 内确认；若当前上下文不安全，则保留 disabled + reason。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={!highRiskEnabled || isPending}
              onClick={() => setSelectedRecoveryAction("resume")}
            >
              恢复运行姿态
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!highRiskEnabled || isPending}
              onClick={() => setSelectedRecoveryAction("suspend")}
            >
              暂停当前姿态
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!highRiskEnabled || isPending}
              onClick={() => setSelectedRecoveryAction("fallback")}
            >
              切换到降级姿态
            </Button>
          </div>
        </div>

        {highRiskReason ? (
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">{highRiskReason}</p>
        ) : null}

        {recoveryCopy ? (
          <div className="mt-5 rounded-[1.25rem] bg-surface-container-lowest p-4 shadow-ambient">
            <h3 className="text-lg font-semibold text-on-surface">{recoveryCopy.title}</h3>
            <div className="mt-4 grid gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">影响范围</p>
                <p className="mt-2 text-sm leading-6 text-on-surface">{recoveryCopy.impact}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">姿态变化</p>
                <p className="mt-2 text-sm leading-6 text-on-surface">{recoveryCopy.posture}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">将写入的审计记录</p>
                <p className="mt-2 text-sm leading-6 text-on-surface">{recoveryCopy.audit}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => {
                  if (selectedRecoveryAction) {
                    submitHighRiskAction(selectedRecoveryAction);
                  }
                }}
                disabled={isPending || !highRiskEnabled}
              >
                {`确认${recoveryCopy.title}`}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setSelectedRecoveryAction(null)}>
                取消
              </Button>
            </div>
          </div>
        ) : null}

        {inlineError ? (
          <p className="mt-3 rounded-[1rem] bg-error-container px-3 py-3 text-sm text-on-error-container">
            {inlineError}
          </p>
        ) : null}
      </Card>

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
