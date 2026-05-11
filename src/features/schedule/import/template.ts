import type { ScheduleImportDraftRowInput } from "@/features/schedule/shared/dto/import";

export const scheduleImportTemplateColumns = [
  "sourceRowKey",
  "termName",
  "weekday",
  "bellSlotLabel",
  "bellSlotStartTime",
  "bellSlotEndTime",
  "className",
  "courseTitle",
  "teacherName",
  "roomLabel",
] as const satisfies readonly (keyof ScheduleImportDraftRowInput)[];

export const scheduleImportTemplateChineseHeaders = [
  "源记录标识",
  "学期名称",
  "星期(0-6)",
  "节次标签",
  "上课开始时间",
  "上课结束时间",
  "班级名称",
  "课程名称",
  "教师姓名",
  "教室标签",
] as const;

export const SCHEDULE_IMPORT_COLUMN_MAP: Readonly<Record<string, keyof ScheduleImportDraftRowInput>> = {
  源记录标识: "sourceRowKey",
  学期名称: "termName",
  "星期(0-6)": "weekday",
  节次标签: "bellSlotLabel",
  上课开始时间: "bellSlotStartTime",
  上课结束时间: "bellSlotEndTime",
  班级名称: "className",
  课程名称: "courseTitle",
  教师姓名: "teacherName",
  教室标签: "roomLabel",
} as const;

export const scheduleImportTemplateSampleRows: readonly ScheduleImportDraftRowInput[] = [
  {
    sourceRowKey: "1",
    termName: "2026 春季学期",
    weekday: 1,
    bellSlotLabel: "第一节",
    bellSlotStartTime: "08:00",
    bellSlotEndTime: "08:45",
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
  const header = scheduleImportTemplateChineseHeaders.join(",");
  const rows = scheduleImportTemplateSampleRows.map((row) =>
    scheduleImportTemplateColumns.map((column) => escapeCsvValue(row[column])).join(","),
  );

  return [header, ...rows].join("\n");
}
