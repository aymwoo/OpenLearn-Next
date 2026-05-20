# OpenLearn Next

## What This Is

OpenLearn Next 是一个面向未来教育的 AI 原生开源操作系统，核心是基于步骤的课堂流程引擎、AI 多 Agent 协作平台和开放插件生态。它让教师把课堂拆成导入、讲授、互动、练习、总结等可编排原子步骤，并为教师配备可协同产出教学包的 AI 团队。

系统面向学校、教师、学生、家长、开发者和 AI Agent，首发聚焦可运行的课堂编排与学习闭环，而不是一次性铺满完整教育 SaaS。

## Core Value

教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。

## Current State

- `v2.2 WebSocket Classroom Transport Cutover` 已于 2026-05-18 归档，课堂实时链路现已进入 WebSocket-first posture。
- `ioredis` fanout 已作为 optional、deploy-authoritative 的 delivery capability 落地；Redis degraded posture 会在 `/settings`、runtime inspector 与 teacher `/classroom` 中显式暴露。
- `verify:phase38` 已成为当前可重复 rerun 的 transport close gate；SSE rollback surface 仍保留并被文档化。
- durable truth 继续由 SQLite + DAL + canonical classroom/runtime write path 持有，Redis、BullMQ 与 WebSocket 都不成为新的业务真相源。
- `v2.3 Async Task Platform` 已于 2026-05-20 归档；typed task registry、统一 enqueue boundary、SQLite task ledger、dedicated worker、operator visibility 与 safe retry posture 已落地。
- batch import、scheduled reminders 与 classroom event post-processing 已形成真实产品闭环；resource processing 的平台层 wiring 已交付，但 `/resources` 产品触发入口和部分 milestone proof artifact 仍作为 accepted gaps 保留。
- 当前没有 active milestone；下一轮需要先决定是补 `v2.3` closure gaps，还是启动新的 frontier milestone。

## Most Recently Archived Milestone: v2.3 Async Task Platform

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

## Next Milestone Goals

- 先决定是否开一个小 closure slice 收口 `v2.3` accepted gaps；如果要收口，范围应只限于 resource-ingest product trigger 与 proof-chain artifacts。
- 若不继续补 `v2.3`，则通过 `/gsd-new-milestone` 重新定义新的 `.planning/REQUIREMENTS.md`，避免在没有明确 milestone 的情况下继续堆实现。
- 无论选择哪条路，都继续沿用“单体内平台化”路线：SQLite + DAL 持有 durable truth，Redis/BullMQ/WebSocket 只承担 orchestration 与 delivery 角色。

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

### Active

- [ ] 补齐 `ATP-22`：给 teacher `/resources` / `LibrarySurface` 接上 knowledge source ingest 真实触发入口，闭合 resource-processing 产品主链路。
- [ ] 补齐 `ATP-23` 的第 4 类 workload product proof，并重新跑 milestone audit 把 accepted gap 收口。
- [ ] 为 Phase 39 / 40 / 41 补 `39-VERIFICATION.md`、`40-VERIFICATION.md`、`41-VERIFICATION.md`，并注册 `verify:phase40`，把 async platform proof chain 变成可重复 close gate。
- [ ] 选定下一 milestone frontier，避免同时重开 PostgreSQL、AI runtime、third-party runtime governance 等多个 deferred frontiers。

### Out of Scope

- PostgreSQL 作为首发数据库。
- 完整移动原生 App。
- 任意第三方插件代码执行。
- 插件直接访问数据库或核心 API。
- 完整 LMS 替代能力。
- PostgreSQL cutover in v2.3 — 这轮先证明 async platform 模式成立，而不是把它和主库迁移绑在一起。
- Classroom realtime 主链路重写 — `v2.2` 刚完成 transport cutover，不重开课堂实时主链路 blast radius。
- AI runtime expansion — 后台任务平台先用 deterministic product jobs 证明价值，不在本轮扩成 AI 执行平台。
- 第三方 runtime/package governance — 这属于独立 trust boundary 问题，不和内部 async platform 一起推进。
- PostgreSQL primary cutover、第二 runtime 类型、第三方 runtime package、sandbox 增强或 AI runtime expansion，不因 `v2.3` 归档而自动进入执行状态。

## Context

OpenLearn Next 的产品判断是：课堂应成为可编程系统，教学应变成可计算流程。核心业务围绕教师编排课堂、学生按步骤参与、系统记录学习进度和提交、AI Agent 辅助生成与分析展开。

当前代码已经具备 `courses`、`courseClasses`、`courseEnrollments`、`lessons`、`publishedLessonVersions`、`lessonStepProgress`、`taskSubmissions`、`quizAttempts`、`classroomSessions`、`classroomParticipants`、`classroomEvents` 等核心 schema，也已经支持教师端编排、预览、发布，学生端学习与提交，课堂运行与评价闭环，以及 runtime-platform foundation、sandboxed HTML runtime、transport boundary、WebSocket cutover、optional Redis fanout 与 async task platform。

这意味着“可运行的课堂闭环基础”、`Runtime Platform` 第一轮核心边界、以及通用后台任务平台都已经成立。当前真正的规划问题不再是“BullMQ/worker 能不能接进来”，而是应该先收口 `v2.3` accepted gaps，还是优先推进下一个 deferred frontier，并避免重新把多个基础设施迁移绑成一个大而散的 milestone。

当前主工程仍以 `src/app` 为中心，但已经落地 `src/features/runtime-platform/*`、shared contracts、runtime host、typed event truth、plugin lifecycle、transport boundary、WebSocket-first classroom transport、optional Redis fanout、`src/features/async-tasks/*` 和 canonical milestone close gates。后续应该继续沿用“单体内平台化”的渐进路线，而不是回退成 big-bang infra rewrite。

## Constraints

- **Tech stack**: 必须使用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite 首发。
- **Data access**: UI 组件禁止直连数据库，所有读写必须通过 DAL 和 Server Actions。
- **Runtime**: Node.js 20.9+ 为主，WebSocket upgrade 与 transport host 由 Node runtime 承接，SSE 只保留为 rollback surface。
- **Caching**: Next.js 16 必须显式缓存，写入后必须更新或失效 tag。
- **Database**: 首发只针对 SQLite，所有关联必须 cascade delete。
- **Realtime**: 课堂实时链路现为 WebSocket-first，并保留 SSE rollback surface，支持 locked/unlocked。
- **Security**: 插件禁止 `eval()`、动态执行第三方代码、直接访问 DB 或核心 API。
- **Design**: 页面实现必须参考 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`。

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 使用 Next.js 16 + React 19.2 + Turbopack | 对齐未来生态、显式缓存、PPR 和极速构建目标 | — Pending |
| 首发仅支持 SQLite | 降低 v1 部署复杂度，先验证课堂流程核心价值 | — Pending |
| DAL + Server Actions 作为唯一数据访问入口 | 集中权限校验、DTO 清洗和缓存失效逻辑 | — Pending |
| 使用 `proxy.ts` 替代 `middleware.ts` | 对齐 Next.js 16 运行时约束，只做轻量保护 | — Pending |
| 课堂步骤排序采用 LexoRank | 支持拖拽重排时无级联更新，适合高频编辑 | — Pending |
| 插件系统采用声明式 JSON + Hook + Core API | 保持扩展能力同时控制安全边界 | — Pending |
| v2.0 采用“单体内平台化”而非 big-bang rewrite | 在保留现有 Next.js、DAL 与课堂主链路的前提下建立 runtime boundary 与 contract，降低迁移 blast radius | — Pending |
| WebSocket cutover 在 v2.2 作为独立 milestone 落地，而不是继续停留在 seam-only 状态 | 复用 Phase 31 transport gateway 与 Phase 33-35 baseline，把 blast radius 限定在 delivery 层 | ✓ Good |
| Redis fanout 在 v2.2 保持 optional、deploy-authoritative、delivery-only posture | 让 Redis 提供多实例 delivery 能力，但不取代 SQLite + DAL 的 durable truth 地位 | ✓ Good |
| `verify:phase38` 作为唯一外部 milestone close gate | milestone close 不应继续依赖人工组合 verifier、fallback doc 和 demo 口径 | ✓ Good |
| v2.3 Async Task Platform 采用 BullMQ + 独立 worker 进程 + SQLite task ledger | 让 Redis/BullMQ 只承担 orchestration 与 execution 角色，同时保持现有 DAL/DTO/cache discipline 不被绕过 | ✓ Good |
| teacher-facing async UX 保持 business-entity-first posture，而不是把产品面重构成独立 task center | 让教师继续从 batch/reminder/resource 语义理解系统，而不是暴露平台内部中心化术语 | ✓ Good |
| milestone audit 必须区分“真实产品闭环缺口”和“proof artifact 缺口” | 避免把代码 blocker 与文档/verification debt 混成一个模糊结论 | ✓ Good |

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
*Last updated: 2026-05-20 after archiving milestone v2.3 Async Task Platform*
