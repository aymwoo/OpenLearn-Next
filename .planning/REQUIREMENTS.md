# Requirements — Milestone v4.0 Plugin Marketplace & Plugin-Owned Data

**Defined:** 2026-06-02
**Core Value:** 第三方插件能以声明式、受治理的方式拥有自己的结构化数据，并通过受控 marketplace 生命周期发布/安装/升级/卸载；以「互动答题」样板打穿「老师用插件设计课堂活动 → 学生作答 → 基于插件自有数据自动统计 → 教师课后复盘」的完整闭环。

**Scope rule:** 本轮是**收尾与泛化**已冻结的插件脚手架（`pluginRegistrations`、extension 表、通用 `plugin_owned_business_data` KV、`plugin-migration.ts` backfill→verify→cutover、governance audit、marketplace surface），**不重建平台内核**。核心范式：**"compile, don't execute"** —— 声明在代码、迁移在主仓库 review、运行时只 CRUD。样板插件必须走与第三方完全相同的受治理路径，不得退化为 built-in 特例。

## v1 Requirements

### 声明式插件数据模型 (DATA)

- [x] **DATA-01**: 插件 manifest 能声明结构化数据模型（`dataModel`：表/字段/类型/约束），该声明由 Zod meta-schema 校验，非法声明在边界处被拒绝，禁止表达任意 SQL/DDL。
- [ ] **DATA-02**: 声明式 `dataModel` 在开发/发布期被编译为受治理的 Drizzle SQLite 定义并产出 checked-in 迁移（独立生成片段文件，不注入手写 `schema.ts`）；运行时绝不执行 DDL 或动态建表。
- [ ] **DATA-03**: 每个插件的自有表带命名空间隔离（基于 `dbNamespace`/`pluginId`），避免跨插件命名冲突，且每行可归属到 school/course/session 维度以防跨域数据泄漏。
- [ ] **DATA-04**: `verify:phase` 的 migration-proof close gate 扩展覆盖新增的插件自有表，保证声明 schema ↔ 物理表 ↔ 迁移三者一致、无漂移、无运行时 DDL。

### 受治理数据访问 (ACCESS)

- [ ] **ACCESS-01**: 插件只能通过受治理的声明式数据访问动词（经 DAL / Command Bus）读写自有表，禁止直连 DB、禁止传入原始 SQL/where/字段名等可注入面。
- [ ] **ACCESS-02**: 数据访问动词在边界处用 Zod（与声明 schema 同源，drizzle-zod）校验输入输出，越权/越界/非法 payload 被拒绝并记入 governance audit。
- [ ] **ACCESS-03**: 写入路径经 Command Bus 记录、replay-safe，且不产生第二真相源（SQLite + DAL 仍是唯一 durable truth）。

### Marketplace 生命周期 (MKT)

- [ ] **MKT-01**: operator 能在 marketplace surface 发现并安装非内置（external）插件，安装经治理校验（manifest、`dataModel` 校验、命名冲突检查）通过后才进入可用状态。
- [ ] **MKT-02**: 插件版本遵循 semver；升级走 backfill→verify→cutover 受控数据迁移链路，可在出错时回滚，不丢失既有学习数据。
- [ ] **MKT-03**: 卸载遵循既有 `uninstallRetentionMode`：默认 `retain`（软禁用、保留数据并要求确认 token），`cleanup` 才级联清理；卸载动作写入 governance audit。
- [ ] **MKT-04**: 卸载后以 `retain` 保留的数据，能在同 `pluginKey` 重新安装时被接管恢复（完整跨版本恢复承诺为 v2 deferred）。
- [ ] **MKT-05**: 升级/卸载在存在进行中（active）课堂作答时被安全阻断或受控延迟，给出明确可读原因（扩展 `getPluginUninstallBlockReason` 至 active session）。

### 互动答题样板插件 (QUIZ)

- [ ] **QUIZ-01**: 老师能通过该样板插件配置一道单选互动答题（题干 + 选项 + 正确答案），配置经声明式受治理路径持久化（多题型为 v2 deferred）。
- [ ] **QUIZ-02**: 学生能在课堂运行链路中提交作答，作答记录经受治理动词写入插件自有结构表（append-only / `isLatest`），关联 `(classroomSession, student, question)` 且具唯一约束。
- [ ] **QUIZ-03**: 样板插件完全复用 v4.0 声明式数据模型 + 受治理访问 + 生命周期，不引入任何绕过治理的后门或 built-in 特例。

### 题目统计与课后复盘 (STATS)

- [ ] **STATS-01**: 系统基于插件自有作答数据，按题计算正确率、各选项作答分布、作答/未作答人数，统计为插件数据之上的只读投影，不回写核心 analytics 表。
- [ ] **STATS-02**: 教师能在课后复盘界面查看题目统计；界面对齐 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`（Lexend、无 1px 分隔线、tonal surface、glass/gradient CTA）。

### Close Gate (GATE)

- [ ] **GATE-01**: 提供 `verify:phase` 端到端 close gate，对「声明数据模型 → 安装 → 老师配置答题 → 学生作答 → 统计复盘 → 升级/卸载治理」整条链路做回归校验，作为里程碑 close 的单一权威闸门。

## v2 Requirements

Deferred to future. Tracked but not in current roadmap.

### 答题样板增强 (QUIZ-EXT)

- **QUIZ-EXT-01**: 多题型（多选/判断/填空/排序）与混合题包。
- **QUIZ-EXT-02**: 实时作答广播 / 课堂大屏 / 游戏化（排行榜、计时）。
- **QUIZ-EXT-03**: AI 出题与题库复用。

### 生命周期增强 (MKT-EXT)

- **MKT-EXT-01**: 升级 dry-run 预演与影响面预估。
- **MKT-EXT-02**: 跨版本/跨 pluginKey 的完整数据恢复与导入导出。
- **MKT-EXT-03**: 多插件类型矩阵（非答题类第三方数据插件的二次泛化验证）。

### 商店运营层 (STORE)

- **STORE-01**: 付费/计费、评分评论、公开开发者门户、自动化审核流水线（持续 deferred，见 Out of Scope）。

## Out of Scope

| Feature | Reason |
|---------|--------|
| 运行时动态建表 / 动态 SQL migration / 任意 DDL | 撞红线；必须 compile-time Drizzle + 主仓库 review 迁移 |
| 插件直连 DB / 直接访问核心 API / 通用查询接口（传 SQL/字段名） | 撞红线；重新打开注入与跨域越权面，必须经受治理声明式动词 |
| 任意第三方代码执行 / `eval()` / 远程动态 import | 撞红线；声明式受治理插件形态 |
| schema-per-plugin / 污染 core table / 第二真相源 | 破坏 migration-centralized 与 SQLite+DAL 单一真相 |
| 商店运营层（付费/计费、评分评论、公开开发者门户、自动化审核流水线） | marketplace 运营外延，本轮只做核心受治理闭环 |
| 多校多租户完整 SaaS、PostgreSQL/pgvector cutover、重型 observability 迁移 | 延续既有 deferred |
| 多题型 / 实时大屏 / 游戏化 / AI 出题 | 刻意克制；先用单选打穿数据治理闭环，避免 scope creep |
| 把样板做成 built-in 特例绕过治理 | 会使红线空跑；样板必须走第三方同款路径 |

## Traceability

Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 67 | Complete |
| DATA-02 | Phase 67 | Pending |
| DATA-03 | Phase 67 | Pending |
| DATA-04 | Phase 67 | Pending |
| ACCESS-01 | Phase 68 | Pending |
| ACCESS-02 | Phase 68 | Pending |
| ACCESS-03 | Phase 68 | Pending |
| QUIZ-01 | Phase 69 | Pending |
| QUIZ-02 | Phase 69 | Pending |
| QUIZ-03 | Phase 69 | Pending |
| STATS-01 | Phase 70 | Pending |
| STATS-02 | Phase 70 | Pending |
| MKT-01 | Phase 71 | Pending |
| MKT-02 | Phase 71 | Pending |
| MKT-03 | Phase 71 | Pending |
| MKT-04 | Phase 71 | Pending |
| MKT-05 | Phase 71 | Pending |
| GATE-01 | Phase 72 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-02*
*Last updated: 2026-06-02 after initial definition*
