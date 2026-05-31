import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/features/schedule/operations/server.ts", "utf8");
const actionsSource = readFileSync("src/features/schedule/operations/actions.ts", "utf8");

describe("schedule operations DAL", () => {
  it("limits override actions to substitute cancel move and preserves lineage", () => {
    expect(source).toContain('parsed.action === "substitute"');
    expect(source).toContain("originalTeacherId");
    expect(source).toContain("originalBellSlotId");
    expect(source).toContain("originalRoomLabel");
    expect(source).not.toContain("update(scheduleRecurringEntry)");
  });

  it("keeps operations center reads side-effect free and creates default calendar only on write", () => {
    expect(source).not.toContain("const calendar = await ensureDefaultHolidayCalendar(schoolId, scope.userId)");
    expect(source).toContain("await ensureDefaultHolidayCalendar(parsed.schoolId, scope.userId)");
    expect(source).toContain("calendar?.id ?? null");
  });

  it("exposes structured blocked errors and agenda invalidation", () => {
    expect(actionsSource).toContain('error: "SCHEDULE_OVERRIDE_BLOCKED"');
    expect(actionsSource).toContain("invalidateScheduleOperationTags(updateTag");
    expect(actionsSource).toContain("assertScheduleTeacherScope");
  });
});
