---
phase: quick
plan: 1
subsystem: "teacher-dashboard"
tags:
  - "ui"
  - "teacher"
  - "layout"
dependencies:
  requires:
    - "existing teacher dashboard surface"
  provides:
    - "wider teacher dashboard schedule copy"
  affects:
    - "src/components/surfaces/teacher-dashboard-surface.tsx"
tech-stack:
  added: []
  patterns:
    - "minimal className-only visual fix"
key-files:
  created:
    - ".planning/quick/260507-r7m-teacher-copy-width/260507-r7m-PLAN.md"
  modified:
    - "src/components/surfaces/teacher-dashboard-surface.tsx"
key-decisions:
  - "只移除说明文案上的 max-w-2xl，不调整教师首页其他布局比例。"
metrics:
  tasks-completed: 1
  files-modified: 1
  date-completed: "2026-05-07"
status: complete
---

# Phase quick Plan 1: Teacher Dashboard Copy Width Summary

修复教师首页“今日课表与运行节奏”模块说明文案的异常窄宽度，移除误加的 `max-w-2xl`，让“上午直播、下午英语课和批改闭环”这段文字按模块自然宽度展开。

## Completed Tasks

1. **Task 1: 移除教师首页说明文案的额外宽度上限** (Commit: `b35e052`)
   - 定位 `src/components/surfaces/teacher-dashboard-surface.tsx` 中“今日课表与运行节奏”模块的说明段落。
   - 删除不需要的 `max-w-2xl` class，保留字号、行高、语义和整体布局不变。
   - 通过 scoped eslint，确认修改未引入新的 lint 问题。

## Deviations from Plan

None.

## Known Stubs

None.

## Threat Flags

None.
