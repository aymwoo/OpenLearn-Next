import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/lib/dal/themes.ts", "utf8");

describe("theme DAL guards", () => {
  it("exports a school-scoped valid theme listing", () => {
    expect(source).toContain("export async function getValidThemesForSchool");
    expect(source).toContain('eq(themeTokenRegistries.schoolId, schoolId)');
    expect(source).toContain('eq(themeTokenRegistries.validationStatus, "valid")');
    expect(source).toContain("layoutSummary");
  });

  it("resolves the active theme through current actor school membership", () => {
    expect(source).toContain("export async function getActiveThemeForCurrentActor");
    expect(source).toContain("getCurrentUserDTO");
    expect(source).toContain("getUserMembershipsDTO");
    expect(source).toContain('theme.validationStatus !== "valid"');
    expect(source).toContain("schoolIds.includes(theme.schoolId)");
  });

  it("exports a compiled active theme runtime with default fallback behavior", () => {
    expect(source).toContain("export async function getActiveThemeRuntimeForCurrentActor");
    expect(source).toContain("compileThemeLayoutRuntime(theme.tokenJson)");
    expect(source).toContain("layoutSummary: layoutRuntime.summary");
  });
});
