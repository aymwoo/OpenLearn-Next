import "server-only";

import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { platformCommandAttempts, platformCommands } from "@/db/schema";
import type { PersistedPlatformCommandRecord, PlatformCommandStore } from "@/features/platform-core/commands/bus";
import { defaultInProcessPlatformEventAdapter } from "@/features/platform-core/events/adapters/in-process";
import type {
  PlatformCommand,
  PlatformCommandStatus,
  PlatformCommandType,
} from "@/features/platform-core/commands/contracts";
import type { PlatformAuditMetadata } from "@/features/platform-core/ai-contracts/delegation";

/**
 * lesson.draft.accept / lesson.draft.discard producer（D-04）。
 *
 * 教师审校接受/丢弃 AI 草稿不再直连 DAL —— 经此 producer 构造严格 envelope，
 * 由调用方（lesson-authoring-actions）经 `dispatchPlatformCommand` 唯一派发，
 * 使 review accept/discard 路径成为 v3.0 Command Bus 上的单一真相源（不新建第二真相源）。
 *
 * 不变式：
 * - **dedupeKey 必填**（DRAFT-02 replay-safety / dedupe:required）—— 缺失即抛错，重复提交幂等。
 * - **payload 严格契约**：accept/discard payload 精确匹配 contracts.ts 严格 schema，无额外字段；
 *   teacherId/schoolId 绝不进 payload（由 handler 经 assertActiveTeacher 闭包注入）。
 * - **scope 复用**：沿用既有 {schoolId, pluginId} scope；pluginId 携带保留 sentinel "core.lesson-agent"。
 */

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
  /** DRAFT-02 / dedupe:required —— 必填，缺失即抛错。 */
  dedupeKey: string;
  correlation?: ProducerCorrelation;
  audit?: PlatformAuditMetadata;
  source: ProducerSource;
};

/** lesson.draft.accept payload —— 严格匹配 LessonDraftAcceptPayloadSchema（不造第二套 step schema）。 */
type LessonDraftAcceptInput = BaseProducerInput<"lesson.draft.accept", {
  lessonId: string;
  draftVersionId: string;
  editedSteps?: Array<{
    index: number;
    title: string;
    description: string;
    content: string;
  }>;
}>;

/** lesson.draft.discard payload —— 严格匹配 LessonDraftDiscardPayloadSchema。 */
type LessonDraftDiscardInput = BaseProducerInput<"lesson.draft.discard", {
  lessonId: string;
  draftVersionId: string;
}>;

export type BuildLessonDraftCommandInput = LessonDraftAcceptInput | LessonDraftDiscardInput;

function buildProducerCorrelation(input: BuildLessonDraftCommandInput) {
  const base = `${input.source}:${input.type}:${input.actor.actorId}:${input.scope.schoolId}:${input.scope.pluginId}`;
  return {
    correlationId:
      input.correlation?.correlationId?.trim() ||
      createHash("sha256").update(`${base}:${JSON.stringify(input.payload)}`).digest("hex"),
    causationId: input.correlation?.causationId?.trim() || null,
    producer: input.correlation?.producer?.trim() || input.source,
  };
}

function buildCommandId(input: BuildLessonDraftCommandInput, correlationId: string) {
  return `${input.type}:${correlationId}`;
}

/**
 * 构造 lesson.draft.accept / lesson.draft.discard 的 PlatformCommand envelope。
 * dedupeKey 必填（replay-safe）；payload 已由类型收窄到严格契约形状。
 */
export function buildLessonDraftCommand(input: BuildLessonDraftCommandInput): PlatformCommand {
  const dedupeKey = input.dedupeKey?.trim();
  if (!dedupeKey) {
    throw new Error("LESSON_DRAFT_DEDUPE_KEY_REQUIRED");
  }

  const correlation = buildProducerCorrelation(input);
  const commandId = buildCommandId(input, correlation.correlationId);

  return {
    id: commandId,
    type: input.type,
    actor: input.actor,
    scope: input.scope,
    payload: input.payload,
    correlation,
    audit: input.audit ?? { delegatedActor: null, approval: null },
    dedupeKey,
  } as PlatformCommand;
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

/** 生产 PlatformCommandStore：经 `db` 落 command 记录（与 plugin-governance/lesson-agent 同构）。 */
export const lessonDraftCommandStore: PlatformCommandStore = {
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

/** 派发依赖：生产 store + in-process 发布端口，交给 dispatchPlatformCommand 第二参。 */
export const lessonDraftCommandBusDependencies = {
  store: lessonDraftCommandStore,
  publicationPort: defaultInProcessPlatformEventAdapter,
};
