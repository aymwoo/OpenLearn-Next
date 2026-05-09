// @vitest-environment jsdom

import { readFileSync } from "node:fs";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PluginMarketplaceSurface } from "./plugin-marketplace-surface";

const source = readFileSync("src/components/surfaces/settings-surface.tsx", "utf8");
const teacherPageSource = readFileSync("src/app/(teacher)/teacher/page.tsx", "utf8");
const studentPageSource = readFileSync("src/app/(student)/student/page.tsx", "utf8");
const editorPageSource = readFileSync("src/app/(teacher)/teacher/editor/page.tsx", "utf8");
const marketplacePageSource = readFileSync("src/app/settings/plugins/page.tsx", "utf8");

const pluginActionMocks = vi.hoisted(() => ({
  listPluginsAction: vi.fn(async () => ({
    success: true,
    data: [
      {
        id: "plugin-1",
        schoolId: "school-1",
        name: "教师讲授",
        builtIn: true,
        defaultEnabled: true,
        enabled: true,
        killSwitchEnabled: false,
        manifestJson: { id: "builtin.direct-instruction" },
      },
    ],
  })),
  setPluginEnabledAction: vi.fn(),
}));

vi.mock("@/actions/plugin-actions", () => ({
  listPluginsAction: pluginActionMocks.listPluginsAction,
  setPluginEnabledAction: pluginActionMocks.setPluginEnabledAction,
}));

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserSchoolIds: vi.fn(async () => ["school-1"]),
}));

describe("settings and plugin entry surfaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("renders built-in marketplace cards with runtime toggle controls", async () => {
    render(await PluginMarketplaceSurface());

    expect(screen.getByText("系统内置教学环节")).toBeTruthy();
    expect(screen.getByText("教师讲授")).toBeTruthy();
    expect(screen.getAllByText("系统内置").length).toBeGreaterThan(0);
    expect(screen.getAllByText("默认开启").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "停用环节" })).toBeTruthy();
    expect(screen.getByText("builtin.direct-instruction")).toBeTruthy();

    const toggleForm = screen.getByRole("button", { name: "停用环节" }).closest("form");
    expect(toggleForm).toBeTruthy();

    fireEvent.submit(toggleForm!);

    await waitFor(() => {
      expect(pluginActionMocks.setPluginEnabledAction).toHaveBeenCalledWith({
        pluginId: "plugin-1",
        schoolId: "school-1",
        enabled: false,
      });
    });
  });

  it("adds plugin renderer anchors to teacher, student, and editor pages", () => {
    expect(teacherPageSource).toContain('anchor="dashboard.widget"');
    expect(studentPageSource).toContain('anchor="dashboard.widget"');
    expect(editorPageSource).toContain('anchor="lesson.sidebar"');
    expect(editorPageSource).toContain("contextPayload");
  });
});
