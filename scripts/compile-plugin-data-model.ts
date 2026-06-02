/**
 * 声明式 `dataModel` 编译器（Phase 67, DATA-02 / DATA-03）—— 「compile, don't execute」。
 *
 * 该脚本是 `pnpm plugin:compile` 的目标（裸 tsx，**无** `import "server-only"`）。
 * 它读取受信前已声明的 quiz `dataModel`，用 67-01 的 `PluginDataModelSchema`
 * **二次校验**，再把声明**确定性**翻译成受治理的 Drizzle `sqliteTable` 片段，写入
 * `src/db/schema/generated/`。
 *
 * 安全红线（与 67 威胁模型对齐）：
 *   - 编译器**绝不**执行任何 SQL/DDL：只 `writeFileSync` TS 片段；物理 DDL 仅能由
 *     drizzle-kit 写进白名单 `drizzle/`（T-67-06）。
 *   - `id`/`schoolId`/`pluginId` FK **固定注入**，声明面无法表达跨界 FK（T-67-07）。
 *   - 生成确定性 → 重编译 `git diff --exit-code src/db/schema/generated` 干净（T-67-08）。
 *
 * 注：本 phase 仅 quiz；`MODELS` 结构上为 Phase 68+ 多插件预留，但不抽象过度。
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { quizDataModel } from "../plugins/quiz-sample/data-model";
import {
  PluginDataModelSchema,
  type ColumnSpec,
  type TableSpec,
} from "../src/lib/dto/plugin-data-model";

/** 约束声明形态（index/unique 均为列引用集合）；67-01 未导出具名类型，此处局部声明。 */
type ConstraintSpec = { columns: string[] };

/** 待编译声明清单（model + 真实源文件路径，供生成头部如实标注 Source）。 */
const MODELS = [
  { model: quizDataModel, source: "plugins/quiz-sample/data-model.ts" },
] as const;

const GENERATED_ROOT = path.join("src", "db", "schema", "generated");
const PLUGIN_OWNED_DIR = path.join(GENERATED_ROOT, "plugin-owned");

/** 编译器固定注入、声明面不可表达的列名（D-11/隔离）。声明若重名一律跳过。 */
const RESERVED_COLUMNS = new Set(["id", "schoolId", "pluginId", "createdAt", "updatedAt"]);

/** snake/kebab 表名 → camelCase 导出标识符（`plugin_owned_quiz_questions` → `pluginOwnedQuizQuestions`）。 */
function toCamelCase(name: string): string {
  return name
    .split(/[_-]/)
    .filter(Boolean)
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join("");
}

/** D-01 列类型白名单 → Drizzle DSL 构造表达式（不含 `.notNull()`/`.default()` 修饰）。 */
function renderTypeExpr(column: ColumnSpec): string {
  const name = JSON.stringify(column.name);

  switch (column.type) {
    case "text":
      return `text(${name})`;
    case "integer":
      return `integer(${name})`;
    case "boolean":
      return `integer(${name}, { mode: "boolean" })`;
    case "timestamp":
      return `integer(${name}, { mode: "timestamp_ms" })`;
    case "enum": {
      const values = (column.enumValues ?? []).map((value) => JSON.stringify(value)).join(", ");
      return `text(${name}, { enum: [${values}] })`;
    }
  }
}

/** 单个声明列 → 对象属性行（含缩进、`.notNull()`、可选 `.default()`）。 */
function renderDeclaredColumn(column: ColumnSpec): string {
  let expr = renderTypeExpr(column);

  if (column.notNull) {
    expr += ".notNull()";
  }

  if (column.default !== undefined) {
    const literal =
      typeof column.default === "string" ? JSON.stringify(column.default) : String(column.default);
    expr += `.default(${literal})`;
  }

  return `    ${column.name}: ${expr},`;
}

/** 确定性约束命名：`<table>_<col1>_<col2>..._<suffix>`。 */
function constraintName(tableName: string, columns: readonly string[], suffix: string): string {
  return `${tableName}_${columns.join("_")}_${suffix}`;
}

/** 约束列引用：`table.col1, table.col2, ...`。 */
function renderOn(columns: readonly string[]): string {
  return columns.map((column) => `table.${column}`).join(", ");
}

/** 单表声明 → 完整 `sqliteTable(...)` 片段字符串（固定注入 + 声明列 + D-12 索引/唯一）。 */
function renderTable(table: TableSpec): string {
  const exportName = toCamelCase(table.name);

  const declaredColumns = table.columns
    .filter((column) => !RESERVED_COLUMNS.has(column.name))
    .map(renderDeclaredColumn);

  const columnLines = [
    `    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),`,
    `    schoolId: text("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),`,
    `    pluginId: text("pluginId").notNull().references(() => pluginRegistrations.id, { onDelete: "cascade" }),`,
    ...declaredColumns,
    `    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),`,
    `    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),`,
  ];

  const indexLines = (table.indexes ?? []).map(
    (spec: ConstraintSpec) =>
      `    index(${JSON.stringify(constraintName(table.name, spec.columns, "idx"))}).on(${renderOn(spec.columns)}),`,
  );

  const uniqueLines = (table.uniques ?? []).map(
    (spec: ConstraintSpec) =>
      `    uniqueIndex(${JSON.stringify(constraintName(table.name, spec.columns, "unique"))}).on(${renderOn(spec.columns)}),`,
  );

  return [
    `export const ${exportName} = sqliteTable(`,
    `  ${JSON.stringify(table.name)},`,
    `  {`,
    ...columnLines,
    `  },`,
    `  (table) => [`,
    ...indexLines,
    ...uniqueLines,
    `  ],`,
    `);`,
  ].join("\n");
}

/** 整文件渲染：固定头 + 按需 import + 表片段（表间空行分隔，尾随换行确保字节稳定）。 */
function renderFile(source: string, tables: readonly TableSpec[]): string {
  const hasIndex = tables.some((table) => (table.indexes?.length ?? 0) > 0);
  const hasUnique = tables.some((table) => (table.uniques?.length ?? 0) > 0);

  const imports = [
    "sqliteTable",
    "text",
    "integer",
    ...(hasIndex ? ["index"] : []),
    ...(hasUnique ? ["uniqueIndex"] : []),
  ];

  const lines: string[] = [
    "// AUTO-GENERATED by scripts/compile-plugin-data-model.ts — DO NOT EDIT.",
    `// Source: ${source}`,
    "",
    `import { ${imports.join(", ")} } from "drizzle-orm/sqlite-core";`,
    `import { schools, pluginRegistrations } from "../../../schema";`,
    "",
  ];

  tables.forEach((table, index) => {
    if (index > 0) {
      lines.push("");
    }
    lines.push(...renderTable(table).split("\n"));
  });

  lines.push("");

  return lines.join("\n");
}

/** Barrel：按文件名排序的确定性 `export *`，让 drizzle-kit 经 schema.ts 看见全部生成表。 */
function renderBarrel(pluginKeys: readonly string[]): string {
  const sorted = [...pluginKeys].sort();

  return [
    "// AUTO-GENERATED by scripts/compile-plugin-data-model.ts — DO NOT EDIT.",
    "",
    ...sorted.map((key) => `export * from "./plugin-owned/${key}";`),
    "",
  ].join("\n");
}

function main(): void {
  mkdirSync(PLUGIN_OWNED_DIR, { recursive: true });

  const emittedKeys: string[] = [];

  for (const { model, source } of MODELS) {
    // 二次校验：声明若非法，在 emit 前即抛错（→ 退出码 1）。编译器绝不信任声明。
    const validated = PluginDataModelSchema.parse(model);

    const fileContent = renderFile(source, validated.tables);
    writeFileSync(path.join(PLUGIN_OWNED_DIR, `${validated.pluginKey}.ts`), fileContent);
    emittedKeys.push(validated.pluginKey);
  }

  writeFileSync(path.join(GENERATED_ROOT, "index.ts"), renderBarrel(emittedKeys));

  console.log(
    `[compile-plugin-data-model] 已编译 ${emittedKeys.length} 个插件 dataModel：${[...emittedKeys].sort().join(", ")}`,
  );
}

try {
  main();
} catch (error) {
  console.error("[compile-plugin-data-model] 校验/生成失败：", error);
  process.exit(1);
}
