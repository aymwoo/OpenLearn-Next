---
phase: 18-teaching-schedule-os
plan: 02
subsystem: import-review
tags: [schedule-import, staging-review, row-level-approval, teacher-surface]
requires:
  - phase: 18-teaching-schedule-os
    provides: shared schedule DTOs, schema, cache tags
provides:
  - row-level schedule import staging and approval pipeline
  - teacher-scoped import review server actions
  - two-stage import review workspace at /teacher/schedule/import
affects: [schedule-import-dal, schedule-import-actions, schedule-import-surface, teacher-schedule-import-route]
tech-stack:
  added: []
  patterns: [staging-before-apply, structured blocked result, row-level review cards]
key-files:
  created:
    [.planning/phases/18-teaching-schedule-os/18-02-SUMMARY.md, src/lib/dal/schedule-import.ts, src/lib/dal/schedule-import.test.ts, src/actions/schedule-import-actions.ts, src/components/surfaces/schedule-import-review-surface.tsx, src/components/surfaces/schedule-import-review-surface.test.tsx, src/app/(teacher)/teacher/schedule/import/page.tsx]
  modified:
    []
key-decisions:
  - "导入先进入 staging batch/row，再按行审核，未批准前不写入 normalized schedule model。"
  - "blocked import approval 通过 APPROVE_IMPORT_BLOCKED 结构化返回，而不是静默跳过问题行。"
  - "导入审核台以 row-level validation、mapping、conflict、approval state 为主，不做一键导入向导。"
patterns-established:
  - "Schedule import pipeline: draft -> row classification -> approval-safe apply -> normalized lineage writeback."
  - "Teacher review surface pattern: main CTA disabled with nearby blocker summary instead of toast-only failure."
requirements-completed: [SCHEDULE-01, SCHEDULE-02, SCHEDULE-09]
duration: unknown
completed: 2026-05-10
---

# Phase 18 Plan 02: Import review summary

**Phase 18 把课表导入真正做成了审核台：原始数据先进入 staging，再按行展示校验、映射和冲突，只有获批行才会写入 normalized schedule model。**

## Performance

- **Duration:** unknown
- **Completed:** 2026-05-10
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- 新增 `src/lib/dal/schedule-import.ts`，实现导入批次创建、按行分类、冲突检测、approval-safe apply 和 `sourceBatchId/sourceRowId` lineage 写回。
- 新增 `src/actions/schedule-import-actions.ts`，统一处理 draft/apply 输入校验、teacher scope 校验和 schedule import/agenda tag invalidation。
- 新增 `/teacher/schedule/import` 及 `ScheduleImportReviewSurface`，把导入流程做成双层 review workspace，而不是上传即入库。
- UI 明确展示 `待审核`、`校验失败`、`映射待确认`、`冲突待处理`、`可入库`、`已批准`、`已拒绝` 等状态，并在 blocker 存在时禁用 `审核通过并写入课表`。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `src/lib/dal/schedule-import.ts` - 课表导入 staging、校验、冲突检测和批准写入主链路。
- `src/lib/dal/schedule-import.test.ts` - 覆盖 staging-before-apply 和 lineage 写回。
- `src/actions/schedule-import-actions.ts` - draft/apply server actions 与 `APPROVE_IMPORT_BLOCKED` 返回。
- `src/components/surfaces/schedule-import-review-surface.tsx` - 导入审核台 UI。
- `src/components/surfaces/schedule-import-review-surface.test.tsx` - 覆盖 CTA 禁用与状态展示。
- `src/app/(teacher)/teacher/schedule/import/page.tsx` - teacher import route。

## Decisions Made

- approved rows 才能创建或复用 `scheduleTerm`、`scheduleWeekPattern`、`scheduleBellSlot`、`scheduleTeachingAssignment` 和 `scheduleRecurringEntry`。
- import review surface 直接消费 review DTO，不向前端暴露 raw import JSON。
- 任何 unresolved blocker 都会阻断 apply，不做“跳过有问题行继续写入”的模糊行为。

## Deviations from Plan

- 无实质偏离。计划中的 DAL、actions、surface 和 route 均已落地。

## Issues Encountered

- 无新增阻断；主要实现难点在于把 class/course/teacher 映射失败、重复导入和现有 recurring conflict 统一归并到一套 row status contract，已在 DAL 内集中处理。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `18-03` 可以基于已批准的 normalized records 构建 runtime daily agenda，不需要再读取 import layer。
- `18-06` 的 import mapping assistant proposal 也可以复用当前 import review target 和 status contract。

## Self-Check: PASSED

- Verified `pnpm test --run src/lib/dal/schedule-import.test.ts`
- Verified `pnpm test --run src/components/surfaces/schedule-import-review-surface.test.tsx`

---

*Phase: 18-teaching-schedule-os*
*Completed: 2026-05-10*
