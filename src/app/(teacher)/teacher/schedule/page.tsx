import { getTeacherDailyAgendaDTO, TeacherScheduleSurface } from "@/features/schedule/runtime";

export default async function TeacherSchedulePage() {
  const data = await getTeacherDailyAgendaDTO();

  return (
    <div className="min-h-full p-6 lg:p-8">
      <TeacherScheduleSurface data={data} />
    </div>
  );
}
