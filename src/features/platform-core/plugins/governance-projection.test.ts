import { describe, expect, it } from "vitest";

describe("plugin governance lifecycle contracts", () => {
  it("defines the external five-state lifecycle vocabulary and explicit recovery actions", async () => {
    const contracts = await import("./lifecycle-contracts");

    expect(contracts.GovernanceLifecycleStateSchema.options).toEqual([
      "installed",
      "enabled",
      "active",
      "suspended",
      "uninstalled",
    ]);
    expect(contracts.GovernanceLifecycleStateSchema.options).not.toContain("mounted");
    expect(contracts.GovernanceLifecycleStateSchema.options).not.toContain("ready");
    expect(contracts.GovernanceLifecycleStateSchema.options).not.toContain("failed");

    expect(contracts.PluginGovernanceReasonCodeSchema.options).toEqual(
      expect.arrayContaining([
        "dependency_missing",
        "dependency_cycle",
        "activation_failed",
        "kill_switch",
        "not_enabled",
        "not_installed",
        "cleanup_confirmation_required",
      ]),
    );

    expect(contracts.PluginRecoveryActionSchema.options).toEqual([
      "enable",
      "retry",
      "resume",
      "reconcile",
      "confirm_cleanup",
    ]);
    expect(contracts.PluginRecoveryActionSchema.options).not.toContain("auto_recover");
  });

  it("extends governance snapshots with external lifecycle, internal substate, reason code, and recovery action", async () => {
    const permissions = await import("@/features/runtime-platform/contracts/permissions");

    expect(permissions.GovernanceLifecycleStateSchema.parse("active")).toBe("active");
    expect(() => permissions.GovernanceLifecycleStateSchema.parse("ready")).toThrow();

    expect(
      permissions.GovernanceLifecycleSnapshotSchema.parse({
        state: "enabled",
        blocked: true,
        killSwitchEnabled: false,
        internalSubstate: "failed",
        reasonCode: "activation_failed",
        recommendedRecoveryAction: "retry",
      }),
    ).toMatchObject({
      state: "enabled",
      internalSubstate: "failed",
      reasonCode: "activation_failed",
      recommendedRecoveryAction: "retry",
    });
  });

  it("orders dependencies, detects cycles, and only blocks affected plugin chains", async () => {
    const dependencyGraph = await import("./dependency-graph");

    expect(
      dependencyGraph.orderPluginDependencies([
        { pluginId: "plugin-a", dependencies: [] },
        { pluginId: "plugin-b", dependencies: ["plugin-a"] },
        { pluginId: "plugin-c", dependencies: ["plugin-b"] },
      ]),
    ).toEqual(["plugin-a", "plugin-b", "plugin-c"]);

    expect(
      dependencyGraph.detectPluginDependencyCycles([
        { pluginId: "plugin-a", dependencies: ["plugin-b"] },
        { pluginId: "plugin-b", dependencies: ["plugin-a"] },
        { pluginId: "plugin-c", dependencies: [] },
      ]),
    ).toEqual([["plugin-a", "plugin-b", "plugin-a"]]);

    expect(
      dependencyGraph.resolvePluginActivationChain(
        [
          { pluginId: "plugin-a", dependencies: [] },
          { pluginId: "plugin-b", dependencies: ["plugin-a"] },
          { pluginId: "plugin-c", dependencies: ["plugin-b", "plugin-missing"] },
        ],
        "plugin-c",
      ),
    ).toEqual({
      orderedPluginIds: ["plugin-a", "plugin-b", "plugin-c"],
      missingDependencies: ["plugin-missing"],
      cycles: [],
    });
  });

  it("projects plugin governance diagnostics, executable gating, and explicit uninstall posture", async () => {
    const projection = await import("./governance-projection");

    const result = projection.projectPluginGovernance([
      {
        pluginId: "plugin-a",
        pluginKey: "vendor/a",
        name: "Plugin A",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "ready",
        sourceType: "external",
        dependencies: [],
        activationStatus: "active",
        failureDetail: null,
        uninstall: {
          pluginId: "plugin-a",
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
        pluginId: "plugin-b",
        pluginKey: "vendor/b",
        name: "Plugin B",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "enabled",
        sourceType: "external",
        dependencies: ["vendor/a"],
        activationStatus: "failed",
        failureDetail: "secret stack must not leak",
        uninstall: {
          pluginId: "plugin-b",
          schoolId: "school-1",
          blocked: false,
          reason: null,
          lessonExtCount: 1,
          stepExtCount: 2,
          resourceExtCount: 3,
          ownedBusinessCount: 4,
          totalCount: 10,
          impactedLessonIds: ["lesson-1"],
          impactedLessonStepIds: ["step-1", "step-2"],
          impactedResourceIds: ["resource-1", "resource-2", "resource-3"],
          impactedBusinessKeys: ["biz-1", "biz-2", "biz-3", "biz-4"],
        },
      },
      {
        pluginId: "plugin-c",
        pluginKey: "vendor/c",
        name: "Plugin C",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "enabled",
        sourceType: "external",
        dependencies: ["vendor/b"],
        activationStatus: "idle",
        failureDetail: null,
        uninstall: {
          pluginId: "plugin-c",
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
        pluginId: "plugin-d",
        pluginKey: "vendor/d",
        name: "Plugin D",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "ready",
        sourceType: "external",
        dependencies: [],
        activationStatus: "active",
        failureDetail: null,
        uninstall: {
          pluginId: "plugin-d",
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
      },
    ]);

    expect(result.executablePluginIds).toEqual(["plugin-a", "plugin-d"]);
    expect(result.plugins.find((plugin: (typeof result.plugins)[number]) => plugin.pluginId === "plugin-b")).toMatchObject({
      lifecycle: {
        state: "enabled",
        internalSubstate: "failed",
        blocked: true,
        reasonCode: "activation_failed",
        recommendedRecoveryAction: "retry",
      },
      executable: false,
      failureAttribution: {
        scope: "plugin",
        pluginId: "plugin-b",
        reasonCode: "activation_failed",
        recommendedRecoveryAction: "retry",
      },
      uninstall: {
        posture: "retain",
        cleanupRequested: false,
      },
    });
    expect(result.plugins.find((plugin: (typeof result.plugins)[number]) => plugin.pluginId === "plugin-c")).toMatchObject({
      lifecycle: {
        state: "enabled",
        blocked: true,
        reasonCode: "dependency_missing",
        recommendedRecoveryAction: "reconcile",
      },
      executable: false,
    });
    expect(result.plugins.find((plugin: (typeof result.plugins)[number]) => plugin.pluginId === "plugin-b")?.failureAttribution).not.toHaveProperty("detail");

    const cleanupPreview = projection.projectPluginGovernance([
      {
        pluginId: "plugin-clean",
        pluginKey: "vendor/clean",
        name: "Plugin Clean",
        enabled: false,
        killSwitchEnabled: false,
        lifecycleState: "disabled",
        sourceType: "external",
        dependencies: [],
        activationStatus: "idle",
        failureDetail: null,
        uninstall: {
          pluginId: "plugin-clean",
          schoolId: "school-1",
          blocked: false,
          reason: null,
          lessonExtCount: 2,
          stepExtCount: 0,
          resourceExtCount: 1,
          ownedBusinessCount: 3,
          totalCount: 6,
          impactedLessonIds: ["lesson-1", "lesson-2"],
          impactedLessonStepIds: [],
          impactedResourceIds: ["resource-1"],
          impactedBusinessKeys: ["biz-1", "biz-2", "biz-3"],
        },
        uninstallRequest: {
          mode: "cleanup",
          confirmationToken: null,
        },
      },
    ]);

    expect(cleanupPreview.plugins[0]).toMatchObject({
      uninstall: {
        posture: "cleanup",
        blocked: true,
        reasonCode: "cleanup_confirmation_required",
        recommendedRecoveryAction: "confirm_cleanup",
        preflightSummary: {
          totalCount: 6,
          lessonExtCount: 2,
          resourceExtCount: 1,
          ownedBusinessCount: 3,
        },
      },
    });
  });
});
