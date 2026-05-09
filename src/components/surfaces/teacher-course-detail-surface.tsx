import Link from "next/link";
import { ArrowLeft, BookOpen, Clock3, GraduationCap, Layers3, Users } from "lucide-react";

import { updateCourseAction } from "@/actions/course-authoring-actions";
import { CourseDetailForm } from "@/components/courses/course-detail-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TeacherCourseDetailDTO } from "@/lib/dto/course-authoring";

type TeacherCourseDetailSurfaceProps = {
  course: TeacherCourseDetailDTO;
};

const courseStatusMeta = {
  draft: { label: "草稿", variant: "accent" as const },
  published: { label: "已发布", variant: "success" as const },
  archived: { label: "已归档", variant: "default" as const },
};

export function TeacherCourseDetailSurface({ course }: TeacherCourseDetailSurfaceProps) {
  const statusMeta = courseStatusMeta[course.status as keyof typeof courseStatusMeta] ?? courseStatusMeta.draft;

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Button asChild variant="tertiary" className="mb-5 min-h-10 px-0 text-sm">
              <Link href="/teacher/courses">
                <ArrowLeft className="mr-2 size-4" aria-hidden />
                返回课程总览
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="accent" className="bg-surface-container-lowest">
                {course.subject}
              </Badge>
              <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
              <Badge variant="default" className="bg-surface-container-low">
                {course.grade}
              </Badge>
            </div>
            <h1 className="mt-4 text-[2.25rem] font-semibold leading-tight tracking-[-0.03em] text-on-surface sm:text-[3rem]">
              {course.title}
            </h1>
            <p className="mt-4 leading-8 text-on-surface-variant">
              先在这里完成课程基础信息更新，再继续进入课程内的课时管理流程，始终保留课程上下文。
            </p>
          </div>

          <div className="rounded-[1.75rem] bg-surface-container-lowest p-5 shadow-ambient lg:w-[340px]">
            <p className="text-sm text-on-surface-variant">主流程入口</p>
            <h2 className="mt-2 text-2xl font-semibold text-on-surface">进入课程编排上下文</h2>
            <p className="mt-3 text-sm leading-7 text-on-surface-variant">
              先进入该课程的课时列表或空态，再决定继续已有课时还是新建第一个课时。
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button className="px-5 text-sm">进入课时管理</Button>
              <Button variant="secondary" className="px-5 text-sm">当前页直接编辑课程信息</Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <DetailMetric icon={<Layers3 className="size-4" />} label="课时数" value={`${course.lessonCount} 个`} />
          <DetailMetric icon={<Users className="size-4" />} label="学生数" value={`${course.enrollmentCount} 名`} />
          <DetailMetric icon={<GraduationCap className="size-4" />} label="班级数" value={`${course.classLinks.length} 个`} />
          <DetailMetric icon={<Clock3 className="size-4" />} label="最近更新" value={formatDateTime(course.updatedAt)} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card className="bg-surface-container-low p-5">
          <p className="text-sm text-on-surface-variant">课程概览</p>
          <h2 className="mt-2 text-2xl font-semibold">基础信息与课时摘要</h2>

          <div className="mt-5">
            <CourseDetailForm course={course} updateCourseAction={updateCourseAction} />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <InfoCard label="课程标题" value={course.title} />
            <InfoCard label="课程状态" value={statusMeta.label} />
            <InfoCard label="学科" value={course.subject} />
            <InfoCard label="年级" value={course.grade} />
          </div>

          <div className="mt-6 rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
            <div className="flex items-center gap-3">
              <BookOpen className="size-5 text-primary" aria-hidden />
              <h3 className="text-xl font-semibold">当前课时</h3>
            </div>

            {course.lessons.length > 0 ? (
              <div className="mt-4 space-y-3">
                {course.lessons.map((lesson) => (
                  <div key={lesson.id} className="rounded-3xl bg-surface-container-low p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-on-surface">{lesson.title}</p>
                        <p className="mt-1 text-sm text-on-surface-variant">{lesson.objective}</p>
                      </div>
                      <Badge variant={lesson.status === "published" ? "success" : "accent"}>
                        {lesson.status === "published" ? "已发布" : "草稿"}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-on-surface-variant">
                      {lesson.stepCount} 个步骤 · 修订 {lesson.revision} · 最近更新 {formatDateTime(lesson.updatedAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-3xl bg-surface-container-low p-5 text-sm leading-7 text-on-surface-variant">
                当前课程还没有课时，接下来会从这里直接承接“新建第一个课时”的主入口。
              </div>
            )}
          </div>
        </Card>

        <Card className="bg-surface-container-low p-5">
          <p className="text-sm text-on-surface-variant">班级与衔接入口</p>
          <h2 className="mt-2 text-2xl font-semibold">课程关联情况</h2>

          <div className="mt-5 rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
            <p className="text-sm text-on-surface-variant">关联班级</p>
            {course.classLinks.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {course.classLinks.map((classLink) => (
                  <span
                    key={classLink.id}
                    className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-medium text-on-surface"
                  >
                    {classLink.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">当前尚未关联班级，后续阶段会补齐班级与学生关联管理。</p>
            )}
          </div>

          <div className="mt-4 rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
            <p className="text-sm text-on-surface-variant">课程内下一步</p>
            <p className="mt-2 text-sm leading-7 text-on-surface-variant">
              这里继续保留“进入课时管理”主 CTA，确保教师不会从列表页直接跳到全局 editor，而是始终保留课程上下文。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button className="px-5 text-sm">进入课时管理</Button>
              <Button variant="secondary" className="px-5 text-sm">已在本页完成课程编辑</Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

function DetailMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-surface-container-lowest p-4 shadow-ambient">
      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
        <span className="rounded-full bg-surface-container-low p-2 text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-lg font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-surface-container-lowest p-4 shadow-ambient">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-2 text-base font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
