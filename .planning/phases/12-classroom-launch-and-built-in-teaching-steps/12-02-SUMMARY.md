---
phase: 12-classroom-launch-and-built-in-teaching-steps
plan: 02
subsystem: ui
tags: [classroom, launch-preview, dto, teacher, nextjs]
requires:
  - phase: 12-classroom-launch-and-built-in-teaching-steps
    provides: dedicated /teacher/launch preparation surface and launch handoff
provides:
  - inline launch preview backed by classroom DTO data
  - published-lesson preview summaries, durations, and material cues
  - calm empty-state copy before lesson selection
affects: [teacher-launch, classroom-runtime, lesson-authoring]
tech-stack:
  added: []
  patterns: [published-snapshot preview shaping, inline launch-page rhythm preview, dto-first preview rendering]
key-files:
  created:
    - src/components/classroom/classroom-launch-preview.tsx
  modified:
    - src/lib/dal/classroom.ts
    - src/lib/dto/classroom.ts
    - src/components/classroom/classroom-launch-panel.tsx
    - src/components/surfaces/classroom-launch-surface.tsx
key-decisions:
  - "开课预览只读取已发布课时快照与已验证 payload，避免把草稿态误展示为可开课内容。"
  - "预览保持在 /teacher/launch 页面内联呈现，并在未选课时时显示平静占位说明。"
patterns-established:
  - "Launch preview DTO: DAL derives family, summary, estimatedMinutes, and materialCues before UI render"
  - "Teacher launch preview: vertical step rhythm instead of a dense table or modal subflow"
requirements-completed: [CLASS-01, CLASS-06, CLASS-07]
duration: 1 min
completed: 2026-05-08
---

# Phase 12 Plan 02: Inline classroom launch preview Summary

**教师现在可以在 `/teacher/launch` 内联查看已发布课时的步骤顺序、摘要、预计时长与材料提示，再决定是否开启课堂。**

## Performance

- **Duration:** 1 min
- **Started:** 2026-05-08T21:41:16+08:00
- **Completed:** 2026-05-08T13:42:36Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- 为课堂开课页补齐 DTO 级 launch preview contract，并由 DAL 从已发布课时快照派生步骤摘要、时长与材料提示。
- 新增 `ClassroomLaunchPreview`，以纵向步骤节奏而非表格方式展示步骤标题、family、estimated duration 与 one-line summary。
- 在未选择课时时提供平静占位说明，保证开课页始终留在同一路由、同一上下文中完成预览。

## Task Commits

Each task was committed atomically:

1. **Task 1: Add a launch preview DTO shaped from launchable lesson data** - `327b05b` (feat)
2. **Task 2: Render the inline launch preview on the dedicated page** - `ad9ef66` (feat)

## Files Created/Modified

- `src/lib/dto/classroom.ts` - 新增 launch preview、empty state 与 classroom console 的类型契约。
- `src/lib/dal/classroom.ts` - 从 published snapshot 生成步骤 family、summary、estimatedMinutes 与 material cues。
- `src/components/classroom/classroom-launch-preview.tsx` - 新的内联预览组件与未选课时占位态。
- `src/components/classroom/classroom-launch-panel.tsx` - 在开课表单下方接入 preview，并消费 DTO empty state。
- `src/components/surfaces/classroom-launch-surface.tsx` - 透传 preview empty state，保持 launch surface 内联预览结构。

## Decisions Made

- 预览数据只来自可开课的 published lesson snapshot 与 `lessonStepPayloadSchema` 已验证字段，不暴露原始 payload JSON。
- 保持预览内联，不新增 route、modal 或 tab 子流程，符合 Phase 12 的单页准备面与 threat model 要求。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 12-03 可以直接在现有 launch/preview 链路基础上补 built-in teaching-step 插件 seed 与管理标识。
- 预览已成为 DTO-backed server-shaped source of truth，后续无需在客户端重复拼装课堂摘要逻辑。

## Self-Check: PASSED

- Found file: `src/components/classroom/classroom-launch-preview.tsx`
- Found file: `.planning/phases/12-classroom-launch-and-built-in-teaching-steps/12-02-SUMMARY.md`
- Found commit: `327b05b`
- Found commit: `ad9ef66`

---
*Phase: 12-classroom-launch-and-built-in-teaching-steps*
*Completed: 2026-05-08*
