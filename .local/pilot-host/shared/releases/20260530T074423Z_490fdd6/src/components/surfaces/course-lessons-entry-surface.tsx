import Link from "next/link";
import { redirect } from "next/navigation";

import { createLessonDraftAction } from "@/actions/lesson-authoring-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import type { TeacherCourseLessonsEntryDTO } from "@/lib/dto/course-authoring";
import { cn } from "@/lib/utils";

type CourseLessonsEntrySurfaceProps = {
  data: TeacherCourseLessonsEntryDTO;
  errorMessage?: string | null;
};

export function CourseLessonsEntrySurface({
  data,
  errorMessage,
}: CourseLessonsEntrySurfaceProps) {
  const { course, lessons } = data;
  const hasLessons = lessons.length > 0;

  return (
    <div className={teacherSurfaceRhythm.stack}>
      {errorMessage ? (
        <div
          className={cn(
            teacherSurfaceRhythm.card,
            "bg-error-container px-4 py-3 text-sm font-medium text-on-error-container",
          )}
        >
          {errorMessage}
        </div>
      ) : null}

      <section className={teacherSurfaceRhythm.hero}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Button
              asChild
              variant="tertiary"
              className="mb-5 min-h-10 px-0 text-sm"
            >
              <Link href={`/teacher/courses/${course.id}`}>返回课程详情</Link>
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="accent" className="bg-surface-container-lowest">
                {course.subject}
              </Badge>
              <Badge variant="default" className="bg-surface-container-low">
                {course.grade}
              </Badge>
            </div>
            <h1 className="mt-4 text-[2.25rem] font-semibold leading-tight tracking-[-0.03em] text-on-surface sm:text-[3rem]">
              {course.title}
            </h1>
            <p className="mt-4 leading-8 text-on-surface-variant">
              先在课程上下文里确认已有课时，再决定继续编辑还是从这门课程开始创建新的课时草稿。
            </p>
          </div>

          <Card className="bg-surface-container-lowest p-5 lg:w-[360px]">
            <p className="text-sm text-on-surface-variant">课程内主操作</p>
            <h2 className="mt-2 text-2xl font-semibold text-on-surface">
              {hasLessons ? "继续课程内编排" : "从这门课程开始编排第一个课时"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-on-surface-variant">
              {hasLessons
                ? "已有课时时，优先在当前课程范围内继续编辑或补充新课时。"
                : "当前还没有任何课时，只提供“新建第一个课时”动作，不暴露其他课程内容。"}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <CreateLessonDraftButton
                courseId={course.id}
                hasLessons={hasLessons}
              />
              {hasLessons ? (
                <Button asChild variant="secondary" className="px-5 text-sm">
                  <Link
                    href={`/teacher/editor?courseId=${course.id}&lessonId=${lessons[0].id}`}
                  >
                    继续编辑已有课时
                  </Link>
                </Button>
              ) : null}
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card className="bg-surface-container-low p-5">
          <p className="text-sm text-on-surface-variant">课时列表</p>
          <h2 className="mt-2 text-2xl font-semibold text-on-surface">
            当前课程的课时入口
          </h2>

          {hasLessons ? (
            <div className="mt-5 space-y-3">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className={cn(teacherSurfaceRhythm.cardInset, "p-5")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-on-surface">
                        {lesson.title}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                        {lesson.objective}
                      </p>
                    </div>
                    <Badge
                      variant={
                        lesson.status === "published" ? "success" : "accent"
                      }
                    >
                      {lesson.status === "published" ? "已发布" : "草稿"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-on-surface-variant">
                    修订 {lesson.revision} · {lesson.stepCount} 个步骤
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button asChild className="px-5 text-sm">
                      <Link
                        href={`/teacher/editor?courseId=${course.id}&lessonId=${lesson.id}`}
                      >
                        继续编辑
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={cn(teacherSurfaceRhythm.cardInset, "mt-5 p-6")}>
              <p className="text-sm text-on-surface-variant">还没有课时</p>
              <h3 className="mt-2 text-2xl font-semibold text-on-surface">
                新建第一个课时
              </h3>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                从这门课程开始建立第一个课时草稿，创建完成后会自动带着 courseId
                与 lessonId 进入 editor。
              </p>
              <div className="mt-5">
                <CreateLessonDraftButton
                  courseId={course.id}
                  hasLessons={false}
                />
              </div>
            </div>
          )}
        </Card>

        <Card className="bg-surface-container-low p-5">
          <p className="text-sm text-on-surface-variant">课程快照</p>
          <h2 className="mt-2 text-2xl font-semibold text-on-surface">
            当前课程概览
          </h2>
          <div className="mt-5 grid gap-3">
            <InfoRow label="课时数" value={`${course.lessonCount} 个`} />
            <InfoRow
              label="关联班级"
              value={
                course.classLabels.length > 0
                  ? course.classLabels.join("、")
                  : "尚未关联班级"
              }
            />
            <InfoRow label="学生数" value={`${course.enrollmentCount} 名`} />
          </div>
        </Card>
      </section>
    </div>
  );
}

function CreateLessonDraftButton({
  courseId,
  hasLessons,
}: {
  courseId: string;
  hasLessons: boolean;
}) {
  return (
    <form action={createLessonDraftFromCourse.bind(null, courseId)}>
      <Button type="submit" className="px-5 text-sm">
        {hasLessons ? "新建课时" : "新建第一个课时"}
      </Button>
    </form>
  );
}

async function createLessonDraftFromCourse(courseId: string) {
  "use server";

  const result = await createLessonDraftAction({
    courseId,
    title: "未命名课时",
    objective: "请补充本课时的教学目标。",
  });

  if (!result.ok) {
    redirect(
      `/teacher/courses/${courseId}/lessons?error=${encodeURIComponent(result.message)}`,
    );
  }

  if (
    !result.data ||
    typeof result.data !== "object" ||
    !("id" in result.data) ||
    typeof result.data.id !== "string"
  ) {
    redirect(
      `/teacher/courses/${courseId}/lessons?error=${encodeURIComponent("课时草稿暂时创建失败，请稍后重试。")}`,
    );
  }

  redirect(`/teacher/editor?courseId=${courseId}&lessonId=${result.data.id}`);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(teacherSurfaceRhythm.cardInset, "p-4")}>
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-2 text-base font-semibold text-on-surface">{value}</p>
    </div>
  );
}
