// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PluginMarketplaceSurface } from "./plugin-marketplace-surface";

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
        lifecycleState: "enabled",
        manifestJson: { id: "builtin.direct-instruction" },
        pluginKey: "builtin/direct-instruction",
        dbNamespace: "builtin_direct_instruction",
        sourceType: "default" as const,
        installSource: "bootstrap" as const,
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

describe("plugin marketplace surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps marketplace non-destructive and only submits enable toggle", async () => {
    render(await PluginMarketplaceSurface());

    expect(screen.getByText("仅启用 / 停用，无删除语义")).toBeTruthy();
    expect(screen.queryByText("紧急挂起")).toBeNull();
    expect(screen.queryByText("查看卸载影响")).toBeNull();
    expect(screen.queryByText("确认卸载插件")).toBeNull();

    fireEvent.submit(screen.getByRole("button", { name: "停用环节" }).closest("form")!);

    await waitFor(() => {
      expect(pluginActionMocks.setPluginEnabledAction).toHaveBeenCalledWith({
        pluginId: "plugin-1",
        schoolId: "school-1",
        enabled: false,
      });
    });
  });

  it("shows plugin load errors instead of masking them as an empty marketplace", async () => {
    pluginActionMocks.listPluginsAction.mockResolvedValueOnce({
      success: false,
      error: "PLUGIN_LIST_FAILED",
    } as unknown as Awaited<ReturnType<typeof pluginActionMocks.listPluginsAction>>);

    render(await PluginMarketplaceSurface());

    expect(screen.getByText("插件列表加载失败：PLUGIN_LIST_FAILED")).toBeTruthy();
    expect(screen.queryByText("当前学校还没有可见的系统内置教学环节。完成 seed 或启用后，这里会显示系统内置目录与默认开启状态。")).toBeNull();
  });
});
