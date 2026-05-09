import Link from "next/link";

import { PluginRenderer } from "@/components/plugins/plugin-renderer";
import { LessonEditorSurface } from "@/components/surfaces/lesson-editor-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { assertActiveTeacher, getLessonEditorDTO, getTeacherAuthoringOverview } from "@/lib/dal/lesson-authoring";
import { listBuiltInTeachingStepTemplates } from "@/lib/dal/plugins";

type TeacherEditorPageProps = {
  searchParams?: Promise<{
    courseId?: string;
    lessonId?: string;
  }>;
};

export default async function TeacherEditorPage({ searchParams }: TeacherEditorPageProps) {
  const [scope, overview, params] = await Promise.all([
    assertActiveTeacher(),
    getTeacherAuthoringOverview(),
    searchParams ?? Promise.resolve({}),
  ]);

  const courseId = params.courseId;
  const lessonId = params.lessonId;
  const scopedCourse = courseId ? overview.courses.find((course) => course.id === courseId) ?? null : null;
  const scopedOverview = scopedCourse
    ? {
        ...overview,
        courses: [scopedCourse],
        lessons: overview.lessons.filter((lesson) => lesson.courseId === scopedCourse.id),
      }
    : overview;
  const scopedLessonSummary = lessonId
    ? scopedOverview.lessons.find((lesson) => lesson.id === lessonId && lesson.courseId === courseId) ?? null
    : scopedCourse
      ? scopedOverview.lessons.find((lesson) => lesson.courseId === scopedCourse.id) ?? null
      : null;
  const lesson = scopedLessonSummary ? await getLessonEditorDTO(scopedLessonSummary.id) : null;
  const builtInTemplates = lesson
    ? await listBuiltInTeachingStepTemplates({ actorId: scope.userId, schoolId: lesson.course.schoolId })
    : [];

  if (!courseId || !scopedCourse) {
    return <CourseAwareEditorGuidance />;
  }

  return (
    <div className="space-y-5">
      {!lesson ? <CourseLessonSelectionGuidance courseId={scopedCourse.id} courseTitle={scopedCourse.title} /> : null}
      <LessonEditorSurface overview={scopedOverview} lesson={lesson} builtInTemplates={builtInTemplates} />
      {lesson ? (
        <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient">
          <p className="text-sm text-on-surface-variant">插件建议</p>
          <div className="mt-4">
            <PluginRenderer
              anchor="lesson.sidebar"
              schoolId={lesson.course.schoolId}
              actorId={scope.userId}
              contextPayload={{ lessonId: lesson.lesson.id, courseId: lesson.course.id }}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CourseAwareEditorGuidance() {
  return (
    <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient sm:p-8">
      <Badge variant="accent">D-12 入口约束</Badge>
      <h1 className="mt-4 text-[2.2rem] font-semibold leading-tight tracking-[-0.03em] text-on-surface">
        请先从课程内课时入口进入 editor
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-8 text-on-surface-variant sm:text-base">
        editor 不再默认打开全局第一条课时。请先进入某门课程的课时入口页，再带着明确的 courseId 与 lessonId 进入当前编排界面。
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/teacher/courses">前往课程总览</Link>
        </Button>
      </div>
    </section>
  );
}

function CourseLessonSelectionGuidance({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  return (
    <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient">
      <p className="text-sm text-on-surface-variant">课程内提示</p>
      <h2 className="mt-2 text-2xl font-semibold text-on-surface">{courseTitle} 还没有可编辑的课时</h2>
      <p className="mt-3 text-sm leading-7 text-on-surface-variant">
        当前已锁定课程上下文，但未收到 lessonId，且该课程下还没有可加载的课时。请回到课程内课时入口创建第一个课时后再继续。
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/teacher/courses/${courseId}/lessons`}>返回课程内课时入口</Link>
        </Button>
      </div>
    </section>
  );
}
