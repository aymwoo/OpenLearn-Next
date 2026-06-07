# Phase 68: Governed Declarative Data-Access Verbs - Research

**Researched:** 2026-06-02
**Domain:** Governed data-access facade over plugin-owned SQLite tables (named verbs, command-bus writes, compile-time whitelist, injection-proof boundary)
**Confidence:** HIGH (all integration surfaces verified in-codebase; no external/unstable dependencies)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (调用面形态):** 五个动词 (`insert` / `upsert` / `getByIndex` / `count` / `aggregate`) 经**单一受治理入口 facade**（如 `dispatchPluginDataAccess`）暴露，payload 携带 `verb` 判别字段（discriminated union），共享一套边界校验/治理/审计。**不**把每动词登记为 static action catalog 的独立 actionKey（现有 action 是"提议/注解"语义，与结构表 CRUD 语义不同）。
- **D-02 (写命令粒度):** 单一 facade 内部，**写路径每写动词一个 platform command 类型**（`plugin.data.insert` / `plugin.data.upsert`），与现有 `contracts.ts` 中 `plugin.*` 同款粒度，便于 replay 与审计区分。读动词不新增 command 类型。
- **D-03 (读路径治理):** 读动词（`getByIndex` / `count` / `aggregate`）**不落 `platformCommands`**，直走受治理 DAL；但全部读动作仍经 governed action registry 治理检查（lifecycle / kill-switch / 越权）。写动词照常经 Command Bus 持久化（满足 SC3）。
- **D-04 (audit 粒度):** 写动词成功+失败都入 audit（写本就走 Command Bus，天然有记录）；读动词**仅在拒绝/越权时**入 audit，成功读不入。
- **D-05 (aggregate 边界):** 本 phase 的 `aggregate` 仅交付**受限具名聚合**：`count` + 按**白名单列** `groupBy` → 返回 `{key, count}` 行。**不**做正确率/选项分布/作答-未作答投影（那是 Phase 70 STATS）。
- **D-06 (白名单来源):** 表名/列名/可 `getByIndex` 索引/可 `groupBy` 聚合列，全部从 **Phase 67 声明 `dataModel` + 生成 schema 自动派生**（drizzle-zod 同源），编译期产出受治理访问元数据。**单一真相源、零漂移**；不手维护并行 const map。
- **D-07 (索引约束):** `getByIndex` 按**逻辑 scope-key 名**暴露（如 `byClassroomSessionStudentQuestion`），映射到生成的唯一/复合索引；`getByIndex` 与 `groupBy` **只能命中声明 dataModel 中已建索引的列**，未建索引列一律拒绝。
- **D-08 (拒绝契约 — 验收抓手):** 负样本验收集必须逐个断言**特定拒因 + 写 audit**，覆盖 7 类：①裸 SQL/`sql\`\``/DDL → `raw_sql_rejected`；②自由 `where`/任意过滤 → `free_where_rejected`；③任意列名/表名 → `unknown_column_rejected` / `unknown_table_rejected`；④跨校 `schoolId`/前端或插件传入 `schoolId` → `cross_school_rejected`；⑤非法 payload（缺字段/错类型/越界 enum）→ `invalid_payload_rejected`；⑥未建索引列 `getByIndex`/`groupBy` → `unindexed_column_rejected`；⑦未安装/kill-switch/非本校 → 经 governed action registry 拒（复用既有 lifecycle 治理）。

### Agent's Discretion
- facade 入口的内部模块组织、command payload schema 的具体 zod 形状、读 DAL 函数拆分粒度：满足 D-01..D-08 与 ROADMAP Success Criteria 即可。
- 派生访问元数据的产物形态（编译期生成 TS 常量 vs 运行时从生成 schema 反射）：择优，前提是单一真相源、零漂移（D-06）。本研究**推荐编译期 TS 常量**（见 Pattern 2）。
- 写动词 dedupeKey / 幂等键的具体取值：按现有 Command Bus producer 惯例（correlation/dedupe 机制）拍。

### Deferred Ideas (OUT OF SCOPE)
- 老师配置单选 + 学生作答 append-only/isLatest 落 `plugin_owned_*` 表 — **Phase 69**（消费本 phase 写动词 facade）。
- 题目统计只读投影（正确率/选项分布/作答-未作答人数，SQL GROUP BY）— **Phase 70**（在 D-05 受限 `aggregate` 之上扩展）。
- semver backfill→verify→cutover 升级 + retain/cleanup 卸载 — **Phase 71**（消费 Phase 67 `dataVersion` 基线）。
- 端到端 close gate（声明→安装→配置→作答→统计→升级/卸载）— **Phase 72**。
- 幂等键取值策略细节、错误回传形状、缓存 tag 失效策略 — 属 Discretion，planner 按现有惯例拍。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ACCESS-01 | 插件经白名单具名、Zod 校验、参数化动词读写自有 `plugin_owned_*` 表（无裸 SQL/自由 where/任意字段名） | Standard Stack（drizzle-zod 同源校验）+ Pattern 1（discriminated-union facade）+ Pattern 2（编译期白名单元数据）+ Don't Hand-Roll #1/#2 |
| ACCESS-02 | 所有动作经 governed action registry 检查；写动词经 Command Bus 持久化、replay-safe | Pattern 3（write verb → command type → bus）+ Pattern 4（imperative governance gate，**需新建**）+ 拒绝契约表 |
| ACCESS-03 | `schoolId` 恒由认证 session 推导；SQLite+DAL 是唯一 durable 真相源 | Pattern 5（schoolId session 注入，payload 永不携带）+ Architectural Responsibility Map |
</phase_requirements>

## Summary

本 phase 在 Phase 67 已建的 `plugin_owned_*` 结构表之上，构建一个**受治理的具名动词数据访问层**。范式口号是 **"named verbs, not raw queries"**：调用面只暴露 5 个具名动词（`insert`/`upsert`/`getByIndex`/`count`/`aggregate`），每个动词的表/列/索引/聚合列都来自 Phase 67 声明 schema 编译期派生的服务端白名单，参数经 drizzle-zod 同源 schema 校验，`schoolId` 恒由 session 注入。原始 SQL、自由 `where`、任意字段名在边界处即被拒——**无注入面**。

平台内核已全部就绪、**不得重建**：Command Bus（`commands/bus.ts` + `registry.ts`，replay-safe/dedupe）、governance 投影（`plugins/governance-projection.ts`，kill-switch/lifecycle/blocked 判定）、governance audit 写入（`dal/plugins.ts` 的 `governanceAudits` 路径）、Phase 67 生成 schema（`db/schema/generated/plugin-owned/*.ts`）。本 phase 是**装配 + 边界校验 + 白名单派生**，不是造引擎。

**Primary recommendation:** 建单一 facade `dispatchPluginDataAccess(verb-discriminated payload)`；写动词 (`insert`/`upsert`) 各加一个 `plugin.data.*` command 类型，经现有 `platformCommandRegistry` 注册并走 `dispatchPlatformCommand`；读动词直走新建的受治理 DAL；用 drizzle-zod `createInsertSchema`/`createSelectSchema` 从 Phase 67 生成表派生编译期白名单 const（零漂移）；**新建一个 imperative governance gate**（复用 `projectPluginGovernance`，因 `actions/registry.ts` 当前只是 read-model 投影、无命令式 authorize 函数——这是本 phase 必须填的唯一真实缺口）。

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 动词调用面 facade（边界校验/治理/审计编排） | API / Backend (`src/features/platform-core`) | — | 服务端唯一入口；插件/前端永不直接触 DAL 或 SQL |
| 白名单访问元数据派生（表/列/索引/聚合列） | Build-time (compile script, `scripts/`) | API（运行时消费 const） | 单一真相源、零漂移（D-06）；编译期固化避免运行时反射漂移 |
| 写动词持久化（insert/upsert） | API → Command Bus (`commands/`) | Database (SQLite `plugin_owned_*`) | replay-safe、可审计、dedupe（D-02/SC3） |
| 读动词（getByIndex/count/aggregate） | API → 受治理 DAL (`src/lib/dal/`) | Database | 不污染 command 表（D-03）；高频只读直走 DAL |
| 治理前置检查（lifecycle/kill-switch/越权） | API（imperative gate，复用 governance 投影） | — | D-08 第 7 条；读写都过这一关 |
| `schoolId` 推导 | API（session/authenticated actor） | — | 恒由认证 session，绝不接受 payload 传入（ACCESS-03/D-08 ④） |
| audit 落库 | Database (`governanceAudits` / Command Bus attempt 记录) | — | D-04 粒度分流 |

## Standard Stack

### Core
| Library | Version (verified) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-zod` | `^0.8.3` (npm latest 0.8.3, ✅ 2026-06-02) | 从 Phase 67 生成 drizzle 表派生 zod insert/select schema | D-06 单一真相源；`createInsertSchema(table)` 直接产出 payload 校验 schema，列名/类型/enum 全部跟随生成表，零漂移。**当前代码库尚未使用 drizzle-zod**（净新引入，但依赖已在 `package.json`）。 |
| `drizzle-orm` | `^0.45.2` | 参数化查询、`eq`/`and`/`count`/`groupBy` 表达式构造 | 已是全项目 ORM；动词内部全部用 drizzle query builder，绝不字符串拼 SQL |
| `zod` | `^4.4.3` | discriminated union facade payload + 边界校验 + 拒因 | 已是全项目校验层；`z.discriminatedUnion("verb", [...])` 是 facade 形态（D-01） |
| `@libsql/client` | `^0.17.3` | SQLite 驱动 | 项目 SQLite-first 驱动（**注意：非 `better-sqlite3`，该包未安装**）；动词写经事务 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | (latest) | 跑编译期白名单派生脚本 + `verify:phase68` 负样本闸门 | 沿用 `pnpm plugin:compile` / `verify:phase*` 既有运行方式 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 编译期 TS 常量白名单 | 运行时从生成 schema 反射 | 反射更"DRY"但引入运行时漂移风险与启动开销；**编译期 const + checked-in + "重新编译无 diff" 闸门**（沿用 Phase 67 D-07）更符合 D-06 零漂移。**推荐编译期。** |
| drizzle-zod 派生 payload schema | 手写 zod payload | 手写会与生成表漂移，违反 D-06；drizzle-zod 自动跟随。 |
| 复用 `actions/registry.ts` 投影做治理门 | 直接读 `projectPluginGovernance` | registry.ts 是 read-model（产出 catalog 行），**无命令式 `assert*` 函数**；需抽一个 imperative gate（见 Pattern 4）。 |

**Installation:** 无需新增依赖——`drizzle-zod`/`drizzle-orm`/`zod`/`@libsql/client`/`tsx` 全部已在 `package.json`。

**Version verification (npm, 2026-06-02):** `drizzle-zod` latest = `0.8.3`（与 `package.json` `^0.8.3` 一致）。其余均为项目既用版本，无需变更。

## Architecture Patterns

### System Architecture Diagram

```
插件/前端调用 (NEVER raw SQL, NEVER schoolId)
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│ dispatchPluginDataAccess(payload: {verb, table, ...})    │  ← 单一受治理 facade (D-01)
│  1. session → schoolId 注入 (ACCESS-03, payload 拒带)     │
│  2. z.discriminatedUnion("verb") 边界校验                 │
│  3. 白名单检查 (table/column/index ∈ 编译期 const, D-06)  │
│  4. imperative governance gate (lifecycle/kill-switch)   │  ← 复用 projectPluginGovernance
└───────────┬─────────────────────────────┬────────────────┘
            │ 写动词 insert/upsert         │ 读动词 getByIndex/count/aggregate
            ▼                              ▼
┌───────────────────────────┐   ┌──────────────────────────┐
│ plugin.data.{insert|upsert}│   │ 受治理 DAL (直读, 不进 bus)│ (D-03)
│ → dispatchPlatformCommand  │   │ drizzle parameterized     │
│ → registry handler.execute │   │ eq/and/count/groupBy      │
│ → 受治理 DAL (drizzle, tx) │   └──────────┬───────────────┘
│ → SQLite plugin_owned_*    │              │ 拒绝/越权时
│ → command attempt 记录(审计)│              ▼
└──────────┬─────────────────┘   ┌──────────────────────────┐
           │ 成功+失败                │ governanceAudits 写入     │ (D-04: 读仅拒绝入审计)
           ▼                          └──────────────────────────┘
   governanceAudits (D-04: 写动词成功+失败都入)
```

唯一 durable 真相 = SQLite (`plugin_owned_*`) 经 DAL。WS/Redis 不落库权威（Pitfall #8）。

### Recommended Project Structure
```
src/features/platform-core/
├── plugin-data-access/                 # 本 phase 新建目录
│   ├── facade.ts                       # dispatchPluginDataAccess (D-01 入口)
│   ├── contracts.ts                    # z.discriminatedUnion("verb") payload + 7 拒因 enum (D-08)
│   ├── governance-gate.ts              # imperative lifecycle/kill-switch 门 (Pattern 4, 新缺口)
│   └── read-verbs.ts                   # getByIndex/count/aggregate 受治理 DAL (D-03)
├── commands/
│   ├── contracts.ts                    # +plugin.data.insert/upsert 类型 & payload schema (D-02)
│   ├── registry.ts                     # +2 条 platformCommandRegistry 注册
│   └── handlers/
│       └── plugin-data.ts              # 写动词 handler {authorize, execute} (新建)
src/db/schema/generated/plugin-owned/
│   └── data-access-allowlist.ts        # 编译期派生白名单 const (D-06, checked-in)
src/lib/dal/
│   └── plugin-owned-data.ts            # 结构表 drizzle 读写 (与 JSON-bag plugin-data.ts 并存, 不替换)
scripts/
├── compile-plugin-data-model.ts        # 扩展: 额外产出 data-access-allowlist.ts
└── verify-phase68-data-access-verbs.ts # 负样本闸门 (D-08, 1 合法 + 7 非法)
```

### Pattern 1: Discriminated-union verb facade (D-01)
**What:** 单一入口，`verb` 判别字段，5 动词共享治理/审计。
**When to use:** 所有插件数据访问的唯一公开 API。
```typescript
// Source: project convention (commands/contracts.ts z.discriminatedUnion 同款) [VERIFIED: codebase]
const PluginDataAccessPayloadSchema = z.discriminatedUnion("verb", [
  z.object({ verb: z.literal("insert"),  table: z.string(), values: z.record(z.string(), z.unknown()) }).strict(),
  z.object({ verb: z.literal("upsert"),  table: z.string(), values: z.record(z.string(), z.unknown()) }).strict(),
  z.object({ verb: z.literal("getByIndex"), table: z.string(), indexKey: z.string(), args: z.record(z.string(), z.unknown()) }).strict(),
  z.object({ verb: z.literal("count"),  table: z.string(), indexKey: z.string().optional(), args: z.record(z.string(), z.unknown()).optional() }).strict(),
  z.object({ verb: z.literal("aggregate"), table: z.string(), groupBy: z.string() }).strict(),
]);
// schoolId 故意不在 schema 中 —— 由 session 在 facade 内注入 (ACCESS-03, D-08 ④)
```
注意：`.strict()` 让任何多余字段（如 `where`、`sql`、`schoolId`）触发 `invalid_payload_rejected`，是 D-08 ②④⑤ 的第一道闸。`table`/`indexKey`/`groupBy` 的字符串值随后再过编译期白名单（Pattern 2）得到 `unknown_table_rejected`/`unindexed_column_rejected`/`unknown_column_rejected`。

### Pattern 2: Compile-time allowlist derivation from Phase 67 schema (D-06)
**What:** 扩展 `scripts/compile-plugin-data-model.ts`，额外用 drizzle-zod 从生成表派生 checked-in 白名单 const。
**When to use:** 表/列/索引/聚合列的唯一真相。
```typescript
// Source: drizzle-zod docs + Phase 67 generated tables [CITED: orm.drizzle.team/docs/zod]
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { pluginOwnedQuizResponses } from "@/db/schema/generated/plugin-owned/quiz";

// 派生 insert 校验 (列名/类型/enum 跟随生成表, 零漂移)
export const quizResponsesInsert = createInsertSchema(pluginOwnedQuizResponses);
// 派生白名单元数据 const (表→{columns, indexes(scope-key→列序), aggregatableColumns})
export const PLUGIN_OWNED_ACCESS_ALLOWLIST = {
  plugin_owned_quiz_responses: {
    columns: ["classroomSession","student","question","selectedOption", /*…*/],
    indexes: { byClassroomSessionStudentQuestion: ["classroomSession","student","question"] },
    aggregatableColumns: ["selectedOption"],  // 只含已建索引列 (D-07)
  },
} as const;
```
**关键：** 沿用 Phase 67 D-07 的"重新编译无 diff"漂移闸门——`verify:phase68` 必须断言重新生成 allowlist 与 checked-in 文件零 diff。

### Pattern 3: Write verb → platform command type → bus (D-02)
**What:** `insert`/`upsert` 各加一个 command 类型，注册进 `platformCommandRegistry`，经 `dispatchPlatformCommand`。
```typescript
// Source: commands/contracts.ts + registry.ts [VERIFIED: codebase]
// (1) contracts.ts: 新增 const + payload schema + 并入 PlatformCommandTypeSchema/PlatformCommandSchema 联合
export const PluginDataCommandTypes = ["plugin.data.insert", "plugin.data.upsert"] as const;
const PluginDataInsertPayloadSchema = z.object({
  schoolId: z.string().min(1),   // command 层 scope 沿用 {schoolId, pluginId} 既有形态
  pluginId: z.string().min(1),
  table: z.string().min(1),
  values: z.record(z.string(), z.unknown()),  // 已在 facade 过 drizzle-zod 校验
}).strict();
// (2) registry.ts: 仿 lesson.draft.persist 注册 (dedupe: "required" 复用幂等)
"plugin.data.insert": createPlatformCommandDefinition({
  commandType: "plugin.data.insert",
  payloadSchema: PlatformCommandPayloadSchemas["plugin.data.insert"],
  dedupe: "required",
  authorize: pluginDataCommandHandlers["plugin.data.insert"].authorize,  // governance gate
  execute: pluginDataCommandHandlers["plugin.data.insert"].execute,       // DAL tx 写
}),
```
`upsert` 沿用 Phase 67 `plugin_owned_quiz_responses` 唯一约束 `(classroomSession, student, question)` + append-only/isLatest 去重语义（D-12，供 Phase 69 复用）。

### Pattern 4: Imperative governance gate (D-08 第 7 条 — 真实缺口)
**What:** `actions/registry.ts` 当前只是 read-model 投影（产出 catalog 行），**没有命令式 `assertActionExecutable(pluginId, schoolId)`**。本 phase 必须抽一个，读写都先过。
```typescript
// Source: 复用 projectPluginGovernance + listPluginGovernanceSnapshotRecords [VERIFIED: codebase]
// governance-gate.ts
export async function assertPluginDataAccessAllowed(input: { schoolId: string; pluginId: string }) {
  const snapshots = await listPluginGovernanceSnapshotRecords({ schoolId: input.schoolId, actorId: ... });
  const projection = projectPluginGovernance(snapshots);
  const row = projection.plugins.find((p) => p.pluginId === input.pluginId);
  if (!row || !row.executable) {
    // 映射 row.lifecycle.reasonCode → 拒因 (not_installed/not_enabled/kill_switch/...)
    // → 写 governanceAudits (decision: "denied") → 抛拒绝
  }
}
```
`row.executable === !blocked && state === "active"`；`blocked`/`reasonCode` 由投影给出（kill_switch/not_installed/not_enabled/dependency_*/activation_failed，见 `governance-projection.ts:147-206`）。

### Pattern 5: schoolId session injection (ACCESS-03 / D-08 ④)
**What:** `schoolId` 永远来自认证 session/actor，payload 携带 `schoolId` → `cross_school_rejected`。沿用 `dal/plugin-data.ts` 的 `assertActiveTeacher` 范式：`scope.userId === actorId && scope.schoolIds.includes(schoolId)`，越界抛 `SCHOOL_CROSS_BOUNDARY_FORBIDDEN`。

### Anti-Patterns to Avoid
- **把动词登记为 static action catalog actionKey：** 违反 D-01（action=提议/注解语义；数据动词=结构表 CRUD）。facade 自管校验/治理。
- **读动词落 `platformCommands`：** 违反 D-03，高频只读污染 replay 语义。
- **手维护并行白名单 const map：** 违反 D-06，必派生 + "重新编译无 diff" 闸门。
- **payload 接受 `where`/`sql`/任意 `column`/`schoolId`：** 这正是 D-08 要拒的注入面；`.strict()` + 白名单双闸。
- **第二 durable 真相（WS/Redis 落权威）：** 违反 Pitfall #8；只 SQLite+DAL。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| payload 列/类型/enum 校验 | 手写 zod object | `drizzle-zod` `createInsertSchema(生成表)` | 自动跟随 Phase 67 生成表，零漂移（D-06） |
| replay-safe 写持久化 + dedupe | 新写引擎 | `dispatchPlatformCommand` + `platformCommandRegistry`（`commands/bus.ts`/`registry.ts`） | 已成熟，attempt/dedupe/审计齐全 |
| lifecycle/kill-switch/blocked 判定 | 重写治理逻辑 | `projectPluginGovernance`（`plugins/governance-projection.ts`） | 已覆盖 8 类 reasonCode + 依赖图 |
| audit 落库 | 新 audit 表 | `governanceAudits` 写入路径（`dal/plugins.ts`，`createGovernanceAudit`） | 既有 targetType/decision/reasonCode/correlationId/commandId 字段齐全 |
| SQL 过滤/聚合 | 字符串拼 `WHERE`/`GROUP BY` | drizzle `eq`/`and`/`count`/`groupBy` 参数化表达式 | 参数化=无注入面（ACCESS-01/Pitfall #6） |
| 负样本验收范式 | 新测试框架 | Phase 67 `verify-phase67-*.ts` 的"合法样板 + N 非法各给特定拒因"范式 | 一致、可断言、与静态闸门并跑 |

**Key insight:** 本 phase 90% 是装配既有内核 + 边界校验，唯一真正"新造"的是 **imperative governance gate**（Pattern 4，因 registry.ts 只有 read-model 投影）与 **白名单派生器扩展**（Pattern 2）。其余全部复用。

## Runtime State Inventory

> 本 phase 非 rename/migration，但涉及"新增 command 类型 + 新增生成产物"，逐项确认：

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `plugin_owned_quiz_*` 表已由 Phase 67 建好；本 phase 只读写、不改 DDL | code edit only（动词 DAL） |
| Live service config | None — 无外部服务配置嵌字符串。`verify:phase` alias 指向 `pnpm verify:phase67`，需更新为 phase68 | 改 `package.json` scripts |
| OS-registered state | None — verified（无 cron/task/pm2 命名涉及） | none |
| Secrets/env vars | None — 不新增 secret/env | none |
| Build artifacts | 新增 checked-in 生成文件 `data-access-allowlist.ts`；`plugin:compile` 脚本扩展后须重跑并提交 | 重跑 `pnpm plugin:compile` + commit；`verify:phase68` 断言零 diff |

## Common Pitfalls

### Pitfall 1: 灵活查询 = 注入面（research PITFALLS #6）
**What goes wrong:** 为"通用性"暴露 `where`/任意 `column`/`orderBy`，等于开后门。
**Why it happens:** 误把"插件需要灵活查询"当需求；实际 Phase 69/70 只需具名 scope-key 读 + 受限聚合。
**How to avoid:** 只暴露 5 动词 + 白名单列 + 已建索引 scope-key；`aggregate` 仅 `count + groupBy(白名单列)`（D-05）。
**Warning signs:** payload 出现 `where`/`filter`/`sql`/裸 `column` 字段名。

### Pitfall 2: 第二 durable 真相源（research PITFALLS #8，写半边）
**What goes wrong:** 写动词同时往 Redis/WS 落"权威"状态，replay 后两边不一致。
**How to avoid:** 写只经 Command Bus → DAL → SQLite；WS/Redis 仅投递/通知（ROADMAP Pitfall #8）。
**Warning signs:** handler.execute 里出现 Redis/WS 写权威数据。

### Pitfall 3: schoolId 来自 payload（research PITFALLS #2，scope 强约束）
**What goes wrong:** 信任前端/插件传入 `schoolId`，跨校越权。
**How to avoid:** facade 内 session 注入 schoolId；payload `.strict()` 拒带 schoolId → `cross_school_rejected`（D-08 ④）。

### Pitfall 4: 白名单与生成表漂移（D-06）
**What goes wrong:** 手维护 const map 与 Phase 67 生成表脱节，允许已删列或漏新列。
**How to avoid:** 派生 + checked-in + `verify:phase68` "重新编译无 diff"断言（沿用 Phase 67 D-07）。

### Pitfall 5: 把读动词塞进 Command Bus（D-03）
**What goes wrong:** 高频 `count`/`getByIndex` 灌爆 `platformCommands`，污染 replay。
**How to avoid:** 读直走 DAL，仅拒绝时写 `governanceAudits`（D-04）。

## Code Examples

### count / aggregate (受限具名聚合, D-05)
```typescript
// Source: drizzle-orm count + groupBy [CITED: orm.drizzle.team/docs/select]
import { and, eq, count } from "drizzle-orm";
// count: schoolId(session) + scope-key 参数化
const [{ value }] = await db.select({ value: count() })
  .from(pluginOwnedQuizResponses)
  .where(and(eq(pluginOwnedQuizResponses.schoolId, schoolId), eq(pluginOwnedQuizResponses.classroomSession, args.classroomSession)));
// aggregate: count + groupBy(白名单列) → {key, count}  (groupBy 列必 ∈ aggregatableColumns)
const rows = await db.select({ key: pluginOwnedQuizResponses.selectedOption, count: count() })
  .from(pluginOwnedQuizResponses)
  .where(eq(pluginOwnedQuizResponses.schoolId, schoolId))
  .groupBy(pluginOwnedQuizResponses.selectedOption);
```

### 拒因检查顺序（facade 内）
```
1. session → schoolId（payload 带 schoolId? → cross_school_rejected）
2. discriminatedUnion .strict() 解析（多余字段/缺字段/错类型 → invalid_payload_rejected;
   含 sql/DDL 字符串 → raw_sql_rejected; 含 where → free_where_rejected）
3. table ∈ allowlist?（否 → unknown_table_rejected）
4. column/values 键 ∈ allowlist.columns?（否 → unknown_column_rejected）
5. indexKey ∈ allowlist.indexes? / groupBy ∈ aggregatableColumns?（否 → unindexed_column_rejected）
6. assertPluginDataAccessAllowed（lifecycle/kill-switch → 第 7 类拒因）
7. 写: dispatch command; 读: DAL 直读
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON-bag 通用扩展 DAL（`dal/plugin-data.ts`，core ext 表 + JSON payload） | 结构表 + 受治理具名动词（本 phase） | Phase 67→68 | 二者**并存**：JSON-bag 不替换；受治理动词是 `plugin_owned_*` 结构表的新真相路径 |
| 手写 zod 校验 schema | drizzle-zod 从生成表派生 | 本 phase 首次引入 drizzle-zod | 零漂移；但 drizzle-zod 在本库**首次使用**，需验证与 zod ^4.4.3 兼容 |

**Deprecated/outdated:** 无。`better-sqlite3` 在 STACK.md 列为备选但**未安装**——驱动是 `@libsql/client`。

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | drizzle-zod `^0.8.3` 与 zod `^4.4.3` + drizzle-orm `^0.45.2` 三者兼容（库内首次使用 drizzle-zod） | Standard Stack | 中：若 `createInsertSchema` 在 zod v4 下行为不符，需退回手写 zod（仍可零漂移但需手维护列表，违反 D-06 精神）。**planner/executor 须在 Wave 0 用一个 spike 验证。** |
| A2 | `getByIndex` 逻辑 scope-key 命名（如 `byClassroomSessionStudentQuestion`）由派生器从生成表索引名映射 | Pattern 2 / D-07 | 低：命名约定属 Discretion；只要映射到真实索引即可 |
| A3 | 写动词 dedupe 用 `"required"`（仿 `lesson.draft.persist`） | Pattern 3 | 低：dedupeKey 取值属 Discretion，planner 拍 |

## Open Questions

1. **drizzle-zod v0.8.3 在 zod v4 下 `createInsertSchema` 对 SQLite `text({enum:[...]})` 的处理**
   - 已知：Phase 67 enum 编译为 `text` + drizzle enum 约束（无原生 enum）。
   - 不清楚：drizzle-zod 是否把它派生为 `z.enum([...])`（理想，给 `invalid_payload_rejected` 越界 enum 断言）还是退化为 `z.string()`。
   - 建议：Wave 0 spike 验证（A1）；若退化为 string，facade 需补一层白名单 enum 校验。

2. **`listPluginGovernanceSnapshotRecords` 的 actorId 入参**（gate 是否需要 actorId）
   - 已知：`registry.ts` 的 `RegistryReadInput = { actorId, schoolId }`。
   - 建议：gate 复用同签名，actorId 来自 session actor。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| drizzle-zod | 白名单/payload 派生 | ✓（package.json） | ^0.8.3 | 手写 zod（违反 D-06，仅 A1 失败时） |
| drizzle-orm | 参数化查询/聚合 | ✓ | ^0.45.2 | — |
| zod | facade union/校验 | ✓ | ^4.4.3 | — |
| @libsql/client | SQLite 驱动 | ✓ | ^0.17.3 | — |
| tsx | 编译/verify 脚本 | ✓ | latest | — |
| Phase 67 生成表 | 白名单来源 | ✓ | `db/schema/generated/plugin-owned/quiz.ts` 存在 | — |

**Missing dependencies with no fallback:** 无。
**Missing dependencies with fallback:** 无（A1 是兼容性风险，非缺失）。

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest（单元/集成，`*.test.ts`，全库标准）+ `verify:phase68` tsx 闸门脚本（负样本契约） |
| Config file | 既有 vitest 配置（`*.test.ts` 同目录）；闸门脚本无独立 config |
| Quick run command | `pnpm vitest run src/features/platform-core/plugin-data-access` |
| Full suite command | `pnpm verify:phase68`（新增）+ 更新 `verify:phase` alias → `pnpm verify:phase68` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ACCESS-01 | 5 动词具名调用、白名单列、参数化、拒裸 SQL/自由 where/任意字段 | unit + gate | `pnpm vitest run .../facade.test.ts` | ❌ Wave 0 |
| ACCESS-01/02 | 7 类负样本各断言特定拒因 + audit 落库（D-08） | gate (负样本) | `pnpm verify:phase68` | ❌ Wave 0 |
| ACCESS-02 | 写动词经 Command Bus 持久化、replay-safe、dedupe | integration | `pnpm vitest run .../handlers/plugin-data.test.ts` | ❌ Wave 0 |
| ACCESS-02 | lifecycle/kill-switch 越权经治理门拒（第 7 类） | unit | `pnpm vitest run .../governance-gate.test.ts` | ❌ Wave 0 |
| ACCESS-03 | schoolId session 注入、payload 带 schoolId → cross_school_rejected | unit | `pnpm vitest run .../facade.test.ts` | ❌ Wave 0 |
| D-06 | 白名单"重新编译无 diff"零漂移 | gate | `pnpm verify:phase68`（重跑 compile + git diff 断言） | ❌ Wave 0 |
| D-05 | aggregate 仅 count+groupBy(白名单列)；非聚合列 → unindexed/unknown 拒 | unit | `pnpm vitest run .../read-verbs.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run src/features/platform-core/plugin-data-access`
- **Per wave merge:** `pnpm verify:phase68`（负样本契约 + 漂移闸门）
- **Phase gate:** `pnpm verify:phase68` 全绿 + 既有 `verify:phase67`（migration-proof）仍绿 → `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `scripts/verify-phase68-data-access-verbs.ts` — 1 合法动词 + 7 非法各断言特定拒因 + audit（D-08）
- [ ] `src/db/schema/generated/plugin-owned/data-access-allowlist.ts` — 编译期派生白名单 const（checked-in）
- [ ] `scripts/compile-plugin-data-model.ts` 扩展 — 产出 allowlist + "重新编译无 diff" 断言
- [ ] `src/features/platform-core/plugin-data-access/{facade,contracts,governance-gate,read-verbs}.test.ts`
- [ ] `src/features/platform-core/commands/handlers/plugin-data.test.ts` — 写动词 bus 持久化/replay
- [ ] **A1 spike**：drizzle-zod `createInsertSchema` 在 zod v4 + SQLite text-enum 下行为验证
- [ ] `package.json`：新增 `verify:phase68` + 更新 `verify:phase` alias
- [ ] 框架安装：无需（vitest/tsx 已在）

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | session→schoolId 注入 + imperative governance gate（lifecycle/kill-switch/越权）；插件不可跨校（D-08 ④⑦） |
| V5 Input Validation | yes | `z.discriminatedUnion("verb").strict()` + drizzle-zod 派生 schema + 编译期白名单双闸（D-08 ①②③⑤⑥） |
| V6 Cryptography | no | 无加密需求 |
| V2/V3 Auth/Session | partial（上游） | schoolId/actor 来自既有认证 session，本 phase 只消费不实现 |

### Known Threat Patterns for 受治理数据访问层
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL 注入（裸 SQL/`sql\`\``/DDL 偷渡） | Tampering | drizzle 参数化 only；payload `.strict()` 拒字符串 SQL → `raw_sql_rejected`（D-08 ①） |
| 自由 where / 任意过滤 = 越权读 | Information Disclosure | 只暴露白名单 scope-key + 已建索引列 → `free_where_rejected`/`unindexed_column_rejected`（D-08 ②⑥） |
| 跨校 schoolId 越权 | Elevation of Privilege | schoolId 恒 session 注入；payload 带 schoolId 即拒 → `cross_school_rejected`（D-08 ④） |
| 任意表/列名探测 | Information Disclosure | 编译期白名单 → `unknown_table_rejected`/`unknown_column_rejected`（D-08 ③） |
| kill-switch/未安装插件仍写库 | Tampering | governance gate 前置（D-08 ⑦） |
| 写半边第二真相（Redis/WS 落权威） | Repudiation/Tampering | 只 Command Bus→DAL→SQLite（Pitfall #2/#8） |

## Sources

### Primary (HIGH confidence)
- `src/features/platform-core/commands/{contracts,registry,bus}.ts` — command 类型/payload/注册/dispatch 机制（写动词接入点，D-02）
- `src/features/platform-core/plugins/governance-projection.ts` — lifecycle/kill-switch/blocked 投影（gate 复用，D-08 ⑦）
- `src/features/platform-core/actions/{registry,static-catalog,contracts}.ts` — 确认 registry 仅 read-model、无 imperative authorize（Pattern 4 缺口依据）
- `src/db/schema/generated/plugin-owned/quiz.ts` + `src/lib/dto/plugin-data-model.ts` + `scripts/compile-plugin-data-model.ts` — Phase 67 生成表/meta-schema/编译链（白名单来源，D-06）
- `src/lib/dal/{plugins,plugin-data}.ts` — governanceAudits 写入路径 + assertActiveTeacher scope 范式（D-04/ACCESS-03）
- `scripts/verify-phase67-plugin-owned-data.ts` — 负样本+漂移闸门范式（D-08 验收范式来源）
- `package.json` — 依赖版本 + verify:phase* 脚本约定（已验证）
- `.planning/phases/68-.../68-CONTEXT.md` + `.../67-.../67-CONTEXT.md` — 锁定决策 D-01..D-13

### Secondary (MEDIUM confidence)
- npm registry（2026-06-02）：drizzle-zod latest 0.8.3 — 与 package.json 一致
- `.planning/research/{ARCHITECTURE,PITFALLS,STACK}.md` — Command Bus/truth-source 裁决、Pitfall #2/#6/#8、drizzle-zod 选型

### Tertiary (LOW confidence)
- drizzle-zod `createInsertSchema` 在 zod v4 + SQLite text-enum 下的精确行为（A1，标记 Wave 0 spike 验证）

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 全部依赖已安装、版本经 package.json + npm 双验；drizzle-zod 兼容性 MEDIUM（库内首用，A1）
- Architecture: HIGH — 所有复用点（Command Bus/registry/governance 投影/audit/生成 schema）均逐文件读证
- Pitfalls: HIGH — 直接映射 research PITFALLS #2/#6/#8 + Phase 67 已验范式
- 唯一缺口（imperative governance gate）已明确定位并给出复用方案

**Research date:** 2026-06-02
**Valid until:** 2026-07-02（内部代码契约稳定；唯一外部变量 drizzle-zod 版本，7 天内复查若 minor bump）
