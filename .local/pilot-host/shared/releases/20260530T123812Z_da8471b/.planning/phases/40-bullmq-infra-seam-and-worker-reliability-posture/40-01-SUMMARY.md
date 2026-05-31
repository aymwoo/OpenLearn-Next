---
phase: 40-bullmq-infra-seam-and-worker-reliability-posture
plan: 01
subsystem: infra
tags: [bullmq, redis, worker, async-tasks, vitest]

# Dependency graph
requires:
  - phase: 39-async-contracts-and-durable-task-truth
    provides: typed async task registry, canonical enqueue boundary, SQLite durable task ledger
provides:
  - BullMQ 专用 Redis capability 与 role-specific connection helpers
  - queue/worker/QueueEvents centralized factory seam
  - dedicated async task worker bootstrap、entrypoint 与 focused tests
affects:
  [40-02-queueevents-projection-and-reliability-posture, 40-03-minimal-platform-loop-and-verification]

# Tech tracking
tech-stack:
  added: [bullmq]
  patterns:
    [dedicated worker process boundary, role-specific BullMQ Redis connections, centralized queue factory seam]

key-files:
  created:
    [src/features/async-tasks/index.ts, src/features/async-tasks/infra/connection.ts, src/features/async-tasks/infra/bullmq.ts, src/features/async-tasks/worker/registry.ts, src/features/async-tasks/worker/bootstrap.ts, src/server/workers/async-task-worker.ts, src/features/async-tasks/infra/connection.test.ts, src/features/async-tasks/infra/bullmq.test.ts, src/features/async-tasks/worker/bootstrap.test.ts, src/server/workers/async-task-worker.test.ts]
  modified: [package.json, pnpm-lock.yaml]

key-decisions:
  - "BullMQ producer、worker、QueueEvents 分离连接，worker 与 QueueEvents 统一使用 maxRetriesPerRequest: null。"
  - "worker 通过独立 entrypoint 启动，server.ts 保持 web-only posture。"
  - "async task feature root 仅 re-export seam，不向业务暴露 raw BullMQ class。"

patterns-established:
  - "Pattern 1: 通过 connection.ts 提供 capability + health snapshot + role-specific Redis helpers。"
  - "Pattern 2: 通过 bullmq.ts 集中解析 queueName、prefix 和 Queue/Worker/QueueEvents 创建。"
  - "Pattern 3: 通过 bootstrap lifecycle API 固定 worker start/stop 边界。"

requirements-completed: [ATP-04, ATP-10]

# Metrics
duration: 7 min
completed: 2026-05-18
---

# Phase 40 Plan 01: BullMQ infra seam and worker reliability posture Summary

**BullMQ 连接工厂、集中 queue/worker seam 与独立 async worker 入口已落地，并用 focused tests 固定 web/worker 进程边界。**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-18T13:51:06Z
- **Completed:** 2026-05-18T13:58:22Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- 建立了 BullMQ 专用 Redis capability、producer/worker/QueueEvents 分离连接工厂。
- 建立了 centralized `Queue`、`Worker`、`QueueEvents` factory seam，并通过 registry metadata 解析 queue name。
- 建立了 dedicated worker bootstrap 与独立 worker 入口，保持 `dev` / `start` 不启动 worker。

## Task Commits

Each task was committed atomically:

1. **Task 1-2: BullMQ infra seam + worker bootstrap/entry** - `2035cd4` (feat)

**Plan metadata:** Pending in working tree (`40-01-SUMMARY.md`)

## Files Created/Modified

- `package.json` - 新增 `bullmq` dependency 与 `worker:dev` / `worker:start` 脚本。
- `pnpm-lock.yaml` - 锁定 `bullmq` 依赖解析结果。
- `src/features/async-tasks/index.ts` - 统一导出 async task stable seam。
- `src/features/async-tasks/infra/connection.ts` - BullMQ capability、health snapshot 与 role-specific Redis helpers。
- `src/features/async-tasks/infra/bullmq.ts` - Queue、Worker、QueueEvents centralized factory helpers。
- `src/features/async-tasks/worker/registry.ts` - 最小 processor registry 与 queue processor builder。
- `src/features/async-tasks/worker/bootstrap.ts` - 显式 `start/stop` worker lifecycle。
- `src/server/workers/async-task-worker.ts` - dedicated worker process entry。
- `src/features/async-tasks/infra/connection.test.ts` - 连接工厂 focused tests。
- `src/features/async-tasks/infra/bullmq.test.ts` - queue/worker seam focused tests。
- `src/features/async-tasks/worker/bootstrap.test.ts` - bootstrap lifecycle focused tests。
- `src/server/workers/async-task-worker.test.ts` - worker entry 与 `server.ts` boundary guards。

## Decisions Made

- 使用独立 BullMQ env capability（`ASYNC_TASKS_ENABLED`、`BULLMQ_REDIS_URL`、`BULLMQ_PREFIX`、`WORKER_INSTANCE_ID`），避免复用 realtime Redis fanout 单例。
- queue name 统一来自 async task registry reliability metadata，防止业务层 ad hoc string drift。
- worker runtime 只暴露 bootstrap lifecycle API，后续 QueueEvents projection 与 reliability logic 直接挂在同一宿主上。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 已具备 Phase 40-02 所需的 BullMQ runtime 宿主，可继续接 QueueEvents projection 与 recovery posture。
- web/worker 进程边界已被 focused tests 固定，后续计划不需要再重建基础骨架。

## Self-Check: PASSED

- Found summary file: `.planning/phases/40-bullmq-infra-seam-and-worker-reliability-posture/40-01-SUMMARY.md`
- Found task commit: `2035cd4`

---
*Phase: 40-bullmq-infra-seam-and-worker-reliability-posture*
*Completed: 2026-05-18*
