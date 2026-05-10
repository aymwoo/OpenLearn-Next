import { ScheduleImportReviewSurface } from "@/components/surfaces/schedule-import-review-surface";
import { getLatestScheduleImportBatchDTO } from "@/lib/dal/schedule-import";

export default async function TeacherScheduleImportPage() {
  const batch = await getLatestScheduleImportBatchDTO();

  return (
    <div className="min-h-full p-6 lg:p-8">
      <ScheduleImportReviewSurface batch={batch} />
    </div>
  );
}
