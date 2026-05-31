import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserDTO = vi.fn();
const getUserMembershipsDTO = vi.fn();
const readGovernanceDashboardBundle = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO,
}));

vi.mock("@/lib/dal/membership", () => ({
  getUserMembershipsDTO,
}));

vi.mock("@/features/platform-core/actions/registry", () => ({
  readGovernanceDashboardBundle,
}));

function createDashboard() {
  return {
    executableActionCatalog: [
      {
        actionKey: "run-report",
        ownerType: "external-plugin",
        ownerPluginKey: "plugin-one",
        inputSchemaKey: "plugin-action.payload.generic",
        requiredPermission: null,
        sideEffectClass: "notification-stub",
        implementationSource: "main-repo-static-implementation",
        ownerPluginId: "plugin-1",
        ownerDisplayName: "插件一号",
        lifecycleState: "active",
        catalogView: "executable",
      },
      {
        actionKey: "foreign-action",
        ownerType: "external-plugin",
        ownerPluginKey: "plugin-two",
        inputSchemaKey: "plugin-action.payload.generic",
        requiredPermission: null,
        sideEffectClass: "notification-stub",
        implementationSource: "main-repo-static-implementation",
        ownerPluginId: "plugin-2",
        ownerDisplayName: "插件二号",
        lifecycleState: "active",
        catalogView: "executable",
      },
    ],
    blockedActionDiagnostics: [
      {
        actionKey: "resume-runtime",
        ownerType: "external-plugin",
        ownerPluginKey: "plugin-one",
        inputSchemaKey: "plugin-action.payload.generic",
        requiredPermission: null,
        sideEffectClass: "notification-stub",
        implementationSource: "main-repo-static-implementation",
        ownerPluginId: "plugin-1",
        ownerDisplayName: "插件一号",
        lifecycleState: "suspended",
        catalogView: "blocked-diagnostic",
        internalLifecycleSubstate: "ready",
        reasonCode: "plugin_suspended",
        recommendedRecoveryAction: "resume",
      },
    ],
    pluginLifecycleRows: [
      {
        pluginId: "plugin-1",
        pluginKey: "plugin-one",
        dbNamespace: "plugin_one",
        name: "插件一号",
        sourceType: "external",
        installSource: "manual",
        builtIn: false,
        defaultEnabled: false,
        nonDeletable: false,
        lifecycleState: "suspended",
        internalLifecycleSubstate: "ready",
        blocked: true,
        killSwitchEnabled: true,
        reasonCode: "kill_switch",
        recommendedRecoveryAction: "resume",
        executableActionCatalog: [
          {
            actionKey: "run-report",
            ownerType: "external-plugin",
            ownerPluginKey: "plugin-one",
            inputSchemaKey: "plugin-action.payload.generic",
            requiredPermission: null,
            sideEffectClass: "notification-stub",
            implementationSource: "main-repo-static-implementation",
            ownerPluginId: "plugin-1",
            ownerDisplayName: "插件一号",
            lifecycleState: "active",
            catalogView: "executable",
          },
        ],
        blockedActionDiagnostics: [
          {
            actionKey: "resume-runtime",
            ownerType: "external-plugin",
            ownerPluginKey: "plugin-one",
            inputSchemaKey: "plugin-action.payload.generic",
            requiredPermission: null,
            sideEffectClass: "notification-stub",
            implementationSource: "main-repo-static-implementation",
            ownerPluginId: "plugin-1",
            ownerDisplayName: "插件一号",
            lifecycleState: "suspended",
            catalogView: "blocked-diagnostic",
            internalLifecycleSubstate: "ready",
            reasonCode: "plugin_suspended",
            recommendedRecoveryAction: "resume",
          },
        ],
        uninstall: {
          posture: "retain",
          cleanupRequested: false,
          blocked: false,
          reasonCode: null,
          recommendedRecoveryAction: null,
          cleanupConfirmationToken: "cleanup:plugin-1",
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
        pluginId: "plugin-2",
        pluginKey: "plugin-two",
        dbNamespace: "plugin_two",
        name: "插件二号",
        sourceType: "external",
        installSource: "manual",
        builtIn: false,
        defaultEnabled: false,
        nonDeletable: false,
        lifecycleState: "active",
        internalLifecycleSubstate: "ready",
        blocked: false,
        killSwitchEnabled: false,
        reasonCode: null,
        recommendedRecoveryAction: null,
        executableActionCatalog: [
          {
            actionKey: "foreign-action",
            ownerType: "external-plugin",
            ownerPluginKey: "plugin-two",
            inputSchemaKey: "plugin-action.payload.generic",
            requiredPermission: null,
            sideEffectClass: "notification-stub",
            implementationSource: "main-repo-static-implementation",
            ownerPluginId: "plugin-2",
            ownerDisplayName: "插件二号",
            lifecycleState: "active",
            catalogView: "executable",
          },
        ],
        blockedActionDiagnostics: [],
        uninstall: {
          posture: "retain",
          cleanupRequested: false,
          blocked: false,
          reasonCode: null,
          recommendedRecoveryAction: null,
          cleanupConfirmationToken: "cleanup:plugin-2",
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
  };
}

describe("plugin governance operator detail seams", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getCurrentUserDTO.mockResolvedValue({ id: "operator-1" });
    getUserMembershipsDTO.mockResolvedValue([
      { schoolId: "school-1", role: "admin", status: "active" },
    ]);
  });

  it("filters plugin detail to the requested plugin only", async () => {
    readGovernanceDashboardBundle.mockResolvedValue(createDashboard());

    const { getPluginLifecycleOperatorDetailDTO } = await import("./plugin-governance-operator");
    const detail = await getPluginLifecycleOperatorDetailDTO({ pluginId: "plugin-1" });

    expect(detail.schoolId).toBe("school-1");
    expect(detail.focusedPluginId).toBe("plugin-1");
    expect(detail.focusedActionKey).toBeUndefined();
    expect(detail.backHref).toBe("/settings/labs");
    expect(detail.dashboard.pluginLifecycleRows.map((row) => row.pluginId)).toEqual(["plugin-1"]);
    expect(detail.dashboard.executableActionCatalog.map((row) => row.ownerPluginId)).toEqual(["plugin-1"]);
    expect(detail.dashboard.blockedActionDiagnostics.map((row) => row.ownerPluginId)).toEqual(["plugin-1"]);
  });

  it("filters action detail to the requested action only", async () => {
    readGovernanceDashboardBundle.mockResolvedValue(createDashboard());

    const { getPluginActionLifecycleOperatorDetailDTO } = await import("./plugin-governance-operator");
    const detail = await getPluginActionLifecycleOperatorDetailDTO({
      pluginId: "plugin-1",
      actionKey: "resume-runtime",
    });

    expect(detail.focusedPluginId).toBe("plugin-1");
    expect(detail.focusedActionKey).toBe("resume-runtime");
    expect(detail.backHref).toBe("/settings/labs/plugins/plugin-1");
    expect(detail.dashboard.pluginLifecycleRows).toHaveLength(1);
    expect(detail.dashboard.pluginLifecycleRows[0]?.blockedActionDiagnostics.map((row) => row.actionKey)).toEqual([
      "resume-runtime",
    ]);
    expect(detail.dashboard.pluginLifecycleRows[0]?.executableActionCatalog).toEqual([]);
  });

  it("rejects missing plugin ids outside the operator scope", async () => {
    readGovernanceDashboardBundle.mockResolvedValue(createDashboard());

    const { getPluginLifecycleOperatorDetailDTO } = await import("./plugin-governance-operator");

    await expect(getPluginLifecycleOperatorDetailDTO({ pluginId: "plugin-foreign" })).rejects.toThrow(
      "PLUGIN_GOVERNANCE_OPERATOR_NOT_FOUND",
    );
    expect(readGovernanceDashboardBundle).toHaveBeenCalledWith({
      actorId: "operator-1",
      schoolId: "school-1",
    });
  });

  it("rejects missing actions even when the plugin exists", async () => {
    readGovernanceDashboardBundle.mockResolvedValue(createDashboard());

    const { getPluginActionLifecycleOperatorDetailDTO } = await import("./plugin-governance-operator");

    await expect(
      getPluginActionLifecycleOperatorDetailDTO({
        pluginId: "plugin-1",
        actionKey: "missing-action",
      }),
    ).rejects.toThrow("PLUGIN_GOVERNANCE_OPERATOR_NOT_FOUND");
  });
});
