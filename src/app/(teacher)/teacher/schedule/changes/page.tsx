import { ScheduleOperationsSurface } from "@/components/surfaces/schedule-operations-surface";
import { getScheduleOperationsCenterDTO } from "@/lib/dal/schedule-operations";

export default async function TeacherScheduleChangesPage() {
  const data = await getScheduleOperationsCenterDTO();

  return (
    <div className="min-h-full p-6 lg:p-8">
      <ScheduleOperationsSurface data={data} />
    </div>
  );
}
