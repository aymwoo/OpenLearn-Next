import { TeacherReviewSurface } from "@/components/learning/teacher-review-surface";
import { getTeacherLessonReviewDTO } from "@/lib/dal/learning";
import { TeacherReviewFilterSchema } from "@/lib/dto/learning";

type TeacherReviewPageProps = {
  searchParams?: Promise<{
    lessonId?: string;
    studentId?: string;
    filter?: string;
  }>;
};

function parseFilter(value: string | undefined) {
  const parsed = TeacherReviewFilterSchema.safeParse(value ?? "all");

  return parsed.success ? parsed.data : "all";
}

export default async function TeacherReviewPage({ searchParams }: TeacherReviewPageProps) {
  const params = await searchParams;
  const lessonId = params?.lessonId;
  const filter = parseFilter(params?.filter);
  const review = lessonId ? await getTeacherLessonReviewDTO({ lessonId, filter }) : null;

  return <TeacherReviewSurface review={review} selectedStudentId={params?.studentId ?? null} filter={filter} />;
}
