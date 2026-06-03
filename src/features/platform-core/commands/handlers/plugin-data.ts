import "server-only";

import { and, desc, eq, getTableColumns } from "drizzle-orm";
import { type SQLiteColumn } from "drizzle-orm/sqlite-core";

import { db } from "@/db";
import { pluginDataAccessAllowlist } from "@/db/schema/generated/plugin-owned/data-access-allowlist";

import {
  PluginDataAccessError,
  resolvePluginTable,
  validateInsertPayload,
} from "../../plugin-data-access/allowlist";
import { assertActionExecutable, type AssertActionExecutableResult } from "../../plugin-data-access/governance-gate";
import { writePluginDataAccessAudit } from "../../plugin-data-access/audit";
import type { PluginDataAccessVerb } from "../../plugin-data-access/contracts";

import {
  type PlatformCommand,
  type PlatformCommandDefinition,
  type PlatformCommandExecutionResult,
} from "../contracts";

/**
 * 受治理数据访问**写动词** handler（Phase 68, ACCESS-02/ACCESS-03）。
 *
 * 不变式：
 * - **唯一 durable 写入是命令记录 + 自有表**（SC3 / Pitfall #8）；emittedEvents/WS/Redis 只投递不落权威。
 * - **schoolId/pluginId 取鉴权闭包**（governance-gate 从 session 派生），**绝不**取自 payload。
 *   payload 携带 schoolId 在白名单层即 `cross_school_rejected`。
 * - **双重派生**：authorize 与 execute 各自跑 `deriveWriteContext`（治理门 + 白名单），
 *   仿 lesson-draft.ts（authorize 单参 void + execute 再校验）。成功路径两次派生均不写 audit，
 *   故无重复审计；唯一 allowed audit 在 execute 事务内与变更原子提交（D-04）。
 * - **失败审计**：治理门拒绝由 gate 自审（non_school_actor/lifecycle/kill_switch）；白名单层拒绝
 *   （unknown_table/cross_school/invalid_payload/...）在本文件 `deriveWriteContext` 补写 denied audit。
 * - **append-only/isLatest**（仿 learning.ts L654）：attemptNo = max+1；
 *   `insert` = 纯追加（不撤销既有 isLatest）；`upsert` = 撤销旧 isLatest 后追加新 isLatest 行。
 */

type PluginDataInsertCommand = Extract<PlatformCommand, { type: "plugin.data.insert" }>;
type PluginDataUpsertCommand = Extract<PlatformCommand, { type: "plugin.data.upsert" }>;
type PluginDataWriteCommand = PluginDataInsertCommand | PluginDataUpsertCommand;

type ExecutionInput<TCommand extends PlatformCommand = PlatformCommand> = {
  command: TCommand;
  attemptNumber: number;
};

type ExecutionResult = PlatformCommandExecutionResult;

/** 动词执行代表受治理插件行为（非裸用户操作），审计 actorScope 统一记 "plugin"（与 gate 一致）。 */
const ACTOR_SCOPE = "plugin" as const;

type DerivedWriteContext = {
  gate: AssertActionExecutableResult;
  tableName: string;
  validatedValues: Record<string, unknown>;
};

function successResult(resultSummary: Record<string, unknown> | null, tags: string[]): ExecutionResult {
  return {
    resultSummary,
    invalidation: { tags },
    emittedEvents: [],
    failureEvent: null,
    failureAttribution: null,
  };
}

/** dedupe/逻辑键列源：声明 `uniques[0]`（单一真相源），空则退化为仅 schoolId 维度。 */
function resolveDedupeColumns(pluginKey: string, tableName: string): string[] {
  const allowlist = pluginDataAccessAllowlist as unknown as Record<
    string,
    Record<string, { uniques: readonly (readonly string[])[] }>
  >;
  const uniques = allowlist[pluginKey]?.[tableName]?.uniques ?? [];
  return uniques.length > 0 ? [...uniques[0]] : [];
}

/**
 * 治理门 + 白名单双层派生。
 * 1) `assertActionExecutable`：session 派生 schoolId/scope + lifecycle/kill-switch 判定；**自审**其拒绝。
 * 2) `resolvePluginTable` + `validateInsertPayload`：白名单形状/列/enum/跨租户判定；**不自审**，
 *    故本函数在白名单层抛 `PluginDataAccessError` 时补写一条 denied audit 再 rethrow（D-04）。
 */
async function deriveWriteContext(
  command: PluginDataWriteCommand,
  verb: PluginDataAccessVerb,
): Promise<DerivedWriteContext> {
  const pluginKey = command.payload.pluginKey;
  const tableName = command.payload.table;

  // 1) 前置治理门（自审拒绝；schoolId 绝不来自 payload）。
  const gate = await assertActionExecutable({
    actorId: command.actor.actorId,
    pluginKey,
    verb,
    correlationId: command.correlation.correlationId,
    commandId: command.id,
  });

  // 2) 白名单层（不自审）→ 失败时补写 denied audit。
  try {
    resolvePluginTable(pluginKey, tableName);
    const validatedValues = validateInsertPayload(pluginKey, tableName, command.payload.values);
    return { gate, tableName, validatedValues };
  } catch (cause) {
    if (cause instanceof PluginDataAccessError) {
      await writePluginDataAccessAudit({
        pluginId: gate.projectionRow.pluginId,
        schoolId: gate.schoolId,
        verb,
        decision: "denied",
        reasonCode: cause.reason,
        actorId: command.actor.actorId,
        actorScope: ACTOR_SCOPE,
        lifecycleState: gate.projectionRow.lifecycle.internalSubstate ?? "disabled",
        killSwitchEnabled: gate.projectionRow.lifecycle.killSwitchEnabled,
        correlationId: command.correlation.correlationId,
        commandId: command.id,
        payloadJson: { pluginKey, table: tableName, verb, stage: "allowlist" },
      });
    }
    throw cause;
  }
}

/** 写动词授权：跑双层派生（拒绝即抛 + 审计）；返回 void（bus 约定，仿 lesson-draft）。 */
async function authorizeWrite(command: PluginDataWriteCommand, verb: PluginDataAccessVerb): Promise<void> {
  await deriveWriteContext(command, verb);
}

/**
 * 写动词执行：再派生（成功路径不写 audit），开自有事务做 append-only/isLatest 写 + allowed audit。
 * `insert` 纯追加；`upsert` 先撤销旧 isLatest 再追加（append-only 历史保留）。
 */
async function executeWrite(
  input: ExecutionInput<PluginDataWriteCommand>,
  verb: PluginDataAccessVerb,
): Promise<ExecutionResult> {
  const { command } = input;
  const pluginKey = command.payload.pluginKey;

  const { gate, tableName, validatedValues } = await deriveWriteContext(command, verb);
  const table = resolvePluginTable(pluginKey, tableName);
  const cols = getTableColumns(table) as Record<string, SQLiteColumn>;
  const dedupeCols = resolveDedupeColumns(pluginKey, tableName);

  const written = await db.transaction(async (tx) => {
    // 逻辑键 = schoolId（鉴权闭包）+ 声明 uniques 列（取自已校验 values）。
    const keyConditions = [
      eq(cols.schoolId, gate.schoolId),
      ...dedupeCols.map((column) => eq(cols[column], validatedValues[column] as string | number | boolean | null)),
    ];
    const keyWhere = and(...keyConditions);

    // attemptNo = 同逻辑键既有最大值 + 1（两动词皆需，避免 unique(...,attemptNo) 冲突）。
    const prior = await tx
      .select({ attemptNo: cols.attemptNo })
      .from(table as never)
      .where(keyWhere)
      .orderBy(desc(cols.attemptNo))
      .limit(1);
    const attemptNo = (((prior[0] as { attemptNo?: number } | undefined)?.attemptNo) ?? 0) + 1;

    // upsert：撤销旧 isLatest（保留历史行）；insert：纯追加，不撤销。
    if (verb === "upsert") {
      await tx
        .update(table as never)
        .set({ isLatest: false } as never)
        .where(and(keyWhere, eq(cols.isLatest, true)));
    }

    const insertValues = {
      ...validatedValues,
      schoolId: gate.schoolId,
      pluginId: gate.projectionRow.pluginId,
      attemptNo,
      isLatest: true,
    };
    const inserted = (await tx
      .insert(table as never)
      .values(insertValues as never)
      .returning()) as Array<Record<string, unknown>>;

    // 成功审计与变更同事务原子提交（D-04）；回滚时 allowed audit 不残留。
    await writePluginDataAccessAudit({
      tx,
      pluginId: gate.projectionRow.pluginId,
      schoolId: gate.schoolId,
      verb,
      decision: "allowed",
      reasonCode: null,
      actorId: command.actor.actorId,
      actorScope: ACTOR_SCOPE,
      lifecycleState: gate.projectionRow.lifecycle.internalSubstate ?? "disabled",
      killSwitchEnabled: gate.projectionRow.lifecycle.killSwitchEnabled,
      correlationId: command.correlation.correlationId,
      commandId: command.id,
      payloadJson: { pluginKey, table: tableName, verb, attemptNo },
    });

    return { rowId: (inserted[0]?.id as string | undefined) ?? null, attemptNo };
  });

  return successResult(
    { table: tableName, verb, rowId: written.rowId, attemptNo: written.attemptNo, isLatest: true },
    [],
  );
}

export const pluginDataInsertHandler = {
  authorize: ({ command }) => authorizeWrite(command as PluginDataInsertCommand, "insert"),
  execute: (input) => executeWrite(input as ExecutionInput<PluginDataInsertCommand>, "insert"),
} satisfies Pick<PlatformCommandDefinition, "authorize" | "execute">;

export const pluginDataUpsertHandler = {
  authorize: ({ command }) => authorizeWrite(command as PluginDataUpsertCommand, "upsert"),
  execute: (input) => executeWrite(input as ExecutionInput<PluginDataUpsertCommand>, "upsert"),
} satisfies Pick<PlatformCommandDefinition, "authorize" | "execute">;
