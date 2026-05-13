import {
  Layers3,
  MonitorUp,
  Settings2,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LessonEditorHeaderActions } from "@/components/authoring/lesson-editor-header-actions";
import { LessonAuthoringWorkspace } from "@/components/authoring/lesson-authoring-workspace";
import type {
  LessonEditorDTO,
  TeacherAuthoringOverviewDTO,
} from "@/lib/dto/lesson-authoring";
import type { BuiltInTeachingStepTemplatePayload, ThemeRegistryDTO } from "@/lib/dto/resource-ai";

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
};

export function LessonEditorSurface({
  overview,
  lesson,
  builtInTemplates,
  themes,
  activeThemeId,
  pluginSlot,
}: LessonEditorSurfaceProps) {
  const activeCourse = lesson?.course ?? overview.courses[0];
  const activeLesson = lesson?.lesson ?? overview.lessons[0];
  const steps = lesson?.steps ?? [];
  const activeStepCount = steps.filter((step) => !step.archivedAt).length;
  const builtInStepCount = steps.filter((step) => step.payload.builtInSource).length;
  const previewHref = lesson ? `/teacher/editor/preview?courseId=${lesson.course.id}&lessonId=${lesson.lesson.id}` : null;
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
    <div className="flex flex-col gap-3">
      {/* Mobile warning */}
      <div className="lg:hidden rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient">
        <div className="flex items-center gap-3">
          <MonitorUp className="size-5 text-primary" aria-hidden />
          <p className="text-sm font-semibold">建议使用桌面端编辑，当前为可读预览</p>
        </div>
      </div>

      {/* Compact Header Bar */}
      <section className="rounded-[var(--radius-shell)] bg-surface-container-low shadow-ambient">
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
      </section>

      {/* Full-width Authoring Workspace */}
      <section className="flex-1 rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient overflow-hidden">
        <LessonAuthoringWorkspace
          overview={overview}
          lesson={lesson}
          builtInTemplates={builtInTemplates}
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
