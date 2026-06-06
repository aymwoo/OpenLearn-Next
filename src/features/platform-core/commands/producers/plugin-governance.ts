import "server-only";

import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { platformCommandAttempts, platformCommands } from "@/db/schema";
import { dispatchPlatformCommand, type PersistedPlatformCommandRecord, type PlatformCommandStore } from "@/features/platform-core/commands/bus";
import { defaultInProcessPlatformEventAdapter } from "@/features/platform-core/events/adapters/in-process";
import type {
  PlatformCommand,
  PlatformCommandDispatchResult,
  PlatformCommandStatus,
  PlatformCommandType,
} from "@/features/platform-core/commands/contracts";
import type { PlatformAuditMetadata } from "@/features/platform-core/ai-contracts/delegation";

type ProducerSource = "server-action" | "host-action" | "bootstrap-script";

type ProducerCorrelation = {
  correlationId?: string | null;
  causationId?: string | null;
  producer: string;
};

type BaseProducerInput<TType extends PlatformCommandType, TPayload extends Record<string, unknown>> = {
  type: TType;
  actor: PlatformCommand["actor"];
  scope: {
    schoolId: string;
    pluginId: string;
  };
  payload: TPayload;
  dedupeKey?: string;
  correlation?: ProducerCorrelation;
  audit?: PlatformAuditMetadata;
  source: ProducerSource;
};

type DispatchPluginGovernanceCommandInput =
  | BaseProducerInput<"plugin.install", {
      schoolId: string;
      pluginId: string;
      existingRegistrationId?: string;
      name: string;
      installSource: "manual" | "bootstrap" | "repair" | "seed";
      manifestJson: Record<string, unknown>;
      marketplace?: {
        pluginKey: string;
        version: string;
        recoveryMode?: "fresh" | "recover";
      };
    }>
  | BaseProducerInput<"plugin.upgrade.preflight", {
      schoolId: string;
      pluginId: string;
      targetVersion: string;
    }>
  | BaseProducerInput<"plugin.upgrade", {
      schoolId: string;
      pluginId: string;
      targetVersion: string;
    }>
  | BaseProducerInput<"plugin.enable", {
      schoolId: string;
      pluginId: string;
      enabledBy: string;
    }>
  | BaseProducerInput<"plugin.disable", {
      schoolId: string;
      pluginId: string;
      disabledBy: string;
    }>
  | BaseProducerInput<"plugin.reconcile", {
      schoolId: string;
      pluginId: string;
      reason: string;
      targetState?: "enabled" | "mounted" | "ready";
    }>
  | BaseProducerInput<"plugin.retry", {
      schoolId: string;
      pluginId: string;
      commandId: string;
      reason: string;
    }>
  | BaseProducerInput<"plugin.suspend", {
      schoolId: string;
      pluginId: string;
      reason: string;
    }>
  | BaseProducerInput<"plugin.resume", {
      schoolId: string;
      pluginId: string;
      reason: string;
      targetState?: "enabled" | "mounted" | "ready";
    }>
  | BaseProducerInput<"plugin.uninstall.preflight", {
      schoolId: string;
      pluginId: string;
    }>
  | BaseProducerInput<"plugin.uninstall", {
      schoolId: string;
      pluginId: string;
      retentionMode: "retain" | "cleanup";
      confirmationToken?: string;
    }>
  | BaseProducerInput<"plugin.kill_switch.set", {
      schoolId: string;
      pluginId: string;
      enabled: boolean;
      reason: string;
    }>;

type GovernanceProducerResult<TData = Record<string, unknown> | null> = {
  success: boolean;
  data: TData;
  commandId: string;
  attemptNumber: number;
  invalidationTags: string[];
};

function buildProducerCorrelation(input: DispatchPluginGovernanceCommandInput) {
  const base = `${input.source}:${input.type}:${input.actor.actorId}:${input.scope.schoolId}:${input.scope.pluginId}`;
  return {
    correlationId: input.correlation?.correlationId?.trim() || createHash("sha256").update(`${base}:${JSON.stringify(input.payload)}`).digest("hex"),
    causationId: input.correlation?.causationId?.trim() || null,
    producer: input.correlation?.producer?.trim() || input.source,
  };
}

function buildCommandId(input: DispatchPluginGovernanceCommandInput, correlationId: string) {
  if (input.type === "plugin.retry") {
    return input.payload.commandId;
  }

  return `${input.type}:${correlationId}`;
}

function mapPersistedCommand(record: typeof platformCommands.$inferSelect): PersistedPlatformCommandRecord {
  return {
    command: {
      id: record.id,
      type: record.commandType as PlatformCommandType,
      actor: {
        actorId: record.actorId,
        actorScope: record.actorScope,
      },
      scope: record.scopeJson as PlatformCommand["scope"],
      payload: record.payloadJson as PlatformCommand["payload"],
      correlation: record.correlationJson as PlatformCommand["correlation"],
      audit: (record.auditSummaryJson as PlatformCommand["audit"] | null) ?? {
        delegatedActor: null,
        approval: null,
      },
      dedupeKey: record.dedupeKey,
    } as PlatformCommand,
    dedupeKey: record.dedupeKey,
    status: record.status as PlatformCommandStatus,
    latestAttemptNumber: record.latestAttemptNumber,
    resultSummary: (record.resultSummaryJson as Record<string, unknown> | null) ?? null,
    failureDetail: (record.failureDetailJson as Record<string, unknown> | null) ?? null,
  };
}

const platformCommandStore: PlatformCommandStore = {
  async getCommandByDedupeKey(dedupeKey) {
    const record = await db.query.platformCommands.findFirst({
      where: eq(platformCommands.dedupeKey, dedupeKey),
    });

    return record ? mapPersistedCommand(record) : null;
  },
  async insertCommand(input) {
    const existingById = await db.query.platformCommands.findFirst({
      where: eq(platformCommands.id, input.command.id),
    });

    if (existingById) {
      return { command: mapPersistedCommand(existingById).command, created: false };
    }

    const existing = await db.query.platformCommands.findFirst({
      where: eq(platformCommands.dedupeKey, input.dedupeKey),
    });

    if (existing) {
      return { command: mapPersistedCommand(existing).command, created: false };
    }

    const [created] = await db.insert(platformCommands).values({
      id: input.command.id,
      actorId: input.command.actor.actorId,
      schoolId: input.command.scope.schoolId,
      commandType: input.command.type,
      status: input.status,
      dedupeKey: input.dedupeKey,
      actorScope: input.command.actor.actorScope,
      scopeJson: input.command.scope,
      payloadJson: input.command.payload,
      correlationJson: input.command.correlation,
      auditSummaryJson: input.command.audit,
      latestAttemptNumber: input.latestAttemptNumber,
    }).returning();

    return {
      command: mapPersistedCommand(created).command,
      created: true,
    };
  },
  async appendAttempt(input) {
    await db.insert(platformCommandAttempts).values({
      commandId: input.commandId,
      attemptNumber: input.attemptNumber,
      status: input.status,
      resultSummaryJson: input.resultSummary ?? null,
      failureDetailJson: input.failureDetail ?? null,
      startedAt: new Date(),
      completedAt: input.status === "running" ? null : new Date(),
    });
  },
  async updateCommandSummary(input) {
    await db.update(platformCommands).set({
      status: input.status,
      latestAttemptNumber: input.latestAttemptNumber,
      resultSummaryJson: input.resultSummary ?? null,
      failureDetailJson: input.failureDetail ?? null,
      updatedAt: new Date(),
      completedAt: input.status === "succeeded" || input.status === "failed" ? new Date() : null,
    }).where(eq(platformCommands.id, input.commandId));
  },
  async getCommand(commandId) {
    const record = await db.query.platformCommands.findFirst({
      where: eq(platformCommands.id, commandId),
    });

    return record ? mapPersistedCommand(record) : null;
  },
  async listAttempts(commandId) {
    const rows = await db.query.platformCommandAttempts.findMany({
      where: eq(platformCommandAttempts.commandId, commandId),
    });

    return rows.map((row) => ({
      commandId: row.commandId,
      attemptNumber: row.attemptNumber,
      status: row.status as PlatformCommandStatus,
      resultSummary: (row.resultSummaryJson as Record<string, unknown> | null) ?? null,
      failureDetail: (row.failureDetailJson as Record<string, unknown> | null) ?? null,
    }));
  },
};

function normalizeProducerResult(result: PlatformCommandDispatchResult): GovernanceProducerResult {
  return {
    success: result.status === "succeeded",
    data: result.resultSummary,
    commandId: result.commandId,
    attemptNumber: result.attemptNumber,
    invalidationTags: result.invalidation.tags,
  };
}

export async function dispatchPluginGovernanceCommand(input: DispatchPluginGovernanceCommandInput): Promise<GovernanceProducerResult> {
  const correlation = buildProducerCorrelation(input);
  const commandId = buildCommandId(input, correlation.correlationId);

  const result = await dispatchPlatformCommand({
    id: commandId,
    type: input.type,
    actor: input.actor,
    scope: input.scope,
      payload: input.payload,
      correlation,
      audit: input.audit,
      dedupeKey: input.dedupeKey,
    }, {
    store: platformCommandStore,
    publicationPort: defaultInProcessPlatformEventAdapter,
  });

  return normalizeProducerResult(result);
}

export async function producePluginInstallCommand(input: Omit<Extract<DispatchPluginGovernanceCommandInput, { type: "plugin.install" }>, "type">) {
  return dispatchPluginGovernanceCommand({ ...input, type: "plugin.install" });
}

export async function producePluginUpgradePreflightCommand(input: Omit<Extract<DispatchPluginGovernanceCommandInput, { type: "plugin.upgrade.preflight" }>, "type">) {
  return dispatchPluginGovernanceCommand({ ...input, type: "plugin.upgrade.preflight" });
}

export async function producePluginUpgradeCommand(input: Omit<Extract<DispatchPluginGovernanceCommandInput, { type: "plugin.upgrade" }>, "type">) {
  return dispatchPluginGovernanceCommand({ ...input, type: "plugin.upgrade" });
}

export async function producePluginEnableCommand(input: Omit<Extract<DispatchPluginGovernanceCommandInput, { type: "plugin.enable" }>, "type">) {
  return dispatchPluginGovernanceCommand({ ...input, type: "plugin.enable" });
}

export async function producePluginDisableCommand(input: Omit<Extract<DispatchPluginGovernanceCommandInput, { type: "plugin.disable" }>, "type">) {
  return dispatchPluginGovernanceCommand({ ...input, type: "plugin.disable" });
}

export async function producePluginReconcileCommand(input: Omit<Extract<DispatchPluginGovernanceCommandInput, { type: "plugin.reconcile" }>, "type">) {
  return dispatchPluginGovernanceCommand({ ...input, type: "plugin.reconcile" });
}

export async function producePluginRetryCommand(input: Omit<Extract<DispatchPluginGovernanceCommandInput, { type: "plugin.retry" }>, "type">) {
  return dispatchPluginGovernanceCommand({ ...input, type: "plugin.retry" });
}

export async function producePluginSuspendCommand(input: Omit<Extract<DispatchPluginGovernanceCommandInput, { type: "plugin.suspend" }>, "type">) {
  return dispatchPluginGovernanceCommand({ ...input, type: "plugin.suspend" });
}

export async function producePluginResumeCommand(input: Omit<Extract<DispatchPluginGovernanceCommandInput, { type: "plugin.resume" }>, "type">) {
  return dispatchPluginGovernanceCommand({ ...input, type: "plugin.resume" });
}

export async function producePluginUninstallPreflightCommand(input: Omit<Extract<DispatchPluginGovernanceCommandInput, { type: "plugin.uninstall.preflight" }>, "type">) {
  return dispatchPluginGovernanceCommand({ ...input, type: "plugin.uninstall.preflight" });
}

export async function producePluginUninstallCommand(input: Omit<Extract<DispatchPluginGovernanceCommandInput, { type: "plugin.uninstall" }>, "type">) {
  return dispatchPluginGovernanceCommand({ ...input, type: "plugin.uninstall" });
}

export async function producePluginKillSwitchSetCommand(input: Omit<Extract<DispatchPluginGovernanceCommandInput, { type: "plugin.kill_switch.set" }>, "type">) {
  return dispatchPluginGovernanceCommand({ ...input, type: "plugin.kill_switch.set" });
}
