import "server-only";

import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { platformCommandAttempts, platformCommands } from "@/db/schema";
import {
  dispatchPlatformCommand,
  type PersistedPlatformCommandRecord,
  type PlatformCommandStore,
} from "@/features/platform-core/commands/bus";
import { defaultInProcessPlatformEventAdapter } from "@/features/platform-core/events/adapters/in-process";
import type {
  PlatformCommand,
  PlatformCommandDispatchResult,
  PlatformCommandStatus,
  PlatformCommandType,
} from "@/features/platform-core/commands/contracts";
import type { PlatformAuditMetadata } from "@/features/platform-core/ai-contracts/delegation";

/**
 * 受治理数据访问**写动词** producer（Phase 68, ACCESS-02/ACCESS-03）。
 *
 * 经 Command Bus 派发 `plugin.data.insert` / `plugin.data.upsert`，命中 registry 中对应 handler，
 * 落库唯一权威（命令记录 + 自有表）。这是 Plan 04 facade 写分支将调用的入口。
 *
 * 不变式：
 * - **scope.schoolId 唯一权威**：payload 仅携带 `{pluginKey, table, values}`，**不**接受 schoolId
 *   覆盖（schoolId 在 handler 由鉴权闭包派生；payload.values 携带 schoolId 会被白名单层拒）。
 * - **dedupeKey 透传** → 重放安全（bus 对已存在 dedupeKey/命令 id 返回缓存结果，不重复写）。
 * - 镜像 producers/plugin-governance.ts 的 `BaseProducerInput` + `dispatchPlatformCommand` 模式。
 */

type ProducerSource = "server-action" | "host-action" | "bootstrap-script";

type ProducerCorrelation = {
  correlationId?: string | null;
  causationId?: string | null;
  producer: string;
};

/** 写动词 payload：仅声明键 + 已校验前的原始 values（**绝不含 schoolId**）。 */
type PluginDataWritePayload = {
  pluginKey: string;
  table: string;
  values: Record<string, unknown>;
};

type BaseProducerInput<TType extends PlatformCommandType> = {
  type: TType;
  actor: PlatformCommand["actor"];
  scope: {
    schoolId: string;
    pluginId: string;
  };
  payload: PluginDataWritePayload;
  dedupeKey?: string;
  correlation?: ProducerCorrelation;
  audit?: PlatformAuditMetadata;
  source: ProducerSource;
};

type DispatchPluginDataWriteCommandInput =
  | BaseProducerInput<"plugin.data.insert">
  | BaseProducerInput<"plugin.data.upsert">;

type PluginDataProducerResult<TData = Record<string, unknown> | null> = {
  success: boolean;
  data: TData;
  commandId: string;
  attemptNumber: number;
  invalidationTags: string[];
};

function buildProducerCorrelation(input: DispatchPluginDataWriteCommandInput) {
  const base = `${input.source}:${input.type}:${input.actor.actorId}:${input.scope.schoolId}:${input.scope.pluginId}`;
  return {
    correlationId:
      input.correlation?.correlationId?.trim() ||
      createHash("sha256").update(`${base}:${JSON.stringify(input.payload)}`).digest("hex"),
    causationId: input.correlation?.causationId?.trim() || null,
    producer: input.correlation?.producer?.trim() || input.source,
  };
}

function buildCommandId(input: DispatchPluginDataWriteCommandInput, correlationId: string) {
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

    const [created] = await db
      .insert(platformCommands)
      .values({
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
      })
      .returning();

    return { command: mapPersistedCommand(created).command, created: true };
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
    await db
      .update(platformCommands)
      .set({
        status: input.status,
        latestAttemptNumber: input.latestAttemptNumber,
        resultSummaryJson: input.resultSummary ?? null,
        failureDetailJson: input.failureDetail ?? null,
        updatedAt: new Date(),
        completedAt: input.status === "succeeded" || input.status === "failed" ? new Date() : null,
      })
      .where(eq(platformCommands.id, input.commandId));
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

function normalizeProducerResult(result: PlatformCommandDispatchResult): PluginDataProducerResult {
  return {
    success: result.status === "succeeded",
    data: result.resultSummary,
    commandId: result.commandId,
    attemptNumber: result.attemptNumber,
    invalidationTags: result.invalidation.tags,
  };
}

async function dispatchPluginDataWriteCommand(
  input: DispatchPluginDataWriteCommandInput,
): Promise<PluginDataProducerResult> {
  const correlation = buildProducerCorrelation(input);
  const commandId = buildCommandId(input, correlation.correlationId);

  const result = await dispatchPlatformCommand(
    {
      id: commandId,
      type: input.type,
      actor: input.actor,
      scope: input.scope,
      payload: input.payload,
      correlation,
      audit: input.audit,
      dedupeKey: input.dedupeKey,
    },
    {
      store: platformCommandStore,
      publicationPort: defaultInProcessPlatformEventAdapter,
    },
  );

  return normalizeProducerResult(result);
}

export async function producePluginDataInsert(
  input: Omit<Extract<DispatchPluginDataWriteCommandInput, { type: "plugin.data.insert" }>, "type">,
) {
  return dispatchPluginDataWriteCommand({ ...input, type: "plugin.data.insert" });
}

export async function producePluginDataUpsert(
  input: Omit<Extract<DispatchPluginDataWriteCommandInput, { type: "plugin.data.upsert" }>, "type">,
) {
  return dispatchPluginDataWriteCommand({ ...input, type: "plugin.data.upsert" });
}
