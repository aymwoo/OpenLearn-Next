import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/lib/dal/schedule-operations.ts", "utf8");
const actionsSource = readFileSync("src/actions/schedule-operations-actions.ts", "utf8");

describe("schedule operations DAL", () => {
  it("limits override actions to substitute cancel move and preserves lineage", () => {
    expect(source).toContain('parsed.action === "substitute"');
    expect(source).toContain("originalTeacherId");
    expect(source).toContain("originalBellSlotId");
    expect(source).toContain("originalRoomLabel");
    expect(source).not.toContain("update(scheduleRecurringEntry)");
  });

  it("exposes structured blocked errors and agenda invalidation", () => {
    expect(actionsSource).toContain('error: "SCHEDULE_OVERRIDE_BLOCKED"');
    expect(actionsSource).toContain("cacheTags.scheduleCalendar");
    expect(actionsSource).toContain("cacheTags.classScheduleAgenda");
    expect(actionsSource).toContain("cacheTags.teacherScheduleAgenda");
  });
});
