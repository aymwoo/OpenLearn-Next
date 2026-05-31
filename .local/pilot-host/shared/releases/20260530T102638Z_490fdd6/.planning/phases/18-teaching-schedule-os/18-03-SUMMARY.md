---
phase: 18-teaching-schedule-os
plan: 03
subsystem: runtime-agenda
tags: [runtime-agenda, teacher-schedule, deterministic-engine, daily-view]
requires:
  - phase: 18-teaching-schedule-os
    provides: normalized schedule model and cache tags
provides:
  - deterministic teacher/class daily agenda DAL
  - teacher-first agenda surface at /teacher/schedule
  - explicit holiday and override precedence handling
affects: [schedule-runtime-dal, teacher-schedule-surface, teacher-schedule-route]
tech-stack:
  added: []
  patterns: [normalized-runtime-only, teacher-first agenda cards, explicit precedence order]
key-files:
  created:
    [.planning/phases/18-teaching-schedule-os/18-03-SUMMARY.md, src/lib/dal/schedule-runtime.ts, src/lib/dal/schedule-runtime.test.ts, src/components/surfaces/teacher-schedule-surface.tsx, src/components/surfaces/teacher-schedule-surface.test.tsx, src/app/(teacher)/teacher/schedule/page.tsx]
  modified:
    []
key-decisions:
  - "教师个人日程是课表系统的首个主 runtime surface。"
  - "agenda 只读取 normalized schedule、holiday 和 override，不读取 scheduleImportRow。"
  - "agenda card 第一层信息固定显示 时间 / 班级 / 地点 / 状态，课程与课时链接退到次级信息。"
patterns-established:
  - "Runtime precedence pattern: holiday/non-teaching day blocks base recurring entry, override replaces per-date occurrence, recurring schedule remains the baseline."
  - "Teacher schedule page pattern: one agenda hero plus today's cards, no spreadsheet-style operations dashboard."
requirements-completed: [SCHEDULE-02, SCHEDULE-03, SCHEDULE-09]
duration: unknown
completed: 2026-05-10
---

# Phase 18 Plan 03: Runtime agenda summary

**Phase 18 已经具备真正的 runtime daily agenda engine：教师现在可以打开 `/teacher/schedule`，直接看到今天给谁上课、在哪里上、当前状态和是否发生了变更。**

## Performance

- **Duration:** unknown
- **Completed:** 2026-05-10
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- 新增 `src/lib/dal/schedule-runtime.ts`，实现 `getTeacherDailyAgendaDTO()` 和 `getClassDailyAgendaDTO()`，并显式使用 `teacherScheduleAgenda` / `classScheduleAgenda` cache tags。
- runtime engine 按既定优先级组合 recurring entries、holiday dates 和 single-instance overrides，保证 per-date materialization 可预测。
- 新增 `TeacherScheduleSurface` 与 `/teacher/schedule` route，把教师个人日程做成 Phase 18 的首个主视图。
- UI 空态文案、agenda hero 和卡片层级已经按 UI-SPEC 对齐，避免把 runtime page 做成多表格运营台。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `src/lib/dal/schedule-runtime.ts` - runtime daily agenda engine。
- `src/lib/dal/schedule-runtime.test.ts` - 覆盖 holiday / override precedence。
- `src/components/surfaces/teacher-schedule-surface.tsx` - 教师个人日程主界面。
- `src/components/surfaces/teacher-schedule-surface.test.tsx` - 覆盖空态与卡片层级。
- `src/app/(teacher)/teacher/schedule/page.tsx` - teacher schedule route。

## Decisions Made

- runtime output 继续坚持不暴露 import row，避免 teacher 页面与 staging data 紧耦合。
- holiday 与 non-teaching day 会直接参与 agenda generation，而不是只做 UI 注释。
- lesson/course linkage 只保留为次级 metadata，不压过时间、班级、地点、状态四个主字段。

## Deviations from Plan

- 无实质偏离。teacher-first agenda 与 class agenda read path 都已落地。

## Issues Encountered

- agenda materialization 需要同时兼容 `teacherId`、`substituteTeacherId`、`classId` 和 holiday precedence；这部分复杂度被集中在 DAL 内，而没有散落到 UI 层。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `18-04` 的 override 和 holiday 写入可以直接复用 runtime agenda invalidation 路径。
- `18-05` reminder orchestration 可以直接以 agenda 和 override 结果作为事件来源。

## Self-Check: PASSED

- Verified `pnpm test --run src/lib/dal/schedule-runtime.test.ts`
- Verified `pnpm test --run src/components/surfaces/teacher-schedule-surface.test.tsx`

---

*Phase: 18-teaching-schedule-os*
*Completed: 2026-05-10*
