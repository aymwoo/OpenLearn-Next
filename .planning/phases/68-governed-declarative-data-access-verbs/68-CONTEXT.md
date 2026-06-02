# Phase 68: Governed Declarative Data-Access Verbs - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

插件只能经白名单具名、Zod 校验、参数化的受治理动词（`insert` / `upsert` / `getByIndex` / `count` / `aggregate`）读写自有 `plugin_owned_*` 表。所有动作经 governed action registry 检查；写动词经 Command Bus 持久化、replay-safe；表/列/索引/可聚合列名来自 Phase 67 声明/生成 schema 自动派生的服务端常量（绝不接受插件/前端传入原始 SQL、自由 `where`、任意字段名）。`schoolId` 恒由认证 session 推导。SQLite + DAL 仍是唯一 durable 真相源；WS/Redis 只投递/通知，不落库权威。

固定边界（来自 ROADMAP / REQUIREMENTS / Phase 67，不在本 phase 重新讨论）：
- Requirements: ACCESS-01, ACCESS-02, ACCESS-03。
- 动词集合固定为 `insert` / `upsert` / `getByIndex` / `count` / `aggregate`。
- append-only / isLatest 去重语义、唯一约束 `(classroomSession, student, question)`、scope 复合索引、`schoolId notNull + cascade` 均由 Phase 67 生成表锁定（D-10..D-12）。
- 复用 Command Bus、governed action registry、plugin lifecycle/governance audit、governance 投影 —— 不重建平台内核。
- 不做：runtime DDL、自由查询/JSON 袋子访问、第二 durable 真相源、Phase 69 的样板答题落库、Phase 70 的统计投影、Phase 71 的 semver 升级。

</domain>

<decisions>
## Implementation Decisions

> 锁定项分两类：A) 里程碑/Phase 67 已拍板（动词集合、Command Bus、append-only/isLatest、schoolId 来源、生成表与唯一约束）；B) 本次 discuss-phase 68 新拍板的实现级灰区（D-01..D-09）。

### 动词调用面形态（ACCESS-01）
- **D-01:** 五个动词经**单一受治理入口 facade**（如 `dispatchPluginDataAccess`）暴露，payload 携带 `verb` 判别字段（discriminated union），共享一套边界校验/治理/审计；**不**把每动词登记为 static action catalog 的独立 actionKey（现有 action 是“提议/注解”语义，与结构表 CRUD 语义不同）。
- **D-02:** 单一 facade 内部，**写路径每写动词一个 platform command 类型**（如 `plugin.data.insert` / `plugin.data.upsert`），与现有 `contracts.ts` 中 `plugin.*` 类型列表同款粒度，便于 replay 与审计区分。读动词不新增 command 类型。

### 读路径治理强度（ACCESS-02 / ACCESS-03）
- **D-03:** 读动词（`getByIndex` / `count` / `aggregate`）**不落 `platformCommands`**，直走受治理 DAL；但全部读动作仍经 governed action registry 检查（lifecycle / kill-switch / 越权）。避免高频只读注入命令表、污染 replay 语义。写动词照常经 Command Bus 持久化（满足 SC3）。
- **D-04:** governance audit 写入粒度：**写动词成功+失败都入 audit**（写本就走 Command Bus，天然有记录）；**读动词仅在拒绝/越权时入 audit**，成功读不入。平衡可审计性与 audit 表体量。

### aggregate 动词边界（ACCESS-01，与 Phase 70 切分）
- **D-05:** 本 phase 的 `aggregate` 仅交付**受限具名聚合**：`count` + 按**白名单列** `groupBy`（如 `selectedOption`），返回 `{key, count}` 行。足够支撑 Phase 69 去重/计数语义。**不**在本 phase 做正确率 / 选项分布 / 作答-未作答投影 —— 那是 Phase 70（STATS）。聚合面保持最小注入面（Pitfall #6）。

### 白名单来源与可查询面（ACCESS-01）
- **D-06:** 表名 / 列名 / 可 `getByIndex` 索引 / 可 `groupBy` 聚合列，全部从 **Phase 67 声明 `dataModel` + 生成 schema 自动派生**（drizzle-zod 同源），编译期产出受治理访问元数据。**单一真相源、零漂移**，与 D-04（Phase 67）编译器同链；不手维护并行 const map。
- **D-07:** `getByIndex` 按**逻辑 scope-key 名**暴露（如 `byClassroomSessionStudentQuestion`），映射到生成的唯一/复合索引；`getByIndex` 与 `groupBy` **只能命中声明 dataModel 中已建索引的列**，未建索引列一律拒绝。“跨面 = 必须先在 dataModel 建索引才授权”。

### 拒绝契约（ACCESS-01 / ACCESS-02，验收抓手）
- **D-08:** 负样本验收集（沿用 Phase 67 范式）必须逐个断言**特定拒因 + 写 audit**，覆盖：
  1. 裸 SQL / `sql\`...\`` 拼接 / DDL 字符串传入 → `raw_sql_rejected`
  2. 自由 `where` 表达式 / 任意过滤条件 → `free_where_rejected`
  3. 任意列名/表名（不在白名单）→ `unknown_column_rejected` / `unknown_table_rejected`
  4. 跨校 `schoolId` 企图 / 前端或插件传入 `schoolId` → `cross_school_rejected`（`schoolId` 恒由 session 推导）
  5. 违反 drizzle-zod 的非法 payload（缺字段/错类型/越界 enum）→ `invalid_payload_rejected`
  6. `getByIndex` / `groupBy` 命中未建索引列 → `unindexed_column_rejected`（验证 D-07 约束）
  7. 未安装 / 被 kill-switch / 非本校插件调用 → 经 governed action registry 拒（复用既有 lifecycle 治理）

### Agent's Discretion
- facade 入口的内部模块组织、command payload schema 的具体 zod 形状、读 DAL 函数拆分粒度：planner/executor 自定，只要满足 D-01..D-08 与 ROADMAP Success Criteria。
- 派生访问元数据的产物形态（编译期生成 TS 常量 vs 运行时从生成 schema 反射）：researcher/planner 择优，前提是单一真相源、零漂移（D-06）。
- 写动词 dedupeKey / 幂等键的具体取值（复用现有 producer correlation/dedupe 机制）：planner 按现有 Command Bus producer 惯例拍。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 里程碑契约
- `.planning/REQUIREMENTS.md` — ACCESS-01..03 需求原文（L19-21）+ 里程碑红线（无任意代码、无直连 DB）。
- `.planning/ROADMAP.md` §Phase 68（L86-95）— Goal / Success Criteria（3 条）/ Pitfalls mitigated（#6 灵活查询=注入面、#8 第二真相源、#2 scope 强约束）。

### 上游 phase 契约（必须先读）
- `.planning/phases/67-declarative-plugin-owned-data-model-migration-proof/67-CONTEXT.md` — Phase 67 D-01..D-13：生成表命名 `plugin_owned_<pluginKey>_<table>`、字段类型集、scope 索引列序、唯一约束、`dataVersion` 基线。本 phase 的白名单来源（D-06）直接消费这些产物。
- `src/db/schema/generated/plugin-owned/quiz.ts` — Phase 67 生成的样板表（`pluginOwnedQuizQuestions` / `pluginOwnedQuizResponses`），含 `schoolId`/`pluginId` cascade、scope 索引、`(classroomSession, student, question)` 唯一约束 —— 受治理动词读写的目标表与索引来源。

### 研究依据
- `.planning/research/PITFALLS.md` — Pitfall #6（灵活查询=注入面）/ #8（第二真相源，写半边）/ #2（scope 强约束）→ phase 映射，对应 D-05/D-07/D-08。
- `.planning/research/ARCHITECTURE.md` — Command Bus / governed action registry / DAL truth-source 架构裁决。
- `.planning/research/STACK.md` — `drizzle-zod` 同源校验选型（D-06 元数据派生依据）。

### 既有代码契约（必须复用、不得重建）
- `src/features/platform-core/commands/contracts.ts` — `PlatformCommandType` 枚举（L15-24）+ payload schema 映射（L173-182）；**在此新增 `plugin.data.insert` / `plugin.data.upsert` 类型与 payload schema**（D-02）。
- `src/features/platform-core/commands/bus.ts` + `bus.test.ts` — `dispatchPlatformCommand` / `PlatformCommandStore`，replay/dedupe 机制；写动词 facade 复用此分发器。
- `src/features/platform-core/commands/producers/plugin-governance.ts` — 现有 governed command producer 形态（actor/scope/audit/correlation/dedupe）；新 data-access 写 producer 沿用同款 BaseProducerInput 结构。
- `src/features/platform-core/actions/registry.ts` + `static-catalog.ts` + `contracts.ts` — governed action registry + allowlist + 权限映射；读动词治理检查复用此 registry（D-01/D-03）。
- `src/features/platform-core/plugins/governance-projection.ts` + lifecycle-contracts — kill-switch / lifecycle / blocked 判定（D-08 第 7 条复用）。
- `src/lib/dal/plugins.ts` — 插件注册/命名空间/生命周期 DAL；含 `governanceAudits` 写入（L273 `executor.insert(governanceAudits)`）—— audit 写入复用此路径（D-04/D-08）。
- `src/lib/dal/plugin-data.ts` + `.test.ts` — 既有通用插件扩展 DAL（基于 core ext 表 + JSON payload）。**注意：本 phase 的受治理动词面向 Phase 67 新建的 `plugin_owned_*` 结构表，不是替换此 JSON 扩展 DAL**；二者并存，受治理动词是结构表的新真相路径。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Command Bus（`commands/bus.ts`）：`dispatchPlatformCommand` + `PlatformCommandStore` 已提供 replay-safe 持久化、dedupe、attempt 记录 —— 写动词直接复用，不新建写引擎。
- governed action registry（`actions/registry.ts` + `static-catalog.ts`）：allowlist + 权限 + lifecycle 投影已成熟 —— 读/写动词的治理前置检查复用，不新建权限层。
- `governanceAudits` 写入（`plugins.ts:273`）：审计落库路径已存在 —— D-04/D-08 的 audit 直接接入。
- Phase 67 生成 schema（`schema/generated/plugin-owned/*.ts`）：表/列/索引/唯一约束的权威定义 —— D-06 白名单元数据从此派生。

### Established Patterns
- `producers/plugin-governance.ts` 的 `BaseProducerInput`（type/actor/scope{schoolId,pluginId}/payload/dedupeKey/correlation/audit/source）：新 data-access 写 producer 沿用同款形状，scope.schoolId 仍由上游 session 注入。
- `contracts.ts` 中 `PlatformCommandType` + `*PayloadSchema` 同源映射：新增 `plugin.data.*` 类型沿用此“类型枚举 ↔ zod payload”同构模式。
- core 表 append-only/isLatest（如 `taskSubmissions` / `quizAttempts`）+ Phase 67 `plugin_owned_quiz_responses` 唯一约束：写动词去重语义沿用同款，供 Phase 69 复用。

### Integration Points
- 写动词 facade → 每写动词 `plugin.data.*` command 类型 → Command Bus → 受治理 DAL → SQLite（`plugin_owned_*`）。
- 读动词 facade → governed action registry 检查 → 受治理 DAL（直读，不进 Command Bus）→ 拒绝时 `governanceAudits`。
- 白名单访问元数据派生器接入 Phase 67 `pnpm plugin:compile` / 生成 schema 链（D-06 单一真相源）。
- `verify:phase` 新增负样本断言集（D-08 七类拒因 + audit），与 Phase 67 静态闸门并跑。

</code_context>

<specifics>
## Specific Ideas

- 负样本测试集（验收抓手）：1 个合法动词调用样本 + 7 类故意非法调用，每个断言 **特定拒因码** + governance audit 落库（见 D-08 列表）。这是 ACCESS-01/02 的可断言 close 抓手，沿用 Phase 67 “合法样板 + N 个非法声明各给特定拒因” 范式。
- 范式口号：**"named verbs, not raw queries"** —— 调用面只有具名动词 + 白名单列 + 参数化 payload，原始 SQL / 自由 where / 任意字段名在边界处即被拒，无注入面。
- 写半边单一真相：写只经 Command Bus → DAL → SQLite；WS/Redis 不落库权威（Pitfall #8）。

</specifics>

<deferred>
## Deferred Ideas

- 老师配置单选 + 学生作答经受治理动词 append-only/isLatest 落 `plugin_owned_*` 表 — **Phase 69**（QUIZ-01..03），消费本 phase 的写动词 facade。
- 题目统计只读投影（正确率 / 选项分布 / 作答-未作答人数，SQL GROUP BY）— **Phase 70**（STATS），在本 phase 受限 `aggregate`（D-05）之上扩展为完整统计源。
- semver backfill→verify→cutover 升级 + retain/cleanup 卸载 — **Phase 71**（MKT），消费 Phase 67 `dataVersion` 基线。
- 端到端 `verify:phase` close gate（声明→安装→配置→作答→统计→升级/卸载）— **Phase 72**（GATE-01）。
- 幂等性细节（dedupeKey 取值策略）、错误向插件回传的形状、缓存 tag 失效策略 —— 未单独深挖，留给 planner 按现有 Command Bus producer / cache 惯例拍（属 Agent's Discretion，非 deferred capability）。

None of the above changes Phase 68 scope — 讨论全程在 phase 边界内。

</deferred>

---

*Phase: 68-governed-declarative-data-access-verbs*
*Context gathered: 2026-06-02*
