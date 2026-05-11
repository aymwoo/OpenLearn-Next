import type { ScheduleImportDraftRowInput } from "@/features/schedule/shared/dto/import";

export const scheduleImportTemplateColumns = [
  "sourceRowKey",
  "termName",
  "weekday",
  "bellSlotLabel",
  "className",
  "courseTitle",
  "teacherName",
  "roomLabel",
] as const satisfies readonly (keyof ScheduleImportDraftRowInput)[];

export const scheduleImportTemplateSampleRows: readonly ScheduleImportDraftRowInput[] = [
  {
    sourceRowKey: "1",
    termName: "2026 春季学期",
    weekday: 1,
    bellSlotLabel: "第一节",
    className: "高一（1）班",
    courseTitle: "示例高一数学",
    teacherName: "张老师",
    roomLabel: "教学楼 302",
  },
];

function escapeCsvValue(value: string | number | null) {
  const normalized = value == null ? "" : String(value);
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replaceAll('"', '""')}"`;
}

export function buildScheduleImportTemplateCsv() {
  const header = scheduleImportTemplateColumns.join(",");
  const rows = scheduleImportTemplateSampleRows.map((row) =>
    scheduleImportTemplateColumns.map((column) => escapeCsvValue(row[column])).join(","),
  );

  return [header, ...rows].join("\n");
}
