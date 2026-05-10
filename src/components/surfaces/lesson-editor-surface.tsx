import Link from "next/link";
import {
  Layers3,
  MonitorUp,
  Settings2,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AuthoringStatusPanel } from "@/components/authoring/authoring-status-panel";
import { LessonAuthoringWorkspace } from "@/components/authoring/lesson-authoring-workspace";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import type {
  LessonEditorDTO,
  TeacherAuthoringOverviewDTO,
} from "@/lib/dto/lesson-authoring";
import type { BuiltInTeachingStepTemplatePayload } from "@/lib/dto/resource-ai";
import { cn } from "@/lib/utils";

type BuiltInTemplateForAuthoring = BuiltInTeachingStepTemplatePayload & {
  id: string;
  pluginId: string;
};

type LessonEditorSurfaceProps = {
  overview: TeacherAuthoringOverviewDTO;
  lesson: LessonEditorDTO | null;
  builtInTemplates: BuiltInTemplateForAuthoring[];
};

export function LessonEditorSurface({
  overview,
  lesson,
  builtInTemplates,
}: LessonEditorSurfaceProps) {
  const activeCourse = lesson?.course ?? overview.courses[0];
  const activeLesson = lesson?.lesson ?? overview.lessons[0];
  const steps = lesson?.steps ?? [];
  const activeStepCount = steps.filter((step) => !step.archivedAt).length;
  const builtInStepCount = steps.filter((step) => step.payload.builtInSource).length;
  const previewHref = lesson ? `/teacher/editor/preview?courseId=${lesson.course.id}&lessonId=${lesson.lesson.id}` : null;

  return (
    <div className={teacherSurfaceRhythm.stack}>
      <section className={teacherSurfaceRhythm.sectionCompact + " lg:hidden"}>
        <div className="flex items-center gap-3">
          <MonitorUp className="size-6 text-primary" aria-hidden />
          <p className="font-semibold">建议使用桌面端编辑，当前为可读预览</p>
        </div>
      </section>

      <section className={teacherSurfaceRhythm.section}>
        <div className={teacherSurfaceRhythm.heroInset}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="accent">
                  {activeCourse?.subject ?? "课程"}
                </Badge>
                <Badge variant="default" className="bg-surface-container-low">
                  第 {activeLesson?.revision ?? 0} 次修订
                </Badge>
                <Badge variant="success">草稿仅教师可见</Badge>
              </div>
              <h2 className="mt-4 text-[2.2rem] font-semibold leading-tight tracking-[-0.03em] text-on-surface">
                {activeLesson?.title ?? "课堂教学活动编排"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant sm:text-base">
                {activeLesson?.objective ??
                  "创建第一个课时后，可以在这里围绕导入、讲授、互动与总结编排课堂主线。"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {previewHref ? (
                <Button asChild variant="secondary" className="min-h-10 px-4 text-sm">
                  <Link href={previewHref}>预览课堂</Link>
                </Button>
              ) : (
                <Button variant="secondary" className="min-h-10 px-4 text-sm" disabled>
                  预览课堂
                </Button>
              )}
              <Button className="min-h-10 px-4 text-sm">发布当前版本</Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <EditorMetric
              label="步骤总数"
              value={String(activeStepCount)}
              icon={<Layers3 className="size-4" />}
            />
            <EditorMetric
              label="关联班级"
              value={String(activeCourse?.classLabels.length ?? 0)}
              icon={<Sparkles className="size-4" />}
            />
            <EditorMetric
              label="引用资料"
              value={String(lesson?.materials.length ?? 0)}
              icon={<Settings2 className="size-4" />}
            />
            <EditorMetric
              label="预计时长"
              value="45 分钟"
              icon={<TimerReset className="size-4" />}
            />
          </div>
        </div>

        <div className="mt-4 xl:grid xl:grid-cols-[280px_minmax(0,1fr)_300px] xl:gap-4">
          <aside className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-lowest p-5">
            <div
              className={cn(
                teacherSurfaceRhythm.card,
                "bg-surface-container-low p-4",
              )}
            >
              <p className="text-sm text-on-surface-variant">课时列表</p>
              <div className="mt-3 space-y-2">
                {overview.lessons.length > 0 ? (
                  overview.lessons.map((item) => (
                    <button
                      key={item.id}
                      className={cn(
                        teacherSurfaceRhythm.card,
                        `w-full px-4 py-3 text-left ${activeLesson?.id === item.id ? "bg-primary/8 text-primary" : "bg-surface-container-lowest text-on-surface"}`,
                      )}
                    >
                      <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                        Lesson
                      </span>
                      <span className="mt-2 block font-semibold">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-sm text-on-surface-variant">
                        修订 {item.revision} · {item.stepCount} 个步骤
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-on-surface-variant">
                    还没有课时草稿
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-on-surface-variant">步骤编排</p>
                <Badge className="bg-surface-container-low text-on-surface-variant">
                  {activeStepCount} 个有效步骤
                </Badge>
              </div>
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  className={cn(
                    teacherSurfaceRhythm.card,
                    "w-full bg-surface-container-low p-4 text-left",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-surface-container-lowest text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <h2 className="font-semibold">{step.title}</h2>
                      <p className="text-sm text-on-surface-variant">
                        {step.type === "content"
                          ? "内容"
                          : step.type === "task"
                            ? "任务"
                            : "测验"}{" "}
                        · {step.rank}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <Card
              className={cn(
                teacherSurfaceRhythm.card,
                "mt-4 bg-surface-container-low p-5 text-center text-sm text-on-surface-variant shadow-none",
              )}
            >
              将新的课堂步骤放在这里
            </Card>
          </aside>

          <main className="mt-4 min-w-0 rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-lowest p-5 xl:mt-0">
            <div className="flex flex-col gap-5">
              <div
                className={cn(
                  teacherSurfaceRhythm.card,
                  "bg-surface-container-low p-5",
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm text-on-surface-variant">
                      当前编排焦点
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-on-surface">
                      {activeStepCount > 0
                        ? `${activeStepCount} 个有效步骤`
                        : "等待新增第一个步骤"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      保持导入、讲授、练习、总结的节奏层级，让课堂运行页能够直接读取同样的结构。
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button className="min-h-10 px-4 text-sm">新增步骤</Button>
                    <Button
                      variant="tertiary"
                      className="min-h-10 px-2 text-sm"
                    >
                      整理结构
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <LessonAuthoringWorkspace
              overview={overview}
              lesson={lesson}
              builtInTemplates={builtInTemplates}
            />
          </main>

          <aside className="mt-4 rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-lowest p-5 xl:mt-0">
            <div className="flex items-center gap-3">
              <Settings2 className="size-6 text-primary" aria-hidden />
              <h2 className="text-2xl font-semibold">设置面板</h2>
            </div>
            <div className="mt-6 space-y-3">
              <MetaRow
                label="班级"
                value={activeCourse?.classLabels.join("、") || "未绑定"}
              />
              <MetaRow
                label="预览摘要"
                value={`当前草稿含 ${activeStepCount} 个步骤，其中 ${builtInStepCount} 个内置环节`}
              />
              <MetaRow
                label="资源"
                value={`${lesson?.materials.length ?? 0} 个引用材料`}
              />
              <MetaRow
                label="发布状态"
                value={
                  lesson?.publishState.latestVersion
                    ? `第 ${lesson.publishState.latestVersion} 版 · 学生将读取已发布版本`
                    : "草稿仅教师可见"
                }
              />
            </div>
            <div
              className={cn(
                teacherSurfaceRhythm.card,
                "mt-6 bg-surface-container-low p-5",
              )}
            >
              <p className="text-sm text-on-surface-variant">发布前检查</p>
              <p className="mt-2 text-sm leading-7 text-on-surface">
                发布课时前，请先查看结构化阻断项、预览摘要和保存反馈；当前发布状态与服务端 readiness contract 保持一致。
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button className="min-h-10 px-4 text-sm" disabled={!lesson?.publishState.canPublish}>发布当前版本</Button>
                <Button variant="secondary" className="min-h-10 px-4 text-sm" disabled>
                  保存草稿
                </Button>
              </div>
            </div>
            <div
              className={cn(
                teacherSurfaceRhythm.card,
                "mt-6 bg-surface-container-low p-5",
              )}
            >
              <p className="text-sm text-on-surface-variant">预览课堂</p>
              <h3 className="mt-2 text-lg font-semibold text-on-surface">当前草稿预览入口</h3>
              <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                预览会展示当前步骤顺序、内置环节来源和引用材料摘要，不会进入学生运行时或读取课堂实时状态。
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MetaRow label="有效步骤" value={`${activeStepCount} 个`} />
                <MetaRow label="内置环节" value={`${builtInStepCount} 个`} />
                <MetaRow label="引用资料" value={`${lesson?.materials.length ?? 0} 项`} />
              </div>
              <div className="mt-4">
                {previewHref ? (
                  <Button asChild variant="secondary" className="min-h-10 px-4 text-sm">
                    <Link href={previewHref}>打开课堂预览</Link>
                  </Button>
                ) : (
                  <Button variant="secondary" className="min-h-10 px-4 text-sm" disabled>
                    打开课堂预览
                  </Button>
                )}
              </div>
            </div>
            <AuthoringStatusPanel lesson={lesson} />
            <span className="sr-only">已自动保存 检测到更新冲突</span>
          </aside>
        </div>
      </section>
    </div>
  );
}

function EditorMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.35rem] bg-surface-container-low px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
        <span className="rounded-full bg-surface-container-lowest p-2 text-primary">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-3 text-[1.45rem] font-semibold text-on-surface">
        {value}
      </p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low p-4")}
    >
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-2 text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}
