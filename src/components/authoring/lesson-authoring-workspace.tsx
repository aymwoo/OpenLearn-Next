"use client";

import { useMemo, useState } from "react";
import { BookOpenText, ClipboardCheck, FileText, GripVertical, Plus, Sparkles } from "lucide-react";

import {
  addLessonStepAction,
  archiveLessonStepAction,
  duplicateLessonStepAction,
  reorderLessonStepAction,
} from "@/actions/lesson-authoring-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LessonStepEditor } from "@/components/authoring/lesson-step-editor";
import {
  type BuiltInTeachingStepTemplatePayload,
} from "@/lib/dto/resource-ai";
import type { LessonEditorDTO, LessonStepDTO, TeacherAuthoringOverviewDTO } from "@/lib/dto/lesson-authoring";

type BuiltInTemplateForAuthoring = BuiltInTeachingStepTemplatePayload & {
  id: string;
  pluginId: string;
};

type LessonAuthoringWorkspaceProps = {
  overview: TeacherAuthoringOverviewDTO;
  lesson: LessonEditorDTO | null;
  builtInTemplates: BuiltInTemplateForAuthoring[];
};

const stepLabels = {
  content: "内容",
  task: "任务",
  quiz: "测验",
} as const;

const stepDurations = {
  content: "12 min",
  task: "15 min",
  quiz: "8 min",
} as const;

const stepComposerActions = [
  {
    type: "content" as const,
    label: "新增内容",
    description: "用于导入、讲授与资料梳理。",
    icon: FileText,
    prominent: true,
  },
  {
    type: "content" as const,
    label: "新增讲解卡",
    description: "补充正文、教师提示与引用材料。",
    icon: FileText,
    prominent: false,
  },
  {
    type: "task" as const,
    label: "新增任务",
    description: "布置课堂练习、拍照或链接提交。",
    icon: BookOpenText,
    prominent: false,
  },
  {
    type: "quiz" as const,
    label: "新增测验",
    description: "设置题目、选项与答案说明。",
    icon: ClipboardCheck,
    prominent: false,
  },
] as const;

const builtInTeachingStepButtonOrder = ["教师讲授", "问卷调查", "学生探究", "课堂测验", "评价"] as const;

export function LessonAuthoringWorkspace({ overview, lesson, builtInTemplates }: LessonAuthoringWorkspaceProps) {
  const [selectedStepId, setSelectedStepId] = useState(lesson?.steps[0]?.id ?? null);
  const steps = useMemo(() => lesson?.steps.filter((step) => !step.archivedAt) ?? [], [lesson?.steps]);
  const orderedBuiltInTemplates = useMemo(() => {
    const orderMap = new Map<string, number>(builtInTeachingStepButtonOrder.map((pluginName, index) => [pluginName, index]));

    return [...builtInTemplates].sort((left, right) => {
      const leftOrder = orderMap.get(left.pluginName) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = orderMap.get(right.pluginName) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
  }, [builtInTemplates]);
  const selectedStep = useMemo(
    () => steps.find((step) => step.id === selectedStepId) ?? steps[0] ?? null,
    [selectedStepId, steps]
  );
  const totalMinutes = steps.reduce((total, step) => total + getStepMinutes(step.type), 0);
  const builtInStepCount = steps.filter((step) => getBuiltInSourceLabel(step)).length;

  async function moveStep(step: LessonStepDTO, direction: "up" | "down") {
    const index = steps.findIndex((item) => item.id === step.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (!lesson || targetIndex < 0 || targetIndex >= steps.length) return;

    const beforeRank = direction === "up" ? steps[index - 2]?.rank ?? null : steps[index + 1]?.rank ?? null;
    const afterRank = direction === "up" ? steps[index - 1]?.rank ?? null : steps[index + 2]?.rank ?? null;

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

  async function addBuiltInStep(definition: Pick<BuiltInTeachingStepTemplatePayload, "stepType" | "initialTitle" | "initialPayload">) {
    if (!lesson) return;

    await addLessonStepAction({
      lessonId: lesson.lesson.id,
      type: definition.stepType,
      title: definition.initialTitle,
      payload: definition.initialPayload,
    });
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
        <Card className="relative overflow-hidden rounded-[var(--radius-shell)] bg-surface-container-lowest p-5">
          <div className="absolute inset-x-0 top-0 h-24 bg-linear-135 from-primary/10 to-primary-container/20" />
          <div className="relative" data-testid="lesson-flow-composer">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-on-surface-variant">课堂流程组件</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-on-surface">统一编排区</h3>
              </div>
              <button type="button" className="rounded-full bg-surface-container-low p-3 text-on-surface-variant transition hover:text-primary">
                <Sparkles className="size-5" />
              </button>
            </div>

            <p className="mt-5 text-sm leading-7 text-on-surface-variant">
              普通步骤和内置教学环节在同一个工作区快速插入，减少来回切换，让教师能持续关注整节课的节奏主线。
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">普通步骤</p>
                <div className="mt-3 space-y-2">
                  {stepComposerActions.map((action) => {
                    const ActionIcon = action.icon;

                    return (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => addStep(action.type)}
                        className={`flex w-full items-center gap-3 rounded-[1.35rem] px-4 py-3 text-left transition ${action.prominent ? "bg-primary text-white shadow-ambient" : "bg-surface-container-lowest text-on-surface hover:bg-surface"}`}
                      >
                        <span className={`grid size-10 shrink-0 place-items-center rounded-[1rem] ${action.prominent ? "bg-white/18 text-white" : "bg-surface-container-low text-primary"}`}>
                          {action.prominent ? <Plus className="size-4" /> : <ActionIcon className="size-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm font-semibold ${action.prominent ? "text-white" : "text-on-surface"}`}>{action.label}</span>
                          <span className={`mt-1 block text-xs ${action.prominent ? "text-white/80" : "text-on-surface-variant"}`}>{action.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">内置教学环节</p>
                    <p className="mt-1 text-xs leading-5 text-on-surface-variant">系统内置节奏组件直接写入当前课时，后续仍可在属性编辑器里看到来源，不会变成隐藏逻辑。</p>
                  </div>
                  <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-xs font-medium text-primary shadow-ambient">{orderedBuiltInTemplates.length} 个可用环节</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {orderedBuiltInTemplates.map((template) => (
                    <Button
                      key={template.pluginId}
                      type="button"
                      variant="secondary"
                      className="min-h-10 bg-surface-container-lowest px-4 text-sm shadow-none"
                      onClick={() => addBuiltInStep(template)}
                    >
                      {template.pluginName}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">当前编排概览</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <SummaryStat label="有效步骤" value={String(steps.length)} />
                  <SummaryStat label="内置环节" value={String(builtInStepCount)} />
                  <SummaryStat label="普通步骤" value={String(steps.length - builtInStepCount)} />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-[var(--radius-shell)] bg-surface-container-lowest p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-semibold tracking-[-0.02em] text-on-surface">流程主线</h3>
                  <span className="rounded-[0.9rem] bg-surface-container-high px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant">Lesson Flow</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">每个环节都按真实课时顺序落在同一条主线里，普通步骤与内置环节共享相同的编辑和排序上下文。</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-medium text-primary">总时长约 {totalMinutes} 分钟</span>
                <span className="rounded-full bg-secondary-container px-4 py-2 text-sm font-medium text-on-secondary-container">{steps.length} 个活动</span>
                <span className="rounded-full bg-surface-container-high px-4 py-2 text-sm font-medium text-on-surface-variant">{builtInStepCount} 个内置环节</span>
              </div>
            </div>

            <div className="relative mt-6 min-h-[38rem] rounded-[2rem] bg-surface-container-low p-5 shadow-ambient">
              <div className="flex items-center gap-4 pb-4">
                <span className="grid size-9 place-items-center rounded-full bg-secondary-container text-on-secondary-container shadow-ambient">1</span>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-on-surface-variant">开始上课</p>
              </div>

              <div className="space-y-0">
                {steps.length > 0 ? steps.map((step, index) => (
                  <div key={step.id}>
                    <FlowStepCard
                      step={step}
                      index={index}
                      selected={selectedStep?.id === step.id}
                    onSelect={() => setSelectedStepId(step.id)}
                    onDuplicate={() => duplicateLessonStepAction({ stepId: step.id })}
                    onArchive={() => archiveLessonStepAction({ stepId: step.id })}
                    onMoveUp={() => moveStep(step, "up")}
                    onMoveDown={() => moveStep(step, "down")}
                    />
                  </div>
                )) : null}

                {steps.length === 0 ? (
                  <div className="relative ml-4 py-4 pl-4">
                    <div className="absolute -left-[9px] top-0 size-4 rounded-full bg-surface-container-high" />
                    <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-[1.5rem] bg-primary/5 px-6 text-center text-primary">
                      <GripVertical className="size-8 opacity-80" />
                      <span className="text-sm font-semibold tracking-[0.06em]">从左侧选择内容、任务、测验或内置教学环节，开始编排课堂主线。</span>
                    </div>
                  </div>
                ) : null}
              </div>

            <div className="relative flex items-center gap-4 pt-4">
                <span className="grid size-9 place-items-center rounded-full bg-surface-container-high text-on-surface-variant shadow-ambient">止</span>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-on-surface-variant">课程结束</p>
              </div>
            </div>
          </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <LessonStepEditor key={selectedStep?.id ?? "empty-step"} step={selectedStep} />
        <Card className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-none">
          <div className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
            <p className="text-sm text-on-surface-variant">当前选中步骤</p>
            {selectedStep ? (
              <>
                <h4 className="mt-3 text-xl font-semibold text-on-surface">{selectedStep.title}</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant">{stepLabels[selectedStep.type]}</span>
                  {getBuiltInSourceLabel(selectedStep) ? (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{getBuiltInSourceLabel(selectedStep)}</span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">{getStepDescription(selectedStep)}</p>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">从流程主线中选择一个步骤，即可在左侧查看结构化字段并继续编辑。</p>
            )}
          </div>

          <div className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
            <p className="text-sm text-on-surface-variant">编排摘要</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <SummaryStat label="课程数" value={String(overview.courses.length)} />
              <SummaryStat label="课时数" value={String(overview.lessons.length)} />
              <SummaryStat label="引用资料" value={String(lesson?.materials.length ?? 0)} />
            </div>
          </div>

          <div className="mt-4 rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-on-surface">已编排步骤</p>
              <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant">{steps.length} 项</span>
            </div>
            <div className="mt-4 space-y-2">
              {steps.length > 0 ? steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setSelectedStepId(step.id)}
                  className={`flex w-full items-center gap-3 rounded-[1.25rem] px-4 py-3 text-left transition ${selectedStep?.id === step.id ? "bg-primary/8 text-primary" : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"}`}
                >
                  <span className={`grid size-9 place-items-center rounded-full text-sm font-semibold ${selectedStep?.id === step.id ? "bg-primary text-white" : "bg-surface-container-lowest text-primary"}`}>{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{step.title}</span>
                    <span className="mt-1 block text-xs text-on-surface-variant">{getBuiltInSourceLabel(step) ?? stepLabels[step.type]} · {step.rank}</span>
                  </span>
                </button>
              )) : (
                <p className="text-sm text-on-surface-variant">{overview.courses.length > 0 ? "新增内容、任务或测验后开始编排。" : "先创建课程，再开始编排步骤。"}</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FlowStepCard({
  step,
  index,
  selected,
  onSelect,
  onDuplicate,
  onArchive,
  onMoveUp,
  onMoveDown,
}: {
  step: LessonStepDTO;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const builtInSourceLabel = getBuiltInSourceLabel(step);

  return (
    <div className="relative ml-4 pb-6 pl-4 pt-4">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-surface-variant" />
      <div className={`absolute -left-[7px] top-8 size-4 rounded-full bg-surface ${selected ? "outline-2 outline-primary" : "outline-2 outline-outline-variant"}`} />
      <div className={`group relative overflow-hidden rounded-[1.5rem] p-4 transition ${selected ? "bg-surface-container-lowest shadow-ambient" : "bg-surface hover:bg-surface-container-lowest"}`}>
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${selected ? "bg-primary" : "bg-surface-variant group-hover:bg-primary/60"}`} />
        <button type="button" onClick={onSelect} className="flex w-full items-start gap-4 text-left">
          <span className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold ${selected ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant"}`}>{index + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-3">
              <span>
                <span className="block text-base font-semibold text-on-surface">{step.title}</span>
                <span className="mt-2 block text-sm text-on-surface-variant">{getStepDescription(step)}</span>
              </span>
              <span className="rounded-[0.8rem] bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant">{stepDurations[step.type]}</span>
            </span>
            <span className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-surface-container-high px-3 py-1 text-xs font-medium text-on-surface-variant">{stepLabels[step.type]}</span>
              {builtInSourceLabel ? (
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{builtInSourceLabel}</span>
              ) : null}
              <span className="inline-flex rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant">第 {index + 1} 步</span>
            </span>
          </span>
        </button>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onDuplicate} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-medium text-primary transition hover:bg-surface-container-high">复制</button>
          <button type="button" onClick={onMoveUp} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-medium text-primary transition hover:bg-surface-container-high">上移</button>
          <button type="button" onClick={onMoveDown} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-medium text-primary transition hover:bg-surface-container-high">下移</button>
          <button type="button" onClick={onArchive} className="rounded-full bg-[#fff1f2] px-3 py-2 text-xs font-medium text-[#b31b25] transition hover:bg-[#ffe1e4]">归档</button>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] bg-surface-container-low px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function getStepDescription(step: LessonStepDTO) {
  if (step.payload.type === "content") {
    return step.payload.body;
  }

  if (step.payload.type === "task") {
    return step.payload.prompt;
  }

  return step.payload.question;
}

function getBuiltInSourceLabel(step: LessonStepDTO) {
  return step.payload.builtInSource ? `内置环节 · ${step.payload.builtInSource.pluginName}` : null;
}

function getStepMinutes(type: LessonStepDTO["type"]) {
  if (type === "content") return 12;
  if (type === "task") return 15;
  return 8;
}
