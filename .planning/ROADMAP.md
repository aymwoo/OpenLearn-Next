## ROADMAP

**Current milestone:** `v2.3 Async Task Platform`
**Status:** ◆ In Progress
**Phase range:** Phase 39-43
**Total plans:** 15
**Previous archive:** `.planning/milestones/v2.2-ROADMAP.md`

## Overview

`v2.3` 的目标不是再做一轮基础设施大迁移，而是在现有 Next.js 单体、SQLite durable truth、DAL/Server Actions 边界和已交付的 WebSocket/Redis delivery posture 之上，补齐一个可复用、可观测、可重试的 Async Task Platform，并用四类真实后台任务证明这套平台成立。

本 milestone 的成功线是：先固定 typed task registry、统一 enqueue boundary、SQLite task ledger 和独立 worker 进程，再把 retry/backoff、幂等、operator recovery、teacher/staff-visible status 做成统一模型，最后把 batch import、scheduled reminders、event post-processing、resource processing 放到同一平台 contract 上验证。Redis/BullMQ 只承担 orchestration 与 execution 角色，不成为新的业务真相源。

## Milestones

- ✅ **v2.2 WebSocket Classroom Transport Cutover** - Phase 36-38 shipped 2026-05-18. See `.planning/milestones/v2.2-ROADMAP.md`.
- ◆ **v2.3 Async Task Platform** - Phase 39 complete, Phase 40-43 pending.

## Phases

<details>
<summary>✅ v2.2 WebSocket Classroom Transport Cutover (Phases 36-38) - SHIPPED 2026-05-18</summary>

- Archived at `.planning/milestones/v2.2-ROADMAP.md`.
- Scope remained limited to `ws + ioredis` classroom transport cutover, fallback posture, and canonical close artifacts.

</details>

### ◆ v2.3 Async Task Platform (In Progress)

**Milestone Goal:** 在不重开 classroom realtime mainline、不过早绑定 PostgreSQL 或 AI runtime 的前提下，交付可复用的 async execution platform，并让真实教育任务通过同一套 durable truth、worker posture、status/read model 和 operator recovery 跑通。

**Guardrails:**

- SQLite + DAL 继续持有业务真相，Redis/BullMQ 不升级为 application truth。
- worker 必须是独立进程入口，不能并入 `server.ts` 或请求生命周期。
- 所有入队都走统一 enqueue boundary，UI 和 route 不直接碰队列。
- milestone 验证必须覆盖四类真实任务，而不是只交一个 demo job。

#### Phase 39: Async contracts and durable task truth

**Goal**: 建立 `src/features/async-tasks` 基础 root、typed task registry、统一 enqueue contract 和 SQLite task ledger，让平台先拥有稳定 truth 与 DTO/read model。
**Depends on**: Phase 38
**Requirements**: ATP-01, ATP-02, ATP-03
**Success Criteria** (what must be TRUE):
1. Developer can define background task types in one typed registry with stable task type ids plus payload, progress, and result contracts.
2. Server-side code can create durable async task records only through one platform enqueue boundary instead of ad hoc queue calls.
3. Product surfaces can read normalized task status, progress, and outcome DTOs from SQLite ledger tables without depending on BullMQ state.
**Plans**: 3 plans

Plans:
**Wave 1**
- [x] 39-01-PLAN.md - Add the `src/features/async-tasks` feature root, typed task registry, and shared Zod contracts.

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 39-02-PLAN.md - Add the SQLite async task ledger schema, event history tables, and DAL read models for task DTOs.

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 39-03-PLAN.md - Add the application enqueue boundary and intent recording so server actions enqueue through one platform seam.

#### Phase 40: BullMQ infra seam and worker reliability posture

**Goal**: 在不改业务主链路的前提下跑通 enqueue -> worker pickup -> QueueEvents projection -> durable status update 的平台闭环，并把 retry、幂等、恢复语义固定下来。
**Depends on**: Phase 39
**Requirements**: ATP-04, ATP-05, ATP-06, ATP-07, ATP-08, ATP-09, ATP-10
**Success Criteria** (what must be TRUE):
1. Background jobs run in a dedicated worker process that stays separate from the web server lifecycle.
2. Queue runtime events project queued, running, retrying, completed, and failed states back into SQLite with attempt history and honest recovery state.
3. Each task type can declare retry, backoff, idempotency, and execution boundaries while worker code still flows through DAL and cache invalidation discipline.
**Plans**: 3 plans

Plans:
- [x] 40-01-PLAN.md - Add BullMQ connection factories, queue and worker bootstrap, and dedicated worker entry scripts.
- [x] 40-02-PLAN.md - Add QueueEvents projection, failure and attempt history recording, stalled recovery, and graceful shutdown posture.
- [x] 40-03-PLAN.md - Add retry, backoff, idempotency, and execution helpers plus a minimal platform verification task.

#### Phase 41: First real product slice - batch import async workflow

**Goal**: 用 batch import 这条用户价值高、状态最容易解释的真实链路验证平台不是纯 infra，而是真正可被 teacher/staff 使用的异步产品能力。
**Depends on**: Phase 40
**Requirements**: ATP-11, ATP-12, ATP-13, ATP-14, ATP-19
**Success Criteria** (what must be TRUE):
1. Teacher or staff can trigger a supported batch import as an async task and immediately receive a durable task id and honest queued status.
2. Product surfaces show queued, running, completed, failed, or retrying states with progress and partial-result summaries instead of blocking request semantics.
3. Batch import retries or duplicate deliveries do not duplicate business writes, and completed work updates the right application state honestly.
**Plans**: 3 plans

Plans:
**Wave 1**
- [x] 41-01-PLAN.md - Integrate batch import onto the async task registry, active-task dedupe, enqueue path, and worker processor model.

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 41-02-PLAN.md - Add teacher/staff status surfaces on the batch detail truth page and the course-center recent-task card.

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 41-03-PLAN.md - Add focused verification for batch import idempotency, partial success reporting, honest UI copy, and cache-safe state updates.

Cross-cutting constraints:
- 当前 batch 详情页是 review、运行态与结果态的单一事实页面；课程中心卡片只是轻量回流入口。
- SQLite + DAL 继续持有业务真相；BullMQ/Redis 只承担 orchestration 与 execution substrate。
- 同一 batch 在 active 状态下只允许一个任务实例，重复触发必须复用当前任务并保持 honest posture。

#### Phase 42: Operator visibility and recovery

**Goal**: 把 async platform 做成可运营能力，而不是只在 worker 日志里看 job id；operator 必须能看健康、看错误、看历史，并执行安全重试。
**Depends on**: Phase 41
**Requirements**: ATP-15, ATP-16, ATP-17, ATP-18
**Success Criteria** (what must be TRUE):
1. Operator can inspect queue health, worker connectivity, backlog posture, and degraded state from application surfaces.
2. Operator can inspect run detail, attempt history, progress snapshots, and the latest failure for a specific task through durable read models.
3. Operator can safely retry supported failed tasks through explicit recovery actions instead of manual database patching.
**Plans**: 3 plans

Plans:
- [ ] 42-01-PLAN.md - Add operator health surfaces for queue status, worker connectivity, backlog, and degraded honesty.
- [ ] 42-02-PLAN.md - Add per-task run detail surfaces with attempt history, progress snapshots, and latest error DTOs.
- [ ] 42-03-PLAN.md - Add safe operator retry actions, audit posture, and focused recovery verification.

#### Phase 43: Additional validation workloads and milestone proof

**Goal**: 用剩余三类真实 workload 证明这是一套通用平台，而不是只为 batch import 定制的单任务通道，并完成 milestone 级 proof。
**Depends on**: Phase 42
**Requirements**: ATP-20, ATP-21, ATP-22, ATP-23
**Success Criteria** (what must be TRUE):
1. Scheduled reminders, event post-processing, and resource processing all run on the same async platform contracts, worker posture, and durable status model.
2. At least four real task families share the same registry, enqueue path, retry model, operator visibility, and result reporting semantics.
3. Milestone verification proves the platform supports manual, scheduled, and derived workloads without reopening the classroom realtime mainline or promoting Redis to business truth.
**Plans**: 3 plans

Plans:
- [ ] 43-01-PLAN.md - Add scheduled reminder jobs with explicit scheduling, delivery status, and recovery posture.
- [ ] 43-02-PLAN.md - Add event post-processing and resource-processing task families on the shared async platform contracts.
- [ ] 43-03-PLAN.md - Add milestone verification and close artifacts for async platform workload coverage and operator proof.

## Progress

**Execution Order:**
Phases execute in numeric order: 39 -> 40 -> 41 -> 42 -> 43

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 39. Async contracts and durable task truth | v2.3 | 3/3 | Complete | 2026-05-18 |
| 40. BullMQ infra seam and worker reliability posture | v2.3 | 3/3 | Complete   | 2026-05-18 |
| 41. First real product slice - batch import async workflow | v2.3 | 1/3 | In Progress|  |
| 42. Operator visibility and recovery | v2.3 | 0/3 | Not started | - |
| 43. Additional validation workloads and milestone proof | v2.3 | 0/3 | Not started | - |
