import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { platformCommands } from "@/db/schema";
import type { PluginLifecycleState } from "@/features/runtime-platform/contracts/permissions";
import type { PluginManifest } from "@/lib/dto/resource-ai";
import {
  readRegistryProjectionBundleForSchool,
} from "@/features/platform-core/plugins/dependency-graph";
import {
  installOrReconcilePluginWithTx,
  listPluginsForSchool,
  preflightUninstallPluginWithTx,
  setPluginKillSwitchWithTx,
  transitionPluginLifecycleWithTx,
  uninstallPluginWithTx,
} from "@/lib/dal/plugins";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { registerThemeTokens } from "@/lib/dal/themes";

import type { PlatformCommand, PlatformCommandDefinition, PlatformCommandType } from "../contracts";

type InstallCommand = Extract<PlatformCommand, { type: "plugin.install" }>;
type EnableCommand = Extract<PlatformCommand, { type: "plugin.enable" }>;
type DisableCommand = Extract<PlatformCommand, { type: "plugin.disable" }>;
type ReconcileCommand = Extract<PlatformCommand, { type: "plugin.reconcile" }>;
type RetryCommand = Extract<PlatformCommand, { type: "plugin.retry" }>;
type SuspendCommand = Extract<PlatformCommand, { type: "plugin.suspend" }>;
type ResumeCommand = Extract<PlatformCommand, { type: "plugin.resume" }>;
type UninstallPreflightCommand = Extract<PlatformCommand, { type: "plugin.uninstall.preflight" }>;
type UninstallCommand = Extract<PlatformCommand, { type: "plugin.uninstall" }>;
type KillSwitchCommand = Extract<PlatformCommand, { type: "plugin.kill_switch.set" }>;

type CommandContext = {
  commandId: string;
  correlationId: string;
  attemptNumber: number;
};

type ExecutionInput<TCommand extends PlatformCommand = PlatformCommand> = {
  command: TCommand;
  attemptNumber: number;
};

type ExecutionResult = Awaited<ReturnType<PlatformCommandDefinition["execute"]>>;

async function authorizePluginGovernanceCommand(command: PlatformCommand) {
  if (command.actor.actorScope === "system") {
    return;
  }

  const scope = await assertActiveTeacher();

  if (scope.userId !== command.actor.actorId || !scope.schoolIds.includes(command.scope.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }
}

function createCommandContext(input: { command: PlatformCommand; attemptNumber: number }): CommandContext {
  return {
    commandId: input.command.id,
    correlationId: input.command.correlation.correlationId,
    attemptNumber: input.attemptNumber,
  };
}

function buildPluginTags(pluginId: string, extra: string[] = []) {
  return {
    tags: ["plugin:registry", `plugin:${pluginId}`, ...extra],
  };
}

function buildLifecycleSummary(commandType: PlatformCommandType, pluginId: string, lifecycleState: PluginLifecycleState) {
  return {
    commandType,
    pluginId,
    lifecycleState,
  };
}

async function executeInstall(input: ExecutionInput<InstallCommand>): Promise<ExecutionResult> {
  const { command } = input;
  const manifestJson = command.payload.manifestJson as PluginManifest;
  const record = await db.transaction(async (tx) => installOrReconcilePluginWithTx({
    schoolId: command.payload.schoolId,
    pluginId: command.payload.existingRegistrationId,
    name: command.payload.name,
    installSource: command.payload.installSource,
    manifestJson,
    actorId: command.actor.actorId,
    actorScope: command.actor.actorScope,
    tx,
    commandContext: createCommandContext(input),
  }));

  return {
    resultSummary: {
      commandType: "plugin.install",
      pluginId: record.id,
      lifecycleState: record.lifecycleState,
    },
    invalidation: buildPluginTags(record.id),
  };
}

async function executeReconcile(input: ExecutionInput<ReconcileCommand>): Promise<ExecutionResult> {
  const { command } = input;
  const targetPluginId = command.scope.pluginId;
  const targetState = command.payload.targetState ?? "enabled";
  const plugins = await listPluginsForSchool({
    actorId: command.actor.actorId,
    schoolId: command.scope.schoolId,
  });
  const currentPlugin = plugins.find((plugin) => plugin.id === targetPluginId);

  if (!currentPlugin) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  await db.transaction(async (tx) => installOrReconcilePluginWithTx({
    schoolId: command.payload.schoolId,
    pluginId: currentPlugin.id,
    name: currentPlugin.name,
    installSource: currentPlugin.installSource,
    manifestJson: currentPlugin.manifestJson,
    enabled: currentPlugin.enabled,
    killSwitchEnabled: currentPlugin.killSwitchEnabled,
    lifecycleState: currentPlugin.lifecycleState,
    actorId: command.actor.actorId,
    actorScope: command.actor.actorScope,
    tx,
    commandContext: createCommandContext(input),
  }));

  const activationChain = readRegistryProjectionBundleForSchool(
    plugins.map((plugin) => ({
      pluginId: plugin.id,
      pluginKey: plugin.pluginKey,
      dependencies: plugin.manifestJson.governance?.dependencies ?? [],
      enabled: plugin.enabled,
    })),
    targetPluginId,
  );

  if (activationChain.missingDependencies.length > 0) {
    throw new Error(`PLUGIN_RECONCILE_BLOCKED:missing:${activationChain.missingDependencies.join(",")}`);
  }

  if (activationChain.cycles.length > 0) {
    throw new Error(`PLUGIN_RECONCILE_BLOCKED:cycle:${activationChain.cycles[0]?.join("->") ?? "unknown"}`);
  }

  let latestRecord: Awaited<ReturnType<typeof transitionPluginLifecycleWithTx>> | null = null;

  latestRecord = await db.transaction(async (tx) => {
    let latest: Awaited<ReturnType<typeof transitionPluginLifecycleWithTx>> | null = null;
    for (const pluginId of activationChain.orderedPluginIds) {
      latest = await transitionPluginLifecycleWithTx({
        actorId: command.actor.actorId,
        schoolId: command.scope.schoolId,
        pluginId,
        targetState,
        reason: pluginId === targetPluginId ? command.payload.reason : `dependency:${targetPluginId}`,
        actorScope: command.actor.actorScope,
        tx,
        commandContext: createCommandContext(input),
      });
    }
    return latest;
  });

  if (!latestRecord) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  return {
    resultSummary: {
      commandType: "plugin.reconcile",
      pluginId: latestRecord.id,
      lifecycleState: latestRecord.lifecycleState,
      targetState,
    },
    invalidation: buildPluginTags(latestRecord.id),
  };
}

async function executeLifecycleTransition<TType extends Extract<PlatformCommandType, "plugin.enable" | "plugin.disable" | "plugin.suspend" | "plugin.resume">>(
  input: ExecutionInput<EnableCommand | DisableCommand | SuspendCommand | ResumeCommand>,
  targetState: PluginLifecycleState,
  reason: string,
  commandType: TType,
): Promise<ExecutionResult> {
  const { command } = input;
  let record: Awaited<ReturnType<typeof transitionPluginLifecycleWithTx>> | null = null;

  if (commandType === "plugin.enable" || commandType === "plugin.resume") {
    const plugins = await listPluginsForSchool({
      actorId: command.actor.actorId,
      schoolId: command.scope.schoolId,
    });
    const activationChain = readRegistryProjectionBundleForSchool(
      plugins.map((plugin) => ({
        pluginId: plugin.id,
        pluginKey: plugin.pluginKey,
        dependencies: plugin.manifestJson.governance?.dependencies ?? [],
        enabled: plugin.enabled,
      })),
      command.scope.pluginId,
    );

    if (activationChain.missingDependencies.length > 0) {
      throw new Error(`PLUGIN_DEPENDENCY_BLOCKED:${activationChain.missingDependencies.join(",")}`);
    }

    if (activationChain.cycles.length > 0) {
      throw new Error(`PLUGIN_DEPENDENCY_CYCLE:${activationChain.cycles[0]?.join("->") ?? "unknown"}`);
    }

    record = await db.transaction(async (tx) => {
      let latestRecord = null;
      for (const pluginId of activationChain.orderedPluginIds) {
        latestRecord = await transitionPluginLifecycleWithTx({
          actorId: command.actor.actorId,
          schoolId: command.scope.schoolId,
          pluginId,
          targetState,
          reason: pluginId === command.scope.pluginId ? reason : `dependency:${command.scope.pluginId}`,
          actorScope: command.actor.actorScope,
          tx,
          commandContext: createCommandContext(input),
        });
      }
      return latestRecord;
    });
  } else {
    record = await db.transaction(async (tx) => transitionPluginLifecycleWithTx({
      actorId: command.actor.actorId,
      schoolId: command.scope.schoolId,
      pluginId: command.scope.pluginId,
      targetState,
      reason,
      actorScope: command.actor.actorScope,
      tx,
      commandContext: createCommandContext(input),
    }));
  }

  if (!record) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  let extraTags: string[] = [];
  let registeredThemeId: string | null = null;

  if (commandType === "plugin.enable" && record.manifestJson.theme) {
    const theme = await registerThemeTokens(
      command.scope.schoolId,
      `${record.name} theme`,
      record.manifestJson.theme,
      command.actor.actorId,
    );
    registeredThemeId = theme.id;
    extraTags = ["theme:registry", `theme:${theme.id}`];
  }

  return {
    resultSummary: {
      ...buildLifecycleSummary(commandType, record.id, record.lifecycleState),
      registeredThemeId,
    },
    invalidation: buildPluginTags(record.id, extraTags),
  };
}

async function executeKillSwitchSet(input: ExecutionInput<KillSwitchCommand>): Promise<ExecutionResult> {
  const { command } = input;
  const record = await db.transaction(async (tx) => setPluginKillSwitchWithTx({
    pluginId: command.scope.pluginId,
    actorId: command.actor.actorId,
    killSwitchEnabled: command.payload.enabled,
    actorScope: command.actor.actorScope,
    tx,
    commandContext: createCommandContext(input),
  }));

  return {
    resultSummary: {
      commandType: "plugin.kill_switch.set",
      pluginId: record.id,
      lifecycleState: record.lifecycleState,
      killSwitchEnabled: record.killSwitchEnabled,
      reason: command.payload.reason,
    },
    invalidation: buildPluginTags(record.id),
  };
}

async function executeUninstallPreflight(input: ExecutionInput<UninstallPreflightCommand>): Promise<ExecutionResult> {
  const { command } = input;
  const result = await db.transaction(async (tx) => preflightUninstallPluginWithTx({
    actorId: command.actor.actorId,
    schoolId: command.scope.schoolId,
    pluginId: command.scope.pluginId,
    actorScope: command.actor.actorScope,
    tx,
    commandContext: createCommandContext(input),
  }));

  return {
    resultSummary: {
      commandType: "plugin.uninstall.preflight",
      pluginId: command.scope.pluginId,
      ...(result ?? {
        blocked: false,
        reason: null,
        totalCount: 0,
      }),
    },
    invalidation: { tags: [] },
  };
}

async function executeUninstall(input: ExecutionInput<UninstallCommand>): Promise<ExecutionResult> {
  const { command } = input;

  if (command.payload.retentionMode === "cleanup" && !command.payload.confirmationToken) {
    throw new Error("PLUGIN_CLEANUP_CONFIRMATION_REQUIRED");
  }

  const record = await db.transaction(async (tx) => uninstallPluginWithTx({
    actorId: command.actor.actorId,
    schoolId: command.scope.schoolId,
    pluginId: command.scope.pluginId,
    retentionMode: command.payload.retentionMode,
    confirmationToken: command.payload.confirmationToken,
    actorScope: command.actor.actorScope,
    tx,
    commandContext: createCommandContext(input),
  }));

  return {
    resultSummary: {
      commandType: "plugin.uninstall",
      pluginId: command.scope.pluginId,
      uninstalled: Boolean(record),
    },
    invalidation: buildPluginTags(command.scope.pluginId),
  };
}

async function loadRetriedCommand(commandId: string) {
  const existing = await db.query.platformCommands.findFirst({
    where: eq(platformCommands.id, commandId),
  });

  if (!existing) {
    throw new Error("PLATFORM_COMMAND_RETRY_TARGET_NOT_FOUND");
  }

  if (existing.status !== "failed") {
    throw new Error("PLATFORM_COMMAND_RETRY_NOT_ALLOWED");
  }

  return existing;
}

async function executeRetry(input: ExecutionInput<RetryCommand>): Promise<ExecutionResult> {
  const { command, attemptNumber } = input;

  if (command.id !== command.payload.commandId) {
    throw new Error("PLATFORM_COMMAND_RETRY_REQUIRES_STABLE_COMMAND_ID");
  }

  const existing = await loadRetriedCommand(command.payload.commandId);

  if (existing.schoolId !== command.scope.schoolId) {
    throw new Error("PLATFORM_COMMAND_RETRY_SCOPE_MISMATCH");
  }

  const retriedPayload = existing.payloadJson as Record<string, unknown>;
  const retriedScope = existing.scopeJson as { pluginId?: string };
  const pluginId = retriedScope.pluginId ?? command.scope.pluginId;
  const commandContext = createCommandContext(input);

  switch (existing.commandType as PlatformCommandType) {
    case "plugin.install": {
      const record = await db.transaction(async (tx) => installOrReconcilePluginWithTx({
        schoolId: command.scope.schoolId,
        pluginId,
        name: retriedPayload.name as string,
        manifestJson: retriedPayload.manifestJson as PluginManifest,
        installSource: retriedPayload.installSource as "manual" | "bootstrap" | "repair" | "seed",
        actorId: command.actor.actorId,
        actorScope: command.actor.actorScope,
        tx,
        commandContext,
      }));

      return {
        resultSummary: {
          commandType: "plugin.retry",
          retriedCommandType: existing.commandType,
          commandId: command.id,
          attemptNumber,
          pluginId: record.id,
          lifecycleState: record.lifecycleState,
        },
        invalidation: buildPluginTags(record.id),
      };
    }
    case "plugin.enable":
    case "plugin.disable":
    case "plugin.suspend":
    case "plugin.resume": {
      const targetState = existing.commandType === "plugin.enable" || existing.commandType === "plugin.resume"
        ? (retriedPayload.targetState === "mounted" || retriedPayload.targetState === "ready"
            ? retriedPayload.targetState
            : "enabled")
        : existing.commandType === "plugin.disable"
          ? "disabled"
          : "suspended";
      const reason = typeof retriedPayload.reason === "string"
        ? retriedPayload.reason
        : existing.commandType === "plugin.enable"
          ? "enabled"
          : existing.commandType === "plugin.disable"
            ? "disabled"
            : command.payload.reason;
      const record = await db.transaction(async (tx) => transitionPluginLifecycleWithTx({
        actorId: command.actor.actorId,
        schoolId: command.scope.schoolId,
        pluginId,
        targetState,
        reason,
        actorScope: command.actor.actorScope,
        tx,
        commandContext,
      }));

      return {
        resultSummary: {
          commandType: "plugin.retry",
          retriedCommandType: existing.commandType,
          commandId: command.id,
          attemptNumber,
          pluginId: record.id,
          lifecycleState: record.lifecycleState,
        },
        invalidation: buildPluginTags(record.id),
      };
    }
    case "plugin.uninstall": {
      await db.transaction(async (tx) => uninstallPluginWithTx({
        actorId: command.actor.actorId,
        schoolId: command.scope.schoolId,
        pluginId,
        retentionMode: (retriedPayload.retentionMode as "retain" | "cleanup" | undefined) ?? "retain",
        confirmationToken: typeof retriedPayload.confirmationToken === "string"
          ? retriedPayload.confirmationToken
          : undefined,
        actorScope: command.actor.actorScope,
        tx,
        commandContext,
      }));

      return {
        resultSummary: {
          commandType: "plugin.retry",
          retriedCommandType: existing.commandType,
          commandId: command.id,
          attemptNumber,
          pluginId,
          uninstalled: true,
        },
        invalidation: buildPluginTags(pluginId),
      };
    }
    case "plugin.kill_switch.set": {
      const record = await db.transaction(async (tx) => setPluginKillSwitchWithTx({
        actorId: command.actor.actorId,
        pluginId,
        killSwitchEnabled: Boolean(retriedPayload.enabled),
        actorScope: command.actor.actorScope,
        tx,
        commandContext,
      }));

      return {
        resultSummary: {
          commandType: "plugin.retry",
          retriedCommandType: existing.commandType,
          commandId: command.id,
          attemptNumber,
          pluginId: record.id,
          lifecycleState: record.lifecycleState,
          killSwitchEnabled: record.killSwitchEnabled,
        },
        invalidation: buildPluginTags(record.id),
      };
    }
    default:
      throw new Error("PLATFORM_COMMAND_RETRY_UNSUPPORTED_COMMAND_TYPE");
  }
}

export const pluginCommandHandlers = {
  "plugin.install": {
    authorize: ({ command }) => authorizePluginGovernanceCommand(command),
    execute: (input) => executeInstall(input as ExecutionInput<InstallCommand>),
  },
  "plugin.enable": {
    authorize: ({ command }) => authorizePluginGovernanceCommand(command),
    execute: (input) => executeLifecycleTransition(input as ExecutionInput<EnableCommand>, "enabled", "enabled", "plugin.enable"),
  },
  "plugin.disable": {
    authorize: ({ command }) => authorizePluginGovernanceCommand(command),
    execute: (input) => executeLifecycleTransition(input as ExecutionInput<DisableCommand>, "disabled", "disabled", "plugin.disable"),
  },
  "plugin.reconcile": {
    authorize: ({ command }) => authorizePluginGovernanceCommand(command),
    execute: (input) => executeReconcile(input as ExecutionInput<ReconcileCommand>),
  },
  "plugin.retry": {
    authorize: ({ command }) => authorizePluginGovernanceCommand(command),
    execute: (input) => executeRetry(input as ExecutionInput<RetryCommand>),
  },
  "plugin.suspend": {
    authorize: ({ command }) => authorizePluginGovernanceCommand(command),
    execute: (input) => executeLifecycleTransition(input as ExecutionInput<SuspendCommand>, "suspended", (input.command as SuspendCommand).payload.reason, "plugin.suspend"),
  },
  "plugin.resume": {
    authorize: ({ command }) => authorizePluginGovernanceCommand(command),
    execute: (input) => {
      const command = input.command as ResumeCommand;
      return executeLifecycleTransition(
        input as ExecutionInput<ResumeCommand>,
        command.payload.targetState ?? "enabled",
        command.payload.reason,
        "plugin.resume",
      );
    },
  },
  "plugin.uninstall.preflight": {
    authorize: ({ command }) => authorizePluginGovernanceCommand(command),
    execute: (input) => executeUninstallPreflight(input as ExecutionInput<UninstallPreflightCommand>),
  },
  "plugin.uninstall": {
    authorize: ({ command }) => authorizePluginGovernanceCommand(command),
    execute: (input) => executeUninstall(input as ExecutionInput<UninstallCommand>),
  },
  "plugin.kill_switch.set": {
    authorize: ({ command }) => authorizePluginGovernanceCommand(command),
    execute: (input) => executeKillSwitchSet(input as ExecutionInput<KillSwitchCommand>),
  },
} satisfies Record<PlatformCommandType, Pick<PlatformCommandDefinition, "authorize" | "execute">>;
