import { getScheduleOperationsCenterDTO, ScheduleOperationsSurface } from "@/features/schedule/operations";

export default async function TeacherScheduleChangesPage() {
  const data = await getScheduleOperationsCenterDTO();

  return (
    <div className="min-h-full p-6 lg:p-8">
      <ScheduleOperationsSurface data={data} />
    </div>
  );
}
