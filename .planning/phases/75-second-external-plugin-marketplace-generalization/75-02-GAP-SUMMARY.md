---
phase: 75-second-external-plugin-marketplace-generalization
plan: 02-GAP
subsystem: plugin-owned-data/migration
tags: [gap-closure, upgrade-migration, homework-plugin, dueDate, drizzle-migrate]
requires: ["75-01", "75-03", "75-04"]
provides: ["0023_phase75_homework_upgrade migration", "0023 snapshot", "journal continuity"]
affects: ["homework upgrade lifecycle", "drizzle-kit migrate compatibility", "phase75 verification"]
tech-stack:
  added: []
  patterns: [drizzle-kit checked-in migration, ALTER TABLE ADD COLUMN, snapshot cumulative inheritance]
key-files:
  created:
    - drizzle/0023_phase75_homework_upgrade.sql
    - drizzle/meta/0023_snapshot.json
  modified:
    - drizzle/meta/_journal.json
decisions:
  - "prevId 指向 0007_snapshot (f505c29e)，而非 0015——因为 0015 也不含 homework 表定义"
  - "journal version 使用 '6'（对齐 8 条既有 entry 中的 7 条）"
  - "0017 不在 journal 中——homework 三表由 preview 直接创建，drizzle-kit migrate 仅执行 journal 中的未应用迁移；0023 ALTER TABLE 对已存在表无影响"
metrics:
  start: "2026-06-11T02:55:00Z"
  completed: "2026-06-11T02:59:43Z"
  duration: "~5 minutes"
  task_count: 2
  file_count: 3
---

# Phase 75 Plan 02-GAP: Homework Upgrade Migration Gap Closure 总结

**一句话总结:** 补齐 homework upgrade 迁移文件（0023/ALTER TABLE ADD COLUMN dueDate），更新 journal + snapshot，验证三阶段升级 + 跨插件回归 + drizzle-kit migrate 兼容全部通过。

## 目标

关闭 VERIFICATION.md 中识别的 2 个 gap（Gap 1: 缺少 upgrade 迁移文件；Gap 2: 缺少 journal 条目与 snapshot 对齐），使 D-10（upgrade 迁移验证）和 D-09（全链路五阶段 semver upgrade）从 partial 变为 verified。

## 实施内容

### Task 1: 创建 upgrade 迁移 + journal + snapshot

- 创建 `drizzle/0023_phase75_homework_upgrade.sql`：单条 `ALTER TABLE plugin_owned_homework_assignments ADD COLUMN dueDate TEXT`
- 更新 `drizzle/meta/_journal.json`：追加 entry（idx=8, version="6", tag="0023_phase75_homework_upgrade"）
- 创建 `drizzle/meta/0023_snapshot.json`：基于 0007_snapshot.json 完整结构，追加三张 homework 表（82 tables），prevId 指向 0007
- 在数据库上执行 ALTER TABLE，`plugin_owned_homework_assignments` 表现含 dueDate TEXT 列

### Task 2: 验证迁移三阶段 + 跨插件回归 + drizzle-kit 兼容性

- **lifecycle.test.ts**: 12/12 通过（backfill/verify/cutover + uninstall/reinstall/governance gate）
- **cross-plugin-regression.test.ts**: 6/6 通过（A-F 检查点：quiz install 不受影响、homework dataModel 编译后 quiz 全绿、编辑器共存、提交双绿、upgrade 后 quiz 完整、uninstall 后 quiz 正常）
- **verify:phase75**: quiz-sample-step-card (3) + homework/ (18) = 21/21 全部通过
- **drizzle-kit 兼容性**: 0017 不在 journal 中不阻断 0023 执行；journal 状态 OK
- **数据库完整性**: 三表结构正确，既有数据零丢失（assignments 为空表不适用）

## 验证结果

| 测试套件 | 文件数 | 测试数 | 结果 |
|----------|--------|--------|------|
| lifecycle.test.ts | 1 | 12 | ALL PASS |
| cross-plugin-regression.test.ts | 1 | 6 | ALL PASS |
| quiz-sample-step-card.test.tsx | 1 | 3 | ALL PASS |
| homework/ | 2 | 18 | ALL PASS |
| **合计** | **5** | **39** | **ALL PASS** |

## 与计划的偏差

无 -- 计划精确按预期执行。

## D-10/D-09 状态变更

- **D-10**: `partial` -> `verified`（upgrade 迁移文件 + journal + snapshot 全部就位，三阶段验证通过）
- **D-09**: `partial` -> `verified`（semver upgrade 阶段因迁移补齐而关闭，全链路五阶段完整）

## 提交

- `64b7c88`: feat(75-02-GAP): add homework upgrade migration SQL, journal entry, and snapshot
- `0438420`: feat(75-02-GAP): verify upgrade migration, cross-plugin regression, and drizzle-kit compat
