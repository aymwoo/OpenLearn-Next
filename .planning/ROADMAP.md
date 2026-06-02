# ROADMAP

**Current milestone:** v4.0 Plugin Marketplace & Plugin-Owned Data
**Status:** 🚧 In progress (Phases 67-72)
**Current requirements file:** `.planning/REQUIREMENTS.md`
**Latest archive:** `.planning/milestones/v3.2-ROADMAP.md`

## Overview

`v3.2` 已归档。仓库当前已经具备 LessonAgent 起草闭环的完整 baseline：server-only provider abstraction、typed tools、Command Bus 驱动的 run→persist→review→accept/discard 主链、以及 eval/guardrails/`verify:phase` close gate。

`v4.0` 是**收尾与泛化**已冻结的 `v2.4` 插件脚手架（`pluginRegistrations`、`plugin_ext_*`、通用 `plugin_owned_business_data` KV、`plugin-migration.ts` backfill→verify→cutover、governance audit、marketplace surface），**不重建内核**。核心范式「**compile, don't execute**」：声明在代码、迁移在主仓库 review、运行时只 CRUD。本轮用单选「互动答题」样板打穿「声明数据模型 → 安装 → 老师配置 → 学生作答 → 统计复盘 → 升级/卸载治理」完整闭环，样板必须走与第三方完全相同的受治理路径，不得退化为 built-in 特例。

## Milestones

- 🚧 **v4.0 Plugin Marketplace & Plugin-Owned Data** - Phases 67-72 (in progress). See `.planning/REQUIREMENTS.md`.
- ✅ **v3.2 AI LessonAgent 起草闭环** - Archived 2026-06-02. See `.planning/milestones/v3.2-ROADMAP.md`.
- ✅ **v3.1 Single-School Pilot Production Readiness (Plugin-First)** - Archived 2026-05-30. See `.planning/milestones/v3.1-ROADMAP.md`.
- ✅ **v3.0 AI Native Educational OS Upgrade** - Archived 2026-05-23. See `.planning/milestones/v3.0-ROADMAP.md`.
- 🧊 **v2.4 Plugin Data Architecture & Default Plugins** - Phases 44-49 remain frozen historical context.
- ✅ **v2.3 Async Task Platform** - Archived 2026-05-20 with accepted gaps. See `.planning/milestones/v2.3-ROADMAP.md`.
- ✅ **v2.2 WebSocket Classroom Transport Cutover** - Archived 2026-05-18. See `.planning/milestones/v2.2-ROADMAP.md`.
- ✅ **v2.1 Safety Closure and Course Membership Loop** - Archived 2026-05-17.
- ✅ **v2.0 Runtime Platform Foundations** - Archived 2026-05-17.
- ✅ **v1.3 Teaching Orchestration & Classroom Intelligence** - Archived 2026-05-15.

## Phases

<details open>
<summary>🚧 v4.0 Plugin Marketplace & Plugin-Owned Data (Phases 67-72) — IN PROGRESS</summary>

- [x] **Phase 67: Declarative Plugin-Owned Data Model & Migration-Proof** - 声明式 `dataModel` DSL + Zod meta-schema + 编译器产出 checked-in Drizzle 迁移（独立片段文件），运行时零 DDL，迁移-proof 闸门覆盖插件自有表。 (DATA-01, DATA-02, DATA-03, DATA-04) (completed 2026-06-02)
- [ ] **Phase 68: Governed Declarative Data-Access Verbs** - 白名单具名、Zod 校验、参数化的受治理读写动词，经 Command Bus + governed action registry，禁直连/禁原始 SQL，单一真相源。 (ACCESS-01, ACCESS-02, ACCESS-03)
- [ ] **Phase 69: Interactive Single-Choice Quiz Sample Plugin** - 老师配置单选题 + 学生课堂作答 + append-only/isLatest 写入插件自有结构表，全程走第三方同款治理路径、无后门。 (QUIZ-01, QUIZ-02, QUIZ-03)
- [ ] **Phase 70: Question Stats & Post-Class Recap** - 基于插件自有作答数据的只读统计投影（正确率/选项分布/作答人数，SQL GROUP BY 单一聚合源）+ Stitch/DESIGN 对齐课后复盘界面。 (STATS-01, STATS-02)
- [ ] **Phase 71: Marketplace Lifecycle — Install Governance, Semver Upgrade & Retain/Cleanup Uninstall** - external 插件发现/安装治理、semver backfill→verify→cutover 零丢失升级、retain/cleanup 卸载确认与审计、active-session 阻断。 (MKT-01, MKT-02, MKT-03, MKT-04, MKT-05)
- [ ] **Phase 72: End-to-End verify:phase Close Gate** - 对「声明→安装→老师配置→学生作答→统计复盘→升级/卸载治理」整链做单一权威可重复回归闸门。 (GATE-01)

</details>

<details>
<summary>✅ v3.2 AI LessonAgent 起草闭环 (Phases 61-66) — SHIPPED 2026-06-02</summary>

- [x] **Phase 61: AI Provider Abstraction Layer** - 统一 provider 接口、密钥隔离、限流/配额与 typed 错误。 (completed 2026-05-31)
- [x] **Phase 62: LessonAgent Typed Tool Layer** - Zod 校验 typed tools、AI draft command handler 与 server-only orchestration facade。 (completed 2026-05-31)
- [x] **Phase 63: AI Draft Chain into Draft Lesson Version** - draft lesson version provenance、幂等写链与 `lesson.draft.persist` 命令落地。 (completed 2026-05-31)
- [x] **Phase 64: Teacher Review & Accept-Publish Surface** - 审校 diff、编辑、接受/丢弃与 Stitch/DESIGN 对齐的 review workspace。 (completed 2026-05-31)
- [x] **Phase 65: Eval, Guardrails & verify:phase Close Gate** - shared corpus、guardrails、`lesson.draft.rejected` 与 authoritative `verify:phase`。 (completed 2026-06-01)
- [x] **Phase 66: Wire AI LessonAgent Draft Loop End-to-End** - 补齐 teacher trigger、run→persist、accept/discard command-bus 路径并关闭 v3.2 audit gaps。 (completed 2026-06-02)

</details>

<details>
<summary>✅ v3.1 Single-School Pilot Production Readiness (Plugin-First) (Phases 55-60, 60.1, 60.2) — SHIPPED 2026-05-30</summary>

- [x] **Phase 55: Pilot Scope & Acceptance Gate** - 冻结单校试点口径、课堂投票样板、40/5 容量目标、proof artifact 与 close gate。 (completed 2026-05-24)
- [x] **Phase 56: Voting Plugin Contract & Authoring Integration** - 打通课堂投票插件的 authoring、schema validation、compatibility gating、publish preflight 与 version freeze。 (completed 2026-05-25)
- [x] **Phase 57: Classroom Runtime Sample Chain** - 打通 launch readiness、teacher trigger、student participation、canonical result writes 与 teacher evidence。 (completed 2026-05-25)
- [x] **Phase 58: Operator Recovery & Production Surfaces** - 交付 classroom/plugin/command/task 关联诊断面、degraded honesty 与可执行恢复动作。 (completed 2026-05-26)
- [x] **Phase 59: Deploy, Release & Recovery Baseline** - 交付 env discipline、CI/CD、health/ready、release traceability、backup/restore 与 restore drill。 (completed 2026-05-27)
- [x] **Phase 60: Load, Degrade & Pilot Rehearsal** - 交付 k6/Playwright rehearsal、Redis degraded、worker backlog tests、rollout/rollback checklist 与 closeout evidence。 (completed 2026-05-30)
- [x] **Phase 60.1: Replace dry-run phase60 proof with live rehearsal evidence** - 用 live smoke/capacity/drills/rollout-rollback rehearsal evidence 替换 dry-run close artifacts。 (completed 2026-05-30)
- [x] **Phase 60.2: Wire frozen voting contract into launch and runtime** - 把 frozen voting contract 接入 runtime truth，关闭 `PLUG-01` / `CHAIN-03`。 (completed 2026-05-28)

</details>

## Phase Details (v4.0)

> Dependency chain: 67 (data contract) → 68 (access boundary) → 69 (sample write) → 70 (stats read) → 71 (lifecycle/upgrade, needs 69's real data shapes + 70's stats to prove zero-loss) → 72 (end-to-end close gate). Every phase hangs on the real 老师配置 → 学生作答 → 统计复盘 chain — no infra-first drift, no second plugin type, no store-operations.

### Phase 67: Declarative Plugin-Owned Data Model & Migration-Proof
**Goal**: 插件能在源码内以声明式 `dataModel`（表/字段/类型/约束）声明结构化自有表，声明经 Zod meta-schema 校验、编译为独立生成片段 + checked-in Drizzle 迁移并经 `db:migrate` 应用；运行时绝不执行 DDL；`verify:phase` migration-proof 闸门扩展覆盖新增插件自有表。
**Depends on**: Phase 66 (existing kernel/migration baseline)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. 一个插件（如答题样板的 question/response 表）的 `dataModel` 声明能通过 Zod meta-schema；非法声明（夹带原始 SQL/DDL、缺命名空间前缀、向 core 表加 FK、缺 `schoolId` scope）在边界处被拒绝并给出明确原因。
  2. 运行编译器把声明转成**独立生成片段文件**（不注入手写 `schema.ts`）+ `drizzle-kit generate` checked-in 迁移；静态扫描确认迁移文件之外不存在任何运行时 `CREATE/ALTER` 或拼接 SQL。
  3. 每张自有表 `schoolId notNull` + cascade、物理名带 `plugin_owned_` 前缀，并具支撑 `(classroomSession, student, question)` scope 查询的复合索引。
  4. `verify:phase` 的 migration-proof close gate 覆盖新增自有表：声明 schema ↔ 物理表 ↔ 迁移三者一致、无漂移、无运行时 DDL。
**Pitfalls mitigated**: #1 结构化表契约（非 JSON 袋子）、#2 隔离不变量（schoolId+scope）、#3 动态 DDL 偷渡、#4 dataVersion + 迁移安全契约。
**Plans**: 3 plans
- [x] 67-01-PLAN.md — DATA-01 校验地基：dataModel Zod meta-schema（纯 DTO）+ 1 合法/5 非法负样本 + 合法 quiz 样板声明 + 依赖/脚本入口
- [x] 67-02-PLAN.md — DATA-02/03 物理面：编译器声明→确定性 Drizzle 生成片段 + schema barrel + dataVersion 列 + checked-in 迁移
- [x] 67-03-PLAN.md — DATA-02/03/04 close gate：零-运行时-DDL 静态闸门 + phase67 物理验证脚本（PRAGMA/级联/foreign_key_check/漂移）+ verify:phase 重指 67

### Phase 68: Governed Declarative Data-Access Verbs
**Goal**: 插件只能经白名单具名、Zod 校验、参数化的受治理动词（`insert`/`upsert`/`getByIndex`/`count`/`aggregate`）读写自有表，全部经 Command Bus + governed action registry 带审计；禁止直连 DB、禁止传原始 SQL/where/字段名；写路径 replay-safe 且不产生第二真相源。
**Depends on**: Phase 67
**Requirements**: ACCESS-01, ACCESS-02, ACCESS-03
**Success Criteria** (what must be TRUE):
  1. 对自有表的访问只能通过固定具名动词；任何传入原始 SQL / 自由 `where` / 自由字段名 / 任意表列名的尝试被拒绝（无注入面），表/列名来自服务端常量映射。
  2. 动词输入输出由 drizzle-zod（与编译表同源）校验；越权/跨校/非法 payload 被拒绝并写入 governance audit；`schoolId` 由认证 session 推导，绝不接受插件/前端传入。
  3. 写入路径 Command Bus → DAL → SQLite（append-only/isLatest）replay-safe，且不产生第二 durable 真相源（WS/Redis 只投递/通知，不落库权威）。
**Pitfalls mitigated**: #6 灵活查询=注入面、#8 第二真相源（写半边）、#2 scope 强约束。
**Plans**: 5 plans
- [x] 68-01-PLAN.md — 白名单单一真相源：drizzle-zod 同源派生 + 编译生成 checked-in allowlist（零漂移）+ 校验/具名拒因
- [ ] 68-02-PLAN.md — 动词契约判别联合 + 前置治理门 assertActionExecutable + tx-aware 动词级审计
- [ ] 68-03-PLAN.md — 写动词 insert/upsert 经 Command Bus（contracts/registry/handler append-only/producer）
- [ ] 68-04-PLAN.md — 统一入口 dispatchPluginDataAccess + 读动词 getByIndex/count/aggregate 受治理直连
- [ ] 68-05-PLAN.md — 负样本 close gate（10 类拒因+审计）+ verify:phase68 串联零漂移/单测

### Phase 69: Interactive Single-Choice Quiz Sample Plugin
**Goal**: 以单选互动答题样板，用与第三方完全相同的受治理路径打通「老师配置 → 学生作答 → 自有结构表持久化」：老师配置一道单选题，学生在课堂运行链路提交作答，作答经受治理动词 append-only/isLatest 落入插件自有表，绝无 built-in 后门。
**Depends on**: Phase 68
**Requirements**: QUIZ-01, QUIZ-02, QUIZ-03
**Success Criteria** (what must be TRUE):
  1. 老师能通过样板插件配置一道单选题（题干 + 选项 + 正确答案），配置经声明式受治理路径持久化（不落 core 表、不进通用 KV 袋子）。
  2. 学生能在课堂运行链路提交作答，记录经受治理动词写入 `plugin_owned_*` 答题表，关联 `(classroomSession, student, question)` 且具唯一约束、append-only + isLatest（重复提交更新 latest，不重复计入分母）。
  3. 样板完全复用 v4.0 声明式模型 + 受治理访问 + 生命周期：不 import core DB client、不写任何 core 表、所有数据动作在 governance audit 可见（可被 close gate 断言）。
**Pitfalls mitigated**: #1 结构化答题表、#8 单一写真相、#10 样板无后门。
**Plans**: TBD
**UI hint**: yes

### Phase 70: Question Stats & Post-Class Recap
**Goal**: 基于插件自有作答数据计算每题正确率 / 各选项分布 / 作答-未作答人数，作为插件数据之上的只读投影（单一 DAL 聚合源、SQL GROUP BY、不回写核心 analytics 表），并在对齐 Stitch/DESIGN 的课后复盘界面呈现。
**Depends on**: Phase 69
**Requirements**: STATS-01, STATS-02
**Success Criteria** (what must be TRUE):
  1. 系统基于插件自有作答数据计算每题正确率、各选项作答分布、作答/未作答人数（相对「该课堂在册参与者」分母），纯只读投影，不回写核心 analytics 表。
  2. 统计来自单一 DAL 聚合函数（SQL `GROUP BY` 走复合索引，无应用层 `JSON.parse`、无 Redis/第二源）；写答题时 `updateTag('quizStats:${sessionId}')` 失效缓存保持复盘新鲜。
  3. 教师能在课后复盘界面查看题目统计；界面对齐 Stitch `5322129002350954765` + DESIGN.md（Lexend、无 1px 分隔线、tonal surface、glass/gradient CTA），并明确标注作答/未作答口径。
**Pitfalls mitigated**: #1 SQL 聚合非 JSON 扫描、#2 scope 隔离读、#8 实时与复盘同一聚合源。
**Plans**: TBD
**UI hint**: yes

### Phase 71: Marketplace Lifecycle — Install Governance, Semver Upgrade & Retain/Cleanup Uninstall
**Goal**: 把 marketplace surface 泛化到 external 插件：受治理发现/安装（manifest + `dataModel` 校验 + 命名冲突检查）、semver 升级走 backfill→verify→cutover（rollback-safe、对真实作答数据零丢失）、retain/cleanup 卸载带确认 token + 审计、active classroom 作答中安全阻断。放在 69/70 之后，确保升级/卸载迁移作用于真实存在的自有答题表与作答数据。
**Depends on**: Phase 70 (需要 69 的数据形态 + 70 的统计来证明升级零丢失)
**Requirements**: MKT-01, MKT-02, MKT-03, MKT-04, MKT-05
**Success Criteria** (what must be TRUE):
  1. operator 能在 marketplace surface 发现并安装非内置（external）插件；安装经治理预检（manifest Zod 校验、`dataModel` 校验、`(schoolId, pluginKey)` + `(schoolId, dbNamespace)` 唯一）通过后才可用；冲突被拒并给出明确原因。
  2. 跨 semver 升级走 backfill→verify→cutover 带行数/校验和对账且 rollback-safe；在**存在真实答题数据**时升级断言零丢失、历史统计不变（expand→migrate→contract、additive-only）。
  3. 卸载遵循 `uninstallRetentionMode`：默认 `retain` 软禁用并保留数据（同 `pluginKey` 重装时以新 pluginId 身份接管恢复）；`cleanup` 仅在匹配按真实计数派生的确认 token + 影响面回显（「将删除 N 条作答、影响 M 个复盘」）后才级联；两种模式都写 governance audit。
  4. 存在进行中（active）课堂作答时，升级/卸载被安全阻断或受控延迟，给出明确可读原因（`getPluginUninstallBlockReason` 扩展至 active session）。
**Pitfalls mitigated**: #4 有损升级丢数据、#5 retain/cleanup 治理、#9 命名冲突/身份漂移、#7 拒绝商店运营层 scope creep。
**Plans**: TBD
**UI hint**: yes

### Phase 72: End-to-End verify:phase Close Gate
**Goal**: 提供单一权威、可重复的 `verify:phase` 端到端 close gate，对「声明数据模型 → 安装 → 老师配置答题 → 学生作答 → 统计复盘 → 升级/卸载治理」整条链路做回归校验，作为里程碑 close 的唯一闸门。
**Depends on**: Phase 71
**Requirements**: GATE-01
**Success Criteria** (what must be TRUE):
  1. `verify:phase` 端到端跑通整链并通过：迁移正确性 + 自有表 migration-proof、受治理访问的注入/越权拒绝、≥2-school/≥2-class 隔离无串读、单一真相源（仅 DAL/SQLite）。
  2. 闸门在**带真实作答数据**下升级一次并断言零丢失 + 统计一致，并对 retain 与 cleanup 两种卸载各跑一次，断言各自 governance audit 记录。
  3. 闸门断言样板插件无后门（不 import core DB client、不写 core 表、动作审计可见）与 active-session destructive-op 阻断，作为里程碑单一权威 close gate。
**Pitfalls mitigated**: 全部 #1–#10 回归覆盖（尤以 #3/#4/#5/#6/#8/#10 为闸门核心）。
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 67. Declarative Plugin-Owned Data Model & Migration-Proof | v4.0 | 3/3 | Complete   | 2026-06-02 |
| 68. Governed Declarative Data-Access Verbs | v4.0 | 1/5 | In Progress|  |
| 69. Interactive Single-Choice Quiz Sample Plugin | v4.0 | 0/TBD | Not started | - |
| 70. Question Stats & Post-Class Recap | v4.0 | 0/TBD | Not started | - |
| 71. Marketplace Lifecycle (Install/Upgrade/Uninstall) | v4.0 | 0/TBD | Not started | - |
| 72. End-to-End verify:phase Close Gate | v4.0 | 0/TBD | Not started | - |

## Next Step

- 用 `/gsd-plan-phase 67` 开始规划 v4.0 第一阶段（声明式插件自有数据模型 + 迁移-proof 契约）。
