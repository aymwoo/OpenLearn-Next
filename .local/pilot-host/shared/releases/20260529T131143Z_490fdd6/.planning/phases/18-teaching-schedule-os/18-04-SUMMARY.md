---
phase: 18-teaching-schedule-os
plan: 04
subsystem: operations
tags: [schedule-override, holiday-calendar, audit-log, read-your-writes]
requires:
  - phase: 18-teaching-schedule-os
    provides: normalized runtime agenda and schedule schema
provides:
  - audited single-instance override mutations
  - holiday and non-teaching calendar management
  - teacher changes surface at /teacher/schedule/changes
affects: [schedule-operations-dal, schedule-operations-actions, schedule-operations-surface, teacher-schedule-changes-route]
tech-stack:
  added: []
  patterns: [single-instance-override, mutation-audit, inline-feedback-over-toast]
key-files:
  created:
    [.planning/phases/18-teaching-schedule-os/18-04-SUMMARY.md, src/lib/dal/schedule-operations.ts, src/lib/dal/schedule-operations.test.ts, src/actions/schedule-operations-actions.ts, src/components/surfaces/schedule-operations-surface.tsx, src/components/surfaces/schedule-operations-surface.test.tsx, src/app/(teacher)/teacher/schedule/changes/page.tsx]
  modified:
    []
key-decisions:
  - "调课首发只支持代课、停课、换时间/教室三种单次覆盖。"
  - "override 永远保留 recurring lineage、effectiveDate 和 mutation audit，而不重写基础 recurring entry。"
  - "holiday/non-teaching day 保存后立即进入 runtime agenda generation，并显式失效相关 cache tags。"
patterns-established:
  - "Schedule change pattern: per-date override overlays recurring truth instead of mutating the base timetable."
  - "Inline save feedback pattern: schedule changes and holiday saves report success or failure inside the current surface."
requirements-completed: [SCHEDULE-04, SCHEDULE-05, SCHEDULE-09]
duration: unknown
completed: 2026-05-10
---

# Phase 18 Plan 04: Operations summary

**Phase 18 的运行时变更能力已经收敛为 audited single-instance override 和 holiday management：教师可以调一节课、停一节课、换时间或教室，但不会破坏基础课表真相。**

## Performance

- **Duration:** unknown
- **Completed:** 2026-05-10
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- 新增 `src/lib/dal/schedule-operations.ts`，实现 `createScheduleOverride`、`updateScheduleOverride`、`revokeScheduleOverride`、`saveHolidayCalendarDate` 和 `removeHolidayCalendarDate`。
- 所有 override 都保存 `recurringEntryId`、`effectiveDate`、`originalTeacherId`、`originalBellSlotId`、`originalRoomLabel` 等 lineage 字段，并追加 `scheduleMutationAudit`。
- 新增 `src/actions/schedule-operations-actions.ts`，把 blocked error 固定收敛为 `SCHEDULE_OVERRIDE_BLOCKED`，并在写入后显式失效 agenda/calendar tags。
- 新增 `ScheduleOperationsSurface` 和 `/teacher/schedule/changes`，把单次调课与校历管理放进同一 teacher-facing workspace，并提供 inline read-your-writes 反馈。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `src/lib/dal/schedule-operations.ts` - override 和 holiday audited mutation 主链路。
- `src/lib/dal/schedule-operations.test.ts` - 覆盖单次调课不修改 base recurring record。
- `src/actions/schedule-operations-actions.ts` - override/holiday server actions 与 tag invalidation。
- `src/components/surfaces/schedule-operations-surface.tsx` - 调课与校历管理 UI。
- `src/components/surfaces/schedule-operations-surface.test.tsx` - 覆盖动作约束与 inline feedback。
- `src/app/(teacher)/teacher/schedule/changes/page.tsx` - changes route。

## Decisions Made

- override action 严格限制为 `代课`、`停课`、`换时间/教室`，避免 phase 范围扩张。
- 生效日期、原始排课摘要和审计说明固定在表单上方，减少误操作风险。
- holiday changes 直接写 runtime input tables，而不是只保存前端标注态。

## Deviations from Plan

- 无实质偏离。计划中的 DAL、actions、surface 和 route 均已完成。

## Issues Encountered

- 调课 mutation 既要让 runtime agenda 立即反映，又不能破坏 recurring baseline；这部分通过 override overlay 和 cache invalidation 分离处理。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `18-05` 可以直接围绕 override 和 upcoming class 事件编排 reminder dispatch。
- `18-06` 的 override suggestion proposal 可以复用当前 override input contract 和 approval gate。

## Self-Check: PASSED

- Verified `pnpm test --run src/lib/dal/schedule-operations.test.ts`
- Verified `pnpm test --run src/components/surfaces/schedule-operations-surface.test.tsx`

---

*Phase: 18-teaching-schedule-os*
*Completed: 2026-05-10*
