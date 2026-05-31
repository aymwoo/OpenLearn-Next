import { TeacherCourseCenterSurface } from "@/components/surfaces/teacher-course-center-surface";
import { getTeacherCourseCenterDTO } from "@/lib/dal/course-authoring";

type TeacherCoursesPageProps = {
  searchParams?: Promise<{
    archived?: string;
  }>;
};

export default async function TeacherCoursesPage({ searchParams }: TeacherCoursesPageProps) {
  const params = await searchParams;
  const includeArchived = params?.archived === "1";
  const data = await getTeacherCourseCenterDTO({ includeArchived });

  return (
    <div className="min-h-full p-6 lg:p-8">
      <TeacherCourseCenterSurface data={data} />
    </div>
  );
}
