---
phase: quick
plan: 260510-tlq
status: complete
---

# Quick summary

已完成：将 `/teacher/editor` 流程主线中的步骤编辑改为显式按钮触发的右侧抽屉。

- 在 `lesson-authoring-workspace.tsx` 的流程卡片动作区新增 `编辑组件` 按钮，并用右侧抽屉承载步骤编辑器。
- 移除页面底部常驻的 `LessonStepEditor`，改为点击步骤卡按钮后才展开编辑抽屉，支持遮罩和关闭按钮收起。
- 在 `lesson-step-editor.tsx` 保留原有 autosave、schema 校验与 `builtInSource` 展示逻辑，只补充抽屉承载所需的容器 `className` 扩展。
- 在 `lesson-authoring-workspace.test.tsx` 和 `lesson-step-editor.test.tsx` 增加 focused regression，锁定编辑按钮、抽屉展开/关闭和保存链路不回退。

验证：

- `pnpm test --run "src/components/authoring/lesson-authoring-workspace.test.tsx" "src/components/authoring/lesson-step-editor.test.tsx"`
