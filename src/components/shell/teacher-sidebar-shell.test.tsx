import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/shell/teacher-sidebar-shell.tsx", "utf8");

describe("TeacherSidebarShell theme layout hooks", () => {
  it("renders all allowlisted shell modes with fallback-safe regions", () => {
    expect(source).toContain('left-nav');
    expect(source).toContain('ALLOWLISTED_SHELL_MODES');
    expect(source).toContain('data-theme-shell-mode');
    expect(source).toContain('data-theme-layout-source');
    expect(source).toContain('primary-nav');
    expect(source).toContain('page-header');
    expect(source).toContain('main-content');
    expect(source).toContain('secondary-nav');
  });

  it("keeps current layout variables behind the shared theme runtime state", () => {
    expect(source).toContain('getCurrentActorThemeRuntimeState');
    expect(source).toContain('var(--layout-shell-gap, 0rem)');
    expect(source).toContain('var(--layout-sidebar-width, 16rem)');
    expect(source).toContain('var(--layout-shell-inset, 0.5rem)');
    expect(source).toContain('var(--layout-content-radius, 2rem)');
    expect(source).toContain('themeSource === "active-theme"');
  });
});
