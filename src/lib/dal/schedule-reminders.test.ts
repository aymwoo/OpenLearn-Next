import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const dalSource = readFileSync("src/lib/dal/schedule-reminders.ts", "utf8");
const dispatchSource = readFileSync("src/server/schedule/reminder-dispatch.ts", "utf8");

describe("schedule reminders DAL", () => {
  it("locks first release reminder types and delivery statuses", () => {
    expect(dalSource).toContain("pre_class");
    expect(dalSource).toContain("schedule_change");
    expect(dalSource).toContain("planned");
    expect(dalSource).toContain("sent");
    expect(readFileSync("src/lib/dto/schedule.ts", "utf8")).toContain("failed");
    expect(readFileSync("src/lib/dto/schedule.ts", "utf8")).toContain("retry_required");
  });

  it("uses allowlisted reminder channels instead of embedding secret material", () => {
    expect(dispatchSource).toContain("wecom-notify");
    expect(dispatchSource).toContain("dingtalk-notify");
    expect(dispatchSource).toContain("assertNoSecretMaterial");
  });
});
