---
phase: 52-action-registry-plugin-lifecycle-governance
plan: "05"
subsystem: ui
tags: [phase52, governance, plugin-lifecycle, settings, verifier, react, nextjs]
requires:
  - phase: 52-04
    provides: lifecycle governance semantics, recovery and cleanup verification baseline
provides:
  - governance dashboard bundle for settings/operator surfaces
  - operator UI wired to server governance read model
  - phase52 verifier guards against raw plugin DTO UI drift
affects: [plugin-governance, settings-surface, lifecycle-operator, verification]
tech-stack:
  added: []
  patterns: [server governance bundle to client surface, UI reads registry truth only, verifier guards for read-model wiring]
key-files:
  created:
    - .planning/phases/52-action-registry-plugin-lifecycle-governance/52-action-registry-plugin-lifecycle-governance-05-SUMMARY.md
  modified:
    - src/features/platform-core/actions/registry.ts
    - src/components/surfaces/settings-surface.tsx
    - src/components/surfaces/settings-surface.test.tsx
    - src/components/surfaces/plugin-lifecycle-operator-surface.tsx
    - src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx
    - scripts/verify-phase52-action-registry-and-lifecycle.ts
key-decisions:
  - "SettingsSurface 改为在 server 端读取 GovernanceDashboardBundle，再传给 operator surface，移除 raw plugin DTO wiring。"
  - "PluginLifecycleOperatorSurface 只消费 read model，不再本地推断 lifecycle、reason code 或 executable catalog。"
  - "verify:phase52 增加 UI wiring 静态守卫，防止后续回退到 listPluginsAction / PluginRegistrationDTO 模式。"
patterns-established:
  - "Governance UI pattern: server component 聚合 bundle，client surface 只渲染 DTO 化后的治理真相。"
  - "Verifier pattern: 行为测试覆盖交互，静态守卫覆盖禁止出现的旧 wiring。"
requirements-completed: [ACTN-03, ACTN-04, LIFE-01, LIFE-03, LIFE-04, LIFE-06]
duration: 12min
completed: 2026-05-21
---

# Phase 52 Plan 05: Action registry plugin lifecycle governance Summary

**Settings/operator UI 现已直接消费 governance dashboard bundle，并由 phase52 verifier 持续阻止回退到 raw plugin DTO 本地推断。**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-21T22:43:47Z
- **Completed:** 2026-05-21T22:55:55Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- 在 `registry.ts` 增加 `GovernanceDashboardBundle` 与 `pluginLifecycleRows` 聚合读模型，供 settings/operator UI 一次读取。
- `SettingsSurface` 改为 server-side 读取 governance bundle，并把 `dashboard` 传入 `PluginLifecycleOperatorSurface`。
- `PluginLifecycleOperatorSurface` 删除本地 lifecycle/reason 推断逻辑，只显示 read model 提供的 executable catalog、diagnostics 与 cleanup preflight 信息。
- `verify:phase52` 新增 UI wiring 静态守卫，并把 settings surface test 纳入 focused 回归。

## Task Commits

Each task was committed atomically:

1. **Task 1: 让 settings/operator surface 直接吃 governance read model** - `74612d2` (test), `b7d3cc5` (feat)
2. **Task 2: 更新 Phase 52 verifier，阻止 UI 回退到 raw plugin 推断** - `62e8377` (test)

**Plan metadata:** pending

_Note: Task 1 followed TDD with RED → GREEN commits._

## Files Created/Modified

- `src/features/platform-core/actions/registry.ts` - 提供 `GovernanceDashboardBundle`、`GovernanceDashboardPluginLifecycleRow` 与聚合读取入口。
- `src/components/surfaces/settings-surface.tsx` - 移除 `listPluginsAction` wiring，改为 server 读取治理 bundle。
- `src/components/surfaces/settings-surface.test.tsx` - 验证 settings surface 传递 `dashboard` 而非 raw plugin list。
- `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` - 改为只消费统一治理读模型，保留 diagnostics 次级入口与 cleanup 显式确认。
- `src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` - 覆盖 executable catalog、diagnostics 视图与 cleanup confirmation 行为。
- `scripts/verify-phase52-action-registry-and-lifecycle.ts` - 加入 UI drift 静态守卫与额外 focused suite。

## Decisions Made

- 使用单次 `GovernanceDashboardBundle` 作为 settings/operator UI 的统一输入，避免组件再拼装第二份治理真相。
- diagnostics 继续只放在显式入口，普通首屏仅展示 executable catalog，保持治理内部状态不外泄。
- cleanup 仍保持 opt-in + confirmation token 模式，确保破坏性卸载不会因为 UI 改造被弱化。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 修复 dialog 测试中重复文案导致的不稳定断言**
- **Found during:** Task 1 (治理 UI GREEN 验收)
- **Issue:** `plugin-lifecycle-operator-surface.test.tsx` 使用 “外部插件” 文案等待 dialog ready，因页面与 dialog 同时存在该文本而出现多匹配失败。
- **Fix:** 改为等待 cleanup checkbox 与确认按钮状态，断言收敛到真正的 dialog 交互信号。
- **Files modified:** `src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx`
- **Verification:** `pnpm exec vitest run src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx src/components/surfaces/settings-surface.test.tsx`
- **Committed in:** `b7d3cc5`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** 仅修复测试夹具稳定性，无额外 scope creep。

## Issues Encountered

- 初次 GREEN 验收时，dialog 测试因文本重复而失败；收窄断言目标后通过。

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 52 的治理 UI 已和 server read model 对齐，可继续在后续计划中扩展更多 operator action 而无需再补 UI 真相源。
- `verify:phase52` 已覆盖写路径与 UI 读路径回归，后续改动可以直接复用这条 close gate。

## Self-Check: PASSED

- FOUND: `.planning/phases/52-action-registry-plugin-lifecycle-governance/52-action-registry-plugin-lifecycle-governance-05-SUMMARY.md`
- FOUND: `74612d2`
- FOUND: `b7d3cc5`
- FOUND: `62e8377`

---
*Phase: 52-action-registry-plugin-lifecycle-governance*
*Completed: 2026-05-21*
