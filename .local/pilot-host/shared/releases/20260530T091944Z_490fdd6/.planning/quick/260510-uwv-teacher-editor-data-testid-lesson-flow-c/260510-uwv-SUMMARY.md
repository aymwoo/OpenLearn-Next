---
phase: quick
plan: 260510-uwv
status: complete
---

# Quick summary

已完成：继续收紧 `/teacher/editor` 中 `lesson-flow-composer` 的资源库结构，只保留内层 rounded rail，移除上方标题说明与筛选按钮外壳。

- 在 `lesson-authoring-workspace.tsx` 中删除 `lesson-flow-composer` 外层的“课堂流程组件 / 资源库”标题、说明文案与“筛选资源”按钮。
- 保留内层 rounded rail 内的搜索、分类筛选、资源项与内置教学环节列表。
- 更新 `lesson-authoring-workspace.test.tsx`，锁定这些外层文案和按钮不再出现，同时保留流程主线与 built-in badge 回归。

验证：

- `pnpm test --run "src/components/authoring/lesson-authoring-workspace.test.tsx" "src/components/authoring/lesson-step-editor.test.tsx"`
