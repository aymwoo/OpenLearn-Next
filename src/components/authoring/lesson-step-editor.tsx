"use client";

import { useMemo, useState, useTransition } from "react";

import { autosaveLessonStepAction } from "@/actions/lesson-authoring-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { lessonStepPayloadSchema, type LessonStepDTO, type LessonStepPayload } from "@/lib/dto/lesson-authoring";

type LessonStepEditorProps = {
  step: LessonStepDTO | null;
};

const savingCopy = "正在保存...";
const savedCopy = "已保存";
const validationCopy = "输入内容不完整，请检查后再保存。";
const conflictCopy = "检测到更新冲突，请刷新后再试。";

type EditorState = {
  title: string;
  contentBody: string;
  teacherNotes: string;
  taskPrompt: string;
  submissionType: "text" | "image" | "file" | "link";
  successCriteria: string;
  quizQuestion: string;
  quizOptions: string;
  correctOptionIndex: string;
  explanation: string;
  materialRefsText: string;
};

function materialRefsToText(step: LessonStepDTO) {
  const refs = "materialRefs" in step.payload ? step.payload.materialRefs : [];
  return refs.map((ref) => ref.url ?? ref.title).join("\n");
}

function buildInitialState(step: LessonStepDTO): EditorState {
  return {
    title: step.title,
    contentBody: step.payload.type === "content" ? step.payload.body : "",
    teacherNotes: step.payload.type === "content" ? step.payload.teacherNotes ?? "" : "",
    taskPrompt: step.payload.type === "task" ? step.payload.prompt : "",
    submissionType: step.payload.type === "task" ? step.payload.submissionType : "text",
    successCriteria: step.payload.type === "task" ? step.payload.successCriteria ?? "" : "",
    quizQuestion: step.payload.type === "quiz" ? step.payload.question : "",
    quizOptions: step.payload.type === "quiz" ? step.payload.options.join("\n") : "",
    correctOptionIndex: step.payload.type === "quiz" && typeof step.payload.correctOptionIndex === "number"
      ? String(step.payload.correctOptionIndex)
      : "",
    explanation: step.payload.type === "quiz" ? step.payload.explanation ?? "" : "",
    materialRefsText: materialRefsToText(step),
  };
}

function parseMaterialRefs(text: string, fallback: LessonStepDTO["payload"]) {
  const nextLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (nextLines.length === 0) {
    return "materialRefs" in fallback ? fallback.materialRefs : [];
  }

  return nextLines.map((line) => ({
    title: line,
    kind: "link",
    url: line.startsWith("http://") || line.startsWith("https://") ? line : undefined,
  }));
}

function buildPayload(state: EditorState, step: LessonStepDTO): LessonStepPayload {
  const materialRefs = parseMaterialRefs(state.materialRefsText, step.payload);
  const builtInSource = step.payload.builtInSource;

  if (step.type === "content" && step.payload.type === "content") {
    return {
      type: "content",
      title: state.title.trim(),
      body: state.contentBody.trim(),
      teacherNotes: state.teacherNotes.trim() || undefined,
      materialRefs,
      builtInSource,
    };
  }

  if (step.type === "task" && step.payload.type === "task") {
    return {
      type: "task",
      prompt: state.taskPrompt.trim(),
      submissionType: state.submissionType,
      successCriteria: state.successCriteria.trim() || undefined,
      allowRetry: step.payload.allowRetry,
      retryPolicy: step.payload.retryPolicy,
      materialRefs,
      builtInSource,
    };
  }

  const options = state.quizOptions
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    type: "quiz",
    question: state.quizQuestion.trim(),
    options,
    correctOptionIndex: state.correctOptionIndex.trim() ? Number(state.correctOptionIndex.trim()) : undefined,
    explanation: state.explanation.trim() || undefined,
    allowRetry: step.payload.type === "quiz" ? step.payload.allowRetry : undefined,
    retryPolicy: step.payload.type === "quiz" ? step.payload.retryPolicy : undefined,
    revealCorrectAnswer: step.payload.type === "quiz" ? step.payload.revealCorrectAnswer : undefined,
    builtInSource,
  };
}

export function LessonStepEditor({ step }: LessonStepEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [stateByStepId, setStateByStepId] = useState<Record<string, EditorState>>({});

  const stepTypeLabel = useMemo(() => {
    if (!step) return "";
    return step.type === "content" ? "内容" : step.type === "task" ? "任务" : "测验";
  }, [step]);
  const builtInSourceLabel = useMemo(() => {
    if (!step?.payload.builtInSource) return null;
    return `内置环节 · ${step.payload.builtInSource.pluginName}`;
  }, [step]);

  if (!step) {
    return (
      <Card className="bg-surface-container-low p-5 shadow-none">
        <h3 className="text-2xl font-semibold">新增内容 / 新增任务 / 新增测验</h3>
        <p className="mt-3 text-on-surface-variant">选择左侧步骤，或先新增一个学习活动。</p>
      </Card>
    );
  }

  const activeStep = step;
  const activeState = stateByStepId[step.id] ?? buildInitialState(step);

  function updateField<Key extends keyof EditorState>(key: Key, value: EditorState[Key]) {
    setStateByStepId((prev) => ({
      ...prev,
      [activeStep.id]: {
        ...activeState,
        [key]: value,
      },
    }));
  }

  function saveStep() {
    const nextPayload = buildPayload(activeState, activeStep);
    const parsedPayload = lessonStepPayloadSchema.safeParse(nextPayload);

    if (!parsedPayload.success || !activeState.title.trim()) {
      setStatus(validationCopy);
      return;
    }

    setStatus(savingCopy);
    startTransition(async () => {
      const result = await autosaveLessonStepAction({
        stepId: activeStep.id,
        title: activeState.title.trim(),
        payload: parsedPayload.data,
      });

      if (result.ok) {
        setStatus(savedCopy);
        return;
      }

      setStatus(result.error === "CONFLICT" ? conflictCopy : result.message || validationCopy);
    });
  }

  return (
    <Card className="bg-surface-container-low p-5 shadow-none">
      <div className="flex items-center justify-between gap-3 rounded-[1.5rem] bg-surface-container-lowest px-4 py-4">
        <div>
          <p className="text-sm text-on-surface-variant">步骤编辑器</p>
          <h3 className="mt-2 text-2xl font-semibold">{activeStep.title}</h3>
          {builtInSourceLabel ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">步骤来源</span>
              <span className="rounded-full bg-surface-container-low px-3 py-1 font-medium text-on-surface-variant">{builtInSourceLabel}</span>
              <span className="rounded-full bg-surface-container-low px-3 py-1 font-medium text-on-surface-variant">{activeStep.payload.builtInSource?.builtInKey}</span>
            </div>
          ) : null}
        </div>
        <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-sm text-primary">
          {stepTypeLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="rounded-[1.5rem] bg-surface-container-lowest px-4 py-4 text-sm text-on-surface-variant">
          当前步骤类型为{stepTypeLabel}，保存时会继续走结构化 schema 校验与 `autosaveLessonStepAction`。
        </div>

        <label className="grid gap-2" htmlFor="lesson-step-title">
          <span className="text-sm text-on-surface-variant">标题</span>
          <input
            id="lesson-step-title"
            className="rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none transition focus-visible:outline-2 focus-visible:outline-primary/20"
            value={activeState.title}
            onChange={(event) => updateField("title", event.target.value)}
          />
        </label>

        {activeStep.type === "content" && (
          <>
            <label className="grid gap-2" htmlFor="lesson-step-body">
              <span className="text-sm text-on-surface-variant">正文</span>
              <textarea
                id="lesson-step-body"
                className="min-h-32 rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none transition focus-visible:outline-2 focus-visible:outline-primary/20"
                value={activeState.contentBody}
                onChange={(event) => updateField("contentBody", event.target.value)}
              />
            </label>
            <label className="grid gap-2" htmlFor="lesson-step-teacher-notes">
              <span className="text-sm text-on-surface-variant">教师提示</span>
              <textarea
                id="lesson-step-teacher-notes"
                className="min-h-24 rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none transition focus-visible:outline-2 focus-visible:outline-primary/20"
                value={activeState.teacherNotes}
                onChange={(event) => updateField("teacherNotes", event.target.value)}
              />
            </label>
          </>
        )}

        {activeStep.type === "task" && activeStep.payload.type === "task" && (
          <>
            <label className="grid gap-2" htmlFor="lesson-step-task-prompt">
              <span className="text-sm text-on-surface-variant">任务说明</span>
              <textarea
                id="lesson-step-task-prompt"
                className="min-h-32 rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none transition focus-visible:outline-2 focus-visible:outline-primary/20"
                value={activeState.taskPrompt}
                onChange={(event) => updateField("taskPrompt", event.target.value)}
              />
            </label>
            <label className="grid gap-2" htmlFor="lesson-step-submission-type">
              <span className="text-sm text-on-surface-variant">提交要求</span>
              <select
                id="lesson-step-submission-type"
                className="rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none transition focus-visible:outline-2 focus-visible:outline-primary/20"
                value={activeState.submissionType}
                onChange={(event) => updateField("submissionType", event.target.value as EditorState["submissionType"])}
              >
                <option value="text">text</option>
                <option value="image">image</option>
                <option value="file">file</option>
                <option value="link">link</option>
              </select>
            </label>
            <label className="grid gap-2" htmlFor="lesson-step-success-criteria">
              <span className="text-sm text-on-surface-variant">成功标准</span>
              <textarea
                id="lesson-step-success-criteria"
                className="min-h-24 rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none transition focus-visible:outline-2 focus-visible:outline-primary/20"
                value={activeState.successCriteria}
                onChange={(event) => updateField("successCriteria", event.target.value)}
              />
            </label>
          </>
        )}

        {activeStep.type === "quiz" && activeStep.payload.type === "quiz" && (
          <>
            <label className="grid gap-2" htmlFor="lesson-step-quiz-question">
              <span className="text-sm text-on-surface-variant">题目</span>
              <textarea
                id="lesson-step-quiz-question"
                className="min-h-28 rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none transition focus-visible:outline-2 focus-visible:outline-primary/20"
                value={activeState.quizQuestion}
                onChange={(event) => updateField("quizQuestion", event.target.value)}
              />
            </label>
            <label className="grid gap-2" htmlFor="lesson-step-quiz-options">
              <span className="text-sm text-on-surface-variant">选项</span>
              <textarea
                id="lesson-step-quiz-options"
                className="min-h-24 rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none transition focus-visible:outline-2 focus-visible:outline-primary/20"
                value={activeState.quizOptions}
                onChange={(event) => updateField("quizOptions", event.target.value)}
              />
            </label>
            <label className="grid gap-2" htmlFor="lesson-step-correct-option-index">
              <span className="text-sm text-on-surface-variant">正确答案序号</span>
              <input
                id="lesson-step-correct-option-index"
                inputMode="numeric"
                className="rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none transition focus-visible:outline-2 focus-visible:outline-primary/20"
                value={activeState.correctOptionIndex}
                onChange={(event) => updateField("correctOptionIndex", event.target.value)}
              />
            </label>
            <label className="grid gap-2" htmlFor="lesson-step-explanation">
              <span className="text-sm text-on-surface-variant">答案说明</span>
              <textarea
                id="lesson-step-explanation"
                className="min-h-24 rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none transition focus-visible:outline-2 focus-visible:outline-primary/20"
                value={activeState.explanation}
                onChange={(event) => updateField("explanation", event.target.value)}
              />
            </label>
          </>
        )}

        <label className="grid gap-2" htmlFor="lesson-step-materials">
          <span className="text-sm text-on-surface-variant">引用材料</span>
          <textarea
            id="lesson-step-materials"
            className="min-h-24 rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none transition focus-visible:outline-2 focus-visible:outline-primary/20"
            value={activeState.materialRefsText}
            onChange={(event) => updateField("materialRefsText", event.target.value)}
            placeholder="每行一个材料标题或链接"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" className="text-sm text-on-surface-variant">
          {isPending ? savingCopy : status}
        </div>
        <Button type="button" onClick={saveStep} disabled={isPending}>
          {isPending ? savingCopy : "保存步骤"}
        </Button>
      </div>
    </Card>
  );
}
