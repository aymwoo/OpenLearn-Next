import { notFound } from "next/navigation";

import { CourseImportReviewSurface } from "@/components/surfaces/course-import-review-surface";
import { getCourseImportBatchDTO } from "@/lib/dal/course-import";

type CourseImportReviewPageProps = {
  params: Promise<{ batchId: string }>;
};

export default async function CourseImportReviewPage({ params }: CourseImportReviewPageProps) {
  const { batchId } = await params;

  try {
    const batch = await getCourseImportBatchDTO({ batchId });

    return (
      <div className="min-h-full p-6 lg:p-8">
        <CourseImportReviewSurface batch={batch} />
      </div>
    );
  } catch (error) {
    if (error instanceof Error && error.message === "COURSE_IMPORT_BATCH_NOT_FOUND") {
      notFound();
    }

    throw error;
  }
}
