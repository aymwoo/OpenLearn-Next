# Phase 67: Declarative Plugin-Owned Data Model & Migration-Proof - Research

**Researched:** 2026-06-02
**Domain:** 声明式 schema DSL → Zod meta-schema 校验 → 编译器产出 Drizzle 生成片段 → drizzle-kit checked-in 迁移 → migration-proof 静态闸门（SQLite / Next.js 16 / Drizzle ORM 0.45）
**Confidence:** HIGH（核心链路全部基于本仓库实证；新增库版本经 npm registry 核验）

<user_constraints>
## User Constraints (from CONTEXT.md)

> 逐字摘自 `.planning/phases/67-.../67-CONTEXT.md`。planner / executor 必须遵守，不得另寻替代。

### Locked Decisions

**已锁定前提（来自 REQUIREMENTS 开放问题裁决）**
- **L-1:** 作答用**结构化自有表**，非 JSON 袋子。
- **L-2:** 首发题型**仅单选**。
- **L-3:** 同 `pluginKey` 重装为**接管**语义（复用既有 `pluginRegistration_school_pluginKey_unique`）。
- **L-4:** 编译器产出**独立生成 schema 片段**，不改手写 `schema.ts`。
- **L-5:** migration-proof 闸门**扩展覆盖**插件自有表。
- **L-6:** per-plugin 表为**编译式**（compile-time），非运行时动态建表。

**字段类型集合与 JSON 列（DATA-01）**
- **D-01:** 允许列类型仅 `text` / `integer` / `boolean` / `timestamp` / `enum`（具名常量数组）。
- **D-02:** **禁 `json` / `blob` 列**——payload 必须拆成具名字段。这是把「结构化表契约」落到 DDL 层的硬约束；放 json 列即 Pitfall #1（袋子）复活。
- **D-03:** meta-schema 对每个字段强制 `type` + `notNull`，可选标量 `default`。`enum` 因 SQLite 无原生类型，编译为 `text` + 应用层（drizzle enum 约束）+ 可选 CHECK；不引入运行时枚举表。

**编译器工作流形态（DATA-02）**
- **D-04:** 新增 `pnpm plugin:compile` 脚本：读各插件 `dataModel` 声明 → 生成 `src/db/schema/generated/plugin-owned/<pluginKey>.ts`（drizzle table 定义）→ 由 `generated/index.ts` barrel re-export。
- **D-05:** 主 `src/db/schema.ts` 仅 `export * from './schema/generated'`（或等价聚合），**手写部分零改动**；drizzle-kit 通过该 barrel 发现生成表。
- **D-06:** 编译后照常 `pnpm db:generate`(drizzle-kit) 产 checked-in 迁移 → `pnpm db:migrate` 应用。两步手动、运行时零 DDL。
- **D-07:** 生成目录纳入 git（checked-in）；CI/`verify:phase` 校验「重新编译无 diff」防漂移（generated 产物与声明源同步）。

**静态零-DDL 闸门（DATA-02 / DATA-04）**
- **D-08:** `verify:phase` 加 `scripts/gate-no-runtime-ddl.ts`：ripgrep 扫运行时目录（`src/app/`、`src/server/`、`src/lib/`、`src/features/`、`src/actions/`、`plugins/`）。
- **D-09:** 命中即 fail 的模式：`CREATE TABLE` / `ALTER TABLE` / `DROP TABLE` / `` sql`...CREATE `` 拼接 / `db.run(`/`db.exec(` 接裸 DDL。白名单仅 `src/db/migrations/**` 与 `src/db/schema/generated/**`（后者是声明产物，非运行时执行）。

**命名前缀与索引约定（DATA-03）**
- **D-10:** 物理表名 `plugin_owned_<pluginKey>_<table>`（如 `plugin_owned_quiz_questions` / `plugin_owned_quiz_responses`）；meta-schema 强制前缀，缺前缀边界处拒绝。
- **D-11:** 每表强制 `schoolId notNull` + `onDelete:cascade` 到 `schools`；禁止向 core 表加出向 FK（仅允许 `schoolId → schools`，其余 scope 列为软关联文本，不加跨表 FK 以保隔离）。
- **D-12:** scope 复合索引列序 `(schoolId, classroomSession, student, question)`；答题表唯一约束 `(classroomSession, student, question)`，支撑 Phase 69 的 append-only/isLatest 去重（重复提交更新 latest，不重复计入分母）。

**dataVersion 演进边界（DATA-04）**
- **D-13:** 本 phase **新增** `pluginRegistrations.dataVersion`（integer，default 1）字段——经核验现 schema **尚无**此字段，需在本 phase 加列并迁移。本 phase 只落「首次声明 → 建表 → 记录基线 dataVersion」。真正的 semver backfill→verify→cutover 升级演进留给 **Phase 71**。

### the agent's Discretion
- meta-schema 内部组织（单文件 vs 拆模块）、生成代码的具体模板风格、ripgrep 规则文件格式：planner/executor 自定，只要满足 D-01..D-13 与 Success Criteria。
- enum 用 drizzle text-enum vs CHECK 约束的最终取舍：实现时择优，二者均满足「结构化、可校验」。

### Deferred Ideas (OUT OF SCOPE)
- 受治理读写动词（白名单具名/Zod/参数化/Command Bus 审计）— **Phase 68**（ACCESS-01..03）。
- 老师配置单选 + 学生作答 append-only/isLatest 落 `plugin_owned_*` 表 — **Phase 69**（QUIZ-01..03）。
- 题目统计只读投影（正确率/选项分布/作答人数，SQL GROUP BY）— **Phase 70**（STATS-01..02）。
- semver backfill→verify→cutover 零丢失升级 + retain/cleanup 卸载 — **Phase 71**（MKT-01..05），消费 D-13 的 `dataVersion` 基线。
- 端到端 `verify:phase` close gate — **Phase 72**（GATE-01）。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description（摘自 REQUIREMENTS.md） | Research Support |
|----|-------------|------------------|
| DATA-01 | 插件 manifest 能声明结构化 `dataModel`（表/字段/类型/约束），由 Zod meta-schema 校验，非法声明边界处被拒，禁表达任意 SQL/DDL。 | §Standard Stack（Zod 4 / drizzle-zod）、§Code Examples（meta-schema + 5 类负样本拒因）、§Pitfall #1/#3 |
| DATA-02 | 声明式 `dataModel` 在开发/发布期编译为受治理 Drizzle 定义并产 checked-in 迁移（独立片段，不注入手写 `schema.ts`）；运行时绝不执行 DDL。 | §Architecture Patterns（编译器 pipeline + barrel 发现 + drizzle-kit）、§Code Examples（生成模板/迁移格式）、§Pitfall #3 |
| DATA-03 | 每表带命名空间隔离（基于 `dbNamespace`/`pluginId`），避免跨插件命名冲突，每行可归属 school/course/session 防跨域泄漏。 | §Architecture（`plugin_owned_<pluginKey>_<table>` + `deriveDbNamespace`）、§Code Examples（scope 复合索引/唯一约束）、§Pitfall #2 |
| DATA-04 | `verify:phase` migration-proof close gate 扩展覆盖新增插件自有表，保证声明 schema ↔ 物理表 ↔ 迁移三者一致、无漂移、无运行时 DDL。 | §Architecture（复用 `materializeDrizzleMigrations`）、§Validation Architecture、§Code Examples（PRAGMA 断言 + 无-diff 漂移检查）、§Pitfall #4 |
</phase_requirements>

## Summary

本 phase 的技术核心**不是发明新机制，而是把仓库里已经成熟的四条链路拼成一条「compile, don't execute」流水线**：(1) Zod 校验（`src/lib/dto/resource-ai.ts` 的 `PluginManifestSchema` 已是范式）；(2) Drizzle SQLite 表定义（`plugin_ext_*` / `plugin_owned_business_data` 已是逐字可抄的模板）；(3) drizzle-kit `generate` + `tsx prepare-dev-db.ts` 应用迁移（已在 `package.json`/`drizzle.config.ts` 落地）；(4) migration-proof 物理断言闸门（`scripts/verify-phase45-plugin-schema.ts` + `scripts/lib/sqlite-migration-proof.ts` 的 `materializeDrizzleMigrations` 已是可扩展模板）。Phase 67 的真正新增物只有三样：一个 **Zod meta-schema（dataModel DSL 校验器）**、一个 **代码生成器（`pnpm plugin:compile`）**、一个 **静态零-DDL ripgrep 闸门（`scripts/gate-no-runtime-ddl.ts`）**，外加 `pluginRegistrations.dataVersion` 一列 + 其 ALTER 迁移。

仅需引入两个新库，且均已经 npm registry 核验、peer deps 与现仓库兼容：`semver@7.8.1`（本 phase 仅写 `dataVersion=1` 基线，semver 比较逻辑实际消费在 Phase 71，可现在装入但最小使用）与 `drizzle-zod@0.8.3`（从生成的 Drizzle 表派生 insert/select Zod schema，供 Phase 68 动词层「与表同源校验」，本 phase 可选择性预接线）。**没有 ajv / knex / umzug / 任何运行时 schema 引擎**——这是硬红线。

**Primary recommendation:** 先在 `schema.ts` 末尾追加 `export * from "./schema/generated"`（D-05，barrel 发现），再写 meta-schema + 生成器 + 把一个 quiz 样板 `dataModel` 编译进 `generated/plugin-owned/quiz.ts`，然后 `drizzle-kit generate` 产出**追加在 journal idx=5** 的新迁移（含 `dataVersion` ALTER 与两张 `plugin_owned_quiz_*` CREATE），最后克隆 phase45 验证脚本扩展物理断言 + 新增 ripgrep 闸门，把 `verify:phase` 从 `verify:phase65` 改指 `verify:phase67`。

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `dataModel` DSL 校验（meta-schema） | 构建期 / DTO 层（`src/lib/dto/**`） | — | 复用既有 Zod DTO 边界范式；纯函数、无 DB、无 server-only，便于负样本单测 |
| 声明 → Drizzle 片段编译 | 构建脚本（`scripts/` + `pnpm plugin:compile`） | 生成产物 `src/db/schema/generated/**` | 编译式（L-6/D-04），绝不在 runtime tier 出现 |
| schema 发现聚合 | DB schema 层（`src/db/schema.ts` barrel） | ORM 层（`src/db/index.ts`） | drizzle-kit + drizzle 都以 `import * as schema from "./schema"` 为唯一表面 |
| 迁移生成/应用 | 构建脚本（drizzle-kit / `prepare-dev-db.ts`） | checked-in `drizzle/**` | DDL 只活在迁移文件 + 应用脚本，runtime 永不触碰 |
| 零-DDL 静态闸门 | 验证脚本（`scripts/gate-no-runtime-ddl.ts`） | `verify:phase` | 防御性扫描，属 CI/验收 tier，不属产品运行路径 |
| migration-proof 物理断言 | 验证脚本（克隆 phase45） | 临时 SQLite（`/tmp/opencode`） | 物理 PRAGMA 断言需真库 materialize，隔离于生产库 |
| `dataVersion` 基线列 | DB schema 手写区 + 迁移 | DAL（`plugins.ts` 注册写入默认 1） | 唯一允许改动的手写 schema 点（D-13） |

## Standard Stack

### Core（本 phase 新增）
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-zod` | `0.8.3` | 从生成的 Drizzle 表派生 `createInsertSchema`/`createSelectSchema`，实现「表 ↔ Zod 同源」 | `[VERIFIED: npm view drizzle-zod version → 0.8.3]` 官方 drizzle 生态包；peer deps `drizzle-orm>=0.36.0`（仓库 0.45.2 ✓）、`zod ^3.25.0 || ^4.0.0`（仓库 zod 4.4.x ✓）`[VERIFIED: npm view drizzle-zod peerDependencies]` |
| `semver` | `7.8.1` | `dataVersion` / manifest version 的语义化比较（本 phase 仅写基线 1，比较逻辑 Phase 71 消费） | `[VERIFIED: npm view semver version → 7.8.1]` 与 CONTEXT D 锁定 `^7.8.1` 一致；事实标准 semver 实现 |

### Supporting（已在仓库，复用不新增）
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^4.4.x` | meta-schema DSL 校验主体 | DATA-01 全部校验逻辑 `[VERIFIED: AGENTS.md STACK + drizzle-zod peer 兼容]` |
| `drizzle-orm` | `^0.45.2` | 生成片段里的 `sqliteTable`/`text`/`integer`/`uniqueIndex` | 编译器输出目标 `[VERIFIED: package.json]` |
| `drizzle-kit` | `^0.31.10` | `generate` 产 checked-in 迁移 | D-06 迁移生成 `[VERIFIED: package.json]` |
| `@libsql/client` | `^0.17.x` | migration-proof 临时库 materialize | DATA-04 物理断言 `[VERIFIED: scripts/verify-phase45 import]` |
| `tsx` | 现有 | 运行编译器 + 迁移脚本 + 验证脚本 | 全链路脚本 runner `[VERIFIED: package.json scripts]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff（为何不用） |
|------------|-----------|----------|
| 编译式生成片段 | 运行时 `db.run("CREATE TABLE ...")` | **红线禁止**（L-6/D-08/D-09），且 SQLite 运行时 DDL 破坏 migration 真相源 |
| drizzle-zod | 手写 Zod 镜像每张表 | 漂移风险高；drizzle-zod 保证表/校验同源（Phase 68 强需求） |
| Zod meta-schema | ajv / JSON Schema | CONTEXT 明令 `NO ajv`；仓库已统一 Zod 边界 |
| drizzle-kit `generate` | umzug / knex migrations | CONTEXT 明令禁止；破坏既有 journal 模型 |
| `text({enum:[...]})` | 运行时枚举表 | D-03 明令不引入运行时枚举表；SQLite 无原生 enum，text-enum 是 core 既有范式 |

**Installation:**
```bash
pnpm add semver@^7.8.1 drizzle-zod@^0.8.3
pnpm add -D @types/semver   # semver 无内置类型
```

**Version verification（已执行）:**
- `npm view semver version` → `7.8.1`（与 D 锁定 `^7.8.1` 一致）`[VERIFIED]`
- `npm view drizzle-zod version` → `0.8.3`（与 D 锁定 `^0.8.3` 一致）`[VERIFIED]`
- `npm view drizzle-zod peerDependencies` → `{ drizzle-orm: '>=0.36.0', zod: '^3.25.0 || ^4.0.0' }` → 与仓库 `drizzle-orm@0.45.2` + `zod@4.4.x` 全兼容 `[VERIFIED]`

## Architecture Patterns

### System Architecture Diagram

```
插件源码内 dataModel 声明 (TS 常量, 形如 manifest.dataModel)
        │
        ▼
[1] Zod meta-schema 校验  (src/lib/dto/plugin-data-model.ts, 纯函数)
        │  ├─ 合法 → 归一化的 TableSpec[]
        │  └─ 非法 → 抛特定拒因 (5 类负样本, 边界拒绝)  ──► DATA-01
        ▼
[2] 编译器  `pnpm plugin:compile`  (scripts/compile-plugin-data-model.ts)
        │   读 dataModel → 渲染 Drizzle 表定义字符串
        ▼
   生成产物 (checked-in, git 跟踪)
   src/db/schema/generated/plugin-owned/<pluginKey>.ts   (sqliteTable 定义)
   src/db/schema/generated/index.ts                       (barrel re-export)  ──► DATA-02
        │
        ▼
[3] 聚合发现:  src/db/schema.ts  ──(末尾) export * from "./schema/generated"
        │                         └─► src/db/index.ts: drizzle({ schema })
        ▼
[4] drizzle-kit generate  (新增 pnpm db:generate)
        │   读 schema 表面 → diff 上一快照 → 产 drizzle/NNNN_phase67_*.sql
        │   (含 plugin_owned_quiz_* CREATE + pluginRegistration.dataVersion ALTER)
        ▼
   checked-in 迁移 drizzle/*.sql  +  drizzle/meta/_journal.json (append idx=5)  ──► DATA-02
        │
        ▼
[5] pnpm db:migrate  (tsx prepare-dev-db.ts) ── 唯一 DDL 执行点, 构建期
        ▼
   物理 SQLite (local.db)
        │
        ▼
[6] verify:phase 闸门 (verify-phase67-*.ts)
   ├─ gate-no-runtime-ddl.ts (ripgrep 运行时目录, 命中 CREATE/ALTER/db.run 即 fail)  ──► DATA-02/04
   ├─ 重新编译无 diff 漂移检查 (plugin:compile → git diff --exit-code generated/)   ──► DATA-04
   └─ materializeDrizzleMigrations → PRAGMA table_info/index_list 断言物理表/索引   ──► DATA-04
```

**关键数据流不变量：** DDL 字符串只在 `[4]→[5]`（`drizzle/*.sql` + `prepare-dev-db.ts`）出现；`[1][2]` 产出的是 TS 声明而非可执行 SQL；运行时 tier（app/server/lib/features/actions/plugins）**零** DDL。

### Recommended Project Structure
```
src/db/
├── schema.ts                          # 手写区零改 + (D-13) 加 dataVersion 列 + (末尾) barrel 聚合
├── index.ts                           # 不动: import * as schema from "./schema"
└── schema/
    └── generated/                     # checked-in 生成产物 (静态闸门白名单)
        ├── index.ts                   # export * from "./plugin-owned/quiz" ...
        └── plugin-owned/
            └── quiz.ts                # 编译产出的 sqliteTable 定义
src/lib/dto/
└── plugin-data-model.ts               # Zod meta-schema (dataModel DSL 校验) + 负样本拒因常量
scripts/
├── compile-plugin-data-model.ts       # pnpm plugin:compile 入口 (生成器)
├── gate-no-runtime-ddl.ts             # ripgrep 零-DDL 静态闸门
└── verify-phase67-plugin-owned-data.ts # 克隆 phase45: 物理断言 + 漂移 + gate 编排
drizzle/
├── 0016_phase67_plugin_owned_data.sql # 新迁移 (CREATE plugin_owned_quiz_* + ALTER dataVersion)
└── meta/_journal.json                 # append idx=5 (由 drizzle-kit 自动维护)
```

### Pattern 1: barrel 发现（D-05，schema 表面零侵入）
**What:** drizzle-kit 与 drizzle ORM 都只认 `drizzle.config.ts` 的 `schema: './src/db/schema.ts'` 与 `src/db/index.ts` 的 `import * as schema from "./schema"`。生成片段要被发现，唯一干净做法是在**手写 `schema.ts` 末尾**加一行 `export * from "./schema/generated"`。
**When to use:** 始终。这一行是「手写区零改动」与「生成表可发现」之间的唯一桥。
**Why（实证）:** `drizzle.config.ts` 为单文件 `schema: './src/db/schema.ts'`；`src/db/index.ts` 为 `import * as schema from "./schema"`。改 config 成数组也可，但末尾 re-export 改动面更小、对 drizzle-kit 快照 diff 更稳。`[VERIFIED: drizzle.config.ts + src/db/index.ts]`
**Anti-pattern:** 让生成器把表定义**注入手写 `schema.ts` 主体**——违反 L-4/D-05，且破坏 phase45 静态断言对手写区的字符串匹配。

### Pattern 2: 生成片段逐字对齐 core 既有表（D-10/D-11/D-12）
**What:** 生成的 `plugin_owned_<pluginKey>_<table>` 表定义，结构与 `plugin_owned_business_data`（schema.ts:1883）一模一样的形态：`id` text PK `$defaultFn(crypto.randomUUID)` / `schoolId` notNull cascade → schools / scope 列 text / 标量字段 / `createdAt`+`updatedAt` timestamp_ms / 复合 `uniqueIndex`。
**When to use:** 编译器渲染每张表时。
**Why:** core 已有四张同构表，phase45 验证脚本已逐字断言其列名/索引名/cascade。生成片段照抄 = 验证扩展只需复制断言数组。`[VERIFIED: schema.ts:1811-1903 + verify-phase45:221-242]`

### Pattern 3: 迁移追加到 journal 尾部（非顺序 tag 雷区）
**What:** 新迁移文件由 `drizzle-kit generate` 自动产出并 append 到 `drizzle/meta/_journal.json`，成为 `idx=5`。
**Why（雷区实证）:** journal 的 `idx` 与文件名 tag 号**不对应**（idx0=`0000`、idx1=`0012_phase53`、idx2=`0002_daffy`、idx3=`0014_phase63`、idx4=`0015_phase64`），且 `drizzle/` 下存在**未进 journal 的重复 `0013_*` 文件**。`materializeDrizzleMigrations` 严格**按 journal idx 顺序 replay**。因此：必须用 `drizzle-kit generate` 让其自行决定 tag/idx，**绝不手动命名 `0016` 或手编 journal**，否则 replay 顺序错乱。`[VERIFIED: drizzle/meta/_journal.json + ls drizzle/*.sql]`

### Pattern 4: enum → text + 可选 CHECK（D-03，SQLite 无原生 enum）
**What:** meta-schema 的 `enum` 字段类型编译为 `text("col", { enum: [...] as const })`，可选叠加 SQLite `CHECK`。
**Why:** core schema 一律用 `text({enum:[...]})`（如 `pluginRegistrations.lifecycleState`），无运行时枚举表。`[VERIFIED: schema.ts:1252]`

### Anti-Patterns to Avoid
- **json/blob 逃生舱:** 任何 `text(col,{mode:"json"})` 或 `blob` 列出现在生成片段 → 违反 D-02，meta-schema 必须在 [1] 即拒。core 的 `payloadJson` 是历史袋子，**新 owned 表禁止复制该模式**。
- **向 core 表加出向 FK:** 生成片段里出现 `references(() => lessons.id ...)` 等 → 违反 D-11；仅允许 `schoolId → schools`。
- **手动改 journal / 手命名迁移 tag:** 见 Pattern 3。
- **把 `verify:phase` 留在 `verify:phase65`:** 必须改指 `verify:phase67`（D-04/D-07/D-08 闸门否则不跑）。`[VERIFIED: package.json "verify:phase": "pnpm verify:phase65"]`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 迁移生成 | 自写 SQL diff 引擎 | `drizzle-kit generate` | 已有快照/journal 模型；自写必漂移 |
| 迁移 replay 校验 | 自写 SQLite 加载器 | `materializeDrizzleMigrations`（`scripts/lib/sqlite-migration-proof.ts`） | 已正确处理非顺序 journal replay `[VERIFIED]` |
| 物理表/索引断言 | 自写 schema introspection | `PRAGMA table_info` / `PRAGMA index_list`（phase45 已封装 `assertIndex`） | 已是 close-gate 范式 `[VERIFIED: verify-phase45:98-117]` |
| cascade 正确性 | 假设 FK 生效 | `PRAGMA foreign_key_check` + 真删除断言行数 | phase45 已用「删 → 数行」行为优先证明 `[VERIFIED: verify-phase45:157-197]` |
| 表 ↔ 校验同源 | 手写 Zod 镜像 | `drizzle-zod` `createInsertSchema` | 防漂移；Phase 68 动词层强依赖 |
| semver 比较 | 字符串/正则比版本 | `semver` 库 | 预发布/范围/边界 case 极多 |
| 命名空间归一 | 新写 slug 函数 | `deriveDbNamespace`（`plugins.ts:32`） | 已有 `pluginKey → 安全 namespace` 实现，前缀规则与之对齐 `[VERIFIED]` |

**Key insight:** 本 phase 90% 是「组装已验证资产 + 写一个 DSL 校验器和一个字符串模板生成器」。真正从零写的代码只有 meta-schema、生成器模板、ripgrep 闸门三处；其余全是复制 phase45 断言数组 + 加一列 + 跑既有命令链。

## Runtime State Inventory

> 本 phase 含「新增 schema 列 + 新建表 + 改 `verify:phase` 别名」，属 schema 演进/迁移类，逐项核验运行时状态：

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `pluginRegistration` 现有行无 `dataVersion` 列；ALTER ADD `dataVersion integer DEFAULT 1 NOT NULL` 对既有行回填默认 1（D-13 基线语义） | **迁移 + 默认值**：drizzle ALTER 带 `DEFAULT 1 NOT NULL`，既有行自动得 1，无需单独数据迁移脚本 |
| Live service config | 无外部 live config 嵌该字段（`dataVersion` 是新概念，无历史 UI/外部系统引用） | None — 经核验为新增字段 |
| OS-registered state | 无（无 Task Scheduler / pm2 / systemd 引用 `dataVersion` 或新表名） | None — 纯仓库内变更 |
| Secrets/env vars | 无新 secret/env；`DB_FILE_NAME` 复用既有 | None |
| Build artifacts / 脚本入口 | `package.json` 缺 `db:generate` 与 `plugin:compile` 脚本（**均不存在**，须新增）；`verify:phase` 现别名 `verify:phase65`（须改 `verify:phase67`）；新生成目录 `src/db/schema/generated/**` 须建并纳入 git；`@types/semver` 须装 | **新增/修改 package.json 脚本 + 建生成目录 + 装 semver/drizzle-zod/@types/semver** `[VERIFIED: grep package.json → 仅 db:migrate / verify:phase 存在]` |

**显式结论：** 唯一需要的「数据迁移」是 `dataVersion` 的 ALTER + DEFAULT（drizzle 自动覆盖既有行），**无需**额外回填脚本；其余全是构建期工件新增。

## Common Pitfalls

### Pitfall 1: JSON 袋子复活（Pitfall #1 / D-02）
**What goes wrong:** 为图省事在生成片段放 `payloadJson text json` 列，结构化表退化成 KV 袋子，DATA-01「结构化契约」名存实亡。
**Why it happens:** core 既有 `plugin_owned_business_data.payloadJson` 是历史袋子，容易被当模板照抄。
**How to avoid:** meta-schema 在 [1] 即拒 `json`/`blob` 类型（D-01 白名单只有 5 类标量）；负样本测试「出现 json/blob 列 → 特定拒因」常驻 `verify:phase`。
**Warning signs:** 生成片段里出现 `{ mode: "json" }`。

### Pitfall 2: 跨域泄漏 / 隔离不变量缺失（Pitfall #2 / D-11/D-12）
**What goes wrong:** 漏 `schoolId notNull` 或漏 cascade，删 school 后遗留孤儿行；或 scope 列序错导致 Phase 69/70 查询走全表扫。
**How to avoid:** meta-schema 强制每表含 `schoolId`（缺即拒，负样本第 4 类）；生成器固定输出 `schoolId ... cascade → schools` + `(schoolId, classroomSession, student, question)` 复合索引 + 答题表 `(classroomSession, student, question)` 唯一约束。验证脚本用 `PRAGMA foreign_key_check` + 删 school 断言行数为 0。
**Warning signs:** `foreign_key_check` 非空；生成片段缺 schoolId。

### Pitfall 3: 动态 DDL 偷渡（Pitfall #3 / D-08/D-09）
**What goes wrong:** 某处 `db.run(\`CREATE TABLE ...\`)` 或 `sql\`...CREATE...\`` 拼接绕过迁移，运行时建表，破坏 migration 真相源与离线可重放性。
**How to avoid:** `scripts/gate-no-runtime-ddl.ts` ripgrep 扫 6 个运行时目录，命中 `CREATE TABLE|ALTER TABLE|DROP TABLE|db.run(|db.exec(` 接 DDL 即 fail；白名单只放 `src/db/migrations/**`（注意：**仓库真实迁移目录是 `drizzle/`**，见 Open Questions #1）与 `src/db/schema/generated/**`。
**Warning signs:** 闸门红；运行时目录出现裸 SQL 模板字符串。

### Pitfall 4: dataVersion / 迁移漂移（Pitfall #4 / D-07/D-13）
**What goes wrong:** 改了 `dataModel` 声明但忘了重跑 `plugin:compile`，生成片段与声明不同步；或忘 `drizzle-kit generate`，物理表与 schema 漂移。
**How to avoid:** `verify:phase` 跑「重新编译无 diff」——`plugin:compile` 后 `git diff --exit-code src/db/schema/generated/`，有 diff 即 fail（D-07）；再 `materializeDrizzleMigrations` 断言物理表存在（声明↔迁移↔物理三对齐，DATA-04）。
**Warning signs:** CI 报 generated/ 有未提交 diff。

### Pitfall 5: journal 非顺序导致 replay 错乱（实证雷区）
**What goes wrong:** 手动命名新迁移 `0016` 或手编 journal，与既有非顺序 idx 冲突，`materializeDrizzleMigrations` replay 顺序错。
**How to avoid:** 只用 `drizzle-kit generate` 产迁移 + append journal；人不碰 journal。见 Architecture Pattern 3。

## Code Examples

### meta-schema 骨架 + 5 类负样本拒因（DATA-01）
```typescript
// src/lib/dto/plugin-data-model.ts  (纯函数, 无 server-only, 便于负样本单测)
import { z } from "zod";

const COLUMN_TYPES = ["text", "integer", "boolean", "timestamp", "enum"] as const; // D-01 白名单
const OWNED_TABLE_PREFIX = "plugin_owned_";                                        // D-10

const ColumnSpecSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  type: z.enum(COLUMN_TYPES),            // D-03: 强制 type
  notNull: z.boolean(),                  // D-03: 强制 notNull
  default: z.union([z.string(), z.number(), z.boolean()]).optional(), // 仅标量 default
  enumValues: z.array(z.string()).min(1).optional(), // type=enum 时必填 (superRefine 校验)
}).strict()                              // 负样本#1: strict 拒未知键 (含夹带的 sql/ddl/json 键)
  .superRefine((col, ctx) => {
    if (col.type === "enum" && (!col.enumValues || col.enumValues.length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ENUM_REQUIRES_VALUES", path: ["enumValues"] });
    }
    // 负样本#5: json/blob 不在 COLUMN_TYPES, z.enum 已在边界拒 → "INVALID_COLUMN_TYPE"
  });

const TableSpecSchema = z.object({
  name: z.string().startsWith(OWNED_TABLE_PREFIX, "MISSING_OWNED_PREFIX"), // 负样本#2
  columns: z.array(ColumnSpecSchema).min(1),
  // 负样本#3: 无 foreignKeys 字段 → strict 拒任何 core-table FK 表达
  // 负样本#4: superRefine 校验 columns 必含 name==="schoolId"
}).strict().superRefine((table, ctx) => {
  if (!table.columns.some((c) => c.name === "schoolId" && c.notNull)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "MISSING_SCHOOL_SCOPE", path: ["columns"] }); // 负样本#4
  }
  // 负样本#1 加固: 扫所有字符串值, 命中 /\b(CREATE|ALTER|DROP)\b/i → "RAW_SQL_FORBIDDEN"
});

export const PluginDataModelSchema = z.object({
  tables: z.array(TableSpecSchema).min(1),
}).strict();
```
拒因常量（供 negative-sample 测试逐一断言）：`INVALID_COLUMN_TYPE`（json/blob，#5）、`MISSING_OWNED_PREFIX`（#2）、`RAW_SQL_FORBIDDEN`（#1）、`MISSING_SCHOOL_SCOPE`（#4）、`strict` unknown-key（#3 FK 偷渡）。

### 生成片段模板（编译器输出，照抄 core 范式）
```typescript
// src/db/schema/generated/plugin-owned/quiz.ts  —— pnpm plugin:compile 产出, checked-in
// Source pattern: src/db/schema.ts:1883 pluginOwnedBusinessData (逐字对齐)
import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { schools } from "../../schema";            // 仅允许 schoolId → schools (D-11)
import { pluginRegistrations } from "../../schema";

export const pluginOwnedQuizResponses = sqliteTable(
  "plugin_owned_quiz_responses",                    // D-10 前缀
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }), // D-11
    pluginId: text("pluginId").notNull().references(() => pluginRegistrations.id, { onDelete: "cascade" }),
    classroomSession: text("classroomSession").notNull(), // scope 软关联文本, 不加跨表 FK (D-11)
    student: text("student").notNull(),
    question: text("question").notNull(),
    selectedOption: text("selectedOption", { enum: ["A", "B", "C", "D"] }).notNull(), // D-03 enum→text
    isLatest: integer("isLatest", { mode: "boolean" }).notNull().default(true),       // Phase 69 复用
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("plugin_owned_quiz_responses_scope_idx")
      .on(table.schoolId, table.classroomSession, table.student, table.question),      // D-12 列序
    uniqueIndex("plugin_owned_quiz_responses_dedupe_unique")
      .on(table.classroomSession, table.student, table.question),                      // D-12 去重
  ]
);
```

### dataVersion 列（D-13，唯一手写 schema 改动）
```typescript
// src/db/schema.ts  pluginRegistrations 块内 (现:1241-1264, 在 updatedAt 后加一行)
  dataVersion: integer("dataVersion", { mode: "number" }).notNull().default(1), // D-13 基线
```
`drizzle-kit generate` 将产出：`ALTER TABLE \`pluginRegistration\` ADD \`dataVersion\` integer DEFAULT 1 NOT NULL;`（既有行自动回填 1）。

### barrel 聚合（D-05）
```typescript
// src/db/schema.ts  文件末尾追加 (手写主体零改)
export * from "./schema/generated";
// src/db/schema/generated/index.ts
export * from "./plugin-owned/quiz";
```

### 零-DDL 静态闸门（D-08/D-09）
```typescript
// scripts/gate-no-runtime-ddl.ts  (ripgrep 调用; 命中即 exit 1)
import { execFileSync } from "node:child_process";
const RUNTIME_DIRS = ["src/app", "src/server", "src/lib", "src/features", "src/actions", "plugins"];
const DDL = "(CREATE\\s+TABLE|ALTER\\s+TABLE|DROP\\s+TABLE|db\\.run\\(|db\\.exec\\()";
// 白名单: src/db/schema/generated/** 与真实迁移目录 (见 Open Questions #1: drizzle/** vs src/db/migrations/**)
try {
  const hit = execFileSync("rg", ["-n", "--pcre2", DDL, ...RUNTIME_DIRS,
    "-g", "!**/*.test.ts"], { encoding: "utf8" });
  if (hit.trim()) { console.error("RUNTIME_DDL_FORBIDDEN:\n" + hit); process.exit(1); }
} catch (e: any) { if (e.status === 1) process.exit(0); /* rg exit 1 = 无命中 = 通过 */ throw e; }
```

### migration-proof 物理断言扩展（DATA-04，克隆 phase45）
```typescript
// scripts/verify-phase67-plugin-owned-data.ts  (复制 verify-phase45 骨架, 改断言数组)
const client = await materializeDrizzleMigrations(`file:${tmpDb}`); // 复用既有 harness
const tablesToCheck = [
  { name: "plugin_owned_quiz_responses",
    columns: ["id","schoolId","pluginId","classroomSession","student","question","selectedOption","isLatest"],
    indexes: [{ name: "plugin_owned_quiz_responses_dedupe_unique", unique: true }] },
];
// + PRAGMA foreign_key_check 删 school 断言级联; + dataVersion 列存在断言
// + 漂移: execFileSync("pnpm",["plugin:compile"]); execFileSync("git",["diff","--exit-code","src/db/schema/generated"])
// + 调 gate-no-runtime-ddl.ts
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 插件数据塞 core 表 `payloadJson` JSON 袋子（`plugin_ext_*`） | 结构化 `plugin_owned_*` 具名字段表 | v4.0 Phase 67 | 本 phase 的存在理由；新表禁 json 列 |
| 运行时动态建表设想 | 编译式生成片段 + checked-in 迁移 | v4.0 红线 | "compile, don't execute" |
| `drizzle-zod` 0.5.x（旧 API） | `0.8.3`（`createInsertSchema` 稳定，zod4 兼容） | 2026 | peer 已支持 zod4 `[VERIFIED: peerDeps]` |

**Deprecated/outdated:**
- 不要把新表当 `plugin_ext_*` 模式（那是核心表扩展袋子，不是插件自有结构表）。
- `verify:phase65` 别名为上一里程碑残留，本 phase 须前移至 `verify:phase67`。

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | drizzle-kit `generate` 会把 `dataVersion` ALTER 与 `plugin_owned_quiz_*` CREATE 合并进**同一个**新迁移文件 | Architecture/Code | 低 — 若拆成两文件，journal append 两条 idx 即可，replay 仍正确 |
| A2 | `@types/semver` 需单独安装（semver 无内置类型） | Standard Stack | 极低 — 若 7.8.x 已自带类型则 devDep 多余无害 |
| A3 | Phase 67 可仅装入 `drizzle-zod`/`semver` 而最小使用（实际消费在 68/71） | Summary | 低 — 装入即满足「依赖就位」；若 planner 决定本 phase 不接线，移到对应 phase 安装亦可 |
| A4 | meta-schema 用 `.strict()` + scope superRefine 足以覆盖 5 类负样本 | Code Examples | 低 — 实现时以 5 个 negative-sample 测试为验收，不足则补 refine |

**注：** 上述均为实现细节假设，不涉及合规/安全/保留策略类高风险假设。核心架构链路全部 `[VERIFIED]`。

## Open Questions

1. **静态闸门白名单的迁移目录真实路径**
   - What we know: `drizzle.config.ts` 的 `out: './drizzle'`，仓库迁移**实际在 `drizzle/`**；但 CONTEXT D-09 与 canonical_refs 写「白名单 `src/db/migrations/**`」。`[VERIFIED: drizzle.config.ts + ls drizzle/*.sql]`
   - What's unclear: 是要新建 `src/db/migrations/` 软链/迁移目录，还是把白名单写成真实的 `drizzle/**`。
   - Recommendation: **以真实路径 `drizzle/**` 为准**写进 `gate-no-runtime-ddl.ts` 白名单（外加 `src/db/schema/generated/**`）；planner 在 PLAN 中显式记此偏差，避免 executor 盲信 CONTEXT 的 `src/db/migrations/**`。

2. **drizzle-kit 是否会被 `drizzle/` 下未进 journal 的重复 `0013_*` 文件干扰**
   - What we know: `0013_phase51_*` 与 `0013_phase54_*` 两文件存在但都不在 journal；journal 只有 5 条。
   - What's unclear: `generate` 生成新迁移时是否对这些游离文件报错。
   - Recommendation: 执行时先 `drizzle-kit generate` 并人工核对只新增一条 journal idx=5；若报冲突，按 Pattern 3 仅信任 journal 顺序，不动游离文件。

3. **`pnpm db:generate` 脚本的确切命令形态**
   - What we know: 仓库无 `db:generate` 脚本，仅 `db:migrate`（`tsx --import ./scripts/node-shim.js scripts/prepare-dev-db.ts`）。`[VERIFIED: package.json]`
   - Recommendation: 新增 `"db:generate": "drizzle-kit generate"`（drizzle-kit 读 `drizzle.config.ts`）；若 node-shim 必要则比照 db:migrate 加 `--import`。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| drizzle-kit | `db:generate` 迁移 | ✓ | ^0.31.10 | — `[VERIFIED: package.json]` |
| @libsql/client | migration-proof 临时库 | ✓ | ^0.17.x | — `[VERIFIED: verify-phase45 import]` |
| tsx | 编译器/迁移/验证脚本 runner | ✓ | 现有 | — `[VERIFIED: package.json]` |
| ripgrep (`rg`) | 零-DDL 静态闸门 | 待装 | — | 若缺则用 Node `fs` + regex 扫目录（无外部依赖） |
| semver | dataVersion 比较 | ✗ | 须装 7.8.1 | 本 phase 仅写基线 1，可延后真正比较至 Phase 71 |
| drizzle-zod | 表↔Zod 同源 | ✗ | 须装 0.8.3 | 本 phase 可不接线（Phase 68 强需求） |

**Missing dependencies with no fallback:** 无硬阻断项。
**Missing dependencies with fallback:**
- `rg` 若不在 CI 镜像 → 闸门改用 Node `fs.readdirSync` 递归 + `RegExp`（无外部进程依赖，更可移植，planner 可直接选此方案规避 A）。

## Validation Architecture

> `nyquist_validation: true` → 本节生效。`[VERIFIED: .planning/config.json]`

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest（仓库既有，phase45 经 `runVitest` 直跑 `node_modules/vitest/vitest.mjs`） |
| Config file | 仓库既有 vitest 配置（phase45 已复用） |
| Quick run command | `pnpm exec vitest --run src/lib/dto/plugin-data-model.test.ts` |
| Full suite command | `pnpm verify:phase`（改指 `verify:phase67` 后：build + 物理断言 + 漂移 + 闸门 + 回归） |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | 合法 quiz 声明通过 + 5 类非法各给特定拒因 | unit（负样本集） | `vitest --run src/lib/dto/plugin-data-model.test.ts` | ❌ Wave 0 |
| DATA-02 | `plugin:compile` 产生成片段 + drizzle-kit 产迁移；运行时无 DDL | static gate | `tsx scripts/gate-no-runtime-ddl.ts` | ❌ Wave 0 |
| DATA-02 | 重新编译无 diff（声明↔生成同步） | static drift | `pnpm plugin:compile && git diff --exit-code src/db/schema/generated` | ❌ Wave 0 |
| DATA-03 | `plugin_owned_*` 物理表含 schoolId cascade + scope 复合索引 + 去重唯一约束 | integration（PRAGMA） | `tsx scripts/verify-phase67-plugin-owned-data.ts` | ❌ Wave 0 |
| DATA-04 | 声明↔物理↔迁移三对齐 + 删 school 级联 + foreign_key_check 净 | integration | `tsx scripts/verify-phase67-plugin-owned-data.ts` | ❌ Wave 0 |
| DATA-04 | `dataVersion` 列物理存在且默认 1 | integration（PRAGMA） | 同上 | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `vitest --run src/lib/dto/plugin-data-model.test.ts`（负样本快测，秒级）
- **Per wave merge:** `tsx scripts/verify-phase67-plugin-owned-data.ts`（物理 materialize + 断言）
- **Phase gate:** `pnpm verify:phase`（须先改别名）全绿后进 `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/dto/plugin-data-model.test.ts` — 1 合法 + 5 非法负样本（覆盖 DATA-01 五拒因）
- [ ] `scripts/gate-no-runtime-ddl.ts` — 零-DDL 静态闸门（DATA-02）
- [ ] `scripts/verify-phase67-plugin-owned-data.ts` — 物理断言 + 漂移 + foreign_key_check（DATA-03/04，克隆 verify-phase45）
- [ ] `package.json` 新增 `db:generate` / `plugin:compile` 脚本 + `verify:phase` 改指 `verify:phase67`
- [ ] 安装：`pnpm add semver@^7.8.1 drizzle-zod@^0.8.3` + `pnpm add -D @types/semver`

## Project Constraints (from AGENTS.md)

- **Drizzle + SQLite-first；所有 FK 含 `onDelete: cascade`** → 生成片段 `schoolId/pluginId` 强制 cascade（D-11 一致）。
- **禁 `drizzle-kit push` 作默认路径；迁移优先（`db:migrate`）** → D-06 链路严守 `generate`→`migrate`，不用 push。
- **整型 step position 禁用，用 rank 字符串** → 不直接相关；但 D-12 用复合唯一约束去重而非整型序，方向一致。
- **append-only 提交 + `isLatest`** → quiz responses 表预置 `isLatest`，Phase 69 复用（与 core `taskSubmissions` 范式一致）。
- **插件禁 `eval` / 禁直连 DB / 禁运行时任意代码** → D-08/D-09 零-DDL 闸门是该红线在「建表面」的落地。
- **UI 组件禁直连 DB，经 DAL/Server Actions** → 本 phase 不写 UI；owned 表读写动词归 Phase 68 DAL。
- **`verify:phase` 须在 success criteria 显式断言 no runtime DDL（compile-time Drizzle only）/ SQLite+DAL 单一真相** → 见 STATE.md Blockers；本 phase 闸门即此断言载体。

## Security Domain

> `security_enforcement` 未在 config 显式关闭 → 视为启用。本 phase 主要安全面是「声明边界注入」与「跨租户隔离」。

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Zod meta-schema 在边界拒非法 `dataModel`（DATA-01）；`.strict()` 拒未知键防字段偷渡 |
| V5 Injection | yes | 禁裸 SQL/DDL 字符串（D-09 ripgrep）；表/列名来自声明而非运行时拼接 |
| V4 Access Control | yes | 每行 `schoolId notNull` + cascade，跨校隔离（DATA-03/D-11）；scope 列支撑 session 维度归属 |
| V6 Cryptography | no | 本 phase 无加密面 |
| V2/V3 Auth/Session | no（间接） | 写入鉴权属 Phase 68 动词层（`assertActiveTeacher` 既有范式） |

### Known Threat Patterns for {Drizzle/SQLite 声明式 schema}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| dataModel 夹带 `CREATE/ALTER/DROP` 字符串 | Tampering / EoP | meta-schema `RAW_SQL_FORBIDDEN` 拒 + 运行时 ripgrep 闸门 |
| 缺命名空间前缀 → 跨插件表名撞库 | Tampering | `MISSING_OWNED_PREFIX` 拒 + `plugin_owned_<pluginKey>_` 强制 |
| 向 core 表加出向 FK → 越界耦合/隔离破坏 | EoP | `.strict()` 无 FK 字段；仅 `schoolId → schools` |
| 缺 schoolId scope → 跨租户读写泄漏 | Info Disclosure | `MISSING_SCHOOL_SCOPE` 拒 + 物理 cascade 断言 |
| json/blob 袋子 → 绕过结构化契约塞任意数据 | Tampering | `INVALID_COLUMN_TYPE` 拒（D-02） |

## Sources

### Primary (HIGH confidence) — 本仓库实证
- `src/db/schema.ts:1241-1264`（pluginRegistrations，无 dataVersion）/ `:1811-1903`（plugin_ext_* + plugin_owned_business_data 表范式）
- `src/lib/dal/plugins.ts:32`（`deriveDbNamespace`）/ `src/lib/dal/plugin-migration.ts`（backfill→verify→cutover 治理基线）
- `src/lib/dto/resource-ai.ts:671-710`（`PluginManifestSchema` superRefine 范式）
- `scripts/verify-phase45-plugin-schema.ts`（migration-proof close-gate 模板：PRAGMA 断言 + 行为优先级联证明 + 静态检查）
- `scripts/lib/sqlite-migration-proof.ts`（`materializeDrizzleMigrations` / `cleanupSqliteArtifacts`）
- `drizzle.config.ts`（`schema:'./src/db/schema.ts'` 单文件 / `out:'./drizzle'`）/ `src/db/index.ts`（`import * as schema`）
- `drizzle/meta/_journal.json` + `drizzle/0000_windy_metal_master.sql:596-649`（CREATE TABLE/索引迁移格式 + 非顺序 idx 实证）
- `package.json`（仅 `db:migrate` / `verify:phase`=`verify:phase65`；无 `db:generate` / `plugin:compile`）
- `.planning/REQUIREMENTS.md`（DATA-01..04 原文）/ `.planning/ROADMAP.md §Phase 67`（Success Criteria 4 条）/ `67-CONTEXT.md`（D-01..D-13）/ `STATE.md`（v4.0 红线）

### Secondary (MEDIUM→HIGH, 经 registry 核验)
- `npm view semver version` → 7.8.1；`npm view drizzle-zod version` → 0.8.3；`npm view drizzle-zod peerDependencies` → drizzle-orm>=0.36.0 / zod ^3.25.0||^4.0.0 `[VERIFIED 2026-06-02]`

### Tertiary (LOW) — 无未验证关键声明
- 无。

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 两新库版本/peer 经 npm registry 核验，与仓库 zod4/drizzle0.45 兼容
- Architecture: HIGH — 编译器/barrel/迁移/闸门全部基于既有可复用资产，唯 barrel 发现路径与白名单路径需 PLAN 确认（Open Q#1）
- Pitfalls: HIGH — 5 大 pitfall 均映射 CONTEXT D + 实证（含 journal 非顺序雷区）

**Research date:** 2026-06-02
**Valid until:** 2026-07-02（库版本快速变动，迁移/schema 实证为仓库快照，提交前重核 `drizzle/` 与 `package.json`）

---

## RESEARCH COMPLETE

**Phase:** 67 - Declarative Plugin-Owned Data Model & Migration-Proof
**Confidence:** HIGH

### Key Findings
1. 本 phase 是「组装既有资产」而非造新机制：Zod 校验、Drizzle 表范式、drizzle-kit 迁移链、phase45 migration-proof 断言全部可复用；真正新写仅 meta-schema + 生成器 + 零-DDL ripgrep 闸门 + `dataVersion` 一列。
2. 仅引入 `semver@7.8.1` + `drizzle-zod@0.8.3`，均经 registry 核验且与仓库 zod4/drizzle0.45 peer 兼容；无 ajv/knex/umzug/运行时引擎（守红线）。
3. schema 发现唯一干净做法是 `schema.ts` 末尾 `export * from "./schema/generated"`（D-05 零侵入）；迁移必须由 `drizzle-kit generate` 追加（journal idx 与 tag 号非顺序，手动命名会破坏 replay）。
4. **关键偏差（须 PLAN 记录）：** 仓库真实迁移目录是 `drizzle/`，非 CONTEXT D-09 所写 `src/db/migrations/`——零-DDL 闸门白名单须以 `drizzle/**` 为准。
5. 验收抓手 = 1 合法 + 5 非法负样本（拒因：INVALID_COLUMN_TYPE / MISSING_OWNED_PREFIX / RAW_SQL_FORBIDDEN / MISSING_SCHOOL_SCOPE / strict-FK），与物理 PRAGMA 断言 + 无-diff 漂移检查共跑 `verify:phase`。

### File Created
`.planning/phases/67-declarative-plugin-owned-data-model-migration-proof/67-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | 版本/peer 经 npm 核验 |
| Architecture | HIGH | 全链路基于既有实证资产；2 路径项待 PLAN 确认 |
| Pitfalls | HIGH | 映射 CONTEXT D + journal 非顺序实证 |

### Open Questions（须 planner 裁决）
1. 零-DDL 闸门白名单路径：`drizzle/**`（真实）vs CONTEXT 的 `src/db/migrations/**` → 建议用真实路径。
2. `drizzle/` 下游离 `0013_*`（未进 journal）是否干扰 `generate` → 仅信任 journal 顺序。
3. `db:generate` 脚本确切形态 → 建议 `"drizzle-kit generate"`。

### Ready for Planning
Research complete. Planner 可据此创建 PLAN.md（建议 wave 划分：Wave0 装库+建目录+脚本骨架 → meta-schema+负样本 → 生成器+quiz 样板 → dataVersion+drizzle-kit 迁移 → 闸门+验证脚本扩展+verify:phase 改指）。
