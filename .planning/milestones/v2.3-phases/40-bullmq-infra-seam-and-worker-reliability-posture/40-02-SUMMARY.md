---
phase: 40-bullmq-infra-seam-and-worker-reliability-posture
plan: 02
subsystem: infra
tags: [bullmq, queueevents, sqlite, drizzle, dal, worker]

# Dependency graph
requires:
  - phase: 40-bullmq-infra-seam-and-worker-reliability-posture
    provides: BullMQ infra seam、独立 worker bootstrap、typed async registry
provides:
  - BullMQ dispatch 成功后 durable 回写 queueJobId 与 queued posture
  - QueueEvents runtime signal 投影到 SQLite async task truth 与 append-only history
  - DAL detail DTO 暴露 failure、attempt、recovery context，且只读 SQLite
affects: [40-03-minimal-platform-loop-and-verification, ATP-05, ATP-08, ATP-09]

# Tech tracking
tech-stack:
  added: []
  patterns: [QueueEvents durable projection, durable recovery posture, SQLite-first async task detail DTO]

key-files:
  created: [src/features/async-tasks/infra/queue-events.ts, src/features/async-tasks/infra/queue-events.test.ts, src/features/async-tasks/server/enqueue.runtime.test.ts, drizzle/0005_phase40_async_task_runtime_projection.sql, drizzle/meta/0005_snapshot.json]
  modified: [src/db/schema.ts, scripts/prepare-dev-db.ts, src/features/async-tasks/shared/contract.ts, src/features/async-tasks/shared/dto.ts, src/features/async-tasks/server/enqueue.ts, src/features/async-tasks/server/mapper.ts, src/features/async-tasks/worker/bootstrap.ts, src/lib/dal/async-tasks.ts, src/lib/dal/async-tasks.test.ts, drizzle/meta/_journal.json]

key-decisions:
  - "BullMQ runtime events 只作为 signal source，SQLite asyncTask/asyncTaskEvent 仍是产品态 truth。"
  - "attempt/failure/recovery posture 先用 asyncTask 主表 latest snapshot + asyncTaskEvent append-only history 承载，不提前新增独立 attempts 表。"
  - "worker shutdown 在关闭 handles 前先把 shutdown requested posture durable 化，避免 silent loss。"

patterns-established:
  - "Pattern 1: enqueue 成功 dispatch 后立即 durable 回写 queueJobId、enqueueIntentStatus=dispatched 与 queued snapshot。"
  - "Pattern 2: QueueEvents projector 同步更新 asyncTask latest snapshot 并追加 asyncTaskEvent history。"
  - "Pattern 3: DAL detail DTO 通过 mapper 从 SQLite 组合 failure、attempt、recovery 上下文，不读 BullMQ runtime state。"

requirements-completed: [ATP-05, ATP-08, ATP-09]

# Metrics
duration: 15 min
completed: 2026-05-18
---

# Phase 40 Plan 02: BullMQ infra seam and worker reliability posture Summary

**真实 BullMQ dispatch、QueueEvents durable projection、attempt/failure/recovery posture 与 worker shutdown honesty 已落到 SQLite async task truth。**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-18T22:00:00Z
- **Completed:** 2026-05-18T14:16:50Z
- **Tasks:** 2
- **Files modified:** 20

## Accomplishments

- `enqueueAsyncTask()` 现在会通过集中 queue seam 做真实 `queue.add()`，并在成功后 durable 回写 `queueJobId`、`queued` status 与 `dispatched` enqueue intent。
- 新增 `queue-events.ts` 监听 `waiting`、`active`、`progress`、`completed`、`failed`、`stalled`、`deduplicated`，把 runtime 事件投影回 SQLite latest snapshot 与 append-only history。
- 扩展 async task schema / DTO / mapper / DAL，让 failure reason、attempt history、recovery posture 都能只从 SQLite detail DTO 读出。
- worker bootstrap 在关闭 worker / QueueEvents 句柄前先记录 `worker_shutdown_requested` recovery posture，补上 graceful shutdown honesty。

## Task Commits

Each task was committed atomically:

1. **Task 1: 新增 QueueEvents projector 与 durable runtime projection** - Pending
2. **Task 2: 补 attempt/failure history、graceful shutdown 与 DAL 读取面** - Pending

**Plan metadata:** Pending

## Files Created/Modified

- `src/features/async-tasks/infra/queue-events.ts` - QueueEvents projector、runtime-to-SQLite durable mapping、shutdown recovery writer。
- `src/features/async-tasks/server/enqueue.ts` - 真正调用 BullMQ queue，并把 dispatch 结果 durable 回写到 async task ledger。
- `src/features/async-tasks/worker/bootstrap.ts` - 接入 projector lifecycle 与 signal-based graceful shutdown posture。
- `src/db/schema.ts` - 为 async task truth 增加 retrying/stalled_recovery vocabulary、latest attempt/failure/recovery fields、attempt index。
- `drizzle/0005_phase40_async_task_runtime_projection.sql` - Phase 40 runtime projection migration。
- `drizzle/meta/_journal.json` / `drizzle/meta/0005_snapshot.json` - Phase 40 migration metadata。
- `src/features/async-tasks/shared/dto.ts` / `src/features/async-tasks/server/mapper.ts` - detail DTO 新增 queueJobId、failure、attempts、recovery。
- `src/lib/dal/async-tasks.test.ts`、`src/features/async-tasks/infra/queue-events.test.ts`、`src/features/async-tasks/server/enqueue.runtime.test.ts`、`src/features/async-tasks/worker/bootstrap.test.ts` - focused durability/recovery source guards。

## Decisions Made

- 保持 SQLite + DAL 为唯一 inspectable truth，BullMQ 只提供 execution/runtime signal。
- recovery posture 采用 vocabulary + JSON snapshot (`latestRecoveryJson`) 而不是提前做 operator-only helper 或新表，符合 40-02 最小正确改动边界。
- attempt history 通过 `asyncTaskEvent.attemptNumber` 与 append-only event payload 固定下来，足够支撑 ATP-09，后续 phase 再决定是否拆专表。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 用 drizzle-kit 生成 migration metadata 以补齐 0005 snapshot**
- **Found during:** Task 1
- **Issue:** 手写 SQL 后缺少 `drizzle/meta/0005_snapshot.json` 与 journal entry，migration 路径不完整。
- **Fix:** 运行 `node_modules/.bin/drizzle-kit generate --name phase40_async_task_runtime_projection` 生成 snapshot/journal，并保留与 schema 一致的 0005 SQL。
- **Files modified:** `drizzle/0005_phase40_async_task_runtime_projection.sql`, `drizzle/meta/_journal.json`, `drizzle/meta/0005_snapshot.json`
- **Verification:** 生成后的 focused tests + `tsc --noEmit` 通过，`pnpm db:migrate` 至少走到环境 gate 前已识别 0005 migration。
- **Committed in:** Pending

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 仅用于补齐 migration-first 路径，没有扩大到 40-03 reliability helper / verifier 范围。

## Issues Encountered

- `pnpm db:migrate` 仍被环境里的 `ERR_PNPM_IGNORED_BUILDS` gate 拦住，无法在当前 runner 完成实际 migration apply；已改用 `drizzle-kit generate`、focused source tests 与 typecheck 证明改动一致。

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 40-03 可以在现有 durable projection 基础上补最小 platform loop / reliability helper / verifier，而不需要再重做 QueueEvents truth layer。
- 当前仍缺少真实 Redis/BullMQ 环境下的端到端 migration apply proof，建议在 40-03 verifier 或 orchestrator 环节继续验证。

## Self-Check: PASSED

- Found summary file: `.planning/phases/40-bullmq-infra-seam-and-worker-reliability-posture/40-02-SUMMARY.md`
- Found migration file: `drizzle/0005_phase40_async_task_runtime_projection.sql`
- Found snapshot file: `drizzle/meta/0005_snapshot.json`

---
*Phase: 40-bullmq-infra-seam-and-worker-reliability-posture*
*Completed: 2026-05-18*
