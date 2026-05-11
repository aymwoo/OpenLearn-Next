import { describe, expect, it } from "vitest";

import { ScheduleImportDraftRowInputSchema } from "@/features/schedule/shared/dto/import";

import {
  SCHEDULE_IMPORT_COLUMN_MAP,
  buildScheduleImportTemplateCsv,
  scheduleImportTemplateChineseHeaders,
  scheduleImportTemplateColumns,
  scheduleImportTemplateSampleRows,
} from "./template";

describe("schedule import template", () => {
  it("uses the DTO column order as the single template contract", () => {
    expect(scheduleImportTemplateColumns).toEqual([
      "sourceRowKey",
      "termName",
      "weekday",
      "bellSlotLabel",
      "className",
      "courseTitle",
      "teacherName",
      "roomLabel",
    ]);
  });

  it("exports Chinese headers aligned with English column order", () => {
    expect(scheduleImportTemplateChineseHeaders).toEqual([
      "源记录标识",
      "学期名称",
      "星期(0-6)",
      "节次标签",
      "班级名称",
      "课程名称",
      "教师姓名",
      "教室标签",
    ]);
    expect(scheduleImportTemplateChineseHeaders.length).toBe(scheduleImportTemplateColumns.length);
  });

  it("exports Chinese-to-English column map", () => {
    expect(SCHEDULE_IMPORT_COLUMN_MAP).toEqual({
      源记录标识: "sourceRowKey",
      学期名称: "termName",
      "星期(0-6)": "weekday",
      节次标签: "bellSlotLabel",
      班级名称: "className",
      课程名称: "courseTitle",
      教师姓名: "teacherName",
      教室标签: "roomLabel",
    });
  });

  it("provides valid sample rows with numeric weekday and optional roomLabel", () => {
    expect(scheduleImportTemplateSampleRows.length).toBeGreaterThan(0);

    const [sampleRow] = scheduleImportTemplateSampleRows;
    expect(sampleRow.weekday).toBeTypeOf("number");
    expect(sampleRow.weekday).toBeGreaterThanOrEqual(0);
    expect(sampleRow.weekday).toBeLessThanOrEqual(6);
    expect(ScheduleImportDraftRowInputSchema.parse(sampleRow)).toEqual(sampleRow);
  });

  it("builds csv text with Chinese header, example rows, and original Chinese content", () => {
    const csv = buildScheduleImportTemplateCsv();

    expect(csv).toContain("源记录标识,学期名称,星期(0-6),节次标签,班级名称,课程名称,教师姓名,教室标签");
    expect(csv).toContain("示例高一数学");
    expect(csv.split("\n").length).toBeGreaterThanOrEqual(2);
  });
});
