---
phase: quick
plan: 260510-v1f
status: complete
---

# Quick summary

已完成：移除 `/teacher/editor` 左侧 `lesson-flow-composer` 外层由 `Card` 渲染出的 section/card shell，仅保留内部资源库内容结构。

- 在 `lesson-authoring-workspace.tsx` 中将左侧资源库容器从 `Card` 替换为普通 `div`。
- 保留 `lesson-flow-composer` 内部的 rounded rail、搜索、分类筛选与资源项列表结构。
- 在 `lesson-authoring-workspace.test.tsx` 中新增源码级回归断言，确保左侧不再被该 `Card` 外壳包裹。

验证：

- `pnpm test --run "src/components/authoring/lesson-authoring-workspace.test.tsx" "src/components/authoring/lesson-step-editor.test.tsx"`
