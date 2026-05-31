"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import {
  approveScheduleAssistantProposalAction,
  rejectScheduleAssistantProposalAction,
} from "@/features/schedule/assistant/actions";
import type { ScheduleAssistantCenterDTO } from "@/features/schedule/shared/dto/assistant";
import { cn } from "@/lib/utils";

export function ScheduleAssistantSurface({ data }: { data: ScheduleAssistantCenterDTO }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function approveProposal(proposalId: string) {
    startTransition(async () => {
      const result = await approveScheduleAssistantProposalAction({ proposalId });
      if (!result.ok) {
        setFeedback({ tone: "error", message: result.message });
        return;
      }

      setFeedback({ tone: "success", message: "建议已采纳为草案，但还需要人工确认后才能真正变更课表。" });
      router.refresh();
    });
  }

  function rejectProposal(proposalId: string) {
    startTransition(async () => {
      const result = await rejectScheduleAssistantProposalAction({ proposalId });
      if (!result.ok) {
        setFeedback({ tone: "error", message: result.message });
        return;
      }

      setFeedback({ tone: "success", message: "建议已标记为拒绝，并保留审计记录。" });
      router.refresh();
    });
  }

  return (
    <div className={teacherSurfaceRhythm.stack}>
      <section className={teacherSurfaceRhythm.hero}>
        <Badge variant="accent">AI 日程助手</Badge>
        <h1 className="mt-3 text-[2.35rem] font-semibold tracking-[-0.03em] text-on-surface">只给建议，不自动执行</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-on-surface-variant sm:text-base">
          AI 助手只负责导入映射建议、冲突解释和单次调课建议。所有运行时写入仍然必须走人工确认路径。
        </p>
      </section>

      {feedback ? (
        <section className={cn(teacherSurfaceRhythm.section, feedback.tone === "success" ? "bg-tertiary-container/60 text-tertiary" : "bg-error-container text-on-error-container")}>{feedback.message}</section>
      ) : null}

      <section className={teacherSurfaceRhythm.section}>
        <div className="space-y-4">
          {data.proposals.length > 0 ? (
            data.proposals.map((proposal) => (
              <article key={proposal.id} className={cn(teacherSurfaceRhythm.cardInset, "space-y-4 p-5")}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[1.2rem] font-semibold text-on-surface">{proposal.title}</p>
                    <p className="mt-2 text-sm leading-7 text-on-surface-variant">{proposal.reason}</p>
                  </div>
                  <Badge>{proposal.status}</Badge>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low p-4")}>
                    <p className="text-sm font-semibold text-on-surface">影响范围</p>
                    <p className="mt-2 text-sm leading-7 text-on-surface-variant">{proposal.impactScope.join("、") || "暂无影响范围说明"}</p>
                  </div>
                  <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low p-4")}>
                    <p className="text-sm font-semibold text-on-surface">需要人工确认的字段</p>
                    <p className="mt-2 text-sm leading-7 text-on-surface-variant">{proposal.fieldsRequiringConfirmation.join("、") || "暂无额外确认字段"}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button disabled={isPending} variant="secondary">查看建议</Button>
                  <Button disabled={isPending} onClick={() => approveProposal(proposal.id)}>采纳为草案</Button>
                  <Button disabled={isPending} variant="tertiary" onClick={() => rejectProposal(proposal.id)}>去人工确认</Button>
                </div>
              </article>
            ))
          ) : (
            <div className={cn(teacherSurfaceRhythm.cardInset, "p-6 text-sm leading-7 text-on-surface-variant")}>
              还没有可审阅的 AI 建议。后续导入映射、冲突解释和调课建议会以 proposal 形式出现在这里。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
