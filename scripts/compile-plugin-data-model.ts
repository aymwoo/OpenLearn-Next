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
import { homeworkDataModel } from "../plugins/homework/data-model";
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
  { model: homeworkDataModel, source: "plugins/homework/data-model.ts" },
] as const;

const GENERATED_ROOT = path.join("src", "db", "schema", "generated");
const PLUGIN_OWNED_DIR = path.join(GENERATED_ROOT, "plugin-owned");

/**
 * 编译器固定注入、声明面不可表达的列名（D-11/隔离）。声明若重名一律跳过。
 *
 * 含 append-only 列 `attemptNo`/`isLatest`：这两列**仅对声明了 `uniques` 的去重表**注入
 * （见 `renderTable`），但无论是否注入，插件声明面都**不得**自表达它们 —— 入此 reserved
 * 集后，任何插件声明的同名列一律被过滤、永不可写（镜像 `taskSubmissions` 的 append-only 约定）。
 */
const RESERVED_COLUMNS = new Set([
  "id",
  "schoolId",
  "pluginId",
  "attemptNo",
  "isLatest",
  "createdAt",
  "updatedAt",
]);

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

  // D-11 append-only 判定：声明了 `uniques` 的表 = 去重/追加写表，注入 attemptNo/isLatest；
  // 无 `uniques` 的配置/参照表（如 plugin_owned_quiz_questions）不注入，保持原状。
  const isAppendOnly = (table.uniques?.length ?? 0) > 0;

  const declaredColumns = table.columns
    .filter((column) => !RESERVED_COLUMNS.has(column.name))
    .map(renderDeclaredColumn);

  // append-only 注入列：物理列序紧随声明列、在 createdAt/updatedAt 之前
  // （镜像 src/db/schema.ts `taskSubmissions`：attemptNo notNull 无默认、isLatest 默认 true）。
  const appendOnlyColumns = isAppendOnly
    ? [
        `    attemptNo: integer("attemptNo").notNull(),`,
        `    isLatest: integer("isLatest", { mode: "boolean" }).notNull().default(true),`,
      ]
    : [];

  const columnLines = [
    `    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),`,
    `    schoolId: text("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),`,
    `    pluginId: text("pluginId").notNull().references(() => pluginRegistrations.id, { onDelete: "cascade" }),`,
    ...declaredColumns,
    ...appendOnlyColumns,
    `    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),`,
    `    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),`,
  ];

  const indexLines = (table.indexes ?? []).map(
    (spec: ConstraintSpec) =>
      `    index(${JSON.stringify(constraintName(table.name, spec.columns, "idx"))}).on(${renderOn(spec.columns)}),`,
  );

  // D-11 append-only 物化：每个声明的去重键 spec 同时落两个约束，取代旧的「裸
  // uniqueIndex(去重键)」（后者物理上禁止 append-only 写）：
  //   - uniqueIndex(去重键 + attemptNo)  ——同一去重键可追加多次尝试，(去重键,attemptNo) 唯一；
  //   - index(去重键 + isLatest)          ——latest-lookup 物理性能索引。
  const uniqueLines = (table.uniques ?? []).flatMap((spec: ConstraintSpec) => {
    const attemptCols = [...spec.columns, "attemptNo"];
    const latestCols = [...spec.columns, "isLatest"];
    return [
      `    uniqueIndex(${JSON.stringify(constraintName(table.name, attemptCols, "unique"))}).on(${renderOn(attemptCols)}),`,
      `    index(${JSON.stringify(constraintName(table.name, latestCols, "idx"))}).on(${renderOn(latestCols)}),`,
    ];
  });

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
  // `index` 在以下任一情形需要：表声明了 indexes，或表声明了 uniques（后者物化出 isLatest 索引）。
  const hasIndex = tables.some(
    (table) => (table.indexes?.length ?? 0) > 0 || (table.uniques?.length ?? 0) > 0,
  );
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

/** 单表 → 数据访问白名单条目（D-06 派生自同一份声明源，无并行手写）。 */
type TableAccessEntry = {
  /** 全部物理列（含编译器固定注入的 reserved）；供消费层区分 unknown vs unindexed 列。 */
  columns: string[];
  /** 可写列：声明列去除 RESERVED_COLUMNS（schoolId 等永不接受入参）。 */
  insertableColumns: string[];
  /** 声明的复合索引列序（D-07：getByIndex 仅能命中这些列序）。 */
  indexes: string[][];
  /** 可 groupBy 列：非 reserved 标量声明列（D-05/D-07）。 */
  groupByColumns: string[];
  /** 声明的唯一约束列序；无则空数组。 */
  uniques: string[][];
  /** enum 列 → 命名值数组（ideal 路径冗余兜底 / 文档化合法集合）。 */
  enumColumns: Record<string, string[]>;
};

/**
 * 由已校验声明确定性派生单表白名单条目。
 *
 * 列序严格按声明顺序，不排序打乱，保证重编译零 diff（D-06）。`columns` 字段镜像
 * `renderTable` 的物理列序：固定注入 id/schoolId/pluginId → 声明非 reserved 列 →
 * （append-only 表）attemptNo/isLatest → createdAt/updatedAt。
 *
 * 注：`insertableColumns`/`groupByColumns`/`indexes`/`uniques` **不**含注入的 attemptNo/isLatest：
 *   - attemptNo/isLatest 为 reserved，插件永不可写（不入 insertable）、不可 groupBy；
 *   - `indexes` 只保留声明索引（注入的 isLatest 物理索引非 getByIndex 目标，D-07 语义不变）；
 *   - `uniques` 保留声明的逻辑去重键（不含 attemptNo），供写动作 supersede 逻辑使用。
 */
function buildTableAccessEntry(table: TableSpec): TableAccessEntry {
  const declared = table.columns.filter((column) => !RESERVED_COLUMNS.has(column.name));
  const isAppendOnly = (table.uniques?.length ?? 0) > 0;

  const columns = [
    "id",
    "schoolId",
    "pluginId",
    ...declared.map((column) => column.name),
    ...(isAppendOnly ? ["attemptNo", "isLatest"] : []),
    "createdAt",
    "updatedAt",
  ];

  const enumColumns: Record<string, string[]> = {};
  for (const column of declared) {
    if (column.type === "enum") {
      enumColumns[column.name] = [...(column.enumValues ?? [])];
    }
  }

  // Phase 74 decision A: `plugin_owned_quiz_questions.correctOption` is stored as free text
  // so ended-session recap fixtures can truthfully persist multi-type answers. Keep the
  // allowlist enum metadata absent for this column to match the physical/insert contract.

  return {
    columns,
    insertableColumns: declared.map((column) => column.name),
    indexes: (table.indexes ?? []).map((spec: ConstraintSpec) => [...spec.columns]),
    groupByColumns: declared.map((column) => column.name),
    uniques: (table.uniques ?? []).map((spec: ConstraintSpec) => [...spec.columns]),
    enumColumns,
  };
}

/**
 * 渲染 checked-in 数据访问白名单 const 文件（确定性、零漂移）。
 *
 * 用 `JSON.stringify(obj, null, 2)` 序列化按声明顺序插入的对象，键序/列序稳定；
 * 外层包 `export const ... = ... as const;`。绝不执行 SQL/DDL，仅 writeFileSync。
 */
function renderAccessAllowlist(
  allowlist: Record<string, Record<string, TableAccessEntry>>,
  sources: readonly string[],
): string {
  const sourceLine = [...sources].sort().join(", ");

  return [
    "// AUTO-GENERATED by scripts/compile-plugin-data-model.ts — DO NOT EDIT.",
    `// Source: ${sourceLine}`,
    "",
    `export const pluginDataAccessAllowlist = ${JSON.stringify(allowlist, null, 2)} as const;`,
    "",
  ].join("\n");
}

function main(): void {
  mkdirSync(PLUGIN_OWNED_DIR, { recursive: true });

  const emittedKeys: string[] = [];
  const accessAllowlist: Record<string, Record<string, TableAccessEntry>> = {};
  const accessSources: string[] = [];

  for (const { model, source } of MODELS) {
    // 二次校验：声明若非法，在 emit 前即抛错（→ 退出码 1）。编译器绝不信任声明。
    const validated = PluginDataModelSchema.parse(model);

    const fileContent = renderFile(source, validated.tables);
    writeFileSync(path.join(PLUGIN_OWNED_DIR, `${validated.pluginKey}.ts`), fileContent);
    emittedKeys.push(validated.pluginKey);

    // D-06：在生成 drizzle 片段的同时，确定性派生 checked-in 访问白名单（同源，无并行手写）。
    const tableEntries: Record<string, TableAccessEntry> = {};
    for (const table of validated.tables) {
      tableEntries[table.name] = buildTableAccessEntry(table);
    }
    accessAllowlist[validated.pluginKey] = tableEntries;
    accessSources.push(source);
  }

  writeFileSync(path.join(GENERATED_ROOT, "index.ts"), renderBarrel(emittedKeys));
  writeFileSync(
    path.join(PLUGIN_OWNED_DIR, "data-access-allowlist.ts"),
    renderAccessAllowlist(accessAllowlist, accessSources),
  );

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
