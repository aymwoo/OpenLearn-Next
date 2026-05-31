---
phase: 17-teacher-flow-editor-enhancement
plan: 03
subsystem: ui
tags: [teacher-editor, preview-route, draft-preview, lesson-preview]
requires:
  - phase: 17-teacher-flow-editor-enhancement
    provides: teacher-owned preview DTO and integrated flow editor shell
provides:
  - dedicated teacher preview route for draft lesson flows
  - teacher-facing preview surface with ordered steps, built-in badges, and material summaries
  - editor preview CTA wired to a real route with explicit courseId and lessonId
affects: [teacher-editor, teacher-preview, lesson-editor-surface]
tech-stack:
  added: []
  patterns: [teacher-owned draft preview route, explicit preview query params, inline preview summary panel]
key-files:
  created:
    [.planning/phases/17-teacher-flow-editor-enhancement/17-03-SUMMARY.md, src/app/(teacher)/teacher/editor/preview/page.tsx, src/app/(teacher)/teacher/editor/preview/page.test.tsx, src/components/surfaces/teacher-lesson-preview-surface.tsx]
  modified:
    [src/components/surfaces/lesson-editor-surface.tsx]
key-decisions:
  - "teacher preview route 必须同时要求 courseId 和 lessonId，避免像旧 editor 一样落回模糊默认课时。"
  - "课堂预览继续只读取 teacher-owned draft DTO，不复用 student runtime、SSE 或个人学习进度。"
  - "editor 页面同时保留 inline preview summary 与真实预览入口，避免把预览能力伪装成死按钮。"
patterns-established:
  - "Teacher draft preview: preview route verifies explicit editor scope before loading getTeacherLessonPreviewDTO()."
  - "Preview summary panel: lesson editor shell surfaces active steps, built-in steps, and materials before route navigation."
requirements-completed: [LESSON-03, LESSON-04, PLUGIN-05]
duration: 5 min
completed: 2026-05-10
---

# Phase 17 Plan 03: Teacher preview route summary

**`/teacher/editor` 现在拥有真实的课堂预览链路：教师可以带着明确的 `courseId` 和 `lessonId` 打开草稿预览页面，查看步骤顺序、内置环节来源和引用材料摘要。**

## Performance

- **Duration:** 5 min
- **Completed:** 2026-05-10
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- 新增 `/teacher/editor/preview` route，要求显式 `courseId` + `lessonId`，并在 teacher-owned scope 内加载 `getTeacherLessonPreviewDTO()`。
- 新建 `TeacherLessonPreviewSurface`，用教师视角展示当前草稿的步骤顺序、built-in source badge 与材料摘要。
- 把 editor shell 的 `预览课堂` 从死按钮改成真实路由入口，并增加 inline preview summary 面板。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `src/app/(teacher)/teacher/editor/preview/page.tsx` - 新增 teacher draft preview route 与参数校验。
- `src/app/(teacher)/teacher/editor/preview/page.test.tsx` - 覆盖显式参数要求与 teacher-owned preview 分支。
- `src/components/surfaces/teacher-lesson-preview-surface.tsx` - 新增课堂预览 surface。
- `src/components/surfaces/lesson-editor-surface.tsx` - 接入真实 preview route 和 inline preview summary。

## Decisions Made

- preview route 不接受模糊上下文，必须和 course-aware editor 的 query params 对齐。
- 预览继续属于教师 authoring 流程，不引入 student runtime 依赖，避免心智和数据边界混淆。
- editor 右侧补充预览摘要卡，先给教师一个不跳页的草稿概览，再进入完整预览页。

## Deviations from Plan

- 预览 surface 直接沿用 `StageHero` 与 player surface 的节奏语言，而不是复制学生端 runtime 组件，减少无关依赖。

## Issues Encountered

- None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `17-04` 可以直接在 editor shell 里继续接入 structured readiness panel，并与 preview summary 形成发布前闭环。
- 真实 preview route 已到位，后续 `verify:phase17` 可以把 route wiring 纳入固定校验目标。

## Self-Check: PASSED

- Verified `pnpm test --run "src/app/(teacher)/teacher/editor/preview/page.test.tsx"`
- Verified preview route wiring static check

---

*Phase: 17-teacher-flow-editor-enhancement*
*Completed: 2026-05-10*
