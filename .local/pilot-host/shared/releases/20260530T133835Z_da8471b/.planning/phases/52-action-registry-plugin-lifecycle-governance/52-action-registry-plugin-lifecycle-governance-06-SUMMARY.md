---
phase: 52-action-registry-plugin-lifecycle-governance
plan: "06"
subsystem: ui
tags: [plugins, governance, lifecycle, uninstall, diagnostics, vitest]
requires:
  - phase: 52-05
    provides: [governance dashboard bundle wiring, operator diagnostics UI baseline]
provides:
  - retained uninstall metadata now flows into governance snapshot rows
  - lifecycle projection maps retained uninstall rows to real uninstalled state
  - operator diagnostics renders uninstalled plugins as audit-only rows without primary actions
affects: [phase52-verification, plugin-governance, operator-diagnostics]
tech-stack:
  added: []
  patterns: [retain uninstall read-model projection, audit-only uninstalled diagnostics rendering]
key-files:
  created:
    - .planning/phases/52-action-registry-plugin-lifecycle-governance/52-action-registry-plugin-lifecycle-governance-06-SUMMARY.md
  modified:
    - src/lib/dal/plugins.ts
    - src/lib/dal/plugins.test.ts
    - src/features/platform-core/plugins/governance-projection.ts
    - src/features/platform-core/plugins/governance-projection.test.ts
    - src/components/surfaces/plugin-lifecycle-operator-surface.tsx
    - src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx
key-decisions:
  - "retain uninstall 继续以 pluginRegistrations 上的 uninstalledAt/uninstallRetentionMode 作为唯一真相源，不引入第二套治理状态表。"
  - "uninstalled 只作为治理/审计态出现，operator diagnostics 隐藏主生命周期动作。"
patterns-established:
  - "Retain uninstall projection pattern: snapshot read path 必须显式携带 uninstall metadata，projection 才能诚实产出 terminal audit state。"
  - "Audit-only diagnostics pattern: uninstalled row 保留 preflight summary 与审计说明，但不暴露 enable/retry/resume 主动作。"
requirements-completed: [LIFE-01, LIFE-06]
duration: 9 min
completed: 2026-05-21
---

# Phase 52 Plan 06: Action registry plugin lifecycle governance Summary

**retain uninstall 元数据已接入治理读模型，`uninstalled` 成为真实外部生命周期状态，并在 operator diagnostics 中以纯审计态呈现。**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-21T23:24:00Z
- **Completed:** 2026-05-21T23:33:06Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- 将 `uninstalledAt` 与 `uninstallRetentionMode` 接入 governance snapshot read path，不再在 DAL projection 输入阶段丢失 retain uninstall 元数据。
- 让 governance projection 在 retain uninstall 条件下真实产出 `uninstalled`，并固定为 `blocked + not_installed + no recovery action`。
- 将 operator diagnostics 的 `uninstalled` 行改为审计态展示：显示 `已卸载` badge、保留卸载摘要，但不再渲染主生命周期动作按钮。

## Task Commits

Each task was committed atomically:

1. **Task 1: 把 retain uninstall metadata 接入 governance snapshot 与 lifecycle projection** - `d24514f` (feat)
2. **Task 2: 让 operator diagnostics 把 `uninstalled` 渲染为审计态而非可执行态** - `4bcf7a0` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/lib/dal/plugins.ts` - 让 governance snapshot rows 带出 retain uninstall 元数据
- `src/lib/dal/plugins.test.ts` - 覆盖 snapshot read path 的 retained uninstall case
- `src/features/platform-core/plugins/governance-projection.ts` - 将 retained uninstall row 映射为 `uninstalled`
- `src/features/platform-core/plugins/governance-projection.test.ts` - 覆盖 `uninstalled` lifecycle 投影回归
- `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` - 为 `uninstalled` 增加 audit-only 说明并隐藏主动作
- `src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` - 覆盖 `已卸载` diagnostics 卡片无主动作行为

## Decisions Made

- retain uninstall metadata 直接复用 `pluginRegistrations` 持久化字段，并沿着 snapshot → projection → UI 单向传递。
- `uninstalled` 不再复用 `installed` / `enabled` 的恢复语义；operator diagnostics 只展示审计说明与现有 preflight 摘要。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 52 的 `uninstalled` 五态 contract 已从 schema 占位变为真实 read-model truth，可继续在 52-08 verifier 中收口回归。
- 后续只需补齐 `plugin.reconcile` 的真实恢复闭环，即可关闭 Phase 52 剩余 verification gap。

## Self-Check: PASSED

- FOUND: `.planning/phases/52-action-registry-plugin-lifecycle-governance/52-action-registry-plugin-lifecycle-governance-06-SUMMARY.md`
- FOUND: `d24514f`
- FOUND: `4bcf7a0`

---
*Phase: 52-action-registry-plugin-lifecycle-governance*
*Completed: 2026-05-21*
