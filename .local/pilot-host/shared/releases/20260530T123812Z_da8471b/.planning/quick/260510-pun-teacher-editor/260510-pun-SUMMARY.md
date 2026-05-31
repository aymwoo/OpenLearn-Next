---
phase: quick
plan: 260510-pun
status: complete
---

# Quick summary

已完成：移除 `/teacher/editor` 流程主线底部、课程结束标记左侧上方那根多余的竖条。

- 在 `lesson-authoring-workspace.tsx` 中删除 `课程结束` 标记上方单独的竖向装饰条。
- 保留 `流程主线`、步骤卡、课程结束标记、右侧编辑器和其它编排能力不变。
- 在 `lesson-authoring-workspace.test.tsx` 中补了 focused regression，锁定这根竖条不会回归。

验证：

- `pnpm test --run "src/components/authoring/lesson-authoring-workspace.test.tsx"`
- `pnpm typecheck`
