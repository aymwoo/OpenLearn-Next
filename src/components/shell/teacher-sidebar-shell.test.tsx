import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const shellSource = readFileSync("src/components/shell/teacher-sidebar-shell.tsx", "utf8");
const layoutSource = readFileSync("src/app/(teacher)/teacher/layout.tsx", "utf8");

describe("TeacherSidebarShell theme layout hooks", () => {
  it("renders all allowlisted shell modes with fallback-safe regions", () => {
    expect(shellSource).toContain('left-nav');
    expect(shellSource).toContain('ALLOWLISTED_SHELL_MODES');
    expect(shellSource).toContain('data-theme-shell-mode');
    expect(shellSource).toContain('data-theme-layout-source');
    expect(shellSource).toContain('primary-nav');
    expect(shellSource).toContain('page-header');
    expect(shellSource).toContain('main-content');
    expect(shellSource).toContain('secondary-nav');
  });

  it("keeps current layout variables behind the shared theme runtime state", () => {
    expect(shellSource).toContain('getCurrentActorThemeRuntimeState');
    expect(shellSource).toContain('var(--layout-shell-gap, 0rem)');
    expect(shellSource).toContain('var(--layout-sidebar-width, 16rem)');
    expect(shellSource).toContain('var(--layout-shell-inset, 0.5rem)');
    expect(shellSource).toContain('var(--layout-content-radius, 2rem)');
    expect(shellSource).toContain('themeSource === "active-theme"');
  });

  it("keeps fallback shell static while theme runtime stays in the async path", () => {
    expect(shellSource).toContain('export function TeacherSidebarShellFrame');
    expect(shellSource).toContain('layoutRuntime = DEFAULT_THEME_LAYOUT_RUNTIME');
    expect(shellSource).toContain('themeSource = "default"');
    expect(shellSource).toContain('export async function TeacherSidebarShell');
    expect(shellSource).toContain('await getCurrentActorThemeRuntimeState()');
    expect(shellSource).toContain('return <TeacherSidebarShellFrame {...props} layoutRuntime={layoutRuntime} themeSource={themeSource} />;');
    expect(layoutSource).toContain('fallback={<TeacherShellFallback />}');
    expect(layoutSource).toContain('<TeacherSidebarShellFrame routeKey="/teacher"');
    expect(layoutSource).not.toContain('<TeacherSidebarShell routeKey="/teacher"');
  });
});
