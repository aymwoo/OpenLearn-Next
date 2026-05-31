import { buildScheduleImportTemplateCsv } from "@/features/schedule/import";

export async function GET() {
  const csv = buildScheduleImportTemplateCsv();

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="teacher-schedule-import-template.csv"',
    },
  });
}
