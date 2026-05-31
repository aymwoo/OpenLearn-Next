import { buildCourseImportTemplateCsv } from "@/lib/course-import-template";

export async function GET() {
  const csv = buildCourseImportTemplateCsv();

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="teacher-course-import-template.csv"',
    },
  });
}
