# OpenLearn Next

## What This Is

OpenLearn Next 是一个面向未来教育的 AI 原生开源操作系统，核心是基于步骤的课堂流程引擎、AI 多 Agent 协作平台和开放插件生态。它让教师把课堂拆成导入、讲授、互动、练习、总结等可编排原子步骤，并为教师配备可协同产出教学包的 AI 团队。

系统面向学校、教师、学生、家长、开发者和 AI Agent，首发聚焦可运行的课堂编排与学习闭环，而不是一次性铺满完整教育 SaaS。

## Core Value

教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。

## Current Milestone: v4.2 Marketplace 泛化验证

**Goal:** 构建第二个非 quiz 类型的 external 插件（如 homework），把它推过 v4.0 marketplace 的完整生命周期（install → authoring → classroom runtime → upgrade → uninstall），在过程中修复 quiz-only 的隐式假设，让 marketplace 从「被 quiz 验证过」升级为「多插件类型可重复使用」的通用基础设施。

**Target features:**

- **第二个 external 插件样板 (MKT-EXT-03)**: 选择与 quiz 差异足够大的插件类型（homework / resource / data-agent），构建为 external 插件，走与 quiz 完全相同的受治理路径（governed plugin key + `dispatchPluginDataAccess` + append-only/isLatest）。
- **Marketplace 生命周期全链路验证**: 新插件 install → authoring → classroom runtime → semver upgrade（backfill→verify→cutover）→ retain/cleanup uninstall → 同 pluginKey 重装恢复，逐环节验证 marketplace 不是 quiz-only。
- **泛化修复**: 在验证过程中暴露并修复 v4.0 marketplace 中 quiz-hardcoded 的隐式假设（如 plugin_owned_* 表的通用性、DTO/allowlist 的 quiz 默认值、upgrade migration 的题型耦合）。
- **Close gate 扩展**: 在 v4.1 `verify:phase` 组合 alias 基础上增加第二个插件的跨插件回归（不破 quiz + 新插件全链路 green）。

**Key context:**

- 基于 v4.0 marketplace 闭环 + v4.1 quiz 多题型 + 实时仪表盘基线。
- 不重做 marketplace 架构、不新建 plugin type、不新建第二 transport runtime。
- 不涉及跨 pluginKey 数据恢复（MKT-EXT-02）、不涉及商店运营层（STORE-01）。
- Phase 编号从 **75** 开始延续。

## Current State

**Latest shipped milestone:** `v4.1 Multi-Question Types & Teacher Live Dashboard`（shipped 2026-06-09, archived 2026-06-10）

**What is now validated (v4.1 layer):**

- 多题型互动答题（5 种题型：single_choice/multi_choice/true_false/fill_blank/ordering），全部走 append-only/isLatest 写入路径，与 v4.0 单选共用同一套受治理 DAL 动词。
- `quiz.answer.received` WebSocket 事件，经 v2.2 classroom-ws 传输层推送到教师端，teacher-only 通道过滤，可选 Redis fanout delivery layer。
- `/classroom` 控制室「作答实时」sibling tab，Zustand 客户端聚合（按题选项分布 + 最近 N 条作答流水），零写 Server Action 守卫。
- 5 题型课后统计 discriminated union（countByOption/countByOptionSet/countByBool/topAnswers/topOrderings），按题型分组渲染。
- v4.1 authoritative close gate：`verify:phase` 组合 alias `pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate`，7-stage gate，4-row Manual Surface Sign-Off Ledger 全部 `status: passed`。

## Latest Archived Milestone: v4.1 Multi-Question Types & Teacher Live Dashboard

**Archive status:** Archived 2026-06-10, shipped 2026-06-09 after closure Phase 74.5

**Delivered scope:**

- Phase 73-74, 7 plans, ~50 commits
- 5 题型互动答题（QUIZ-EXT-01-A..E），共用 v4.0 append-only/isLatest 写入路径
- 实时作答传输桥 + 「作答实时」只读仪表盘 tab（QUIZ-EXT-02-A..E）
- v4.1 authoritative close gate（QUIZ-EXT-CLOSE-01..03），7-stage gate，组合 alias

**Close posture:**

- All 3 `v4.1` requirements marked Complete (QUIZ-EXT-01 / 02 / CLOSE).
- Milestone audit 2026-06-10 returned `passed` (3/3 requirements, 2/2 phases, 4/4 integration, 2/2 flows).
- `pnpm verify:phase` = `pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate`，4-row Manual Surface Sign-Off Ledger 全部 `status: passed`.

## Previously Archived Milestone: v4.0 Plugin Marketplace & Plugin-Owned Data

**Archive status:** Archived 2026-06-07 after closure Phase 72.1 hardened the authoritative `verify:phase` close gate and added formal verification + proof mapping + closeout artifacts.

**Delivered scope:**

- Phase 67-72 + inserted 72.1, 25 plans
- Declarative plugin-owned data model (Zod meta-schema + compile-time Drizzle generation + checked-in migrations, zero runtime DDL).
- Governed declarative data-access verbs (`insert` / `upsert` / `getByIndex` / `count` / `aggregate`) routed through Command Bus + governed action registry with verb-level governance audit.
- Interactive single-choice quiz sample plugin: teacher authoring + classroom runtime + student answer submission, all writing to plugin-owned structured tables (append-only / `isLatest`); no built-in backdoor.
- Question stats & post-class recap: per-question correct rate, option distribution, answered/unanswered counts as a read-only SQL GROUP BY projection on plugin-owned data; Stitch/DESIGN-aligned recap UI.
- Marketplace lifecycle: install governance (manifest + `dataModel` validation + namespace uniqueness), semver upgrade with backfill→verify→cutover (zero-loss on real answer data), retain/cleanup uninstall with confirmation token + audit, active-session blocker.
- End-to-end `verify:phase` close gate authoritative across the whole chain: 6 stages, 49 checks, 208 vitest tests, 5 ordered upstream pnpm runners.

**Close posture:**

- All 18 `v4.0` requirements marked Complete (DATA-01..04 / ACCESS-01..03 / QUIZ-01..03 / STATS-01..02 / MKT-01..05 / GATE-01).
- Milestone audit re-run on 2026-06-07 returned `passed` (18/18 requirements, 6/6 phases, 6/6 integration, 3/3 flows).
- 8 partial/unsatisfied REQ-IDs that the 2026-06-05 audit had flagged were all closed by Phase 72.1's strengthened gate + formal verification + proof mapping + closeout artifacts.

## Current State

**Latest shipped milestone:** `v4.0 Plugin Marketplace & Plugin-Owned Data`（archived 2026-06-07）

**What is now validated (v4.1 layer):**

- 多题型互动答题：5 种题型（单选/多选/判断/填空/排序）共用 v4.0 append-only/isLatest 写入路径与受治理 DAL 动词，`plugin_owned_quiz_questions.questionType` additive migration，5-type DTO discriminated union。
- 实时作答传输桥：`quiz.answer.received` WebSocket 事件经 v2.2 classroom-ws 推送到教师端，teacher-only 通道过滤，可选 Redis fanout contract test 双分支。
- 只读实时仪表盘：`/classroom` 控制室「作答实时」sibling tab，Zustand 客户端聚合，零写 Server Action 守卫，下课自动切 v4.0 recap。
- 5 题型课后统计：`buildQuizSampleRecapStats` 扩展为 discriminated union，`ClassroomSessionRecapSurface` 按题型 badge + metric 分组渲染。
- v4.1 authoritative close gate：`verify:phase` 组合 alias `pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate`，7-stage gate（v4.0 5 + 多题型 + 实时仪表盘），4-row Manual Surface Sign-Off Ledger 全部 `status: passed`。

**What is now validated (v4.0 layer):**

- 声明式插件数据模型：插件能在源码内声明结构化自有表（`dataModel` Zod meta-schema 校验），编译为独立 Drizzle 生成片段 + checked-in 迁移；运行时零 DDL，迁移-proof 闸门物理证明（PRAGMA / 级联 / foreign_key_check / 漂移四关）。
- 受治理数据访问：白名单具名、Zod 校验、参数化的 `insert` / `upsert` / `getByIndex` / `count` / `aggregate` 五个动词；写动词经 Command Bus、读动词走 governed DAL；`schoolId` 由 session 派生，禁客户端注入；动词级 governance audit 单表复用。
- 互动答题样板：`quiz` plugin key 走第三方同款治理路径，append-only / `isLatest` 写入 `plugin_owned_quiz_responses`，老师配置 / 学生作答 / 课堂 submit 全部受治理。
- 题目统计 + 复盘：单一 SQL GROUP BY 聚合源，cache tag 失效，Stitch/DESIGN 对齐的 `ClassroomSessionRecapSurface` 题目复盘 section。
- Marketplace 生命周期：external 插件 install preflight / semver backfill→verify→cutover / retain 软禁用 / cleanup token 确认 + 影响面回显 / active-session blocker；`/settings/plugins` UI 走 preflight-first / recover / block reason 三段式。
- Authoritative close gate：`pnpm verify:phase` 是 v4.0 单一外部闸门，必须 hard-fail unless `72.1-CLOSEOUT.md` / `72.1-PROOF-MAPPING.md` / `72-VERIFICATION.md` 存在 + Manual Surface Sign-Off Ledger 记 `status: passed` + 5 ordered pnpm runners 全部绿。

**What is now validated (v3.2 layer, archived 2026-06-02 — still in baseline):**

- AI provider abstraction 已落地：server-only key posture、typed provider errors、双层限流、统一 `aiGenerateText` / `aiGenerateObject` facade。
- LessonAgent typed tool / command path 已落地：`createDraftLessonStepTool`、`lesson.draft.run`、`draftLessonStep` facade、summary-only typed events。
- AI 起草闭环已落地：teacher trigger → run → persist → review → accept/discard → publish 继续复用既有 lesson/version 真相源。
- 教师审校面已对齐 Stitch + `DESIGN.md`：review mode、diff workspace、逐项编辑、玻璃提示与 gradient CTA。
- Eval/guardrails/`verify:phase` 已成为 AI 起草链路的权威 close gate。

**v3.1 layer (archived 2026-05-30 — still in baseline):**

- 课堂投票样板（plugin-first 端到端真实路径）已落地。
- 40/5 容量口径 + restore drill + load/degrade rehearsal evidence 保留为 single-school pilot truth。

**Close note (v3.2 close, retained):** sandbox 不具备真实 OpenAI-compatible provider 和 Redis，v3.2 端到端生成走 mock-provider automated proof + Playwright 视觉验证；不改变生产代码路径，但提醒下一个里程碑若要求「真实生成验收」应先立可重复基础设施。

- `v4.0 Plugin Marketplace & Plugin-Owned Data` 已于 2026-06-07 归档；声明式插件数据模型 + 受治理访问 + marketplace 生命周期 + authoritative close gate 已成为新 validated baseline。
- `v3.2 AI LessonAgent 起草闭环` 已于 2026-06-02 归档；LessonAgent 起草、审校和发布主链仍为 validated baseline。
- 当前 active planning 已清空，等待下一里程碑定义。后续规划必须把 `v4.0` 与 `v3.2` 一并视为已验证 baseline，而不是待补缺口。
- `v3.0 AI Native Educational OS Upgrade` 已于 2026-05-23 归档；第一阶段平台内核升级已经完成。
- `v2.2 WebSocket Classroom Transport Cutover` 已于 2026-05-18 归档。
- `v2.3 Async Task Platform` 已于 2026-05-20 归档。
- `v2.4 Plugin Data Architecture & Default Plugins` 在 Phase 44-48 planning / partial execution 后被冻结，v4.0 已收口为完整 baseline。
- 当前 planning 主问题不再是「插件 marketplace 是否成立」或「平台内核是否存在」，而是下一轮 committed scope 要围绕哪条新用户价值切口推进。

## Most Recently Archived Milestone: v3.2 AI LessonAgent 起草闭环

**Archive status:** Archived 2026-06-02 after closure Phase 66 resolved the milestone audit's E2E gaps.

**Delivered scope:**

- Phase 61-66, 29 plans
- server-only AI provider abstraction, LessonAgent typed tool layer, governed AI draft persistence, teacher review surface, eval/guardrails close gate, and final end-to-end closure wiring

**Close posture:**

- all 18 `v3.2` requirements marked complete
- milestone audit was intentionally preserved as historical pre-close evidence; its gaps were closed rather than accepted as deferred debt

## Previously Archived Milestone: v3.1 Single-School Pilot Production Readiness (Plugin-First)

**Archive status:** Archived 2026-05-30 with milestone audit `passed`.

**Delivered scope:**

- Phase 55-60 plus inserted close-gap phases 60.1 and 60.2, 34 plans
- classroom voting sample chain from authoring -> publish -> launch -> student completion -> teacher/operator verification
- operator recovery surfaces with honest degraded posture and audited recovery actions
- pilot env/release baseline with canonical deploy/rollback, backup/restore, restore drill, and live rehearsal close evidence

**Close posture:**

- all 22 `v3.1` requirements marked complete
- transport fallback remains manual-only operator evidence by design, not an automated green bit

## Previously Archived Milestone: v3.0 AI Native Educational OS Upgrade

**Archive status:** Archived 2026-05-23 with milestone audit `passed` and one residual warning recorded as tech debt.

**Delivered scope:**

- Phase 50-54, 22 plans
- platform vocabulary freeze + authoritative ownership map + deferred wall
- unified Command Bus + durable dual-ledger command truth + shared plugin governance producer seam
- governed action registry + formal plugin lifecycle + typed platform event ledger + operator execution observability
- machine-readable AI-native contracts + delegated audit metadata + minimal governed discoverability surface

**Residual warning at close:**

- AI discoverability still retains a no-scope static fallback helper path; current `/settings/labs` shipped flow is governed, but future callers should stay on scope-aware reads.

## Previously Archived Milestone: v2.3 Async Task Platform

**Archive status:** Archived 2026-05-20 with accepted gaps from the milestone audit.

**Delivered scope:**

- Phase 39-43, 16 plans
- typed task registry + unified enqueue seam + SQLite durable task ledger
- BullMQ worker posture + QueueEvents projection + retry/idempotency/recovery model
- teacher/staff-visible async UX, operator visibility/retry, and multiple real workloads

**Accepted gaps at close:**

- `ATP-22`: teacher `/resources` 与 `LibrarySurface` 仍缺 knowledge source ingest 真实触发入口。
- `ATP-23`: 第 4 类 workload 因产品触发闭环缺失，只能算 partial proof。
- Phase 39 / 40 / 41 仍缺 `VERIFICATION.md` proof artifacts；Phase 40 还缺 `verify:phase40` npm entry。

## Planning Posture

当前没有 active milestone。下一里程碑应从已归档的 `v4.1` 多题型 + 实时仪表盘 + `v4.0` 插件 marketplace 闭环 + `v3.2` AI draft-loop truth + `v3.1` single-school pilot truth 出发，选择新的 committed 用户价值切口，而不是重开已完成 baseline。

**Next planning constraints:**

- 把多题型互动答题 + 实时仪表盘 + v4.1 authoritative close gate 视为 v4.1 validated baseline。
- 把声明式插件数据模型 + 受治理访问 + 互动答题样板 + marketplace 生命周期 + authoritative close gate 视为 v4.0 validated baseline。
- 把 LessonAgent 起草闭环、classroom voting 样板链路、operator recovery、pilot deploy/release/restore 与 40/5 rehearsal 视为 v3.1/v3.2 validated baseline。
- 保持既有 WebSocket-first、optional Redis fanout、BullMQ、SQLite + DAL truth posture，不把已交付能力重新描述为缺口。
- 若下一里程碑要求真实 LLM 端到端验收，先显式纳入 provider/Redis bootstrap 或 staging proof lane，而不是在 close 时临时补环境。
- 候选下一里程碑 scope：AI 出题（QUIZ-EXT-03）、upgrade dry-run（MKT-EXT-01）、跨 pluginKey 完整恢复（MKT-EXT-02）、非答题类插件二次泛化（MKT-EXT-03）、商店运营层（STORE-01）。
- 继续推迟多校多租户、PostgreSQL/pgvector cutover、重型 observability 平台迁移、Agent Runtime 扩张、runtime 动态建表 / eval / 任意第三方代码执行，除非新 milestone 明确承接。
- 下一轮 scope 应通过 `/gsd:new-milestone` 正式建立，而不是直接恢复旧 `REQUIREMENTS.md`。

<details>
<summary>Archived v2.2 milestone context</summary>

**Goal:** 在已完成的 transport boundary、auth/data/durability baseline 之上，把课堂实时链路从单向 SSE 升级为真正双向的 `WebSocket` 通信，并以 `ioredis` 承接 fanout 与多实例分发。

**Target features:**
- 用 `ws` 建立课堂与 runtime 的鉴权握手、双向消息信封、连接注册表与 session-scoped channel contract。
- 用 `ioredis` 把 WebSocket fanout 升级为多实例可工作的 delivery 层，但不让 Redis 取代 SQLite + DAL 的业务真相源地位。
- 保持 teacher control、student sync、runtime command、snapshot recovery 和 locked/unlocked classroom 语义不回退。
- 为新的实时链路补齐 canonical verification、fallback posture、local bootstrap 与 observability，而不是只做局部技术替换。

**Planning posture at kickoff:**
- `v2.2` 是在 Phase 31 transport boundary 与 Phase 33-35 auth/data/durability close 的基础上启动的新 milestone。
- 本轮 committed scope 固定为 `ws + ioredis`，而不是泛化的 infra rewrite。
- `RTPX-01`、`RTPX-04`、`RTPX-05`、`RTPX-06` 在 kickoff 时就已明确继续 deferred。

</details>

## Requirements

### Validated

- [x] 建立 Next.js 16 + React 19.2 + Turbopack 的应用基础设施。
- [x] 使用 Auth.js v5、Drizzle ORM 和 SQLite 首发实现角色鉴权基础。
- [x] 建立 DAL 边界，禁止 UI 组件直接访问数据库。
- [x] 实现课程、课时和步骤模型，支持 `content`、`task`、`quiz` 三类原子步骤。
- [x] 实现教师端教案编辑器与 LexoRank 无级联拖拽排序。
- [x] 实现学生端播放器、课堂控制台、断点续播、课堂锁定模式与课堂证据闭环。
- [x] 实现 Stitch 对齐的教师规划、课堂运行、评价、分析等产品化页面。
- [x] 已在主工程内建立 runtime-platform feature roots、shared contract seam、sandboxed HTML runtime pilot、canonical runtime session/event truth、governance audit 与 transport boundary。（Validated in Phases 27-31）
- [x] 已证明教师 `editor/publish -> launch/classroom -> student runtime submit -> inspector` 的 runtime-hosted lesson 主链路可重复跑通，并具备 proof-oriented hardening 与 close gate。（Validated in Phase 32）
- [x] 已完成课堂与 runtime 的 WebSocket-first transport cutover，并保留 SSE rollback surface 作为 documented fallback posture。（Validated in Phase 36）
- [x] 已完成 optional `ioredis` fanout、session transport snapshot、local-only default posture 与 degraded operator visibility。（Validated in Phase 37）
- [x] 已建立 `verify:phase38`、route-by-route parity proof、fallback matrix、demo runbook 与 closeout artifact，v2.2 close 结论不再依赖人工解释。（Validated in Phase 38）
- [x] 已建立可复用的 Async Task Platform，包括 typed task registry、统一 enqueue boundary、BullMQ worker bootstrap 与 SQLite task ledger。（Validated in Phases 39-43；Phase 39 proof artifact 仍是 accepted gap）
- [x] 已让后台任务具备 retry/backoff、dead-letter、幂等、graceful shutdown 与 operator-visible failure posture。（Validated in Phases 40-43；Phase 40 proof artifact 仍是 accepted gap）
- [x] 已让教师或 staff 能看到任务排队、运行、完成、失败与结果摘要，而不是只得到同步请求超时或模糊反馈。（Validated in Phases 41-43；Phase 41 proof artifact 仍是 accepted gap）
- [x] 已冻结 `v3.1` 单校试点口径：课堂投票插件、教师设计到学生完成的样板链路、40/5 容量目标、proof artifact 与 close gate。（Validated in Phase 55 / v3.1）
- [x] 已让课堂投票插件的 authoring、publish preflight、compatibility check、runtime launch readiness 与 student completion 成为真实可重复链路。（Validated in Phases 56-57 and close-gap Phase 60.2 / v3.1）
- [x] 已为教师与 operator 提供课堂、插件、command、task 的关联观测与可执行恢复动作，而不是只暴露研发导向的原始诊断面。（Validated in Phase 58 / v3.1）
- [x] 已补齐 env、release、health/ready、backup/restore、restore drill、load/degrade rehearsal 等单校试点上线必需层。（Validated in Phases 59-60 and close-gap Phase 60.1 / v3.1）
- [x] 已保持 SQLite + DAL 作为唯一 durable truth，并在插件 action、课堂提交、异步后处理路径上补齐强校验、幂等、补偿与 replay-safe 语义。（Validated across Phases 56-60 / v3.1）
- [x] 已建立 server-only AI provider 抽象层、`aiGenerateText/Object` facade、typed provider errors、双层限流与 no-leak 静态边界。（Validated in Phase 61 / v3.2）
- [x] 已交付 LessonAgent typed tool、`lesson.draft.run` 命令编排、summary-only AI 领域事件、draft persistence 复用既有 lesson/version 真相源。（Validated in Phases 62-63 / v3.2）
- [x] 已交付教师审校面（`mode=review`、diff、accept/discard），并对齐 Stitch + `DESIGN.md` 的 Lexend、tonal surface、glass/gradient CTA。（Validated in Phase 64 / v3.2）
- [x] 已建立 eval/guardrails/`verify:phase` 端到端质量闸门与 closure 阶段打通 teacher trigger、run→persist、accept/discard command-bus 生产路径。（Validated in Phases 65-66 / v3.2）
- [x] 已建立声明式 `dataModel` DSL：插件能在源码内声明结构化自有表，由 Zod meta-schema 在边界处拒绝非法声明，编译为独立 Drizzle 生成片段 + checked-in 迁移，运行时零 DDL，迁移-proof 闸门物理证明。（Validated in Phase 67 / v4.0, DATA-01..04）
- [x] 已交付受治理白名单具名、Zod 校验、参数化的数据访问动词（`insert` / `upsert` / `getByIndex` / `count` / `aggregate`），写动词经 Command Bus、读动词走 governed DAL，禁直连 / 禁原始 SQL / 禁客户端注入 `schoolId`。（Validated in Phase 68 / v4.0, ACCESS-01..03）
- [x] 已交付互动答题样板插件：老师配置 + 学生作答 + append-only / `isLatest` 持久化，全程走与第三方完全相同的受治理路径，样板无 built-in 后门。（Validated in Phase 69 / v4.0, QUIZ-01..03）
- [x] 已交付基于插件自有作答数据的题目统计 + 课后复盘：每题正确率、选项分布、作答-未作答人数，单一 SQL GROUP BY 聚合源，Stitch/DESIGN 对齐的 recap 界面。（Validated in Phase 70 / v4.0, STATS-01..02）
- [x] 已交付 marketplace 生命周期：external 插件 install 治理、semver backfill→verify→cutover 零丢失升级、retain/cleanup 卸载带确认 token 与影响面回显、active-session 阻断。（Validated in Phase 71 / v4.0, MKT-01..05）
- [x] 已建立 `pnpm verify:phase` authoritative end-to-end close gate：6 stages / 49 checks / 208 vitest tests / 5 ordered upstream pnpm runners；hard-fail unless `72.1-CLOSEOUT.md` / `72.1-PROOF-MAPPING.md` / `72-VERIFICATION.md` 存在 + Manual Surface Sign-Off Ledger `status: passed`。（Validated in Phases 72-72.1 / v4.0, GATE-01）

- [x] 多题型互动答题（QUIZ-EXT-01-A..E）—— v4.1
- [x] 教师只读实时作答流水（QUIZ-EXT-02-A..E）—— v4.1
- [x] v4.1 authoritative close gate（QUIZ-EXT-CLOSE-01..03）—— v4.1
- [x] 声明式 `dataModel` DSL + compile/don't execute 范式物理证明 —— v4.0
- [x] 5 个受治理数据访问动词 + dispatchPluginDataAccess facade —— v4.0
- [x] 互动答题样板打穿「老师配置→学生作答→课后统计」全链 —— v4.0
- [x] Marketplace 生命周期（install/upgrade/uninstall）—— v4.0
- [x] `pnpm verify:phase` authoritative end-to-end close gate —— v4.0 + v4.1

### Active

_当前没有 active milestone。下一里程碑应由 `/gsd:new-milestone` 建立。_

### Out of Scope

- PostgreSQL 作为首发数据库。
- 完整移动原生 App。
- 任意第三方插件代码执行。
- 插件直接访问数据库或核心 API。
- 完整 LMS 替代能力。
- 多校多租户完整 SaaS 运营体系。
- 插件商店化运营外延：付费/计费、评分评论、公开开发者门户、自动化审核流水线（v4.0 只做受治理的发布→安装→升级→卸载核心闭环，不做商店运营层）。
- Classroom realtime 主链路重写；`v2.2` 已完成 transport cutover，本轮只验证样板链路承载能力。
- BullMQ/async platform 重写、第二套 workflow engine 或 AI runtime expansion。
- 第三方 runtime/package governance、QuickJS sandbox、Extension Host、多进程插件宿主。
- PostgreSQL primary cutover、pgvector、Kafka/NATS/Redis Streams、Kubernetes/Helm/ArgoCD、Prometheus/Grafana/Loki/ELK 全家桶。
- runtime manifest 驱动的动态建表、动态执行 SQL migration，或插件绕过主仓库迁移体系直接修改数据库结构。
- 为单个插件需求在核心表上持续堆叠插件专属 nullable 列，导致 core schema 被插件污染。
- 按 school / plugin installation 动态创建物理表或引入多数据库 / PostgreSQL schema-per-plugin 模型。
- 以"生产化"为名把 `v3.0` 之后的 Agent/Skill/Capability 扩张一次性打包进入当前 milestone。

## Context

OpenLearn Next 的产品判断是：课堂应成为可编程系统，教学应变成可计算流程。核心业务围绕教师编排课堂、学生按步骤参与、系统记录学习进度和提交、AI Agent 辅助生成与分析展开。

当前代码已经具备 `courses`、`courseClasses`、`courseEnrollments`、`lessons`、`publishedLessonVersions`、`lessonStepProgress`、`taskSubmissions`、`quizAttempts`、`classroomSessions`、`classroomParticipants`、`classroomEvents` 等核心 schema，也已经支持教师端编排、预览、发布，学生端学习与提交，课堂运行与评价闭环。

`v4.0` 在此基础上进一步落地了：
- 插件自有结构化数据表（`plugin_owned_quiz_questions` / `plugin_owned_quiz_responses` / `plugin_owned_business_data`）由 Zod meta-schema 校验的 `dataModel` 声明、编译为独立 Drizzle 生成片段、checked-in 迁移、`verify:phase` 物理证明 zero drift。
- 五个受治理数据访问动词（`insert` / `upsert` / `getByIndex` / `count` / `aggregate`）走单一白名单 + Zod 派生 + dispatchPluginDataAccess facade + Command Bus 写入 + 治理审计，零注入面。
- marketplace surface 把 external 插件的 install / upgrade / retain/cleanup 卸载绑回 `pluginOwnedBusinessData` + governance audit，semver 升级走 backfill→verify→cutover，并对真实答题数据零丢失。
- authoritative `verify:phase` close gate 跨整链回归（6 stages / 49 checks / 208 tests），含 `/settings/plugins` 与课后复盘面板的 Manual Surface Sign-Off。

`v4.0` 的核心不是新抽象能力，而是把已冻结的 v2.4 插件脚手架收口为「声明在代码、迁移在主仓库 review、运行时只 CRUD」的受治理闭环，并以「互动答题」单一强样板打穿「老师用插件设计课堂活动 → 学生作答 → 课后统计复盘 → 升级/卸载治理」完整链路。

## Constraints

- **Tech stack**: 必须使用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite 首发。
- **Data access**: UI 组件禁止直连数据库，所有读写必须通过 DAL 和 Server Actions。
- **Runtime**: Node.js 20.9+ 为主，WebSocket-first classroom transport 与 worker 继续由 Node runtime 承接，SSE 只保留为 rollback surface。
- **Caching**: Next.js 16 必须显式缓存，写入后必须更新或失效 tag。
- **Database**: 首发只针对 SQLite，所有关联必须 cascade delete。
- **Plugin-first**: `v4.0` 真实样板固定为「互动答题」；插件必须走与第三方完全相同的受治理路径，不得退化为 built-in 特例。
- **Compile, don't execute**: 插件自有表的 DDL 必须在主仓库迁移体系内 review，运行时零 DDL。
- **Realtime**: 课堂实时链路现为 WebSocket-first，并保留 SSE rollback surface，支持 locked/unlocked。
- **Security**: 插件禁止 `eval()`、动态执行第三方代码、直接访问 DB 或核心 API。
- **Design**: 页面实现必须参考 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`。

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 使用 Next.js 16 + React 19.2 + Turbopack | 对齐未来生态、显式缓存、PPR 和极速构建目标 | ✓ Good |
| 首发仅支持 SQLite | 降低 v1 部署复杂度，先验证课堂流程核心价值 | ✓ Good |
| DAL + Server Actions 作为唯一数据访问入口 | 集中权限校验、DTO 清洗和缓存失效逻辑 | ✓ Good |
| 使用 `proxy.ts` 替代 `middleware.ts` | 对齐 Next.js 16 运行时约束，只做轻量保护 | ✓ Good |
| 课堂步骤排序采用 LexoRank | 支持拖拽重排时无级联更新，适合高频编辑 | ✓ Good |
| 插件系统采用声明式 JSON + Hook + Core API | 保持扩展能力同时控制安全边界 | ✓ Good |
| v2.0 采用"单体内平台化"而非 big-bang rewrite | 在保留现有 Next.js、DAL 与课堂主链路的前提下建立 runtime boundary 与 contract，降低迁移 blast radius | ✓ Good |
| WebSocket cutover 在 v2.2 作为独立 milestone 落地，而不是继续停留在 seam-only 状态 | 复用 Phase 31 transport gateway 与 Phase 33-35 baseline，把 blast radius 限定在 delivery 层 | ✓ Good |
| Redis fanout 在 v2.2 保持 optional、deploy-authoritative、delivery-only posture | 让 Redis 提供多实例 delivery 能力，但不取代 SQLite + DAL 的 durable truth 地位 | ✓ Good |
| `verify:phase38` 作为唯一外部 milestone close gate | milestone close 不应继续依赖人工组合 verifier、fallback doc 和 demo 口径 | ✓ Good |
| v2.3 Async Task Platform 采用 BullMQ + 独立 worker 进程 + SQLite task ledger | 让 Redis/BullMQ 只承担 orchestration 与 execution 角色，同时保持现有 DAL/DTO/cache discipline 不被绕过 | ✓ Good |
| teacher-facing async UX 保持 business-entity-first posture，而不是把产品面重构成独立 task center | 让教师继续从 batch/reminder/resource 语义理解系统，而不是暴露平台内部中心化术语 | ✓ Good |
| milestone audit 必须区分"真实产品闭环缺口"和"proof artifact 缺口" | 避免把代码 blocker 与文档/verification debt 混成一个模糊结论 | ✓ Good |
| 插件数据模型优先采用 extension table + plugin-owned table，而不是 core table 污染或 runtime DDL | 在 SQLite-first 单体里兼顾灵活扩展、可迁移性和治理边界 | ✓ Good（v4.0 Phase 67）|
| 默认插件必须复用正式插件数据治理模型，而不是继续依赖 built-in 特例 | 只有系统模块自己走通这套模型，插件架构才算真实成立 | ✓ Good（v4.0 Phase 69）|
| `v3.0` 采用 `openlearn_next_upgrade_plan.md` 作为新的平台升级蓝图 | 需要把当前系统从"已有功能闭环"推进到"AI Native Educational OS" 的正式平台演进路径 | ✓ Good |
| `v3.0` 第一阶段先做 Command Bus、Dynamic Action Registry、Plugin Lifecycle、Event Bus | 这些是低 blast radius 且能支撑后续 Agent / Skill / Capability / Observability 演进的内核能力 | ✓ Good |
| 未完成的 `v2.4` 冻结为历史 planning context，而不是自动并入 `v3.0` committed scope | 避免把插件数据治理尾项与更大平台升级混成单个失控 milestone | ✓ Good |
| `v3.1` 定义为"单校试点生产可用（插件先行）" | 避免 milestone 继续滑向抽象平台建设或泛生产化口号 | ✓ Good |
| `v3.1` 的真实样板固定为课堂投票插件 | 需要先打穿一个强样板闭环，而不是同时追多个插件类型 | ✓ Good |
| `v3.1` 主链路固定为"教师设计 -> 发布 -> 开课 -> 学生课堂完成" | 所有 production work 都必须挂靠真实课堂路径，避免 infra-first 漂移 | ✓ Good |
| `v3.1` 容量口径固定为单课堂 40 学生、同时 5 个课堂 | 没有定量容量与 degraded 假设，就无法建立 load / rehearsal close gate | ✓ Good |
| `v3.1` 继续复用 WebSocket-first、optional Redis fanout、BullMQ 与 SQLite + DAL truth posture | 已交付 baseline 不应被误写成缺口或被无必要重写 | ✓ Good |
| `verify:phase59` 必须先收紧为 repo-local hard gate，再允许 rollout / rollback / restore 叠加进 release baseline | 先固定 honest release contract，避免 shell artifact 先行而 gate 语义漂移 | ✓ Good |
| `/api/release` 只读取 canonical `current.json` / `green.json` 指针 | release identity 必须来自单一权威来源，不能靠扫描 manifest 目录猜测"最新版本" | ✓ Good |
| canonical close evidence 只能记账 live rehearsal 与真实 deploy / rollback notes | single-school pilot close 不能再接受 dry-run artifact 伪装成 production proof | ✓ Good |
| transport fallback 在 `v3.1` close 中继续保持 manual-only evidence | 当前需要诚实保留 operator lane，而不是为了自动化覆盖率牺牲 truthfulness | ✓ Good |
| `v3.2` 必须先走 provider → tool → draft → review → eval，再允许 E2E closure phase 打通生产接缝 | 先建立每段 contract，再集中修真实 orchestration seam，能把 blocker 压缩进单个 closure phase | ✓ Good |
| 对 milestone audit 暴露的跨 phase 断缝，优先补真实生产路径而不是接受为 tech debt | 单 phase verifier 全绿不代表里程碑闭环成立；必须让 teacher trigger、run→persist、accept/discard bus path 真正落地 | ✓ Good |
| sandbox 中缺 provider/Redis 时，真实生成 close 可用 mock-provider automated proof + Playwright 视觉验证替代，但要明确记录环境限制 | 保持 close honesty，不伪造 live LLM 证据，同时不阻断已通过 contract/integration tests 的 milestone 归档 | ✓ Good |
| `v4.0` 插件自有数据采用「compile, don't execute」：声明在源码、迁移在主仓库 review、运行时只 CRUD 零 DDL | 在 SQLite-first 单体里既给插件结构化自有表能力，又把建表收口为可审计的 checked-in Drizzle 迁移，杜绝运行时动态 DDL 红线 | ✓ Good（Phase 67）|
| Phase 67 meta-schema 是声明面唯一安全边界：表名/列名/pluginKey 一律过 IDENTIFIER 正则 | 编译器以 `export const ${name} = sqliteTable(` 直出 TS，任何未经标识符约束的声明名都是编译期 TS 代码注入面（CR-01），结构约束必须前置在边界 | ✓ Good（Phase 67）|
| schema-drift gate 在 migration-first 下视为已接受 false positive，经 `GSD_SKIP_SCHEMA_CHECK=true` 旁路 | fresh-DB 迁移已物理证明（PRAGMA/级联/foreign_key_check/漂移四关），drift 仅源于本地未推送 ORM 快照，不构成真实风险 | ✓ Good（Phase 67）|
| Phase 68-01：白名单编译期派生单一真相源（`pluginDataAccessAllowlist`），消费层反射读取零硬编码；10 类具名拒因（7 形状本层 + 3 治理 Plan02）| 任何动词判别 / 表名 / 列名都从同一份 allowlist 派生，零硬编码漂移面 | ✓ Good（Phase 68）|
| Phase 68-04：`dispatchPluginDataAccess` facade 路由 5 个动词（writes→Command Bus producers, reads→direct governed DAL）；read verbs `getByIndex`/`count`/`aggregate` 强制 session-derived `schoolId` scope + denied-only audit + aggregate 仅投影 `{key, count}` | 入口收口 + scope 强约束 + 审计最小化 + 投影最小化四层防线 | ✓ Good（Phase 68）|
| Phase 69 corrective（2026-06-05）：quiz sample classroom submit path 必须把 governed plugin key `quiz`（而非 built-in registration id）送进 `dispatchPluginDataAccess` | 样板必须走与第三方完全相同的受治理路径，否则 `verify:phase69` 会以 `non_school_actor_rejected` 失败 | ✓ Good（Phase 69）|
| Phase 70-01：题目统计用单一 SQL GROUP BY 聚合源（cache tag `quizStats:${sessionId}` 失效），不回写核心 analytics 表 | 避免应用层 `JSON.parse`、避免 Redis/第二源；写答题时 `updateTag` 保持复盘新鲜 | ✓ Good（Phase 70）|
| Phase 71-04：`/settings/plugins` 走 preflight-first / recover / block reason 三段式 UI，不在升级 / 卸载前暴露"一键"破坏性动作 | 把治理边界变成操作者可见的实操反馈，而不是隐藏在内部 | ✓ Good（Phase 71）|
| Phase 72.1：close gate 从「顺序编排器」升级为「authoritative milestone close gate」—— 必须 hard-fail unless `72.1-CLOSEOUT.md` / `72.1-PROOF-MAPPING.md` / `72-VERIFICATION.md` 存在 + Manual Surface Sign-Off Ledger `status: passed` + bridge / final-artifact / manual sign-off 三个独立阶段都绿 | milestone close 不能再依赖"verifier 跑通即完事"，必须把审计 artifact 的物理存在性 + 真实 UI 验收都纳入闸门 | ✓ Good（Phase 72.1）|
| Phase 72.1：先 proof mapping 后 closeout、最后 gate wiring（D-72.1-16：conclusion never leads evidence） | 避免 milestone 闭环叙事在证据之前就锁定；任何 closeout 都先有 proof mapping | ✓ Good（Phase 72.1）|
| v4.1 scope N=2 bundle (QUIZ-EXT-01 + QUIZ-EXT-02)，统一 `pluginKey = "quiz"`，复用 v4.0 单选样板 + v2.2 WebSocket-first transport | 小 scope 纵深延展，不重起 marketplace / governance / data-access verbs | ✓ Good（v4.1）|
| v4.1 题型枚举 `single_choice` | `multi_choice` | `true_false` | `fill_blank` | `ordering`（5 种），全部走 D-72.1-04 append-only/isLatest 写入路径 | 在 v4.0 单选基线上 additive 扩展，不破坏既有唯一索引与写入契约 | ✓ Good（v4.1）|
| `quiz.answer.received` 是新 WS event kind，遵循 v2.2 contract envelope，teacher-only channel | 复用已有 transport，不创建新 WS endpoint | ✓ Good（v4.1）|
| v4.1 dashboard tab 是 `/classroom` 控制室内的 sibling tab，不创建新路由，零写 Server Action | 最小 blast radius，保持 v4.0 write-path discipline | ✓ Good（v4.1）|
| v4.1 close gate 复用 v4.0 72.1 范式，stage 5→7，`verify:phase` 组合 alias | 单一权威入口不破，先 proof mapping 后 closeout 后 gate wiring discipline 跨 milestone 传承 | ✓ Good（v4.1）|

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-10 after starting v4.2 Marketplace 泛化验证*
