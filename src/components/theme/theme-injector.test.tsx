import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const themeInjectorSource = readFileSync("src/components/theme/theme-injector.tsx", "utf8");
const teacherShellSource = readFileSync("src/components/shell/teacher-sidebar-shell.tsx", "utf8");
const studentShellSource = readFileSync("src/components/shell/student-shell.tsx", "utf8");
const stageHeroSource = readFileSync("src/components/surfaces/stage-hero.tsx", "utf8");

describe("theme default regression guards", () => {
  it("derives the current actor theme source from one shared runtime helper", () => {
    expect(themeInjectorSource).toContain("getCurrentActorThemeRuntimeState");
    expect(teacherShellSource).toContain("getCurrentActorThemeRuntimeState");
    expect(themeInjectorSource).toContain("data-theme-layout-source={themeSource}");
  });

  it("keeps aurora shells behind active themes only", () => {
    expect(teacherShellSource).toContain('themeSource === "active-theme"');
    expect(studentShellSource).toContain("themeSource: 'default' | 'active-theme'");
    expect(studentShellSource).toContain("if (themeSource === 'default')");
    expect(studentShellSource).toContain('data-theme-layout-source={themeSource}');
  });

  it("prevents stage hero copy from collapsing beside header actions", () => {
    expect(stageHeroSource).toContain("min-w-0 flex-1 max-w-4xl");
    expect(stageHeroSource).toContain("lg:shrink-0");
  });
});
