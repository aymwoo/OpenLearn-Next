---
phase: 42-operator-visibility-and-recovery
plan: 01
subsystem: platform
tags: [async-tasks, operator, heartbeat, registry, drizzle]

# Dependency graph
requires:
  - phase: 41-first-real-product-slice-batch-import-async-workflow
    provides: durable async ledger, batch import task family, worker runtime baseline
provides:
  - durable async worker heartbeat truth in SQLite
  - worker bootstrap heartbeat lifecycle with 15-second refresh and shutdown posture
  - registry visibility and operator recovery metadata baseline for operator surfaces
affects: [ATP-15, ATP-18, 42-02-operator-surfaces, 42-03-operator-recovery]

# Tech tracking
tech-stack:
  added: []
  patterns: [durable worker heartbeat, request-fresh operator health contract, registry-backed operator visibility]

key-files:
  created: [src/features/async-tasks/infra/heartbeat.ts, drizzle/0006_phase42_async_operator.sql, drizzle/meta/0006_snapshot.json]
  modified: [src/db/schema.ts, src/features/async-tasks/worker/bootstrap.ts, src/features/async-tasks/worker/bootstrap.test.ts, src/features/async-tasks/server/registry.ts, src/features/async-tasks/server/registry.reliability.test.ts, drizzle/meta/_journal.json]

key-decisions:
  - "worker 在线状态改为 durable heartbeat truth，operator health 不再依赖当前 web 进程内存。"
  - "course_import.apply_batch 的 operator 可见性和 recovery eligibility 由 registry metadata 固定，而不是由后续 DAL/UI 临时绕过。"

requirements-completed: [ATP-15, ATP-18]

# Metrics
duration: unknown
completed: 2026-05-19
---

# Phase 42 Plan 01 Summary

**Phase 42 foundation 已建立：worker heartbeat durable truth、bootstrap lifecycle、operator-visible registry metadata 与 request-fresh health contract 已固定。**

## Accomplishments

- 新增 `asyncWorkerHeartbeat` durable truth 和对应 migration，operator health 可跨进程读取 worker posture。
- `worker/bootstrap.ts` 在启动后立即写 heartbeat、每 15 秒刷新一次，并在停止前后分别写 `stopping` / `stopped`。
- `course_import.apply_batch` 已锁定为 `school_operator` visibility，并显式声明本地 `operatorRecovery` metadata。

## Verification

- `pnpm exec vitest --run src/features/async-tasks/worker/bootstrap.test.ts src/features/async-tasks/server/registry.reliability.test.ts`

## Notes

- 本次执行未创建原子 git commit；当前工作保留在共享工作树中，等待用户决定是否提交。

## Self-Check: PASSED

- Heartbeat helper、bootstrap lifecycle、registry metadata 与 focused tests 均已存在并通过。

---
*Phase: 42-operator-visibility-and-recovery*
*Completed: 2026-05-19*
