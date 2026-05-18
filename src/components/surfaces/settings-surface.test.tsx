// @vitest-environment jsdom

import { readFileSync } from "node:fs";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PluginMarketplaceSurface } from "./plugin-marketplace-surface";

const source = readFileSync(
  "src/components/surfaces/settings-surface.tsx",
  "utf8",
);
const widthsSource = readFileSync(
  "src/components/surfaces/surface-widths.ts",
  "utf8",
);
const teacherPageSource = readFileSync(
  "src/app/(teacher)/teacher/page.tsx",
  "utf8",
);
const homeSource = readFileSync(
  "src/components/surfaces/home-surface.tsx",
  "utf8",
);
const studentPageSource = readFileSync(
  "src/app/(student)/student/page.tsx",
  "utf8",
);
const studentsSource = readFileSync(
  "src/components/surfaces/students-management-surface.tsx",
  "utf8",
);
const editorPageSource = readFileSync(
  "src/app/(teacher)/teacher/editor/page.tsx",
  "utf8",
);
const marketplacePageSource = readFileSync(
  "src/app/settings/plugins/page.tsx",
  "utf8",
);
const marketplaceSurfaceSource = readFileSync(
  "src/components/surfaces/plugin-marketplace-surface.tsx",
  "utf8",
);

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
      layoutSummary: {
        shellMode: "top-nav-secondary-rail",
        shellLabel: "顶部导航 + 左侧辅栏",
        mainSplit: "60/40",
        mainSplitLabel: "主内容 60:40",
        helperRegionSummary: [
          "启用左侧辅栏",
          "启用上下文侧栏",
          "未启用页面底栏",
        ],
        fallbackRegions: [],
        fallbackLabel: null,
        description:
          "顶部导航 + 左侧辅栏 / 主内容 60:40 / 启用左侧辅栏 / 启用上下文侧栏 / 未启用页面底栏",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "theme-2",
      schoolId: "school-1",
      name: "晨光教务台主题",
      tokenJson: {},
      validationStatus: "valid",
      layoutSummary: {
        shellMode: "left-nav",
        shellLabel: "左侧导航",
        mainSplit: "50/50",
        mainSplitLabel: "主内容 50:50",
        helperRegionSummary: [
          "未启用左侧辅栏",
          "未启用上下文侧栏",
          "未启用页面底栏",
        ],
        fallbackRegions: ["context-panel"],
        fallbackLabel: "局部回退：context-panel",
        description:
          "左侧导航 / 主内容 50:50 / 未启用左侧辅栏 / 未启用上下文侧栏 / 未启用页面底栏 / 局部回退：context-panel",
      },
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

vi.mock("@/lib/dal/system-transport-settings", () => ({
  getSystemTransportSettings: vi.fn(async () => ({
    classroomTransportMode: "local_only",
    effectiveMode: "local_only",
    deployStatus: "deploy_disallowed",
    canManage: true,
    deployAllowsRedis: false,
    redisConfigured: false,
    redisReachable: false,
    degraded: false,
    degradedReason: null,
    updatedById: null,
    updatedAt: null,
    health: {
      deployAllowsRedis: false,
      redisConfigured: false,
      redisReachable: false,
      connectionState: "disabled",
      desiredTopicCount: 0,
      subscribedTopicCount: 0,
      lastError: null,
      lastHealthyAt: null,
      instanceId: "instance-test",
    },
  })),
}));

vi.mock("@/actions/system-transport-settings-actions", () => ({
  setSystemTransportModeAction: vi.fn(),
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
    expect(source).toContain("!activeThemeId ? (");
    expect(source).toContain('<Badge className="bg-primary text-white">');
    expect(source).toContain("结构摘要");
    expect(source).not.toContain(
      "function getThemeDescription(themeName: string)",
    );
    expect(source).toContain("左侧导航 / 主内容 60:40");
    expect(source).toContain("局部回退");
    expect(source).toContain("teacherSurfaceRhythm.cardInset");
    expect(source).toContain("teacherSurfaceRhythm.card");
  });

  it("reuses a shared width contract across affected surfaces", () => {
    expect(widthsSource).toContain('publicShell: "mx-auto w-full max-w-[1520px]"');
    expect(widthsSource).toContain('workspace: "mx-auto w-full max-w-[1360px]"');
    expect(source).toContain("surfaceWidths.workspace");
    expect(homeSource).toContain("surfaceWidths.publicShell");
    expect(homeSource).toContain("surfaceWidths.heroTitle");
    expect(homeSource).toContain("surfaceWidths.heroBody");
    expect(marketplaceSurfaceSource).toContain("surfaceWidths.workspace");
    expect(studentsSource).toContain("surfaceWidths.workspace");
    expect(studentPageSource).toContain("surfaceWidths.workspace");
    expect(source).not.toContain("max-w-[1280px]");
    expect(marketplaceSurfaceSource).not.toContain("max-w-[1360px]");
    expect(studentsSource).not.toContain("max-w-[1280px]");
  });

  it("keeps settings on the shared teacher rhythm without horizontal scroll wrappers", () => {
    expect(source).toContain("surfaceWidths.heroTitle");
    expect(source).toContain("surfaceWidths.heroBody");
    expect(source).toContain("teacherSurfaceRhythm.hero");
    expect(source).toContain("teacherSurfaceRhythm.stack");
    expect(source).not.toContain("overflow-x-auto");
  });

  it("renders plugin management controls in labs settings", () => {
    expect(source).toContain("插件管理");
    expect(source).toContain("setPluginEnabledAction");
    expect(source).toContain("总开关");
    expect(source).toContain("/settings/labs");
  });

  it("renders system transport controls on /settings with deploy authority copy", () => {
    expect(source).toContain("全局课堂传输模式");
    expect(source).toContain("effective mode");
    expect(source).toContain("deployAllowsRedis");
    expect(source).toContain("切回 local_only");
    expect(source).toContain("启用 redis_fanout");
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

    const toggleForm = screen
      .getByRole("button", { name: "停用环节" })
      .closest("form");
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
