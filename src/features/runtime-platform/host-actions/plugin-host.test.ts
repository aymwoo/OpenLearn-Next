import { readFile } from "node:fs/promises";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserDTO: vi.fn(),
  getUserMembershipsDTO: vi.fn(),
  getPluginForSchool: vi.fn(),
  listPluginsForSchool: vi.fn(),
  listPluginGovernanceSnapshotRecords: vi.fn(),
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
  listPluginsForSchool: mocks.listPluginsForSchool,
  listPluginGovernanceSnapshotRecords: mocks.listPluginGovernanceSnapshotRecords,
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
    mocks.listPluginsForSchool.mockResolvedValue([
      {
        id: "plugin-1",
        schoolId: "school-1",
        name: "Plugin One",
        pluginKey: "vendor/plugin-one",
        dbNamespace: "vendor_plugin_one",
        sourceType: "external",
        installSource: "manual",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "enabled",
        builtIn: false,
        defaultEnabled: false,
        nonDeletable: false,
        manifestJson: {
          id: "vendor.plugin-one",
          version: "1.0.0",
          manifestVersion: 2,
          permissions: [],
          anchors: ["dashboard.widget"],
          actions: ["addStepSuggestion"],
          builtIn: false,
          defaultEnabled: false,
          nonDeletable: false,
          governance: {
            manifestVersion: 2,
            dependencies: [],
            requestedCapabilities: [],
            permissions: [],
            lifecycle: {
              ownerType: "host",
              installScope: "school",
              initialState: "installed",
              mountMode: "manual",
            },
          },
        },
      },
    ]);
    mocks.listPluginGovernanceSnapshotRecords.mockResolvedValue([
      {
        pluginId: "plugin-1",
        pluginKey: "vendor/plugin-one",
        name: "Plugin One",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "enabled",
        sourceType: "external",
        dependencies: [],
        activationStatus: "idle",
        failureDetail: null,
        uninstall: {
          pluginId: "plugin-1",
          schoolId: "school-1",
          blocked: false,
          reason: null,
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
      },
    ]);
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

  it("returns read-lifecycle snapshots instead of exposing a permanently failing host action", async () => {
    const { invokePluginHostAction } = await import("./plugin-host");

    const result = await invokePluginHostAction({
      sessionId: "session-1",
      pluginId: "plugin-1",
      action: "read-lifecycle",
      payload: {},
    });

    expect(result).toMatchObject({
      ok: true,
      actorId: "teacher-1",
      schoolId: "school-1",
      plugin: {
        id: "plugin-1",
        schoolId: "school-1",
        lifecycleState: "enabled",
        blocked: false,
        reasonCode: null,
        recommendedRecoveryAction: null,
        killSwitchEnabled: false,
      },
    });
    expect(mocks.dispatchPluginGovernanceCommand).not.toHaveBeenCalled();
  });

  it("keeps read-lifecycle as a real read contract instead of unsupported placeholder", async () => {
    const source = await readFile(new URL("./plugin-host.ts", import.meta.url), "utf8");

    expect(source).toContain('case "read-lifecycle"');
    expect(source).toContain("lifecycleState");
    expect(source).toContain("killSwitchEnabled");
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

  it("requires write-capable host permission metadata for governance mutations", async () => {
    const source = await readFile(new URL("./plugin-host.ts", import.meta.url), "utf8");
    const permissionsSource = await readFile(new URL("../contracts/permissions.ts", import.meta.url), "utf8");

    expect(source).toContain('"host:plugin:lifecycle:write"');
    expect(permissionsSource).toContain('"host:plugin:lifecycle:write"');
    expect(source).toContain("permission_denied");
  });

  it("preserves mounted and ready targets when resuming via host governance", async () => {
    const { invokePluginHostAction } = await import("./plugin-host");

    await invokePluginHostAction({
      sessionId: "session-1",
      pluginId: "plugin-1",
      action: "plugin.resume",
      payload: { targetState: "mounted", reason: "resume-mounted" },
    });

    expect(mocks.dispatchPluginGovernanceCommand).toHaveBeenLastCalledWith({
      type: "plugin.resume",
      actor: { actorId: "teacher-1", actorScope: "teacher" },
      scope: { schoolId: "school-1", pluginId: "plugin-1" },
      payload: {
        schoolId: "school-1",
        pluginId: "plugin-1",
        reason: "resume-mounted",
        targetState: "mounted",
      },
      source: "host-action",
      correlation: { producer: "plugin-host" },
    });
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
