"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { submitQuizSampleAnswerAction } from "@/actions/classroom-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LearningStepDTO, RuntimeStepStateDTO } from "@/lib/dto/learning";

type QuizSampleStepCardProps = {
  lessonId: string;
  sessionId: string;
  step: LearningStepDTO;
  runtime: Pick<RuntimeStepStateDTO, "latestVotingSubmission" | "roundEnded" | "roundStatusCopy">;
};

const OPTION_IDS = ["A", "B", "C", "D"] as const;

type OptionId = (typeof OPTION_IDS)[number];

function getInitialSelectedOption(runtime: QuizSampleStepCardProps["runtime"], stepId: string): OptionId | null {
  if (runtime.latestVotingSubmission?.stepId !== stepId) {
    return null;
  }

  const payload = runtime.latestVotingSubmission.payload as
    | { selectedOptionId?: unknown; selectedOptionIds?: unknown }
    | undefined;

  if (typeof payload?.selectedOptionId === "string" && OPTION_IDS.includes(payload.selectedOptionId as OptionId)) {
    return payload.selectedOptionId as OptionId;
  }

  if (Array.isArray(payload?.selectedOptionIds)) {
    const first = payload.selectedOptionIds.find((value): value is OptionId => typeof value === "string" && OPTION_IDS.includes(value as OptionId));
    return first ?? null;
  }

  return null;
}

export function QuizSampleStepCard({ lessonId, sessionId, step, runtime }: QuizSampleStepCardProps) {
  const router = useRouter();
  const payload = step.payload as { question?: string; options?: string[] };
  const options = useMemo(
    () => (payload.options ?? []).slice(0, 4).map((label, index) => ({ id: OPTION_IDS[index]!, label })),
    [payload.options],
  );
  const [selectedOption, setSelectedOption] = useState<OptionId | null>(() => getInitialSelectedOption(runtime, step.id));
  const [status, setStatus] = useState<string | null>(runtime.latestVotingSubmission?.stepId === step.id ? "已记录你的答案" : null);
  const [isPending, startTransition] = useTransition();
  const isClosed = runtime.roundEnded;
  const hasSubmitted = runtime.latestVotingSubmission?.stepId === step.id;
  const helperCopy = isClosed
    ? "本题已关闭，当前答案已冻结"
    : hasSubmitted
      ? "已记录，可在老师关闭前修改"
      : "请选择 1 个答案后提交";

  const handleSubmit = () => {
    if (!selectedOption || isClosed) {
      return;
    }

    startTransition(async () => {
      const result = await submitQuizSampleAnswerAction({
        lessonId,
        sessionId,
        stepId: step.id,
        selectedOption,
      });

      if (result.ok) {
        setStatus(hasSubmitted ? "答案已更新" : "已记录你的答案");
        router.refresh();
        return;
      }

      setStatus(result.message || "提交暂时失败，请保留当前选择后重试。");
    });
  };

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <Badge variant="accent" className="bg-surface-container-lowest">课堂单选题</Badge>
        <h3 className="text-2xl font-semibold leading-tight text-on-surface">{payload.question ?? step.title}</h3>
        <p className="text-sm leading-6 text-on-surface-variant">{runtime.roundStatusCopy ?? helperCopy}</p>
      </div>

      <div className="grid gap-3">
        {options.map((option) => {
          const active = selectedOption === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={isClosed}
              onClick={() => setSelectedOption(option.id)}
              className={[
                "min-h-[56px] rounded-[1.6rem] px-5 py-4 text-left transition focus-visible:outline-2 focus-visible:outline-primary",
                active
                  ? "bg-primary/10 text-primary shadow-ambient"
                  : "bg-surface-container-low text-on-surface hover:bg-surface-container-high",
                isClosed ? "cursor-not-allowed opacity-70" : "cursor-pointer",
              ].join(" ")}
            >
              <span className="flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-surface-container-lowest text-sm font-semibold">
                  {option.id}
                </span>
                <span className="font-medium">{option.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-[1.6rem] bg-surface-container-low p-5 shadow-ambient">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={isPending || !selectedOption || isClosed}
            className="min-h-[44px] rounded-full px-6"
            onClick={handleSubmit}
          >
            {isPending ? "正在提交..." : hasSubmitted ? "更新答案" : "提交答案"}
          </Button>
          {isClosed ? <Badge variant="success">已关闭</Badge> : hasSubmitted ? <Badge variant="accent">已作答</Badge> : <Badge>开放作答</Badge>}
        </div>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">{helperCopy}</p>
        {status ? <p className="mt-3 text-sm leading-6 text-primary">{status}</p> : null}
      </div>
    </section>
  );
}
