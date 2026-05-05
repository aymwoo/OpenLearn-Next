"use client";

import { useMemo, useState, useTransition } from "react";

import { submitTaskAttemptAction } from "@/actions/learning-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LearningStepDTO, TaskAttemptDTO } from "@/lib/dto/learning";

type TaskStepCardProps = {
  lessonId: string;
  publishedVersionId: string;
  step: LearningStepDTO;
  latestAttempt?: TaskAttemptDTO | null;
  attempts: TaskAttemptDTO[];
};

function getAttemptText(attempt: TaskAttemptDTO) {
  const payload = attempt.payload as { text?: string; answer?: string; body?: string } | string | null;

  if (typeof payload === "string") return payload;
  return payload?.text ?? payload?.answer ?? payload?.body ?? "已提交任务内容";
}

function formatAttemptTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function TaskStepCard({ lessonId, publishedVersionId, step, latestAttempt, attempts }: TaskStepCardProps) {
  const payload = step.payload as { prompt?: string; successCriteria?: string; submissionType?: string };
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const orderedAttempts = useMemo(() => [...attempts].sort((a, b) => a.attemptNo - b.attemptNo), [attempts]);

  function submit() {
    startTransition(async () => {
      const result = await submitTaskAttemptAction({
        publishedVersionId,
        lessonId,
        stepId: step.id,
        payload: { text: draft },
      });

      if (result.ok) {
        setStatus("已提交，本次尝试已记录");
        setDraft("");
      } else {
        setStatus(result.message || "提交暂时失败，请保留当前内容后重试。");
      }
    });
  }

  return (
    <section className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-low p-5 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge variant="accent" className="mb-3 bg-surface-container-lowest">任务步骤</Badge>
          <h3 className="text-2xl font-semibold">{step.title}</h3>
          <p className="mt-4 leading-8 text-on-surface-variant">{payload.prompt ?? "请根据课堂要求完成任务。"}</p>
          {payload.successCriteria ? <p className="mt-3 text-sm leading-6 text-on-surface-variant">要求：{payload.successCriteria}</p> : null}
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-surface-container-lowest p-5 shadow-ambient">
        <p className="font-semibold">最近一次尝试</p>
        {latestAttempt ? (
          <div className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
            <p><span className="text-primary">最新</span> · 第 {latestAttempt.attemptNo} 次尝试 · {formatAttemptTime(latestAttempt.createdAt)}</p>
            <p>{getAttemptText(latestAttempt)}</p>
            <p>{latestAttempt.feedback?.body ?? "老师还没有留下反馈"}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">还没有提交任务</p>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <label htmlFor={`task-draft-${step.id}`} className="block text-sm text-on-surface-variant">你的任务回答</label>
        <textarea
          id={`task-draft-${step.id}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-32 w-full rounded-3xl bg-surface-container-low p-4 text-base leading-7 text-on-surface outline-none transition focus:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-primary"
        />
        <p className="text-sm leading-6 text-on-surface-variant">提交后会保留为一次新的尝试记录</p>
        {status ? <p className="text-sm leading-6 text-primary">{status}</p> : null}
        <Button type="button" onClick={submit} disabled={isPending || draft.trim().length === 0}>
          {isPending ? "正在提交..." : "提交任务"}
        </Button>
      </div>

      <div className="mt-6 grid gap-3">
        {orderedAttempts.map((attempt) => (
          <article key={attempt.id} className="rounded-3xl bg-surface-container-lowest p-4">
            <p className="font-semibold">第 {attempt.attemptNo} 次尝试{attempt.isLatest ? " · 最新" : ""}</p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{getAttemptText(attempt)}</p>
          </article>
        ))}
        {orderedAttempts.length === 0 ? <p className="rounded-3xl bg-surface-container-lowest p-4 text-sm text-on-surface-variant">第 1 次尝试会在提交后出现在这里。</p> : null}
      </div>
    </section>
  );
}
