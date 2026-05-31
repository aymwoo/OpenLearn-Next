---
phase: 52-action-registry-plugin-lifecycle-governance
plan: "08"
subsystem: platform-lifecycle
tags: [plugins, governance, operator-surface, reconcile, retry, resume, verifier]
requires:
  - phase: 52-06
    provides: [real uninstalled lifecycle projection, audit-only uninstalled operator posture]
  - phase: 52-07
    provides: [executable plugin.reconcile command family, host and server reconcile adapters]
provides:
  - reason-aware diagnostics recovery buttons that dispatch enable, retry, resume, and reconcile explicitly
  - focused UI regression coverage for reconcile, retry, resume, and uninstalled audit-only behavior
  - hardened verify:phase52 static checks for plugin.reconcile, uninstalled projection, and operator recovery drift
affects: [phase52-closeout, plugin-governance-operator-ui, verify-phase52, runtime-host-governance]
tech-stack:
  added: []
  patterns: [reason-aware operator recovery dispatch, explicit retry server action adapter, phase close gate drift guards]
key-files:
  created:
    - .planning/phases/52-action-registry-plugin-lifecycle-governance/52-action-registry-plugin-lifecycle-governance-08-SUMMARY.md
  modified:
    - src/components/surfaces/plugin-lifecycle-operator-surface.tsx
    - src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx
    - src/actions/plugin-actions.ts
    - src/actions/plugin-actions.test.ts
    - scripts/verify-phase52-action-registry-and-lifecycle.ts
key-decisions:
  - "operator diagnostics 主按钮优先按 recommendedRecoveryAction 分发，只有无 recommendation 时才保留原 toggle 行为。"
  - "kill-switch 恢复必须走显式 resume transition，而不是再用 enable 冒充恢复。"
  - "verify:phase52 同时静态守护 plugin.reconcile wiring、retained uninstall projection 与 reason-aware operator surface。"
patterns-established:
  - "Recovery dispatch pattern: diagnostics CTA must map to explicit server actions by governance recommendation."
  - "Verifier drift guard pattern: phase close scripts must check both command wiring and UI dispatch seams, not only focused tests."
requirements-completed: [ACTN-03, LIFE-01, LIFE-03]
duration: 7 min
completed: 2026-05-22
---

# Phase 52 Plan 08: Action Registry Plugin Lifecycle Governance Summary

**operator diagnostics 现在会按 recommendation 显式触发 enable、retry、resume、reconcile，并由强化后的 `verify:phase52` 持续守住 `uninstalled` 与 `plugin.reconcile` 真相。**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-21T23:45:58Z
- **Completed:** 2026-05-21T23:53:55Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- 把 operator diagnostics 主按钮从 generic enable fallback 改成 reason-aware recovery dispatch。
- 为 dependency-blocked、activation-failed、kill-switch、uninstalled 四类治理行补齐 focused UI regression tests。
- 强化 `verify:phase52`，让 `plugin.reconcile` wiring、retained uninstall projection 与 operator drift 都会被 close gate 拦截。

## Task Commits

Each task was committed atomically:

1. **Task 1: 把 operator diagnostics 按 `recommendedRecoveryAction` 接到真实恢复命令** - `bb42c8d` (test), `1bf1734` (feat)
2. **Task 2: 强化 `verify:phase52`，阻止 `uninstalled` 与 `reconcile` 再次漂移** - `0874164` (feat)

**Plan metadata:** Pending final docs commit at summary creation time.

## Files Created/Modified

- `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` - 新增 reason-aware recovery dispatcher，并把 diagnostics CTA 接到 explicit server actions
- `src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` - 覆盖 reconcile、retry、resume 与 uninstalled audit-only 四类行为
- `src/actions/plugin-actions.ts` - 补充 `retryPluginAction` server action，供 operator diagnostics 显式触发 retry
- `src/actions/plugin-actions.test.ts` - 覆盖 retry server action dispatch 与 cache invalidation
- `scripts/verify-phase52-action-registry-and-lifecycle.ts` - 新增 reconcile wiring、uninstalled truth 与 operator drift 静态守卫，并扩充 focused suites

## Decisions Made

- diagnostics recovery 只在 `recommendedRecoveryAction` 存在时走显式 recovery dispatcher，避免继续压扁治理语义。
- dependency-blocked 行保留 projection 的 `dependency_missing` / `dependency_cycle` 真相作为 reconcile reason，不在 UI 层再做二次抽象。
- `verify:phase52` 必须同时依赖静态守卫与 focused suites，避免“测试都过了但 close gate 没守住” 的假阳性。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 补齐缺失的 `retryPluginAction` server action**
- **Found during:** Task 1（operator diagnostics 恢复接线）
- **Issue:** Plan 要求 diagnostics 的 `retry` 走显式 server action，但 `src/actions/plugin-actions.ts` 当时只有 `reconcilePluginAction`，没有对应 `retryPluginAction` 导出，导致 UI 无法按 recommendation 接线。
- **Fix:** 在 `src/actions/plugin-actions.ts` 新增 `RetryPluginSchema` 与 `retryPluginAction()`，沿用统一 governance producer 与 `updateTag()` invalidation；同时补 `src/actions/plugin-actions.test.ts` 回归测试。
- **Files modified:** `src/actions/plugin-actions.ts`, `src/actions/plugin-actions.test.ts`
- **Verification:** `pnpm exec vitest run src/actions/plugin-actions.test.ts src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx`
- **Committed in:** `1bf1734` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 这是完成 Task 1 所必需的最小补线，没有扩大治理面范围。

## Issues Encountered

- `plugin-lifecycle-operator-surface.test.tsx` 初次 RED 阶段暴露出 row-level reason code 与 diagnostic reason code 使用不同枚举，需要把测试 fixture 分开建模后才能稳定表达预期恢复动作。

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 52 的 operator diagnostics、command surface 与 close gate 已全部对齐，可作为 Phase 52 完结依据。
- 后续 phase 可以默认信任 `verify:phase52` 对 `reconcile` / `uninstalled` / operator recovery drift 的回归防线。

## Self-Check: PASSED

- Summary file exists at `.planning/phases/52-action-registry-plugin-lifecycle-governance/52-action-registry-plugin-lifecycle-governance-08-SUMMARY.md`.
- Task commits `bb42c8d`, `1bf1734`, and `0874164` exist in git history.

---
*Phase: 52-action-registry-plugin-lifecycle-governance*
*Completed: 2026-05-22*
