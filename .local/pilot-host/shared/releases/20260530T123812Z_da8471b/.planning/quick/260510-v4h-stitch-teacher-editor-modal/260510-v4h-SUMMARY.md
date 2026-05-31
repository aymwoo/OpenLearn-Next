---
phase: quick
plan: 260510-v4h
status: complete
---

# Quick summary

已完成：根据 Stitch 的“编辑教学环节 - 实时预览版”参考，整理 `/teacher/editor` 的步骤编辑 modal，收敛当前界面混乱、预览挤压和层级不清的问题。

- 在 `lesson-step-editor.tsx` 中把右侧预览区收敛为更接近 Stitch 的单卡学生视图，移除额外的“预览摘要”和“实时预览说明”块。
- 保留并继续展示标题、正文/任务/题目摘要、builtInSource、资料信息与时长徽标。
- 微调左侧表单头部和说明块节奏，减少卡片嵌套造成的视觉噪音。
- 更新 `lesson-step-editor.test.tsx`，锁定新的简化预览结构，同时确保标题、正文、资料信息和 built-in metadata 继续存在。

验证：

- `pnpm test --run "src/components/authoring/lesson-step-editor.test.tsx" "src/components/authoring/lesson-authoring-workspace.test.tsx"`
