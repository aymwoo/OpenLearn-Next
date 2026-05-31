---
phase: 52-action-registry-plugin-lifecycle-governance
reviewed: 2026-05-22T00:03:29Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - scripts/verify-phase52-action-registry-and-lifecycle.ts
  - src/actions/plugin-actions.ts
  - src/actions/plugin-actions.test.ts
  - src/components/surfaces/plugin-lifecycle-operator-surface.tsx
  - src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx
  - src/components/surfaces/settings-surface.tsx
  - src/components/surfaces/settings-surface.test.tsx
  - src/features/platform-core/actions/contracts.ts
  - src/features/platform-core/actions/registry.ts
  - src/features/platform-core/actions/static-catalog.test.ts
  - src/features/platform-core/commands/bus.ts
  - src/features/platform-core/commands/contracts.ts
  - src/features/platform-core/commands/handlers/plugins.ts
  - src/features/platform-core/commands/handlers/plugins.test.ts
  - src/features/platform-core/commands/producers/plugin-governance.ts
  - src/features/platform-core/commands/registry.ts
  - src/features/platform-core/plugins/dependency-graph.ts
  - src/features/platform-core/plugins/governance-projection.ts
  - src/features/platform-core/plugins/governance-projection.test.ts
  - src/features/runtime-platform/contracts/permissions.ts
  - src/features/runtime-platform/host-actions/guards.ts
  - src/features/runtime-platform/host-actions/plugin-host.ts
  - src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts
  - src/lib/dal/plugins.ts
  - src/lib/dal/plugins.test.ts
findings:
  critical: 3
  warning: 1
  info: 0
  total: 4
status: issues_found
---

# Phase 52: Code Review Report

**Reviewed:** 2026-05-22T00:03:29Z  
**Depth:** standard  
**Files Reviewed:** 25  
**Status:** issues_found

## Summary

本次按标准深度复审了 Phase 52，重点覆盖 52-06/07/08 新增改动。

结论：`retained uninstall -> uninstalled` 读模型链路已补齐，但 `plugin.reconcile`
与 operator recovery 仍有 3 处可证明的 correctness 断裂；`verify:phase52`
也还不足以兜住这些回归。

本报告按 **advisory** 输出，不自动阻塞流程；但按缺陷分级，下面 3 项仍属于
**BLOCKER** 风险。

## Critical Issues

### CR-01: operator/host 的 `plugin.retry` 默认拿不到真实失败命令 ID

**Classification:** BLOCKER  
**File:** `src/components/surfaces/plugin-lifecycle-operator-surface.tsx:182-188`; `src/features/runtime-platform/host-actions/plugin-host.ts:137-140`; `src/features/platform-core/commands/handlers/plugins.ts:353-376`; `src/features/platform-core/actions/registry.ts:33-61`

**Issue:**
`executeRetry()` 会按 `payload.commandId` 去加载“原失败命令”，并要求当前 retry
命令与这个 ID 绑定为同一个稳定命令 ID。可现在：

- operator surface 用的是伪造值 `plugin.retry:${pluginId}`
- host 在未传入时也回退到同样的伪造值
- governance read model 又没有暴露任何 `lastFailedCommandId`

所以从诊断页点“重试恢复”时，运行时没有来源可拿到真实失败命令，最终会在
`loadRetriedCommand()` 里走到 `PLATFORM_COMMAND_RETRY_TARGET_NOT_FOUND`。

**Fix:**
把最近失败命令 ID 作为治理读模型的一部分暴露出来，并移除伪造 fallback：

```ts
type PluginGovernanceLifecycleReadModel = {
  // ...
  lastFailedCommandId: string | null;
};

await retryPluginAction({
  pluginId: plugin.pluginId,
  schoolId,
  commandId: plugin.lastFailedCommandId!,
  reason,
});
```

### CR-02: host kill-switch 恢复分支被提前拒绝，`plugin.resume` 实际不可用

**Classification:** BLOCKER  
**File:** `src/features/runtime-platform/host-actions/plugin-host.ts:51-57,217-250`

**Issue:**
`isReasonMatchedRecoveryAction()` 明确声明 `kill_switch -> plugin.resume`，但 host
治理判定里先执行了：

```ts
if (plugin.killSwitchEnabled) {
  return createDeniedGovernanceDecision({ reason: "kill_switch", ... })
}
```

这会在命中恢复动作前直接拒绝所有 write action，导致 host 路径上的
`plugin.resume` 永远过不了治理检查。

**Fix:**
先放行“与当前 reasonCode 匹配的恢复动作”，再做通用 deny：

```ts
if (plugin.killSwitchEnabled && !isReasonMatchedRecoveryAction(input.action, plugin.reasonCode)) {
  return createDeniedGovernanceDecision({
    action: input.action,
    actor,
    targetSchoolId: plugin.schoolId,
    reason: "kill_switch",
    requiredPermission: resolvedPermission,
    lifecycle: { ... },
  });
}
```

### CR-03: `plugin.reconcile` 的公开入口默认只恢复到 `enabled`，不会回到 executable catalog

**Classification:** BLOCKER  
**File:** `src/components/surfaces/plugin-lifecycle-operator-surface.tsx:189-195`; `src/features/runtime-platform/host-actions/plugin-host.ts:98-106`; `src/features/platform-core/commands/handlers/plugins.ts:111-112`; `src/features/platform-core/plugins/governance-projection.ts:83-91,223-224`

**Issue:**
现在 UI、host 和 handler 的 `plugin.reconcile` 默认目标态都是 `enabled`。但治理投影里：

- 只有 `mounted` / `ready` 会被映射成外部态 `active`
- 只有 `active` 才会进入 `executableActionCatalog`

因此当前公开链路上的 reconcile 即便“成功”，目标插件仍只会停在 `enabled`，不会重新进入
executable catalog，诊断页无法真正恢复成可执行状态。

**Fix:**
让 reconcile 默认恢复到可执行态，或显式携带期望的恢复目标：

```ts
const targetState = command.payload.targetState
  ?? (currentPlugin.lifecycleState === "mounted" || currentPlugin.lifecycleState === "ready"
    ? currentPlugin.lifecycleState
    : "ready");
```

并把 UI/host 默认值同步改掉，而不是继续硬编码成 `enabled`。

## Warnings

### WR-01: `verify:phase52` 仍然主要是字符串守卫，没覆盖关键恢复回归

**Classification:** WARNING  
**File:** `scripts/verify-phase52-action-registry-and-lifecycle.ts:64-74,163-183,249-259`; `src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx:671-676`; `src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts:398-483`

**Issue:**
当前 verifier 主要检查“有没有这些字符串”，再跑少量 focused suites；它没有锁住下面两类真实行为：

- retry 是否使用了真实 failed command ID
- host 在 `kill_switch` 下是否真的允许 `plugin.resume`
- reconcile 之后插件是否重新进入 executable catalog

现有前端测试还把伪造的 `plugin.retry:${pluginId}` 当成正确期望，容易把坏 contract 固化下来。

**Fix:**
补行为级用例，不要只加静态字符串断言：

```ts
it("uses lastFailedCommandId for retry recovery", ...)
it("allows host plugin.resume when reasonCode=kill_switch", ...)
it("reconcile returns plugin to executable catalog", ...)
```

---

_Reviewed: 2026-05-22T00:03:29Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: standard_
