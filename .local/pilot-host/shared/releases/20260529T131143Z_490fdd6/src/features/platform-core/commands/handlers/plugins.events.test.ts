import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  assertActiveTeacher: vi.fn(),
  getCurrentUserDTO: vi.fn(),
  getUserMembershipsDTO: vi.fn(),
  installOrReconcilePluginWithTx: vi.fn(),
  listPluginsForSchool: vi.fn(),
  transitionPluginLifecycleWithTx: vi.fn(),
  setPluginKillSwitchWithTx: vi.fn(),
  preflightUninstallPluginWithTx: vi.fn(),
  uninstallPluginWithTx: vi.fn(),
  findPlatformCommand: vi.fn(),
  readRegistryProjectionBundleForSchool: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    transaction: mocks.transaction,
    query: {
      platformCommands: {
        findFirst: mocks.findPlatformCommand,
      },
    },
  },
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher: mocks.assertActiveTeacher,
}));

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO: mocks.getCurrentUserDTO,
}));

vi.mock("@/lib/dal/membership", () => ({
  getUserMembershipsDTO: mocks.getUserMembershipsDTO,
}));

vi.mock("@/lib/dal/plugins", () => ({
  installOrReconcilePluginWithTx: mocks.installOrReconcilePluginWithTx,
  listPluginsForSchool: mocks.listPluginsForSchool,
  transitionPluginLifecycleWithTx: mocks.transitionPluginLifecycleWithTx,
  setPluginKillSwitchWithTx: mocks.setPluginKillSwitchWithTx,
  preflightUninstallPluginWithTx: mocks.preflightUninstallPluginWithTx,
  uninstallPluginWithTx: mocks.uninstallPluginWithTx,
}));

vi.mock("@/lib/dal/themes", () => ({
  registerThemeTokens: vi.fn(async () => ({ id: "theme-1" })),
}));

vi.mock("@/features/platform-core/plugins/dependency-graph", () => ({
  readRegistryProjectionBundleForSchool: mocks.readRegistryProjectionBundleForSchool,
}));

import { PlatformCommandExecutionError } from "../contracts";
import { platformCommandRegistry } from "../registry";

function createCommand(type: "plugin.install", payload: {
  schoolId: string;
  pluginId: string;
  name: string;
  installSource: "manual" | "bootstrap" | "repair" | "seed";
  manifestJson: Record<string, unknown>;
}): any;
function createCommand(type: "plugin.enable", payload: { schoolId: string; pluginId: string; enabledBy: string }): any;
function createCommand(type: "plugin.kill_switch.set", payload: { schoolId: string; pluginId: string; enabled: boolean; reason: string }): any;
function createCommand(type: "plugin.retry", payload: { schoolId: string; pluginId: string; commandId: string; reason: string }): any;
function createCommand(type: string, payload: Record<string, unknown>) {
  return {
    id: type === "plugin.retry" ? "command-existing" : `command-${type}`,
    type,
    actor: {
      actorId: "teacher-1",
      actorScope: "teacher" as const,
    },
    scope: {
      schoolId: "school-1",
      pluginId: "plugin-1",
    },
    payload,
    correlation: {
      correlationId: `corr-${type}`,
      causationId: null,
      producer: "test-suite",
    },
    audit: {
      delegatedActor: {
        delegatedAgentId: "agent-1",
        delegatedAgentScope: "plugin" as const,
        delegationReason: "Teacher approved delegated plugin action",
        authorityPosture: "delegated-no-elevation" as const,
      },
      approval: {
        status: "approved" as const,
        summary: "Teacher approved delegated action",
        reference: {
          kind: "command" as const,
          id: "approval-1",
          summary: "Approval reference",
        },
      },
    },
  };
}

describe("plugin command event emission", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.transaction.mockImplementation(async (callback: (tx: { token: string }) => Promise<unknown>) => callback({ token: "tx" }));
    mocks.assertActiveTeacher.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-1"],
    });
    mocks.getCurrentUserDTO.mockResolvedValue({
      id: "operator-1",
    });
    mocks.getUserMembershipsDTO.mockResolvedValue([
      { schoolId: "school-1", status: "active", role: "admin" },
    ]);
    mocks.installOrReconcilePluginWithTx.mockResolvedValue({
      id: "plugin-1",
      pluginKey: "vendor/plugin-1",
      installSource: "manual",
      schoolId: "school-1",
      lifecycleState: "installed",
      manifestJson: { theme: null },
    });
    mocks.transitionPluginLifecycleWithTx.mockResolvedValue({
      id: "plugin-1",
      pluginKey: "vendor/plugin-1",
      schoolId: "school-1",
      lifecycleState: "enabled",
      manifestJson: { theme: null },
      killSwitchEnabled: false,
      name: "Plugin One",
    });
    mocks.setPluginKillSwitchWithTx.mockResolvedValue({
      id: "plugin-1",
      pluginKey: "vendor/plugin-1",
      schoolId: "school-1",
      lifecycleState: "suspended",
      manifestJson: { theme: null },
      killSwitchEnabled: true,
    });
    mocks.listPluginsForSchool.mockResolvedValue([
      {
        id: "plugin-1",
        pluginKey: "vendor/plugin-1",
        name: "Plugin One",
        installSource: "manual",
        lifecycleState: "installed",
        killSwitchEnabled: false,
        enabled: true,
        manifestJson: { governance: { dependencies: [] } },
      },
    ]);
    mocks.readRegistryProjectionBundleForSchool.mockReturnValue({
      orderedPluginIds: ["plugin-1"],
      missingDependencies: [],
      cycles: [],
    });
    mocks.findPlatformCommand.mockResolvedValue({
      id: "command-existing",
      actorId: "teacher-1",
      actorScope: "teacher",
      schoolId: "school-1",
      commandType: "plugin.enable",
      status: "failed",
      dedupeKey: "plugin.enable:school-1:plugin-1",
      scopeJson: { schoolId: "school-1", pluginId: "plugin-1" },
      payloadJson: { schoolId: "school-1", pluginId: "plugin-1", enabledBy: "teacher-1" },
      correlationJson: { correlationId: "corr-original", causationId: null, producer: "producer" },
    });
  });

  it("emits generic success plus plugin.installed for plugin.install", async () => {
    const command = createCommand("plugin.install", {
      schoolId: "school-1",
      pluginId: "plugin-1",
      name: "Plugin One",
      installSource: "manual",
      manifestJson: { id: "vendor/plugin-1" },
    });

    const result = await platformCommandRegistry["plugin.install"].execute({ command, attemptNumber: 1 });

    expect(result.emittedEvents).toEqual([
      expect.objectContaining({
        eventType: "platform.command.succeeded",
        aggregateId: "plugin-1",
      }),
      expect.objectContaining({
        eventType: "plugin.installed",
        aggregateId: "plugin-1",
        payload: expect.objectContaining({
          pluginKey: "vendor/plugin-1",
          lifecycleState: "installed",
        }),
      }),
    ]);
    expect(result.failureEvent).toBeNull();
  });

  it("emits generic success plus plugin.lifecycle.changed for lifecycle transitions", async () => {
    const command = createCommand("plugin.enable", {
      schoolId: "school-1",
      pluginId: "plugin-1",
      enabledBy: "teacher-1",
    });

    const result = await platformCommandRegistry["plugin.enable"].execute({ command, attemptNumber: 2 });
    const lifecycleEvent = result.emittedEvents?.find((event) => event.eventType === "plugin.lifecycle.changed");

    expect(lifecycleEvent).toMatchObject({
      aggregateId: "plugin-1",
      audit: command.audit,
      payload: {
        pluginId: "plugin-1",
        fromState: "installed",
        toState: "enabled",
        reasonCode: "enabled",
        transitionCounter: 2,
      },
    });
  });

  it("propagates delegated audit metadata into success and failure events", async () => {
    const command = createCommand("plugin.enable", {
      schoolId: "school-1",
      pluginId: "plugin-1",
      enabledBy: "teacher-1",
    });

    const success = await platformCommandRegistry["plugin.enable"].execute({ command, attemptNumber: 2 });
    expect(success.emittedEvents[0]).toMatchObject({
      eventType: "platform.command.succeeded",
      audit: command.audit,
    });

    const retryCommand = {
      ...createCommand("plugin.retry", {
        schoolId: "school-1",
        pluginId: "plugin-1",
        commandId: "command-existing",
        reason: "operator retry",
      }),
      id: "command-new",
    };

    await expect(platformCommandRegistry["plugin.retry"].execute({ command: retryCommand, attemptNumber: 2 })).rejects.toMatchObject({
      failureEvent: expect.objectContaining({ audit: retryCommand.audit }),
    });
  });

  it("emits generic success plus plugin.kill_switch.changed for kill switch commands", async () => {
    const command = createCommand("plugin.kill_switch.set", {
      schoolId: "school-1",
      pluginId: "plugin-1",
      enabled: true,
      reason: "operator-toggle",
    });

    const result = await platformCommandRegistry["plugin.kill_switch.set"].execute({ command, attemptNumber: 3 });
    const domainEvent = result.emittedEvents?.find((event) => event.eventType === "plugin.kill_switch.changed");

    expect(domainEvent).toMatchObject({
      aggregateId: "plugin-1",
      payload: {
        pluginId: "plugin-1",
        enabled: true,
        reasonCode: "operator-toggle",
        toggleCounter: 3,
      },
    });
  });

  it("throws a structured generic failure event and no domain event on blocked retry", async () => {
    const command = {
      ...createCommand("plugin.retry", {
        schoolId: "school-1",
        pluginId: "plugin-1",
        commandId: "command-existing",
        reason: "operator retry",
      }),
      id: "command-new",
    };

    await expect(platformCommandRegistry["plugin.retry"].execute({ command, attemptNumber: 2 })).rejects.toMatchObject({
      name: "PlatformCommandExecutionError",
      message: "PLATFORM_COMMAND_RETRY_REQUIRES_STABLE_COMMAND_ID",
    });

    try {
      await platformCommandRegistry["plugin.retry"].execute({ command, attemptNumber: 2 });
    } catch (error) {
      expect(error).toBeInstanceOf(PlatformCommandExecutionError);
      const executionError = error as PlatformCommandExecutionError;
      expect(executionError.failureAttribution).toEqual({
        scope: "operator",
        pluginId: "plugin-1",
        reasonCode: "retry_identity_mismatch",
        recommendedRecoveryAction: "retry",
      });
      expect(executionError.failureEvent.eventType).toBe("platform.command.failed");
      expect(executionError.failureEvent.payload.reasonCode).toBe("retry_identity_mismatch");
      expect(executionError.failureEvent.audit).toEqual(command.audit);
    }
  });
});
