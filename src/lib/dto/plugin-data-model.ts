import { z } from "zod";

/**
 * 声明式 `dataModel` 契约 meta-schema（Phase 67, DATA-01）。
 *
 * 该模块刻意置于最低层 `src/lib/dto`，是**纯 DTO**（不引入服务端专属边界标记）：
 * 既能被 Phase 2 的编译器（`scripts/compile-plugin-data-model.ts`）消费，又能被
 * vitest 秒级直跑，无 DB、无服务端边界、无运行时 schema 引擎。
 *
 * 它是「compile, don't execute」流水线的**唯一安全边界** —— 不可信的插件
 * `dataModel` 声明在进入受治理建表链路之前，必须在此被结构化校验，拒绝：
 *   - 裸 SQL/DDL 字符串偷渡（T-67-01 → `RAW_SQL_FORBIDDEN`）；
 *   - 缺命名空间前缀的表名（T-67-02 → `MISSING_OWNED_PREFIX`）；
 *   - 向 core 表的出向 FK（T-67-03 → `.strict()` 的 `unrecognized_keys`）；
 *   - 缺 schoolId 租户 scope（T-67-04 → `MISSING_SCHOOL_SCOPE`）；
 *   - json/blob 等非结构化列类型（T-67-05 → `INVALID_COLUMN_TYPE`）。
 *
 * 复用 `resource-ai.ts` 的 `PluginManifestSchema` superRefine 范式与
 * `draft-guardrails.ts` 的 UPPER_SNAKE 拒因常量风格。
 */

/** D-01 标量列类型白名单；`json`/`blob` 不在内，z.enum 边界即拒（= 负样本#5）。 */
export const COLUMN_TYPES = ["text", "integer", "boolean", "timestamp", "enum"] as const;

/** D-10 受治理表命名空间前缀。 */
export const OWNED_TABLE_PREFIX = "plugin_owned_";

/**
 * 具名拒因常量（顺序固定，供测试逐一断言）。
 *
 * **[设计注记]** 5 类非法中「FK-to-core」(#3) 刻意**不**进本数组 —— 它由每层
 * `.strict()`（`z.strictObject`）的 `unrecognized_keys` 把守，测试断言 `issue.code`，
 * 而非具名 message。请勿误以为此处漏列一个具名拒因。
 */
export const PLUGIN_DATA_MODEL_REASONS = [
  "INVALID_COLUMN_TYPE",
  "MISSING_OWNED_PREFIX",
  "RAW_SQL_FORBIDDEN",
  "MISSING_SCHOOL_SCOPE",
  "ENUM_REQUIRES_VALUES",
] as const;

export type PluginDataModelReason = (typeof PLUGIN_DATA_MODEL_REASONS)[number];

/** 标识符约定：小写字母起头的 snake/camel 安全名。 */
const IDENTIFIER = /^[a-z][a-zA-Z0-9_]*$/;

/** DDL 关键字探针：命中即视为裸 SQL/DDL 偷渡。 */
const DDL_KEYWORDS = /\b(CREATE|ALTER|DROP)\b/i;

/** 单列声明：强制 `{ type, notNull }`；enum 须带命名 values 数组（D-03）。 */
const ColumnSpecSchema = z
  .strictObject({
    name: z.string().regex(IDENTIFIER),
    type: z.enum(COLUMN_TYPES, { error: () => "INVALID_COLUMN_TYPE" }),
    notNull: z.boolean(),
    default: z.union([z.string(), z.number(), z.boolean()]).optional(),
    enumValues: z.array(z.string()).min(1).optional(),
  })
  .superRefine((column, ctx) => {
    if (column.type === "enum" && !column.enumValues) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ENUM_REQUIRES_VALUES",
        path: ["enumValues"],
      });
    }
  });

/** 声明式约束（index / unique）：列引用集合，悬空列由 table superRefine 校验。 */
const ConstraintSpecSchema = z
  .strictObject({
    columns: z.array(z.string()).min(1),
  });

/** 单表声明：前缀、schoolId scope、DDL 探测、约束列存在性均在此把守。 */
const TableSpecSchema = z
  .strictObject({
    // CR-01：表名必须过 IDENTIFIER 正则。编译器以 `export const ${toCamelCase(name)} =
    // sqliteTable(` 直出 TS，未经此约束的表名（带 plugin_owned_ 前缀且不含 DDL 关键字）
    // 可偷渡任意可执行代码并躲过 zero-DDL grep，构成编译期 TS 代码注入。与列名同源把守。
    name: z.string().regex(IDENTIFIER),
    columns: z.array(ColumnSpecSchema).min(1),
    indexes: z.array(ConstraintSpecSchema).optional(),
    uniques: z.array(ConstraintSpecSchema).optional(),
  })
  .superRefine((table, ctx) => {
    // D-10：表名命名空间前缀（负样本#2）。
    if (!table.name.startsWith(OWNED_TABLE_PREFIX)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MISSING_OWNED_PREFIX",
        path: ["name"],
      });
    }

    // D-11：强制 schoolId 租户 scope 且 notNull（负样本#4）。
    const schoolScope = table.columns.find((c) => c.name === "schoolId");
    if (!schoolScope || !schoolScope.notNull) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MISSING_SCHOOL_SCOPE",
        path: ["columns"],
      });
    }

    // T-67-01：扫该表所有字符串值，命中 DDL 关键字即拒（负样本#1）。
    if (DDL_KEYWORDS.test(JSON.stringify(table))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RAW_SQL_FORBIDDEN",
        path: ["name"],
      });
    }

    // 约束引用的列必须存在于本表 columns（防悬空列引用）。
    const columnNames = new Set(table.columns.map((c) => c.name));
    const constraints = [...(table.indexes ?? []), ...(table.uniques ?? [])];
    for (const constraint of constraints) {
      for (const col of constraint.columns) {
        if (!columnNames.has(col)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "UNKNOWN_CONSTRAINT_COLUMN",
            path: ["columns"],
          });
        }
      }
    }
  });

/**
 * 顶层声明式 dataModel 契约。
 *
 * 声明面**不允许**任何 `foreignKeys`/`references` 字段 —— `z.strictObject` 自动以
 * `unrecognized_keys` 拒（负样本#3）。schoolId→schools / pluginId→pluginRegistrations
 * 的 FK 由编译器固定输出，不在声明面表达（D-11）。
 */
export const PluginDataModelSchema = z.strictObject({
  pluginKey: z.string().regex(IDENTIFIER),
  tables: z.array(TableSpecSchema).min(1),
});

export const QuestionTypeSchema = z.enum(["single_choice", "multi_choice", "true_false", "fill_blank", "ordering"]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export type ColumnSpec = z.infer<typeof ColumnSpecSchema>;
export type TableSpec = z.infer<typeof TableSpecSchema>;
export type PluginDataModel = z.infer<typeof PluginDataModelSchema>;
