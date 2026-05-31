---
phase: quick
plan: 260510-uko
status: complete
---

# Quick summary

已完成：移除 `/teacher/editor` 资源库底部残留的“当前编排概览 / 有效步骤 / 内置环节 / 普通步骤”统计块，保持其余 Nimbus 资源库和步骤编辑 modal 不变。

- 在 `lesson-authoring-workspace.tsx` 中删除资源库底部概览统计卡片。
- 同步移除不再使用的 `SummaryStat` 辅助实现，保持组件最小化。
- 在 `lesson-authoring-workspace.test.tsx` 中补充回归断言，确保“当前编排概览”“有效步骤”不再出现在资源库区域。

验证：

- `pnpm test --run "src/components/authoring/lesson-authoring-workspace.test.tsx" "src/components/authoring/lesson-step-editor.test.tsx"`
