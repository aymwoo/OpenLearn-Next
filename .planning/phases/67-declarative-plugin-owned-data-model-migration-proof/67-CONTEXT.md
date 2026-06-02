# Phase 67: Declarative Plugin-Owned Data Model & Migration-Proof - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

插件能在源码内以声明式 `dataModel`（表/字段/类型/约束）声明结构化自有表。声明经 Zod meta-schema 校验、由编译器产出**独立生成片段文件**（不注入手写 `schema.ts`）+ `drizzle-kit generate` 的 checked-in 迁移，并经 `db:migrate` 应用。运行时**绝不执行 DDL**。`verify:phase` 的 migration-proof 闸门扩展覆盖新增插件自有表，断言「声明 schema ↔ 物理表 ↔ 迁移」三者一致、无漂移、无运行时 DDL。

固定边界（来自 ROADMAP）：
- Requirements: DATA-01, DATA-02, DATA-03, DATA-04。
- 只做「首次声明 → 建表」。受治理读写动词属 Phase 68；样板答题落库属 Phase 69；统计投影属 Phase 70；semver 升级演进属 Phase 71；端到端 close gate 属 Phase 72。
- 不做：runtime DDL、schema-per-plugin、通用 KV 袋子、多租户/SaaS。

</domain>

<decisions>
## Implementation Decisions

> 锁定项分两类：A) 里程碑 REQUIREMENTS 已拍板（6 项）；B) 本次 discuss-phase 67 新拍板的实现级灰区（6 项，D-01..D-13）。

### 已锁定前提（来自 REQUIREMENTS 开放问题裁决）
- **L-1:** 作答用**结构化自有表**，非 JSON 袋子。
- **L-2:** 首发题型**仅单选**。
- **L-3:** 同 `pluginKey` 重装为**接管**语义（复用既有 `pluginRegistration_school_pluginKey_unique`）。
- **L-4:** 编译器产出**独立生成 schema 片段**，不改手写 `schema.ts`。
- **L-5:** migration-proof 闸门**扩展覆盖**插件自有表。
- **L-6:** per-plugin 表为**编译式**（compile-time），非运行时动态建表。

### 字段类型集合与 JSON 列（DATA-01）
- **D-01:** 允许列类型仅 `text` / `integer` / `boolean` / `timestamp` / `enum`（具名常量数组）。
- **D-02:** **禁 `json` / `blob` 列**——payload 必须拆成具名字段。这是把「结构化表契约」落到 DDL 层的硬约束；放 json 列即 Pitfall #1（袋子）复活。
- **D-03:** meta-schema 对每个字段强制 `type` + `notNull`，可选标量 `default`。`enum` 因 SQLite 无原生类型，编译为 `text` + 应用层（drizzle enum 约束）+ 可选 CHECK；不引入运行时枚举表。

### 编译器工作流形态（DATA-02）
- **D-04:** 新增 `pnpm plugin:compile` 脚本：读各插件 `dataModel` 声明 → 生成 `src/db/schema/generated/plugin-owned/<pluginKey>.ts`（drizzle table 定义）→ 由 `generated/index.ts` barrel re-export。
- **D-05:** 主 `src/db/schema.ts` 仅 `export * from './schema/generated'`（或等价聚合），**手写部分零改动**；drizzle-kit 通过该 barrel 发现生成表。
- **D-06:** 编译后照常 `pnpm db:generate`(drizzle-kit) 产 checked-in 迁移 → `pnpm db:migrate` 应用。两步手动、运行时零 DDL。
- **D-07:** 生成目录纳入 git（checked-in）；CI/`verify:phase` 校验「重新编译无 diff」防漂移（generated 产物与声明源同步）。

### 静态零-DDL 闸门（DATA-02 / DATA-04）
- **D-08:** `verify:phase` 加 `scripts/gate-no-runtime-ddl.ts`：ripgrep 扫运行时目录（`src/app/`、`src/server/`、`src/lib/`、`src/features/`、`src/actions/`、`plugins/`）。
- **D-09:** 命中即 fail 的模式：`CREATE TABLE` / `ALTER TABLE` / `DROP TABLE` / `` sql`...CREATE `` 拼接 / `db.run(`/`db.exec(` 接裸 DDL。白名单仅 `src/db/migrations/**` 与 `src/db/schema/generated/**`（后者是声明产物，非运行时执行）。

### 命名前缀与索引约定（DATA-03）
- **D-10:** 物理表名 `plugin_owned_<pluginKey>_<table>`（如 `plugin_owned_quiz_questions` / `plugin_owned_quiz_responses`）；meta-schema 强制前缀，缺前缀边界处拒绝。
- **D-11:** 每表强制 `schoolId notNull` + `onDelete:cascade` 到 `schools`；禁止向 core 表加出向 FK（仅允许 `schoolId → schools`，其余 scope 列为软关联文本，不加跨表 FK 以保隔离）。
- **D-12:** scope 复合索引列序 `(schoolId, classroomSession, student, question)`；答题表唯一约束 `(classroomSession, student, question)`，支撑 Phase 69 的 append-only/isLatest 去重（重复提交更新 latest，不重复计入分母）。

### dataVersion 演进边界（DATA-04）
- **D-13:** 本 phase **新增** `pluginRegistrations.dataVersion`（integer，default 1）字段——经核验现 schema **尚无**此字段，需在本 phase 加列并迁移。本 phase 只落「首次声明 → 建表 → 记录基线 dataVersion」。真正的 semver backfill→verify→cutover 升级演进留给 **Phase 71**。

### Agent's Discretion
- meta-schema 内部组织（单文件 vs 拆模块）、生成代码的具体模板风格、ripgrep 规则文件格式：planner/executor 自定，只要满足 D-01..D-13 与下方 Success Criteria。
- enum 用 drizzle text-enum vs CHECK 约束的最终取舍：实现时择优，二者均满足「结构化、可校验」。

</decisions>

<specifics>
## Specific Ideas

- 负样本测试集（验收抓手）：1 个合法样板声明（quiz `question` / `response` 表）+ N 个故意非法声明，每个断言 meta-schema 给出**特定**拒因：
  1. 夹带裸 SQL/DDL 字符串
  2. 缺 `plugin_owned_` 命名空间前缀
  3. 向 core 表加 FK
  4. 缺 `schoolId` scope 字段
  5. 出现 `json`/`blob` 列
- 上述测试与 D-08/D-09 的静态闸门脚本一并跑在 `verify:phase`。
- 范式口号：**"compile, don't execute"**——声明 → 编译片段 → checked-in 迁移 → 应用，全链路无运行时 DDL。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 里程碑契约
- `.planning/REQUIREMENTS.md` — DATA-01..04 需求原文 + 6 个已裁决开放问题（L-1..L-6 来源）。
- `.planning/ROADMAP.md` §Phase 67 — Goal / Success Criteria（4 条）/ Pitfalls mitigated（#1/#2/#3/#4）。

### 研究依据
- `.planning/research/STACK.md` — `semver@^7.8.1` + `drizzle-zod@^0.8.3` 选型；声明式 schema 编译链。
- `.planning/research/ARCHITECTURE.md` — 编译器/生成片段/迁移聚合的架构裁决。
- `.planning/research/PITFALLS.md` — Pitfall #1（结构化非袋子）/#2（schoolId+scope 隔离）/#3（动态 DDL 偷渡）/#4（dataVersion + 迁移安全）→ phase 映射。
- `.planning/research/SUMMARY.md` — 共识：泛化已冻结 v2.4 脚手架，不重建内核。

### 既有代码契约（必须复用、不得重建）
- `src/db/schema.ts` §`pluginRegistrations`(L1241) — 现有 `dbNamespace`/`lifecycleState`/`uninstallRetentionMode`；**需在此新增 `dataVersion`**（D-13）。手写表区域不得被生成器注入（L-4/D-05）。
- `src/lib/dal/plugin-migration.ts` + `.test.ts` — 既有 backfill/verify/cutover 迁移治理基线（migration-proof 闸门扩展点）。
- `src/lib/dal/plugin-data.ts` + `.test.ts` — 既有通用插件数据 DAL（本 phase 不替换其读写动词，Phase 68 才治理动词；67 只建结构表）。
- `src/lib/dal/plugins.ts` — 插件注册/命名空间/生命周期 DAL。
- `src/db/migrations/**` — drizzle checked-in 迁移目录（静态闸门白名单之一）。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pluginRegistrations`(schema.ts:1241)：已有 `schoolId` cascade、`pluginKey`/`dbNamespace` 唯一约束、`lifecycleState`、`uninstallRetentionMode`。本 phase 仅加 `dataVersion` 列，不动其余结构。
- 既有 `plugin-migration.ts` 的迁移治理（backfill→verify→cutover）：migration-proof 闸门已有骨架，扩展其覆盖范围至 `plugin_owned_*` 表即可，无需新建迁移引擎。
- 既有 drizzle-kit `db:generate`/`db:migrate` 流程：编译器只产出 schema 片段，迁移生成沿用现有命令链。

### Established Patterns
- 命名空间隔离已有 `dbNamespace` + `pluginRegistration_school_dbNamespace_unique`：物理表前缀 `plugin_owned_<pluginKey>_` 与之对齐。
- append-only/isLatest 已在 core（如 `taskSubmissions`/`quizAttempts` 的 attempt unique + latest idx）成熟落地：D-12 的唯一约束 + scope 索引沿用同款形态，供 Phase 69 复用。
- SQLite 无原生 enum：core schema 一律 `text({enum:[...]})`，D-03 的 enum 编译与之一致。

### Integration Points
- 生成 barrel `src/db/schema/generated/index.ts` → 被主 `schema.ts` 聚合 → drizzle-kit 发现 → 迁移生成。
- `verify:phase` 新增两个断言：①静态零-DDL 扫描（D-08/09）②「重新编译无 diff」漂移检查（D-07）③ migration-proof 覆盖 owned 表（L-5）。

</code_context>

<deferred>
## Deferred Ideas

- 受治理读写动词（白名单具名/Zod/参数化/Command Bus 审计）— **Phase 68**（ACCESS-01..03）。
- 老师配置单选 + 学生作答 append-only/isLatest 落 `plugin_owned_*` 表 — **Phase 69**（QUIZ-01..03）。
- 题目统计只读投影（正确率/选项分布/作答人数，SQL GROUP BY）— **Phase 70**（STATS-01..02）。
- semver backfill→verify→cutover 零丢失升级 + retain/cleanup 卸载 — **Phase 71**（MKT-01..05），消费 D-13 的 `dataVersion` 基线。
- 端到端 `verify:phase` close gate（声明→安装→配置→作答→统计→升级/卸载）— **Phase 72**（GATE-01）。

</deferred>

---

*Phase: 67-declarative-plugin-owned-data-model-migration-proof*
*Context gathered: 2026-06-02*
