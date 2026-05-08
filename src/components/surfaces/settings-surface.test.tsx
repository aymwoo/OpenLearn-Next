import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/surfaces/settings-surface.tsx", "utf8");
const teacherPageSource = readFileSync("src/app/(teacher)/teacher/page.tsx", "utf8");
const studentPageSource = readFileSync("src/app/(student)/student/page.tsx", "utf8");
const editorPageSource = readFileSync("src/app/(teacher)/teacher/editor/page.tsx", "utf8");
const marketplacePageSource = readFileSync("src/app/settings/plugins/page.tsx", "utf8");

describe("settings and plugin entry surfaces", () => {
  it("wires theme controls to the theme action and valid school themes", () => {
    expect(source).toContain("默认主题");
    expect(source).toContain("setActiveThemeAction");
    expect(source).toContain("getValidThemesForSchool");
  });

  it("renders plugin management controls in labs settings", () => {
    expect(source).toContain("插件管理");
    expect(source).toContain("setPluginEnabledAction");
    expect(source).toContain("总开关");
    expect(source).toContain("/settings/labs");
  });

  it("links settings to the dedicated plugin marketplace route", () => {
    expect(source).toContain("/settings/plugins");
    expect(source).toContain("插件市场");
    expect(marketplacePageSource).toContain("PluginMarketplaceSurface");
  });

  it("adds plugin renderer anchors to teacher, student, and editor pages", () => {
    expect(teacherPageSource).toContain('anchor="dashboard.widget"');
    expect(studentPageSource).toContain('anchor="dashboard.widget"');
    expect(editorPageSource).toContain('anchor="lesson.sidebar"');
    expect(editorPageSource).toContain("contextPayload");
  });
});
