import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { platformCommandAttempts, platformCommands } from "@/db/schema";
import {
  dispatchPlatformCommand,
  type PersistedPlatformCommandRecord,
  type PlatformCommandBusDependencies,
  type PlatformCommandStore,
} from "@/features/platform-core/commands/bus";
import type {
  PlatformCommand,
  PlatformCommandStatus,
  PlatformCommandType,
} from "@/features/platform-core/commands/contracts";
import { defaultInProcessPlatformEventAdapter } from "@/features/platform-core/events/adapters/in-process";
import type { LessonStepPayload } from "@/lib/dto/lesson-authoring";

/**
 * LessonAgent 公共编排入口（AGENT-03 / AGENT-04）。
 *
 * 不变式：
 * - **唯一派发路径**：构造合法 `lesson.draft.run` command envelope 后，**只**经
 *   `dispatchPlatformCommand` 派发；绝不绕过 Command Bus 直写事件账本（T-62-11）。
 * - **server-only 边界**：首行 `import "server-only"`；不导入 DB schema 写入逻辑之外的
 *   底层（无 env/api key、无 LLM 直生成 facade、无动态执行），生成只经 62-03 handler → 62-02 工具（T-62-12）。
 * - **Spoofing 缓解**：teacherId 绝不进 payload；身份由 handler 经 `assertActiveTeacher` 授权注入（T-62-10）。
 * - **失败透传**：dispatch 失败时 bus 抛出 generic 失败语义，入口不静默吞错、原样透传（D-53-08）。
 *
 * 对应 `agents/registry.ts` 中 seed 的 LessonAgent（enabled=false / featureFlag `lesson_agent_enabled`）。
 */

/** 保留 sentinel pluginId —— 内置系统 agent 身份，仅由 server-only 编排入口内部构造。 */
const LESSON_AGENT_PLUGIN_ID = "core.lesson-agent";

/** 内置系统 actor：编排入口非用户直触发，actorScope 取 system。 */
const LESSON_AGENT_SYSTEM_ACTOR: PlatformCommand["actor"] = {
  actorId: LESSON_AGENT_PLUGIN_ID,
  actorScope: "system",
};

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

/** 生产 PlatformCommandStore：经 `db` 落 command 记录（D-01 允许的唯一持久副作用）。 */
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

export type DraftLessonStepInput = {
  schoolId: string;
  lessonId: string;
  stepType: "content" | "task" | "quiz";
  intent: string;
  /** 可选覆盖 actor；缺省用内置系统 agent actor。 */
  actor?: PlatformCommand["actor"];
};

export type DraftLessonStepResult = {
  status: PlatformCommandStatus;
  commandId: string;
  /** 经 resultSummary 回传的整包步骤（SC3）；非成功时为 null。 */
  step: LessonStepPayload | null;
};

/** 入口级依赖注入点：测试经此注入 in-memory store + 捕获型 persistPlatformEvents。 */
type DraftLessonStepDeps = Partial<
  Pick<PlatformCommandBusDependencies, "store" | "persistPlatformEvents" | "publicationPort">
>;

/**
 * 公共编排入口：构造 `lesson.draft.run` envelope → `dispatchPlatformCommand` 派发
 * → 从 `PlatformCommandDispatchResult.resultSummary` 取回生成步骤包回传调用方。
 *
 * 不传 `definitions` → bus 默认解析 `platformCommandRegistry` 中 62-03 注册的 lesson.draft.run handler。
 */
export async function draftLessonStep(
  input: DraftLessonStepInput,
  deps?: DraftLessonStepDeps,
): Promise<DraftLessonStepResult> {
  const correlationId = crypto.randomUUID();

  const command = {
    id: `lesson.draft.run:${correlationId}`,
    type: "lesson.draft.run" as const,
    actor: input.actor ?? LESSON_AGENT_SYSTEM_ACTOR,
    // 复用 {schoolId, pluginId} scope；pluginId 携带保留 sentinel（内置系统 agent 身份）。
    scope: { schoolId: input.schoolId, pluginId: LESSON_AGENT_PLUGIN_ID },
    // payload 仅 lessonId/stepType/intent —— teacherId 绝不进 payload（由 handler 授权注入）。
    payload: {
      lessonId: input.lessonId,
      stepType: input.stepType,
      intent: input.intent,
    },
    correlation: {
      correlationId,
      causationId: null,
      producer: "lesson-agent",
    },
  } satisfies Partial<PlatformCommand> & Record<string, unknown>;

  // 唯一派发路径：失败时 dispatchPlatformCommand 抛出 bus 的 failed 语义（不静默吞错 / D-53-08）。
  const result = await dispatchPlatformCommand(command, {
    store: deps?.store ?? platformCommandStore,
    publicationPort: deps?.publicationPort ?? defaultInProcessPlatformEventAdapter,
    persistPlatformEvents: deps?.persistPlatformEvents,
  });

  const step = (result.resultSummary?.step as LessonStepPayload | undefined) ?? null;

  return {
    status: result.status,
    commandId: result.commandId,
    step,
  };
}
