"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, ClipboardCheck, Clock3, FileText, GripVertical, PencilLine, Save, Search, Sparkles, X } from "lucide-react";

import {
  addLessonStepAction,
  archiveLessonStepAction,
  duplicateLessonStepAction,
  reorderLessonStepAction,
} from "@/actions/lesson-authoring-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { dispatchLessonStepEditorCommand, lessonStepEditorSaveRequestEvent } from "@/components/authoring/editor-command-events";
import { LessonStepEditor } from "@/components/authoring/lesson-step-editor";
import {
  type BuiltInTeachingStepTemplatePayload,
} from "@/lib/dto/resource-ai";
import type {
  LessonEditorDTO,
  LessonStepDTO,
  TeacherAuthoringOverviewDTO,
  TeachingDesignFallbackReason,
} from "@/lib/dto/lesson-authoring";

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
const libraryFilters = [
  { id: "all", label: "全部" },
  { id: "generic", label: "普通步骤" },
  { id: "builtIn", label: "内置环节" },
] as const;

type LibraryFilter = (typeof libraryFilters)[number]["id"];

export function LessonAuthoringWorkspace({ overview, lesson, builtInTemplates }: LessonAuthoringWorkspaceProps) {
  const [selectedStepId, setSelectedStepId] = useState(lesson?.steps[0]?.id ?? null);
  const [isStepEditorOpen, setIsStepEditorOpen] = useState(false);
  const [resourceQuery, setResourceQuery] = useState("");
  const [activeLibraryFilter, setActiveLibraryFilter] = useState<LibraryFilter>("all");
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
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
  const normalizedResourceQuery = resourceQuery.trim().toLowerCase();
  const totalMinutes = steps.reduce((total, step) => total + getStepMinutes(step), 0);
  const builtInStepCount = steps.filter((step) => getBuiltInSourceLabel(step)).length;
  const filteredComposerActions = useMemo(() => {
    if (!normalizedResourceQuery) return stepComposerActions;

    return stepComposerActions.filter((action) => `${action.label} ${action.description}`.toLowerCase().includes(normalizedResourceQuery));
  }, [normalizedResourceQuery]);
  const filteredBuiltInTemplates = useMemo(() => {
    if (!normalizedResourceQuery) return orderedBuiltInTemplates;

    return orderedBuiltInTemplates.filter((template) => `${template.pluginName} ${template.title} ${template.summary}`.toLowerCase().includes(normalizedResourceQuery));
  }, [normalizedResourceQuery, orderedBuiltInTemplates]);

  useEffect(() => {
    if (steps.length === 0) {
      setSelectedStepId(null);
      setIsStepEditorOpen(false);
      return;
    }

    if (!selectedStepId || !steps.some((step) => step.id === selectedStepId)) {
      setSelectedStepId(steps[0]?.id ?? null);
    }
  }, [selectedStepId, steps]);

  useEffect(() => {
    if (!selectedStep) {
      setIsStepEditorOpen(false);
    }
  }, [selectedStep]);

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

  function openStepEditor(stepId: string) {
    setSelectedStepId(stepId);
    setIsStepEditorOpen(true);
  }

  function saveFlow() {
    const saveHandled = dispatchLessonStepEditorCommand(lessonStepEditorSaveRequestEvent);

    if (saveHandled) {
      setSaveFeedback("正在保存当前打开的教学环节。");
      return;
    }

    setSaveFeedback("流程中的新增、排序和删除改动已自动保存。");
  }

  return (
    <>
      <div className="mt-6 space-y-5">
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
        <div>
          <div className="relative" data-testid="lesson-flow-composer">
            <div className="mt-5 rounded-[1.75rem] bg-surface-container-low p-4 shadow-ambient">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" aria-hidden />
                <input
                  aria-label="搜索资源"
                  className="w-full rounded-full bg-surface-container-high py-3 pl-10 pr-4 text-sm text-on-surface outline-none transition focus-visible:outline-2 focus-visible:outline-primary/20"
                  placeholder="搜索资源..."
                  value={resourceQuery}
                  onChange={(event) => setResourceQuery(event.target.value)}
                />
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {libraryFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveLibraryFilter(filter.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${activeLibraryFilter === filter.id ? "bg-primary/10 text-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 max-h-[38rem] space-y-4 overflow-y-auto pr-1">
                {activeLibraryFilter !== "builtIn" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 px-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">普通步骤</p>
                      <span className="rounded-full bg-surface-container-lowest px-2.5 py-1 text-xs font-medium text-on-surface-variant">{filteredComposerActions.length} 项</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                    {filteredComposerActions.map((action) => {
                      const ActionIcon = action.icon;

                      return (
                         <ResourceLibraryTile
                           key={action.label}
                           title={action.label}
                           icon={<ActionIcon className="size-6" />}
                           accent={action.prominent ? "primary" : "neutral"}
                           onClick={() => addStep(action.type)}
                         />
                      );
                    })}
                    </div>
                  </div>
                ) : null}

                {activeLibraryFilter !== "generic" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 px-1">
                      <div>
                        <p className="text-sm font-semibold text-on-surface">内置教学环节</p>
                        <p className="mt-1 text-xs leading-5 text-on-surface-variant">系统内置节奏组件直接写入当前课时，后续仍可在属性编辑器里看到来源。</p>
                      </div>
                      <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-xs font-medium text-primary">{filteredBuiltInTemplates.length} 个可用环节</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                    {filteredBuiltInTemplates.map((template) => (
                      <ResourceLibraryTile
                         key={template.pluginId}
                         title={template.pluginName}
                         icon={<Sparkles className="size-6" />}
                         accent="neutral"
                         onClick={() => addBuiltInStep(template)}
                       />
                    ))}
                    </div>
                  </div>
                ) : null}

                {filteredComposerActions.length === 0 && filteredBuiltInTemplates.length === 0 ? (
                  <div className="rounded-[1.5rem] bg-surface-container-lowest px-4 py-6 text-center text-sm text-on-surface-variant">
                    当前筛选条件下没有匹配的资源，请尝试更换关键词或切换分类。
                  </div>
                ) : null}
              </div>

            </div>
          </div>
        </div>

        <Card className="relative overflow-hidden rounded-[var(--radius-shell)] bg-surface-container-lowest p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
               <div>
                 <div className="flex flex-wrap items-center gap-3">
                   <h3 className="text-2xl font-semibold tracking-[-0.02em] text-on-surface">流程主线</h3>
                   <span className="rounded-[0.9rem] bg-surface-container-high px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant">Lesson Flow</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">每个环节都按真实课时顺序落在同一条主线里，普通步骤与内置环节共享相同的编辑和排序上下文。</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-medium text-primary">总时长约 {totalMinutes} 分钟</span>
                <span className="rounded-full bg-secondary-container px-4 py-2 text-sm font-medium text-on-secondary-container">{steps.length} 个活动</span>
                <span className="rounded-full bg-surface-container-high px-4 py-2 text-sm font-medium text-on-surface-variant">{builtInStepCount} 个内置环节</span>
                <Button type="button" aria-label="保存流程修改" data-testid="lesson-flow-save-button" className="h-10 gap-2 px-4 text-sm" onClick={saveFlow}>
                  <Save className="size-4" aria-hidden />
                  保存
                </Button>
              </div>
            </div>
            {saveFeedback ? <p className="mt-3 text-sm text-on-surface-variant">{saveFeedback}</p> : null}

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
                      onEdit={() => openStepEditor(step.id)}
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

      </div>

      {isStepEditorOpen && selectedStep ? (
        <div
          className="fixed inset-0 z-50 bg-[rgba(12,15,16,0.32)] p-4 backdrop-blur-sm sm:p-6"
          data-testid="lesson-step-editor-modal"
          onClick={() => setIsStepEditorOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="编辑教学环节"
            aria-labelledby="lesson-step-editor-modal-title"
            className="relative mx-auto flex w-full max-w-[min(96vw,88rem)] overflow-hidden rounded-[1.5rem] bg-surface-container-lowest shadow-[0_24px_80px_rgba(25,30,40,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <Button variant="tertiary" className="absolute right-6 top-6 z-10 min-h-10 px-2 sm:right-8 sm:top-8" aria-label="关闭编辑环节" onClick={() => setIsStepEditorOpen(false)}>
                <X className="size-5" aria-hidden />
            </Button>

            <div className="min-h-0 flex-1 overflow-hidden">
              <LessonStepEditor key={selectedStep.id} step={selectedStep} className="h-full" onCancel={() => setIsStepEditorOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ResourceLibraryTile({
  title,
  icon,
  onClick,
  accent,
}: {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  accent: "primary" | "neutral";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-[1.35rem] p-3 text-center transition ${accent === "primary" ? "bg-primary text-white shadow-ambient hover:opacity-95" : "bg-surface-container-lowest text-on-surface hover:bg-surface"}`}
    >
      <span className={`grid size-14 shrink-0 place-items-center rounded-[1.2rem] ${accent === "primary" ? "bg-white/18 text-white" : "bg-surface-container-low text-primary"}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className={`line-clamp-2 block text-sm font-semibold leading-5 ${accent === "primary" ? "text-white" : "text-on-surface"}`}>{title}</span>
      </span>
    </button>
  );
}

function FlowStepCard({
  step,
  index,
  selected,
  onSelect,
  onEdit,
  onDuplicate,
  onArchive,
  onMoveUp,
  onMoveDown,
}: {
  step: LessonStepDTO;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const builtInSourceLabel = getBuiltInSourceLabel(step);
  const teachingDesignCue = getTeachingDesignCue(step.teachingDesignFallbackReason);
  const evidencePrompt = step.payload.teachingDesign?.evidenceExpectation?.prompt;

  return (
    <div className="relative ml-4 pb-6 pl-4 pt-4">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-surface-variant" />
      <div className={`absolute -left-[7px] top-8 size-4 rounded-full bg-surface ${selected ? "outline-2 outline-primary" : "outline-2 outline-outline-variant"}`} />
      <div className={`group relative overflow-hidden rounded-[1.5rem] p-4 transition ${selected ? "bg-surface-container-lowest shadow-ambient" : "bg-surface hover:bg-surface-container-lowest"}`}>
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${selected ? "bg-primary" : "bg-surface-variant group-hover:bg-primary/60"}`} />
        <button type="button" onClick={onSelect} className="flex w-full items-start gap-4 text-left">
          <span className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold ${selected ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant"}`}>{index + 1}</span>
          <span className="min-w-0 flex flex-1 flex-col">
            <span>
              <span className="block text-base font-semibold text-on-surface">{step.title}</span>
              <span className="mt-2 block text-sm text-on-surface-variant">{getStepDescription(step)}</span>
            </span>
            <span className="mt-3 flex flex-wrap gap-3">
              <span
                role="group"
                aria-label="预计时长"
                className="inline-flex shrink-0 items-center gap-2 rounded-[1rem] bg-surface-container px-3 py-2 text-sm text-on-surface shadow-[inset_0_0_0_1px_rgba(116,132,153,0.08)]"
              >
                <Clock3 className="size-4 text-primary" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">预计时长</span>
                <span className="text-sm font-semibold text-on-surface">{getStepMinutes(step)} 分钟</span>
              </span>
            </span>
            <span className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-surface-container-high px-3 py-1 text-xs font-medium text-on-surface-variant">{stepLabels[step.type]}</span>
              {builtInSourceLabel ? (
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{builtInSourceLabel}</span>
              ) : null}
              {step.teachingDesignStatus !== "explicit" ? (
                <span className="inline-flex rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container">默认推断</span>
              ) : null}
              {step.needsTeachingDesignRefinement ? (
                <span className="inline-flex rounded-full bg-[#fff4cc] px-3 py-1 text-xs font-semibold text-[#8a6200]">待完善</span>
              ) : null}
              <span className="inline-flex rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant">第 {index + 1} 步</span>
            </span>
            {step.teachingDesignStatus !== "explicit" ? (
              <span className="mt-3 block rounded-[1rem] bg-surface-container-low px-3 py-3 text-xs leading-6 text-on-surface-variant">
                <span className="font-semibold text-on-surface">默认推断：</span>
                {teachingDesignCue}，当前仍可继续编辑与发布。
                {evidencePrompt ? <span className="mt-1 block">证据期待：{evidencePrompt}</span> : null}
              </span>
            ) : null}
          </span>
        </button>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary/90">
            <PencilLine className="size-3.5" aria-hidden />
            编辑组件
          </button>
          <button type="button" onClick={onDuplicate} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-medium text-primary transition hover:bg-surface-container-high">复制</button>
          <button type="button" onClick={onMoveUp} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-medium text-primary transition hover:bg-surface-container-high">上移</button>
          <button type="button" onClick={onMoveDown} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-medium text-primary transition hover:bg-surface-container-high">下移</button>
          <button type="button" onClick={onArchive} className="rounded-full bg-[#fff1f2] px-3 py-2 text-xs font-medium text-[#b31b25] transition hover:bg-[#ffe1e4]">删除</button>
        </div>
      </div>
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

function getTeachingDesignCue(reason: TeachingDesignFallbackReason | null) {
  if (reason === "partial-teaching-design") {
    return "系统按当前环节已有字段补齐缺失的教学设计";
  }

  return "系统按旧版环节补齐教学设计";
}

function getStepMinutes(step: LessonStepDTO) {
  if (step.payload.teachingDesign?.estimatedMinutes) {
    return step.payload.teachingDesign.estimatedMinutes;
  }

  if (step.type === "content") return 12;
  if (step.type === "task") return 15;
  return 8;
}
