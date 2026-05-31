---
phase: 52-action-registry-plugin-lifecycle-governance
plan: "07"
subsystem: platform-lifecycle
tags: [plugins, governance, reconcile, command-bus, host-actions, server-actions, vitest]
requires:
  - phase: 52-05
    provides: [governance ui wiring, verify-phase52 hardening]
  - phase: 52-06
    provides: [real uninstalled lifecycle projection, retained uninstall governance truth]
provides:
  - executable plugin.reconcile command family across contracts, registry, handlers, and producers
  - explicit reconcile server action and host recovery adapter wiring
  - dependency-blocked recovery coverage for command handler, server action, and host gate
affects: [phase52-closeout, plugin-operator-surface, runtime-host-governance, verify-phase52]
tech-stack:
  added: []
  patterns: [explicit reconcile recovery command, dependency-aware activation replay, host-server governance adapter parity]
key-files:
  created:
    - .planning/phases/52-action-registry-plugin-lifecycle-governance/52-action-registry-plugin-lifecycle-governance-07-SUMMARY.md
  modified:
    - src/features/platform-core/commands/contracts.ts
    - src/features/platform-core/commands/registry.ts
    - src/features/platform-core/commands/handlers/plugins.ts
    - src/features/platform-core/commands/handlers/plugins.test.ts
    - src/features/platform-core/commands/producers/plugin-governance.ts
    - src/actions/plugin-actions.ts
    - src/actions/plugin-actions.test.ts
    - src/features/runtime-platform/host-actions/plugin-host.ts
    - src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts
key-decisions:
  - "dependency_missing / dependency_cycle 的唯一 host 恢复写动作固定为 plugin.reconcile。"
  - "plugin.reconcile 先复用 installOrReconcilePluginWithTx 重算当前注册真相，再按依赖拓扑推进生命周期。"
  - "reconcile 失败必须显式抛出 PLUGIN_RECONCILE_BLOCKED:*，不能把阻断状态伪装成成功。"
patterns-established:
  - "Explicit recovery pattern: recommendedRecoveryAction 必须对应真实 command / host / server adapter。"
  - "Reconcile replay pattern: 先 reconcile registration，再重放 dependency activation chain 到目标状态。"
requirements-completed: [ACTN-03, LIFE-02, LIFE-03]
duration: 4 min
completed: 2026-05-22
---

# Phase 52 Plan 07: Action Registry Plugin Lifecycle Governance Summary

**`plugin.reconcile` 现在是可执行治理命令，并已贯通 command bus、server action、host recovery gate 与 focused regression tests。**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-22T07:38:09+08:00
- **Completed:** 2026-05-22T07:42:34+08:00
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- 为 command contract、registry、handler 增加 `plugin.reconcile`，让 dependency recovery 有真实执行面。
- 在 reconcile handler 中复用 `installOrReconcilePluginWithTx()` 与 dependency activation chain，显式重算并推进依赖链状态。
- 为 server action 与 host adapter 暴露 reconcile 入口，并将 dependency-blocked host recovery 精确限制为 `plugin.reconcile`。

## Task Commits

Each task was committed atomically:

1. **Task 1: 新增 `plugin.reconcile` command contract、registry 与 handler** - `3963261` (test), `4d8af18` (feat)
2. **Task 2: 暴露 reconcile 到 producer、server action 与 host recovery gate** - `648fc1e` (test), `8181e0e` (feat)

**Plan metadata:** Pending final docs commit at summary creation time.

## Files Created/Modified

- `src/features/platform-core/commands/contracts.ts` - 新增 `plugin.reconcile` command type、payload schema 与 discriminated union 分支
- `src/features/platform-core/commands/registry.ts` - 把 reconcile 注册进 authoritative command registry
- `src/features/platform-core/commands/handlers/plugins.ts` - 实现 reconcile handler，重算注册记录并重放 dependency activation chain
- `src/features/platform-core/commands/handlers/plugins.test.ts` - 覆盖 reconcile 成功路径与依赖阻断路径
- `src/features/platform-core/commands/producers/plugin-governance.ts` - 暴露 reconcile producer input 与 helper export
- `src/actions/plugin-actions.ts` - 新增 `reconcilePluginAction` server action，并保持入口层 `updateTag()` 约束
- `src/actions/plugin-actions.test.ts` - 覆盖 reconcile server action dispatch 与 cache invalidation
- `src/features/runtime-platform/host-actions/plugin-host.ts` - 新增 host reconcile action，并将 dependency-blocked recovery gate 精确映射到 reconcile
- `src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts` - 覆盖 host reconcile dispatch 与 dependency-blocked allow/deny 语义

## Decisions Made

- `plugin.reconcile` 复用现有 command bus / audit / invalidation 边界，不新增旁路 mutation seam。
- reconcile 默认 `targetState` 为 `enabled`，但允许显式推进到 `mounted` / `ready`。
- 当依赖仍缺失或存在循环依赖时，reconcile 保持 fail-fast，并输出 `PLUGIN_RECONCILE_BLOCKED:*` 明确错误。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- operator diagnostics 现在推荐真实可执行的 `plugin.reconcile`，Phase 52 剩余收尾工作可直接消费这条恢复路径。
- host / server / command bus 三条治理入口的 reconcile contract 已对齐，可继续推进 52-08 的 operator diagnostics 闭环与 verifier 收口。

## Self-Check: PASSED

- Summary file exists at `.planning/phases/52-action-registry-plugin-lifecycle-governance/52-action-registry-plugin-lifecycle-governance-07-SUMMARY.md`.
- Task commits `3963261`, `4d8af18`, `648fc1e`, `8181e0e` exist in git history.

---
*Phase: 52-action-registry-plugin-lifecycle-governance*
*Completed: 2026-05-22*
