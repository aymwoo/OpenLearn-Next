// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const baseManifest = {
  version: "1.0.0",
  manifestVersion: 1 as const,
  permissions: [] as Array<"lesson:write:suggestion" | "lesson:write:annotation" | "notification:create:stub" | "schedule:write:proposal">,
  anchors: ["dashboard.widget"] as Array<"dashboard.widget" | "lesson.sidebar" | "schedule.assistant">,
  actions: ["createNotificationStub"] as Array<"createNotificationStub">,
};

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
        plugins={[
          {
            id: "plugin-mounted",
            schoolId: "school-1",
            name: "挂载插件",
            manifestJson: { ...baseManifest, id: "plugin.mounted", builtIn: false, defaultEnabled: false, nonDeletable: false },
            pluginKey: "vendor/mounted",
            dbNamespace: "vendor_mounted",
            sourceType: "external",
            installSource: "manual",
            enabled: true,
            killSwitchEnabled: false,
            lifecycleState: "mounted",
            builtIn: false,
            defaultEnabled: false,
            nonDeletable: false,
          },
          {
            id: "plugin-ready",
            schoolId: "school-1",
            name: "就绪插件",
            manifestJson: { ...baseManifest, id: "plugin.ready", builtIn: false, defaultEnabled: false, nonDeletable: false },
            pluginKey: "vendor/ready",
            dbNamespace: "vendor_ready",
            sourceType: "external",
            installSource: "manual",
            enabled: true,
            killSwitchEnabled: false,
            lifecycleState: "ready",
            builtIn: false,
            defaultEnabled: false,
            nonDeletable: false,
          },
        ]}
      />,
    );

    expect(screen.getAllByText("运行中").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "查看治理诊断" })).toBeTruthy();
    expect(screen.queryByText("已挂载（活跃态)")).toBeNull();
    expect(screen.queryByText("已就绪（活跃态)")).toBeNull();
  });

  it("shows governance diagnostics and requires explicit cleanup confirmation", async () => {
    const { PluginLifecycleOperatorSurface } = await import("./plugin-lifecycle-operator-surface");

    render(
      <PluginLifecycleOperatorSurface
        schoolId="school-1"
        plugins={[
          {
            id: "plugin-default",
            schoolId: "school-1",
            name: "默认插件",
            manifestJson: { ...baseManifest, id: "builtin.default", builtIn: true, defaultEnabled: true, nonDeletable: true },
            pluginKey: "builtin/default",
            dbNamespace: "builtin_default",
            sourceType: "default",
            installSource: "bootstrap",
            enabled: true,
            killSwitchEnabled: false,
            lifecycleState: "enabled",
            builtIn: true,
            defaultEnabled: true,
            nonDeletable: true,
          },
          {
            id: "plugin-ext",
            schoolId: "school-1",
            name: "外部插件",
            manifestJson: { ...baseManifest, id: "vendor.ext", builtIn: false, defaultEnabled: false, nonDeletable: false },
            pluginKey: "vendor/ext",
            dbNamespace: "vendor_ext",
            sourceType: "external",
            installSource: "manual",
            enabled: false,
            killSwitchEnabled: false,
            lifecycleState: "disabled",
            builtIn: false,
            defaultEnabled: false,
            nonDeletable: false,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "查看治理诊断" })[0]);

    expect(screen.getByText("该插件由系统提供，可启用或停用，但不会作为可删除扩展处理。")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "确认卸载插件" })).toBeNull();
    expect(screen.getAllByText(/reason code:/).length).toBeGreaterThan(0);

    const externalPluginCard = screen.getByText("外部插件").closest("article");
    expect(externalPluginCard).toBeTruthy();

    fireEvent.click(within(externalPluginCard!).getByRole("button", { name: "查看卸载影响" }));

    await waitFor(() => {
      expect(pluginActionMocks.preflightUninstallPluginAction).toHaveBeenCalledWith({
        pluginId: "plugin-ext",
        schoolId: "school-1",
      });
    });

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
      });
    });
  });

  it("dispatches the plugin kill switch action from the targeted plugin card", async () => {
    const { PluginLifecycleOperatorSurface } = await import("./plugin-lifecycle-operator-surface");

    render(
      <PluginLifecycleOperatorSurface
        schoolId="school-1"
        plugins={[
          {
            id: "plugin-enabled",
            schoolId: "school-1",
            name: "运行中插件",
            manifestJson: { ...baseManifest, id: "vendor.enabled", builtIn: false, defaultEnabled: false, nonDeletable: false },
            pluginKey: "vendor/enabled",
            dbNamespace: "vendor_enabled",
            sourceType: "external",
            installSource: "manual",
            enabled: true,
            killSwitchEnabled: true,
            lifecycleState: "enabled",
            builtIn: false,
            defaultEnabled: false,
            nonDeletable: false,
          },
        ]}
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
});
