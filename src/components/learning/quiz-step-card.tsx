"use client";

import { useMemo, useState, useTransition } from "react";

import { submitQuizAttemptAction } from "@/actions/learning-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LearningStepDTO, QuizAttemptDTO } from "@/lib/dto/learning";

type QuizStepCardProps = {
  lessonId: string;
  publishedVersionId: string;
  step: LearningStepDTO;
  latestAttempt?: QuizAttemptDTO | null;
  attempts: QuizAttemptDTO[];
  canRetryQuiz: boolean;
  showCorrectAnswer: boolean;
};

type QuizOutcome = {
  isCorrect?: boolean | null;
  selectedIndex?: number | null;
  correctOptionIndex?: number | null;
  explanation?: string | null;
};

function getSelectedIndex(attempt?: QuizAttemptDTO | null) {
  const answer = attempt?.answer as { selectedIndex?: number } | number | undefined;

  return typeof answer === "number" ? answer : answer?.selectedIndex;
}

function getOutcome(attempt?: QuizAttemptDTO | null): QuizOutcome {
  return (attempt?.outcome ?? {}) as QuizOutcome;
}

export function QuizStepCard({ lessonId, publishedVersionId, step, latestAttempt, attempts, canRetryQuiz, showCorrectAnswer }: QuizStepCardProps) {
  const payload = step.payload as { question?: string; options?: string[]; explanation?: string };
  const [selectedIndex, setSelectedIndex] = useState<number | null>(getSelectedIndex(latestAttempt) ?? null);
  const [status, setStatus] = useState<string | null>(latestAttempt ? "已记录你的答案" : null);
  const [isPending, startTransition] = useTransition();
  const outcome = getOutcome(latestAttempt);
  const options = payload.options ?? [];
  const orderedAttempts = useMemo(() => [...attempts].sort((a, b) => a.attemptNo - b.attemptNo), [attempts]);
  const canSubmit = selectedIndex !== null && (!latestAttempt || canRetryQuiz);

  function submit() {
    if (selectedIndex === null) return;

    startTransition(async () => {
      const result = await submitQuizAttemptAction({
        publishedVersionId,
        lessonId,
        stepId: step.id,
        answer: { selectedIndex },
      });

      if (result.ok) {
        setStatus("已记录你的答案");
      } else {
        setStatus(result.message || "提交暂时失败，请保留当前选择后重试。");
      }
    });
  }

  return (
    <section className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-low p-5 sm:p-8">
      <Badge variant="accent" className="mb-3 bg-surface-container-lowest">测验步骤</Badge>
      <h3 className="text-2xl font-semibold">{payload.question ?? step.title}</h3>

      <div className="mt-6 grid gap-3">
        {options.map((option, index) => {
          const active = selectedIndex === index;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`min-h-11 rounded-3xl px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-primary ${active ? "bg-surface-container-lowest text-primary shadow-ambient" : "bg-surface-container-lowest/70 text-on-surface"}`}
            >
              {String.fromCharCode(65 + index)}. {option}{active ? " · 已选择" : ""}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={submit} disabled={isPending || !canSubmit}>{isPending ? "正在提交..." : "提交答案"}</Button>
        {canRetryQuiz ? <Button type="button" variant="secondary" onClick={() => setStatus(null)}>再试一次</Button> : null}
      </div>

      {status ? <p className="mt-4 text-sm leading-6 text-primary">{status}</p> : null}
      {latestAttempt ? (
        <div className="mt-6 rounded-3xl bg-surface-container-lowest p-5 shadow-ambient">
          <p className="font-semibold">{outcome.isCorrect === true ? "答对了" : outcome.isCorrect === false ? "还可以再想想" : "已记录你的答案"}</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">第 {latestAttempt.attemptNo} 次尝试 · 已提交，系统已记录本次作答结果</p>
          {showCorrectAnswer && latestAttempt.showCorrectAnswer ? (
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">正确答案：{typeof outcome.correctOptionIndex === "number" ? options[outcome.correctOptionIndex] : "由老师讲解"}。{outcome.explanation ?? payload.explanation ?? ""}</p>
          ) : null}
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">{latestAttempt.feedback?.body ?? "老师还没有留下反馈"}</p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3">
        {orderedAttempts.map((attempt) => (
          <article key={attempt.id} className="rounded-3xl bg-surface-container-lowest p-4">
            <p className="font-semibold">第 {attempt.attemptNo} 次尝试{attempt.isLatest ? " · 最新" : ""}</p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">已记录你的答案</p>
          </article>
        ))}
      </div>
    </section>
  );
}
