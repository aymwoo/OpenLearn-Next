"use client";

import { Clock3, Eye, FileText } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { autosaveLessonStepAction } from "@/actions/lesson-authoring-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { lessonStepPayloadSchema, type LessonStepDTO, type LessonStepPayload } from "@/lib/dto/lesson-authoring";

type LessonStepEditorProps = {
  step: LessonStepDTO | null;
  className?: string;
};

const savingCopy = "正在保存...";
const savedCopy = "已保存";
const validationCopy = "输入内容不完整，请检查后再保存。";
const conflictCopy = "检测到更新冲突，请刷新后再试。";
const previewLabel = "实时预览";

const submissionTypeLabels = {
  text: "文字",
  image: "图片",
  file: "文件",
  link: "链接",
} as const;

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

function parsePreviewMaterialRefs(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      title: line,
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

export function LessonStepEditor({ step, className }: LessonStepEditorProps) {
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
      <Card className={`bg-surface-container-low p-5 shadow-none ${className ?? ""}`.trim()}>
        <h3 className="text-2xl font-semibold">新增内容 / 新增任务 / 新增测验</h3>
        <p className="mt-3 text-on-surface-variant">选择左侧步骤，或先新增一个学习活动。</p>
      </Card>
    );
  }

  const activeStep = step;
  const activeState = stateByStepId[step.id] ?? buildInitialState(step);
  const previewMaterialRefs = parsePreviewMaterialRefs(activeState.materialRefsText);
  const previewTitle = activeState.title.trim() || activeStep.title;
  const previewDescription = getPreviewDescription(activeStep, activeState);
  const previewSupport = getPreviewSupport(activeStep, activeState);
  const previewDuration = getPreviewDuration(activeStep.type);
  const primaryMaterial = previewMaterialRefs[0] ?? null;
  const remainingMaterialCount = Math.max(previewMaterialRefs.length - 1, 0);

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
    <div className={`flex h-full min-h-0 flex-col ${className ?? ""}`.trim()}>
      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <Card className="flex min-h-0 flex-col rounded-[1.75rem] bg-surface-container-low p-6 shadow-none">
          <div className="flex items-start justify-between gap-3 rounded-[1.5rem] bg-surface-container-lowest px-5 py-5">
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
            <span className="rounded-full bg-surface-container-high px-3 py-1 text-sm font-medium text-primary">
              {stepTypeLabel}
            </span>
          </div>

          <div className="mt-5 rounded-[1.5rem] bg-surface-container-lowest px-4 py-4 text-sm leading-7 text-on-surface-variant">
            当前步骤类型为{stepTypeLabel}，保存时会继续走结构化 schema 校验与 `autosaveLessonStepAction`。
          </div>

          <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-4 pb-2">
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

        <Card aria-label={previewLabel} role="region" className="relative hidden min-h-0 overflow-hidden rounded-[1.75rem] bg-surface-container-low p-8 shadow-none md:flex md:flex-col">
          <div className="absolute inset-0 bg-gradient-to-b from-surface-container-low to-surface opacity-60" />
          <div className="relative flex items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 text-lg font-semibold text-on-surface">
              <Eye className="size-5 text-primary" aria-hidden />
              {previewLabel}
            </h4>
            <span className="rounded-full bg-surface-container-highest px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">
              学生视图
            </span>
          </div>

          <div className="relative mt-8 flex min-h-0 flex-1 items-center justify-center">
            <div className="group relative w-full max-w-sm overflow-hidden rounded-[1.75rem] bg-surface-container-lowest p-6 shadow-[0_16px_64px_-16px_rgba(44,47,48,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-tertiary-fixed" />
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                      环节预览
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                    <Clock3 className="size-3.5" aria-hidden />
                    {previewDuration}
                  </span>
                </div>

                <h5 className="mt-4 text-xl font-bold leading-tight text-on-surface">{previewTitle}</h5>
                <p className="mt-3 line-clamp-4 text-sm leading-7 text-on-surface-variant">{previewDescription}</p>

                <div className="mt-5 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{stepTypeLabel}</span>
                  {builtInSourceLabel ? (
                    <span className="rounded-full bg-surface-container-low px-3 py-1 font-medium text-on-surface-variant">{builtInSourceLabel}</span>
                  ) : null}
                </div>

                <p className="mt-4 text-sm leading-6 text-on-surface">
                  {previewSupport}
                </p>

                <div className="mt-6 rounded-[1.25rem] bg-surface-container-low px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary-container text-on-secondary-container">
                      <FileText className="size-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium text-on-surface">
                        {primaryMaterial?.title ?? "未关联资源"}
                      </p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {primaryMaterial ? `${previewMaterialRefs.length} 个资源${remainingMaterialCount > 0 ? ` · 另有 ${remainingMaterialCount} 项` : ""}` : "预览将同步展示补充说明或资料摘要"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 h-1 bg-linear-90 from-primary to-primary-container opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function getPreviewDescription(step: LessonStepDTO, state: EditorState) {
  if (step.type === "content") {
    return state.contentBody.trim() || "在这里补充教学内容，右侧学生视图会同步展示正文摘要。";
  }

  if (step.type === "task") {
    return state.taskPrompt.trim() || "描述学生需要完成的任务、提交要求与课堂互动节奏。";
  }

  return state.quizQuestion.trim() || "填写测验题目后，右侧会即时展示题目摘要与作答提示。";
}

function getPreviewSupport(step: LessonStepDTO, state: EditorState) {
  if (step.type === "content") {
    return state.teacherNotes.trim() || "可在这里补充教师提示、追问方式和课堂话术。";
  }

  if (step.type === "task") {
    return state.successCriteria.trim() || `提交方式：${submissionTypeLabels[state.submissionType]}`;
  }

  const optionCount = state.quizOptions.split("\n").map((line) => line.trim()).filter(Boolean).length;
  const correctAnswer = state.correctOptionIndex.trim() ? ` · 正确答案 ${state.correctOptionIndex.trim()}` : "";
  return state.explanation.trim() || `${optionCount} 个选项${correctAnswer}`;
}

function getPreviewDuration(type: LessonStepDTO["type"]) {
  if (type === "content") return "12 分钟";
  if (type === "task") return "15 分钟";
  return "8 分钟";
}
