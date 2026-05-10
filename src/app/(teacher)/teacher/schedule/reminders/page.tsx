import { ScheduleReminderSurface } from "@/components/surfaces/schedule-reminder-surface";
import { getScheduleReminderCenterDTO } from "@/lib/dal/schedule-reminders";

export default async function TeacherScheduleRemindersPage() {
  const data = await getScheduleReminderCenterDTO();

  return (
    <div className="min-h-full p-6 lg:p-8">
      <ScheduleReminderSurface data={data} />
    </div>
  );
}
