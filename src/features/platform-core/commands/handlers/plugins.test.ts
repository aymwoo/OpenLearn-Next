import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  assertActiveTeacher: vi.fn(),
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

import { platformCommandRegistry } from "../registry";

function createCommand(type: "plugin.install", payload: {
  schoolId: string;
  pluginId: string;
  existingRegistrationId?: string;
  name: string;
  installSource: "manual" | "bootstrap" | "repair" | "seed";
  manifestJson: Record<string, unknown>;
}): {
  id: string;
  type: "plugin.install";
  actor: { actorId: string; actorScope: "teacher" };
  scope: { schoolId: string; pluginId: string };
  payload: typeof payload;
  correlation: { correlationId: string; causationId: null; producer: string };
};
function createCommand(type: "plugin.enable", payload: { schoolId: string; pluginId: string; enabledBy: string }): any;
function createCommand(type: "plugin.resume", payload: { schoolId: string; pluginId: string; reason: string; targetState?: "enabled" | "mounted" | "ready" }): any;
function createCommand(type: "plugin.retry", payload: { schoolId: string; pluginId: string; commandId: string; reason: string }): any;
function createCommand(type: "plugin.uninstall.preflight", payload: { schoolId: string; pluginId: string }): any;
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
  };
}

describe("platform plugin command registry", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.transaction.mockImplementation(async (callback: (tx: { token: string }) => Promise<unknown>) => callback({ token: "tx" }));
    mocks.assertActiveTeacher.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-1"],
    });
    mocks.installOrReconcilePluginWithTx.mockResolvedValue({
      id: "plugin-1",
      schoolId: "school-1",
      lifecycleState: "installed",
      manifestJson: { theme: null },
    });
    mocks.transitionPluginLifecycleWithTx.mockResolvedValue({
      id: "plugin-1",
      schoolId: "school-1",
      lifecycleState: "enabled",
      manifestJson: { theme: null },
    });
    mocks.setPluginKillSwitchWithTx.mockResolvedValue({
      id: "plugin-1",
      schoolId: "school-1",
      lifecycleState: "suspended",
      manifestJson: { theme: null },
      killSwitchEnabled: true,
    });
    mocks.preflightUninstallPluginWithTx.mockResolvedValue({
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
    });
    mocks.uninstallPluginWithTx.mockResolvedValue({ id: "plugin-1", schoolId: "school-1" });
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
    mocks.listPluginsForSchool.mockResolvedValue([
      {
        id: "plugin-1",
        pluginKey: "vendor/plugin-1",
        enabled: true,
        manifestJson: {
          governance: {
            dependencies: [],
          },
        },
      },
      {
        id: "plugin-dep",
        pluginKey: "vendor/plugin-dep",
        enabled: true,
        manifestJson: {
          governance: {
            dependencies: [],
          },
        },
      },
    ]);
    mocks.readRegistryProjectionBundleForSchool.mockReturnValue({
      orderedPluginIds: ["plugin-1"],
      missingDependencies: [],
      cycles: [],
    });
  });

  it("routes plugin.install through tx-aware helpers and returns normalized invalidation intent", async () => {
    const command = createCommand("plugin.install", {
      schoolId: "school-1",
      pluginId: "plugin-1",
      name: "Plugin One",
      installSource: "manual",
      manifestJson: { id: "plugin.one" },
    });

    const result = await platformCommandRegistry["plugin.install"].execute({ command, attemptNumber: 1 });

    expect(mocks.installOrReconcilePluginWithTx).toHaveBeenCalledWith(expect.objectContaining({
      pluginId: undefined,
      tx: { token: "tx" },
      commandContext: {
        commandId: command.id,
        correlationId: command.correlation.correlationId,
        attemptNumber: 1,
      },
    }));
    expect(result).toMatchObject({
      resultSummary: expect.objectContaining({ pluginId: "plugin-1", commandType: "plugin.install" }),
      invalidation: { tags: ["plugin:registry", "plugin:plugin-1"] },
    });
  });

  it("passes existingRegistrationId through plugin.install for reconcile paths", async () => {
    const command = createCommand("plugin.install", {
      schoolId: "school-1",
      pluginId: "plugin.one",
      existingRegistrationId: "plugin-1",
      name: "Plugin One",
      installSource: "repair",
      manifestJson: { id: "plugin.one" },
    });

    await platformCommandRegistry["plugin.install"].execute({ command, attemptNumber: 1 });

    expect(mocks.installOrReconcilePluginWithTx).toHaveBeenCalledWith(expect.objectContaining({
      pluginId: "plugin-1",
    }));
  });

  it("authorizes explicit governance commands through teacher-manager scope before execute", async () => {
    const command = createCommand("plugin.enable", {
      schoolId: "school-1",
      pluginId: "plugin-1",
      enabledBy: "teacher-1",
    });

    await expect(platformCommandRegistry["plugin.enable"].authorize({ command })).resolves.toBeUndefined();

    expect(mocks.assertActiveTeacher).toHaveBeenCalledTimes(1);
  });

  it("allows trusted system producers to bypass interactive teacher session checks", async () => {
    const command = {
      ...createCommand("plugin.install", {
        schoolId: "school-1",
        pluginId: "plugin-1",
        name: "Plugin One",
        installSource: "bootstrap",
        manifestJson: { id: "plugin.one" },
      }),
      actor: {
        actorId: "teacher-1",
        actorScope: "system" as const,
      },
    };

    await expect(platformCommandRegistry["plugin.install"].authorize({ command })).resolves.toBeUndefined();
    await platformCommandRegistry["plugin.install"].execute({ command, attemptNumber: 1 });

    expect(mocks.assertActiveTeacher).not.toHaveBeenCalled();
    expect(mocks.installOrReconcilePluginWithTx).toHaveBeenCalledWith(expect.objectContaining({
      actorScope: "system",
    }));
  });

  it("retries against the same failed command identity instead of creating a fresh business command", async () => {
    const command = createCommand("plugin.retry", {
      schoolId: "school-1",
      pluginId: "plugin-1",
      commandId: "command-existing",
      reason: "operator retry",
    });

    const result = await platformCommandRegistry["plugin.retry"].execute({ command, attemptNumber: 2 });

    expect(mocks.findPlatformCommand).toHaveBeenCalledTimes(1);
    expect(mocks.transitionPluginLifecycleWithTx).toHaveBeenCalledWith(expect.objectContaining({
      targetState: "enabled",
      commandContext: {
        commandId: "command-existing",
        correlationId: command.correlation.correlationId,
        attemptNumber: 2,
      },
    }));
    expect(result.resultSummary).toMatchObject({
      commandType: "plugin.retry",
      retriedCommandType: "plugin.enable",
      commandId: "command-existing",
      attemptNumber: 2,
    });
  });

  it("rejects retry envelopes that try to use a fresh command identity", async () => {
    const command = {
      ...createCommand("plugin.retry", {
        schoolId: "school-1",
        pluginId: "plugin-1",
        commandId: "command-existing",
        reason: "operator retry",
      }),
      id: "command-new",
    };

    await expect(platformCommandRegistry["plugin.retry"].execute({ command, attemptNumber: 2 })).rejects.toThrow(
      "PLATFORM_COMMAND_RETRY_REQUIRES_STABLE_COMMAND_ID",
    );
  });

  it("keeps uninstall preflight read-only and dedupe-optional", async () => {
    const command = createCommand("plugin.uninstall.preflight", {
      schoolId: "school-1",
      pluginId: "plugin-1",
    });

    const result = await platformCommandRegistry["plugin.uninstall.preflight"].execute({ command, attemptNumber: 1 });

    expect(platformCommandRegistry["plugin.uninstall.preflight"].dedupe).toBe("optional");
    expect(mocks.preflightUninstallPluginWithTx).toHaveBeenCalledTimes(1);
    expect(mocks.installOrReconcilePluginWithTx).not.toHaveBeenCalled();
    expect(mocks.transitionPluginLifecycleWithTx).not.toHaveBeenCalled();
    expect(mocks.uninstallPluginWithTx).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      resultSummary: expect.objectContaining({ commandType: "plugin.uninstall.preflight", blocked: false }),
      invalidation: { tags: [] },
    });
  });

  it("preserves mounted and ready when resuming lifecycle through explicit command payload", async () => {
    const mountedCommand = {
      ...createCommand("plugin.resume", {
        schoolId: "school-1",
        pluginId: "plugin-1",
        reason: "mounted",
        targetState: "mounted",
      }),
    };

    await platformCommandRegistry["plugin.resume"].execute({ command: mountedCommand, attemptNumber: 1 });

    expect(mocks.transitionPluginLifecycleWithTx).toHaveBeenCalledWith(expect.objectContaining({
      targetState: "mounted",
      actorScope: "teacher",
    }));

    mocks.transitionPluginLifecycleWithTx.mockClear();

    const readyCommand = {
      ...createCommand("plugin.resume", {
        schoolId: "school-1",
        pluginId: "plugin-1",
        reason: "ready",
        targetState: "ready",
      }),
    };

    await platformCommandRegistry["plugin.resume"].execute({ command: readyCommand, attemptNumber: 2 });

    expect(mocks.transitionPluginLifecycleWithTx).toHaveBeenCalledWith(expect.objectContaining({
      targetState: "ready",
      actorScope: "teacher",
    }));
  });

  it("fails fast when enable or resume sees missing dependencies in activation chain", async () => {
    const command = createCommand("plugin.enable", {
      schoolId: "school-1",
      pluginId: "plugin-1",
      enabledBy: "teacher-1",
    });

    mocks.readRegistryProjectionBundleForSchool.mockReturnValueOnce({
      orderedPluginIds: ["plugin-1"],
      missingDependencies: ["vendor/missing"],
      cycles: [],
    });

    await expect(
      platformCommandRegistry["plugin.enable"].execute({ command, attemptNumber: 1 }),
    ).rejects.toThrow("PLUGIN_DEPENDENCY_BLOCKED:vendor/missing");

    expect(mocks.transitionPluginLifecycleWithTx).not.toHaveBeenCalled();
  });

  it("activates dependency chain in topological order before target plugin", async () => {
    const command = createCommand("plugin.resume", {
      schoolId: "school-1",
      pluginId: "plugin-1",
      reason: "resume target",
      targetState: "ready",
    });

    mocks.readRegistryProjectionBundleForSchool.mockReturnValueOnce({
      orderedPluginIds: ["plugin-dep", "plugin-1"],
      missingDependencies: [],
      cycles: [],
    });

    await platformCommandRegistry["plugin.resume"].execute({ command, attemptNumber: 1 });

    expect(mocks.transitionPluginLifecycleWithTx).toHaveBeenNthCalledWith(1, expect.objectContaining({
      pluginId: "plugin-dep",
      targetState: "ready",
    }));
    expect(mocks.transitionPluginLifecycleWithTx).toHaveBeenNthCalledWith(2, expect.objectContaining({
      pluginId: "plugin-1",
      targetState: "ready",
    }));
  });

  it("exposes all explicit governance commands and no plugin.transition primary contract", () => {
    expect(Object.keys(platformCommandRegistry)).toEqual([
      "plugin.install",
      "plugin.enable",
      "plugin.disable",
      "plugin.retry",
      "plugin.suspend",
      "plugin.resume",
      "plugin.uninstall.preflight",
      "plugin.uninstall",
      "plugin.kill_switch.set",
    ]);
    expect((platformCommandRegistry as Record<string, unknown>)["plugin.transition"]).toBeUndefined();
  });
});
