# Phase 67: Declarative Plugin-Owned Data Model & Migration-Proof - Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 10 new/modified files
**Analogs found:** 9 / 10（仅 `generated/index.ts` barrel 无逐字 analog，但有等价 re-export 范式）

> 说明：narrative 用中文，代码/标识符保持英文。所有 analog 路径行号均经本仓库实证（非盲信 RESEARCH.md）。已核对并修正 RESEARCH 的一处偏差：零-DDL 闸门白名单**真实迁移目录是 `drizzle/`**（`drizzle.config.ts:5 out:'./drizzle'`、`scripts/lib/sqlite-migration-proof.ts:14` 读 `drizzle/meta/_journal.json`），CONTEXT/RESEARCH 写的 `src/db/migrations/**` 在仓库**不存在**——以 `drizzle/**` 为准。

---

## File Classification

| New/Modified file (Phase 67) | Role | Data Flow | Closest analog (path:line) | Match quality |
|------------------------------|------|-----------|----------------------------|---------------|
| `src/lib/dto/plugin-data-model.ts` | DTO / Zod meta-schema | transform / validate | `src/lib/dto/resource-ai.ts:671` (`PluginManifestSchema`) + `src/lib/dto/draft-guardrails.ts` (reason-code) | exact (role+flow) |
| `src/lib/dto/plugin-data-model.test.ts` | test (unit / negative samples) | request-response | `src/lib/dto/draft-guardrails.test.ts:1-43` | exact |
| `src/db/schema/generated/plugin-owned/<pluginKey>.ts` | model (Drizzle table, codegen 产物) | CRUD / append-only | `src/db/schema.ts:1883` (`pluginOwnedBusinessData`) + `:709` (`quizAttempts`, append-only) | exact |
| `src/db/schema/generated/index.ts` | barrel / config | re-export | `src/db/schema.ts` 顶层 `export const` 聚合面 + RESEARCH D-05 `export *` | partial（无逐字 analog） |
| `scripts/compile-plugin-data-model.ts` | utility / codegen (`pnpm plugin:compile`) | file-I/O (read decl → write .ts) | `scripts/prepare-dev-db.ts:1-59`（node:fs 读 + journal 解析骨架）+ verify-script header 范式 | role-match（无 codegen analog） |
| `scripts/gate-no-runtime-ddl.ts` | verify / static gate | batch scan | `scripts/verify-phase45-plugin-schema.ts:57-64`（`execFileSync` + exit code）+ `:276-356`（static-check 块） | role-match |
| `scripts/verify-phase67-plugin-owned-data.ts` | verify (close-gate) | integration (PRAGMA assert) | `scripts/verify-phase45-plugin-schema.ts`（**逐字 clone**，改断言数组）| exact |
| `src/db/schema.ts`（改：加 `dataVersion` 列 + 末尾 barrel） | model (手写区改 1 列 + 1 行 re-export) | — | `src/db/schema.ts:1241-1264`（`pluginRegistrations` 块）| exact (in-file) |
| `drizzle/NNNN_phase67_*.sql` + `meta/_journal.json` | migration | — | `drizzle/0000_*.sql` 格式 + `drizzle-kit generate` 自动产出（**人不手写/不手命名**）| exact（工具产出） |
| `package.json`（加 `db:generate`/`plugin:compile`，改 `verify:phase` 别名）| config | — | `package.json:46-65`（`verify:phaseNN` + `verify:phase` 别名 + `db:migrate`）| exact |

---

## Pattern Assignments

### `src/lib/dto/plugin-data-model.ts`（DTO meta-schema）

**Analog A — Zod superRefine 范式：** `src/lib/dto/resource-ai.ts:671-691`
```typescript
// 文件头：纯 import { z } from "zod"，无 server-only（DTO 层一律可在 node 脚本/vitest 直跑）
import { z } from "zod";

export const PluginManifestSchema = z.object({
  id: z.string(),
  version: z.string(),
  manifestVersion: z.literal(1).or(z.literal(2)).default(1),
  // ...
}).superRefine((manifest, ctx) => {
  if (manifest.manifestVersion === 2 && !manifest.governance) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "manifest v2 requires governance metadata",   // ← 拒因即 message 常量
      path: ["governance"],
    });
  }
});
export type PluginManifest = z.infer<typeof PluginManifestSchema>;
```
**抄什么：** ① 顶部 `import { z } from "zod"`（DTO 层零 server-only，便于 vitest/脚本直跑）；② `z.object({...}).superRefine((val, ctx) => ctx.addIssue({ code: z.ZodIssueCode.custom, message, path }))` 做跨字段校验；③ 每个 schema 后紧跟 `export type X = z.infer<typeof XSchema>`；④ 枚举集合用 `z.enum([...] as const)`（见 `resource-ai.ts:23,26`）。Phase 67 的 5 类拒因常量（`INVALID_COLUMN_TYPE` / `MISSING_OWNED_PREFIX` / `RAW_SQL_FORBIDDEN` / `MISSING_SCHOOL_SCOPE` / strict-unknown-key）即沿用此 `message` 字符串模式。

**Analog B — 稳定的 reason-code 枚举 + 自定义 Rejection（可选加固）：** `src/lib/dto/draft-guardrails.ts`（被 `draft-guardrails.test.ts` 断言）
- `GuardrailReasonCodeSchema` 是 `z.enum([...])`，测试断言 `.options` 顺序固定；
- `DraftGuardrailRejection extends Error`，message 前缀 `DRAFT_GUARDRAIL_REJECTED:<code>`，且**只携带 reasonCode + 元字段、绝无 payload/*Json**（PII 安全）。
- Phase 67 若需抛错而非返回 ZodError，照此建 `PluginDataModelRejection`，前缀如 `PLUGIN_DATA_MODEL_REJECTED:<code>`，禁带原始声明体。

**关键约束落地（来自 CONTEXT D-01..D-12）：**
- `.strict()` 在每层 object 上 → 拒未知键（负样本#3：core-table FK 偷渡）。
- `COLUMN_TYPES = ["text","integer","boolean","timestamp","enum"] as const` → `z.enum` 边界拒 `json`/`blob`（负样本#5 `INVALID_COLUMN_TYPE`）。
- `name: z.string().startsWith("plugin_owned_", "MISSING_OWNED_PREFIX")`（负样本#2）。
- table-level superRefine 强制 `columns` 含 `schoolId` 且 `notNull`（负样本#4 `MISSING_SCHOOL_SCOPE`）。
- 扫所有字符串值命中 `/\b(CREATE|ALTER|DROP)\b/i` → `RAW_SQL_FORBIDDEN`（负样本#1）。

---

### `src/lib/dto/plugin-data-model.test.ts`（负样本测试集）

**Analog（逐字风格）：** `src/lib/dto/draft-guardrails.test.ts:1-43`
```typescript
import { describe, expect, it } from "vitest";
import { /* schema + 拒因常量 */ } from "@/lib/dto/plugin-data-model";

describe("plugin-data-model 契约模块", () => {
  it("枚举/拒因常量顺序固定", () => {
    expect(SomeSchema.options).toEqual([...]);
  });
  // 1 合法 quiz 声明 → parse 成功
  // 5 非法声明 → 各断言特定拒因 message / ZodIssue
});
```
**抄什么：** ① `import { describe, expect, it } from "vitest"`；② path alias `@/lib/dto/...`；③ 中文 describe/it 文案；④ 用 `expect(...).toEqual([...])` 断言枚举/选项**顺序**；⑤ 一个 happy-path + N 个 negative-sample 各断言**具体**拒因（对应 CONTEXT `<specifics>` 的 1 合法 + 5 非法验收抓手）。

---

### `src/db/schema/generated/plugin-owned/<pluginKey>.ts`（编译器产出的 Drizzle 表）

**Analog（逐字对齐）：** `src/db/schema.ts:1883-1903`（`pluginOwnedBusinessData`）+ `:709-736`（`quizAttempts` append-only 索引形态）

详见下方 **「Codegen template」** 节——编译器输出必须与这两张 core 表的语法逐字同构（`id` PK `$defaultFn(crypto.randomUUID)`、`schoolId` notNull cascade→schools、`createdAt`/`updatedAt` `timestamp_ms`、`(table) => [ ... ]` 返回索引数组）。

**偏离点（相对 `pluginOwnedBusinessData`）：** 不得复制其 `payloadJson: text(..,{mode:"json"})` 列（D-02 禁 json 袋子）；改为具名标量列。append-only 唯一约束/复合索引列序参照 `quizAttempts` 但语义换成 D-12 的 `(schoolId, classroomSession, student, question)`。

---

### `src/db/schema/generated/index.ts`（barrel）

**无逐字 analog。** 沿用 ES re-export 范式：
```typescript
export * from "./plugin-owned/quiz";
```
并在 `src/db/schema.ts` **文件末尾**追加 `export * from "./schema/generated";`（D-05，手写主体零改）。drizzle-kit 与 `src/db/index.ts:4`（`import * as schema from "./schema"`）都只认 `schema.ts` 这一表面，故 re-export 是被发现的唯一干净桥。**反模式：** 让编译器把表注入 `schema.ts` 主体（违反 L-4/D-05，且破坏 verify-phase45 对手写区的字符串断言）。

---

### `scripts/compile-plugin-data-model.ts`（`pnpm plugin:compile` 编译器）

**无 codegen analog**——这是本 phase 三处真正新写代码之一。复用以下既有脚本约定：
- **文件头/导入风格：** `scripts/prepare-dev-db.ts:1-9` — `import { readFileSync } from "node:fs"`、`import path from "node:path"`、`import crypto from "node:crypto"`；脚本入口用 `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { main().catch(... process.exit(1)) }`（`prepare-dev-db.ts:323-327`）。
- **写文件：** 用 `node:fs` `writeFileSync`（仓库脚本统一 node: 前缀导入）。
- **运行方式：** 经 `tsx` 跑（见 package.json `db:migrate` = `tsx --import ./scripts/node-shim.js ...`）。若编译器 import 了带 `server-only` 的模块需挂 `node-shim`；若只 import DTO（无 server-only）则可裸 `tsx`。建议编译器**只依赖 `src/lib/dto/plugin-data-model.ts`（纯 DTO）**，避免 server-only 牵连。

---

### `scripts/gate-no-runtime-ddl.ts`（零-DDL 静态闸门）

**Analog — `execFileSync` + 退出码：** `scripts/verify-phase45-plugin-schema.ts:57-64`
```typescript
function run(command: string, args: readonly string[], label: string): void {
  try {
    execFileSync(command, [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`... failed while running: ${label}`);
    throw error;
  }
}
```
**抄什么：** `import { execFileSync } from "node:child_process"`；命中即 `process.exit(1)`，无命中 `process.exit(0)`。

**实现要点（RESEARCH §Code Examples + Open Q#1 裁决）：**
- 扫描目录：`["src/app","src/server","src/lib","src/features","src/actions","plugins"]`（D-08）。
- 命中模式：`(CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|db\.run\(|db\.exec\()`（D-09）。
- 白名单（**真实路径**）：`drizzle/**` + `src/db/schema/generated/**`（**不是** `src/db/migrations/**`）。
- `rg` 退出码语义：exit 1 = 无命中 = 通过（需 try/catch 区分 `e.status === 1`）。
- **Fallback（RESEARCH §Environment）：** 若 CI 无 `rg`，改用 Node `fs.readdirSync` 递归 + `RegExp`，零外部进程依赖、更可移植。
- 注意：`prepare-dev-db.ts:269` 有 `db.run(sql.raw("CREATE TABLE IF NOT EXISTS __drizzle_migrations ..."))`——它在 `scripts/`（非扫描目录），且属迁移元数据 bootstrap，**不在闸门范围**；确认扫描目录列表不含 `scripts/` 即可避免误报。

---

### `scripts/verify-phase67-plugin-owned-data.ts`（migration-proof close-gate）

**Analog（逐字 clone 骨架）：** `scripts/verify-phase45-plugin-schema.ts`（整文件）

**必抄结构：**
- 导入：`import { cleanupSqliteArtifacts, materializeDrizzleMigrations } from "./lib/sqlite-migration-proof"`（45:8）。
- 临时库：`path.join("/tmp/opencode", \`phase67-verify-${randomUUID()}.db\`)` → `materializeDrizzleMigrations(\`file:${path}\`)`（45:157-160）。
- **行为优先级联证明**（45:157-197）：seed → `DELETE FROM school WHERE id=...` → `assertRowCount(plugin_owned_quiz_*, 0)` → `PRAGMA foreign_key_check` 必 0 行。
- **物理表/索引断言**（45:220-265）：`PRAGMA table_info(<table>)` 比列、`assertIndex()`（45:98-117）比唯一索引。`tablesToCheck` 数组改成 `plugin_owned_quiz_*` 的列/索引。
- **dataVersion 列断言**：`PRAGMA table_info(pluginRegistration)` 含 `dataVersion`。
- **漂移检查（D-07，新增）：** `execFileSync("pnpm",["plugin:compile"])` 后 `execFileSync("git",["diff","--exit-code","src/db/schema/generated"])`，有 diff 即 fail。
- **调用零-DDL 闸门：** `run(process.execPath/tsx, [...,"scripts/gate-no-runtime-ddl.ts"], ...)`。
- 终态：`finally { client.close?.(); cleanupSqliteArtifacts(path) }`（45:193-196）。
- **运行壳：** package.json 用 `node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase67-...ts`（对齐 45/46/47 的 verify 壳，见 package.json:47-49）。

---

### `src/db/schema.ts`（改：`dataVersion` 列 + 末尾 barrel）

**Analog（同文件块内）：** `src/db/schema.ts:1241-1264`（`pluginRegistrations`）
```typescript
// 在 pluginRegistrations 的 updatedAt(1260) 后、闭合 `}` 前加一行：
  dataVersion: integer("dataVersion", { mode: "number" }).notNull().default(1),  // D-13 基线
```
**抄什么：** core 整型列范式 `integer("col", { mode: "number" }).notNull().default(1)`（参照 `:1250 enabled` 的 `integer(...).notNull().default(false)` 形态）。`drizzle-kit generate` 据此产 `ALTER TABLE \`pluginRegistration\` ADD \`dataVersion\` integer DEFAULT 1 NOT NULL;`，既有行自动回填 1（无需额外回填脚本）。
**第二处改动：** 文件末尾 `export * from "./schema/generated";`（唯一两处手写改动，主体零侵入）。

---

### `drizzle/NNNN_phase67_*.sql` + `meta/_journal.json`（迁移）

**Analog（格式）：** 现有 `drizzle/*.sql`（`--> statement-breakpoint` 分隔，见 `scripts/lib/sqlite-migration-proof.ts:18-23` 的 split 逻辑）。
**铁律（Pitfall #5）：** **只由 `drizzle-kit generate` 产出并自动 append journal**；**人绝不手命名 `0016` 或手编 journal**。journal 的 `idx` 与文件名 tag 号**非顺序**（idx0=`0000`、idx1=`0012_phase53`...），`materializeDrizzleMigrations` 严格按 `idx` replay（lib:34-36）；手动命名会破坏 replay 顺序。`drizzle/` 下存在未进 journal 的游离 `0013_*` 文件——执行后人工核对只新增一条 journal idx。

---

### `package.json`（脚本块）

**Analog：** `package.json:46-65`
```jsonc
"verify:phase45": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase45-plugin-schema.ts",
"verify:phase65": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase65-eval-guardrails.ts",
"verify:phase": "pnpm verify:phase65",            // ← 别名指向最新 phase
"db:migrate": "tsx --import ./scripts/node-shim.js scripts/prepare-dev-db.ts",
```
**抄什么 / 改什么：**
- 新增 `"verify:phase67": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase67-plugin-owned-data.ts"`（对齐 plugin 系 verify 壳）。
- 改 `"verify:phase": "pnpm verify:phase67"`（当前为 `verify:phase65`，必须前移，否则新闸门不跑）。
- 新增 `"db:generate": "drizzle-kit generate"`（drizzle-kit 自读 `drizzle.config.ts`；RESEARCH Open Q#3 建议形态）。
- 新增 `"plugin:compile": "tsx scripts/compile-plugin-data-model.ts"`（若不牵连 server-only 则裸 tsx）。

---

## Conventions to follow

**文件头 / 导入：**
- DTO 层（`src/lib/dto/**`）：仅 `import { z } from "zod"` 起步，**无 `server-only`**，确保 vitest 与 node 脚本可直跑（`resource-ai.ts:1`、`draft-guardrails`）。
- 脚本层（`scripts/**`）：node 内建一律 `node:` 前缀（`node:fs` / `node:path` / `node:crypto` / `node:child_process`），见 `verify-phase45:1-4`、`prepare-dev-db:1-3`。
- Drizzle schema 列导入：`sqliteTable, text, integer, uniqueIndex, index` from `drizzle-orm/sqlite-core`。
- path alias：源码内用 `@/...`（`@/db`、`@/lib/dto/...`），脚本内用相对路径（`./lib/...`）。

**Import shims（关键）：**
- `verify:phase*`（含 phase67）运行壳用 **`server-only-node-shim.cjs`**（`--require ./scripts/server-only-node-shim.cjs --import tsx`），因 verify 脚本会拉起 DAL/server-only 链路。
- `db:migrate` / 纯 DB 脚本用 **`node-shim.js`**（`tsx --import ./scripts/node-shim.js`），它把 `server-only` 模块 cache 置空不抛错（`node-shim.js:6-7`）。
- `plugin:compile` 若只依赖纯 DTO，则**不需要**任何 shim（裸 `tsx`）。

**Error / 拒因风格：**
- Zod 校验拒因 = `ctx.addIssue({ code: z.ZodIssueCode.custom, message: "<UPPER_SNAKE_CONST>", path: [...] })`。
- 抛错类（可选）= `extends Error`，message 前缀 `<DOMAIN>_REJECTED:<code>`，**绝不携带原始 payload/*Json**（`draft-guardrails.test.ts:30-36` 强约束）。
- 脚本失败 = `console.error(...)` + `process.exit(1)`；成功 = `console.log("  ✓ ...")` + 分步 `[n/N]` 进度（`verify-phase45:200-388`）。

**Test 风格：**
- `import { describe, expect, it } from "vitest"`；中文 describe/it 文案；枚举顺序用 `toEqual([...])` 断言；1 happy + N negative 各断具体拒因。
- verify 脚本内集成测试经 `runVitest()` 直跑 `node_modules/vitest/vitest.mjs`（`verify-phase45:81-96`）。

**Drizzle 列约定：**
- PK：`text("id").primaryKey().$defaultFn(() => crypto.randomUUID())`。
- 时间戳：`integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date())`。
- 布尔：`integer("isLatest", { mode: "boolean" }).notNull().default(true)`。
- enum：`text("col", { enum: [...] }).notNull()`（SQLite 无原生 enum，core 一律 text-enum，`schema.ts:1248,1252`）。
- FK：`.references(() => parent.id, { onDelete: "cascade" })`（AGENTS.md 硬约束：所有 FK 必 cascade）。
- 索引在第三参 `(table) => [ uniqueIndex("name").on(...), index("name").on(...) ]`。

---

## Reuse — do NOT duplicate（既有 DAL / 工具，直接调用）

| 既有函数（签名） | 路径:行 | Phase 67 用途 |
|------------------|---------|---------------|
| `deriveDbNamespace(pluginKey: string): string` | `src/lib/dal/plugins.ts:32` | `pluginKey → 安全 namespace` 归一（lowercase + 非法字符转 `_`，48 字符截断）。物理表前缀 `plugin_owned_<pluginKey>_` 的命名归一**复用此函数**，勿新写 slug。 |
| `materializeDrizzleMigrations(databaseUrl, { rootDir?, throughTag? })` | `scripts/lib/sqlite-migration-proof.ts:25` | 临时 SQLite 按 journal idx 顺序 replay 全部迁移；verify-phase67 物理断言的 harness。 |
| `cleanupSqliteArtifacts(databasePath: string)` | `scripts/lib/sqlite-migration-proof.ts:60` | 清理 `.db`/`-shm`/`-wal`；verify finally 块调用。 |
| `prepareDevDb(): Promise<void>` | `scripts/prepare-dev-db.ts:314` | `db:migrate` 入口（含已有库 schema 桥接）；迁移应用沿用，勿另写迁移 runner。 |
| `backfillPluginJsonToSchema(...)` / `verifyBackfillData(...)` / `cutoverPluginJsonToSchema(...)` | `src/lib/dal/plugin-migration.ts:115 / 265 / 384` | 既有迁移治理（backfill→verify→cutover）基线。Phase 67 **不重建迁移引擎**，仅扩展闸门覆盖至 `plugin_owned_*`；真正 semver 升级演进留 Phase 71。 |
| `upsertPluginOwnedBusinessData(input)` / `getPluginOwnedBusinessData(input)` | `src/lib/dal/plugin-data.ts:538 / 631` | 既有通用插件数据读写动词。Phase 67 **只建结构表，不碰读写动词**（动词治理属 Phase 68）；勿在本 phase 复制/改写。 |
| `upsertPluginExtension(input)` / `getPluginExtension(input)` | `src/lib/dal/plugin-data.ts:230 / 417` | 同上——既有 DAL 范式参考（鉴权三段式：`assertTeacherManagerScope` → `assertPluginBelongsToSchool` → `assertEntityBelongsToSchool`），Phase 68 才接 owned 表动词。 |
| `installOrReconcilePlugin / registerPluginManifest / transitionPluginLifecycle ...` | `src/lib/dal/plugins.ts:583 / 642 / 869` | 插件注册/生命周期 DAL；`dataVersion` 默认 1 由列 default 兜底，注册路径无需改（除非 planner 选择显式写入基线）。 |

**Don't hand-roll（RESEARCH §Don't Hand-Roll 实证）：** 迁移 diff → `drizzle-kit generate`；迁移 replay → `materializeDrizzleMigrations`；表/索引断言 → `PRAGMA table_info`/`index_list` + `assertIndex`；cascade 正确性 → `PRAGMA foreign_key_check` + 删除断言行数；namespace 归一 → `deriveDbNamespace`。

---

## Codegen template（编译器须 emit 的精确 Drizzle 表形态）

> 直接派生自 `src/db/schema.ts:1883`（`pluginOwnedBusinessData`，结构骨架）与 `:709`（`quizAttempts`，append-only 索引语义）。编译器渲染的每张 `plugin_owned_<pluginKey>_<table>.ts` 必须逐字同构于下方模板（仅列集合/enum 值随声明变化）。

```typescript
// src/db/schema/generated/plugin-owned/quiz.ts —— pnpm plugin:compile 产出, checked-in
// Source patterns: schema.ts:1883 (pluginOwnedBusinessData 骨架) + schema.ts:709 (quizAttempts append-only)
import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { schools } from "../../schema";                 // 仅允许的跨表 FK：schoolId → schools (D-11)
import { pluginRegistrations } from "../../schema";

export const pluginOwnedQuizResponses = sqliteTable(
  "plugin_owned_quiz_responses",                          // D-10 物理表名前缀
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),          // D-11 唯一允许的出向 FK
    pluginId: text("pluginId")
      .notNull()
      .references(() => pluginRegistrations.id, { onDelete: "cascade" }),
    classroomSession: text("classroomSession").notNull(),  // scope 软关联文本，不加跨表 FK (D-11)
    student: text("student").notNull(),
    question: text("question").notNull(),
    selectedOption: text("selectedOption", { enum: ["A", "B", "C", "D"] }).notNull(), // D-03 enum→text
    isLatest: integer("isLatest", { mode: "boolean" }).notNull().default(true),       // 供 Phase 69 append-only
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("plugin_owned_quiz_responses_scope_idx")
      .on(table.schoolId, table.classroomSession, table.student, table.question),     // D-12 复合索引列序
    uniqueIndex("plugin_owned_quiz_responses_dedupe_unique")
      .on(table.classroomSession, table.student, table.question),                     // D-12 去重唯一约束
  ]
);
```

**硬约束（meta-schema 边界拒 + 生成器固定输出）：**
- **禁** `text(col, { mode: "json" })` / `blob`（D-02）——core 的 `payloadJson` 是历史袋子，新 owned 表**不得复制**。
- **禁** 任何 `references(() => <coreTable>.id ...)`，除 `schoolId → schools` 与 `pluginId → pluginRegistrations`（D-11；其余 scope 列为 `.notNull()` 文本软关联）。
- **强制**每表含 `schoolId notNull cascade`（缺即 meta-schema 负样本#4 拒）。
- enum 编译为 `text(col, { enum: [...] })`（对齐 `pluginRegistrations.lifecycleState` schema.ts:1252）；可选叠加 SQLite `CHECK`（the agent's Discretion，二者均满足结构化可校验）。
- 索引/唯一约束统一在第三参 `(table) => [...]` 返回数组（对齐 `quizAttempts` schema.ts:733-736）。

---

## No analog found

| File | Role | 原因 / 处理 |
|------|------|-------------|
| `scripts/compile-plugin-data-model.ts` | codegen | 仓库**无字符串模板代码生成器**先例（本 phase 三处新写之一）。复用 `prepare-dev-db.ts` 的 node:fs / 脚本入口范式 + 上方 Codegen template 作输出契约。 |
| `src/db/schema/generated/index.ts` | barrel | 无逐字 analog；用标准 ES `export *` re-export（D-05）。 |
| `scripts/gate-no-runtime-ddl.ts` | static gate | 无 `rg`-based 闸门先例（本 phase 新写之一）；复用 verify-phase45 的 `execFileSync` + exit-code 范式，rg 缺失时 fallback 到 Node `fs` 递归扫描。 |

---

## Metadata

**Analog search scope:** `src/lib/dto/`、`src/db/schema.ts`、`src/lib/dal/{plugins,plugin-migration,plugin-data}.ts`、`scripts/`（verify-phase45/46、prepare-dev-db、node-shim、sqlite-migration-proof）、`drizzle.config.ts`、`src/db/index.ts`、`package.json`
**Files scanned:** 12 实证文件（全部 Read 验证，未盲信 RESEARCH.md）
**Verified deviation from upstream:** 闸门白名单真实路径 = `drizzle/**`（非 RESEARCH/CONTEXT 写的 `src/db/migrations/**`）
**Pattern extraction date:** 2026-06-02
