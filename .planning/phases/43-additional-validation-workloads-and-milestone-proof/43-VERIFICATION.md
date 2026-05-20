---
phase: 43-additional-validation-workloads-and-milestone-proof
verified: 2026-05-20T03:29:41Z
status: human_needed
score: 11/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "教师打开 /teacher/schedule/reminders，保存一条提醒规则并观察最近 deliveries 状态变化"
    expected: "页面继续显示 rules + deliveries，不出现教师侧 retry 按钮；queued/running/retrying/failed 文案与 operator-only 恢复提示正确"
    why_human: "需要真实页面渲染与交互确认，且依赖 worker / queue 运行时状态变化"
  - test: "教师打开 /resources，对 ragEligible 资源触发 knowledge source 注册并观察资源卡片状态"
    expected: "资源中心展示 business status（pending/processing/completed/failed）与 chunk 统计，不暴露 taskId/queueJobId"
    why_human: "需要真实页面与后台任务联动确认，静态代码无法证明最终 UX 呈现"
  - test: "operator 打开 /settings/labs/async-tasks 与任务详情页，检查新 workload family 的详情与重试入口"
    expected: "schedule.reminder_delivery、classroom.session_summary、resource.knowledge_source_ingest 均可被统一 operator 页面消费；仅 operator 可执行 recovery"
    why_human: "需要真实权限、页面导航与 recovery CTA 行为确认"
---

# Phase 43: additional-validation-workloads-and-milestone-proof Verification Report

**Phase Goal:** 用剩余三类真实 workload 证明这是一套通用平台，而不是只为 batch import 定制的单任务通道，并完成 milestone 级 proof。
**Verified:** 2026-05-20T03:29:41Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Scheduled reminders、event post-processing、resource processing 都运行在同一 async platform contract / worker posture / durable status model 上 | ✓ VERIFIED | `src/features/async-tasks/server/registry.ts` 定义 `schedule.reminder_delivery` / `classroom.session_summary` / `resource.knowledge_source_ingest`；`src/features/async-tasks/worker/registry.ts` 全部注册；`src/features/async-tasks/server/enqueue.ts` 是统一入队边界 |
| 2 | 至少四个真实 task family 共享同一 registry、enqueue path、retry model、operator visibility、result semantics | ✓ VERIFIED | 四类 family 为 `course_import.apply_batch`、`schedule.reminder_delivery`、`classroom.session_summary`、`resource.knowledge_source_ingest`；`registry.ts` 全部声明 `attempts` / `backoff` / `idempotency` / `operatorRecovery` |
| 3 | milestone proof 证明 manual / scheduled / derived workload 成立，且没有重开 classroom realtime mainline、没有把 Redis/BullMQ 升级为业务真相 | ✓ VERIFIED | `43-WORKLOAD-PROOF.md` 明确列出三类 trigger mode 与 anti-regression notes；`src/lib/dal/classroom.ts` 仅 upsert `classroomSessionSummary`；`src/features/async-tasks/infra/queue-events.ts` 将运行态投影回 SQLite `asyncTasks` / `asyncTaskEvents` |
| 4 | reminder task 只在 `scheduledFor` 到点后创建，而不是保存 rule 时提前创建 | ✓ VERIFIED | `src/features/schedule/reminders/server.ts` 中 `saveScheduleReminderRule()` 只调用 `planScheduleReminderDispatch()` 写 `status: "planned"`；真正 `enqueueAsyncTask()` 发生在 `enqueueDueScheduleReminderDispatches()` |
| 5 | `scheduleReminderDispatch` 具备 durable claim / binding 语义，允许多 worker 下只 claim 一次 | ✓ VERIFIED | `src/db/schema.ts:1546-1581` 含 `deliveryTaskId` / `dispatchClaimedAt` / `dispatchClaimedBy` + unique index；`claimScheduleReminderDispatch()` 用 `status=planned && deliveryTaskId is null && scheduledFor<=now` 原子更新 |
| 6 | reminder delivery 失败恢复只在 operator recovery 流里，不在教师请求生命周期里直接重试 | ✓ VERIFIED | `src/features/schedule/reminders/server.ts:373-375` 直接抛 `SCHEDULE_REMINDER_OPERATOR_RECOVERY_ONLY`；`src/features/schedule/reminders/actions.ts:24-29` 将其转成 operator-only 提示 |
| 7 | classroom summary workload 只写 derived artifact，不改 classroom realtime canonical truth | ✓ VERIFIED | `src/lib/dal/classroom.ts:2511-2660` 仅写 `classroomSessionSummary`；enqueue 点位于 canonical `classroomEvents` 写入之后（`active_step_changed` / `lock_mode_changed` / `slide_changed` / `ended`） |
| 8 | derived summary artifact 复用 recap vocabulary，但没有变成第二条主写链路 | ✓ VERIFIED | `executeClassroomSessionSummaryTask()` 调用 `computeClassroomSessionRecap()`，再 `persistClassroomSessionSummaryArtifact()`；`getClassroomSessionRecapDTO()` 仍从原 classroom 边界读 recap |
| 9 | `knowledgeSource` 在 `ragEligible=true` 前提下进入共享 async platform，并把 `knowledgeSources.status` / `knowledgeChunks.indexingStatus` 作为业务 truth | ✓ VERIFIED | `src/lib/dal/ai-rag.ts` 中 `registerKnowledgeSourceForResource()` 对 `ragEligible` 做 gate 后创建 `knowledgeSources(status:"pending")` 并 `enqueueAsyncTask()`；worker helper 推进 `knowledgeSources.status` 与 `knowledgeChunks.indexingStatus` |
| 10 | 教师 reminder / resource 页面保持 business-entity-first，而不是漂成 task center | ✓ VERIFIED | `src/app/(teacher)/teacher/schedule/reminders/page.tsx` -> `getScheduleReminderCenterDTO()` -> `ScheduleReminderSurface`；`src/app/(library)/resources/page.tsx` -> `getTeacherResourceLibraryDTO()` -> `LibrarySurface`；两个 surface 都不暴露 retry/task internals |
| 11 | Phase 43 close artifact 可作为 milestone 级 proof 复用 | ✓ VERIFIED | `package.json` 提供 `verify:phase43`；`scripts/verify-phase43-validation-workloads.ts` 可执行通过；`43-WORKLOAD-PROOF.md` 提供人工可读矩阵 |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/features/async-tasks/server/registry.ts` | 四类真实 workload 共用 registry metadata | ✓ VERIFIED | 含四个真实 family + `platform.healthcheck`，且每个 family 都有 `queueName` / `attempts` / `backoff` / `idempotency` / `operatorRecovery` |
| `src/features/schedule/reminders/server.ts` | scheduled reminder 的 durable truth、due-claim、DTO 投影边界 | ✓ VERIFIED | save-time 只写 planned row；due sweep claim 后统一入队；teacher DTO 从业务表 + task detail 投影诚实状态 |
| `src/features/async-tasks/worker/bootstrap.ts` | 独立 worker 内运行 due-dispatch sweep | ✓ VERIFIED | `startDueDispatchSweepLoop()` 调 `enqueueDueScheduleReminderDispatches()`，5s `unref()` loop |
| `src/features/async-tasks/worker/processors/schedule-reminder.ts` | reminder processor 仅 parse/progress/delegate | ✓ VERIFIED | 调 `dispatchScheduleReminder()` + `completeScheduleReminderDeliveryAttempt()`，无 UI / feature-local recovery |
| `src/db/schema.ts` | reminder claim schema + classroom summary schema + knowledge truth schema | ✓ VERIFIED | `scheduleReminderDispatch` claim fields、`classroomSessionSummary` 表、`knowledgeSources/knowledgeChunks` 状态字段均存在 |
| `src/lib/dal/classroom.ts` | derived classroom summary enqueue 与 artifact 写入 | ✓ VERIFIED | canonical 事件后 enqueue；`persistClassroomSessionSummaryArtifact()` / `markClassroomSessionSummaryFailure()` 已实现 |
| `src/features/async-tasks/worker/processors/classroom-session-summary.ts` | classroom derived processor | ✓ VERIFIED | 仅 parse/progress/delegate 到 `executeClassroomSessionSummaryTask()` |
| `src/lib/dal/ai-rag.ts` | knowledgeSource identity enqueue 与 durable status progression | ✓ VERIFIED | 以 `knowledgeSource.id` 作为 `entityRef.entityId`；worker helper 推进 `pending -> processing -> completed/failed` |
| `src/components/surfaces/library-surface.tsx` | 教师可见 resource business status surface | ✓ VERIFIED | 展示 `knowledgeSourceStatus` / `indexedChunkCount` / `failedChunkCount`，不暴露 `taskId` / `queueJobId` |
| `src/components/surfaces/schedule-reminder-surface.tsx` | 教师可见 reminder honest status surface | ✓ VERIFIED | 展示 queued/running/retrying/failure honest copy；无本地 retry CTA |
| `scripts/verify-phase43-validation-workloads.ts` | canonical close gate | ✓ VERIFIED | 实际执行 `pnpm verify:phase43` 通过；含 static checks、operator regression slices、Phase 41/42 chain |
| `43-WORKLOAD-PROOF.md` | 人工可读 workload proof matrix | ✓ VERIFIED | 覆盖 batch import / reminder delivery / classroom session summary / resource knowledgeSource ingest |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `src/features/async-tasks/worker/bootstrap.ts` | `src/features/async-tasks/server/enqueue.ts` | due-dispatch sweep 间接调用 `enqueueAsyncTask()` | ✓ VERIFIED | `bootstrap.ts` 调 `enqueueDueScheduleReminderDispatches()`；后者在 `server.ts:332-351` 调 `enqueueAsyncTask()` |
| `src/features/async-tasks/worker/processors/schedule-reminder.ts` | `src/server/schedule/reminder-dispatch.ts` | `dispatchScheduleReminder()` | ✓ VERIFIED | processor 直接调用 `dispatchScheduleReminder()` |
| `src/features/schedule/reminders/server.ts` | `src/features/schedule/shared/dto/reminders.ts` | delivery DTO status mapping | ✓ VERIFIED | `getScheduleReminderCenterDTO()` 使用 `ScheduleReminderCenterDTOSchema` 与 `toTeacherVisibleReminderStatus()` |
| `src/lib/dal/classroom.ts` | `src/features/async-tasks/server/enqueue.ts` | incremental / finalize summary enqueue hooks | ✓ VERIFIED | `enqueueClassroomSessionSummaryTask()` 调 `enqueueAsyncTask()`；四个 canonical event 点都调用 |
| `src/lib/dal/ai-rag.ts` | `src/features/async-tasks/server/enqueue.ts` | knowledgeSource task identity | ✓ VERIFIED | `registerKnowledgeSourceForResource()` 用 `entityType: "knowledge_source"`、`entityId: source.id` 入队 |
| `src/lib/dal/resources.ts` | `src/components/surfaces/library-surface.tsx` | knowledgeSource business status DTO | ✓ VERIFIED | `getTeacherResourceLibraryDTO()` 产出 `knowledgeSourceStatus` / chunk counts；`LibrarySurface` 消费展示 |
| `src/features/schedule/reminders/actions.ts` | `src/components/surfaces/schedule-reminder-surface.tsx` | reminder center refresh + honest delivery DTO | ✓ VERIFIED | `saveScheduleReminderRuleAction()` / `refreshScheduleReminderCenterAction()` 返回 DTO；page 读取 `getScheduleReminderCenterDTO()` 并渲染 surface |
| `scripts/verify-phase43-validation-workloads.ts` | `src/lib/dal/async-task-operator.test.ts` 等 | operator-facing regression slices | ✓ VERIFIED | verifier 实际运行 operator DAL/surface/action tests |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/components/surfaces/schedule-reminder-surface.tsx` | `data.rules` / `data.deliveries` | `getScheduleReminderCenterDTO()` -> `scheduleReminderRule` + `scheduleReminderDispatch` + optional `getAsyncTaskDetailDTO()` | Yes | ✓ FLOWING |
| `src/components/surfaces/library-surface.tsx` | `item.knowledgeSourceStatus` / chunk counts | `getTeacherResourceLibraryDTO()` -> `resources` + latest `knowledgeSources` + `knowledgeChunks` | Yes | ✓ FLOWING |
| `src/lib/dal/classroom.ts` (`persistClassroomSessionSummaryArtifact`) | `summaryJson` | `computeClassroomSessionRecap()` over `classroomEvents` / evidence / timeline | Yes | ✓ FLOWING |
| `src/lib/dal/async-task-operator.ts` | overview/detail DTOs | `listOperatorVisibleAsyncTasks()` + `getAsyncTaskWithEvents()` + registry metadata | Yes | ✓ FLOWING |
| `src/lib/dal/ai-rag.ts` | `knowledgeSources.status` / `knowledgeChunks.indexingStatus` | `executeResourceKnowledgeSourceTask()` over real `resources` rows | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase 43 canonical verifier 可执行 | `pnpm verify:phase43` | exit 0；Phase 43/42/41 verifier 链路通过 | ✓ PASS |
| verifier 未纳入的关键 focused suites 仍通过 | `pnpm exec vitest --run src/lib/dal/classroom.test.ts src/components/surfaces/library-surface.test.tsx src/components/surfaces/schedule-reminder-surface.test.tsx` | 3 files / 42 tests passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| ATP-20 | 43-01, 43-03 | Scheduled reminder jobs run on async platform with explicit scheduling and delivery status | ✓ SATISFIED | `schedule.reminder_delivery` registry + due-sweep enqueue + `scheduleReminderDispatch` durable fields + teacher reminder DTO/status projection |
| ATP-21 | 43-02 | Event post-processing runs on async platform without becoming new primary write path | ✓ SATISFIED | canonical `classroomEvents` writes happen first；summary worker 只写 `classroomSessionSummary` |
| ATP-22 | 43-03 | Resource-processing jobs run with durable status and operator-visible failures | ✓ SATISFIED | `resource.knowledge_source_ingest` + `knowledgeSources.status` / `knowledgeChunks.indexingStatus` + operator generic visibility/recovery model |
| ATP-23 | 43-04 | At least four real task families share same platform contracts, enqueue path, worker posture, operator visibility model | ✓ SATISFIED | four families present in registry/proof matrix/operator tests；`pnpm verify:phase43` and extra suites both pass |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `scripts/verify-phase43-validation-workloads.ts` | 194-216 | canonical close gate 未直接运行 `src/lib/dal/classroom.test.ts`、`src/components/surfaces/library-surface.test.tsx`、`src/components/surfaces/schedule-reminder-surface.test.tsx` | ⚠️ Warning | close gate 覆盖面比 43-02/43-03 计划描述更窄；本次验证已额外补跑并通过，因此不构成 blocker |
| `src/lib/dal/classroom.ts` | 2551-2599 | failed artifact 使用 `lessonId: "unknown"` / `classId: "unknown"` 占位值 | ℹ️ Info | 只影响 failure audit 的细节完整度，不影响 Phase 43 completed path |

### Human Verification Required

### 1. Teacher reminder surface honest delivery flow

**Test:** 打开 `/teacher/schedule/reminders`，保存一条提醒规则，等待 worker 接管并观察 delivery 状态变化。  
**Expected:** 页面仍以 rules + deliveries 为主；状态会从排队/投递/恢复映射到业务文案；失败时只提示去 operator 面，不出现教师本地重试。  
**Why human:** 需要真实页面渲染、路由刷新、worker/queue 运行态和 copy 体验确认。

### 2. Resource library business-truth rendering

**Test:** 对一个 `ragEligible=true` 的资源触发 knowledge source 注册，并在 `/resources` 观察状态与 chunk 统计。  
**Expected:** 看到 `RAG 待处理 / 处理中 / 已完成 / 处理失败` 等业务状态与统计，不暴露 task 内部字段。  
**Why human:** 需要真实页面与后台任务联动验证，静态测试无法证明最终 UX。

### 3. Operator visibility and recovery UI for new workloads

**Test:** 以 operator 身份访问 `/settings/labs/async-tasks` 与某个 task detail 页面，查看三类新 workload 的详情与恢复 CTA。  
**Expected:** 新 workload family 能被统一 operator 页面消费；detail 中有正确 label/summary/retry eligibility；只有 operator 可发起 recovery。  
**Why human:** 需要真实权限、页面导航与 recovery 交互确认。

### Gaps Summary

未发现阻断 Phase 43 目标达成的代码级 gaps：四类 workload 的 registry、enqueue、worker、durable truth、operator visibility、recovery/result semantics 在代码中都已存在并连通，相关自动化验证也通过。

当前未标记为 `passed` 的原因不是代码缺失，而是仍有页面级与真实运行态行为需要人工确认；因此状态为 `human_needed`。

---

_Verified: 2026-05-20T03:29:41Z_  
_Verifier: the agent (gsd-verifier)_
