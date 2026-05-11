import { describe, expect, it, vi } from "vitest";

import { ScheduleImportDraftRowInputSchema } from "@/features/schedule/shared/dto/import";

describe("schedule import server logic", () => {
  describe("bellSlotStartTime / bellSlotEndTime validation", () => {
    it("accepts valid HH:mm format for bellSlotStartTime and bellSlotEndTime", () => {
      const validRow = {
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
      };
      expect(() => ScheduleImportDraftRowInputSchema.parse(validRow)).not.toThrow();
    });

    it("accepts null/undefined for bellSlotStartTime and bellSlotEndTime (optional fields)", () => {
      const optionalRow = {
        sourceRowKey: "1",
        termName: "2026 春季学期",
        weekday: 1,
        bellSlotLabel: "第一节",
        bellSlotStartTime: null,
        bellSlotEndTime: undefined,
        className: "高一（1）班",
        courseTitle: "示例高一数学",
        teacherName: "张老师",
        roomLabel: null,
      };
      expect(() => ScheduleImportDraftRowInputSchema.parse(optionalRow)).not.toThrow();
    });

    it("rejects invalid time format for bellSlotStartTime", () => {
      const invalidRow = {
        sourceRowKey: "1",
        termName: "2026 春季学期",
        weekday: 1,
        bellSlotLabel: "第一节",
        bellSlotStartTime: "8:00", // missing leading zero
        bellSlotEndTime: "08:45",
        className: "高一（1）班",
        courseTitle: "示例高一数学",
        teacherName: "张老师",
        roomLabel: null,
      };
      expect(() => ScheduleImportDraftRowInputSchema.parse(invalidRow)).toThrow();
    });

    it("rejects invalid time format for bellSlotEndTime", () => {
      const invalidRow = {
        sourceRowKey: "1",
        termName: "2026 春季学期",
        weekday: 1,
        bellSlotLabel: "第一节",
        bellSlotStartTime: "08:00",
        bellSlotEndTime: "25:00", // out of range
        className: "高一（1）班",
        courseTitle: "示例高一数学",
        teacherName: "张老师",
        roomLabel: null,
      };
      expect(() => ScheduleImportDraftRowInputSchema.parse(invalidRow)).toThrow();
    });
  });

  describe("ensureBellSlot time resolution logic", () => {
    it("uses import-provided startTime/endTime when available", async () => {
      // This test verifies the resolved startsAt/endsAt when times are passed.
      // The actual db write is tested via integration; here we validate the schema inference.
      const rowWithTimes = {
        sourceRowKey: "1",
        termName: "2026 春季学期",
        weekday: 1,
        bellSlotLabel: "第一节",
        bellSlotStartTime: "09:30",
        bellSlotEndTime: "10:15",
        className: "高一（1）班",
        courseTitle: "示例高一数学",
        teacherName: "张老师",
        roomLabel: null,
      };
      const parsed = ScheduleImportDraftRowInputSchema.parse(rowWithTimes);
      expect(parsed.bellSlotStartTime).toBe("09:30");
      expect(parsed.bellSlotEndTime).toBe("10:15");
    });

    it("allows missing time fields so ensureBellSlot falls back to sortOrder auto-calculation", () => {
      // When bellSlotStartTime/bellSlotEndTime are absent, the auto-calc path is used.
      // This is the default behavior for rows that don't specify custom times.
      const rowWithoutTimes = {
        sourceRowKey: "1",
        termName: "2026 春季学期",
        weekday: 1,
        bellSlotLabel: "第一节",
        bellSlotStartTime: undefined,
        bellSlotEndTime: undefined,
        className: "高一（1）班",
        courseTitle: "示例高一数学",
        teacherName: "张老师",
        roomLabel: null,
      };
      expect(() => ScheduleImportDraftRowInputSchema.parse(rowWithoutTimes)).not.toThrow();
    });
  });
});