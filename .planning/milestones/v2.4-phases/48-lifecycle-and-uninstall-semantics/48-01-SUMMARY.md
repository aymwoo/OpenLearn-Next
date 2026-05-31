---
phase: 48-lifecycle-and-uninstall-semantics
plan: 01
subsystem: plugin
tags: [plugin, lifecycle, uninstall, drizzle, sqlite, vitest]
requires:
  - phase: 44-plugin-identity-and-namespace-contract
    provides: plugin identity fields and registration contract
  - phase: 45-extension-and-plugin-owned-schema-patterns
    provides: plugin extension tables and cascade foreign keys
  - phase: 47-dal-authz-cache-audit-integration
    provides: plugin DAL authz and audit integration baseline
provides:
  - transactional plugin lifecycle transition API with matrix guard
  - uninstall preflight summary for extension and owned data tables
  - protected uninstall flow for external plugins only
  - verify:phase48 close gate script
affects: [plugin registry, plugin operations, governance audit, lifecycle management]
tech-stack:
  added: []
  patterns: [transactional lifecycle audit write, uninstall preflight before cascade delete]
key-files:
  created:
    - .planning/phases/48-lifecycle-and-uninstall-semantics/deferred-items.md
    - .planning/phases/48-lifecycle-and-uninstall-semantics/48-01-SUMMARY.md
    - scripts/verify-phase48-lifecycle-and-uninstall.ts
  modified:
    - package.json
    - src/actions/plugin-actions.test.ts
    - src/actions/plugin-actions.ts
    - src/lib/dal/plugins.test.ts
    - src/lib/dal/plugins.ts
key-decisions:
  - "生命周期流转统一收口到 transitionPluginLifecycle，避免启停路径各自维护状态规则。"
  - "卸载预检对 default sourceType 返回 blocked 结果，正式卸载则抛出 UNINSTALL_BLOCKED_DEFAULT_PLUGIN。"
  - "卸载时只删除 pluginRegistrations 主记录，扩展数据依赖 SQLite cascade 清理。"
patterns-established:
  - "Pattern: lifecycle mutation must update registration, transition ledger, action audit, and governance audit in one db.transaction."
  - "Pattern: uninstall flows must expose preflight summary before destructive delete."
requirements-completed: []
duration: 12min
completed: 2026-05-20
---

# Phase 48 Plan 01: Lifecycle & Uninstall Semantics Summary

**插件生命周期状态机、事务审计流转、卸载预检盘点与默认插件卸载阻断已落地。**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-20T14:51:00Z
- **Completed:** 2026-05-20T15:03:17Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- 在 `src/lib/dal/plugins.ts` 新增 `assertPluginLifecycleTransition` 与 `transitionPluginLifecycle`，为生命周期修改建立统一状态机与事务审计路径。
- 新增 `preflightUninstallPlugin` / `uninstallPlugin` 与对应 server actions，能在卸载前返回扩展数据盘点，并强拦截默认插件卸载。
- 新增 `verify:phase48` close gate，串联 Phase 48 本地测试与 44-47 回归验证。

## Task Commits

Each task was committed atomically:

1. **Task 1: 生命周期流转与卸载 API** - `a1a2a7b` (feat)
2. **Task 2: Phase 48 close gate 验证脚本** - `2a46e11` (chore)

## Files Created/Modified

- `src/lib/dal/plugins.ts` - 生命周期状态机、事务审计流转、卸载预检与卸载实现。
- `src/lib/dal/plugins.test.ts` - 覆盖非法流转、默认插件拦截、预检统计与事务卸载行为。
- `src/actions/plugin-actions.ts` - 暴露 lifecycle transition、preflight uninstall、uninstall server actions。
- `src/actions/plugin-actions.test.ts` - 覆盖新增 server actions 的调用与 cache invalidation。
- `scripts/verify-phase48-lifecycle-and-uninstall.ts` - Phase 48 close gate 静态审计与回归脚本。
- `package.json` - 注册 `verify:phase48` 脚本入口。

## Decisions Made

- 复用现有 `deletePluginAction` 对外语义，但内部改接 `uninstallPlugin`，避免额外扩散 UI 改动。
- `createPluginAudit` / `createGovernanceAudit` 因 blast radius 高，未改写原 helper 语义，而是在生命周期事务内直接写入等价记录以降低回归风险。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 修正 reconcile 路径的非法状态持久化窗口**
- **Found during:** Task 1
- **Issue:** 如果先 update 再校验状态矩阵，非法生命周期会先写库再抛错。
- **Fix:** 提前计算 `nextLifecycleState` 并在 update 前执行 `assertPluginLifecycleTransition`。
- **Files modified:** `src/lib/dal/plugins.ts`
- **Verification:** `pnpm exec vitest --run src/lib/dal/plugins.test.ts src/actions/plugin-actions.test.ts`
- **Committed in:** `a1a2a7b`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** 修复确保生命周期状态机真正具备事务前校验语义，无额外 scope creep。

## Issues Encountered

- `pnpm exec tsc --noEmit` 仍被 Phase 46/47 既有 `plugin-data` / `plugin-migration` TypeScript 错误阻塞，已记录到 `deferred-items.md`，本次未越界修复。

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 生命周期与卸载语义已具备 DAL / action / verifier 三层闭环，可继续接入 UI 确认流或 operator surface。
- 共享追踪文件 `STATE.md`、`ROADMAP.md`、`REQUIREMENTS.md` 未在本次执行中改写，等待主编排器统一处理。

## Verification

- `pnpm exec vitest --run src/lib/dal/plugins.test.ts src/actions/plugin-actions.test.ts` ✅ 通过
- `pnpm run verify:phase48` ✅ 通过（含 44-47 级联回归）
- `pnpm exec tsc --noEmit` ⚠️ 失败，原因是既有 `plugin-data.ts` / `plugin-migration.ts` 预存类型错误，未纳入本计划修复范围

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: lifecycle_mutation | `src/lib/dal/plugins.ts` | 新增插件生命周期写路径，可修改注册状态并写入审计表。 |
| threat_flag: destructive_uninstall | `src/lib/dal/plugins.ts` | 新增插件卸载入口，会删除 `pluginRegistrations` 并触发 cascade 清理。 |

## Self-Check: PASSED

- FOUND: `scripts/verify-phase48-lifecycle-and-uninstall.ts`
- FOUND: `2a46e11`
- FOUND: `a1a2a7b`

---
*Phase: 48-lifecycle-and-uninstall-semantics*
*Completed: 2026-05-20*
