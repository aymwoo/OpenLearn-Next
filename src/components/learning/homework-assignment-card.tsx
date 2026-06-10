"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { submitHomeworkAction } from "@/actions/homework-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LearningStepDTO } from "@/lib/dto/learning";

type SubmissionStatus =
  | "not_started"
  | "submitting"
  | "submitted"
  | "graded"
  | "error";

type HomeworkAssignmentCardProps = {
  lessonId: string;
  sessionId: string;
  step: LearningStepDTO;
  latestSubmission?: {
    content?: string;
    attachmentUrl?: string;
    isLatest?: boolean;
  } | null;
  latestGrade?: {
    score?: number;
    comment?: string;
  } | null;
};

export function HomeworkAssignmentCard({
  sessionId,
  step,
  latestSubmission,
  latestGrade,
}: HomeworkAssignmentCardProps) {
  const router = useRouter();
  const payload = step.payload as {
    prompt?: string;
    materialRefs?: Array<{ url?: string; title?: string }>;
  };
  const description = payload.prompt ?? "";
  const attachmentUrl = payload.materialRefs?.[0]?.url ?? "";

  const existingContent = latestSubmission?.content ?? "";
  const isSubmitted = Boolean(latestSubmission?.isLatest);
  const isGraded = Boolean(latestGrade);

  const [answer, setAnswer] = useState(existingContent);
  const [answerAttachmentUrl, setAnswerAttachmentUrl] = useState(
    latestSubmission?.attachmentUrl ?? "",
  );
  const [status, setStatus] = useState<SubmissionStatus>(
    isGraded ? "graded" : isSubmitted ? "submitted" : "not_started",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!answer.trim()) return;
    setErrorMessage(null);
    setStatus("submitting");

    startTransition(async () => {
      const result = await submitHomeworkAction({
        classroomSession: sessionId,
        student: "", // 由 Server Action 从 session 推导
        assignment: step.id,
        content: answer.trim(),
        attachmentUrl: answerAttachmentUrl.trim() || undefined,
      });

      if (result.ok) {
        setStatus("submitted");
        setErrorMessage(null);
        router.refresh();
      } else {
        setStatus("error");
        setErrorMessage(result.message || "提交暂时失败 — 请保留你的答案后重试");
      }
    });
  };

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <Badge variant="accent" className="bg-surface-container-lowest">
          课堂作业
        </Badge>
        <h3 className="text-2xl font-semibold leading-tight text-on-surface">
          {step.title}
        </h3>
        {description ? (
          <p className="text-sm leading-6 text-on-surface-variant">
            {description}
          </p>
        ) : null}
        {attachmentUrl ? (
          <a
            href={attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-primary underline"
          >
            查看附件
          </a>
        ) : null}
      </div>

      {isGraded && latestGrade ? (
        <div className="rounded-[1.6rem] bg-surface-container-low p-5 shadow-ambient">
          <p className="text-sm font-semibold text-on-surface">
            分数: {latestGrade.score ?? "—"}/100
          </p>
          {latestGrade.comment ? (
            <p className="mt-2 text-sm text-on-surface-variant">
              评语: {latestGrade.comment}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-[1.6rem] bg-surface-container-low p-5 shadow-ambient">
        <label className="grid gap-2" htmlFor="homework-answer">
          <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">
            你的答案
          </span>
          <textarea
            id="homework-answer"
            className="min-h-32 w-full rounded-none border-0 bg-surface-container-high px-4 py-3 text-on-surface outline-none transition focus-visible:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-primary/20"
            value={answer}
            disabled={status === "submitting"}
            placeholder="输入你的答案…"
            onChange={(e) => setAnswer(e.target.value)}
          />
        </label>

        <label className="mt-3 grid gap-2" htmlFor="homework-attachment">
          <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">
            附件链接（可选）
          </span>
          <input
            id="homework-attachment"
            className="w-full rounded-none border-0 bg-surface-container-high px-4 py-3 text-on-surface outline-none transition focus-visible:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-primary/20"
            value={answerAttachmentUrl}
            disabled={status === "submitting"}
            placeholder="https://..."
            onChange={(e) => setAnswerAttachmentUrl(e.target.value)}
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={isPending || !answer.trim()}
            className="min-h-[44px] rounded-full px-6"
            onClick={handleSubmit}
          >
            {isPending
              ? "正在提交..."
              : isSubmitted
                ? "更新提交"
                : "提交作业"}
          </Button>
          {status === "submitted" ? (
            <Badge variant="accent">已提交 · 等待批改</Badge>
          ) : status === "graded" ? (
            <Badge variant="success">已批改</Badge>
          ) : status === "error" ? (
            <Badge>提交失败</Badge>
          ) : null}
        </div>

        {errorMessage ? (
          <p className="mt-3 text-sm leading-6 text-[#b31b25]">{errorMessage}</p>
        ) : null}
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          {isSubmitted
            ? "你已提交本次作业，可修改后重新提交。"
            : "提交后答案会保留为一次新的尝试记录。"}
        </p>
      </div>
    </section>
  );
}
