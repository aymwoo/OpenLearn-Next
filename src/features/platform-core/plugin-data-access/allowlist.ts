import "server-only";

import { getTableName, is, Table } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";

import { pluginDataAccessAllowlist } from "@/db/schema/generated/plugin-owned/data-access-allowlist";
import * as generatedTables from "@/db/schema/generated";

/**
 * 受治理数据访问的**白名单消费层**（Phase 68, ACCESS-01/ACCESS-02）。
 *
 * 单一职责：对任意 verb 输入做"形状/白名单"判定——表/列/索引/groupBy/payload 合法性，
 * 失败抛**具名拒因**。本层：
 *   - **只读** Task 2 编译期派生的 `pluginDataAccessAllowlist` 与生成 drizzle 表，
 *     **零硬编码**表名/列名白名单（D-06 单一真相源）；
 *   - **不**写 audit、**不**做 lifecycle/kill-switch 判定（交给 Plan 02 的治理 gate）；
 *   - 让"灵活查询=注入面"从根上不可表达：表/列只能来自服务端常量（Pitfall #6）。
 *
 * A1 spike 结论（68-01 Task 1）：drizzle-zod 在 zod v4 下对 `text(col,{enum})` 走 **ideal**
 * 路径（派生 `z.enum`），故 `validateInsertPayload` 直接信任 createInsertSchema 的 enum 派生；
 * 但 createInsertSchema 默认**剥离**未知字段，故此处对 picked schema 施加 `.strict()` 以把
 * 多余字段判为 `invalid_payload_rejected`。
 */

/**
 * 具名拒因常量（D-08 七类形状拒因 + 三类治理拒因）。
 * 治理三类（lifecycle/kill_switch/non_school_actor）在本层声明、由 Plan 02 gate 实际抛出。
 */
export const PLUGIN_DATA_ACCESS_REASONS = [
  "raw_sql_rejected",
  "free_where_rejected",
  "unknown_column_rejected",
  "unknown_table_rejected",
  "cross_school_rejected",
  "invalid_payload_rejected",
  "unindexed_column_rejected",
  "lifecycle_not_executable",
  "kill_switch_rejected",
  "non_school_actor_rejected",
] as const;

export type PluginDataAccessReason = (typeof PLUGIN_DATA_ACCESS_REASONS)[number];

/** 受治理数据访问拒绝：携带具名 `reason`，供上层映射 audit/HTTP 状态。 */
export class PluginDataAccessError extends Error {
  constructor(
    public readonly reason: PluginDataAccessReason,
    message?: string,
  ) {
    super(message ?? reason);
    this.name = "PluginDataAccessError";
  }
}

/**
 * 租户 scope 列：payload 永不接受此键（schoolId 仅由 session 推导，SC2/D-11）。
 * 这是**策略常量**而非表/列白名单——白名单仍只来自生成 const。
 */
const TENANT_SCOPE_KEY = "schoolId";

// DDL/原始 SQL 探针：命中 DDL 关键字或语句分隔/注释符即视为注入面。
// （此处用 // 行注释而非块注释：zero-runtime-DDL 静态闸门会剥离行注释，
//  避免本探针的检测式正则被误判为运行时 DDL。）
const RAW_SQL_PROBE = /\b(CREATE|ALTER|DROP)\b|;|--/i;

/** 白名单条目形态（镜像 Task 2 生成结构，运行时只读）。 */
type TableAccessEntry = {
  columns: readonly string[];
  insertableColumns: readonly string[];
  indexes: readonly (readonly string[])[];
  groupByColumns: readonly string[];
  uniques: readonly (readonly string[])[];
  enumColumns: Readonly<Record<string, readonly string[]>>;
};

/** 生成 const 的运行时可索引视图（`as const` 字面类型 → 宽松索引）。 */
const allowlist = pluginDataAccessAllowlist as unknown as Record<
  string,
  Record<string, TableAccessEntry>
>;

const PLUGIN_DATA_ACCESS_ALIASES = {
  "builtin-teaching-step-quiz-sample": "quiz",
  "builtin-teaching-step-homework": "homework",
} as const satisfies Record<string, string>;

function resolveAllowlistPluginKey(pluginKey: string) {
  return PLUGIN_DATA_ACCESS_ALIASES[pluginKey as keyof typeof PLUGIN_DATA_ACCESS_ALIASES] ?? pluginKey;
}

/**
 * 生成 drizzle 表注册表：`物理表名 → SQLiteTable`，经 `getTableName` 反射构建，
 * **不**硬编码任何字面表名（满足"零硬编码白名单"）。
 */
const tablesByPhysicalName: ReadonlyMap<string, SQLiteTable> = (() => {
  const map = new Map<string, SQLiteTable>();
  for (const value of Object.values(generatedTables)) {
    if (is(value, Table)) {
      map.set(getTableName(value), value as SQLiteTable);
    }
  }
  return map;
})();

/** 取白名单条目；插件/表未声明 → `unknown_table_rejected`。 */
function getAccessEntry(pluginKey: string, tableName: string): TableAccessEntry {
  const resolvedPluginKey = resolveAllowlistPluginKey(pluginKey);
  const entry = allowlist[resolvedPluginKey]?.[tableName];
  if (!entry) {
    throw new PluginDataAccessError(
      "unknown_table_rejected",
      `表未在白名单声明：${pluginKey}/${tableName}`,
    );
  }
  return entry;
}

/** 解析受治理表 → 生成 drizzle 表对象；未知插件/表/未注册 → `unknown_table_rejected`。 */
export function resolvePluginTable(pluginKey: string, tableName: string): SQLiteTable {
  getAccessEntry(pluginKey, tableName);
  const table = tablesByPhysicalName.get(tableName);
  if (!table) {
    throw new PluginDataAccessError(
      "unknown_table_rejected",
      `生成表未注册：${pluginKey}/${tableName}`,
    );
  }
  return table;
}

/**
 * 校验 getByIndex 列序：必须是某条声明索引的**最左前缀**（D-07）。
 * 列不存在 → `unknown_column_rejected`；列存在但非任何索引前缀 → `unindexed_column_rejected`。
 */
export function assertIndexAllowed(
  pluginKey: string,
  tableName: string,
  columns: readonly string[],
): void {
  const entry = getAccessEntry(pluginKey, tableName);

  for (const column of columns) {
    if (!entry.columns.includes(column)) {
      throw new PluginDataAccessError(
        "unknown_column_rejected",
        `列不存在于表 ${tableName}：${column}`,
      );
    }
  }

  const isPrefixOfSomeIndex = entry.indexes.some((index) => {
    if (columns.length === 0 || columns.length > index.length) return false;
    return columns.every((column, position) => index[position] === column);
  });

  if (!isPrefixOfSomeIndex) {
    throw new PluginDataAccessError(
      "unindexed_column_rejected",
      `列序非任何声明索引的最左前缀：${columns.join(",")}`,
    );
  }
}

/**
 * 校验 groupBy 列：必须是 `groupByColumns`（非 reserved 标量列）成员（D-05/D-07）。
 * reserved 列与未知列均 → `unknown_column_rejected`（reserved 不在 groupByColumns 中）。
 */
export function assertGroupByAllowed(
  pluginKey: string,
  tableName: string,
  column: string,
): void {
  const entry = getAccessEntry(pluginKey, tableName);
  if (!entry.groupByColumns.includes(column)) {
    throw new PluginDataAccessError(
      "unknown_column_rejected",
      `列不可用于 groupBy：${tableName}.${column}`,
    );
  }
}

/** 递归扫描任意值中的字符串，命中原始 SQL/DDL 探针即抛 `raw_sql_rejected`。 */
function assertNoRawSql(value: unknown): void {
  if (typeof value === "string") {
    if (RAW_SQL_PROBE.test(value)) {
      throw new PluginDataAccessError("raw_sql_rejected", "值命中原始 SQL/DDL 探针");
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) assertNoRawSql(item);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) assertNoRawSql(item);
  }
}

/**
 * 校验 insert payload（D-08）。判定顺序：raw SQL → 自由 where → 跨租户 → drizzle-zod 形状。
 *   - 任意值含原始 SQL/DDL → `raw_sql_rejected`；
 *   - 任意值为对象/数组（自由 where 偷渡，insert payload 必须扁平标量）→ `free_where_rejected`；
 *   - 含 `schoolId` 键 → `cross_school_rejected`（scope 仅由 session 注入）；
 *   - 多余字段/类型错/enum 越界 → `invalid_payload_rejected`。
 * 返回经 drizzle-zod（ideal enum 派生）+ `.strict()` 校验后的 payload。
 */
export function validateInsertPayload(
  pluginKey: string,
  tableName: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const table = resolvePluginTable(pluginKey, tableName);
  const entry = getAccessEntry(pluginKey, tableName);

  assertNoRawSql(payload);

  for (const value of Object.values(payload)) {
    if (value !== null && typeof value === "object") {
      throw new PluginDataAccessError(
        "free_where_rejected",
        "insert payload 仅接受扁平标量值（拒自由 where 对象）",
      );
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, TENANT_SCOPE_KEY)) {
    throw new PluginDataAccessError(
      "cross_school_rejected",
      "payload 不得携带 schoolId（scope 仅由 session 推导）",
    );
  }

  const mask: Record<string, true> = Object.fromEntries(
    entry.insertableColumns.map((column) => [column, true as const]),
  );
  const insertSchema = (
    createInsertSchema(table) as unknown as {
      pick: (m: Record<string, true>) => { strict: () => { safeParse: (v: unknown) => { success: boolean; data?: unknown } } };
    }
  )
    .pick(mask)
    .strict();

  const result = insertSchema.safeParse(payload);
  if (!result.success) {
    throw new PluginDataAccessError("invalid_payload_rejected", "payload 不符合受治理表形状");
  }

  return result.data as Record<string, unknown>;
}

export function resolvePluginDataAccessAlias(pluginKey: string): string {
  return resolveAllowlistPluginKey(pluginKey);
}
