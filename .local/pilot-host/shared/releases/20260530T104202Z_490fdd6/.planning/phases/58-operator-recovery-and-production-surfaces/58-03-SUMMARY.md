---
phase: 58-operator-recovery-and-production-surfaces
plan: "03"
subsystem: ui
tags: [incident-detail, operator-recovery, server-actions, nextjs, vitest]
requires:
  - phase: 58-01
    provides: classroom incident DTO and authoritative correlation truth
  - phase: 58-02
    provides: incident detail routes and high-risk recovery drill-down surfaces
provides:
  - summary-first classroom incident detail surface
  - formal retry/reconcile classroom recovery Server Action entrypoint
  - focused tests for honesty template and guarded actions
affects: [ops-surfaces, settings-labs, plugin-recovery, runtime-inspector]
tech-stack:
  added: []
  patterns: [summary-first incident detail, light recovery via Server Action, disabled high-risk action affordances]
key-files:
  created:
    - src/actions/operator-classroom-recovery-actions.ts
    - src/actions/operator-classroom-recovery-actions.test.ts
    - src/components/surfaces/classroom-incident-operator-surface.tsx
    - src/components/surfaces/classroom-incident-operator-surface.test.tsx
  modified:
    - src/app/settings/labs/incidents/[sessionId]/page.tsx
key-decisions:
  - "incident detail route now delegates to a dedicated summary-first surface instead of inline placeholder UI"
  - "summary surface only executes retry/reconcile; resume/suspend/fallback remain visible but disabled with detail drill-down links"
  - "light recovery action resolves activeStepId from classroom truth before reusing the existing voting recovery seam"
patterns-established:
  - "Incident detail pages should render hero → metrics → honesty → problems → relations → light actions"
  - "Operator quick-path mutations must call server-owned seams and revalidate list/detail paths together"
requirements-completed: [OPS-01, OPS-02, OPS-03, PLUG-03]
duration: 3 min
completed: 2026-05-26
---

# Phase 58 Plan 03: classroom incident detail summary surface Summary

**课堂事件详情页现已提供 summary-first incident surface、固定 honesty 模板与 retry/reconcile 轻恢复入口。**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-26T03:59:40Z
- **Completed:** 2026-05-26T04:02:24Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments
- 将 `/settings/labs/incidents/[sessionId]` 从临时 landing UI 收敛为正式 `ClassroomIncidentOperatorSurface`
- 新增 `operator-classroom-recovery-actions`，让 `retry` / `reconcile` 通过 Server Action 复用既有 voting recovery seam
- 用聚焦测试锁定 summary-first IA、honesty 三段模板、light actions 与 plugin action drill-down

## Task Commits

Each task was committed atomically:

1. **Task 1: 先用测试锁定 incident detail 的 summary-first IA 与 light actions** - `a832f2e` (test)
2. **Task 1: 先用测试锁定 incident detail 的 summary-first IA 与 light actions** - `05ce8ca` (feat)

## Files Created/Modified
- `src/actions/operator-classroom-recovery-actions.ts` - summary surface 的轻恢复 Server Action，负责复用 classroom recovery seam 与缓存刷新
- `src/actions/operator-classroom-recovery-actions.test.ts` - 验证 retry/reconcile quick path 与高风险动作拒绝策略
- `src/components/surfaces/classroom-incident-operator-surface.tsx` - 正式 incident detail surface，渲染 hero、metrics、honesty、problem cards、relation cards 与 guarded actions
- `src/components/surfaces/classroom-incident-operator-surface.test.tsx` - 锁定 IA 顺序、honesty 模板与 action drill-down
- `src/app/settings/labs/incidents/[sessionId]/page.tsx` - 改为直接挂接正式 surface

## Decisions Made
- 使用独立 surface 组件承载 incident detail，而不是继续在 route 文件内堆叠页面结构，便于后续复用与测试
- quick path 恢复只接受 `retry` / `reconcile`，其余动作在 summary surface 明确显示但不可执行，符合 risk-tier contract
- recovery action 在执行前通过 `getClassroomSnapshotDTO` 获取 `activeStepId`，避免从 UI 或 DTO 猜测写入目标

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- incident detail 已具备正式 summary-first 落点，可继续承接 incident-first list / settings labs 汇总入口收口
- 后续计划可直接复用该 surface 与 recovery action seam，扩展更多 operator 入口而无需重写 detail contract

## Self-Check: PASSED

- Found file: `.planning/phases/58-operator-recovery-and-production-surfaces/58-03-SUMMARY.md`
- Found commit: `a832f2e`
- Found commit: `05ce8ca`
