---
phase: quick
plan: 260511-bbe
status: complete
---

# Quick Task 260511-bbe Summary

- `/teacher` 首页左侧 sidebar、右侧 main 容器、顶部 dashboard hero 已按需求去掉圆角。
- `/teacher` 页面局部 `mx-auto` / rounded 壳层已移除，主内容保持 `w-full` 展开。
- 新增定向回归测试，锁定首页 shell 直角与 dashboard 全宽约束。

## Changed files

- `src/components/shell/teacher-sidebar-shell.tsx`
- `src/components/shell/teacher-sidebar-shell.test.tsx`
- `src/components/surfaces/teacher-dashboard-surface.tsx`
- `src/components/surfaces/teacher-dashboard-surface.test.tsx`
- `src/app/(teacher)/teacher/page.tsx`

## Tests

- `pnpm exec vitest --run src/components/shell/teacher-sidebar-shell.test.tsx src/components/surfaces/teacher-dashboard-surface.test.tsx`

## Notes

- 未提交任何 planning / docs 产物。
