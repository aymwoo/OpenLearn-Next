// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GovernanceDashboardBundle } from "@/features/platform-core/actions/registry";

const pluginActionMocks = vi.hoisted(() => ({
  setPluginEnabledAction: vi.fn().mockResolvedValue({ success: true }),
  setPluginKillSwitchAction: vi.fn().mockResolvedValue({ success: true }),
  preflightUninstallPluginAction: vi.fn().mockResolvedValue({
    success: true,
    data: {
      pluginId: "plugin-ext",
      schoolId: "school-1",
      blocked: false,
      reason: null,
      lessonExtCount: 1,
      stepExtCount: 2,
      resourceExtCount: 1,
      ownedBusinessCount: 3,
      totalCount: 7,
      impactedLessonIds: ["lesson-1"],
      impactedLessonStepIds: ["step-1", "step-2"],
      impactedResourceIds: ["resource-1"],
      impactedBusinessKeys: ["dashboard", "settings", "gradebook"],
      cleanupConfirmationToken: "cleanup:plugin-ext:1:2:1:3:7",
    },
  }),
  uninstallPluginAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/actions/plugin-actions", () => pluginActionMocks);
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const dashboardBundle: GovernanceDashboardBundle = {
  executableActionCatalog: [
    {
      actionKey: "createNotificationStub",
      ownerType: "external-plugin",
      ownerPluginKey: "vendor/mounted",
      inputSchemaKey: "plugin-action.payload.generic",
      requiredPermission: null,
      sideEffectClass: "notification-stub",
      implementationSource: "main-repo-static-implementation",
      ownerPluginId: "plugin-mounted",
      ownerDisplayName: "挂载插件",
      lifecycleState: "active",
      catalogView: "executable",
    },
  ],
  blockedActionDiagnostics: [
    {
      actionKey: "createNotificationStub",
      ownerType: "external-plugin",
      ownerPluginKey: "vendor/ext",
      inputSchemaKey: "plugin-action.payload.generic",
      requiredPermission: null,
      sideEffectClass: "notification-stub",
      implementationSource: "main-repo-static-implementation",
      ownerPluginId: "plugin-ext",
      ownerDisplayName: "外部插件",
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
      executableActionCatalog: [
        {
          actionKey: "createNotificationStub",
          ownerType: "external-plugin",
          ownerPluginKey: "vendor/mounted",
          inputSchemaKey: "plugin-action.payload.generic",
          requiredPermission: null,
          sideEffectClass: "notification-stub",
          implementationSource: "main-repo-static-implementation",
          ownerPluginId: "plugin-mounted",
          ownerDisplayName: "挂载插件",
          lifecycleState: "active",
          catalogView: "executable",
        },
      ],
      blockedActionDiagnostics: [],
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
      executableActionCatalog: [],
      blockedActionDiagnostics: [],
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
      blocked: true,
      uninstall: {
        posture: "retain",
        cleanupRequested: false,
        blocked: true,
        reasonCode: null,
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
      executableActionCatalog: [],
      blockedActionDiagnostics: [
        {
          actionKey: "createNotificationStub",
          ownerType: "default-plugin",
          ownerPluginKey: "builtin/default",
          inputSchemaKey: "plugin-action.payload.generic",
          requiredPermission: null,
          sideEffectClass: "notification-stub",
          implementationSource: "main-repo-static-implementation",
          ownerPluginId: "plugin-default",
          ownerDisplayName: "默认插件",
          lifecycleState: "enabled",
          catalogView: "blocked-diagnostic",
          internalLifecycleSubstate: "enabled",
          reasonCode: "plugin_not_enabled",
          recommendedRecoveryAction: "enable",
        },
      ],
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
      executableActionCatalog: [],
      blockedActionDiagnostics: [
        {
          actionKey: "createNotificationStub",
          ownerType: "external-plugin",
          ownerPluginKey: "vendor/ext",
          inputSchemaKey: "plugin-action.payload.generic",
          requiredPermission: null,
          sideEffectClass: "notification-stub",
          implementationSource: "main-repo-static-implementation",
          ownerPluginId: "plugin-ext",
          ownerDisplayName: "外部插件",
          lifecycleState: "installed",
          catalogView: "blocked-diagnostic",
          internalLifecycleSubstate: "disabled",
          reasonCode: "plugin_not_enabled",
          recommendedRecoveryAction: "enable",
        },
      ],
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
      killSwitchEnabled: true,
      blocked: true,
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
      executableActionCatalog: [],
      blockedActionDiagnostics: [
        {
          actionKey: "createNotificationStub",
          ownerType: "external-plugin",
          ownerPluginKey: "vendor/enabled",
          inputSchemaKey: "plugin-action.payload.generic",
          requiredPermission: null,
          sideEffectClass: "notification-stub",
          implementationSource: "main-repo-static-implementation",
          ownerPluginId: "plugin-enabled",
          ownerDisplayName: "运行中插件",
          lifecycleState: "suspended",
          catalogView: "blocked-diagnostic",
          internalLifecycleSubstate: "ready",
          reasonCode: "plugin_suspended",
          recommendedRecoveryAction: "resume",
        },
      ],
    },
    {
      pluginId: "plugin-uninstalled",
      pluginKey: "vendor/uninstalled",
      name: "审计卸载插件",
      sourceType: "external",
      lifecycleState: "uninstalled",
      internalLifecycleSubstate: "disabled",
      reasonCode: "not_installed",
      recommendedRecoveryAction: null,
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
        cleanupConfirmationToken: "cleanup:plugin-uninstalled:1:0:0:2:3",
        preflightSummary: {
          lessonExtCount: 1,
          stepExtCount: 0,
          resourceExtCount: 0,
          ownedBusinessCount: 2,
          totalCount: 3,
        },
      },
      executableActionCatalog: [],
      blockedActionDiagnostics: [
        {
          actionKey: "createNotificationStub",
          ownerType: "external-plugin",
          ownerPluginKey: "vendor/uninstalled",
          inputSchemaKey: "plugin-action.payload.generic",
          requiredPermission: null,
          sideEffectClass: "notification-stub",
          implementationSource: "main-repo-static-implementation",
          ownerPluginId: "plugin-uninstalled",
          ownerDisplayName: "审计卸载插件",
          lifecycleState: "uninstalled",
          catalogView: "blocked-diagnostic",
          internalLifecycleSubstate: "disabled",
          reasonCode: "plugin_not_installed",
          recommendedRecoveryAction: null,
        },
      ],
    },
  ],
};

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

    expect(within(externalPluginCard!).getByText("卸载前检查")).toBeTruthy();
    expect(within(externalPluginCard!).getByText("lessons")).toBeTruthy();
    expect(within(externalPluginCard!).getByText("lesson steps")).toBeTruthy();
    expect(within(externalPluginCard!).getByText("resources")).toBeTruthy();
    expect(within(externalPluginCard!).getByText("plugin-owned data")).toBeTruthy();

    fireEvent.click(within(externalPluginCard!).getByRole("button", { name: "打开卸载确认" }));
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "改为 cleanup 卸载" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "确认卸载插件" }).hasAttribute("disabled")).toBe(false);
    });

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
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "改为 cleanup 卸载" })).toBeTruthy();
    });

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

    fireEvent.click(screen.getByRole("button", { name: "查看治理诊断" }));

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

  it("renders uninstalled plugins as audit-only diagnostics without primary lifecycle action", async () => {
    const { PluginLifecycleOperatorSurface } = await import("./plugin-lifecycle-operator-surface");

    render(
      <PluginLifecycleOperatorSurface
        schoolId="school-1"
        dashboard={dashboardBundle}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "查看治理诊断" }));

    const pluginCard = screen.getByText("审计卸载插件", { selector: "p" }).closest("article");
    expect(pluginCard).toBeTruthy();
    expect(within(pluginCard!).getAllByText("已卸载").length).toBeGreaterThan(0);
    expect(
      within(pluginCard!).getByText("该插件处于 retain-uninstall 审计态；历史数据保留，但不会作为当前可执行扩展参与治理动作。"),
    ).toBeTruthy();
    expect(within(pluginCard!).queryByRole("button", { name: "启用插件" })).toBeNull();
    expect(within(pluginCard!).queryByRole("button", { name: "重试恢复" })).toBeNull();
    expect(within(pluginCard!).getByText("卸载前检查")).toBeTruthy();
  });
});
