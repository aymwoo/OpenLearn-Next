import Link from "next/link";
import {
  Clock3,
  FolderArchive,
  GraduationCap,
  Layers3,
  Users,
} from "lucide-react";

import { createCourseAction } from "@/actions/course-authoring-actions";
import { CourseImportModal } from "@/components/courses/course-import-modal";
import { CourseCreateDrawer } from "@/components/courses/course-create-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import type { TeacherCourseCenterDTO } from "@/lib/dto/course-authoring";
import { cn } from "@/lib/utils";

type TeacherCourseCenterSurfaceProps = {
  data: TeacherCourseCenterDTO;
};

const courseStatusMeta = {
  draft: { label: "草稿", variant: "accent" as const },
  published: { label: "已发布", variant: "success" as const },
  archived: { label: "已归档", variant: "default" as const },
};

export function TeacherCourseCenterSurface({
  data,
}: TeacherCourseCenterSurfaceProps) {
  const archivedHref = data.includeArchived
    ? "/teacher/courses"
    : "/teacher/courses?archived=1";

  return (
    <div className={teacherSurfaceRhythm.stack}>
      <section className={teacherSurfaceRhythm.hero}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge
              variant="accent"
              className="mb-4 bg-surface-container-lowest"
            >
              课程中心
            </Badge>
            <h1 className="text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[3rem]">
              我的课程总览
            </h1>
            <p className="mt-4 leading-8 text-on-surface-variant">
              只展示你当前教师身份与学校范围内可管理的课程，并按草稿优先、最近更新时间靠前的节奏组织。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary" className="px-5 text-sm">
              <Link href="/teacher/courses/import/template">下载 CSV 模板</Link>
            </Button>
            <CourseImportModal schoolId={data.defaultSchoolId} />
            <Button
              asChild
              variant={data.includeArchived ? "secondary" : "tertiary"}
              className="px-5 text-sm"
            >
              <Link href={archivedHref}>
                {data.includeArchived ? "隐藏已归档" : "查看已归档"}
              </Link>
            </Button>
            <CourseCreateDrawer
              createCourseAction={createCourseAction}
              defaultSchoolId={data.defaultSchoolId}
              availableSchools={data.availableSchools}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <CourseCenterMetric
            label="当前课程数"
            value={`${data.courses.length} 门`}
          />
            <CourseCenterMetric
              label="默认视图"
              value={data.includeArchived ? "含已归档" : "仅活跃课程"}
            />
          <CourseCenterMetric label="进入方式" value="先看详情，再进课时管理" />
        </div>
      </section>

      <section className={teacherSurfaceRhythm.section}>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-on-surface-variant">卡片式课程网格</p>
            <h2 className="mt-2 text-2xl font-semibold">
              按课程阶段与最近更新组织
            </h2>
          </div>
          <div className="rounded-full bg-surface-container-lowest px-4 py-2 text-sm text-on-surface-variant shadow-ambient">
            默认隐藏已归档课程，可按需切换查看
          </div>
        </div>

        {data.courses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.courses.map((course) => {
              const statusMeta =
                courseStatusMeta[
                  course.status as keyof typeof courseStatusMeta
                ] ?? courseStatusMeta.draft;

              return (
                <Card
                  key={course.id}
                  className="min-h-64 bg-surface-container-lowest p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Badge variant="default">{course.subject}</Badge>
                      <div>
                        {/* status badge rendering */}
                        <Badge variant={statusMeta.variant}>
                          {statusMeta.label}
                        </Badge>
                      </div>
                    </div>
                    <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs text-on-surface-variant">
                      {course.grade}
                    </span>
                  </div>

                  <h3 className="mt-5 text-2xl font-semibold text-on-surface">
                    {course.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                    {course.classLabels.length > 0
                      ? `关联班级：${course.classLabels.join("、")}`
                      : "尚未关联班级，后续可继续配置。"}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <CourseCardMeta
                      icon={<Layers3 className="size-4" />}
                      label="课时数"
                      value={`${course.lessonCount} 个`}
                    />
                    <CourseCardMeta
                      icon={<Users className="size-4" />}
                      label="学生数"
                      value={`${course.enrollmentCount} 名`}
                    />
                    <CourseCardMeta
                      icon={<GraduationCap className="size-4" />}
                      label="年级"
                      value={course.grade}
                    />
                    <CourseCardMeta
                      icon={<Clock3 className="size-4" />}
                      label="最近更新"
                      value={formatDateTime(course.updatedAt)}
                    />
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <span className="text-sm text-on-surface-variant">
                      先查看课程详情，再进入课时管理
                    </span>
                    <Button
                      asChild
                      variant="tertiary"
                      className="min-h-10 px-0 text-sm"
                    >
                      <Link href={`/teacher/courses/${course.id}`}>
                        查看课程详情
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-lowest p-8 text-center shadow-ambient">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-surface-container-low text-primary">
              <FolderArchive className="size-6" aria-hidden />
            </div>
            <h3 className="mt-5 text-2xl font-semibold">
              当前还没有可显示的课程
            </h3>
            <p className="mt-3 text-sm leading-7 text-on-surface-variant">
              你可以先创建第一门课程，或切换查看已归档课程，继续衔接后续的课时与教案管理。
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <CourseCreateDrawer
                createCourseAction={createCourseAction}
                defaultSchoolId={data.defaultSchoolId}
                availableSchools={data.availableSchools}
                triggerLabel="新建课程"
              />
              <Button asChild variant="secondary" className="px-5 text-sm">
                <Link href={archivedHref}>
                  {data.includeArchived ? "返回活跃课程" : "查看已归档"}
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function CourseCenterMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={cn(teacherSurfaceRhythm.cardInset, "p-4")}>
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-2 text-lg font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function CourseCardMeta({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low p-4")}
    >
      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
        <span className="rounded-full bg-surface-container-lowest p-2 text-primary">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-3 text-sm font-semibold text-on-surface">{value}</p>
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
