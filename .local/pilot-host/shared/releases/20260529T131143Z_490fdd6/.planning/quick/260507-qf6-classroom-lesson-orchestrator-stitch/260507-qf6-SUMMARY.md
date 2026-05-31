---
phase: quick
plan: 1
subsystem: "teacher-lesson-editor"
tags:
  - "ui"
  - "teacher"
  - "stitch"
  - "authoring"
dependencies:
  requires:
    - "existing lesson editor surface"
    - "existing lesson step authoring actions"
  provides:
    - "stitch-inspired lesson orchestration workspace"
    - "resource library plus flow canvas composition"
  affects:
    - "src/components/authoring/lesson-authoring-workspace.tsx"
    - "src/components/surfaces/lesson-editor-surface.tsx"
tech-stack:
  added: []
  patterns:
    - "tonal layered workspace"
    - "stitch-inspired drag-state preview"
    - "existing action handlers preserved"
key-files:
  created:
    - ".planning/quick/260507-qf6-classroom-lesson-orchestrator-stitch/260507-qf6-PLAN.md"
  modified:
    - "src/components/authoring/lesson-authoring-workspace.tsx"
    - "src/components/surfaces/lesson-editor-surface.tsx"
key-decisions:
  - "只重构页面结构与视觉层级，不扩展真实拖拽数据模型，继续复用现有移动与步骤编辑动作。"
  - "拖拽态采用 Stitch 风格的放置预览和悬浮卡片做视觉表达，而不是引入新的 DnD 依赖。"
  - "保持项目既有 Lexend、no-line、tonal surface 语言，不直接照搬 Stitch HTML 的边框实现。"
metrics:
  tasks-completed: 1
  files-modified: 2
  date-completed: "2026-05-07"
status: complete
---

# Phase quick Plan 1: Classroom Lesson Orchestrator Stitch Summary

参照 Stitch 屏幕重构教师端课堂教学活动编排页，把原本偏信息面板式的编排界面收敛为资源库、流程画布、拖拽放置提示和编排摘要更明确的课堂工作台。

## Completed Tasks

1. **Task 1: 对齐 Stitch 的课堂编排页主结构**
   - 重新组织 `lesson-editor-surface` 的页头层级，把课程主题、修订信息、发布状态和核心指标前置到统一主舞台。
   - 重做 `lesson-authoring-workspace`，增加资源库列表、流程时间线、开始/结束节点、放置中 drop preview 和悬浮拖拽卡片视觉态。
   - 保留并接回现有新增内容/任务/测验、复制、归档、上移、下移、步骤编辑保存等动作能力。
   - 通过 `pnpm exec eslint "src/components/authoring/lesson-authoring-workspace.tsx" "src/components/surfaces/lesson-editor-surface.tsx"` 与 `pnpm exec tsc --noEmit` 校验。

## Deviations from Plan

None.

## Known Stubs

1. 当前拖拽态是视觉模拟，不是鼠标真实拖拽排序；真实排序仍通过既有上移/下移动作完成。

## Threat Flags

None.
