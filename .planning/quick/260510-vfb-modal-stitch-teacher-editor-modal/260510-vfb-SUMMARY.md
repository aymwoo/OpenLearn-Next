## Summary

- 将 `/teacher/editor` 的步骤编辑 modal 继续收敛到更接近 Stitch 的单容器双栏结构：外层 modal 只负责 backdrop、dialog 容器与关闭按钮，标题说明回到左栏编辑面板顶部。
- 为外层 dialog 增加稳定的 `aria-label="编辑教学环节"`，修复 `LessonStepEditor` 被测试 mock 替换后可访问名称丢失导致的 workspace 回归。
- 右栏继续保留单卡学生视图实时预览，并把编辑器底部“取消”按钮接回 modal 关闭行为，避免保留无效交互。

## Verification

- `pnpm vitest run src/components/authoring/lesson-authoring-workspace.test.tsx`
- `pnpm vitest run src/components/authoring/lesson-step-editor.test.tsx`
