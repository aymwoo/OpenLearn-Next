---
phase: 58-operator-recovery-and-production-surfaces
plan: "01"
subsystem: operator
tags: [classroom, incident, dal, observability, plugin, runtime]
requires:
  - phase: 57-classroom-runtime-sample-chain
    provides: classroom session runtime truth and recovery seam context
  - phase: 56-voting-plugin-contract-and-authoring-integration
    provides: plugin action posture and voting recovery command surface
provides:
  - classroom incident list contract and server-owned read model
  - classroom incident detail contract with plugin/action/command/task relation cards
  - light recovery seam for retry and reconcile actions
affects: [settings-labs, runtime-inspector, async-task-operator, platform-observability]
tech-stack:
  added: []
  patterns: [classroom-session-as-anchor, summary-first-incident-dto, server-owned-correlation-read-model]
key-files:
  created: []
  modified:
    - src/lib/dto/classroom-incident-list.ts
    - src/lib/dto/classroom-incident-operator.ts
    - src/lib/dal/classroom-incident-list.ts
    - src/lib/dal/classroom-incident-operator.ts
    - src/lib/dal/classroom-incident-operator-actions.ts
    - src/lib/dal/classroom-incident-operator.test.ts
key-decisions:
  - "固定以 classroomSessionId 作为 operator 排查锚点，并在单次 server read 中投影 runtime、plugin、command、task 关联。"
  - "quick path 只暴露 retry 与 reconcile，resume/suspend/fallback 保持为 detail-only guarded actions。"
patterns-established:
  - "Incident DTOs expose summary-first hero/metrics/honesty/problem/related-cards instead of raw timelines."
  - "Relation chips stay capped at two in the list view, while detail cards carry the full drill-down graph."
requirements-completed: [OPS-01, SAFE-02]
duration: 11min
completed: 2026-05-26
---

# Phase 58 Plan 01: Authoritative classroom incident truth Summary

**以 classroom session 为唯一锚点输出 incident list/detail DTO，并把 runtime、plugin、action、command、task 关联收敛到同一 server-owned read model。**

## Performance

- **Duration:** 11 min
- **Started:** 2026-05-26T03:21:07Z
- **Completed:** 2026-05-26T03:32:35Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- 锁定了 classroom incident list/detail 的 DTO contract、scope 边界与 summary-first 信息架构。
- 实现了 `getClassroomIncidentListDTO()` 与 `getClassroomIncidentOperatorDTO()`，统一输出 classroom-first authoritative truth。
- 实现了 `runClassroomIncidentLightRecovery()`，把 quick recovery 约束在现有 server-owned seam 上。

## Task Commits

Each task was committed atomically:

1. **Task 1: 固化 incident DTO 合同并先写失败测试** - `055fc04` (test)
2. **Task 2: 实现 classroom/session authoritative read model** - `667c1a5` (feat)

**Plan metadata:** 未提交（按本次执行要求未更新 STATE/ROADMAP）

## Files Created/Modified
- `src/lib/dto/classroom-incident-list.ts` - incident list contract，约束 classroom-first rows 与最多 2 个 relation chips。
- `src/lib/dto/classroom-incident-operator.ts` - detail contract，约束 hero、metrics、honesty、problem cards、related cards 与 recovery actions。
- `src/lib/dal/classroom-incident-list.ts` - classroom incident list read model，与 command/task/runtime/plugin posture 做单次服务端聚合。
- `src/lib/dal/classroom-incident-operator.ts` - detail correlation seam，输出稳定的 runtime/plugin/action/command/task drill-down href。
- `src/lib/dal/classroom-incident-operator-actions.ts` - quick actions 与 guarded actions 的 availability/gating 以及轻量恢复入口。
- `src/lib/dal/classroom-incident-operator.test.ts` - focused regression coverage，锁定 scope、contract 与 recovery seam。

## Decisions Made
- 使用 `classroomSessionId` 而不是 plugin posture 或 command timeline 作为 incident 根节点，避免 operator 首屏变成 giant detail page。
- list 视图只暴露最多两个 relation chips，完整关联交由 detail 的 related cards 承载。
- plugin action relation 优先从 governance lifecycle 的 blocked diagnostics 反推，避免页面二次拼接 truth。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- 仓库存在大量无关脏文件，因此提交时只 stage 了 `58-01` 相关文件。
- GitNexus `detect-changes` 受仓库其他未提交改动影响，报告了与本计划无关的 symbol；本计划相关 diff 已单独核对。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Settings Labs 可以直接消费 incident list/detail DTO，无需再在页面端拼 runtime/plugin/command/task 多份请求。
- 后续 surface 只需接入本次输出的 stable href 与 recovery metadata，即可建立 incident-first operator flow。

## Self-Check: PASSED

- Summary file exists: `.planning/phases/58-operator-recovery-and-production-surfaces/58-01-SUMMARY.md`
- Commit exists: `055fc04`
- Commit exists: `667c1a5`

---
*Phase: 58-operator-recovery-and-production-surfaces*
*Completed: 2026-05-26*
