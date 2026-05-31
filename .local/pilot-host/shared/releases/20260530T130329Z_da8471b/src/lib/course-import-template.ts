import type { CourseImportDraftRowInput } from "@/lib/dto/course-import";

export const courseImportTemplateColumns = ["title", "subject", "grade", "status"] as const satisfies readonly (keyof CourseImportDraftRowInput)[];

export const courseImportTemplateChineseHeaders = ["标题", "学科", "年级", "课程状态"] as const;

export const COURSE_IMPORT_COLUMN_MAP: Readonly<Record<string, keyof CourseImportDraftRowInput>> = {
  标题: "title",
  学科: "subject",
  年级: "grade",
  课程状态: "status",
  title: "title",
  subject: "subject",
  grade: "grade",
  status: "status",
} as const;

export const courseImportTemplateSampleRows: readonly CourseImportDraftRowInput[] = [
  {
    title: "示例七年级科学探究",
    subject: "科学",
    grade: "七年级",
    status: "draft",
  },
];

export function normalizeCourseImportColumnHeader(key: string) {
  return key.replace(/^\uFEFF/, "").trim();
}

function escapeCsvValue(value: string | null | undefined) {
  const normalized = value == null ? "" : String(value);
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replaceAll('"', '""')}"`;
}

export function buildCourseImportCsv(rows: readonly CourseImportDraftRowInput[]) {
  const header = courseImportTemplateChineseHeaders.join(",");
  const body = rows.map((row) => courseImportTemplateColumns.map((column) => escapeCsvValue(row[column])).join(","));
  return [header, ...body].join("\n");
}

export function buildCourseImportTemplateCsv() {
  return buildCourseImportCsv(courseImportTemplateSampleRows);
}
