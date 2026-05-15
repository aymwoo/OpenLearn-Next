---
phase: quick-260507-tcl-stitch
plan: 01
status: complete
subsystem: class-management-ui
tags: [filter, bulk-actions, avatar, stitch-alignment]
requires: []
provides:
  - "Individual selectable filter chips (在读, 请假, 男, 女) with toggle behavior"
  - "Bulk actions with Download + Trash2 icons matching Stitch"
  - "Student avatars at 36px with primary-tinted tonal background"
affects:
  - src/components/surfaces/class-management-surface.tsx
tech-stack:
  added: []
  patterns:
    - "Client component filter state via useState for chip toggle"
    - "Tonal active chip styling: bg-primary/10 text-primary ring-1 ring-primary/20"
key-files:
  created: []
  modified:
    - src/components/surfaces/class-management-surface.tsx
decisions:
  - "FilterPill accepts active (boolean) and onClick props for chip toggle; sibling auto-deselect"
  - "Bulk actions show 下载 (Download) + 删除 (Trash2) instead of 导出 + EllipsisVertical"
  - "Student avatars use size-9 (36px), text-sm, bg-primary/10 text-primary for branded tonal accent"
duration: 4 min
completed: "2026-05-07T21:10:00+08:00"
---

# Quick Task 260507-tcl: 班级管理页面 Stitch 对齐

将班级管理页面的学生名册区域（filter pills、批量操作、学生行样式）对齐 Stitch 屏幕 `154c66ef0dc643a7a3edd7ed520fc999` 的设计模式。Hero 区域（班级信息、指标、按钮）和整体页面布局保持不变。

## Tasks Executed

| # | Name | Type | Commit | Status |
|---|------|------|--------|--------|
| 1 | Replace filter pills with individual selectable chips and update bulk actions | auto | f0ede6e | ✅ |
| 2 | Polish student avatar styling to match Stitch proportions | auto | 6338958 | ✅ |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

| Check | Result |
|-------|--------|
| Filter chips show 在读/请假/男/女 (no 全部状态/全部性别) | ✅ PASS |
| Bulk actions show Download + Trash2 icons | ✅ PASS |
| Student avatars are size-9 with bg-primary/10 text-primary | ✅ PASS |
| Hero section unchanged (lines 72-117) | ✅ PASS |
| classSummary, students, Metric, MetaText, PaginationButton unchanged | ✅ PASS |
| Commits f0ede6e and 6338958 exist | ✅ PASS |

## Verification

1. **Filter chips:** `grep "全部状态\|全部性别"` returns exit 1 (no matches)
2. **Bulk icons:** `Trash2` imported and used in bulk actions area; `EllipsisVertical` removed from bulk actions
3. **Avatar styling:** `size-9 rounded-full bg-primary/10 text-sm font-semibold text-primary` confirmed at line 227

## Threat Flags

None — visual/UI changes only, no new endpoints, auth paths, or data access patterns.

## Self-Check: PASSED

All files and commits verified present.
