import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/features/schedule/runtime/server.ts", "utf8");

describe("schedule runtime DAL", () => {
  it("builds teacher and class daily agenda reads with explicit cache tags", () => {
    expect(source).toContain("getTeacherDailyAgendaDTO");
    expect(source).toContain("getClassDailyAgendaDTO");
    expect(source).toContain("scheduleCacheTags.teacherAgenda");
    expect(source).toContain("scheduleCacheTags.classAgenda");
    expect(source).toContain("assertScheduleTeacherScope");
  });

  it("keeps runtime agenda away from raw import rows and applies holiday override precedence", () => {
    expect(source).not.toContain("scheduleImportRow");
    expect(source).toContain("scheduleHolidayDate");
    expect(source).toContain("scheduleOverride");
    expect(source).toContain('return "停课"');
  });

  it("ships explicit courseId inside lessonLink for editor preview routing", () => {
    expect(source).toContain("courseId: args.assignment.courseId");
  });
});
