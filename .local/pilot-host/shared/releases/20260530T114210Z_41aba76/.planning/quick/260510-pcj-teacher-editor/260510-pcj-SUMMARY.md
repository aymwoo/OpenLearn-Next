---
phase: quick
plan: 260510-pcj
status: complete
---

# Quick summary

已完成：移除 teacher editor 左侧多余的课程/班级摘要卡，仅保留课时列表、步骤编排、主编排区与右侧设置面板。

- 删除 `LessonEditorSurface` 左栏顶部的 `课程 / 班级` 摘要块，避免重复展示课程信息。
- 左侧 rail 继续保留 `课时列表`、`步骤编排` 和新增步骤占位卡，中间 `LessonAuthoringWorkspace` 与右侧设置/预览/发布区未改动。
- 新增 focused regression test，锁定这次 UI 精简只删除指定摘要块，不误伤其余编排能力。

验证：

- `pnpm test --run "src/components/surfaces/lesson-editor-surface.test.tsx"`
- `pnpm typecheck`
