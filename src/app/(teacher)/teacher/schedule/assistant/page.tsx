import { ScheduleAssistantSurface } from "@/components/surfaces/schedule-assistant-surface";
import { getScheduleAssistantCenterDTO } from "@/lib/dal/schedule-assistant";

export default async function TeacherScheduleAssistantPage() {
  const data = await getScheduleAssistantCenterDTO();

  return (
    <div className="min-h-full p-6 lg:p-8">
      <ScheduleAssistantSurface data={data} />
    </div>
  );
}
