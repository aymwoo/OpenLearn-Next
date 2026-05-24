---
phase: 45-extension-and-plugin-owned-schema-patterns
reviewed: 2026-05-24T02:28:44Z
depth: deep
files_reviewed: 5
files_reviewed_list:
  - src/db/schema.ts
  - src/lib/dal/plugin-data.ts
  - src/lib/dal/plugin-data.test.ts
  - scripts/verify-phase45-plugin-schema.ts
  - src/lib/dal/lesson-authoring.ts
findings:
  critical: 2
  warning: 1
  info: 0
  total: 3
status: issues_found
---

# Phase 45: Code Review Report

**Reviewed:** 2026-05-24T02:28:44Z  
**Depth:** deep  
**Files Reviewed:** 5  
**Status:** issues_found

## Summary

本次复审聚焦 Phase 45 当前 live codebase，重点检查 `src/db/schema.ts`、
`src/lib/dal/plugin-data.ts`、`src/lib/dal/plugin-data.test.ts` 与
`scripts/verify-phase45-plugin-schema.ts`，并回溯 `lesson-authoring` 的真实
authoring 权限边界。

结论：**45-02 已经修复了上次 review 里“cascade proof 只靠字符串/元数据推断”
的主要告警**——现在测试与 verify 脚本都会执行真实 SQLite delete/assert，且包含
`PRAGMA foreign_key_check`。但 **2 个 BLOCKER 仍然存在**，并且 close gate 仍有
**1 个 WARNING**：它证明的是手写影子 schema，而不是真实 schema/migration 产物。

## Critical Issues

### CR-01: lesson/step 插件扩展仍然存在同校横向越权

**Classification:** BLOCKER  
**File:** `src/lib/dal/plugin-data.ts:37-48,62-89,172-180,378-386`  
**Issue:** `assertTeacherManagerScope()` 只要求操作者是该学校教师，
`assertEntityBelongsToSchool()` 只校验 lesson/step 属于同一个 school。这样一来，
同校教师只要知道 `pluginId + lessonId/stepId`，就能读写其他教师课程下的插件扩展
数据。这个边界和真实 authoring DAL 不一致：`src/lib/dal/lesson-authoring.ts:166-223`
会继续校验 `course.ownerId === scope.userId`，而这里完全没有 owner 约束。
**Fix:** 读取/写入 lesson 与 step 扩展时改为复用 owner-aware scope，而不是只校验
school。建议把 `lesson-authoring` 的 scoped helper 抽成共享断言。

```ts
const scope = await assertTeacherManagerScope(actorId, schoolId)

if (entityType === "lesson") {
  await assertScopedLessonOwnership(entityId, scope)
}

if (entityType === "step") {
  await assertScopedStepOwnership(entityId, scope)
}
```

### CR-02: `plugin_owned_business_data` 仍缺少唯一约束，写路径仍会产生重复逻辑键

**Classification:** BLOCKER  
**File:** `src/db/schema.ts:1851-1869`, `src/lib/dal/plugin-data.ts:482-510,572-584`  
**Issue:** `plugin_owned_business_data` 现在仍然只有普通索引
`plugin_owned_biz_school_plugin_key_idx`，没有 `(schoolId, pluginId, key)` 唯一约束。
DAL 写路径依旧是“先查再 insert/update”的非原子流程；并发请求下会插入多条相同
逻辑键。随后读路径又用 `limit(1)` 随机取一条，结果取决于 SQLite 返回顺序，造成
插件自有业务状态分叉与不稳定读取。
**Fix:** 给表补唯一索引，并改成数据库级 `onConflictDoUpdate`。同时补一次历史重复
数据清理脚本。

```ts
uniqueIndex("plugin_owned_biz_school_plugin_key_unique")
  .on(table.schoolId, table.pluginId, table.key)

await tx.insert(pluginOwnedBusinessData).values({
  schoolId,
  pluginId,
  key,
  payloadJson,
}).onConflictDoUpdate({
  target: [
    pluginOwnedBusinessData.schoolId,
    pluginOwnedBusinessData.pluginId,
    pluginOwnedBusinessData.key,
  ],
  set: {
    payloadJson,
    updatedAt: new Date(),
  },
})
```

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

_Reviewed: 2026-05-24T02:28:44Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: deep_
