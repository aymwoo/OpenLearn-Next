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

vi.mock("@/lib/dal/themes", () => ({
  getValidThemesForSchool: vi.fn(async () => [
    {
      id: "theme-1",
      schoolId: "school-1",
      name: "星夜课堂主题",
      tokenJson: {},
      validationStatus: "valid",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "theme-2",
      schoolId: "school-1",
      name: "晨光教务台主题",
      tokenJson: {},
      validationStatus: "valid",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]),
}));

vi.mock("@/lib/theme-cookie", () => ({
  getActiveThemeId: vi.fn(async () => "theme-1"),
}));

vi.mock("@/actions/theme-actions", () => ({
  setActiveThemeAction: vi.fn(),
}));

describe("settings and plugin entry surfaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wires theme controls to the theme action and valid school themes", () => {
    expect(source).toContain("默认主题");
    expect(source).toContain("setActiveThemeAction");
    expect(source).toContain("getValidThemesForSchool");
    expect(source).toContain("getActiveThemeId");
    expect(source).toContain("当前使用中");
  });

  it("tracks active theme state for default and alternate theme cards", () => {
    expect(source).toContain("const activeThemeId = await getActiveThemeId()");
    expect(source).toContain("activeThemeId === theme.id");
    expect(source).toContain("!activeThemeId ? <Badge className=\"bg-primary text-white\">当前使用中</Badge> : null");
    expect(source).toContain("function getThemeDescription(themeName: string)");
    expect(source).toContain("themeName.includes('晨光')");
    expect(source).toContain("偏深色夜空语义，强化蓝紫主色与沉浸式课堂氛围。");
    expect(source).toContain("更明亮的教务工作台语义，拉开侧栏宽度与壳层留白，形成更强的运营台布局节奏。");
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
