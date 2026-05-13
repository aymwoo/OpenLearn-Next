"use client";

import { useMemo, useState, useTransition } from "react";

import { recordStudentFormativeEvaluationAction } from "@/actions/classroom-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const participationOptions = [
  { value: "active", label: "积极参与" },
  { value: "normal", label: "正常参与" },
  { value: "attention", label: "需要关注" },
] as const;

const evaluationTags = ["主动发言", "专注跟进", "协作支持", "表达清晰", "需要提醒", "需要跟进"] as const;

type ClassroomStudentEvaluationFormProps = {
  sessionId: string;
  studentId: string;
};

export function ClassroomStudentEvaluationForm({
  sessionId,
  studentId,
}: ClassroomStudentEvaluationFormProps) {
  const [participationLevel, setParticipationLevel] = useState<(typeof participationOptions)[number]["value"]>("normal");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [observationNote, setObservationNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedTagSet = useMemo(() => new Set(selectedTags), [selectedTags]);

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  function submit() {
    setFeedback(null);

    startTransition(async () => {
      const result = await recordStudentFormativeEvaluationAction({
        sessionId,
        studentId,
        participationLevel,
        tags: selectedTags,
        observationNote,
      });

      if (!result.ok) {
        setFeedback(result.message || "过程评价暂时没有保存成功，请稍后重试。");
        return;
      }

      setFeedback("过程评价已记录到课堂观察。");
      setObservationNote("");
      setSelectedTags([]);
      setParticipationLevel("normal");
    });
  }

  return (
    <Card className="bg-surface-container-low p-5 sm:p-6">
      <div className="space-y-2">
        <p className="text-sm text-on-surface-variant">过程性评价</p>
        <h3 className="text-2xl font-semibold text-on-surface">在课堂上下文里记录单学生观察</h3>
        <p className="text-sm leading-7 text-on-surface-variant">
          这是教师可见的过程性评价记录，请围绕本节课的参与表现、互动状态和后续跟进建议进行记录。
        </p>
      </div>

      <fieldset className="mt-5 space-y-3">
        <legend className="text-sm font-medium text-on-surface">参与度档位</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {participationOptions.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-[1.3rem] bg-surface-container-lowest px-4 py-4 shadow-ambient"
            >
              <input
                type="radio"
                name="participationLevel"
                value={option.value}
                checked={participationLevel === option.value}
                onChange={() => setParticipationLevel(option.value)}
                disabled={isPending}
              />
              <span className="text-sm font-medium text-on-surface">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 space-y-3">
        <p className="text-sm font-medium text-on-surface">观察标签</p>
        <div className="flex flex-wrap gap-3">
          {evaluationTags.map((tag) => {
            const active = selectedTagSet.has(tag);

            return (
              <button
                key={tag}
                type="button"
                aria-pressed={active}
                className={active
                  ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-white"
                  : "rounded-full bg-surface-container-lowest px-4 py-2 text-sm font-medium text-on-surface shadow-ambient"
                }
                disabled={isPending}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <label htmlFor="observationNote" className="text-sm font-medium text-on-surface">
          observationNote
        </label>
        <textarea
          id="observationNote"
          value={observationNote}
          onChange={(event) => setObservationNote(event.target.value)}
          className="min-h-32 w-full rounded-[1.5rem] bg-surface-container-lowest px-4 py-4 text-sm leading-7 text-on-surface outline-none focus-visible:outline-2 focus-visible:outline-primary"
          disabled={isPending}
        />
      </div>

      {feedback ? <p className="mt-4 text-sm text-primary">{feedback}</p> : null}

      <div className="mt-5 flex justify-end">
        <Button type="button" onClick={submit} disabled={isPending || observationNote.trim().length === 0}>
          {isPending ? "正在保存过程评价..." : "保存过程评价"}
        </Button>
      </div>
    </Card>
  );
}
