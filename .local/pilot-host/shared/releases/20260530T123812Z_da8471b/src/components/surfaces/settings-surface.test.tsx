// @vitest-environment jsdom

import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClassroomIncidentListSurface } from "./classroom-incident-list-surface";
import { PluginMarketplaceSurface } from "./plugin-marketplace-surface";
import type { ClassroomIncidentListDTO } from "@/lib/dto/classroom-incident-list";

const settingsSurfaceSource = readFileSync(
  "src/components/surfaces/settings-surface.tsx",
  "utf8",
);
const settingsLabsPageSource = readFileSync(
  "src/app/settings/labs/page.tsx",
  "utf8",
);
const settingsLabsIncidentsPageSource = readFileSync(
  "src/app/settings/labs/incidents/page.tsx",
  "utf8",
);
const classroomIncidentListSurfaceSource = readFileSync(
  "src/components/surfaces/classroom-incident-list-surface.tsx",
  "utf8",
);
const packageJsonSource = readFileSync("package.json", "utf8");

const classroomIncidentListFixture: ClassroomIncidentListDTO = {
  scopeRole: "developer",
  rows: [
    {
      classroomSessionId: "session-1",
      classId: "class-1",
      className: "高一（1）班",
      lessonId: "lesson-1",
      lessonTitle: "课堂投票：生态系统稳态",
      lessonVersionLabel: "v7",
      posture: "failed",
      summary: "课堂投票插件当前不可继续执行，教师端结果汇总未完成。",
      impactScope: "current_classroom",
      updatedAt: "2026-05-26T03:12:00.000Z",
      detailHref: "/settings/labs/incidents/session-1",
      relationChips: [
        {
          kind: "plugin",
          label: "课堂投票插件",
          href: "/settings/labs/plugins/plugin-1",
        },
        {
          kind: "command",
          label: "plugin.resume · failed",
          href: "/settings/labs/commands/command-1",
        },
      ],
    },
  ],
  emptyState: null,
};

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

  afterEach(() => {
    cleanup();
  });

  it("keeps settings labs as an incident-first fallback instead of a mega dashboard", () => {
    expect(settingsSurfaceSource).toContain("ClassroomIncidentListSurface");
    expect(settingsSurfaceSource).toContain("getClassroomIncidentListDTO");
    expect(settingsSurfaceSource).toContain("Settings Labs");
    expect(settingsSurfaceSource).toContain("incident-first fallback entry");
    expect(settingsSurfaceSource).toContain("Runtime Inspector");
    expect(settingsSurfaceSource).toContain("Async Operator");
    expect(settingsSurfaceSource).toContain("Plugin Governance");
    expect(settingsSurfaceSource).not.toContain("Platform Event Operator");
    expect(settingsSurfaceSource).not.toContain("AI Contract Discoverability");
  });

  it("registers verify:phase54 as the focused regression gate", () => {
    const pkg = JSON.parse(packageJsonSource) as {
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.["verify:phase54"]).toBe(
      "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase54-ai-contracts.ts",
    );
  });

  it("makes settings labs incident-first before tool next hops", () => {
    expect(settingsLabsPageSource).toContain("SettingsSurface mode=\"labs\"");
    expect(settingsSurfaceSource).toContain("ClassroomIncidentListSurface");
    expect(settingsSurfaceSource).toContain("getClassroomIncidentListDTO");
    expect(settingsLabsIncidentsPageSource).toContain("getClassroomIncidentListDTO");
    expect(settingsLabsIncidentsPageSource).toContain("ClassroomIncidentListSurface");
    expect(settingsSurfaceSource).toContain("Runtime Inspector");
    expect(settingsSurfaceSource).toContain("Async Operator");
    expect(settingsSurfaceSource).toContain("Plugin Governance");

    expect(settingsSurfaceSource.indexOf("ClassroomIncidentListSurface")).toBeLessThan(
      settingsSurfaceSource.indexOf("Runtime Inspector"),
    );
  });

  it("adds a dedicated incidents route that renders the classroom-first list surface", () => {
    expect(settingsLabsIncidentsPageSource).toContain("getClassroomIncidentListDTO");
    expect(settingsLabsIncidentsPageSource).toContain("ClassroomIncidentListSurface");
    expect(settingsLabsIncidentsPageSource).not.toContain("Runtime Inspector");
    expect(settingsLabsIncidentsPageSource).not.toContain("Async Operator");
  });

  it("renders classroom incidents as stacked cards with capped relation chips", () => {
    render(<ClassroomIncidentListSurface list={classroomIncidentListFixture} />);

    expect(screen.getByText("查看课堂事件")).toBeTruthy();
    expect(screen.getByText("课堂投票：生态系统稳态")).toBeTruthy();
    expect(screen.getByText("current classroom")).toBeTruthy();
    expect(screen.getByText("课堂投票插件")).toBeTruthy();
    expect(screen.getByText("plugin.resume · failed")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();

    const card = screen.getByTestId("incident-card-session-1");
    const chips = within(card).getAllByTestId(/incident-chip-/);
    expect(chips).toHaveLength(2);
    expect(
      within(card).getByRole("link", { name: "查看课堂事件" }).getAttribute("href"),
    ).toBe("/settings/labs/incidents/session-1");
  });

  it("uses the UI-SPEC empty and error copy with operator next hops", () => {
    const { rerender } = render(
      <ClassroomIncidentListSurface
        list={{ ...classroomIncidentListFixture, rows: [], emptyState: "当前没有需要 operator 介入的课堂事件" }}
      />,
    );

    expect(screen.getByText("当前没有需要 operator 介入的课堂事件")).toBeTruthy();
    expect(
      screen.getAllByText(
        "当前课堂、插件与异步链路保持可继续状态。若要主动巡检，请进入 Runtime Inspector 或 Async Operator。",
      ).length,
    ).toBeGreaterThan(0);

    rerender(<ClassroomIncidentListSurface list={null} error="LOAD_FAILED" />);

    expect(
      screen.getAllByText(
        "当前无法加载课堂事件关联真相。请先刷新页面；若仍失败，改从 Runtime Inspector、Async Operator 或插件治理详情继续排查。",
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Runtime Inspector" }).getAttribute("href")).toBe(
      "/settings/labs/runtime-inspector",
    );
    expect(screen.getByRole("link", { name: "Async Operator" }).getAttribute("href")).toBe(
      "/settings/labs/async-tasks",
    );
    expect(screen.getByRole("link", { name: "Plugin Governance" }).getAttribute("href")).toBe(
      "/settings/plugins",
    );
  });

  it("keeps the list surface out of dense table and border-heavy patterns", () => {
    expect(classroomIncidentListSurfaceSource).not.toContain("<table");
    expect(classroomIncidentListSurfaceSource).not.toContain("grid-cols-12");
    expect(classroomIncidentListSurfaceSource).not.toContain("divide-y");
    expect(classroomIncidentListSurfaceSource).not.toContain("border-b");
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

  it("surfaces marketplace plugin load failures instead of faking an empty state", async () => {
    pluginActionMocks.listPluginsAction.mockResolvedValueOnce({
      success: false,
      error: "PLUGIN_LIST_FAILED",
    } as unknown as Awaited<ReturnType<typeof pluginActionMocks.listPluginsAction>>);

    render(await PluginMarketplaceSurface());

    expect(screen.getByText("插件列表加载失败：PLUGIN_LIST_FAILED")).toBeTruthy();
    expect(screen.queryByText("当前学校还没有可见的系统内置教学环节。完成 seed 或启用后，这里会显示系统内置目录与默认开启状态。")).toBeNull();
  });
});
