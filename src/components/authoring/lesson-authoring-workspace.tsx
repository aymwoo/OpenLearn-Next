"use client";

import { useMemo, useState } from "react";
import { BookOpenText, CirclePlay, ClipboardCheck, FileText, GripVertical, Plus, Sparkles } from "lucide-react";

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

const stepDurations = {
  content: "12 min",
  task: "15 min",
  quiz: "8 min",
} as const;

const resourceTemplates = [
  {
    id: "resource-video",
    title: "概念引入动画",
    meta: "视频 · 03:45",
    type: "content" as const,
    accent: "text-primary",
    icon: CirclePlay,
    ghost: false,
  },
  {
    id: "resource-reading",
    title: "知识精讲 - 核心概念",
    meta: "文档 · 12 页",
    type: "content" as const,
    accent: "text-primary",
    icon: FileText,
    ghost: true,
  },
  {
    id: "resource-task",
    title: "课堂练习任务",
    meta: "任务 · 文本提交",
    type: "task" as const,
    accent: "text-secondary",
    icon: BookOpenText,
    ghost: false,
  },
  {
    id: "resource-quiz",
    title: "互动巩固小测",
    meta: "测验 · 5 题",
    type: "quiz" as const,
    accent: "text-tertiary",
    icon: ClipboardCheck,
    ghost: false,
  },
] as const;

const resourceFilters = ["全部", "视频", "习题", "文档"] as const;

export function LessonAuthoringWorkspace({ overview, lesson }: LessonAuthoringWorkspaceProps) {
  const [selectedStepId, setSelectedStepId] = useState(lesson?.steps[0]?.id ?? null);
  const [activeResourceId, setActiveResourceId] = useState<string>(resourceTemplates[0].id);
  const steps = useMemo(() => lesson?.steps.filter((step) => !step.archivedAt) ?? [], [lesson?.steps]);
  const selectedStep = useMemo(
    () => steps.find((step) => step.id === selectedStepId) ?? steps[0] ?? null,
    [selectedStepId, steps]
  );
  const activeResource = resourceTemplates.find((resource) => resource.id === activeResourceId) ?? resourceTemplates[0];
  const dropIndex = steps.length > 1 ? 1 : steps.length;
  const totalMinutes = steps.reduce((total, step) => total + getStepMinutes(step.type), 0);

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
    <div className="mt-6 space-y-5">
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
        <Card className="relative overflow-hidden rounded-[var(--radius-shell)] bg-surface-container-lowest p-5">
          <div className="absolute inset-x-0 top-0 h-24 bg-linear-135 from-primary/10 to-primary-container/20" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-on-surface-variant">资源库</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-on-surface">课堂组件</h3>
              </div>
              <button type="button" className="rounded-full bg-surface-container-low p-3 text-on-surface-variant transition hover:text-primary">
                <Sparkles className="size-5" />
              </button>
            </div>

            <div className="mt-5 rounded-[1.5rem] bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
              <span className="inline-flex min-h-10 w-full items-center rounded-[1rem] bg-surface-container-lowest px-4">搜索资源、模板或教学活动</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {resourceFilters.map((filter, index) => (
                <span
                  key={filter}
                  className={index === 0 ? "rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary" : "rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant"}
                >
                  {filter}
                </span>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {resourceTemplates.map((resource) => {
                const ResourceIcon = resource.icon;
                const active = resource.id === activeResource.id;

                return (
                  <button
                    key={resource.id}
                    type="button"
                    onClick={() => setActiveResourceId(resource.id)}
                    className={`group flex w-full items-center gap-3 rounded-[1.5rem] p-4 text-left transition ${resource.ghost ? "border border-dashed border-outline-variant/40 bg-surface-container-low opacity-45 grayscale" : active ? "bg-surface shadow-ambient" : "bg-surface-container-low hover:bg-surface"}`}
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-[1rem] bg-surface-container-high text-on-surface-variant">
                      <ResourceIcon className={`size-5 ${resource.accent}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-semibold ${active ? "text-primary" : "text-on-surface"}`}>{resource.title}</span>
                      <span className="mt-1 block text-xs text-on-surface-variant">{resource.meta}</span>
                    </span>
                    <GripVertical className={`size-4 shrink-0 ${active ? "text-primary/60" : "text-on-surface-variant/60 group-hover:text-on-surface-variant"}`} />
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" className="min-h-10 px-4 text-sm" onClick={() => addStep("content")}>
                <Plus className="mr-2 size-4" />新增内容
              </Button>
              <Button type="button" variant="secondary" className="min-h-10 px-4 text-sm" onClick={() => addStep("task")}>新增任务</Button>
              <Button type="button" variant="secondary" className="min-h-10 px-4 text-sm" onClick={() => addStep("quiz")}>新增测验</Button>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-[var(--radius-shell)] bg-surface-container-lowest p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl font-semibold tracking-[-0.02em] text-on-surface">教学流程</h3>
                <span className="rounded-[0.9rem] bg-surface-container-high px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant">Module 1</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">围绕导入、讲授、练习与总结组织节奏，拖拽态用于预演素材将如何插入课堂主线。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-medium text-primary">总时长约 {totalMinutes} 分钟</span>
              <span className="rounded-full bg-secondary-container px-4 py-2 text-sm font-medium text-on-secondary-container">{steps.length} 个活动</span>
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
                  {index === dropIndex ? <DropPreview title={activeResource.title} /> : null}
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
                <DropPreview title={activeResource.title} empty />
              ) : null}

              {steps.length <= dropIndex ? <DropPreview title={activeResource.title} /> : null}
            </div>

            <div className="relative flex items-center gap-4 pt-4">
              <div className="absolute left-[1rem] bottom-full h-8 w-0.5 bg-surface-variant" />
              <span className="grid size-9 place-items-center rounded-full bg-surface-container-high text-on-surface-variant shadow-ambient">止</span>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-on-surface-variant">课程结束</p>
            </div>

            <div className="pointer-events-none absolute right-8 top-28 hidden w-72 -rotate-2 rounded-[1.5rem] border border-primary/20 bg-surface/85 p-4 shadow-[0_24px_64px_rgba(44,47,49,0.12)] backdrop-blur-xl xl:flex xl:items-center xl:gap-3">
              <span className="grid size-12 place-items-center rounded-[1rem] bg-surface-container-high text-primary">
                <GripVertical className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-primary">{activeResource.title}</span>
                <span className="mt-1 block text-xs text-on-surface-variant">{activeResource.meta}</span>
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <LessonStepEditor key={selectedStep?.id ?? "empty-step"} step={selectedStep} />
        <Card className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-none">
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
                    <span className="mt-1 block text-xs text-on-surface-variant">{stepLabels[step.type]} · {step.rank}</span>
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
  return (
    <div className="relative ml-4 border-l-2 border-surface-variant pb-6 pl-4 pt-4">
      <div className={`absolute -left-[9px] top-8 size-4 rounded-full border-2 bg-surface ${selected ? "border-primary" : "border-outline-variant"}`} />
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
            <span className="mt-3 inline-flex rounded-full bg-surface-container-high px-3 py-1 text-xs font-medium text-on-surface-variant">{stepLabels[step.type]}</span>
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

function DropPreview({ title, empty = false }: { title: string; empty?: boolean }) {
  return (
    <div className="relative ml-4 border-l-2 border-primary/30 py-4 pl-4">
      <div className="absolute -left-[9px] top-0 size-4 rounded-full border-2 border-primary/30 bg-surface" />
      <div className="absolute -left-[9px] bottom-0 size-4 rounded-full border-2 border-primary/30 bg-surface" />
      <div className="relative flex h-32 flex-col items-center justify-center gap-2 overflow-hidden rounded-[1.5rem] border-2 border-dashed border-primary bg-primary/5 px-6 text-center text-primary">
        <div className="absolute inset-0 bg-linear-to-r from-primary/0 via-primary/5 to-primary/0" />
        <GripVertical className="relative size-8 opacity-80" />
        <span className="relative text-sm font-semibold tracking-[0.06em]">{empty ? `从左侧选择组件开始编排` : `松开放置 “${title}”`}</span>
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

function getStepMinutes(type: LessonStepDTO["type"]) {
  if (type === "content") return 12;
  if (type === "task") return 15;
  return 8;
}
