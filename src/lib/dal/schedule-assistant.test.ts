import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const dalSource = readFileSync("src/lib/dal/schedule-assistant.ts", "utf8");
const actionsSource = readFileSync("src/actions/schedule-assistant-actions.ts", "utf8");

describe("schedule assistant DAL", () => {
  it("stores only proposal-oriented assistant types and statuses", () => {
    expect(dalSource).toContain("import_mapping");
    expect(dalSource).toContain("conflict_explanation");
    expect(dalSource).toContain("override_suggestion");
    expect(dalSource).toContain("draft_created");
  });

  it("does not write runtime schedule tables directly in approval path", () => {
    expect(dalSource).not.toContain("scheduleOverride");
    expect(dalSource).not.toContain("scheduleRecurringEntry");
    expect(actionsSource).toContain('error: "SCHEDULE_ASSISTANT_APPROVAL_BLOCKED"');
  });
});
