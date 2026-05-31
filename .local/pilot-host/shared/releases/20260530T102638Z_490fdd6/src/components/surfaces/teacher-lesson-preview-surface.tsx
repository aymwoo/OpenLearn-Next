import Link from "next/link";
import { BookOpenCheck, Eye, Layers3, LibraryBig } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StageHero } from "@/components/surfaces/stage-hero";
import { RuntimeHostClient } from "@/features/runtime-platform/host";
import type { TeacherLessonPreviewDTO } from "@/lib/dto/lesson-authoring";

type TeacherLessonPreviewSurfaceProps = {
  preview: TeacherLessonPreviewDTO;
};

export function TeacherLessonPreviewSurface({ preview }: TeacherLessonPreviewSurfaceProps) {
  const activeSteps = preview.steps.length;
  const builtInSteps = preview.steps.filter((step) => step.builtInSourceLabel).length;
  const inferredSteps = preview.steps.filter((step) => step.teachingDesignStatus !== "explicit").length;

  return (
    <div className="space-y-5 p-4 sm:p-5 lg:p-6">
      <StageHero
        badge="课堂预览"
        title={preview.lesson.title}
        description={preview.lesson.objective}
        meta={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="accent" className="bg-white/10 text-white">教师草稿预览</Badge>
            <Badge className="bg-white/8 text-white/80">不包含学生进度与课堂运行态</Badge>
          </div>
        }
        aside={
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <PreviewMetric icon={<Layers3 className="size-4" aria-hidden />} label="步骤数量" value={String(activeSteps)} detail="按当前草稿顺序呈现" />
            <PreviewMetric icon={<Eye className="size-4" aria-hidden />} label="内置环节" value={String(builtInSteps)} detail="保留步骤来源 badge" />
            <PreviewMetric icon={<LibraryBig className="size-4" aria-hidden />} label="默认推断" value={String(inferredSteps)} detail="需要教师后续完善的环节" />
          </div>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient">
          <div className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
            <p className="text-sm text-on-surface-variant">预览说明</p>
            <p className="mt-3 text-sm leading-7 text-on-surface">
              当前页面只预览教师草稿的课堂流程，不读取学生端 progress、SSE runtime 或课堂锁定状态。
            </p>
            <p className="mt-3 rounded-[1rem] bg-surface-container-low px-4 py-3 text-sm leading-6 text-on-surface-variant">
              若看到<span className="font-semibold text-on-surface">默认推断</span>或<span className="font-semibold text-on-surface">待完善</span>，表示系统按旧版环节补齐教学设计；本期不会阻断教师继续编辑或预览。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild variant="secondary" className="min-h-10 px-4 text-sm">
                <Link href={`/teacher/editor?courseId=${preview.course.id}&lessonId=${preview.lesson.id}`}>返回继续编辑</Link>
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-on-surface">步骤顺序</p>
              <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant">{activeSteps} 项</span>
            </div>
            <div className="mt-4 space-y-2">
              {preview.steps.map((step, index) => (
                <div key={step.id} className="rounded-[1.25rem] bg-surface-container-low px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-container-lowest text-sm font-semibold text-primary">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-on-surface">{step.title}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{getStepTypeLabel(step.type)} · {step.rank}</p>
                      {step.builtInSourceLabel ? (
                        <span className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">内置环节 · {step.builtInSourceLabel}</span>
                      ) : null}
                      {step.teachingDesignStatus !== "explicit" ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container">默认推断</span>
                          {step.needsTeachingDesignRefinement ? (
                            <span className="inline-flex rounded-full bg-[#fff4cc] px-3 py-1 text-xs font-semibold text-[#8a6200]">待完善</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          {preview.steps.map((step, index) => {
            const inlineMaterials = "materialRefs" in step.payload ? step.payload.materialRefs : [];

            return (
              <Card key={step.id} className="bg-surface-container-lowest p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default" className="bg-surface-container-low">第 {index + 1} 步</Badge>
                      <Badge variant="default" className="bg-surface-container-low">{getStepTypeLabel(step.type)}</Badge>
                      {step.builtInSourceLabel ? (
                        <Badge variant="accent">内置环节 · {step.builtInSourceLabel}</Badge>
                      ) : null}
                    </div>
                    <h2 className="mt-4 text-[1.8rem] font-semibold leading-tight tracking-[-0.02em] text-on-surface">{step.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-on-surface-variant">{getStepBody(step)}</p>
                    {step.teachingDesignStatus !== "explicit" ? (
                      <div className="mt-4 rounded-[1rem] bg-surface-container-low px-4 py-3 text-sm leading-6 text-on-surface-variant">
                        <span className="font-semibold text-on-surface">默认推断：</span>
                        系统按旧版环节补齐教学设计，当前建议回到编辑器进一步完善。
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-[1.35rem] bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                    <div className="flex items-center gap-2 font-medium text-on-surface">
                      <BookOpenCheck className="size-4 text-primary" aria-hidden />
                      草稿预览摘要
                    </div>
                    <p className="mt-2">排序键：{step.rank}</p>
                    <p className="mt-1">更新时间：{step.updatedAt}</p>
                  </div>
                </div>

                {inlineMaterials.length > 0 ? (
                  <div className="mt-5 rounded-[1.5rem] bg-surface-container-low p-4">
                    <p className="text-sm font-semibold text-on-surface">引用材料</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {inlineMaterials.map((material, materialIndex) => (
                        <span key={`${step.id}-${material.title}-${materialIndex}`} className="rounded-full bg-surface-container-lowest px-3 py-2 text-xs font-medium text-on-surface-variant">
                          {material.url ?? material.title}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {step.payload.runtime ? (
                  <div className="mt-5">
                    <RuntimeHostClient
                      descriptor={step.payload.runtime}
                      surface="teacher-preview"
                      actorScope="teacher"
                      lessonId={preview.lesson.id}
                      stepId={step.id}
                      stepTitle={step.title}
                      snapshotPayload={step.payload as unknown as Record<string, unknown>}
                      note="教师草稿预览只下发当前步骤草稿与静态快照，不读取学生 progress 或 live classroom state。"
                    />
                  </div>
                ) : null}
              </Card>
            );
          })}

          <Card className="bg-surface-container-lowest p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-on-surface-variant">课程级资料摘要</p>
                <h2 className="mt-2 text-2xl font-semibold text-on-surface">全部引用材料</h2>
              </div>
              <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant">{preview.materials.length} 项</span>
            </div>

            {preview.materials.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {preview.materials.map((material) => (
                  <div key={material.id} className="rounded-[1.35rem] bg-surface-container-low p-4">
                    <p className="font-semibold text-on-surface">{material.title}</p>
                    <p className="mt-2 text-sm text-on-surface-variant">{material.url ?? material.note ?? material.kind}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-on-surface-variant">当前草稿还没有 lesson-level 引用材料，预览中仅展示步骤内的结构化材料引用。</p>
            )}
          </Card>
        </main>
      </section>
    </div>
  );
}

function PreviewMetric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.4rem] bg-white/8 px-4 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-white/65">
        <span className="rounded-full bg-white/10 p-2 text-cyan-100">{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-[1.7rem] font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/60">{detail}</p>
    </div>
  );
}

function getStepTypeLabel(type: TeacherLessonPreviewDTO["steps"][number]["type"]) {
  if (type === "content") return "内容";
  if (type === "task") return "任务";
  return "测验";
}

function getStepBody(step: TeacherLessonPreviewDTO["steps"][number]) {
  if (step.payload.type === "content") return step.payload.body;
  if (step.payload.type === "task") return step.payload.prompt;
  return step.payload.question;
}
