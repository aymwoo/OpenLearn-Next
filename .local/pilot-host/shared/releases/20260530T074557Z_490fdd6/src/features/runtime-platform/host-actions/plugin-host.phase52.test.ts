import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserDTO: vi.fn(),
  getUserMembershipsDTO: vi.fn(),
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

const activePlugin = {
  id: "plugin-active",
  schoolId: "school-1",
  name: "活跃插件",
  manifestJson: {
    id: "vendor.active",
    version: "1.0.0",
    manifestVersion: 2,
    permissions: ["lesson:write:suggestion"],
    anchors: ["dashboard.widget"],
    actions: ["addStepSuggestion"],
    builtIn: false,
    defaultEnabled: false,
    nonDeletable: false,
    governance: {
      manifestVersion: 2,
      dependencies: [],
      requestedCapabilities: [],
      permissions: ["lesson:write:suggestion"],
      lifecycle: {
        ownerType: "host",
        installScope: "school",
        initialState: "installed",
        mountMode: "manual",
      },
    },
  },
  pluginKey: "vendor/active",
  dbNamespace: "vendor_active",
  sourceType: "external",
  installSource: "manual",
  enabled: true,
  killSwitchEnabled: false,
  lifecycleState: "ready",
  builtIn: false,
  defaultEnabled: false,
  nonDeletable: false,
} as const;

const blockedPlugin = {
  id: "plugin-blocked",
  schoolId: "school-1",
  name: "受阻插件",
  manifestJson: {
    id: "vendor.blocked",
    version: "1.0.0",
    manifestVersion: 2,
    permissions: ["schedule:write:proposal"],
    anchors: ["dashboard.widget"],
    actions: ["createScheduleReminderDraft"],
    builtIn: false,
    defaultEnabled: false,
    nonDeletable: false,
    governance: {
      manifestVersion: 2,
      dependencies: ["vendor/missing"],
      requestedCapabilities: [],
      permissions: ["schedule:write:proposal"],
      lifecycle: {
        ownerType: "host",
        installScope: "school",
        initialState: "installed",
        mountMode: "manual",
      },
    },
  },
  pluginKey: "vendor/blocked",
  dbNamespace: "vendor_blocked",
  sourceType: "external",
  installSource: "manual",
  enabled: true,
  killSwitchEnabled: false,
  lifecycleState: "enabled",
  builtIn: false,
  defaultEnabled: false,
  nonDeletable: false,
} as const;

const cleanupPlugin = {
  id: "plugin-cleanup",
  schoolId: "school-1",
  name: "清理插件",
  manifestJson: {
    id: "vendor.cleanup",
    version: "1.0.0",
    manifestVersion: 2,
    permissions: ["notification:create:stub"],
    anchors: ["dashboard.widget"],
    actions: ["createNotificationStub"],
    builtIn: false,
    defaultEnabled: false,
    nonDeletable: false,
    governance: {
      manifestVersion: 2,
      dependencies: [],
      requestedCapabilities: [],
      permissions: ["notification:create:stub"],
      lifecycle: {
        ownerType: "host",
        installScope: "school",
        initialState: "installed",
        mountMode: "manual",
      },
    },
  },
  pluginKey: "vendor/cleanup",
  dbNamespace: "vendor_cleanup",
  sourceType: "external",
  installSource: "manual",
  enabled: false,
  killSwitchEnabled: false,
  lifecycleState: "disabled",
  builtIn: false,
  defaultEnabled: false,
  nonDeletable: false,
} as const;

describe("phase 52 plugin registry and host governance wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserDTO.mockResolvedValue({ id: "teacher-1" });
    mocks.getUserMembershipsDTO.mockResolvedValue([
      { schoolId: "school-1", role: "teacher", status: "active" },
    ]);
    mocks.listPluginsForSchool.mockResolvedValue([
      activePlugin,
      blockedPlugin,
      cleanupPlugin,
    ]);
    mocks.listPluginGovernanceSnapshotRecords.mockResolvedValue([
      {
        pluginId: "plugin-active",
        pluginKey: "vendor/active",
        name: "活跃插件",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "ready",
        sourceType: "external",
        dependencies: [],
        activationStatus: "active",
        failureDetail: null,
        uninstall: {
          pluginId: "plugin-active",
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
      {
        pluginId: "plugin-blocked",
        pluginKey: "vendor/blocked",
        name: "受阻插件",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "enabled",
        sourceType: "external",
        dependencies: ["vendor/missing"],
        activationStatus: "idle",
        failureDetail: null,
        uninstall: {
          pluginId: "plugin-blocked",
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
      {
        pluginId: "plugin-cleanup",
        pluginKey: "vendor/cleanup",
        name: "清理插件",
        enabled: false,
        killSwitchEnabled: false,
        lifecycleState: "disabled",
        sourceType: "external",
        dependencies: [],
        activationStatus: "idle",
        failureDetail: null,
        uninstallRequest: {
          mode: "cleanup",
          confirmationToken: null,
        },
        uninstall: {
          pluginId: "plugin-cleanup",
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
          impactedBusinessKeys: ["dashboard", "gradebook", "settings"],
        },
      },
    ]);
    mocks.dispatchPluginGovernanceCommand.mockResolvedValue({
      success: true,
      data: { pluginId: "plugin-active" },
      commandId: "command-1",
      attemptNumber: 1,
      invalidationTags: ["plugin:registry", "plugin:plugin-active"],
    });
  });

  it("keeps blocked diagnostics out of the executable catalog and exposes them only in diagnostics", async () => {
    const registry = await import("@/features/platform-core/actions/registry");
    const actions = await import("@/actions/plugin-actions");

    const executable = await registry.readExecutableActionCatalog({
      actorId: "teacher-1",
      schoolId: "school-1",
    });
    const diagnostics = await registry.readBlockedActionDiagnostics({
      actorId: "teacher-1",
      schoolId: "school-1",
    });

    expect(executable).toHaveLength(1);
    expect(executable[0]).toMatchObject({
      actionKey: "addStepSuggestion",
      ownerPluginKey: "vendor/active",
      ownerDisplayName: "活跃插件",
      lifecycleState: "active",
      catalogView: "executable",
    });
    expect(executable.map((row) => row.actionKey)).not.toContain("createScheduleReminderDraft");

    expect(diagnostics).toEqual([
      expect.objectContaining({
        actionKey: "createScheduleReminderDraft",
        ownerPluginKey: "vendor/blocked",
        lifecycleState: "enabled",
        reasonCode: "dependency_not_satisfied",
        recommendedRecoveryAction: "reconcile",
        catalogView: "blocked-diagnostic",
      }),
      expect.objectContaining({
        actionKey: "createNotificationStub",
        ownerPluginKey: "vendor/cleanup",
        lifecycleState: "installed",
        reasonCode: "plugin_not_enabled",
        recommendedRecoveryAction: "enable",
        catalogView: "blocked-diagnostic",
      }),
    ]);

    const serverCatalog = await actions.listExecutableActionCatalogAction({ schoolId: "school-1" });
    const serverDiagnostics = await actions.listBlockedActionDiagnosticsAction({ schoolId: "school-1" });

    expect(serverCatalog).toMatchObject({ success: true, data: executable });
    expect(serverDiagnostics).toMatchObject({ success: true, data: diagnostics });
  });

  it("returns external lifecycle, stable reason codes, and cleanup gating from host read path", async () => {
    const { invokePluginHostAction } = await import("./plugin-host");
    const actions = await import("@/actions/plugin-actions");

    const blockedRead = await invokePluginHostAction({
      sessionId: "session-1",
      pluginId: "plugin-blocked",
      action: "read-lifecycle",
      payload: {},
    });
    const cleanupRead = await invokePluginHostAction({
      sessionId: "session-1",
      pluginId: "plugin-cleanup",
      action: "read-lifecycle",
      payload: {},
    });
    const serverRead = await actions.getPluginGovernanceReadAction({
      schoolId: "school-1",
      pluginId: "plugin-cleanup",
    });

    expect(blockedRead).toMatchObject({
      ok: true,
      plugin: {
        lifecycleState: "enabled",
        blocked: true,
        reasonCode: "dependency_missing",
        recommendedRecoveryAction: "reconcile",
        blockedActionDiagnostics: [
          expect.objectContaining({
            actionKey: "createScheduleReminderDraft",
            reasonCode: "dependency_not_satisfied",
          }),
        ],
      },
    });

    expect(cleanupRead).toMatchObject({
      ok: true,
      plugin: {
        lifecycleState: "installed",
        blocked: true,
        reasonCode: "not_enabled",
        recommendedRecoveryAction: "enable",
        uninstall: {
          posture: "cleanup",
          blocked: true,
          reasonCode: "cleanup_confirmation_required",
          recommendedRecoveryAction: "confirm_cleanup",
          preflightSummary: {
            lessonExtCount: 1,
            stepExtCount: 2,
            resourceExtCount: 1,
            ownedBusinessCount: 3,
            totalCount: 7,
          },
        },
      },
    });

    expect(serverRead).toMatchObject({
      success: true,
      data: expect.objectContaining({
        lifecycleState: "installed",
        reasonCode: "not_enabled",
        recommendedRecoveryAction: "enable",
        uninstall: expect.objectContaining({
          posture: "cleanup",
          reasonCode: "cleanup_confirmation_required",
          recommendedRecoveryAction: "confirm_cleanup",
        }),
      }),
    });
  });

  it("propagates external lifecycle snapshots into governance write gating", async () => {
    const { invokePluginHostAction } = await import("./plugin-host");

    await expect(
      invokePluginHostAction({
        sessionId: "session-1",
        pluginId: "plugin-blocked",
        action: "plugin.resume",
        payload: { reason: "manual retry" },
      }),
    ).rejects.toThrow("HOST_ACTION_DENIED:lifecycle_blocked");

    expect(mocks.dispatchPluginGovernanceCommand).not.toHaveBeenCalled();
  });

  it("allows recovery commands only when they match the current lifecycle reason code", async () => {
    const { invokePluginHostAction } = await import("./plugin-host");

    mocks.listPluginGovernanceSnapshotRecords.mockResolvedValueOnce([
      {
        pluginId: "plugin-blocked",
        pluginKey: "vendor/blocked",
        name: "受阻插件",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "failed",
        sourceType: "external",
        dependencies: [],
        activationStatus: "failed",
        failureDetail: "boot failed",
        uninstall: {
          pluginId: "plugin-blocked",
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
          cleanupConfirmationToken: "cleanup:plugin-blocked:0:0:0:0:0",
        },
      },
    ]);

    await invokePluginHostAction({
      sessionId: "session-1",
      pluginId: "plugin-blocked",
      action: "plugin.retry",
      payload: { reason: "retry activation", commandId: "cmd-1" },
    });

    expect(mocks.dispatchPluginGovernanceCommand).toHaveBeenCalledWith(
      expect.objectContaining({ type: "plugin.retry" }),
    );

    await expect(
      invokePluginHostAction({
        sessionId: "session-1",
        pluginId: "plugin-blocked",
        action: "plugin.enable",
        payload: {},
      }),
    ).rejects.toThrow("HOST_ACTION_DENIED:lifecycle_blocked");
  });

  it("allows dependency-blocked plugins to recover only through plugin.reconcile", async () => {
    const { invokePluginHostAction } = await import("./plugin-host");

    await invokePluginHostAction({
      sessionId: "session-1",
      pluginId: "plugin-blocked",
      action: "plugin.reconcile",
      payload: { reason: "dependency repaired", targetState: "enabled" },
    });

    expect(mocks.dispatchPluginGovernanceCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "plugin.reconcile",
        payload: expect.objectContaining({
          schoolId: "school-1",
          pluginId: "plugin-blocked",
          reason: "dependency repaired",
          targetState: "enabled",
        }),
      }),
    );

    await expect(
      invokePluginHostAction({
        sessionId: "session-1",
        pluginId: "plugin-blocked",
        action: "plugin.resume",
        payload: { reason: "dependency repaired" },
      }),
    ).rejects.toThrow("HOST_ACTION_DENIED:lifecycle_blocked");
  });
});
