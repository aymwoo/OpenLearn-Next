"use client";

import { useMemo, useState } from "react";

import {
  addLessonStepAction,
  archiveLessonStepAction,
  duplicateLessonStepAction,
  reorderLessonStepAction,
} from "@/actions/lesson-authoring-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LessonStepEditor } from "@/components/authoring/lesson-step-editor";
import type { LessonEditorDTO, LessonStepDTO, TeacherAuthoringOverviewDTO } from "@/lib/dto/lesson-authoring";

type LessonAuthoringWorkspaceProps = {
  overview: TeacherAuthoringOverviewDTO;
  lesson: LessonEditorDTO | null;
};

const stepLabels = {
  content: "内容",
  task: "任务",
  quiz: "测验",
} as const;

export function LessonAuthoringWorkspace({ overview, lesson }: LessonAuthoringWorkspaceProps) {
  const [selectedStepId, setSelectedStepId] = useState(lesson?.steps[0]?.id ?? null);
  const steps = lesson?.steps.filter((step) => !step.archivedAt) ?? [];
  const selectedStep = useMemo(
    () => steps.find((step) => step.id === selectedStepId) ?? steps[0] ?? null,
    [selectedStepId, steps]
  );

  async function moveStep(step: LessonStepDTO, direction: "up" | "down") {
    const index = steps.findIndex((item) => item.id === step.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const beforeRank = steps[targetIndex - 1]?.rank ?? null;
    const afterRank = steps[targetIndex]?.rank ?? null;

    if (!lesson || targetIndex < 0 || targetIndex >= steps.length) return;

    await reorderLessonStepAction({ stepId: step.id, lessonId: lesson.lesson.id, beforeRank, afterRank });
  }

  async function addStep(type: "content" | "task" | "quiz") {
    if (!lesson) return;
    const payload = type === "content"
      ? { type, title: "新内容", body: "填写正文", materialRefs: [] }
      : type === "task"
        ? { type, prompt: "填写任务说明", submissionType: "text", materialRefs: [] }
        : { type, question: "填写题目", options: ["选项 A", "选项 B"] };

    await addLessonStepAction({ lessonId: lesson.lesson.id, type, title: type === "content" ? "新内容" : type === "task" ? "新任务" : "新测验", payload });
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="bg-surface-container-low p-5 shadow-none">
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => addStep("content")}>新增内容</Button>
          <Button type="button" variant="secondary" onClick={() => addStep("task")}>新增任务</Button>
          <Button type="button" variant="secondary" onClick={() => addStep("quiz")}>新增测验</Button>
        </div>

        <div className="mt-5 space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="rounded-3xl bg-surface-container-lowest p-4">
              <button type="button" className="w-full text-left" onClick={() => setSelectedStepId(step.id)}>
                <span className="text-sm text-on-surface-variant">{stepLabels[step.type]}</span>
                <span className="mt-1 block font-semibold">{step.title}</span>
              </button>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="tertiary" onClick={() => duplicateLessonStepAction({ stepId: step.id })}>复制</Button>
                <Button type="button" variant="tertiary" onClick={() => archiveLessonStepAction({ stepId: step.id })}>归档</Button>
                <Button type="button" variant="tertiary" onClick={() => moveStep(step, "up")}>上移</Button>
                <Button type="button" variant="tertiary" onClick={() => moveStep(step, "down")}>下移</Button>
              </div>
            </div>
          ))}

          {steps.length === 0 && (
            <div className="rounded-3xl bg-surface-container-lowest p-5 text-sm text-on-surface-variant">
              {overview.courses.length > 0 ? "新增内容、任务或测验后开始编排。" : "先创建课程，再开始编排步骤。"}
            </div>
          )}
        </div>
      </Card>

      <LessonStepEditor step={selectedStep} />
    </div>
  );
}
