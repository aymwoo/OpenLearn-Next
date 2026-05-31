---
phase: quick
plan: 260508-9np
status: complete
---

# Quick summary

已完成：按 Stitch 六屏参考继续收敛课堂运行、批量评价、沉浸学习、学生学习页与学生管理相关 surface，保持现有路由和数据链路不变。

## What changed

1. 调整 `/classroom` 相关 surface 的层级和视觉结构，继续沿用现有课堂控制与监控链路。
2. 收敛 `/teacher/review`、`/student/player`、`/student` 与 `/teacher/students` 的页面壳层和卡片节奏，统一 tonal/no-line 视觉语言。
3. 继续细调 `class-management-surface` 的学生卡片与列表视图，保留正方形卡片、头像进度环和紧凑信息结构。

## Verification

- `./node_modules/.bin/vitest run src/components/surfaces/classroom-console-surface.test.tsx src/components/learning/teacher-review-surface.test.ts src/components/surfaces/class-management-surface.test.tsx src/components/surfaces/class-management-surface.dialog.test.tsx`
- 历史计划记录：`260508-9np-PLAN.md` 已注明当时 `pnpm typecheck` 通过，scoped `eslint` 仅剩既有 `<img>` warning。
