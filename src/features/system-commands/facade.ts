import "server-only";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { platformCommands, platformCommandAttempts } from "@/db/schema";
import { assertActionExecutable } from "@/features/platform-core/plugin-data-access/governance-gate";
import { writeSystemCommandAudit } from "./audit";
import {
  systemConfigGetAuthorize,
  systemConfigGetExecute,
  systemConfigHandler,
  systemFileHandler,
} from "./handler";
import {
  dispatchPlatformCommand,
  type PersistedPlatformCommandRecord,
  type PlatformCommandStore,
} from "@/features/platform-core/commands/bus";
import { defaultInProcessPlatformEventAdapter } from "@/features/platform-core/events/adapters/in-process";
import { platformCommandRegistry } from "@/features/platform-core/commands/registry";
import type {
  PlatformCommand,
  PlatformCommandStatus,
  PlatformCommandType,
} from "@/features/platform-core/commands/contracts";

// ---------------------------------------------------------------------------
// PlatformCommandStore (mirror of plugin-data.ts producer store)
// ---------------------------------------------------------------------------

function mapPersistedCommand(
  record: typeof platformCommands.$inferSelect,
): PersistedPlatformCommandRecord {
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
    resultSummary:
      (record.resultSummaryJson as Record<string, unknown> | null) ?? null,
    failureDetail:
      (record.failureDetailJson as Record<string, unknown> | null) ?? null,
  };
}

const systemCommandStore: PlatformCommandStore = {
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
      return {
        command: mapPersistedCommand(existingById).command,
        created: false,
      };
    }
    const existing = await db.query.platformCommands.findFirst({
      where: eq(platformCommands.dedupeKey, input.dedupeKey),
    });
    if (existing) {
      return {
        command: mapPersistedCommand(existing).command,
        created: false,
      };
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
        completedAt:
          input.status === "succeeded" || input.status === "failed"
            ? new Date()
            : null,
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
      resultSummary:
        (row.resultSummaryJson as Record<string, unknown> | null) ?? null,
      failureDetail:
        (row.failureDetailJson as Record<string, unknown> | null) ?? null,
    }));
  },
};

// ---------------------------------------------------------------------------
// dispatchSystemCommand facade
// ---------------------------------------------------------------------------

/**
 * 系统命令的统一入口 facade（Phase 79, D-03/D-04/D-16）。
 *
 * 镜像 `dispatchPluginDataAccess` 的三段式结构：
 *   1. 治理门前置 —— assertActionExecutable（lifecycle + kill-switch + school scope）
 *   2. 判别派发 —— system.config.set → Command Bus / system.config.get → DAL
 *   3. 结果返回
 *
 * 核心安全不变式（T-79-04）：
 *   - schoolId 由 governance-gate 从认证 session 派生注入，facade 层级不接受 schoolId 参数
 *   - 治理门被拒绝时 facade 不触达任何数据
 *   - 所有拒绝点先写 system command audit 再抛错
 */
export async function dispatchSystemCommand(input: {
  /** 命令类型，对应 manifest systemCommands 中的 command 字段 */
  commandType: string;
  /** 发起调用的插件 key */
  pluginKey: string;
  /** 由认证 session 派生的 actor ID */
  actorId: string;
  /** config 操作的 key（system.config.set / system.config.get 时使用） */
  configKey?: string;
  /** config 操作的 value（system.config.set 时使用） */
  configValue?: unknown;
  /** file 操作的 fileId（system.file.delete 时使用） */
  fileId?: string;
  /** file 操作的上传元数据（system.file.upload 时使用） */
  fileMeta?: {
    sha256: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    diskPath: string;
    fileId: string;
  };
}) {
  const correlationId = buildSystemCommandCorrelationId({
    commandType: input.commandType,
    pluginKey: input.pluginKey,
    actorId: input.actorId,
  });

  // -------------------------------------------------------------------
  // ① 治理门前置
  // -------------------------------------------------------------------
  // assertActionExecutable 的 verb 已泛化为 string（Phase 79, D-01/D-02），
  // commandType 作为 verb 传入，治理门执行 lifecycle/kill-switch/school scope 检查。
  // schoolId 由治理门从认证 session 派生注入（T-79-04），绝不从 payload 读取。
  let schoolId: string;
  let projectionRow;
  try {
    const gateResult = await assertActionExecutable({
      actorId: input.actorId,
      pluginKey: input.pluginKey,
      verb: input.commandType,
      correlationId,
    });
    schoolId = gateResult.schoolId;
    projectionRow = gateResult.projectionRow;
  } catch (error) {
    // assertActionExecutable 内部已写 denial audit + throw。
    // facade 不重写 audit，直接透传错误。
    throw error;
  }

  // -------------------------------------------------------------------
  // ② 判别派发
  // -------------------------------------------------------------------

  // --- system.config.set: 经 Command Bus（Phase 79 D-05/D-08）---
  if (input.commandType === "system.config.set") {
    if (input.configKey == null) {
      throw new Error(
        "system.config.set requires configKey",
      );
    }
    if (input.configValue === undefined) {
      throw new Error(
        "system.config.set requires configValue",
      );
    }

    const commandId = buildSystemCommandId({
      commandType: "system.config.set",
      correlationId,
    });

    const dedupeKey = buildSystemCommandDedupeKey({
      commandType: "system.config.set",
      schoolId,
      pluginId: projectionRow.pluginId,
      configKey: input.configKey,
    });

    const envelope = {
      id: commandId,
      type: "system.config.set" as const,
      actor: {
        actorId: input.actorId,
        actorScope: "plugin" as const,
      },
      scope: {
        schoolId,
        pluginId: projectionRow.pluginId,
      },
      payload: {
        configKey: input.configKey,
        configValue: input.configValue,
      },
      correlation: {
        correlationId,
        causationId: null,
        producer: "dispatchSystemCommand",
      },
      audit: {
        delegatedActor: null,
        approval: null,
      },
      dedupeKey,
    };

    const result = await dispatchPlatformCommand(envelope, {
      definitions: platformCommandRegistry,
      store: systemCommandStore,
      publicationPort: defaultInProcessPlatformEventAdapter,
    });

    return {
      success: result.status === "succeeded",
      data: result.resultSummary,
      commandId: result.commandId,
      attemptNumber: result.attemptNumber,
    };
  }

  // --- system.config.get: 纯 DAL 读（Phase 79 D-06/D-07）---
  if (input.commandType === "system.config.get") {
    if (input.configKey == null) {
      throw new Error(
        "system.config.get requires configKey",
      );
    }

    const pluginId = projectionRow.pluginId;

    // Manifest re-parse + allowedKeys match (authorize writes audit on deny)
    await systemConfigGetAuthorize({
      pluginId,
      schoolId,
      configKey: input.configKey,
      actorId: input.actorId,
      actorScope: "plugin",
      correlationId,
    });

    // Pure DAL read — does NOT write audit (D-07)
    const data = await systemConfigGetExecute({
      pluginId,
      schoolId,
      configKey: input.configKey,
    });

    return {
      success: true,
      data,
      source: "dal" as const,
    };
  }

  // --- system.file.upload: 经 Command Bus（Phase 80，仅元数据）---
  if (input.commandType === "system.file.upload") {
    if (!input.fileMeta) {
      throw new Error(
        "system.file.upload requires fileMeta (metadata envelope)",
      );
    }

    const pluginId = projectionRow.pluginId;
    const { fileId, sha256, fileName, mimeType, sizeBytes, diskPath } = input.fileMeta;

    const commandId = buildSystemCommandId({
      commandType: "system.file.upload",
      correlationId,
    });

    const dedupeKey = buildFileCommandDedupeKey({
      commandType: "system.file.upload",
      schoolId,
      pluginId,
      key: fileId,
    });

    const envelope = {
      id: commandId,
      type: "system.file.upload" as const,
      actor: {
        actorId: input.actorId,
        actorScope: "plugin" as const,
      },
      scope: {
        schoolId,
        pluginId,
      },
      payload: {
        filePath: diskPath,  // Plugin-declared logical path for authorize matching
        fileId,
        sha256,
        fileName,
        mimeType,
        sizeBytes,
        diskPath,
      },
      correlation: {
        correlationId,
        causationId: null,
        producer: "dispatchSystemCommand",
      },
      audit: {
        delegatedActor: null,
        approval: null,
      },
      dedupeKey,
    };

    const result = await dispatchPlatformCommand(envelope, {
      definitions: platformCommandRegistry,
      store: systemCommandStore,
      publicationPort: defaultInProcessPlatformEventAdapter,
    });

    return {
      success: result.status === "succeeded",
      data: result.resultSummary,
      commandId: result.commandId,
      attemptNumber: result.attemptNumber,
    };
  }

  // --- system.file.delete: 经 Command Bus（Phase 80）---
  if (input.commandType === "system.file.delete") {
    if (!input.fileId) {
      throw new Error(
        "system.file.delete requires fileId",
      );
    }

    const pluginId = projectionRow.pluginId;

    const commandId = buildSystemCommandId({
      commandType: "system.file.delete",
      correlationId,
    });

    const dedupeKey = buildFileCommandDedupeKey({
      commandType: "system.file.delete",
      schoolId,
      pluginId,
      key: input.fileId,
    });

    const envelope = {
      id: commandId,
      type: "system.file.delete" as const,
      actor: {
        actorId: input.actorId,
        actorScope: "plugin" as const,
      },
      scope: {
        schoolId,
        pluginId,
      },
      payload: {
        fileId: input.fileId,
      },
      correlation: {
        correlationId,
        causationId: null,
        producer: "dispatchSystemCommand",
      },
      audit: {
        delegatedActor: null,
        approval: null,
      },
      dedupeKey,
    };

    const result = await dispatchPlatformCommand(envelope, {
      definitions: platformCommandRegistry,
      store: systemCommandStore,
      publicationPort: defaultInProcessPlatformEventAdapter,
    });

    return {
      success: result.status === "succeeded",
      data: result.resultSummary,
      commandId: result.commandId,
      attemptNumber: result.attemptNumber,
    };
  }

  // system.http.request 已由 Phase 78 经 Command Bus 独立实现，不经过本 facade。

  // --- unknown commandType → audit + throw ---
  const reasonCode = "config_key_denied";
  await writeSystemCommandAudit({
    pluginId: projectionRow?.pluginId ?? null,
    schoolId,
    commandId: null,
    actorId: input.actorId,
    actorScope: "plugin",
    lifecycleState: projectionRow?.lifecycle?.internalSubstate ?? "ready",
    correlationId,
    decision: "denied",
    reasonCode,
    payloadJson: {
      commandType: input.commandType,
      pluginKey: input.pluginKey,
      configKey: input.configKey ?? "",
    },
    commandType: "system.config.get" as const,
  });

  throw new Error(`Unsupported system command: ${input.commandType}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * 由 commandType + actorId + pluginKey 稳定派生 correlationId。
 *
 * 与 buildFacadeCorrelationId 镜像：使用 sha256 确保确定性、不可逆、不含敏感 payload。
 * configKey / configValue 不参与 hash——避免信息泄漏（T-79-05）。
 */
function buildSystemCommandCorrelationId(input: {
  commandType: string;
  pluginKey: string;
  actorId: string;
}): string {
  const base = `system-cmd:${input.commandType}:${input.actorId}:${input.pluginKey}`;
  return createHash("sha256").update(base).digest("hex");
}

/**
 * 构造 Command Bus 所需的稳定 commandId。
 */
function buildSystemCommandId(input: {
  commandType: string;
  correlationId: string;
}): string {
  return `${input.commandType}:${input.correlationId}`;
}

/**
 * 构造 dedupeKey：防止同一 config key 在同一 school/plugin 下被重放。
 */
function buildSystemCommandDedupeKey(input: {
  commandType: string;
  schoolId: string;
  pluginId: string;
  configKey: string;
}): string {
  const base = `${input.commandType}:${input.schoolId}:${input.pluginId}:${input.configKey}`;
  return createHash("sha256").update(base).digest("hex");
}

/**
 * 构造 file 命令的 dedupeKey：防止同一 fileId 在同一 school/plugin 下被重放。
 *
 * 接受泛化的 key 参数（fileId 或 sha256 作为去重组件）。
 */
function buildFileCommandDedupeKey(input: {
  commandType: string;
  schoolId: string;
  pluginId: string;
  key: string;
}): string {
  const base = `${input.commandType}:${input.schoolId}:${input.pluginId}:${input.key}`;
  return createHash("sha256").update(base).digest("hex");
}
