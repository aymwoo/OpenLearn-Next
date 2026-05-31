import { buildRosterImportTemplateCsv } from "@/features/class-management/template";

export async function GET() {
  const csv = buildRosterImportTemplateCsv();

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="teacher-class-roster-import-template.csv"',
    },
  });
}
