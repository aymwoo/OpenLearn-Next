import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("scripts/bootstrap-dev-db.ts", "utf8");
const themeSource = readFileSync("src/lib/dal/themes.ts", "utf8");

describe("bootstrap dev theme seeding", () => {
  it("defines a second theme plugin using manifest.theme tokens", () => {
    expect(source).toContain("DEV_THEME_PLUGIN_DEFINITION");
    expect(source).toContain('id: "dev-theme-starlight-classroom"');
    expect(source).toContain('themeName: "星夜课堂主题"');
    expect(source).toContain('fontFamily: "Lexend"');
    expect(source).toContain('"surface-container-low"');
  });

  it("registers the alternate theme during bootstrap", () => {
    expect(source).toContain("await upsertDevThemePlugin(seeded.school.id, seeded.teacher.id)");
    expect(source).toContain("await registerThemeTokens(");
  });

  it("keeps theme registration idempotent by school and name", () => {
    expect(themeSource).toContain("eq(themeTokenRegistries.schoolId, schoolId)");
    expect(themeSource).toContain("eq(themeTokenRegistries.name, name)");
    expect(themeSource).toContain("update(themeTokenRegistries)");
  });
});
