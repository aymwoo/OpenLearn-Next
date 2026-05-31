---
phase: 25-teaching-data-capture-and-session-analytics
plan: 02
subsystem: classroom-ui
tags: [classroom, recap, ui, history, drill-down]
requires:
  - phase: 25-01
    provides: recap dto and ended/history route branch
provides:
  - ended-state recap main stage inside classroom console shell
  - same-domain classroom history rail
  - student-first recap drill-down and secondary step diagnostics
affects: [classroom-console, teacher-recap, phase-26-productization]
key-files:
  created:
    - src/components/classroom/classroom-session-history-panel.tsx
    - src/components/classroom/classroom-session-recap-surface.tsx
  modified:
    - src/components/surfaces/classroom-console-surface.tsx
    - src/components/classroom/classroom-control-panel.tsx
    - src/components/classroom/classroom-student-detail-panel.tsx
key-decisions:
  - "ended session 主舞台由 recap 接管，不再让 live runtime controls 占据首屏叙事。"
  - "课堂记录列表固定留在 `/classroom` 次级 rail，用同路由 query state 回看 session。"
  - "student-first drill-down 保持四组证据：完成情况、提交与反馈、过程评价、课堂时间线；环节诊断只作为次级区块。"
completed: 2026-05-14
---

# Phase 25 Plan 02 Summary

把 recap 从纯数据合同落成了教师可直接使用的 `/classroom` 课后复盘界面。

- 新增 `ClassroomSessionRecapSurface`，按 hero、headline metrics、workload split、student-first drill-down、step diagnostics 的顺序组织 recap。
- 新增 `ClassroomSessionHistoryPanel`，在课堂域里统一显示 live / ended session 记录并支持同路由 reopen。
- 更新 `ClassroomConsoleSurface` 和 `ClassroomControlPanel`，让 live 与 ended 两种状态共用同一 classroom shell。
- 将学生详情空态文案统一为 `未评价`，与 recap participation contract 保持一致。

验证：`pnpm test --run src/components/surfaces/classroom-console-surface.test.tsx src/components/classroom/classroom-session-history-panel.test.tsx src/components/classroom/classroom-session-recap-surface.test.tsx src/components/classroom/classroom-student-detail-panel.test.tsx`
