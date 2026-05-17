import { notFound } from "next/navigation";

import { CourseLessonsEntrySurface } from "@/components/surfaces/course-lessons-entry-surface";
import { getTeacherCourseLessonsEntryDTO } from "@/lib/dal/course-authoring";

type TeacherCourseLessonsPageProps = {
  params: Promise<{
    courseId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function TeacherCourseLessonsPage({ params, searchParams }: TeacherCourseLessonsPageProps) {
  const { courseId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolvedSearchParams?.error ? decodeURIComponent(resolvedSearchParams.error) : null;
  let data;

  try {
    data = await getTeacherCourseLessonsEntryDTO({ courseId });
  } catch (error) {
    if (error instanceof Error && error.message === "COURSE_NOT_FOUND") {
      notFound();
    }

    throw error;
  }

  return (
    <div className="min-h-full p-6 lg:p-8">
      <CourseLessonsEntrySurface data={data} errorMessage={errorMessage} />
    </div>
  );
}
