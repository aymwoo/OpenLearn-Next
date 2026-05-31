---
phase: 51-command-bus-foundation
reviewed: 2026-05-21T00:00:00Z
depth: deep
files_reviewed: 12
files_reviewed_list:
  - /home/wuxf/Develop/OpenLearn-Next/src/db/schema.ts
  - /home/wuxf/Develop/OpenLearn-Next/scripts/prepare-dev-db.ts
  - /home/wuxf/Develop/OpenLearn-Next/src/features/platform-core/commands/contracts.ts
  - /home/wuxf/Develop/OpenLearn-Next/src/features/platform-core/commands/registry.ts
  - /home/wuxf/Develop/OpenLearn-Next/src/features/platform-core/commands/bus.ts
  - /home/wuxf/Develop/OpenLearn-Next/src/lib/dal/plugins.ts
  - /home/wuxf/Develop/OpenLearn-Next/src/features/platform-core/commands/handlers/plugins.ts
  - /home/wuxf/Develop/OpenLearn-Next/src/features/platform-core/commands/producers/plugin-governance.ts
  - /home/wuxf/Develop/OpenLearn-Next/src/actions/plugin-actions.ts
  - /home/wuxf/Develop/OpenLearn-Next/src/features/runtime-platform/host-actions/plugin-host.ts
  - /home/wuxf/Develop/OpenLearn-Next/scripts/bootstrap-dev-db.ts
  - /home/wuxf/Develop/OpenLearn-Next/scripts/verify-phase51-command-bus.ts
findings:
  critical: 3
  warning: 2
  info: 0
  total: 5
status: issues_found
---

# Phase 51: Code Review Report

**Reviewed:** 2026-05-21T00:00:00Z
**Depth:** deep
**Files Reviewed:** 12
**Status:** issues_found

## Summary

本轮 deep review 发现 3 个阻断问题和 2 个警告。最严重的问题集中在命令总线与卸载语义：`plugin.retry` 通过正式 producer 根本无法真正重试；`plugin.uninstall` 暴露了 `retain|cleanup` 契约却始终执行物理删除；命令去重实现存在竞态窗口，遇到并发重复提交会直接抛数据库唯一约束错误而不是返回幂等结果。另有 2 个次级问题会在后续修复主路径后继续造成失败或事务不一致。

## Critical Issues

### BLOCKER-01: `plugin.retry` 通过正式 producer 永远不会执行重试

**File:** `/home/wuxf/Develop/OpenLearn-Next/src/features/platform-core/commands/producers/plugin-governance.ts:107-113`; `/home/wuxf/Develop/OpenLearn-Next/src/features/platform-core/commands/bus.ts:147-165`
**Issue:** producer 在 `plugin.retry` 场景把 `commandId` 强制复用为原失败命令 id。随后 `dispatchPlatformCommand()` 调用 `insertCommand()` 命中已有记录后，会因为该记录状态是 `failed` 而直接短路返回旧结果，根本不会进入 `plugin.retry` handler。也就是说，公开的 retry producer 只会回放失败状态，不会追加新 attempt、更不会执行真正重试。
**Fix:** 让 bus 显式支持“对既有失败命令追加 retry attempt”，不要把 retry 当成普通 dedupe 命令短路返回。例如对 `type === "plugin.retry"` 增加特判，允许在已有失败命令上继续执行并写入新 attempt；或改造 store API，提供 `reopenFailedCommand(commandId)` / `appendRetryAttempt(commandId)` 语义。

### BLOCKER-02: `plugin.uninstall` 的 `retentionMode` 契约被完全忽略，`retain` 也会删除数据

**File:** `/home/wuxf/Develop/OpenLearn-Next/src/features/platform-core/commands/contracts.ts:83-87`; `/home/wuxf/Develop/OpenLearn-Next/src/features/runtime-platform/host-actions/plugin-host.ts:111-119`; `/home/wuxf/Develop/OpenLearn-Next/src/features/platform-core/commands/handlers/plugins.ts:192-200`; `/home/wuxf/Develop/OpenLearn-Next/src/lib/dal/plugins.ts:120-124`; `/home/wuxf/Develop/OpenLearn-Next/src/lib/dal/plugins.ts:891-896`; `/home/wuxf/Develop/OpenLearn-Next/src/db/schema.ts:1718-1723`; `/home/wuxf/Develop/OpenLearn-Next/src/db/schema.ts:1791-1795`
**Issue:** 命令契约明确声明卸载支持 `retentionMode: "retain" | "cleanup"`，host action 甚至默认发送 `retain`。但 handler 调用 `uninstallPluginWithTx()` 时完全丢弃该字段，而 DAL 类型与实现也没有保留逻辑，直接 `DELETE pluginRegistrations`。由于多个插件业务表都对 `pluginRegistrations.id` 配置了 `onDelete: "cascade"`，所谓的 `retain` 实际上仍会清空插件扩展/业务数据，存在真实数据丢失风险。
**Fix:** 把 `retentionMode` 一路传到 DAL，并实现分支语义：

```ts
type UninstallPluginWithTxInput = PluginBySchoolInput & {
  tx: PluginDalTx;
  retentionMode: "retain" | "cleanup";
};

if (input.retentionMode === "retain") {
  // 标记 disabled / uninstalled，不删除 registration 与 owned data
} else {
  // 允许物理删除与级联清理
}
```

### BLOCKER-03: 命令去重实现不是原子的，并发重复提交会直接炸唯一约束

**File:** `/home/wuxf/Develop/OpenLearn-Next/src/features/platform-core/commands/producers/plugin-governance.ts:145-179`; `/home/wuxf/Develop/OpenLearn-Next/src/db/schema.ts:403-404`
**Issue:** `platformCommandStore.insertCommand()` 先查 `id`，再查 `dedupeKey`，最后普通 `insert`。这不是原子操作。两个并发请求携带同一 `dedupeKey` 时，双方都可能在查询阶段看到“尚不存在”，随后其中一个写入成功，另一个在唯一索引 `platformCommands_dedupeKey_unique` 处直接抛异常。结果不是稳定的幂等返回，而是随机 500 / SQLite unique constraint failure。
**Fix:** 用数据库级 `ON CONFLICT DO NOTHING/UPDATE` 或捕获唯一约束后回读既有记录，确保并发重复提交返回同一 command，而不是把数据库错误泄露给上层。

## Warnings

### WARNING-01: 即使修好 bus，`plugin.install` 的 retry handler 仍会把 plugin key 误当 registration id

**File:** `/home/wuxf/Develop/OpenLearn-Next/src/features/platform-core/commands/handlers/plugins.ts:242-259`; `/home/wuxf/Develop/OpenLearn-Next/src/lib/dal/plugins.ts:376-381`
**Issue:** `executeRetry()` 在重试 `plugin.install` 时，把 `retriedScope.pluginId ?? command.scope.pluginId` 传给 `installOrReconcilePluginWithTx({ pluginId })`。但 install 命令里的 `scope.pluginId` 存的是 manifest/plugin key，不是 registration id；DAL 一旦收到这个字段，就会走“显式 registration id”分支并在查不到记录时抛 `PLUGIN_NOT_FOUND`。这意味着主 retry 通路修好后，install retry 仍然会继续失败。
**Fix:** install retry 应传递原始 `existingRegistrationId`，首次安装重试则应传 `undefined`，让 DAL 按 `pluginKey` reconcile，而不是把 `scope.pluginId` 塞进 `pluginId` 参数。

### WARNING-02: 多个 `*WithTx` DAL helper 的读操作绕过了传入事务

**File:** `/home/wuxf/Develop/OpenLearn-Next/src/lib/dal/plugins.ts:372-374`; `/home/wuxf/Develop/OpenLearn-Next/src/lib/dal/plugins.ts:589-604`; `/home/wuxf/Develop/OpenLearn-Next/src/lib/dal/plugins.ts:675-677`; `/home/wuxf/Develop/OpenLearn-Next/src/lib/dal/plugins.ts:773-775`; `/home/wuxf/Develop/OpenLearn-Next/src/lib/dal/plugins.ts:852-854`
**Issue:** 这些 `WithTx` 函数名字表明应完全在调用方事务内工作，但关键查询仍然通过全局 `db.query.*` 执行，而不是走传入的 `tx`。这会破坏事务内读写一致性，并放大并发状态竞争：你在事务里基于旧快照做状态迁移/kill switch/卸载判定，最终写入的却是另一个时点的数据。
**Fix:** 让 `PluginDalTx` 提供所需查询能力，或把这些 helper 改成“调用方先查询，再把快照显式传入”。核心原则是：既然函数签名是 `WithTx`，所有读写都必须绑定同一事务连接。

---

_Reviewed: 2026-05-21T00:00:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
