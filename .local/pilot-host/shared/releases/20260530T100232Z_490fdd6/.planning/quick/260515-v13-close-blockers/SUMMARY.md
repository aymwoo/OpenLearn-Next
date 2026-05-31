---
phase: quick
plan: 260515-v13-close-blockers
status: complete
---

# Quick Summary

已完成：修复帮助中心内容文件的 build blocker，并把 v1.3 归档口径收敛为真实的 Phase 21-26 scope。

- 修复 `src/lib/help/help-center-content.ts` 中错误的对象提前闭合、缺失的帮助页 key、对象 key 逗号与未转义引号，恢复帮助中心内容模块并通过 `./node_modules/.bin/next build`。
- 更新 `.planning/MILESTONES.md`、`.planning/ROADMAP.md`、`.planning/PROJECT.md`、`.planning/STATE.md` 与必要的 v1.3 archive 文档，明确 v1.3 close 只覆盖 Phase 21-26。
- 将 `COURSE-04`~`COURSE-09`、`AUTH-01`~`AUTH-06`、`DATA-01`~`DATA-05`、`CLASS-05` 记录为 known gaps，而不是继续写成已随 v1.3 一起关闭。

验证：

- `./node_modules/.bin/next build`
- `./node_modules/.bin/tsc --noEmit --pretty false --project tsconfig.json` 仍失败于仓库既有测试类型问题，与本次 help-center / milestone close 修复无关。
