"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Layers3,
  MonitorUp,
  Settings2,
  Sparkles,
  TimerReset,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LessonEditorHeaderActions } from "@/components/authoring/lesson-editor-header-actions";
import { LessonAuthoringWorkspace } from "@/components/authoring/lesson-authoring-workspace";
import { surfaceWidths } from "@/components/surfaces/surface-widths";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import type {
  LessonDraftReviewDTO,
  LessonEditorDTO,
  TeacherAuthoringOverviewDTO,
} from "@/lib/dto/lesson-authoring";
import type { BuiltInTeachingStepTemplatePayload, ThemeRegistryDTO } from "@/lib/dto/resource-ai";
import { cn } from "@/lib/utils";

type BuiltInTemplateForAuthoring = BuiltInTeachingStepTemplatePayload & {
  id: string;
  pluginId: string;
};

type LessonEditorSurfaceProps = {
  overview: TeacherAuthoringOverviewDTO;
  lesson: LessonEditorDTO | null;
  builtInTemplates: BuiltInTemplateForAuthoring[];
  themes: ThemeRegistryDTO[];
  activeThemeId: string | null;
  pluginSlot?: React.ReactNode;
  mode?: string;
  draftReview?: LessonDraftReviewDTO | null;
};

export function LessonEditorSurface({
  overview,
  lesson,
  builtInTemplates,
  themes,
  activeThemeId,
  pluginSlot,
  mode,
  draftReview,
}: LessonEditorSurfaceProps) {
  const [showDiscoveryPrompt, setShowDiscoveryPrompt] = useState(true);
  const activeCourse = lesson?.course ?? overview.courses[0];
  const activeLesson = lesson?.lesson ?? overview.lessons[0];
  const steps = lesson?.steps ?? [];
  const activeStepCount = steps.filter((step) => !step.archivedAt).length;
  const builtInStepCount = steps.filter((step) => step.payload.builtInSource).length;
  const previewHref = lesson ? `/teacher/editor/preview?courseId=${lesson.course.id}&lessonId=${lesson.lesson.id}` : null;
  const isReviewMode = mode === "review";
  const hasDraft = draftReview?.hasPendingDraft === true;
  const pendingDraftChangedCount =
    draftReview?.diffRows.filter((r) => r.state !== "unchanged").length ?? 0;
  const editUrl = lesson
    ? `/teacher/editor?courseId=${lesson.course.id}&lessonId=${lesson.lesson.id}`
    : "/teacher/editor";
  const reviewUrl = lesson
    ? `/teacher/editor?courseId=${lesson.course.id}&lessonId=${lesson.lesson.id}&mode=review`
    : "/teacher/editor?mode=review";
  const preparationStatus = lesson
    ? lesson.preparationSummary.blockingIssues.length > 0
      ? "阻断项待处理"
      : lesson.preparationSummary.attentionIssues.length > 0
        ? "需关注"
        : lesson.preparationSummary.advisoryIssues.length > 0
          ? "建议完善"
          : "可进入开课准备"
    : null;

  return (
    <div className={cn(surfaceWidths.workspace, teacherSurfaceRhythm.stack, "flex flex-col pb-12 pt-3")}>
      {/* Mobile warning */}
      <div className="lg:hidden rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient">
        <div className="flex items-center gap-3">
          <MonitorUp className="size-5 text-primary" aria-hidden />
          <p className="text-sm font-semibold">建议使用桌面端编辑，当前为可读预览</p>
        </div>
      </div>

      {/* Compact Header Bar */}
      <section className={cn(teacherSurfaceRhythm.hero, "rounded-none")}>
        <div className="space-y-5">
          <div className={surfaceWidths.heroTitle}>
            <Badge variant="accent" className="bg-surface-container-lowest text-primary">
              课时编排
            </Badge>
            <h1 className="mt-4 text-[2.2rem] font-semibold tracking-[-0.03em] text-on-surface sm:text-[2.65rem]">
              在同一教师工作链里完成备课、预览与开课准备
            </h1>
            <p className={cn(surfaceWidths.heroBody, "mt-3 text-sm leading-7 text-on-surface-variant sm:text-base")}>
              editor 继续保持 workspace-first posture。这里负责组织步骤、资料和发布状态，不把趋势分析挤进备课主舞台。
            </p>
          </div>

          <div className="rounded-[calc(var(--radius-shell)-0.25rem)] bg-surface-container-lowest px-5 py-4 sm:px-6">
          {/* Row 1: Title + Actions */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold tracking-[-0.02em] text-on-surface sm:text-2xl">
                  {activeLesson?.title ?? "课堂教学活动编排"}
                </h2>
                <Badge variant="accent" className="shrink-0">
                  {activeCourse?.subject ?? "课程"}
                </Badge>
                <Badge variant="default" className="shrink-0 bg-surface-container-low">
                  第 {activeLesson?.revision ?? 0} 次修订
                </Badge>
                <Badge variant="success" className="shrink-0">草稿</Badge>
              </div>
              {activeLesson?.objective ? (
                <p className="mt-1.5 text-sm leading-6 text-on-surface-variant line-clamp-1">
                  {activeLesson.objective}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Inline metrics as pills */}
              <MetricPill
                icon={<Layers3 className="size-3.5" />}
                label="步骤"
                value={String(activeStepCount)}
              />
              <MetricPill
                icon={<Sparkles className="size-3.5" />}
                label="班级"
                value={String(activeCourse?.classLabels.length ?? 0)}
              />
              <MetricPill
                icon={<Settings2 className="size-3.5" />}
                label="资料"
                value={String(lesson?.materials.length ?? 0)}
              />
              <MetricPill
                icon={<TimerReset className="size-3.5" />}
                label="时长"
                value="~45 min"
              />
              {lesson?.publishState.latestVersion ? (
                <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                  已发布 v{lesson.publishState.latestVersion}
                </span>
              ) : null}
              {preparationStatus ? (
                <span className="rounded-full bg-surface-container-high px-3 py-1.5 text-xs font-semibold text-on-surface">
                  开课前摘要：{preparationStatus}
                </span>
              ) : null}

              {/* Separator */}
              <span className="hidden xl:block h-6 w-px bg-surface-variant/50" aria-hidden />

              {/* Segmented mode switch: 编辑 | 审校 */}
              <div className="flex rounded-[var(--radius-card)] bg-surface-container-low p-1 gap-1">
                <Link
                  href={editUrl}
                  replace
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${!isReviewMode ? "bg-surface-container-lowest shadow-ambient text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}
                >
                  编辑
                </Link>
                <Link
                  href={reviewUrl}
                  replace
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition flex items-center gap-1.5 ${isReviewMode ? "bg-surface-container-lowest shadow-ambient text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}
                >
                  审校
                  {hasDraft ? (
                    <span className="inline-flex items-center justify-center rounded-full bg-tertiary-container/70 text-tertiary text-xs font-semibold min-w-[1.25rem] h-5 px-1.5">
                      {pendingDraftChangedCount}
                    </span>
                  ) : null}
                </Link>
              </div>

              <span className="hidden xl:block h-6 w-px bg-surface-variant/50" aria-hidden />

              <LessonEditorHeaderActions
                lesson={lesson}
                activeCourse={activeCourse}
                activeStepCount={activeStepCount}
                builtInStepCount={builtInStepCount}
                previewHref={previewHref}
                themes={themes}
                activeThemeId={activeThemeId}
                pluginSlot={pluginSlot}
              />
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Glass discovery prompt — appears in edit mode when unreviewed AI draft exists */}
      {!isReviewMode && hasDraft && showDiscoveryPrompt ? (
        <div className="mx-auto w-full max-w-[1360px] rounded-2xl bg-surface/85 backdrop-blur-xl px-6 py-4 shadow-ambient flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-primary" aria-hidden />
            <span className="text-sm text-on-surface">AI 已生成草稿</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={reviewUrl}
              replace
              className="text-sm font-semibold text-primary hover:underline"
            >
              点击审校 →
            </Link>
            <button
              type="button"
              onClick={() => setShowDiscoveryPrompt(false)}
              className="p-1 text-on-surface-variant hover:text-on-surface transition"
              aria-label="关闭提示"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Full-width Authoring Workspace */}
      <section className={cn(teacherSurfaceRhythm.section, "flex-1 overflow-hidden")}>
        <LessonAuthoringWorkspace
          overview={overview}
          lesson={lesson}
          builtInTemplates={builtInTemplates}
          mode={mode}
          draftReview={draftReview}
        />
      </section>
    </div>
  );
}

/** Inline metric pill for the compact header */
function MetricPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-xs font-medium text-on-surface-variant">
      <span className="text-primary">{icon}</span>
      {label}
      <span className="font-semibold text-on-surface">{value}</span>
    </span>
  );
}
