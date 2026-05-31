---
phase: 58-operator-recovery-and-production-surfaces
plan: "05"
subsystem: ui
tags: [settings-labs, classroom-incidents, operator-surface, vitest]

# Dependency graph
requires:
  - phase: 58-03
    provides: classroom/session incident DTO and operator detail drill-down baseline
provides:
  - incident-first Settings Labs fallback entry
  - classroom incident list route with stacked cards
  - focused regression tests for incident-first IA and UI-SPEC copy
affects: [settings-labs, operator-recovery, classroom-incidents]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Settings Labs fallback pages should start from classroom incidents before tool next hops", "incident list surfaces use stacked cards instead of dense admin tables"]

key-files:
  created:
    - src/app/settings/labs/incidents/page.tsx
    - src/components/surfaces/classroom-incident-list-surface.tsx
  modified:
    - src/app/settings/labs/page.tsx
    - src/components/surfaces/settings-surface.tsx
    - src/components/surfaces/settings-surface.test.tsx

key-decisions:
  - "将 /settings/labs 收敛为 incident-first fallback entry，而不是继续保留 tool-first landing。"
  - "incident list 只展示 posture、摘要、impact scope、updatedAt、主 CTA 与最多 2 个 relation chips。"

patterns-established:
  - "Incident-first fallback: 无 classroom deep link 时先看 classroom incidents，再进入 Runtime Inspector / Async Operator / Plugin Governance"
  - "Stacked operator cards: classroom incident surfaces 保持 tonal stacked cards，避免 dense table / border-heavy layout"

requirements-completed: [OPS-01, OPS-02]

# Metrics
duration: 8 min
completed: 2026-05-26
---

# Phase 58 Plan 05: incident-first Settings Labs Summary

**Settings Labs 现已默认落到 classroom incident list，并用 stacked incident cards 承接跨课堂排障入口。**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-26T04:06:58Z
- **Completed:** 2026-05-26T04:14:06Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments
- `/settings/labs` 改为 incident-first fallback entry，首屏先展示 classroom incidents。
- 新增 `/settings/labs/incidents` route 与 `ClassroomIncidentListSurface` stacked card surface。
- 用 focused Vitest 测试锁定 incident-first IA、stacked card anatomy，以及 UI-SPEC empty/error copy。

## Task Commits

Each task was committed atomically:

1. **Task 1: 先用测试锁定 incident-first Settings Labs 入口与 list surface (RED)** - `a6b6a8c` (test)
2. **Task 1: 先用测试锁定 incident-first Settings Labs 入口与 list surface (GREEN)** - `9f6fc1a` (feat)

_Note: This task used TDD-style RED → GREEN commits._

## Files Created/Modified
- `src/app/settings/labs/incidents/page.tsx` - 新的 incident list fallback route。
- `src/components/surfaces/classroom-incident-list-surface.tsx` - classroom-first stacked incident cards surface。
- `src/app/settings/labs/page.tsx` - 去掉 tool-first query-detail landing，直接渲染 incident-first labs surface。
- `src/components/surfaces/settings-surface.tsx` - 将 labs 首页收敛为 incident-first hero + tool next hops。
- `src/components/surfaces/settings-surface.test.tsx` - 锁定 fallback IA、card anatomy、empty/error copy 与 next-hop links。

## Decisions Made
- `/settings/labs` 不再承担 command/detail 聚合首页，而是作为 incident-first fallback entry。
- tool next hops 保留为 `Runtime Inspector`、`Async Operator`、`Plugin Governance` 三张后续入口卡，不再抢占首屏主焦点。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `node -e` 静态检查命令首次多写了一个 `}`，修正后验证通过。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- incident-first fallback entry 已就位，可继续在 Phase 58 后续计划中补 classroom/session operator 与更多 detail surface 串联。
- 当前无 blocker。

## Self-Check: PASSED

- Found created files: `src/app/settings/labs/incidents/page.tsx`, `src/components/surfaces/classroom-incident-list-surface.tsx`
- Found commits: `a6b6a8c`, `9f6fc1a`
- Verification passed: `pnpm exec vitest --run src/components/surfaces/settings-surface.test.tsx`
- Static check passed: `ClassroomIncidentListSurface` does not include data table / dense grid / border-heavy layout patterns
