---
phase: quick
plan: 1
subsystem: "dev-bootstrap"
tags:
  - "db"
  - "seed"
  - "drizzle"
  - "sqlite"
dependencies:
  requires:
    - "existing Drizzle SQLite schema"
    - "test account seed script"
  provides:
    - "single-command dev database bootstrap"
    - "canonical classroom/course dev seed data"
  affects:
    - "package.json"
    - "scripts/seed-test-accounts.ts"
    - "scripts/bootstrap-dev-db.ts"
tech-stack:
  added: []
  patterns:
    - "reusable seed helper with retained CLI entry"
    - "idempotent canonical dev data bootstrap"
key-files:
  created:
    - "scripts/bootstrap-dev-db.ts"
  modified:
    - "package.json"
    - "scripts/seed-test-accounts.ts"
key-decisions:
  - "继续复用现有 teacher/student 测试账号，而不是再起一套新的 fixtures 体系。"
  - "开发 bootstrap 只补一套 canonical 学校/班级/课程/课时/发布版本数据，避免 seed 膨胀成通用平台。"
  - "通过受控 replace lesson steps + republish version 保证重复执行后仍只有一套课堂联调数据。"
metrics:
  tasks-completed: 3
  files-modified: 3
  date-completed: "2026-05-07"
---

# Phase quick Plan 1: 开发环境数据库 bootstrap Summary

为开发环境补了一条真正可执行的数据库初始化入口：先推送 Drizzle schema，再复用现有测试账号 seed，最后生成一套可直接用于教师备课、学生学习和课堂联调的最小 canonical 数据链。

## Completed Tasks

1. **Task 1: 把现有测试账号 seed 收敛成可复用入口** (Commit: `b1f1a02`)
   - 导出了 `seedTestAccounts()`，返回测试学校、教师和学生的基础标识信息。
   - 保留 `scripts/seed-test-accounts.ts` 作为独立 CLI 的运行方式，没有拆出新的 seed 框架。

2. **Task 2: 添加单命令开发数据库 bootstrap 脚本** (Commit: `94e3d56`)
   - 新增 `npm run db:bootstrap:dev`，执行 `drizzle-kit push && tsx scripts/bootstrap-dev-db.ts`。
   - 新增 `scripts/bootstrap-dev-db.ts`，基于同一所测试学校生成班级、课程、选课、课时、3 个 steps 和 1 个 published version。

3. **Task 3: 为重复执行建立最小回归闭环** (Commit: `94e3d56`)
   - bootstrap 完成时输出学校、班级、课程、课时、发布版本和 teacher/student 登录账号。
   - 连续两次对同一临时 SQLite 执行 bootstrap 后，确认学校、班级、课程、课时和发布版本都保持单份 canonical 数据。

## Deviations from Plan

### Auto-fixed Issues

**1. 直接调用 `tsx` 时本机 PATH 未提供全局命令**
- **Found during:** verification
- **Issue:** 直接执行 `tsx scripts/seed-test-accounts.ts` 在当前 shell 中报 `tsx: command not found`。
- **Fix:** 改为使用项目本地依赖的 `npx tsx ...` 做直接验证；`package.json` 中的 npm scripts 仍然能正常调用本地 `tsx`。
- **Files modified:** None (verification-only adjustment)

## Known Stubs

None.

## Threat Flags

None.
