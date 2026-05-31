import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("scripts/bootstrap-dev-db.ts", "utf8");
const themeSource = readFileSync("src/lib/dal/themes.ts", "utf8");
const registrySource = readFileSync("src/server/themes/registry.ts", "utf8");

describe("bootstrap dev theme seeding", () => {
  it("defines multiple dev theme plugins using manifest.theme tokens", () => {
    expect(source).toContain("DEV_THEME_PLUGIN_DEFINITIONS");
    expect(source).toContain('id: "dev-theme-starlight-classroom"');
    expect(source).toContain('themeName: "星夜课堂主题"');
    expect(source).toContain('id: "dev-theme-morning-admin-studio"');
    expect(source).toContain('themeName: "晨光教务台主题"');
    expect(source).toContain('"sidebar-width": "18rem"');
    expect(source).toContain('fontFamily: "Lexend"');
    expect(source).toContain('"surface-container-low"');
  });

  it("registers the alternate theme during bootstrap", () => {
    expect(source).toContain("for (const definition of DEV_THEME_PLUGIN_DEFINITIONS)");
    expect(source).toContain("await upsertDevThemePlugin(seeded.school.id, seeded.teacher.id, definition)");
    expect(source).toContain('from "@/server/themes/registry"');
    expect(source).not.toContain('from "@/lib/dal/themes"');
    expect(registrySource).toContain("export async function registerThemeTokens");
  });

  it("keeps theme registration idempotent by school and name", () => {
    expect(registrySource).toContain("eq(themeTokenRegistries.schoolId, schoolId)");
    expect(registrySource).toContain("eq(themeTokenRegistries.name, name)");
    expect(registrySource).toContain("update(themeTokenRegistries)");
    expect(themeSource).toContain('export { registerThemeTokens, recordThemeAudit };');
  });

  it("seeds dedicated phase52 governance demo plugins for UAT", () => {
    expect(source).toContain("DEV_GOVERNANCE_PLUGIN_DEFINITIONS");
    expect(source).toContain('id: "phase52-missing-dependency-plugin"');
    expect(source).toContain('dependencies: ["phase52-missing-provider-plugin"]');
    expect(source).toContain('id: "phase52-retain-uninstall-plugin"');
    expect(source).toContain("await upsertDevGovernancePlugin(seeded.school.id, seeded.teacher.id, definition)");
    expect(source).toContain('producer: "bootstrap-dev-db.phase52-governance"');
    expect(source).toContain("Phase 52 治理样本");
  });
});
