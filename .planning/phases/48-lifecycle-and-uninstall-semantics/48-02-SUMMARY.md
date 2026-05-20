---
phase: 48-lifecycle-and-uninstall-semantics
plan: 02
subsystem: ui
tags: [plugins, lifecycle, uninstall, react, vitest]
requires:
  - phase: 48-01
    provides: lifecycle transition, kill switch, preflight uninstall, uninstall server seams
provides:
  - runnable lifecycle truth for enabled/mounted/ready across DAL and hook runtime
  - shared uninstall blocking semantics for default and nonDeletable plugins
  - Settings Labs operator lifecycle surface with preflight summary and uninstall dialog
  - marketplace-only non-destructive lifecycle posture
affects: [settings labs, plugin marketplace, plugin runtime]
tech-stack:
  added: []
  patterns: [runnable lifecycle state helper, preflight-before-uninstall operator flow, marketplace non-destructive contract]
key-files:
  created:
    - src/components/surfaces/plugin-lifecycle-operator-surface.tsx
    - src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx
    - src/components/surfaces/plugin-marketplace-surface.test.tsx
  modified:
    - src/lib/dal/plugins.ts
    - src/lib/dal/plugins.test.ts
    - src/components/surfaces/settings-surface.tsx
    - src/components/surfaces/settings-surface.test.tsx
    - src/components/surfaces/plugin-marketplace-surface.tsx
key-decisions:
  - "用 ACTIVE_PLUGIN_STATES 统一 enabled/mounted/ready 的 runnable truth，而不是继续散落在 enabled 布尔和字符串判断里。"
  - "卸载阻断前置收敛到共享 helper，让 preflight 与 uninstall 对 default/nonDeletable 给出同一 reason token。"
  - "Settings Labs 承担 destructive/operator lifecycle 管理，marketplace 继续只做 discoverability 与 enable/disable。"
patterns-established:
  - "Operator lifecycle surfaces: preflight summary must render before destructive dialog opens."
  - "Marketplace plugin surfaces: only submit setPluginEnabledAction, never kill switch or uninstall actions."
requirements-completed: [LIFE-01, LIFE-02, LIFE-03, LIFE-04]
duration: 8 min
completed: 2026-05-20
---

# Phase 48 Plan 02: Lifecycle management gap closure Summary

**Settings Labs 生命周期管理面已接入真实 enable/disable、kill switch、preflight uninstall 与确认卸载流程，并把 mounted/ready 统一恢复为 active runnable posture。**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-20T22:45:29Z
- **Completed:** 2026-05-20T22:53:52Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 修复了 DAL 中 `mounted` / `ready` 被误写成 inactive 的 lifecycle truth。
- 让 theme side effect 只在 lifecycle transition 成功后发生，并统一 preflight/uninstall 阻断规则。
- 在 Settings Labs 落地真实 operator lifecycle surface，同时保持 marketplace 非破坏性姿态。

## Task Commits

Each task was committed atomically:

1. **Task 1: 修复 runnable lifecycle truth、theme side-effect ordering 与 uninstall 阻断一致性** - `5648060` (test), `058f7c3` (feat)
2. **Task 2: 把 Settings Labs 接成真实 lifecycle management surface，同时保持 marketplace 非破坏姿态** - `df17e3c` (test), `331ea1c` (feat)

**Plan metadata:** `PENDING` (docs)

## Files Created/Modified

- `src/lib/dal/plugins.ts` - 收敛 runnable state truth、theme 副作用顺序与 uninstall block helper
- `src/lib/dal/plugins.test.ts` - 用行为测试覆盖 mounted/ready runnable、theme 顺序与 uninstall parity
- `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` - Settings Labs 插件生命周期 operator UI
- `src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` - 覆盖 preflight、阻断说明与确认卸载 dialog
- `src/components/surfaces/settings-surface.tsx` - 把 Labs 插件管理区切到 operator lifecycle surface
- `src/components/surfaces/settings-surface.test.tsx` - 验证 Labs wiring 与 marketplace non-destructive contract
- `src/components/surfaces/plugin-marketplace-surface.tsx` - 保持仅启用/停用，并补 lifecycle management 回链
- `src/components/surfaces/plugin-marketplace-surface.test.tsx` - 锁定 marketplace 只触发 enable/disable action

## Decisions Made

- 使用共享 `ACTIVE_PLUGIN_STATES` / `isRunnablePluginState()` 作为 lifecycle 运行真相，避免 `enabled` 布尔与 `lifecycleState` 继续漂移。
- 卸载阻断通过共享 helper 在 preflight 和 uninstall 共用，避免 UI 先放行、正式删除再失败。
- Settings Labs 作为 operator-facing destructive surface，marketplace 只保留 discoverability 与轻管理入口。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `settings-surface` 是 async server component，原先 UI 测试直接 render 整体 surface 会触发 async client warning；已把验证收敛为 operator surface 行为测试 + settings wiring 断言，避免无意义的测试环境噪音。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 48 的 operator lifecycle gap 已补齐，后续 48-03 可专注 close gate 与验证脚本收口。
- 当前实现未触碰 `package.json` 与 `scripts/verify-phase48-lifecycle-and-uninstall.ts`，符合本计划边界。

## Self-Check: PASSED

- Verified key files exist on disk.
- Verified task commits `5648060`, `058f7c3`, `df17e3c`, `331ea1c` exist in git history.
