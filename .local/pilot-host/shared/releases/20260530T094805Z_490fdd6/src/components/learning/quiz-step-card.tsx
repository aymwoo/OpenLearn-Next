"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { submitQuizAttemptAction } from "@/actions/learning-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LearningStepDTO, QuizAttemptDTO } from "@/lib/dto/learning";
import type { ClassroomVotingFrozenContract } from "@/lib/dto/lesson-authoring";

type QuizStepCardProps = {
  lessonId: string;
  publishedVersionId: string;
  step: LearningStepDTO;
  latestAttempt?: QuizAttemptDTO | null;
  attempts: QuizAttemptDTO[];
  canRetryQuiz: boolean;
  showCorrectAnswer: boolean;
  guidanceTone?: "default" | "muted";
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

function getSelectedOptionIds(attempt?: QuizAttemptDTO | null) {
  const answer = attempt?.answer as { selectedOptionIds?: string[] } | undefined;
  return Array.isArray(answer?.selectedOptionIds) ? answer.selectedOptionIds : [];
}

function getOutcome(attempt?: QuizAttemptDTO | null): QuizOutcome {
  return (attempt?.outcome ?? {}) as QuizOutcome;
}

export function QuizStepCard({ lessonId, publishedVersionId, step, latestAttempt, attempts, canRetryQuiz, showCorrectAnswer, guidanceTone = "default" }: QuizStepCardProps) {
  const router = useRouter();
  const payload = step.payload as { question?: string; options?: string[]; explanation?: string };
  const votingContract = step.pluginContract as ClassroomVotingFrozenContract | null;
  const frozenOptions = votingContract?.executableConfig.options ?? [];
  const options = frozenOptions.length > 0 ? frozenOptions.map((option) => option.label) : (payload.options ?? []);
  const optionIds = frozenOptions.length > 0 ? frozenOptions.map((option) => option.id) : options.map((_option, index) => `option-${index + 1}`);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(() => {
    const fromAttempt = getSelectedOptionIds(latestAttempt);
    if (fromAttempt.length > 0) {
      return fromAttempt;
    }

    const fallbackIndex = getSelectedIndex(latestAttempt);
    return typeof fallbackIndex === "number" ? [optionIds[fallbackIndex] ?? `option-${fallbackIndex + 1}`] : [];
  });
  const [status, setStatus] = useState<string | null>(latestAttempt ? "已记录你的答案" : null);
  const [isPending, startTransition] = useTransition();
  const outcome = getOutcome(latestAttempt);
  const orderedAttempts = useMemo(() => [...attempts].sort((a, b) => a.attemptNo - b.attemptNo), [attempts]);
  const allowMultiple = votingContract?.executableConfig.allowMultiple ?? false;
  const roundEnded = Boolean(votingContract && latestAttempt && !canRetryQuiz && step.id === latestAttempt.stepId);
  const canSubmit = selectedOptionIds.length > 0 && (!latestAttempt || canRetryQuiz);

  function toggleOption(optionId: string) {
    setSelectedOptionIds((current) => {
      if (allowMultiple) {
        return current.includes(optionId)
          ? current.filter((value) => value !== optionId)
          : [...current, optionId];
      }

      return current[0] === optionId ? [] : [optionId];
    });
  }

  function submit() {
    if (selectedOptionIds.length === 0) return;

    startTransition(async () => {
      const result = await submitQuizAttemptAction({
        publishedVersionId,
        lessonId,
        stepId: step.id,
        answer: {
          selectedOptionIds,
          selectedIndex: optionIds.length > 0 ? optionIds.indexOf(selectedOptionIds[0] ?? "") : null,
        },
      });

      if (result.ok) {
        setStatus("已记录你的答案");
        router.refresh();
      } else {
        setStatus(result.message || "提交暂时失败，请保留当前选择后重试。");
      }
    });
  }

  return (
    <section className="space-y-6">
      <Badge variant="accent" className="mb-3 bg-surface-container-lowest">测验步骤</Badge>
      <p className={`leading-8 ${guidanceTone === "muted" ? "text-sm text-on-surface-variant" : "text-on-surface-variant"}`}>
        {payload.question ?? step.title}
      </p>
      {votingContract ? (
        <p className="text-sm text-on-surface-variant">
          {allowMultiple ? "本轮支持多选。" : "本轮为单选。"}
          {votingContract.executableConfig.participationWindowSeconds > 0 ? ` 建议在 ${votingContract.executableConfig.participationWindowSeconds} 秒内完成。` : ""}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3">
        {options.map((option, index) => {
          const optionId = optionIds[index] ?? `option-${index + 1}`;
          const active = selectedOptionIds.includes(optionId);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(optionId)}
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
        {roundEnded ? <Badge variant="success">本轮结果已冻结</Badge> : null}
      </div>

      {status ? <p className="mt-4 text-sm leading-6 text-primary">{status}</p> : null}
      {latestAttempt ? (
        <div className="mt-6 rounded-3xl bg-surface-container-lowest p-5 shadow-ambient">
          <p className="mb-2 text-sm font-semibold text-on-surface-variant">最新一次</p>
          <p className="font-semibold">{outcome.isCorrect === true ? "答对了" : outcome.isCorrect === false ? "还可以再想想" : "已记录你的答案"}</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">第 {latestAttempt.attemptNo} 次尝试 · 已提交，系统已记录本次作答结果</p>
          {showCorrectAnswer && latestAttempt.showCorrectAnswer ? (
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">正确答案：{typeof outcome.correctOptionIndex === "number" ? options[outcome.correctOptionIndex] : "由老师讲解"}。{outcome.explanation ?? payload.explanation ?? ""}</p>
          ) : null}
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">{latestAttempt.feedback?.body ?? "老师还没有留下反馈"}</p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3">
        <p className="text-sm font-semibold text-on-surface-variant">历史记录</p>
        {orderedAttempts.map((attempt) => (
          <article key={attempt.id} className="rounded-3xl bg-surface-container-lowest p-4">
            <p className="font-semibold">第 {attempt.attemptNo} 次尝试{attempt.isLatest ? " · 最新" : ""}</p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{attempt.selectionSummary ?? "已记录你的答案"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
