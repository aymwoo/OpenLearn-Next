---
phase: 42-operator-visibility-and-recovery
plan: 02
subsystem: ui
tags: [async-tasks, operator, settings-labs, dal, dto]

# Dependency graph
requires:
  - phase: 42-operator-visibility-and-recovery
    provides: durable heartbeat truth, operator-visible registry metadata
provides:
  - request-fresh operator overview/detail DAL and DTOs
  - Settings Labs async operator entry plus overview/detail routes
  - summary-first operator surfaces for health, problem tasks, attempts, and timeline
affects: [ATP-15, ATP-16, ATP-18, 42-03-operator-recovery]

# Tech tracking
tech-stack:
  added: []
  patterns: [request-fresh operator DAL, settings labs operator route pair, summary-first task detail surface]

key-files:
  created: [src/lib/dto/async-task-operator.ts, src/lib/dal/async-task-operator.ts, src/lib/dal/async-task-operator.test.ts, src/app/settings/labs/async-tasks/page.tsx, src/app/settings/labs/async-tasks/[taskId]/page.tsx, src/components/surfaces/async-task-operator-surface.tsx, src/components/surfaces/async-task-operator-detail-surface.tsx, src/components/surfaces/async-task-operator-surface.test.tsx, src/features/async-tasks/server/operator-access.ts, src/features/async-tasks/server/operator-read-model.ts]
  modified: [src/components/surfaces/settings-surface.tsx]

key-decisions:
  - "operator overview/detail 读取面对 heartbeat 背景写入保持 request-fresh，不新增 Next data cache tag 依赖。"
  - "operator 授权改为尊重持久化 `task.visibilityScope` truth，不因 registry 后续变化越权打开历史任务。"

requirements-completed: [ATP-15, ATP-16, ATP-18]

# Metrics
duration: unknown
completed: 2026-05-19
---

# Phase 42 Plan 02 Summary

**Settings Labs 现在提供专门的 async operator 首页和任务详情页，operator 可以先看平台健康，再下钻单任务。**

## Accomplishments

- 新增 request-fresh operator DTO / DAL，组合 BullMQ connection snapshot、worker heartbeat 与 SQLite ledger 生成 overview/detail read model。
- 新增 `/settings/labs/async-tasks` 与 `/settings/labs/async-tasks/[taskId]`，页面保持薄装配，只消费 DAL output。
- 新增 summary-first overview/detail surfaces，并把 retry wrapper 接入 detail summary 区域。

## Verification

- `pnpm exec vitest --run src/lib/dal/async-task-operator.test.ts src/components/surfaces/async-task-operator-surface.test.tsx`
- `pnpm typecheck`

## Notes

- 访问控制在本轮执行中进一步收敛到共享 `operator-access` helper，避免 operator surface 和 recovery path 掉到不同授权语义上。

## Self-Check: PASSED

- Operator DAL / routes / surfaces 已存在，focused suites 与 typecheck 均通过。

---
*Phase: 42-operator-visibility-and-recovery*
*Completed: 2026-05-19*
