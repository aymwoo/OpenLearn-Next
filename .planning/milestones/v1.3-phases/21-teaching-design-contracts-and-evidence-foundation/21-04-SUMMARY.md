---
phase: 21-teaching-design-contracts-and-evidence-foundation
plan: 04
subsystem: ui
tags: [classroom, intervention, timeline, dto, vitest]
requires:
  - phase: 21-teaching-design-contracts-and-evidence-foundation
    provides: durable classroom intervention persistence and teacher-facing fallback cues
provides:
  - typed teacher timeline read model on classroom snapshot DTO
  - dedicated intervention timeline panel for `/classroom`
  - regression coverage for timeline hydration and panel layout contracts
affects: [classroom-runtime, teacher-runtime, session-analytics, evaluation]
tech-stack:
  added: []
  patterns: [teacher-only runtime timeline DTO, dedicated tonal intervention panel, session-scoped timeline hydration]
key-files:
  created:
    - .planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-04-SUMMARY.md
    - src/components/classroom/classroom-timeline-panel.tsx
    - src/components/classroom/classroom-timeline-panel.test.tsx
  modified:
    - src/lib/dto/classroom.ts
    - src/lib/dal/classroom.ts
    - src/lib/dal/classroom.test.ts
    - src/components/classroom/classroom-control-panel.tsx
    - src/components/surfaces/classroom-console-surface.tsx
key-decisions:
  - "Classroom snapshot 新增 `teacherTimeline` typed read model，但对非教师 consumer 固定返回空数组，避免 teacher-only intervention 正文泄漏。"
  - "干预记录从拥挤控制区拆到独立 tonal timeline panel，并和 roster 组成右侧次级栏，不新增第二个 hero。"
patterns-established:
  - "Teacher timeline hydration: DAL 只映射当前 session 的 `intervention_noted` 行，并补齐 `studentName`、`stepTitle`、`targetLabel` 给 UI 直接渲染。"
  - "Classroom runtime side-rail pattern: 渐变主舞台保留核心状态，其余 teacher-only records 回落到独立 tonal cards。"
requirements-completed: [EVAL-03]
duration: 3 min
completed: 2026-05-13
---

# Phase 21 Plan 04: Intervention timeline runtime summary

**`/classroom` 现在会把 intervention 按 teacher-only typed timeline 注入 runtime snapshot，并在独立的干预记录时间线 panel 中稳定展示标题、正文、目标范围与记录时间。**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-13T07:53:54+08:00
- **Completed:** 2026-05-12T23:56:55Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- 为 `ClassroomSnapshotDTO` 增加 `teacherTimeline` typed read model，并把 intervention hydration 收敛到 DAL。
- 保持 teacher-only 边界：非教师 snapshot consumer 继续拿到空 timeline，不暴露 intervention 正文。
- 新增独立 `干预记录时间线` panel，并把运行台右侧次级栏稳定化，避免干预内容挤进控制区。

## Task Commits

Each task was committed atomically:

1. **Task 1: 补齐教师 timeline read model，并把 intervention 注入 runtime snapshot** - `66494bc` (feat)
2. **Task 2: 新增独立 timeline panel，并把 intervention 从拥挤控制区移到稳定容器** - `12e9b2c` (feat)

## Files Created/Modified

- `src/lib/dto/classroom.ts` - 新增 `ClassroomTeacherTimelineEntryDTO` 与 snapshot `teacherTimeline` contract。
- `src/lib/dal/classroom.ts` - 把 `intervention_noted` rows 映射成 teacher runtime timeline，并按教师/学生 consumer 分流。
- `src/lib/dal/classroom.test.ts` - 增加 timeline hydration、session scoping、teacher-only 边界回归测试。
- `src/components/classroom/classroom-timeline-panel.tsx` - 新增独立 intervention timeline panel。
- `src/components/classroom/classroom-timeline-panel.test.tsx` - 覆盖 empty state、字段渲染与长正文布局合同。
- `src/components/classroom/classroom-control-panel.tsx` - 将 timeline panel 放入教师运行台右侧次级栏。
- `src/components/surfaces/classroom-console-surface.tsx` - 增加运行台分区说明，保持单一主舞台 + tonal panels 的页面语义。

## Decisions Made

- 继续复用现有 `ClassroomSnapshotDTO` 作为 teacher runtime contract，而不是新增平行 snapshot 类型；teacher-only 数据通过空数组策略维持非教师安全边界。
- timeline panel 固定作为次级 tonal card，和 roster 同栏堆叠，避免把 intervention 记录塞进 hero、控制按钮区或名册卡片内。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 新增 jsdom 组件测试时发现仓库默认未注入 `jest-dom` matcher，因此改为使用项目现有可用的基础 truthy / className 断言；不影响行为覆盖范围。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 24/25 可直接基于 `teacherTimeline` 继续做 intervention-aware monitoring、session recap 与 analytics drill-down。
- `/classroom` 的干预记录已有稳定容器，后续只需补写入入口与更丰富的 teacher workflow，而不必再次重构整体布局。

## Self-Check: PASSED

- Verified `src/components/classroom/classroom-timeline-panel.tsx` exists.
- Verified `src/components/classroom/classroom-timeline-panel.test.tsx` exists.
- Verified commits `66494bc` and `12e9b2c` exist in git history.

---

*Phase: 21-teaching-design-contracts-and-evidence-foundation*
*Completed: 2026-05-13*
