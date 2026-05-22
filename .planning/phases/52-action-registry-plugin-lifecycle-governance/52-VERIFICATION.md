---
phase: 52-action-registry-plugin-lifecycle-governance
verified: 2026-05-22T00:03:06Z
status: human_needed
score: 8/8 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 6/8
  gaps_closed:
    - "学校操作员可以区分 installed、enabled、active、suspended、uninstalled 状态。"
    - "恢复路径必须显式且可执行，不发生隐式 auto-recovery。"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Operator diagnostics end-to-end recovery flow"
    expected: "dependency-blocked 插件在治理诊断页显示“运行 reconcile”，点击后走显式 reconcile 并刷新为新治理状态。"
    why_human: "需要真实浏览器 / server action / 数据状态联调，静态检查与单测无法证明完整交互链路。"
  - test: "Retain uninstall audit-only presentation"
    expected: "执行 retain uninstall 后，插件显示“已卸载”审计态，保留卸载摘要，且无主生命周期动作按钮。"
    why_human: "需要人工确认真实 UI 呈现与用户流，不适合仅靠源码和 focused tests 断言。"
---

# Phase 52: Action Registry & Plugin Lifecycle Governance Verification Report

**Phase Goal:** 让 action catalog 与 plugin lifecycle 进入同一受治理模型，并关闭 verification gaps。
**Verified:** 2026-05-22T00:03:06Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure

## Goal Achievement

本次按 re-verification 执行，先复核上次两个 blocker，再对已通过项做回归检查。

结论：**代码层 must-haves 已全部闭合，之前 2 个 gaps 已被代码证据消除。**
但该 phase 含 operator UI / 恢复交互，仍有 2 项需要人工做最终 UAT，
因此状态为 `human_needed`，不是 `passed`。

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | 平台维护者可以为 built-in 与 plugin action 注册 typed descriptor，并在 action key 冲突时看到明确拒绝。 | ✓ VERIFIED | `src/features/platform-core/actions/contracts.ts`、`src/features/platform-core/actions/static-catalog.ts`、`src/features/platform-core/actions/static-catalog.test.ts` 仍在；`pnpm run verify:phase52` 与 focused suites 通过。 |
| 2 | 平台调用方只能发现当前 lifecycle 条件满足的 action catalog；blocked actions 只在 operator diagnostics 可见。 | ✓ VERIFIED | `src/features/platform-core/actions/registry.ts:200-267` 统一产出 `executableActionCatalog` / `blockedActionDiagnostics` / `pluginLifecycleRows`；`src/components/surfaces/settings-surface.tsx:426-429,608` 与 `plugin-lifecycle-operator-surface.tsx:344-487` 只在诊断视图渲染 blocked rows。 |
| 3 | host、server action、operator surface 消费同一 external lifecycle / reason / recovery contract。 | ✓ VERIFIED | `src/features/platform-core/actions/registry.ts:280-305` 暴露统一 lifecycle read model；`src/actions/plugin-actions.ts:262-315`、`src/features/runtime-platform/host-actions/plugin-host.ts:47-177`、`src/components/surfaces/plugin-lifecycle-operator-surface.tsx:160-207` 全部读取同一 recovery contract。 |
| 4 | 学校操作员可以区分 `installed`、`enabled`、`active`、`suspended`、`uninstalled` 状态。 | ✓ VERIFIED | `src/lib/dal/plugins.ts:428-436` 已把 `uninstalledAt` / `uninstallRetentionMode` 送入 snapshot；`src/features/platform-core/plugins/governance-projection.ts:70-72,157-160` 将 retain uninstall 投影为 `uninstalled`；`plugin-lifecycle-operator-surface.tsx:39-45,447-450` 呈现“已卸载”审计态；对应测试见 `governance-projection.test.ts:304-349` 与 `plugin-lifecycle-operator-surface.test.tsx:710-730`。 |
| 5 | 插件会按依赖顺序激活，并在缺依赖、循环依赖或激活失败时阻止半启动状态并归因。 | ✓ VERIFIED | `src/features/platform-core/commands/handlers/plugins.ts:137-186,198-236` 在 `enable` / `resume` / `reconcile` 写路径消费 activation chain；`plugins.test.ts:409-479` 覆盖 reconcile 成功与 blocked 错误。 |
| 6 | `disable`、`suspend` 与 `uninstall` 体现不同治理语义，且 retention / cleanup 影响由服务端真实执行。 | ✓ VERIFIED | `src/lib/dal/plugins.ts:1030-1069` 区分 cleanup hard delete 与 retain metadata persistence；`src/features/platform-core/commands/contracts.ts:93-98` 与 `src/actions/plugin-actions.ts` 保留 `confirmationToken`；`src/lib/dal/plugins.test.ts:856-967` 覆盖 cleanup token 与 retain 分支。 |
| 7 | built-in / default plugins 复用同一 lifecycle model，并保留不可卸载限制。 | ✓ VERIFIED | `src/features/platform-core/actions/registry.ts:217-258` 同 bundle 输出 built-in/default rows；`src/lib/dal/plugins.test.ts:839-854` 验证 default plugin uninstall 被阻断；`plugin-lifecycle-operator-surface.tsx:443-446,491-494` 呈现只读阻断说明。 |
| 8 | 恢复路径必须显式且可执行，不发生隐式 auto-recovery。 | ✓ VERIFIED | `src/features/platform-core/commands/contracts.ts:5-18,64-71,120-156` 新增 `plugin.reconcile` command contract；`src/features/platform-core/commands/registry.ts:36-42`、`src/features/platform-core/commands/producers/plugin-governance.ts:57-62,272-273`、`src/actions/plugin-actions.ts:262-315`、`src/features/runtime-platform/host-actions/plugin-host.ts:17-29,59-62,94-107` 全部接线；`plugin-lifecycle-operator-surface.tsx:169-196` 按 `recommendedRecoveryAction` 分发到 `enable` / `resume` / `retry` / `reconcile`。 |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/features/platform-core/actions/registry.ts` | 统一 executable / blocked / lifecycle dashboard bundle | ✓ VERIFIED | `readGovernanceDashboardBundle()` 输出三类 read model，并被 settings/operator surface 消费。 |
| `src/components/surfaces/settings-surface.tsx` | server 端直接读取 governance bundle | ✓ VERIFIED | `readGovernanceDashboardBundle()` 接线存在，未回退到 `listPluginsAction`。 |
| `src/lib/dal/plugins.ts` | retain uninstall metadata 进入 snapshot，并由服务端执行 retain/cleanup | ✓ VERIFIED | snapshot 返回 `uninstalledAt` / `uninstallRetentionMode`；retain 与 cleanup 分支分离。 |
| `src/features/platform-core/plugins/governance-projection.ts` | 五态 lifecycle 可真实产出 `uninstalled` | ✓ VERIFIED | `mapLifecycleState()` 与 blocked projection 都显式处理 retain uninstall。 |
| `src/features/platform-core/commands/contracts.ts` | 完整显式 recovery command surface | ✓ VERIFIED | 包含 `plugin.reconcile`、`plugin.retry`、`plugin.resume` 等 payload schemas。 |
| `src/features/platform-core/commands/handlers/plugins.ts` | reconcile handler + dependency activation replay | ✓ VERIFIED | 显式调用 `installOrReconcilePluginWithTx()` 并重放 `orderedPluginIds`。 |
| `src/features/runtime-platform/host-actions/plugin-host.ts` | host recovery gate 与 reason code 精确匹配 | ✓ VERIFIED | `dependency_missing` / `dependency_cycle` 仅放行 `plugin.reconcile`。 |
| `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` | reason-aware recovery UI + uninstalled audit-only rendering | ✓ VERIFIED | `submitRecoveryAction()` 已分流四类动作，`uninstalled` 无主动作按钮。 |
| `scripts/verify-phase52-action-registry-and-lifecycle.ts` | phase close gate 守住 `uninstalled` 与 `plugin.reconcile` 漂移 | ✓ VERIFIED | 静态检查已覆盖 reconcile wiring、retain uninstall wiring、reason-aware operator dispatch。 |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `settings-surface.tsx` | `actions/registry.ts` | `readGovernanceDashboardBundle()` | ✓ WIRED | `src/components/surfaces/settings-surface.tsx:426-429`。 |
| `settings-surface.tsx` | `plugin-lifecycle-operator-surface.tsx` | `dashboard` props | ✓ WIRED | `src/components/surfaces/settings-surface.tsx:608`。 |
| `pluginRegistrations.uninstalledAt / uninstallRetentionMode` | governance projection | `listPluginGovernanceSnapshotRecords() -> projectPluginGovernance()` | ✓ WIRED | `src/lib/dal/plugins.ts:428-436` → `src/features/platform-core/plugins/governance-projection.ts:70-72,157-160`。 |
| governance row `recommendedRecoveryAction` | operator recovery button | `submitRecoveryAction()` | ✓ WIRED | `src/components/surfaces/plugin-lifecycle-operator-surface.tsx:160-207,459-473`。 |
| operator recovery button | server actions | `setPluginEnabledAction / transitionPluginLifecycleAction / retryPluginAction / reconcilePluginAction` | ✓ WIRED | `plugin-lifecycle-operator-surface.tsx:169-196`。 |
| server / host adapter | command bus | `dispatchPluginGovernanceCommand(type='plugin.reconcile')` | ✓ WIRED | `src/actions/plugin-actions.ts:268-280`；`src/features/runtime-platform/host-actions/plugin-host.ts:94-107`。 |
| dependency graph | enable / resume / reconcile handler | `orderedPluginIds` | ✓ WIRED | `src/features/platform-core/commands/handlers/plugins.ts:137-186,203-236`。 |
| uninstall preflight | uninstall mutation | `cleanupConfirmationToken` | ✓ WIRED | `src/lib/dal/plugins.ts:455-462` → `src/lib/dal/plugins.ts:1030-1033`。 |

### Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
| --- | --- | --- | --- | --- |
| `src/lib/dal/plugins.ts` | `uninstalledAt` / `uninstallRetentionMode` | `pluginRegistrations` query rows | Yes | ✓ FLOWING |
| `src/features/platform-core/plugins/governance-projection.ts` | `lifecycle.state` | snapshot input from DAL | Yes | ✓ FLOWING |
| `src/features/platform-core/actions/registry.ts` | `dashboard.pluginLifecycleRows` | `listPluginsForSchool()` + `listPluginGovernanceSnapshotRecords()` + `projectPluginGovernance()` | Yes | ✓ FLOWING |
| `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` | `recommendedRecoveryAction` | `dashboard.pluginLifecycleRows` props | Yes | ✓ FLOWING |
| `src/features/platform-core/commands/handlers/plugins.ts` | `orderedPluginIds` / `targetState` | dependency graph + current plugin registration | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase 52 close gate | `pnpm run verify:phase52` | Static checks passed; 8 test files / 109 tests passed | ✓ PASS |
| Focused Phase 52 suites | `pnpm exec vitest run src/features/platform-core/actions/static-catalog.test.ts src/features/platform-core/commands/handlers/plugins.test.ts src/actions/plugin-actions.test.ts src/features/platform-core/plugins/governance-projection.test.ts src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx src/components/surfaces/settings-surface.test.tsx src/lib/dal/plugins.test.ts` | 8 test files / 109 tests passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `ACTN-01` | 52-01 | built-in / plugin actions 统一 typed descriptor | ✓ SATISFIED | `src/features/platform-core/actions/contracts.ts` + `static-catalog.ts`。 |
| `ACTN-02` | 52-01 | duplicate action key registration rejected | ✓ SATISFIED | `static-catalog.test.ts` 覆盖 duplicate-key rejection。 |
| `ACTN-03` | 52-02,03,04,05,07,08 | only expose actions when lifecycle conditions are met | ✓ SATISFIED | executable / blocked catalog 分流；UI 与 host/server 统一读取治理模型。 |
| `ACTN-04` | 52-01,03,05 | machine-readable action catalog listing | ✓ SATISFIED | `readExecutableActionCatalog()` 与 `readGovernanceDashboardBundle()`。 |
| `ACTN-05` | 52-01 | registry remains main-repo controlled static implementation catalog | ✓ SATISFIED | `src/server/plugins/registry.ts` 仍是 code-owned allowlist catalog。 |
| `LIFE-01` | 52-02,03,05,06,08 | distinguish installed / enabled / active / suspended / uninstalled | ✓ SATISFIED | retain uninstall metadata 现已进入 snapshot + projection + UI；相关 tests 已覆盖。 |
| `LIFE-02` | 52-02,03,04,07 | dependency order activation and block on missing / cycle | ✓ SATISFIED | enable / resume / reconcile handlers 使用 activation chain 并 fail-fast。 |
| `LIFE-03` | 52-02,03,05,07,08 | attribute activation failure to specific plugin / module | ✓ SATISFIED | `governance-projection.ts` 输出 `failureAttribution`；UI/host/server 消费 same reason code。 |
| `LIFE-04` | 52-02,03,05 | disable / suspend stop capability but retain data by default | ✓ SATISFIED | disable/suspend 与 uninstall/retain 语义分离；UI 文案与服务端逻辑一致。 |
| `LIFE-05` | 52-02,03,04 | uninstall preflight with explicit retention / cleanup impact | ✓ SATISFIED | deterministic `cleanupConfirmationToken` + preflight summary + server enforcement。 |
| `LIFE-06` | 52-02,03,05,06 | built-in / default plugins reuse same lifecycle model | ✓ SATISFIED | same bundle / projection / operator diagnostics model，同时保留 default uninstall block。 |

No orphaned requirement IDs found for Phase 52. All requested IDs
(`ACTN-01..05`, `LIFE-01..06`) are accounted for by plan frontmatter and verified
against implementation.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| — | — | 在本次复核的 phase-52 关键实现文件中，未发现会推翻 goal achievement 的 TODO / placeholder / orphaned wiring blocker。 | INFO | 无新的 blocker anti-pattern。 |

### Human Verification Required

### 1. Operator diagnostics end-to-end recovery flow

**Test:** 在真实环境打开 settings/labs 插件治理页，切到“查看治理诊断”，
对一个 `dependency_missing` 或 `dependency_cycle` 的插件点击“运行 reconcile”。

**Expected:** UI 触发显式 reconcile，随后页面刷新到新的治理状态；不会回落成
generic enable toggle，也不会被 host/server blanket deny。

**Why human:** 需要真实浏览器、server action、数据库状态与刷新交互联调。

### 2. Retain uninstall audit-only presentation

**Test:** 对一个 external plugin 执行 retain uninstall，然后回到治理诊断页观察该
插件行。

**Expected:** 行状态显示“已卸载”，保留卸载摘要与审计说明，不显示“启用插件” /
“重试恢复” / “运行 reconcile”等主动作。

**Why human:** 需要确认真实用户流和视觉呈现，而不仅是组件单测快照语义。

### Gaps Summary

自动化复核未再发现 blocker。上次验证遗留的两个缺口都已被代码证据关闭：

1. retain uninstall metadata 已真正进入 governance snapshot 与 projection，
   `uninstalled` 不再是 schema 占位；
2. `plugin.reconcile` 已成为真实 command / producer / server / host / UI
   recovery path，不再只是 diagnostic 文案里的假动作。

因此，**从代码实现角度看，Phase 52 目标已达成**。当前仅剩人工 UAT
确认真实 UI/交互链路。

---

_Verified: 2026-05-22T00:03:06Z_  
_Verifier: the agent (gsd-verifier)_
