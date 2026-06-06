---
phase: 71-marketplace-lifecycle-install-governance-semver-upgrade-reta
plan: "04"
subsystem: marketplace-ui
tags: [marketplace, ui, lifecycle, governance, stitch]
requires:
  - phase: 71-marketplace-lifecycle-install-governance-semver-upgrade-reta
    provides: install/recover/upgrade/uninstall lifecycle DTOs
provides:
  - dual-section marketplace surface on /settings/plugins
  - client detail panel for preflight, cleanup, recovery, and active blockers
  - governance-first lifecycle UI coverage for external plugin states
affects: [marketplace-lifecycle, plugin-surface]
tech-stack:
  added: []
  patterns: [SSR projection plus client detail panel, governance summary before CTA, blocker-first destructive UI]
key-files:
  created:
    - src/components/surfaces/plugin-marketplace-detail-panel.tsx
    - src/components/surfaces/plugin-marketplace-detail-panel.test.tsx
  modified:
    - src/features/platform-core/plugins/governance-projection.ts
    - src/features/platform-core/actions/registry.ts
    - src/actions/plugin-actions.ts
    - src/actions/plugin-actions.test.ts
    - src/components/surfaces/plugin-marketplace-surface.tsx
    - src/components/surfaces/plugin-lifecycle-operator-surface.tsx
    - src/components/surfaces/plugin-marketplace-surface.test.tsx
key-decisions:
  - "`/settings/plugins` 保持单页入口，built-in 与 external 同页共存，但 external lifecycle 卡片优先展示治理信息。"
  - "升级、cleanup、recover、active blocker 交互全部收口到 client detail panel，不把交互状态塞回 Server Component。"
patterns-established:
  - "SSR read model -> client detail panel"
  - "preflight-first destructive action UX"
requirements-completed: [MKT-01, MKT-02, MKT-03, MKT-04, MKT-05]
duration: 0h
completed: 2026-06-05
---

# Phase 71: Wave 04 Summary

**`/settings/plugins` 已扩成 built-in + external 双分区的治理优先 marketplace lifecycle 界面。**

## Performance

- **Duration:** 0h
- **Started:** 2026-06-05T00:00:00Z
- **Completed:** 2026-06-05T00:00:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- SSR read model 已同时产出 built-in 与 external rows，并映射 installed / upgrade / retained / active-blocked posture。
- `PluginMarketplaceDetailPanel` 承载 upgrade preflight、cleanup confirmation、recover 与 active blocker 交互。
- surface tests 覆盖 external section、governance summary、inline reject reason、Backfill/Verify/Cutover、cleanup token 与 active classroom blocker。

## Task Commits

Each task was completed in the working tree:

1. **Task 1: external SSR read-model 与 dual-section marketplace** - `uncommitted` (feat)
2. **Task 2: 升级/cleanup/blocker detail panel 交互** - `uncommitted` (feat)

**Plan metadata:** `uncommitted` (docs)

## Files Created/Modified
- `src/features/platform-core/actions/registry.ts` - marketplace surface bundle 和 external posture rows。
- `src/components/surfaces/plugin-marketplace-surface.tsx` - built-in/external 双分区 surface。
- `src/components/surfaces/plugin-marketplace-detail-panel.tsx` - upgrade/cleanup/recover/blocker 细节层。
- `src/components/surfaces/plugin-marketplace-surface.test.tsx` - external lifecycle UI coverage。

## Decisions Made
- governance summary 固定放在主 CTA 之前，避免把安装或 destructive action 置于信息前面。
- active blocker 区先展示受影响 classroom/session，再给 follow-up actions。

## Deviations from Plan

None.

## Issues Encountered
- 无需引入新页面或路由；所有 operator-facing lifecycle 交互都收敛在现有 `/settings/plugins` 单页内。

## User Setup Required

None.

## Next Phase Readiness
- Phase 72 可直接以 `verify:phase71` + marketplace surface tests 为基础构建整链 close gate。

---
*Phase: 71-marketplace-lifecycle-install-governance-semver-upgrade-reta*
*Completed: 2026-06-05*
