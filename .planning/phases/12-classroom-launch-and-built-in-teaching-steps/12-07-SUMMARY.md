---
phase: 12-classroom-launch-and-built-in-teaching-steps
plan: 07
subsystem: ui
tags: [lesson-authoring, built-in-plugins, teacher-editor, plugin-registry]
requires:
  - phase: 12-classroom-launch-and-built-in-teaching-steps
    provides: enabled built-in template resolution and teacher editor authoring shell
provides:
  - school-scoped built-in template loading at the teacher editor route boundary
  - registry-backed built-in quick-add buttons in the authoring workspace
affects: [lesson-authoring, plugin-registry, teacher-editor]
tech-stack:
  added: []
  patterns: [server-loaded built-in template props, registry-backed authoring quick-add]
key-files:
  created: []
  modified:
    - src/app/(teacher)/teacher/editor/page.tsx
    - src/components/surfaces/lesson-editor-surface.tsx
    - src/components/authoring/lesson-authoring-workspace.tsx
key-decisions:
  - "教师编排页的内置教学环节只从学校范围内已启用的 built-in plugin templates 注入，不在路由端回退到硬编码常量。"
  - "内置环节 quick-add 继续复用 addLessonStepAction 的服务端持久化路径，只替换按钮数据来源。"
patterns-established:
  - "Teacher editor route -> LessonEditorSurface -> LessonAuthoringWorkspace 逐层传递 builtInTemplates。"
  - "Authoring quick-add 的 built-ins 由 registry templates 排序渲染，缺失模板即不显示按钮。"
requirements-completed: [LESSON-03, PLUGIN-05]
duration: 3 min
completed: 2026-05-08
---

# Phase 12 Plan 07: Registry-backed built-in authoring quick-add Summary

**教师编排页现在按学校范围加载启用中的 built-in templates，并且 `内置教学环节` 只渲染这些 registry-backed 直达按钮。**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-08T23:33:39Z
- **Completed:** 2026-05-08T23:37:16Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 在教师 editor route 边界调用 `listBuiltInTeachingStepTemplates()`，按 `scope.userId + lesson.course.schoolId` 加载学校范围内启用的 built-in templates。
- 通过 `LessonEditorSurface` 将 `builtInTemplates` 传入 `LessonAuthoringWorkspace`，无 active lesson 时明确传空数组。
- 将 `内置教学环节` quick-add 分组改为基于传入模板渲染，停用 built-in 后不会再出现对应按钮，同时仍通过 `addLessonStepAction()` 写入 `initialTitle` 与 `initialPayload`。

## Task Commits

Each task was committed atomically:

1. **Task 1: Load enabled built-in templates at the teacher editor route boundary** - `c3bfbb9` (feat)
2. **Task 2: Render only enabled built-in teaching steps in the first-level quick-add group** - `58c1d13` (feat)

## Files Created/Modified

- `src/app/(teacher)/teacher/editor/page.tsx` - 在教师编辑页服务端加载学校范围内启用的 built-in templates。
- `src/components/surfaces/lesson-editor-surface.tsx` - 为 authoring surface 增加 `builtInTemplates` 透传入口。
- `src/components/authoring/lesson-authoring-workspace.tsx` - 以 injected template array 渲染 built-in quick-add，并保持服务端 add-step 插入路径。

## Decisions Made

- 不把 built-in template 查询下放到 client，继续保持在 authenticated teacher route boundary 完成，满足 school scope 与 threat model 要求。
- 不再让 `LessonAuthoringWorkspace` 依赖 `BUILT_IN_TEACHING_STEP_DEFINITIONS` 生成 quick-add 按钮，只把它当作 registry/typed payload 的上游定义来源。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `orderedBuiltInTemplates` 的排序 map 初始实现触发了 TypeScript 字面量类型报错；已在 Task 2 内收口为 `Map<string, number>` 并重新通过验证。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 12-07 已把编排页 built-in quick-add 与 plugin enable/disable 状态重新对齐，可作为后续 12-09 行为级回归测试的真实数据来源。
- 后续涉及 built-in authoring 曝光时，应继续沿用 route-scoped template loading，而不是在 UI 侧重新引入固定常量按钮列表。

## Self-Check: PASSED

- Found file: `.planning/phases/12-classroom-launch-and-built-in-teaching-steps/12-07-SUMMARY.md`
- Found file: `src/app/(teacher)/teacher/editor/page.tsx`
- Found file: `src/components/surfaces/lesson-editor-surface.tsx`
- Found file: `src/components/authoring/lesson-authoring-workspace.tsx`
- Found commit: `c3bfbb9`
- Found commit: `58c1d13`
