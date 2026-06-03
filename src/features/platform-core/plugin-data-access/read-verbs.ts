import "server-only";

import { and, count as countAgg, eq } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

import { db } from "@/db";
import type { PluginLifecycleState, RuntimeActorScope } from "@/features/runtime-platform/contracts/permissions";

import {
  assertGroupByAllowed,
  assertIndexAllowed,
  PluginDataAccessError,
  resolvePluginTable,
} from "./allowlist";
import { writePluginDataAccessAudit } from "./audit";

/**
 * 受治理**读动词**（Phase 68, ACCESS-01/ACCESS-03）—— `getByIndex` / `count` / `aggregate`。
 *
 * 不变式：
 * - **绝不**经 producer / Command Bus（D-03）：读半边无第二命令真相源，直连受治理 DAL。
 * - 每个查询强制 `eq(table.schoolId, 派生 schoolId)`；`schoolId` 永不接受入参覆盖（SC2/D-11）。
 *   调用方传入的派生 `schoolId` 来自 facade 的治理门（assertActionExecutable），`eq` 值映射
 *   一旦携带 `schoolId` 键即 `cross_school_rejected`。
 * - 表/列只能来自服务端白名单常量（D-06）：`getByIndex` 仅命中声明索引最左前缀（D-07）；
 *   `aggregate` 仅 `count` + 白名单 `groupBy` 列，**只**投影 `{key,count}`（D-05），不暴露
 *   任意聚合函数/额外列。
 * - 审计语义（D-04）：读成功**不**写审计；仅在白名单/越权 reject 时写一条 denied 审计。
 */

/** 租户 scope 键：`eq` 值映射永不接受此键（schoolId 仅由 session 派生注入）。 */
const TENANT_SCOPE_KEY = "schoolId";

/** facade 从治理门派生注入的审计上下文（read-verbs 自身不调治理门）。 */
export type ReadVerbAuditContext = {
  pluginId: string | null;
  actorId: string;
  actorScope: RuntimeActorScope;
  lifecycleState: PluginLifecycleState;
  killSwitchEnabled: boolean;
  correlationId: string;
};

type ReadVerb = "getByIndex" | "count" | "aggregate";

type ScalarValue = string | number | boolean | null;

/** 生成 drizzle 表的运行时可索引视图（列名 → Column）。 */
function columnsOf(table: SQLiteTable): Record<string, SQLiteColumn> {
  return table as unknown as Record<string, SQLiteColumn>;
}

/**
 * 在读路径上把白名单/越权拒因落为**一条** denied 审计后 rethrow（D-04）。
 * 非 PluginDataAccessError（如底层 DB 故障）原样抛出、不写读审计。
 */
async function runGuardedRead<T>(
  verb: ReadVerb,
  schoolId: string,
  pluginKey: string,
  tableName: string,
  audit: ReadVerbAuditContext,
  query: () => Promise<T>,
): Promise<T> {
  try {
    return await query();
  } catch (error) {
    if (error instanceof PluginDataAccessError) {
      await writePluginDataAccessAudit({
        pluginId: audit.pluginId,
        schoolId,
        verb,
        decision: "denied",
        reasonCode: error.reason,
        actorId: audit.actorId,
        actorScope: audit.actorScope,
        lifecycleState: audit.lifecycleState,
        killSwitchEnabled: audit.killSwitchEnabled,
        correlationId: audit.correlationId,
        commandId: null,
        payloadJson: { pluginKey, table: tableName, verb, stage: "read-verb" },
      });
    }
    throw error;
  }
}

/** `eq` 值映射携带租户键即越权（schoolId 仅 session 派生）。 */
function assertNoTenantKey(eqMap: Record<string, ScalarValue> | undefined): void {
  if (eqMap && Object.prototype.hasOwnProperty.call(eqMap, TENANT_SCOPE_KEY)) {
    throw new PluginDataAccessError(
      "cross_school_rejected",
      "eq 值映射不得携带 schoolId（scope 仅由 session 推导）",
    );
  }
}

/**
 * 由声明索引列序 + `eq` 值映射构建受治理等值谓词。
 * 强制 `eq(schoolId, 派生值)` 为首条；`schoolId` 之外的索引列取值于 `eq`，缺值即
 * `invalid_payload_rejected`（杜绝 `eq(col, undefined)`）。
 */
function buildIndexedConditions(
  table: SQLiteTable,
  schoolId: string,
  index: readonly string[],
  eqMap: Record<string, ScalarValue>,
) {
  const cols = columnsOf(table);
  const conditions = [eq(cols[TENANT_SCOPE_KEY], schoolId)];

  for (const column of index) {
    if (column === TENANT_SCOPE_KEY) continue;
    if (!Object.prototype.hasOwnProperty.call(eqMap, column)) {
      throw new PluginDataAccessError(
        "invalid_payload_rejected",
        `索引列缺少等值条件：${column}`,
      );
    }
    conditions.push(eq(cols[column], eqMap[column]));
  }

  return conditions;
}

/**
 * `getByIndex`：仅命中某条声明索引的最左前缀（D-07），返回本校匹配行。
 * 非索引列 → `unindexed_column_rejected`；未知列 → `unknown_column_rejected`；
 * `eq` 携带 schoolId → `cross_school_rejected`。
 */
export async function getByIndex(params: {
  schoolId: string;
  pluginKey: string;
  table: string;
  index: string[];
  eq: Record<string, ScalarValue>;
  audit: ReadVerbAuditContext;
}): Promise<Record<string, unknown>[]> {
  const { schoolId, pluginKey, table: tableName, index, eq: eqMap, audit } = params;

  return runGuardedRead("getByIndex", schoolId, pluginKey, tableName, audit, async () => {
    assertNoTenantKey(eqMap);
    assertIndexAllowed(pluginKey, tableName, index);
    const table = resolvePluginTable(pluginKey, tableName);
    const conditions = buildIndexedConditions(table, schoolId, index, eqMap);
    return db.select().from(table).where(and(...conditions));
  });
}

/**
 * `count`：本校行计数。可选 `index` + `eq` 施加白名单等值约束（同 getByIndex 校验）。
 * 始终强制 `eq(table.schoolId, 派生 schoolId)`。
 */
export async function count(params: {
  schoolId: string;
  pluginKey: string;
  table: string;
  index?: string[];
  eq?: Record<string, ScalarValue>;
  audit: ReadVerbAuditContext;
}): Promise<number> {
  const { schoolId, pluginKey, table: tableName, index, eq: eqMap, audit } = params;

  return runGuardedRead("count", schoolId, pluginKey, tableName, audit, async () => {
    assertNoTenantKey(eqMap);
    const table = resolvePluginTable(pluginKey, tableName);
    const cols = columnsOf(table);

    let conditions = [eq(cols[TENANT_SCOPE_KEY], schoolId)];
    if (index && index.length > 0) {
      assertIndexAllowed(pluginKey, tableName, index);
      conditions = buildIndexedConditions(table, schoolId, index, eqMap ?? {});
    }

    const rows = await db.select({ value: countAgg() }).from(table).where(and(...conditions));
    return Number(rows[0]?.value ?? 0);
  });
}

/**
 * `aggregate`（D-05 命名聚合）：仅 `count` + 白名单 `groupBy` 列，投影**只**含 `{key,count}`。
 * `groupBy` 非白名单/reserved 列 → `unknown_column_rejected`。强制本校 `eq(schoolId)`。
 */
export async function aggregate(params: {
  schoolId: string;
  pluginKey: string;
  table: string;
  groupBy: string;
  audit: ReadVerbAuditContext;
}): Promise<Array<{ key: unknown; count: number }>> {
  const { schoolId, pluginKey, table: tableName, groupBy, audit } = params;

  return runGuardedRead("aggregate", schoolId, pluginKey, tableName, audit, async () => {
    assertGroupByAllowed(pluginKey, tableName, groupBy);
    const table = resolvePluginTable(pluginKey, tableName);
    const cols = columnsOf(table);

    const rows = await db
      .select({ key: cols[groupBy], count: countAgg() })
      .from(table)
      .where(eq(cols[TENANT_SCOPE_KEY], schoolId))
      .groupBy(cols[groupBy]);

    // 只投影 {key,count}，杜绝任意列泄露。
    return rows.map((row) => ({ key: row.key, count: Number(row.count) }));
  });
}
