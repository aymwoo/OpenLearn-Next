---
phase: 45-extension-and-plugin-owned-schema-patterns
reviewed: 2026-05-24T02:54:52Z
depth: deep
files_reviewed: 5
files_reviewed_list:
  - src/db/schema.ts
  - src/lib/dal/plugin-data.ts
  - src/lib/dal/plugin-data.test.ts
  - scripts/verify-phase45-plugin-schema.ts
  - src/lib/dal/lesson-authoring.ts
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Phase 45: Code Review Report

**Reviewed:** 2026-05-24T02:54:52Z  
**Depth:** deep  
**Files Reviewed:** 5  
**Status:** issues_found

## Summary

本次复审聚焦 Phase 45 当前 live codebase，重点检查 `src/db/schema.ts`、
`src/lib/dal/plugin-data.ts`、`src/lib/dal/plugin-data.test.ts` 与
`scripts/verify-phase45-plugin-schema.ts`，并回溯 `lesson-authoring` 的真实
authoring 权限边界。

结论：**前次 review 的 2 个 BLOCKER 已关闭**。`plugin-data.ts` 现在对
lesson/step 扩展读写执行 owner-aware 校验，不再只按 school 放行；
`plugin_owned_business_data` 现在具备 `(schoolId, pluginId, key)` 唯一索引，
并改成数据库级 `onConflictDoUpdate` 原子 upsert。close gate 仍保留 **1 个 WARNING**：
行为 proof 依旧基于手写影子 schema，而不是真实 schema/migration 产物。

## Resolved Issues

### CR-01: lesson/step 插件扩展同校横向越权已修复

**Classification:** RESOLVED  
**File:** `src/lib/dal/plugin-data.ts:37-48,62-107,183-191,389-397`  
**Resolution:** `assertEntityBelongsToSchool()` 现在在 lesson/step 路径额外拉取
`courses.ownerId`，并要求 `ownerId === scope.userId`。`upsertPluginExtension()` 与
`getPluginExtension()` 都先保存 `assertTeacherManagerScope()` 返回的 scope，再把它传入
实体断言，因此同校教师不能再跨 owner 读写其他教师课程下的插件扩展。

### CR-02: `plugin_owned_business_data` 重复逻辑键风险已修复

**Classification:** RESOLVED  
**File:** `src/db/schema.ts:1851-1870`, `src/lib/dal/plugin-data.ts:490-522`  
**Resolution:** 表结构已改为唯一索引
`plugin_owned_biz_school_plugin_key_unique`，DAL 写路径也已改为单条
`insert(...).onConflictDoUpdate(...)` 原子 upsert。`src/lib/dal/plugin-data.test.ts`
新增断言，验证 upsert 直接命中数据库级 conflict target，而不是先查再写。

## Warnings

### WR-01: cascade proof 已从“静态推断”升级，但仍基于手写影子 schema，不能证明真实产物不漂移

**Classification:** WARNING  
**File:** `src/lib/dal/plugin-data.test.ts:64-145,209-269`, `scripts/verify-phase45-plugin-schema.ts:95-177,215-255`  
**Issue:** 45-02 的确解决了上次 review 中“只数 token/索引名”的主要问题：现在会跑
真实 SQLite delete/assert 和 `PRAGMA foreign_key_check`。但测试与 verify 脚本都在
临时数据库里**手写了一份最小 schema**，而不是从真实 Drizzle schema / migration 产物
构建。这意味着只要影子 schema 没跟着 production contract 一起坏，close gate 仍可
能通过，无法真正证明 live schema 没有漂移。
**Fix:** 改为从正式 migration 或共享 schema bootstrap 构建临时库；至少补充对真实
Phase 45 表的 `PRAGMA foreign_key_list(...)`、`PRAGMA index_list(...)` 与唯一索引
结构校验，避免测试脚本各维护一份手写 FK 图。

---

_Reviewed: 2026-05-24T02:54:52Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: deep_
