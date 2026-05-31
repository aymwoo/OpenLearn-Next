"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { sendAttemptFeedbackAction } from "@/actions/learning-actions";
import { Button } from "@/components/ui/button";
import type { AttemptFeedbackDTO } from "@/lib/dto/learning";

type FeedbackComposerProps = {
  targetType: "task_submission" | "quiz_attempt";
  targetId: string;
  latestFeedback?: AttemptFeedbackDTO | null;
};

function formatUpdatedTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function FeedbackComposer({ targetType, targetId, latestFeedback }: FeedbackComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await sendAttemptFeedbackAction({ targetType, targetId, body });

      if (result.ok) {
        setStatus("反馈已发送给学生");
        setBody("");
        router.refresh();
      } else {
        setStatus(result.message || "反馈暂时没有发送成功，请保留内容后重试。");
      }
    });
  }

  return (
    <div className="rounded-3xl bg-surface-container-low p-5">
      <label htmlFor={`feedback-${targetId}`} className="block text-sm text-on-surface-variant">给学生的简短反馈</label>
      <p className="mt-2 text-sm text-on-surface-variant">最多 200 字，聚焦下一步改进</p>
      <textarea
        id={`feedback-${targetId}`}
        maxLength={200}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className="mt-4 min-h-28 w-full rounded-3xl bg-surface-container-low p-4 text-base leading-7 text-on-surface outline-none transition focus:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-primary"
      />
      <p className="mt-2 text-sm text-on-surface-variant">当前 {body.length}/200</p>
      {status ? <p className="mt-3 text-sm leading-6 text-primary">{status}</p> : null}
      <Button type="button" onClick={submit} disabled={isPending || body.trim().length === 0} className="mt-4">
        {isPending ? "正在发送..." : "发送反馈"}
      </Button>

      {latestFeedback ? (
        <div className="mt-5 rounded-3xl bg-surface-container-lowest p-4 text-sm leading-6 text-on-surface-variant">
          <p className="font-semibold text-on-surface">最近反馈</p>
          <p className="mt-2">{latestFeedback.body}</p>
          <p className="mt-2">更新于 {formatUpdatedTime(latestFeedback.updatedAt)}</p>
        </div>
      ) : (
        <p className="mt-5 rounded-3xl bg-surface-container-lowest p-4 text-sm text-on-surface-variant">老师还没有留下反馈</p>
      )}
    </div>
  );
}
