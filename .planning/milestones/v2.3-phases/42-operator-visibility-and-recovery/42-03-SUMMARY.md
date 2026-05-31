---
phase: 42-operator-visibility-and-recovery
plan: 03
subsystem: recovery
tags: [async-tasks, operator, retry, verifier, bullmq]

# Dependency graph
requires:
  - phase: 42-operator-visibility-and-recovery
    provides: operator overview/detail routes, request-fresh DAL, registry recovery metadata
provides:
  - safe same-task retry service and server action wrapper
  - operator retry confirm interaction with immediate detail refresh
  - canonical phase verifier for operator visibility and recovery
affects: [ATP-17, ATP-18, 43-additional-validation-workloads-and-milestone-proof]

# Tech tracking
tech-stack:
  added: []
  patterns: [same-task retry seeding before queue retry, operator recovery audit events, phase verifier with focused suites and regression reuse]

key-files:
  created: [src/features/async-tasks/server/recovery.ts, src/features/async-tasks/server/recovery.test.ts, src/actions/async-task-operator-actions.ts, src/actions/async-task-operator-actions.test.ts, src/components/surfaces/async-task-operator-retry-action.tsx, scripts/verify-phase42-operator-recovery.ts]
  modified: [src/features/async-tasks/infra/queue-events.ts, src/features/async-tasks/infra/queue-events.test.ts, src/components/surfaces/async-task-operator-detail-surface.tsx, src/app/api/ws/classroom/[sessionId]/route.ts]

key-decisions:
  - "operator retry 先 seed durable retry state，再触发 `Job.retry()`，避免 queue event 抢先导致 ledger 回退。"
  - "retry 失败会把任务回写为 failed posture 并追加 `task.operator_recovery_failed` 审计事件，不静默遗留半恢复状态。"

requirements-completed: [ATP-17, ATP-18]

# Metrics
duration: unknown
completed: 2026-05-19
---

# Phase 42 Plan 03 Summary

**Operator recovery 现已可用：受支持的 failed task 可以在同一 durable task 下追加新 attempt，并通过 canonical verifier 持续防回归。**

## Accomplishments

- 新增 `retryAsyncTaskForOperator()` 与 action wrapper，显式复用 BullMQ `Job.retry()`，并记录 recovery requested / retry seeded / recovery failed 审计事件。
- Retry confirm UI 已加入 detail summary 区，并在成功后 `router.refresh()`，让 request-fresh detail 立刻回到 honest posture。
- 新增 `scripts/verify-phase42-operator-recovery.ts`，同时回跑 `verify-phase41-batch-import.ts`，锁住 operator contract 与 batch import regression。
- 额外移除了 WebSocket 426 route 上唯一的 `dynamic = "force-dynamic"` 段配置，使仓库在 Next 16 `cacheComponents` 下重新通过 `pnpm build`。

## Verification

- `pnpm exec vitest --run src/features/async-tasks/server/recovery.test.ts src/features/async-tasks/infra/queue-events.test.ts src/actions/async-task-operator-actions.test.ts`
- `pnpm exec tsx scripts/verify-phase42-operator-recovery.ts`
- `pnpm typecheck`
- `pnpm build`

## Notes

- 本轮修复了 3 个执行后发现的风险点：持久化 visibility 授权、retry seed 与 queue retry 的竞态、以及成功 recovery 后 detail 页面不刷新的交互漂移。

## Self-Check: PASSED

- Recovery service、action wrapper、detail CTA 与 canonical verifier 全部通过 focused verification。

---
*Phase: 42-operator-visibility-and-recovery*
*Completed: 2026-05-19*
