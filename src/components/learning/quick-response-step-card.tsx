"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { submitStudentQuickResponseAction } from "@/actions/classroom-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LearningStepDTO, StudentQuickResponseAttemptDTO } from "@/lib/dto/learning";

type QuickResponseStepCardProps = {
  lessonId: string;
  sessionId: string;
  step: LearningStepDTO;
  latestResponse?: StudentQuickResponseAttemptDTO | null;
  history: StudentQuickResponseAttemptDTO[];
};

function formatResponseTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function QuickResponseStepCard({
  lessonId,
  sessionId,
  step,
  latestResponse,
  history,
}: QuickResponseStepCardProps) {
  const router = useRouter();
  const payload = step.payload as {
    prompt?: string;
    teachingDesign?: {
      evidenceExpectation?: {
        prompt?: string;
      };
    };
  };
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const orderedHistory = useMemo(() => [...history].sort((a, b) => a.attemptNo - b.attemptNo), [history]);
  const prompt = payload.teachingDesign?.evidenceExpectation?.prompt ?? payload.prompt ?? "请写下你此刻的课堂回应。";

  function submit() {
    startTransition(async () => {
      const result = await submitStudentQuickResponseAction({
        sessionId,
        lessonId,
        stepId: step.id,
        body: draft,
      });

      if (result.ok) {
        setStatus("已记录为新的课堂回应");
        setDraft("");
        router.refresh();
      } else {
        setStatus(result.message || "课堂回应暂时没有提交成功，请保留当前内容后重试。");
      }
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <Badge variant="accent" className="mb-3 bg-surface-container-lowest">
          课堂快回应
        </Badge>
        <p className="leading-8 text-on-surface-variant">{prompt}</p>
      </div>

      <div className="space-y-3">
        <label htmlFor={`quick-response-${step.id}`} className="block text-sm font-semibold text-on-surface-variant">
          课堂回应内容
        </label>
        <textarea
          id={`quick-response-${step.id}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-28 w-full rounded-3xl bg-surface-container-low p-4 text-base leading-7 text-on-surface outline-none transition focus:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-primary"
        />
        <p className="text-sm leading-6 text-on-surface-variant">格式提示：用 1-2 句话写下你的理解、结论或当前观察。</p>
        <p className="text-sm leading-6 text-on-surface-variant">提交后会作为一次新的课堂记录保存</p>
        {status ? <p className="text-sm leading-6 text-primary">{status}</p> : null}
        <Button type="button" onClick={submit} disabled={isPending || draft.trim().length === 0}>
          {isPending ? "正在提交..." : "提交课堂回应"}
        </Button>
      </div>

      <div className="rounded-3xl bg-surface-container-lowest p-5 shadow-ambient">
        <p className="font-semibold">最新回应</p>
        {latestResponse ? (
          <div className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
            <p>
              第 {latestResponse.attemptNo} 次回应 · {formatResponseTime(latestResponse.createdAt)}
            </p>
            <p>{latestResponse.body}</p>
            <p>{latestResponse.successMessage}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">还没有记录课堂回应</p>
        )}
      </div>

      <div className="grid gap-3">
        <p className="text-sm font-semibold text-on-surface-variant">回应历史</p>
        {orderedHistory.length > 0 ? (
          orderedHistory.map((attempt) => (
            <article key={attempt.id} className="rounded-3xl bg-surface-container-lowest p-4">
              <p className="font-semibold">第 {attempt.attemptNo} 次回应{attempt.id === latestResponse?.id ? " · 最新回应" : ""}</p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{attempt.body}</p>
            </article>
          ))
        ) : (
          <p className="rounded-3xl bg-surface-container-lowest p-4 text-sm text-on-surface-variant">第 1 次回应会在提交后出现在这里。</p>
        )}
      </div>
    </section>
  );
}
