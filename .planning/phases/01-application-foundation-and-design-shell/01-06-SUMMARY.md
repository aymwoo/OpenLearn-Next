---
phase: 01-application-foundation-and-design-shell
plan: 06
subsystem: ui
tags: [nextjs, react, tailwind, stitch, home-surface, navigation]

requires:
  - phase: 01-application-foundation-and-design-shell
    provides: Phase 1 static route shells, Stitch-bound surfaces, and shell verifier
provides:
  - Compact Stitch-aligned public home surface with teacher and student CTAs
  - Navigation, sidebar, dashboard, and editor density recalibration
  - Gap-closure verifier checks for home density, touch targets, focus, and CTA routes
affects: [phase-1-uat, public-home, route-shell-navigation, teacher-dashboard, lesson-editor]

tech-stack:
  added: []
  patterns: [source-tree design guard, compact tonal landing shell, 44px navigation targets]

key-files:
  created: []
  modified:
    - src/components/surfaces/home-surface.tsx
    - src/components/shell/glass-nav.tsx
    - src/components/shell/sidebar.tsx
    - src/components/shell/route-shell.tsx
    - src/components/surfaces/teacher-dashboard-surface.tsx
    - src/components/surfaces/lesson-editor-surface.tsx
    - scripts/verify-phase1-shell.ts

key-decisions:
  - "Stitch login wording remains public demo navigation: `教师登录` routes to `/teacher/editor`, and `学生登录` routes to `/student` without auth/session behavior."
  - "Phase 1 gap closure uses source-level guards for visual density and navigation invariants, while browser visual judgment remains a human UAT activity."

patterns-established:
  - "Home density guard requires exact Stitch copy, metrics, compact spacing, rounded inner cards, and asymmetric grid markers."
  - "Shell navigation guard requires horizontal overflow, 44px minimum targets, glass blur, and focus-visible outlines."

requirements-completed: [FOUND-02, FOUND-03, FOUND-04, FOUND-05]

duration: 4 min
completed: 2026-05-04
---

# Phase 01 Plan 06: Human UAT gap closure summary

**Stitch-aligned compact home shell plus guarded navigation, CTA, focus, and touch-density recalibration for Phase 1 UAT gaps.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-04T13:30:45Z
- **Completed:** 2026-05-04T13:35:06Z
- **Tasks:** 2 completed
- **Files modified:** 7

## Accomplishments

- Rebuilt the public home into a denser asymmetrical shell with `开启智慧学习新篇章`, `学生登录`, `教师登录`, `10W+`, `500+`, `98%`, and `推荐课程` aligned to the Stitch reference.
- Recalibrated glass navigation, sidebar, route shell spacing, teacher dashboard cards, and lesson editor panels around compact tonal layers and 44px interactive targets.
- Extended `pnpm verify:phase1` with `Home visual density and navigation alignment verified` checks that guard against regressions in home density, mobile overflow, focus states, and teacher CTA routing.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebuild the public home as a compact Stitch-aligned landing shell** - `c8b7fb4` (feat)
2. **Task 2: Recalibrate navigation, CTA, and dashboard interaction density** - `619dc63` (feat)

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `src/components/surfaces/home-surface.tsx` - Compact Stitch-referential home shell with teacher-first and student CTA routes.
- `src/components/shell/glass-nav.tsx` - Tightened glass top navigation with overflow, focus-visible, and 44px target classes.
- `src/components/shell/sidebar.tsx` - Compact sidebar links with explicit focus-visible and min-height classes.
- `src/components/shell/route-shell.tsx` - Reduced route shell width and spacing for tighter dashboard density.
- `src/components/surfaces/teacher-dashboard-surface.tsx` - Denser teacher dashboard hero, cards, and CTA cluster.
- `src/components/surfaces/lesson-editor-surface.tsx` - Editor inner panels aligned to the revised rounded tonal shell pattern.
- `scripts/verify-phase1-shell.ts` - Gap-closure source checks for home copy, density, navigation, focus, and CTA alignment.

## Decisions Made

- Kept `学生登录` and `教师登录` as static public-route CTAs, not fake authentication, to satisfy T-01-21 and Phase 1 scope.
- Used exact source-string guards for the diagnosed UAT gaps because Phase 1 verification is command-level shell validation, not Playwright visual regression.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved metrics into the guarded home source**
- **Found during:** Task 1 (home verifier run)
- **Issue:** The new verifier correctly failed because `10W+`, `500+`, and `98%` were in `src/lib/demo-data.ts`, while the plan required `home-surface.tsx` to contain those exact strings.
- **Fix:** Defined the home metric constants locally in `home-surface.tsx` so the regression guard verifies the rendered home source directly.
- **Files modified:** `src/components/surfaces/home-surface.tsx`
- **Verification:** `pnpm verify:phase1` and Task 1 acceptance string checks passed.
- **Committed in:** `c8b7fb4`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix tightened the intended source guard and did not expand product scope.

## Issues Encountered

- Existing unrelated untracked scaffold and early summary files remain in the working tree. They predated this plan and were not staged for Plan 06.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - static Phase 1 demo copy is intentional and does not block the UAT gap-closure goal.

## Threat Flags

None - no network endpoint, auth path, file upload, database access, Server Action, or schema boundary was introduced. The updated verifier reads local source files as already covered by the plan threat model.

## Verification

- `pnpm verify:phase1` — passed.
- `pnpm typecheck` — passed.
- `pnpm lint` — passed.
- `pnpm build` — passed with `/`, `/teacher`, `/teacher/editor`, `/student`, `/student/player`, `/classroom`, `/courses`, `/resources`, and `/admin` prerendered as static content.
- Local browser spot-check automation — `/`, `/teacher`, and `/teacher/editor` returned HTTP 200 and contained the expected home, teacher CTA, and editor copy.

## Self-Check: PASSED

- Modified files exist on disk.
- Task commits `c8b7fb4` and `619dc63` exist in git history.
- Verification results match the summary claims.
- Self-check command confirmed `01-06-SUMMARY.md`, `home-surface.tsx`, `c8b7fb4`, and `619dc63` are present.

## Next Phase Readiness

Phase 1 Human UAT gaps are closed at code and command-verification level. The phase is ready for renewed human visual review or Phase 2 auth, roles, schema, and DAL boundary planning.

---
*Phase: 01-application-foundation-and-design-shell*
*Completed: 2026-05-04*
