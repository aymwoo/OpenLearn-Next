import { readFile } from "node:fs/promises";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserDTO: vi.fn(),
  getUserMembershipsDTO: vi.fn(),
  getPluginForSchool: vi.fn(),
  publish: vi.fn(),
  describeOwnership: vi.fn(() => "runtime-event-bus"),
  dispatchPluginGovernanceCommand: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO: mocks.getCurrentUserDTO,
}));
vi.mock("@/lib/dal/membership", () => ({
  getUserMembershipsDTO: mocks.getUserMembershipsDTO,
}));
vi.mock("@/lib/dal/plugins", () => ({
  getPluginForSchool: mocks.getPluginForSchool,
}));
vi.mock("../seams", () => ({
  defaultRuntimeEventBusAdapter: {
    publish: mocks.publish,
    describeOwnership: mocks.describeOwnership,
  },
}));
vi.mock("@/features/platform-core/commands/producers/plugin-governance", () => ({
  dispatchPluginGovernanceCommand: mocks.dispatchPluginGovernanceCommand,
}));

describe("plugin host governance seam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserDTO.mockResolvedValue({ id: "teacher-1" });
    mocks.getUserMembershipsDTO.mockResolvedValue([{ schoolId: "school-1", role: "teacher", status: "active" }]);
    mocks.getPluginForSchool.mockResolvedValue({
      id: "plugin-1",
      schoolId: "school-1",
      name: "Plugin One",
      lifecycleState: "enabled",
      killSwitchEnabled: false,
    });
    mocks.dispatchPluginGovernanceCommand.mockResolvedValue({
      success: true,
      data: { pluginId: "plugin-1", lifecycleState: "enabled" },
      commandId: "command-1",
      attemptNumber: 1,
      invalidationTags: ["plugin:registry", "plugin:plugin-1"],
    });
  });

  it("supports explicit governance command names and rejects plugin.transition as a primary host contract", async () => {
    const source = await readFile(new URL("./plugin-host.ts", import.meta.url), "utf8");

    expect(source).toContain('"plugin.enable"');
    expect(source).toContain('"plugin.disable"');
    expect(source).toContain('"plugin.suspend"');
    expect(source).toContain('"plugin.resume"');
    expect(source).toContain('"plugin.retry"');
    expect(source).toContain('"plugin.uninstall.preflight"');
    expect(source).toContain('"plugin.uninstall"');
    expect(source).toContain('"plugin.kill_switch.set"');
    expect(source).not.toContain("plugin.transition");
  });

  it("dispatches host governance mutations through the shared producer seam and documents host invalidation no-op", async () => {
    const { invokePluginHostAction } = await import("./plugin-host");

    const result = await invokePluginHostAction({
      sessionId: "session-1",
      pluginId: "plugin-1",
      action: "plugin.enable",
      payload: {},
    });

    expect(mocks.dispatchPluginGovernanceCommand).toHaveBeenCalledWith({
      type: "plugin.enable",
      actor: { actorId: "teacher-1", actorScope: "teacher" },
      scope: { schoolId: "school-1", pluginId: "plugin-1" },
      payload: { schoolId: "school-1", pluginId: "plugin-1", enabledBy: "teacher-1" },
      source: "host-action",
      correlation: { producer: "plugin-host" },
    });
    expect(result).toMatchObject({
      ok: true,
      commandId: "command-1",
      invalidationTags: ["plugin:registry", "plugin:plugin-1"],
    });
    expect(String(result.hostInvalidation)).toContain("host invalidation");
  });

  it("supports plugin kill switch governance writes through the same producer seam", async () => {
    const { invokePluginHostAction } = await import("./plugin-host");

    await invokePluginHostAction({
      sessionId: "session-1",
      pluginId: "plugin-1",
      action: "plugin.kill_switch.set",
      payload: { enabled: true, reason: "teacher emergency stop" },
    });

    expect(mocks.dispatchPluginGovernanceCommand).toHaveBeenCalledWith({
      type: "plugin.kill_switch.set",
      actor: { actorId: "teacher-1", actorScope: "teacher" },
      scope: { schoolId: "school-1", pluginId: "plugin-1" },
      payload: {
        schoolId: "school-1",
        pluginId: "plugin-1",
        enabled: true,
        reason: "teacher emergency stop",
      },
      source: "host-action",
      correlation: { producer: "plugin-host" },
    });
  });

  it("keeps publish-event on the runtime transport path instead of the governance producer seam", async () => {
    const { invokePluginHostAction } = await import("./plugin-host");

    await invokePluginHostAction({
      sessionId: "session-1",
      pluginId: "plugin-1",
      action: "publish-event",
      payload: { kind: "test" },
    });

    expect(mocks.publish).toHaveBeenCalledTimes(1);
    expect(mocks.dispatchPluginGovernanceCommand).not.toHaveBeenCalled();
  });

  it("migrates bootstrap plugin registration onto the shared plugin.install producer seam", async () => {
    const source = await readFile(new URL("../../../../scripts/bootstrap-dev-db.ts", import.meta.url), "utf8");

    expect(source).toContain("producePluginInstallCommand");
    expect(source).not.toContain("installOrReconcilePlugin(");
  });
});
