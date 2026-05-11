import { describe, expect, it } from "vitest";

import { ScheduleImportDraftRowInputSchema } from "@/features/schedule/shared/dto/import";

import {
  buildScheduleImportTemplateCsv,
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

  it("provides valid sample rows with numeric weekday and optional roomLabel", () => {
    expect(scheduleImportTemplateSampleRows.length).toBeGreaterThan(0);

    const [sampleRow] = scheduleImportTemplateSampleRows;
    expect(sampleRow.weekday).toBeTypeOf("number");
    expect(sampleRow.weekday).toBeGreaterThanOrEqual(0);
    expect(sampleRow.weekday).toBeLessThanOrEqual(6);
    expect(ScheduleImportDraftRowInputSchema.parse(sampleRow)).toEqual(sampleRow);
  });

  it("builds csv text with header, example rows, and original Chinese content", () => {
    const csv = buildScheduleImportTemplateCsv();

    expect(csv).toContain("sourceRowKey,termName,weekday,bellSlotLabel,className,courseTitle,teacherName,roomLabel");
    expect(csv).toContain("示例高一数学");
    expect(csv.split("\n").length).toBeGreaterThanOrEqual(2);
  });
});
