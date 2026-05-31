# Phase 43: Additional validation workloads and milestone proof - Research

**Researched:** 2026-05-19
**Domain:** Async Task Platform validation workloads（scheduled / derived / resource processing）
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Scheduled reminders workload
- **D-43-01:** reminder 规则的保存、修改与 planned dispatch 生成继续留在 `schedule/reminders`
  feature 内完成；Phase 43 只把真正的 delivery dispatch 接到 async platform。
- **D-43-02:** 一条 `scheduleReminderDispatch` 记录对应一条 async reminder task；不按 rule 聚合，
  也不按学校批次聚合。
- **D-43-03:** reminder delivery task 在 `scheduledFor` 到点时由系统自动创建/入队，用来证明
  Phase 43 的 scheduled workload，而不是只把失败后的手动 retry 任务化。
- **D-43-04:** `/teacher/schedule/reminders` 继续以 reminder rule 与 delivery list 作为主产品面；
  该页只展示基于 async task truth 映射出的 honest delivery 状态，不升级成通用任务中心。
- **D-43-05:** reminder delivery 的 retry / recovery 不再留在教师页；失败后的恢复动作只收口到
  operator 面，继续沿用 Phase 42 已建立的 recovery posture。

### Event post-processing workload
- **D-43-06:** Phase 43 的 event post-processing task family 固定以 `classroomEvents` 作为事件
  事实源，不挂到 runtime transport trace 或其他 infra-level event 流上。
- **D-43-07:** 这条 task family 的主要后处理产物固定为 session-level summary / aggregation，
  而不是异常告警优先，也不是纯 projection cache。
- **D-43-08:** `classroomEvents` 的 post-processing 同时支持两类触发：关键事件后的增量处理，
  以及课堂结束后的 finalize 处理；二者共同构成 Phase 43 的 derived workload proof。
- **D-43-09:** event post-processing 必须保持“derived write”语义：它可以生成课后摘要、聚合、
  recap 或等价派生产物，但不能反向改写 classroom realtime 主链路的 canonical truth。

### Resource processing workload
- **D-43-10:** Phase 43 的 resource processing 固定走 `RAG ingest / indexing` 路线，不做泛化
  的 resource metadata enrichment 或外链探测任务。
- **D-43-11:** 一条 async resource task 对应一个 `knowledgeSource`，而不是按 resource 粗粒度
  合并，也不在本阶段拆成 source ingest / chunk indexing 两个独立 task family。
- **D-43-12:** resource task 的 durable business truth 继续由 `knowledgeSources.status` 与
  `knowledgeChunks.indexingStatus` 承载；teacher 产品面继续优先展示这些业务状态，不直接任务化。
- **D-43-13:** 只有 `ragEligible` 的资源才允许进入这条 async resource processing 链路；不借
  Phase 43 扩张新的资源处理入口或新的 eligibility 语义。

### Milestone proof and close posture
- **D-43-14:** Phase 43 的 milestone close 以“workload proof / coverage matrix”作为主证明
  形式，逐项证明 batch import、reminder delivery、classroom event summary、resource ingest
  这四类任务共享同一平台 contract。
- **D-43-15:** proof matrix 至少要覆盖三种 workload 类型：manual（batch import）、scheduled
  （reminders）、derived（classroom event summary / resource ingest）。
- **D-43-16:** proof 不只证明“任务跑起来”，还必须覆盖 registry、enqueue path、worker
  posture、durable truth、operator visibility、recovery/result semantics 这些平台级共性。

### the agent's Discretion
- reminder delivery task 在 registry 中最终落到 `featureArea: "schedule"` 还是
  `featureArea: "notifications"`，以及精确 `taskType` 命名，可由 planner 结合现有 registry 和
  reminder 边界做最小正确收敛；但一条 task 对应一条 `scheduleReminderDispatch` 的事实已锁定。
- `classroomEvents` 增量触发选取哪些事件类型作为首发关键事件，可由 planner 在
  `active_step_changed`、`lock_mode_changed`、`slide_changed`、`ended` 等现有事件里收敛；但
  “增量 + finalize 双触发”已锁定。
- session summary / aggregation 的具体落点可以是现有 recap/read model 的异步补写、
  独立 summary artifact，或等价派生聚合表；但不能回写课堂实时主事实。
- `knowledgeSource` task 内部如何组织 chunking 与 indexing 细节，可由 planner 在一个 task
  family 内部收敛；但 Phase 43 不再拆成第二个独立 task family。
- proof matrix 的精确文档名、表格结构与是否附带 focused verifier，可由 planner 根据现有
  `verify:phase*` / milestone close artifact 风格细化；但主证明形式必须保持为人工可读矩阵。

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ATP-20 | System can run scheduled reminder jobs on the async platform with explicit scheduling and delivery status. [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] | 本研究确认 `scheduleReminderDispatch` 已是每次投递的 durable business record，建议以“一条 dispatch = 一条 async task + delayed enqueue/到点入队 + delivery status 映射”实现。 [VERIFIED: codebase src/features/schedule/reminders/server.ts] [VERIFIED: codebase src/db/schema.ts] |
| ATP-21 | System can run event post-processing jobs on the async platform without turning the worker path into a new primary business write path. [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] | 本研究确认 `classroomEvents` 是 append-only canonical truth，且 `getClassroomSessionRecapDTO()` 已体现 session summary/aggregation 语义，建议异步任务只写 derived artifact/read model。 [VERIFIED: codebase src/db/schema.ts] [VERIFIED: codebase src/lib/dal/classroom.ts] |
| ATP-22 | System can run resource-processing jobs on the async platform with durable status and operator-visible failures. [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] | 本研究确认 `knowledgeSources.status` 与 `knowledgeChunks.indexingStatus` 已存在 durable business truth，但 processing 尚未接 worker，适合以 `knowledgeSource` 为单 task identity 接入平台。 [VERIFIED: codebase src/db/schema.ts] [VERIFIED: codebase src/lib/dal/ai-rag.ts] |
| ATP-23 | At least four real task families share the same platform contracts, enqueue path, worker posture, and operator visibility model. [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] | 本研究确认当前平台已具备通用 registry / enqueue / queue projection / operator overview-detail-retry；Phase 43 主要是增加三类真实 workload family 与 milestone proof matrix。 [VERIFIED: codebase src/features/async-tasks/server/registry.ts] [VERIFIED: codebase src/features/async-tasks/server/enqueue.ts] [VERIFIED: codebase src/features/async-tasks/infra/queue-events.ts] [VERIFIED: codebase src/lib/dal/async-task-operator.ts] |
</phase_requirements>

## Summary

Phase 43 不是继续造 async platform 底座，而是把已存在的三类业务事实——`scheduleReminderDispatch`、`classroomEvents`、`knowledgeSources/knowledgeChunks`——接到 Phase 39-42 已经落地的统一 contract 上，并产出一份 milestone 级 workload proof / coverage matrix。当前代码已经证明平台层的 registry、canonical enqueue seam、worker bootstrap、QueueEvents durable projection、operator overview/detail/retry 都成立；缺的是“更多真实 workload family 共享同一平台”的证据。 [VERIFIED: codebase src/features/async-tasks/server/registry.ts] [VERIFIED: codebase src/features/async-tasks/server/enqueue.ts] [VERIFIED: codebase src/features/async-tasks/worker/bootstrap.ts] [VERIFIED: codebase src/features/async-tasks/infra/queue-events.ts] [VERIFIED: codebase src/lib/dal/async-task-operator.ts]

对 planner 最关键的现实判断有三条：第一，reminder 已经有 rule 与 per-dispatch durable record，因此不应新建“rule 级 scheduler truth”，而应让 delivery dispatch 成为 task identity。 [VERIFIED: codebase src/features/schedule/reminders/server.ts] [VERIFIED: codebase src/db/schema.ts] 第二，classroom 域已经把 `classroomEvents` 建成 append-only canonical truth，且现有 session recap 是同步读取时聚合，因此 safest path 是把异步任务限制为 derived write，不回写 realtime canonical truth。 [VERIFIED: codebase src/db/schema.ts] [VERIFIED: codebase src/lib/dal/classroom.ts] 第三，resource/RAG 域已经有 `knowledgeSources.status` 与 `knowledgeChunks.indexingStatus` 作为业务状态 vocabulary，因此 teacher 面继续看业务状态、operator 面看 task detail/recovery，符合已锁定的双层产品 posture。 [VERIFIED: codebase src/lib/dto/resource-ai.ts] [VERIFIED: codebase src/lib/dal/ai-rag.ts] [VERIFIED: codebase src/lib/dal/async-task-operator.ts]

**Primary recommendation:** 以“一个业务事实实体 = 一个 async task identity”作为 Phase 43 主规划原则：`scheduleReminderDispatch`、`classroom session summary job`、`knowledgeSource` 分别映射为独立 task family，统一复用 registry、enqueue seam、worker processor、QueueEvents projection 与 operator recovery，而教师/资源/课堂页面继续展示业务状态，不直接升级成任务中心。 [VERIFIED: codebase src/features/schedule/reminders/server.ts] [VERIFIED: codebase src/lib/dal/classroom.ts] [VERIFIED: codebase src/lib/dal/ai-rag.ts] [VERIFIED: codebase src/features/async-tasks/server/enqueue.ts]

## Project Constraints (from AGENTS.md)

- 必须使用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite 首发。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- UI 组件禁止直连数据库，所有读写必须通过 DAL 和 Server Actions。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- Node.js 20.9+ 为主；复杂数据库鉴权不要放到 Edge。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- Next.js 16 必须显式缓存，写入后必须更新或失效 tag。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 首发数据库只针对 SQLite，关联必须 `onDelete: cascade`。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 插件禁止 `eval()`、动态执行第三方代码、直接访问 DB 或核心 API。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 页面实现必须参考 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 不要在本 phase 借机做 Next / Vitest 升级；当前 repo 已固定自己的 package 版本，升级不属于 Phase 43 目标。 [VERIFIED: codebase package.json] [ASSUMED]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Scheduled reminder delivery | API / Backend | Database / Storage | rule 与 dispatch truth 都在 SQLite/DAL；真正入队、投递、失败回写与 operator recovery 都属于服务端后台职责。 [VERIFIED: codebase src/features/schedule/reminders/server.ts] [VERIFIED: codebase src/db/schema.ts] |
| Reminder teacher visibility | Frontend Server (SSR) | API / Backend | 教师页继续显示 rule + delivery list，但数据来自 DAL/read model，而不是直接队列状态。 [VERIFIED: codebase src/components/surfaces/schedule-reminder-surface.tsx] [VERIFIED: codebase src/features/schedule/reminders/actions.ts] |
| Classroom event post-processing | API / Backend | Database / Storage | 事件事实源是 `classroomEvents`，异步任务负责派生 summary/aggregation，而不是浏览器或 transport 层。 [VERIFIED: codebase src/db/schema.ts] [VERIFIED: codebase src/lib/dal/classroom.ts] |
| Classroom canonical realtime control | API / Backend | Browser / Client | 课堂主写路径仍由 teacher control/server action 写 `classroomSessions` + `classroomEvents` 并发布 transport event，Phase 43 不能改这条主线。 [VERIFIED: codebase src/lib/dal/classroom.ts] [VERIFIED: codebase src/actions/classroom-actions.ts] |
| Resource ingest / indexing | API / Backend | Database / Storage | resource/knowledgeSource/knowledgeChunk 的创建与状态推进都在 DAL + worker 内，业务真相仍落 SQLite。 [VERIFIED: codebase src/lib/dal/resources.ts] [VERIFIED: codebase src/lib/dal/ai-rag.ts] [VERIFIED: codebase src/db/schema.ts] |
| Operator recovery / proof | Frontend Server (SSR) | API / Backend | operator surfaces 与 verifier/proof artifact 是平台可运营性的展示层，但读模型和 recovery action 仍由服务端提供。 [VERIFIED: codebase src/lib/dal/async-task-operator.ts] [VERIFIED: codebase scripts/verify-phase42-operator-recovery.ts] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| BullMQ | repo `^5.76.10`; npm latest `5.76.10` published 2026-05-17 | Queue / delayed jobs / worker execution substrate | 当前 async platform 已基于 BullMQ；Phase 43 的 scheduled reminder 最自然的当前实现是沿用 `Queue.add(..., { delay })` 的 delayed job 能力，而不是另造 scheduler。 [VERIFIED: codebase package.json] [VERIFIED: npm registry bullmq@5.76.10 2026-05-17] [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/delayed.md] |
| ioredis | repo `^5.10.1`; npm latest `5.10.1` published 2026-03-19 | BullMQ Redis connection | 当前 worker / producer / queue-events connection factory 已统一封装在 `infra/connection.ts`，Phase 43 不应再引入第二套连接管理。 [VERIFIED: codebase package.json] [VERIFIED: npm registry ioredis@5.10.1 2026-03-19] [VERIFIED: codebase src/features/async-tasks/infra/connection.ts] |
| Zod | repo `^4.4.3`; npm latest `4.4.3` published 2026-05-04 | Task payload / result / DTO validation | 当前 registry、resource DTO、reminder DTO、classroom DTO 都已以 Zod 为边界，新的 task family 应继续沿用。 [VERIFIED: codebase package.json] [VERIFIED: npm registry zod@4.4.3 2026-05-04] [VERIFIED: codebase src/features/async-tasks/server/registry.ts] |
| Drizzle ORM + SQLite | repo `drizzle-orm@^0.45.2`; SQLite schema already authoritative | Durable task ledger + business truth | milestone 已锁定 SQLite + DAL 为业务真相源；Phase 43 不能把 BullMQ/Redis 升格为 truth。 [VERIFIED: codebase package.json] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/PROJECT.md] [VERIFIED: codebase src/db/schema.ts] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Next.js | repo `16.2.4`; npm latest `16.2.6` published 2026-05-07 | Server Actions + tag invalidation + SSR surfaces | 继续用现有 Action/DAL/tag invalidation 模式接 reminder/resource/classroom 派生状态，不在本 phase 升级框架。 [VERIFIED: codebase package.json] [VERIFIED: npm registry next@16.2.6 2026-05-07] [VERIFIED: codebase src/actions/course-import-actions.ts] |
| Vitest | repo `4.1.5`; npm latest `4.1.6` published 2026-05-11 | Focused unit/component verification | 继续沿用当前 phase verifier + focused suites 风格，为新 workload family 加 slice-level tests 与 milestone proof verifier。 [VERIFIED: codebase package.json] [VERIFIED: npm registry vitest@4.1.6 2026-05-11] [VERIFIED: codebase vitest.config.ts] [VERIFIED: codebase scripts/verify-phase41-batch-import.ts] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Delayed job per `scheduleReminderDispatch` | Repeatable/cron-style rule jobs | repeatable job 更适合“规则自身就是执行 truth”的系统，但本 phase 已锁定“dispatch record 才是 business truth”，因此不如 per-dispatch delayed job 贴合。 [VERIFIED: codebase src/db/schema.ts] [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/delayed.md] |
| One `knowledgeSource` task family | Split ingest/index into two task families | 拆分能细化并发与恢复，但会违背 D-43-11 的锁定边界，并增加 proof matrix 复杂度。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/43-additional-validation-workloads-and-milestone-proof/43-CONTEXT.md] |
| Async-derived summary artifact | Keep recap only as read-time synchronous aggregation | read-time 聚合改动最少，但无法充分证明 derived workload 在统一 async platform 上运行。 [VERIFIED: codebase src/lib/dal/classroom.ts] |

**Installation:**
```bash
pnpm add bullmq ioredis zod && pnpm add -D vitest
```

**Version verification:**
- BullMQ `5.76.10`, published `2026-05-17T14:07:59.306Z`. [VERIFIED: npm registry]
- ioredis `5.10.1`, published `2026-03-19T15:12:27.839Z`. [VERIFIED: npm registry]
- Zod `4.4.3`, published `2026-05-04T07:06:40.819Z`. [VERIFIED: npm registry]
- Vitest `4.1.6`, published `2026-05-11T14:37:46.246Z`; repo still pins `4.1.5`. [VERIFIED: npm registry] [VERIFIED: codebase package.json]
- Next `16.2.6`, published `2026-05-07T19:01:54.751Z`; repo still pins `16.2.4`. [VERIFIED: npm registry] [VERIFIED: codebase package.json]

## Architecture Patterns

### System Architecture Diagram

```text
Teacher/Staff Action or System Fact
        |
        +--> Reminder rule save ------> scheduleReminderDispatch(planned) ------> async enqueue/delayed dispatch ------> worker processor ------> dispatch status + asyncTask ledger
        |
        +--> classroom control writes -> classroomEvents(append-only) -----------> incremental/finalize enqueue -------> worker processor ------> derived summary/aggregation artifact
        |
        +--> resource create/update ---> resource.ragEligible + knowledgeSource(pending) -> async enqueue ----------------> worker processor ------> knowledgeSources/knowledgeChunks status
        |
        +--> operator view -------------------------------------------------------------------------------> operator DAL/read model ------> overview/detail/retry

All async families share:
registry -> enqueue seam -> BullMQ queue/worker -> QueueEvents projection -> SQLite asyncTasks/asyncTaskEvents
```

### Recommended Project Structure
```text
src/
├── features/async-tasks/
│   ├── server/          # registry, enqueue, recovery, operator read models
│   ├── worker/          # per-task-family processors and worker registry
│   └── infra/           # bullmq connections, queues, queue-events projection
├── features/schedule/reminders/   # reminder rule save + delivery status mapping
├── lib/dal/classroom.ts           # classroomEvents truth and derived summary trigger points
├── lib/dal/ai-rag.ts              # knowledgeSource truth and resource processing boundary
├── actions/                       # teacher/operator server actions + cache invalidation
├── components/surfaces/           # teacher/resource/operator product surfaces
└── scripts/                       # phase verifier + milestone proof scripts
```

### Pattern 1: One business entity record maps to one async task
**What:** 每个 workload 都应先拥有 durable business record，再把该 record 映射到单个 async task identity。 [VERIFIED: codebase src/features/schedule/reminders/server.ts] [VERIFIED: codebase src/lib/dal/ai-rag.ts] [VERIFIED: codebase src/lib/dal/course-import.ts]
**When to use:** reminder dispatch、knowledgeSource ingest、course import batch 这类“业务实体本身就能解释状态”的后台任务。 [VERIFIED: codebase src/db/schema.ts]
**Example:**
```typescript
// Source: src/lib/dal/course-import.ts
const task = await enqueueAsyncTask({
  actorId: scope.userId,
  schoolId: batch.schoolId,
  taskType: "course_import.apply_batch",
  entityRef: {
    entityType: "course_import_batch",
    entityId: batch.id,
    entityLabel: batch.sourceLabel,
  },
  payload: { batchId: batch.id, schoolId: batch.schoolId, actorId: scope.userId },
  dispatchRequested: true,
});
```

### Pattern 2: Teacher page stays on business truth, not task-center truth
**What:** 教师页显示 rule / delivery / resource / summary 等业务对象，task 状态只作为 honest status source 被映射进入业务 DTO。 [VERIFIED: codebase src/components/surfaces/schedule-reminder-surface.tsx] [VERIFIED: codebase src/components/surfaces/library-surface.tsx] [VERIFIED: codebase src/lib/dal/course-import.ts]
**When to use:** `/teacher/schedule/reminders`、资源中心、课堂 recap 页面。 [VERIFIED: codebase src/components/surfaces/schedule-reminder-surface.tsx] [VERIFIED: codebase src/components/surfaces/library-surface.tsx]
**Example:**
```typescript
// Source: src/features/schedule/reminders/server.ts
latestStatus: latestStatusByType.get(rule.type)?.status ?? null,
```

### Pattern 3: Derived workload reads canonical facts and writes derived artifacts only
**What:** worker 读取 `classroomEvents`、`classroomEvidence`、`classroomTimeline` 等 canonical truths，生成 session summary / aggregation，但不回写 `classroomSessions` 实时主事实。 [VERIFIED: codebase src/db/schema.ts] [VERIFIED: codebase src/lib/dal/classroom.ts]
**When to use:** event post-processing、课后 recap summary、趋势聚合。 [VERIFIED: codebase src/lib/dal/classroom.ts]
**Example:**
```typescript
// Source: src/lib/dal/classroom.ts
const [event] = await db.insert(classroomEvents).values({
  sessionId: session.id,
  version: updated.version,
  type: "ended",
  actorId: scope.userId,
  payloadJson: {},
}).returning();
```

### Pattern 4: Scheduled dispatch uses delayed queue semantics, not synchronous send on save
**What:** `scheduledFor` 决定 job 的最早执行时刻；teacher save 只写 rule + dispatch truth，不直接发送。 [VERIFIED: codebase src/features/schedule/reminders/server.ts] [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/delayed.md]
**When to use:** reminder delivery。 [VERIFIED: codebase src/db/schema.ts]
**Example:**
```typescript
// Source: BullMQ delayed jobs guide
await myQueue.add('house', { color: 'white' }, { delay: 5000 });
```

### Anti-Patterns to Avoid
- **把 reminder rule 当成 task identity：** 会模糊“规则”与“单次 delivery”的 truth，违背 D-43-02。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/43-additional-validation-workloads-and-milestone-proof/43-CONTEXT.md]
- **让 worker 直接改 realtime canonical truth：** event post-processing 只能写 derived artifact，不能回头改 `classroomSessions` / `classroomEvents` 主线。 [VERIFIED: codebase src/lib/dal/classroom.ts]
- **在教师页重复实现 retry：** Phase 42 已把 recovery 收口到 operator 面；teacher 页只应展示 honest status。 [VERIFIED: codebase src/lib/dal/async-task-operator.ts] [VERIFIED: codebase src/components/surfaces/schedule-reminder-surface.tsx]
- **再造第二套状态系统：** resource processing 的业务真相已在 `knowledgeSources.status` 与 `knowledgeChunks.indexingStatus`，不应只看 BullMQ job state。 [VERIFIED: codebase src/db/schema.ts]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scheduled reminder timing | 自写 cron truth / 自写轮询表扫描器作为业务真相 | `scheduleReminderDispatch.scheduledFor` + BullMQ delayed job + async task ledger | 当前业务已存在 per-dispatch durable record；自造第二套 scheduler truth 只会制造漂移。 [VERIFIED: codebase src/db/schema.ts] [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/delayed.md] |
| Background task state | 直接读取 Redis/BullMQ runtime state 当产品 truth | SQLite `asyncTasks` + `asyncTaskEvents` + DAL read models | milestone 已锁定 Redis/BullMQ 不是 application truth。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/PROJECT.md] [VERIFIED: codebase src/db/schema.ts] |
| Reminder retry UI | 在 reminder teacher page 做 feature-local retry orchestration | 复用 Phase 42 operator recovery | 平台已建立统一 recovery posture，重复实现会让权限与审计分裂。 [VERIFIED: codebase src/lib/dal/async-task-operator.ts] [VERIFIED: codebase scripts/verify-phase42-operator-recovery.ts] |
| Classroom summary compute path | 新建一条绕过现有 recap 语义的 post-processing 逻辑 | 复用现有 recap 所用数据集合与 vocabulary，再异步落到 derived artifact | 现有 `getClassroomSessionRecapDTO()` 已定义 summary/aggregation 的领域语义。 [VERIFIED: codebase src/lib/dal/classroom.ts] |
| Resource status UI | 新建 task-centric teacher UI | 继续显示 resource / knowledgeSource 业务状态，operator 再看 task | D-43-12 已锁定 teacher 优先看 business truth。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/43-additional-validation-workloads-and-milestone-proof/43-CONTEXT.md] |

**Key insight:** Phase 43 的难点不是“怎样把 job 扔进队列”，而是**怎样让每个 workload 的 business truth、task truth、teacher truth、operator truth 彼此一致**。当前代码已经在 batch import 上给出样板；新 workload 应复用这套分层，而不是各写各的。 [VERIFIED: codebase src/lib/dal/course-import.ts] [VERIFIED: codebase src/actions/course-import-actions.ts]

## Common Pitfalls

### Pitfall 1: 把 scheduled workload 做成“保存时直接发一次”
**What goes wrong:** teacher 保存 reminder rule 后立即同步发送，最后只证明“同步调用后端通知函数”，而没有证明平台支持 scheduled workload。 [VERIFIED: codebase src/features/schedule/reminders/server.ts]
**Why it happens:** 当前 `retryScheduleReminderDispatch()` 就是同步 `dispatchScheduleReminder()`；开发者容易沿用现有同步路径。 [VERIFIED: codebase src/features/schedule/reminders/server.ts]
**How to avoid:** 保存 rule 时继续只写 `scheduleReminderRule` 与 `scheduleReminderDispatch(planned)`；真正投递必须在 `scheduledFor` 对应的 async task 内执行。 [VERIFIED: codebase src/features/schedule/reminders/server.ts] [VERIFIED: codebase src/db/schema.ts]
**Warning signs:** 代码里仍出现 teacher action 直接调用 `dispatchScheduleReminder()`。 [VERIFIED: codebase src/features/schedule/reminders/server.ts]

### Pitfall 2: 把 event post-processing 变成新的 classroom 主写路径
**What goes wrong:** worker 直接修改 `classroomSessions`、重放控课逻辑，导致 realtime canonical truth 与异步派生逻辑耦合。 [VERIFIED: codebase src/lib/dal/classroom.ts]
**Why it happens:** `classroomEvents` 看起来像“事件源”，容易诱导开发者把 async path 当成第二主线。 [VERIFIED: codebase src/db/schema.ts]
**How to avoid:** 只读取 `classroomEvents` / evidence / timeline 作为输入，输出 derived summary/aggregation artifact；主链路仍由 server actions 维护。 [VERIFIED: codebase src/actions/classroom-actions.ts] [VERIFIED: codebase src/lib/dal/classroom.ts]
**Warning signs:** 新 processor 里出现 `update(classroomSessions)` 或写回 `classroomEvents`。 [ASSUMED]

### Pitfall 3: resource processing 只建 task，不推进 business status
**What goes wrong:** operator 能看到 task failed，但 teacher 面的 `knowledgeSources.status` 一直停在 `pending`，业务状态与任务状态分裂。 [VERIFIED: codebase src/db/schema.ts]
**Why it happens:** 当前 `registerKnowledgeSourceForResource()` 只插入 `knowledgeSources(status=pending)`，后续 processing 逻辑还没落地。 [VERIFIED: codebase src/lib/dal/ai-rag.ts]
**How to avoid:** processor 在开始、成功、失败时显式更新 `knowledgeSources.status/error`，并在 chunk 级别维护 `knowledgeChunks.indexingStatus`。 [VERIFIED: codebase src/db/schema.ts]
**Warning signs:** library/resource surfaces 只能看到 `ragEligible`，看不到任何 ingest/indexing 状态变化。 [VERIFIED: codebase src/components/surfaces/library-surface.tsx]

### Pitfall 4: proof 只证明“有四个 taskType”，没证明“共用平台 contract”
**What goes wrong:** 交付只剩 registry 新增三行和几个 processor，无法证明 manual / scheduled / derived 共享 enqueue seam、operator visibility、result semantics。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md]
**Why it happens:** verifier 很容易只做存在性检查，不做跨 workload 对照。 [VERIFIED: codebase scripts/verify-phase39-async-tasks.ts] [VERIFIED: codebase scripts/verify-phase42-operator-recovery.ts]
**How to avoid:** proof matrix 至少按 workload family × platform capability（registry / enqueue / worker / durable truth / operator visibility / recovery / result semantics）做覆盖。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/43-additional-validation-workloads-and-milestone-proof/43-CONTEXT.md]
**Warning signs:** close artifact 里没有 batch import 与三个新增 workload 的并列表。 [ASSUMED]

## Code Examples

Verified patterns from official sources and current codebase:

### Canonical enqueue seam for a business entity
```typescript
// Source: src/lib/dal/course-import.ts
const task = await enqueueAsyncTask({
  actorId: scope.userId,
  schoolId: batch.schoolId,
  taskType: "course_import.apply_batch",
  entityRef: {
    entityType: "course_import_batch",
    entityId: batch.id,
    entityLabel: batch.sourceLabel,
  },
  payload: {
    batchId: batch.id,
    schoolId: batch.schoolId,
    actorId: scope.userId,
  },
  dispatchRequested: true,
});
```

### Delayed reminder dispatch scheduling
```typescript
// Source: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/delayed.md
const delay = Number(targetTime) - Number(new Date());
await myQueue.add('send-reminder', payload, { delay });
```

### Append-only classroom event write
```typescript
// Source: src/lib/dal/classroom.ts
const [event] = await db.insert(classroomEvents).values({
  sessionId: session.id,
  version: updated.version,
  type: "active_step_changed",
  actorId: scope.userId,
  payloadJson: { activeStepId: payload.targetStepId, slideIndex: 0 },
}).returning();
```

### Worker processor shape
```typescript
// Source: src/features/async-tasks/worker/processors/course-import.ts
export async function processCourseImportApplyBatchJob(job: ProgressCapableJob) {
  asyncTaskRegistry[job.name].payloadSchema.parse(job.data);
  const payload = CourseImportAsyncTaskPayloadSchema.parse(job.data);

  await job.updateProgress({
    stage: "running",
    messageKey: "asyncTasks.courseImport.applyBatch.progress.running",
    percentComplete: 5,
    detail: { jobId: job.id ?? null, batchId: payload.batchId },
    updatedAt: new Date().toISOString(),
  });

  return executeCourseImportApplyTask(payload);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One validated async workload only (`course_import.apply_batch`) | Four real workload families on one platform contract | Phase 43 target | milestone proof 从“单 workload 成功”提升到“平台通用性已证明”。 [VERIFIED: codebase src/features/async-tasks/server/registry.ts] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md] |
| Reminder retry uses synchronous send call | Scheduled reminder delivery should use async delayed dispatch | Phase 43 target | 才能证明 scheduled workload，而不只是 feature-level retry。 [VERIFIED: codebase src/features/schedule/reminders/server.ts] [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/delayed.md] |
| Classroom recap computed on read after session end | Async incremental + finalize derived processing feeding recap/summary artifact | Phase 43 target | 才能证明 derived workload 且不重开 realtime mainline。 [VERIFIED: codebase src/lib/dal/classroom.ts] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/43-additional-validation-workloads-and-milestone-proof/43-CONTEXT.md] |
| Resource RAG path stops at `knowledgeSource(status=pending)` | Worker-backed ingest/indexing with durable business status and operator-visible failures | Phase 43 target | 才能让 resource processing 成为真实 async workload，而不是半成品 API。 [VERIFIED: codebase src/lib/dal/ai-rag.ts] [VERIFIED: codebase src/db/schema.ts] |

**Deprecated/outdated:**
- 把 feature 页本地 retry 当成主要恢复路径。Phase 42 之后，统一 operator recovery 才是标准恢复姿势。 [VERIFIED: codebase src/lib/dal/async-task-operator.ts] [VERIFIED: codebase scripts/verify-phase42-operator-recovery.ts]
- 把 reminder / resource / classroom summary 各自做独立后台机制。Phase 43 的成功标准恰恰是否定这种分散实现。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | web server / worker / verifier scripts | ✓ | `v24.1.0` | — [VERIFIED: bash] |
| pnpm | package scripts / focused verifiers | ✓ | `10.33.0` | npm 可运行部分 `npm view`，但 repo scripts 主要按 pnpm 组织。 [VERIFIED: bash] |
| npm | registry verification | ✓ | `11.6.2` | — [VERIFIED: bash] |
| Python | not required by this phase core path | ✓ | `3.14.5` | — [VERIFIED: bash] |
| Docker | local infra / optional redis/qdrant orchestration | ✓ | `29.5.0` | 可不用 Docker，直接连接现成 Redis。 [VERIFIED: bash] |
| BullMQ runtime env (`ASYNC_TASKS_ENABLED` + `BULLMQ_REDIS_URL`) | actual async worker enablement | ✗ in current shell | — | 无；缺失时 `infra/connection.ts` 会把平台判定为 disabled。 [VERIFIED: bash env] [VERIFIED: codebase src/features/async-tasks/infra/connection.ts] |
| Redis reachability | BullMQ queue/worker/queue-events | 未确认可用 | — | 若没有 Redis，本地只能做静态验证与非运行态测试，不能完整跑 worker。 [VERIFIED: bash redis probe] [VERIFIED: codebase src/features/async-tasks/infra/connection.ts] |

**Missing dependencies with no fallback:**
- 运行时 Redis 配置（`ASYNC_TASKS_ENABLED=true` + `BULLMQ_REDIS_URL`）在当前 shell 未提供；若 planner 需要执行真实 worker proof，必须补上。 [VERIFIED: bash env] [VERIFIED: codebase src/features/async-tasks/infra/connection.ts]

**Missing dependencies with fallback:**
- Redis reachability当前未被本次调查验证为 healthy；proof artifact 可先做静态 verifier + focused suites + matrix 草稿，但完整 runtime proof 仍需可达 Redis。 [VERIFIED: bash redis probe] [VERIFIED: codebase scripts/verify-phase42-operator-recovery.ts]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | teacher/operator actions 继续走现有 auth + membership scope。 [VERIFIED: codebase src/lib/dal/async-task-operator.ts] [VERIFIED: codebase src/features/schedule/reminders/server.ts] |
| V3 Session Management | no | 本 phase 不扩展新的 end-user session mechanism。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/PROJECT.md] |
| V4 Access Control | yes | DAL scope checks + operator access control + teacher school scope checks。 [VERIFIED: codebase src/features/schedule/reminders/server.ts] [VERIFIED: codebase src/lib/dal/resources.ts] [VERIFIED: codebase src/features/async-tasks/server/operator-access.ts] |
| V5 Input Validation | yes | Zod schemas for payload, DTO, server actions, registry contracts. [VERIFIED: codebase src/features/async-tasks/server/registry.ts] [VERIFIED: codebase src/actions/resource-actions.ts] |
| V6 Cryptography | no | 本 phase 不引入新的 crypto primitive；继续避免手写加密。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized operator retry | Elevation of Privilege | 继续通过 `canOperatorAccessTask()` 和 role/school scope 校验限制 recovery。 [VERIFIED: codebase src/lib/dal/async-task-operator.ts] [VERIFIED: codebase src/features/async-tasks/server/recovery.ts] |
| Duplicate reminder or resource execution | Tampering | 继续使用 task-id based job identity / idempotency，且 business truth 侧保持 one-entity-one-task mapping。 [VERIFIED: codebase src/features/async-tasks/shared/idempotency.ts] |
| Queue state drift presented as product truth | Integrity | 继续以 SQLite `asyncTasks` / `asyncTaskEvents` 和 business tables 为 product truth。 [VERIFIED: codebase src/db/schema.ts] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/PROJECT.md] |
| Payload poisoning from unvalidated async task input | Tampering | registry payloadSchema + action/DAL Zod parsing。 [VERIFIED: codebase src/features/async-tasks/server/registry.ts] [VERIFIED: codebase src/actions/ai-rag-actions.ts] |
| Secret leakage through reminder payloads | Information Disclosure | `dispatchScheduleReminder()` 已调用 `assertNoSecretMaterial()`；新 task family 不应绕开此边界。 [VERIFIED: codebase src/server/schedule/reminder-dispatch.ts] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 本 phase 不应顺带升级 Next / Vitest，只应复用现有 repo 版本。 | Project Constraints | 若团队本就计划顺手升级，plan 会过度保守。 |
| A2 | `classroomEvents` 派生产物采用独立 `classroomSessionSummary` artifact/read model，并继续复用 recap vocabulary。 | Architecture Patterns / Resolved Questions | 若后续实现偏离这个已决结论，会导致 migration、verifier 与 proof matrix 失配。 |
| A3 | `Warning signs` 中以 grep 检查 `update(classroomSessions)` / proof 表缺失的方式可作为 Phase 43 verifier 的一部分。 | Common Pitfalls | 若验证策略改成更高层的 black-box proof，静态守卫项会变化。 |

## Resolved Questions

1. **classroom event derived artifact 最终落哪里最合适？** [RESOLVED]
   - Resolution: Phase 43 固定新增独立 `classroomSessionSummary` derived artifact，并继续让 `classroomEvents` / `classroomSessions` 保持 canonical truth；不把 recap 读模型反向改造成第二条主写链路。 [RESOLVED BY: 43-CONTEXT.md + 43-02-PLAN.md]
   - Why this is acceptable: `getClassroomSessionRecapDTO()` 已经定义了 summary vocabulary，因此异步 summary artifact 只需要复用这套领域语义并做 derived write。 [VERIFIED: codebase src/lib/dal/classroom.ts]

2. **scheduled reminder 的“到点自动创建/入队”应采用哪种最小实现？** [RESOLVED]
   - Resolution: 保留 `scheduleReminderDispatch` 作为 durable business truth，在独立 worker runtime 中通过 due sweep + durable claim/binding 语义，到 `scheduledFor` 时才调用 `enqueueAsyncTask()` 创建 `schedule.reminder_delivery`；不在 rule save 时提前创建 reminder task。 [RESOLVED BY: 43-CONTEXT.md + 43-01-PLAN.md]
   - Why this is acceptable: 这样既满足多 worker 防重复 claim，也保持 SQLite/DAL 为 truth、BullMQ 只做 orchestration。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/PROJECT.md]

3. **resource teacher 面是否需要补 status 文案，而不只是 `ragEligible` 徽标？** [RESOLVED]
   - Resolution: Phase 43 必须在资源中心补最小 teacher-visible business status，明确映射 `knowledgeSources.status` / `knowledgeChunks.indexingStatus`，而不是只在 operator 面可见。 [RESOLVED BY: REQUIREMENTS.md + 43-03-PLAN.md]
   - Why this is acceptable: ATP-22 要证明 durable status 被真实产品面消费，仅靠 operator-visible failure 不足以完成该 requirement。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md]

## Sources

### Primary (HIGH confidence)
- `/home/wuxf/Develop/OpenLearn-Next/.planning/phases/43-additional-validation-workloads-and-milestone-proof/43-CONTEXT.md` - locked decisions, canonical refs, phase boundary. [VERIFIED: file read]
- `/home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md` - ATP-20/21/22/23 exact requirement text. [VERIFIED: file read]
- `/home/wuxf/Develop/OpenLearn-Next/.planning/PROJECT.md` - milestone guardrails and SQLite/DAL truth posture. [VERIFIED: file read]
- `/home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md` - Phase 43 success criteria and plan slots. [VERIFIED: file read]
- `/home/wuxf/Develop/OpenLearn-Next/AGENTS.md` - project constraints and workflow rules. [VERIFIED: file read]
- `src/features/schedule/reminders/server.ts` - reminder rule save, planned dispatch generation, sync retry path. [VERIFIED: codebase read]
- `src/server/schedule/reminder-dispatch.ts` - reminder send boundary and channel allowlist. [VERIFIED: codebase read]
- `src/lib/dal/classroom.ts` - classroom event writes and existing recap aggregation path. [VERIFIED: codebase read]
- `src/lib/dal/ai-rag.ts` - `registerKnowledgeSourceForResource()` and current half-built RAG path. [VERIFIED: codebase read]
- `src/features/async-tasks/server/registry.ts` - current task families and recovery metadata. [VERIFIED: codebase read]
- `src/features/async-tasks/server/enqueue.ts` - canonical enqueue seam. [VERIFIED: codebase read]
- `src/features/async-tasks/infra/queue-events.ts` - QueueEvents durable projection path. [VERIFIED: codebase read]
- `src/lib/dal/async-task-operator.ts` - operator overview/detail/retry read model. [VERIFIED: codebase read]
- `src/db/schema.ts` - `classroomEvents`, `knowledgeSources`, `knowledgeChunks`, `scheduleReminderDispatch`, `asyncTasks`, `asyncTaskEvents`. [VERIFIED: codebase read]
- npm registry lookups for `bullmq`, `ioredis`, `zod`, `vitest`, `next`. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- `https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/delayed.md` - delayed job semantics for scheduled workloads. [CITED: official docs mirror via Context7 CLI]

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 主要依赖现有 repo 与 npm registry 双重核验。 [VERIFIED: codebase package.json] [VERIFIED: npm registry]
- Architecture: MEDIUM - 主路径由代码证据支撑，但 classroom derived artifact 的最终落点仍需 planner 收敛。 [VERIFIED: codebase src/lib/dal/classroom.ts] [ASSUMED]
- Pitfalls: MEDIUM - 多数 pitfalls 能从现有同步路径与 guardrail 推出，但部分 verifier 形式仍属推断。 [VERIFIED: codebase src/features/schedule/reminders/server.ts] [VERIFIED: codebase scripts/verify-phase42-operator-recovery.ts] [ASSUMED]

**Research date:** 2026-05-19
**Valid until:** 2026-06-18
