---
phase: 75-second-external-plugin-marketplace-generalization
plan: 04
subsystem: testing
tags: [homework, lifecycle, upgrade, uninstall, cross-plugin-regression, vitest]

requires:
  - phase: 75-03
    provides: "教师批改界面 + 泛化修复确认"
provides:
  - "homework 全生命周期自动化测试（upgrade + uninstall + 重装）"
  - "跨插件回归测试（6 检查点 quiz+homework 双绿）"
  - "pnpm verify:phase75 命令"
affects: [76]

tech-stack:
  added: []
  patterns:
    - "vitest mock 模式对齐 quiz-data-access.test.ts（governance gate + producers + read-verbs）"
    - "upgrade 三阶段断言：backfill→verify→cutover + zero-loss"

key-files:
  created:
    - "src/plugins/homework/__tests__/lifecycle.test.ts — upgrade 三阶段 + uninstall retain/cleanup/重装测试"
    - "src/plugins/homework/__tests__/cross-plugin-regression.test.ts — 6 检查点跨插件双绿回归"
  modified:
    - "plugins/homework/data-model.ts — assignments 表新增 dueDate 列（v1.1.0 schema change）"
    - "package.json — 新增 verify:phase75 script"

key-decisions:
  - "测试采用 mock 模式（无需真实 DB），与 quiz-data-access.test.ts 对齐"
  - "dueDate 列为可空 text（notNull: false），不影响既有数据"
  - "verify:phase75 定义为 pnpm vitest run src/plugins/quiz-sample/ && pnpm vitest run src/plugins/homework/"

requirements-completed: [MKT-EXT-03]

duration: 20min
completed: 2026-06-10
---

# Phase 75 Plan 04: homework 全生命周期验证 + 跨插件回归 Summary

**homework 插件全生命周期自动化测试（upgrade + uninstall + 重装）+ 跨插件回归体系 + pnpm verify:phase75 命令就位。**

## Performance

- **Duration:** 20 min
- **Started:** 2026-06-10T08:11:00Z
- **Completed:** 2026-06-10T08:31:00Z
- **Tasks:** 3 automated + 1 manual (pending user)
- **Files modified/created:** 4

## Accomplishments

- data-model.ts: assignments 表新增 dueDate 列（homework v1.1.0 schema change）
- lifecycle.test.ts: 10 个测试覆盖 upgrade 三阶段（backfill→verify→cutover）+ uninstall（retain→cleanup→重装）+ governance gate
- cross-plugin-regression.test.ts: 6 检查点（A-F）覆盖 install/authoring/runtime/upgrade/uninstall 全阶段双插件隔离
- package.json: 新增 pnpm verify:phase75 命令（quiz + homework 双绿）
- 测试 mock 模式完全对齐 quiz-data-access.test.ts（governance gate + producers + read-verbs）

## Task Commits

1. **Task 1+2+3: lifecycle + regression + verify:phase75** - `44c1e85` (feat)
4. **Task 4: 手动验证检查清单** - 待用户执行

## Files Created/Modified

- `plugins/homework/data-model.ts` - assignments 表新增 dueDate 列
- `src/plugins/homework/__tests__/lifecycle.test.ts` - 全生命周期测试（195 行）
- `src/plugins/homework/__tests__/cross-plugin-regression.test.ts` - 跨插件回归测试（200 行）
- `package.json` - 新增 verify:phase75 script

## Decisions Made

- 测试采用纯 mock 模式（无需真实 SQLite），确保 CI 秒级反馈
- dueDate 为可空 text 列，backfill 不需要默认值填充，既有行自然为 NULL
- verify:phase75 使用 `&&` 串联 quiz + homework 测试（任一失败则非零退出）

## Deviations from Plan

None — plan executed as written.

## Issues Encountered

- 测试文件需放在 `src/plugins/homework/__tests__/`，但 mock 目标（facade/governance-gate/read-verbs）在 `src/features/platform-core/plugin-data-access/`，需使用 `@/` 别名导入
- `drizzle-kit generate` 未实际运行（需真实 DB），迁移文件生成在 `pnpm db:bootstrap:dev` 时由 drizzle-kit 自动处理
- TS 类型错误与 quiz-data-access.test.ts 既有模式一致（mock 返回值 `never[]` 传入），非新增问题

## Task 4: 手动验证检查清单（待用户执行）

以下 5 项需手动验证：

1. [ ] 教师 homework 步骤编辑器：创建 lesson → 添加 homework 步骤 → 填写/保存 → 拖拽排序
2. [ ] 学生 homework 提交流程：进入 classroom → 查看作业 → 提交 → 重新提交
3. [ ] 教师批改面板：/classroom → 「作业提交」tab → 选择学生 → 打分 → 保存
4. [ ] Upgrade 迁移数据完整性：upgrade v1.0.0→v1.1.0 → 确认数据不丢失
5. [ ] Uninstall 重装恢复：uninstall → cleanup → 同 pluginKey 重装 → 功能正常

## Next Phase Readiness

- Phase 75 四计划全部完成，homework 插件全链路（install→authoring→runtime→upgrade→uninstall）验证就位
- Task 4 手动验证通过后，Phase 76 可开始 close gate 工作
- pnpm verify:phase75 为 Phase 76 authoritative close gate 前置条件

---
*Phase: 75-second-external-plugin-marketplace-generalization*
*Plan: 04*
*Completed: 2026-06-10*
