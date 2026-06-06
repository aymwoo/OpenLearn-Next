import { describe, expect, it } from "vitest";

function buildUninstall(input: Partial<{
  pluginId: string;
  schoolId: string;
  blocked: boolean;
  reason: string | null;
  lessonExtCount: number;
  stepExtCount: number;
  resourceExtCount: number;
  ownedBusinessCount: number;
  ownedQuestionCount: number;
  ownedResponseCount: number;
  affectedEndedSessionCount: number;
  totalCount: number;
  impactedLessonIds: string[];
  impactedLessonStepIds: string[];
  impactedResourceIds: string[];
  impactedBusinessKeys: string[];
  activeSessions: Array<{
    sessionId: string;
    lessonId: string;
    classId: string;
    status: "live";
  }>;
  cleanupConfirmationToken: string;
}> = {}) {
  return {
    pluginId: input.pluginId ?? "plugin",
    schoolId: input.schoolId ?? "school-1",
    blocked: input.blocked ?? false,
    reason: input.reason ?? null,
    lessonExtCount: input.lessonExtCount ?? 0,
    stepExtCount: input.stepExtCount ?? 0,
    resourceExtCount: input.resourceExtCount ?? 0,
    ownedBusinessCount: input.ownedBusinessCount ?? 0,
    ownedQuestionCount: input.ownedQuestionCount ?? 0,
    ownedResponseCount: input.ownedResponseCount ?? 0,
    affectedEndedSessionCount: input.affectedEndedSessionCount ?? 0,
    totalCount: input.totalCount ?? 0,
    impactedLessonIds: input.impactedLessonIds ?? [],
    impactedLessonStepIds: input.impactedLessonStepIds ?? [],
    impactedResourceIds: input.impactedResourceIds ?? [],
    impactedBusinessKeys: input.impactedBusinessKeys ?? [],
    activeSessions: input.activeSessions ?? [],
    cleanupConfirmationToken: input.cleanupConfirmationToken ?? "cleanup:plugin:0:0:0:0:0:0:0:0",
  };
}

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
        uninstalledAt: null,
        uninstallRetentionMode: null,
        uninstall: buildUninstall({ pluginId: "plugin-a", cleanupConfirmationToken: "cleanup:plugin-a:0:0:0:0:0" }),
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
        uninstalledAt: null,
        uninstallRetentionMode: null,
        uninstall: buildUninstall({
          pluginId: "plugin-b",
          lessonExtCount: 1,
          stepExtCount: 2,
          resourceExtCount: 3,
          ownedBusinessCount: 4,
          totalCount: 10,
          impactedLessonIds: ["lesson-1"],
          impactedLessonStepIds: ["step-1", "step-2"],
          impactedResourceIds: ["resource-1", "resource-2", "resource-3"],
          impactedBusinessKeys: ["biz-1", "biz-2", "biz-3", "biz-4"],
          cleanupConfirmationToken: "cleanup:plugin-b:1:2:3:4:10",
        }),
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
        uninstalledAt: null,
        uninstallRetentionMode: null,
        uninstall: buildUninstall({ pluginId: "plugin-c", cleanupConfirmationToken: "cleanup:plugin-c:0:0:0:0:0" }),
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
        uninstalledAt: null,
        uninstallRetentionMode: null,
        uninstall: buildUninstall({
          pluginId: "plugin-d",
          blocked: true,
          reason: "UNINSTALL_BLOCKED_DEFAULT_PLUGIN",
          cleanupConfirmationToken: "cleanup:plugin-d:0:0:0:0:0",
        }),
      },
    ]);

    expect(result.executablePluginIds).toEqual(["plugin-a", "plugin-d"]);
    expect(result.plugins.find((plugin: (typeof result.plugins)[number]) => plugin.pluginId === "plugin-b")).toMatchObject({
      lifecycle: {
        state: "active",
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
        state: "active",
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
        uninstalledAt: null,
        uninstallRetentionMode: null,
        uninstall: buildUninstall({
          pluginId: "plugin-clean",
          lessonExtCount: 2,
          resourceExtCount: 1,
          ownedBusinessCount: 3,
          totalCount: 6,
          impactedLessonIds: ["lesson-1", "lesson-2"],
          impactedResourceIds: ["resource-1"],
          impactedBusinessKeys: ["biz-1", "biz-2", "biz-3"],
          cleanupConfirmationToken: "cleanup:plugin-clean:2:0:1:3:6",
        }),
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

  it("treats enabled plugins as active when they are otherwise runnable", async () => {
    const projection = await import("./governance-projection");

    const result = projection.projectPluginGovernance([
      {
        pluginId: "plugin-enabled",
        pluginKey: "builtin-teaching-step-quiz-sample",
        name: "Quiz Sample",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "enabled",
        sourceType: "default",
        dependencies: [],
        activationStatus: "idle",
        failureDetail: null,
        uninstalledAt: null,
        uninstallRetentionMode: null,
        uninstall: buildUninstall({ pluginId: "plugin-enabled", cleanupConfirmationToken: "cleanup:plugin-enabled:0:0:0:0:0" }),
      },
    ]);

    expect(result.executablePluginIds).toEqual(["plugin-enabled"]);
    expect(result.plugins[0]).toMatchObject({
      executable: true,
      lifecycle: {
        state: "active",
        blocked: false,
        reasonCode: null,
      },
    });
  });

  it("maps retained uninstall rows to uninstalled audit state", async () => {
    const projection = await import("./governance-projection");

    const result = projection.projectPluginGovernance([
      {
        pluginId: "plugin-uninstalled",
        pluginKey: "vendor/uninstalled",
        name: "已卸载插件",
        enabled: false,
        killSwitchEnabled: false,
        lifecycleState: "disabled",
        sourceType: "external",
        dependencies: [],
        activationStatus: "idle",
        failureDetail: null,
        uninstalledAt: new Date("2026-05-22T00:00:00Z"),
        uninstallRetentionMode: "retain",
        uninstall: buildUninstall({
          pluginId: "plugin-uninstalled",
          lessonExtCount: 1,
          ownedBusinessCount: 2,
          totalCount: 3,
          impactedLessonIds: ["lesson-1"],
          impactedBusinessKeys: ["biz-1", "biz-2"],
          cleanupConfirmationToken: "cleanup:plugin-uninstalled:1:0:0:2:3",
        }),
      },
    ]);

    expect(result.executablePluginIds).toEqual([]);
    expect(result.plugins[0]).toMatchObject({
      executable: false,
      lifecycle: {
        state: "uninstalled",
        blocked: true,
        reasonCode: "not_installed",
        recommendedRecoveryAction: null,
      },
    });
    expect(result.plugins[0]?.failureAttribution).toBeNull();
  });

  it("preserves active classroom uninstall blocker counts in projection output", async () => {
    const projection = await import("./governance-projection");

    const result = projection.projectPluginGovernance([
      {
        pluginId: "plugin-active-blocked",
        pluginKey: "vendor/active-blocked",
        name: "被课堂占用插件",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "enabled",
        sourceType: "external",
        dependencies: [],
        activationStatus: "idle",
        failureDetail: null,
        uninstalledAt: null,
        uninstallRetentionMode: null,
        uninstall: {
          pluginId: "plugin-active-blocked",
          schoolId: "school-1",
          blocked: true,
          reason: "PLUGIN_ACTIVE_CLASSROOM_BLOCKED",
          lessonExtCount: 1,
          stepExtCount: 2,
          resourceExtCount: 3,
          ownedBusinessCount: 4,
          ownedQuestionCount: 5,
          ownedResponseCount: 6,
          affectedEndedSessionCount: 1,
          totalCount: 21,
          impactedLessonIds: ["lesson-1"],
          impactedLessonStepIds: ["step-1", "step-2"],
          impactedResourceIds: ["resource-1", "resource-2", "resource-3"],
          impactedBusinessKeys: ["biz-1", "biz-2", "biz-3", "biz-4"],
          activeSessions: [
            {
              sessionId: "session-1",
              lessonId: "lesson-1",
              classId: "class-1",
              status: "live",
            },
          ],
          cleanupConfirmationToken: "cleanup:plugin-active-blocked:1:2:3:4:5:6:1:21",
        },
      },
    ]);

    expect(result.plugins[0]).toMatchObject({
      uninstall: {
        blocked: true,
        reasonCode: "PLUGIN_ACTIVE_CLASSROOM_BLOCKED",
        preflightSummary: {
          lessonExtCount: 1,
          stepExtCount: 2,
          resourceExtCount: 3,
          ownedBusinessCount: 4,
          totalCount: 21,
        },
      },
    });
  });
});
