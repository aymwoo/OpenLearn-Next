import { notFound } from "next/navigation";

import { CourseLessonsEntrySurface } from "@/components/surfaces/course-lessons-entry-surface";
import { getTeacherCourseLessonsEntryDTO } from "@/lib/dal/course-authoring";

type TeacherCourseLessonsPageProps = {
  params: Promise<{
    courseId: string;
  }>;
};

export default async function TeacherCourseLessonsPage({ params }: TeacherCourseLessonsPageProps) {
  const { courseId } = await params;

  try {
    const data = await getTeacherCourseLessonsEntryDTO({ courseId });

    return (
      <div className="min-h-full p-6 lg:p-8">
        <CourseLessonsEntrySurface data={data} />
      </div>
    );
  } catch {
    notFound();
  }
}
