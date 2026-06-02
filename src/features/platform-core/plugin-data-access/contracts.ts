import { z } from "zod";

import { PLUGIN_DATA_ACCESS_REASONS } from "./allowlist";

/**
 * 受治理数据访问的动词级输入契约（D-01 五动词判别联合）。
 *
 * 关键约束（SC1 / D-11）：所有 verb 的 input schema **都不含**租户键、自由谓词或原始
 * 语句字段——也就是说，注入面（tenant 列 / 自由 predicate / raw 语句）在类型层就不可表达。
 * 租户归属由治理门从认证 session 派生注入（见 governance-gate.ts），调用方无从覆盖。
 */

/** 受治理动词只接受标量等值条件，杜绝自由谓词树/子查询表达。 */
const PluginDataAccessScalarSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

/** 等值匹配映射：列名 → 标量值（仅允许 AND 等值，禁止表达自由谓词）。 */
const PluginDataAccessEqSchema = z.record(z.string(), PluginDataAccessScalarSchema);

/** 各动词共享的基础面：操作者 + 目标插件 + 目标表（租户键由治理门注入，不在此）。 */
const PluginDataAccessBaseShape = {
  actor: z.string().min(1),
  pluginKey: z.string().min(1),
  table: z.string().min(1),
} as const;

export const PluginDataAccessInputSchema = z.discriminatedUnion("verb", [
  z.object({
    ...PluginDataAccessBaseShape,
    verb: z.literal("insert"),
    values: z.record(z.string(), z.unknown()),
  }),
  z.object({
    ...PluginDataAccessBaseShape,
    verb: z.literal("upsert"),
    values: z.record(z.string(), z.unknown()),
  }),
  z.object({
    ...PluginDataAccessBaseShape,
    verb: z.literal("getByIndex"),
    index: z.array(z.string().min(1)),
    eq: PluginDataAccessEqSchema,
  }),
  z.object({
    ...PluginDataAccessBaseShape,
    verb: z.literal("count"),
    index: z.array(z.string().min(1)).optional(),
    eq: PluginDataAccessEqSchema.optional(),
  }),
  z.object({
    ...PluginDataAccessBaseShape,
    verb: z.literal("aggregate"),
    groupBy: z.string().min(1),
  }),
]);

export type PluginDataAccessInput = z.infer<typeof PluginDataAccessInputSchema>;

/** 受治理动词集合（判别字面量）。 */
export type PluginDataAccessVerb = PluginDataAccessInput["verb"];

/**
 * 拒因类型从 Plan 01 的 allowlist 单一真相源派生，绝不在此重新声明拒因数组
 * （避免第二真相源）。
 */
export type PluginDataAccessReason = (typeof PLUGIN_DATA_ACCESS_REASONS)[number];
