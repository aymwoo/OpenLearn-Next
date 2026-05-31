import Link from "next/link";

import { TeacherLessonPreviewSurface } from "@/components/surfaces/teacher-lesson-preview-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTeacherAuthoringOverview, getTeacherLessonPreviewDTO } from "@/lib/dal/lesson-authoring";

type TeacherEditorPreviewPageProps = {
  searchParams?: Promise<{
    courseId?: string;
    lessonId?: string;
  }>;
};

export default async function TeacherEditorPreviewPage({ searchParams }: TeacherEditorPreviewPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { courseId?: string; lessonId?: string }));
  const courseId = params.courseId as string | undefined;
  const lessonId = params.lessonId as string | undefined;

  if (!courseId || !lessonId) {
    return <PreviewGuidance title="请从 editor 内带着明确课时进入课堂预览" body="课堂预览必须同时收到 courseId 和 lessonId，避免误落到错误课程或错误课时。" href="/teacher/editor" cta="返回 editor" />;
  }

  const overview = await getTeacherAuthoringOverview();
  const scopedCourse = overview.courses.find((course) => course.id === courseId) ?? null;
  const scopedLesson = overview.lessons.find((lesson) => lesson.id === lessonId && lesson.courseId === courseId) ?? null;

  if (!scopedCourse || !scopedLesson) {
    return <PreviewGuidance title="当前预览上下文已失效" body="目标课程或课时不在当前教师作用域内。请回到课程内课时入口后重新打开预览。" href="/teacher/courses" cta="前往课程总览" />;
  }

  const preview = await getTeacherLessonPreviewDTO({ lessonId });

  if (preview.course.id !== courseId) {
    return <PreviewGuidance title="课时与课程参数不匹配" body="收到的 lessonId 不属于当前 courseId。请从 editor 页面重新进入真实预览入口。" href={`/teacher/editor?courseId=${courseId}&lessonId=${lessonId}`} cta="返回当前编排页" />;
  }

  return <TeacherLessonPreviewSurface preview={preview} />;
}

function PreviewGuidance({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient sm:p-8">
      <Badge variant="accent">课堂预览</Badge>
      <h1 className="mt-4 text-[2.2rem] font-semibold leading-tight tracking-[-0.03em] text-on-surface">{title}</h1>
      <p className="mt-4 max-w-3xl text-sm leading-8 text-on-surface-variant sm:text-base">{body}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={href}>{cta}</Link>
        </Button>
      </div>
    </section>
  );
}
