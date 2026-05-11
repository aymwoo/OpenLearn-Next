import { getLatestScheduleImportBatchDTO, listScheduleImportBatchDTOs } from "@/features/schedule/import";
import { getTeacherDailyAgendaDTO, TeacherScheduleSurface } from "@/features/schedule/runtime";

type TeacherSchedulePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TeacherSchedulePage({ searchParams }: TeacherSchedulePageProps) {
  await (searchParams ?? Promise.resolve({}));
  const [data, latestBatch, importBatches] = await Promise.all([
    getTeacherDailyAgendaDTO(),
    getLatestScheduleImportBatchDTO(),
    listScheduleImportBatchDTOs(),
  ]);

  return (
    <div className="min-h-full p-6 lg:p-8">
      <TeacherScheduleSurface
        data={data}
        latestImportBatch={latestBatch}
        importBatches={importBatches}
      />
    </div>
  );
}
