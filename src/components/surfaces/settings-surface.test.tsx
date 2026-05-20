// @vitest-environment jsdom

import { readFileSync } from "node:fs";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PluginMarketplaceSurface } from "./plugin-marketplace-surface";

const settingsSurfaceSource = readFileSync(
  "src/components/surfaces/settings-surface.tsx",
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
        pluginKey: "builtin/direct-instruction",
        dbNamespace: "builtin_direct_instruction",
        sourceType: "default" as const,
        installSource: "bootstrap" as const,
      },
    ],
  })),
  setPluginEnabledAction: vi.fn(),
  setPluginKillSwitchAction: vi.fn().mockResolvedValue({ success: true }),
  preflightUninstallPluginAction: vi.fn().mockResolvedValue({
    success: true,
    data: {
      pluginId: "plugin-1",
      schoolId: "school-1",
      blocked: true,
      reason: "UNINSTALL_BLOCKED_DEFAULT_PLUGIN",
      lessonExtCount: 0,
      stepExtCount: 0,
      resourceExtCount: 0,
      ownedBusinessCount: 0,
      totalCount: 0,
      impactedLessonIds: [],
      impactedLessonStepIds: [],
      impactedResourceIds: [],
      impactedBusinessKeys: [],
    },
  }),
  uninstallPluginAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/actions/plugin-actions", () => ({
  listPluginsAction: pluginActionMocks.listPluginsAction,
  setPluginEnabledAction: pluginActionMocks.setPluginEnabledAction,
  setPluginKillSwitchAction: pluginActionMocks.setPluginKillSwitchAction,
  preflightUninstallPluginAction: pluginActionMocks.preflightUninstallPluginAction,
  uninstallPluginAction: pluginActionMocks.uninstallPluginAction,
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

  it("wires settings labs plugin management to operator lifecycle surface", () => {
    expect(settingsSurfaceSource).toContain("PluginLifecycleOperatorSurface");
    expect(settingsSurfaceSource).toContain("<PluginLifecycleOperatorSurface schoolId={schoolId} plugins={plugins} />");
    expect(settingsSurfaceSource).toContain('href="/settings/labs/async-tasks"');
    expect(settingsSurfaceSource).toContain('href="/settings/labs/runtime-inspector"');
    expect(settingsSurfaceSource).toContain('href="/settings/plugins"');
  });

  it("renders built-in marketplace cards with runtime toggle controls", async () => {
    render(await PluginMarketplaceSurface());

    expect(screen.getByText("系统内置教学环节")).toBeTruthy();
    expect(screen.getByText("教师讲授")).toBeTruthy();
    expect(screen.getAllByText("系统内置").length).toBeGreaterThan(0);
    expect(screen.getAllByText("默认开启").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "停用环节" })).toBeTruthy();
    expect(screen.getByText("Key: builtin/direct-instruction")).toBeTruthy();
    expect(screen.getByText("NS: builtin_direct_instruction")).toBeTruthy();
    expect(screen.getByText("Type: default")).toBeTruthy();

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

  it("submits marketplace toggle through enable action only", async () => {
    render(await PluginMarketplaceSurface());

    const toggleButtons = screen.getAllByRole("button", { name: "停用环节" });
    fireEvent.submit(toggleButtons[0].closest("form")!);

    await waitFor(() => {
      expect(pluginActionMocks.setPluginEnabledAction).toHaveBeenCalledWith({
        pluginId: "plugin-1",
        schoolId: "school-1",
        enabled: false,
      });
    });
    expect(pluginActionMocks.setPluginKillSwitchAction).not.toHaveBeenCalled();
    expect(pluginActionMocks.preflightUninstallPluginAction).not.toHaveBeenCalled();
    expect(pluginActionMocks.uninstallPluginAction).not.toHaveBeenCalled();
  });
});
