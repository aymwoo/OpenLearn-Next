import { notFound } from "next/navigation";

import { TeacherCourseDetailSurface } from "@/components/surfaces/teacher-course-detail-surface";
import { getTeacherCourseDetailDTO } from "@/lib/dal/course-authoring";

type TeacherCourseDetailPageProps = {
  params: Promise<{
    courseId: string;
  }>;
};

export default async function TeacherCourseDetailPage({ params }: TeacherCourseDetailPageProps) {
  const { courseId } = await params;

  try {
    const course = await getTeacherCourseDetailDTO({ courseId });

    return (
      <div className="min-h-full p-6 lg:p-8">
        <TeacherCourseDetailSurface course={course} />
      </div>
    );
  } catch {
    notFound();
  }
}
