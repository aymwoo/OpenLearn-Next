// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pluginActionMocks = vi.hoisted(() => ({
  setPluginEnabledAction: vi.fn().mockResolvedValue({ success: true }),
  setPluginKillSwitchAction: vi.fn().mockResolvedValue({ success: true }),
  preflightUninstallPluginAction: vi.fn(),
  uninstallPluginAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/actions/plugin-actions", () => pluginActionMocks);
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const dashboardBundle = {
  executableActionCatalog: [
    {
      actionKey: "createNotificationStub",
      title: "创建通知草稿",
      description: "创建教师通知占位草稿。",
      ownerType: "external-plugin",
      ownerPluginKey: "vendor/mounted",
      ownerPluginId: "plugin-mounted",
      ownerDisplayName: "挂载插件",
      permissions: [],
      hooks: ["dashboard.widget"],
      lifecycleState: "active",
      catalogView: "executable",
    },
  ],
  blockedActionDiagnostics: [
    {
      actionKey: "createNotificationStub",
      title: "创建通知草稿",
      description: "创建教师通知占位草稿。",
      ownerType: "external-plugin",
      ownerPluginKey: "vendor/ext",
      ownerPluginId: "plugin-ext",
      ownerDisplayName: "外部插件",
      permissions: [],
      hooks: ["dashboard.widget"],
      lifecycleState: "installed",
      catalogView: "blocked-diagnostic",
      internalLifecycleSubstate: "disabled",
      reasonCode: "plugin_not_enabled",
      recommendedRecoveryAction: "enable",
    },
  ],
  pluginLifecycleRows: [
    {
      pluginId: "plugin-mounted",
      pluginKey: "vendor/mounted",
      name: "挂载插件",
      sourceType: "external",
      lifecycleState: "active",
      internalLifecycleSubstate: "mounted",
      reasonCode: null,
      recommendedRecoveryAction: null,
      builtIn: false,
      defaultEnabled: false,
      nonDeletable: false,
      killSwitchEnabled: false,
      blocked: false,
      uninstall: {
        posture: "retain",
        cleanupRequested: false,
        blocked: false,
        reasonCode: null,
        recommendedRecoveryAction: null,
        cleanupConfirmationToken: "cleanup:plugin-mounted:0:0:0:0:0",
        preflightSummary: {
          lessonExtCount: 0,
          stepExtCount: 0,
          resourceExtCount: 0,
          ownedBusinessCount: 0,
          totalCount: 0,
        },
      },
    },
    {
      pluginId: "plugin-ready",
      pluginKey: "vendor/ready",
      name: "就绪插件",
      sourceType: "external",
      lifecycleState: "active",
      internalLifecycleSubstate: "ready",
      reasonCode: null,
      recommendedRecoveryAction: null,
      builtIn: false,
      defaultEnabled: false,
      nonDeletable: false,
      killSwitchEnabled: false,
      blocked: false,
      uninstall: {
        posture: "retain",
        cleanupRequested: false,
        blocked: false,
        reasonCode: null,
        recommendedRecoveryAction: null,
        cleanupConfirmationToken: "cleanup:plugin-ready:0:0:0:0:0",
        preflightSummary: {
          lessonExtCount: 0,
          stepExtCount: 0,
          resourceExtCount: 0,
          ownedBusinessCount: 0,
          totalCount: 0,
        },
      },
    },
    {
      pluginId: "plugin-default",
      pluginKey: "builtin/default",
      name: "默认插件",
      sourceType: "default",
      lifecycleState: "enabled",
      internalLifecycleSubstate: "enabled",
      reasonCode: null,
      recommendedRecoveryAction: null,
      builtIn: true,
      defaultEnabled: true,
      nonDeletable: true,
      killSwitchEnabled: false,
      blocked: false,
      uninstall: {
        posture: "retain",
        cleanupRequested: false,
        blocked: true,
        reasonCode: "default_plugin",
        recommendedRecoveryAction: null,
        cleanupConfirmationToken: "cleanup:plugin-default:0:0:0:0:0",
        preflightSummary: {
          lessonExtCount: 0,
          stepExtCount: 0,
          resourceExtCount: 0,
          ownedBusinessCount: 0,
          totalCount: 0,
        },
      },
    },
    {
      pluginId: "plugin-ext",
      pluginKey: "vendor/ext",
      name: "外部插件",
      sourceType: "external",
      lifecycleState: "installed",
      internalLifecycleSubstate: "disabled",
      reasonCode: "not_enabled",
      recommendedRecoveryAction: "enable",
      builtIn: false,
      defaultEnabled: false,
      nonDeletable: false,
      killSwitchEnabled: false,
      blocked: true,
      uninstall: {
        posture: "retain",
        cleanupRequested: false,
        blocked: false,
        reasonCode: null,
        recommendedRecoveryAction: null,
        cleanupConfirmationToken: "cleanup:plugin-ext:1:2:1:3:7",
        preflightSummary: {
          lessonExtCount: 1,
          stepExtCount: 2,
          resourceExtCount: 1,
          ownedBusinessCount: 3,
          totalCount: 7,
        },
      },
    },
    {
      pluginId: "plugin-enabled",
      pluginKey: "vendor/enabled",
      name: "运行中插件",
      sourceType: "external",
      lifecycleState: "active",
      internalLifecycleSubstate: "ready",
      reasonCode: null,
      recommendedRecoveryAction: null,
      builtIn: false,
      defaultEnabled: false,
      nonDeletable: false,
      killSwitchEnabled: false,
      blocked: false,
      uninstall: {
        posture: "retain",
        cleanupRequested: false,
        blocked: false,
        reasonCode: null,
        recommendedRecoveryAction: null,
        cleanupConfirmationToken: "cleanup:plugin-enabled:0:0:0:0:0",
        preflightSummary: {
          lessonExtCount: 0,
          stepExtCount: 0,
          resourceExtCount: 0,
          ownedBusinessCount: 0,
          totalCount: 0,
        },
      },
    },
  ],
} as const;

describe("plugin lifecycle operator surface", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "true");
    });
    HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
      this.removeAttribute("open");
    });
  });

  it("defaults to executable catalog and hides internal mounted ready lifecycle labels", async () => {
    const { PluginLifecycleOperatorSurface } = await import("./plugin-lifecycle-operator-surface");

    render(
      <PluginLifecycleOperatorSurface
        schoolId="school-1"
        dashboard={dashboardBundle}
      />,
    );

    expect(screen.getAllByText("运行中").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "查看治理诊断" })).toBeTruthy();
    expect(screen.getByText("action: createNotificationStub")).toBeTruthy();
    expect(screen.queryByText(/internal diagnostic only/)).toBeNull();
  });

  it("shows governance diagnostics and requires explicit cleanup confirmation", async () => {
    const { PluginLifecycleOperatorSurface } = await import("./plugin-lifecycle-operator-surface");

    render(
      <PluginLifecycleOperatorSurface
        schoolId="school-1"
        dashboard={dashboardBundle}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "查看治理诊断" })[0]);

    expect(screen.getByText("该插件由系统提供，可启用或停用，但不会作为可删除扩展处理。")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "确认卸载插件" })).toBeNull();
    expect(screen.getAllByText(/reason code:/).length).toBeGreaterThan(0);
    expect(screen.queryByText("action: createNotificationStub")).toBeNull();

    const externalPluginCard = screen.getByText("外部插件").closest("article");
    expect(externalPluginCard).toBeTruthy();

    fireEvent.click(within(externalPluginCard!).getByRole("button", { name: "查看卸载影响" }));

    expect(screen.getByText("卸载前检查")).toBeTruthy();
    expect(screen.getByText("lessons")).toBeTruthy();
    expect(screen.getByText("lesson steps")).toBeTruthy();
    expect(screen.getByText("resources")).toBeTruthy();
    expect(screen.getByText("plugin-owned data")).toBeTruthy();

    fireEvent.click(within(externalPluginCard!).getByRole("button", { name: "打开卸载确认" }));
    expect(screen.getByRole("button", { name: "确认卸载插件" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "确认卸载插件" }));

    await waitFor(() => {
      expect(pluginActionMocks.uninstallPluginAction).toHaveBeenCalledWith({
        pluginId: "plugin-ext",
        schoolId: "school-1",
        retentionMode: "retain",
        confirmationToken: undefined,
      });
    });

    fireEvent.click(within(externalPluginCard!).getByRole("button", { name: "打开卸载确认" }));

    fireEvent.click(screen.getByRole("checkbox", { name: "改为 cleanup 卸载" }));
    fireEvent.click(screen.getByRole("button", { name: "确认卸载插件" }));

    expect(pluginActionMocks.uninstallPluginAction).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("checkbox", { name: "我已确认 cleanup" }));
    fireEvent.click(screen.getByRole("button", { name: "确认卸载插件" }));

    await waitFor(() => {
      expect(pluginActionMocks.uninstallPluginAction).toHaveBeenLastCalledWith({
        pluginId: "plugin-ext",
        schoolId: "school-1",
        retentionMode: "cleanup",
        confirmationToken: "cleanup:plugin-ext:1:2:1:3:7",
      });
    });
  });

  it("dispatches the plugin kill switch action from the targeted plugin card", async () => {
    const { PluginLifecycleOperatorSurface } = await import("./plugin-lifecycle-operator-surface");

    render(
      <PluginLifecycleOperatorSurface
        schoolId="school-1"
        dashboard={dashboardBundle}
      />,
    );

    const pluginCard = screen.getByText("运行中插件", { selector: "p" }).closest("article");
    expect(pluginCard).toBeTruthy();

    fireEvent.click(within(pluginCard!).getByRole("button", { name: "紧急挂起" }));

    await waitFor(() => {
      expect(pluginActionMocks.setPluginKillSwitchAction).toHaveBeenCalledWith({
        pluginId: "plugin-enabled",
        killSwitchEnabled: true,
      });
    });
  });
});
