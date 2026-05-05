"use client";

import { useState } from "react";

import type { AttemptFeedbackDTO } from "@/lib/dto/learning";

type FeedbackComposerProps = {
  targetType: "task_submission" | "quiz_attempt";
  targetId: string;
  latestFeedback?: AttemptFeedbackDTO | null;
};

export function FeedbackComposer({ latestFeedback }: FeedbackComposerProps) {
  const [body, setBody] = useState("");

  return (
    <div className="rounded-3xl bg-surface-container-low p-5">
      <label className="block text-sm text-on-surface-variant">给学生的简短反馈</label>
      <p className="mt-2 text-sm text-on-surface-variant">最多 200 字，聚焦下一步改进</p>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className="mt-4 min-h-28 w-full rounded-3xl bg-surface-container-low p-4 outline-none focus:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-primary"
      />
      <p className="mt-2 text-sm text-on-surface-variant">当前 {body.length}/200</p>
      <button type="button" className="mt-4 rounded-full bg-primary px-5 py-3 text-sm text-on-primary">发送反馈</button>
      {latestFeedback ? <p className="mt-4 text-sm text-on-surface-variant">{latestFeedback.body}</p> : null}
    </div>
  );
}
