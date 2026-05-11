---
phase: quick
plan: 260511-bn1
status: complete
---

# Quick Task 260511-bn1 Summary

- 将 `data-region="page-header"` 下沉到真实头部块本身，移除了 teacher shell 中额外的 page-header wrapper。
- 让 `/teacher` 页头部块保持 `w-full`，并放宽 `StageHero` 内容列限制，避免局部窄版心。
- 删除 `/teacher` layout 中硬编码的 headerDescription，实现说明文案回退到共享 shell summary。
- 更新了聚焦测试，覆盖 page-header 结构、全宽约束和硬编码文案删除。

## Tests

- `pnpm exec vitest --run src/components/shell/teacher-sidebar-shell.test.tsx src/components/surfaces/teacher-dashboard-surface.test.tsx`

## Files changed

- `src/components/shell/teacher-sidebar-shell.tsx`
- `src/components/surfaces/stage-hero.tsx`
- `src/app/(teacher)/teacher/layout.tsx`
- `src/components/shell/teacher-sidebar-shell.test.tsx`
- `src/components/surfaces/teacher-dashboard-surface.test.tsx`

## Notes

- Summary 已写入，但按要求不纳入本次代码提交。
