---
phase: 12-classroom-launch-and-built-in-teaching-steps
plan: 08
subsystem: ui
tags: [nextjs, react, plugins, settings, marketplace]
requires:
  - phase: 12-03
    provides: seeded built-in teaching-step plugin records and metadata labels
provides:
  - dedicated /settings/plugins marketplace route for built-in teaching-step discovery
  - system-built-in marketplace cards with enable or disable semantics and no delete actions
  - settings navigation entry and regression coverage for marketplace discoverability
affects: [settings, plugin-management, phase-12-verification]
tech-stack:
  added: []
  patterns: [dedicated visibility route for built-in plugins, settings-to-marketplace discoverability]
key-files:
  created:
    - src/app/settings/plugins/page.tsx
    - src/components/surfaces/plugin-marketplace-surface.tsx
  modified:
    - src/components/surfaces/settings-surface.tsx
    - src/components/surfaces/settings-surface.test.tsx
key-decisions:
  - "将 built-in plugin 可见性放到独立 /settings/plugins route，而不是把 labs surface 视作 marketplace 等价替代。"
  - "marketplace 卡片只保留启用/停用语义，不提供删除动作，确保系统内置插件不会被误解为可移除扩展。"
patterns-established:
  - "Pattern: built-in plugin visibility uses a dedicated marketplace-style surface, while labs remains the operational management surface."
  - "Pattern: settings discoverability changes must land with route assertions in lightweight regression tests."
requirements-completed: [PLUGIN-05]
duration: 2 min
completed: 2026-05-08
---

# Phase 12 Plan 08: Built-in plugin marketplace visibility Summary

**新增 /settings/plugins 专用插件市场页，集中展示系统内置教学环节并保留默认开启与启停语义。**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-08T23:15:55Z
- **Completed:** 2026-05-08T23:18:42Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- 新增 `/settings/plugins` 专用 route，承载 built-in teaching-step plugin marketplace 可见性。
- 新增 `PluginMarketplaceSurface`，明确展示 `系统内置`、`默认开启`，并只提供启用/停用切换。
- 从 settings 主界面补上 marketplace 入口，并用回归测试锁定 discoverability 与 labs 共存关系。

## Task Commits

Each task was committed atomically:

1. **Task 1: Create a dedicated built-in plugin marketplace route and surface** - `d1f6235` (feat)
2. **Task 2: Link settings into the new marketplace route and cover the new entry** - `e4d4633` (feat)

## Files Created/Modified

- `src/app/settings/plugins/page.tsx` - 新增 settings 插件市场路由，挂载 `PluginMarketplaceSurface`。
- `src/components/surfaces/plugin-marketplace-surface.tsx` - 新增 built-in plugin marketplace 主界面与启停切换卡片。
- `src/components/surfaces/settings-surface.tsx` - 新增 `/settings/plugins` 导航入口，同时保留 `/settings/labs` 管理入口。
- `src/components/surfaces/settings-surface.test.tsx` - 增加 settings 到 marketplace 的回归断言。

## Decisions Made

- 将 built-in plugin marketplace 实现为独立 settings route，满足 roadmap 对“marketplace visibility”的显式合同，而不是继续复用 labs-only surface。
- marketplace 只负责发现与可见性，labs 继续承载 operational management，避免两个 surface 职责混淆。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 12-08 的 marketplace visibility 缺口已补齐，built-in teaching-step plugins 现在可从专用 settings route 被发现。
- 下一步可继续执行 12-09，把 Phase 12 的静态字符串校验替换为行为级回归覆盖。

## Self-Check: PASSED
