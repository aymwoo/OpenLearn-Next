import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const dalSource = readFileSync("src/features/schedule/reminders/server.ts", "utf8");
const dispatchSource = readFileSync("src/server/schedule/reminder-dispatch.ts", "utf8");
const reminderDtoSource = readFileSync("src/features/schedule/shared/dto/reminders.ts", "utf8");

describe("schedule reminders DAL", () => {
  it("locks first release reminder types and delivery statuses", () => {
    expect(dalSource).toContain("pre_class");
    expect(dalSource).toContain("schedule_change");
    expect(dalSource).toContain("planned");
    expect(dalSource).toContain("sent");
    expect(reminderDtoSource).toContain("failed");
    expect(reminderDtoSource).toContain("retry_required");
  });

  it("uses allowlisted reminder channels instead of embedding secret material", () => {
    expect(dispatchSource).toContain("wecom-notify");
    expect(dispatchSource).toContain("dingtalk-notify");
    expect(dispatchSource).toContain("assertNoSecretMaterial");
  });

  it("keeps reminder planning and audit writes in feature-local helpers", () => {
    expect(dalSource).toContain("planScheduleReminderDispatch");
    expect(dalSource).toContain("await db.transaction");
    expect(dalSource).toContain("dispatchScheduleReminder");
    expect(dalSource).toContain('status: "planned"');
  });
});
