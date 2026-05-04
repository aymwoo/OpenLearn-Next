---
phase: 01-application-foundation-and-design-shell
plan: 04
subsystem: ui
tags: [nextjs, react, tailwind, student-player, classroom-console, library, admin-shell]

requires:
  - phase: 01-application-foundation-and-design-shell
    provides: shared route shell primitives, UI components, navigation items, and static demo data
provides:
  - Student dashboard route at `/student`
  - Student player route at `/student/player`
  - Classroom console route at `/classroom`
  - Course center route at `/courses`
  - Resource center route at `/resources`
  - Low-emphasis admin shell route at `/admin`
affects: [phase-1-shells, student-navigation, classroom-preview, library-preview, admin-preview]

tech-stack:
  added: []
  patterns: [App Router route groups, static presentational surfaces, tonal card libraries]

key-files:
  created:
    - src/app/(student)/student/layout.tsx
    - src/app/(student)/student/page.tsx
    - src/app/(student)/student/player/page.tsx
    - src/app/(classroom)/classroom/layout.tsx
    - src/app/(classroom)/classroom/page.tsx
    - src/app/(library)/courses/page.tsx
    - src/app/(library)/resources/page.tsx
    - src/app/(admin)/admin/layout.tsx
    - src/app/(admin)/admin/page.tsx
    - src/components/surfaces/student-dashboard-surface.tsx
    - src/components/surfaces/player-surface.tsx
    - src/components/surfaces/classroom-console-surface.tsx
    - src/components/surfaces/library-surface.tsx
    - src/components/surfaces/admin-surface.tsx
  modified: []

key-decisions:
  - "Plan 04 route shells remain public, static, and role-neutral to satisfy Phase 1 demo navigation without fake auth."
  - "Classroom, library, and admin surfaces use deterministic local demo data only; no live APIs, uploads, school management, or user management flows were introduced."

patterns-established:
  - "Student and classroom route groups wrap route pages with `RouteShell` and role-specific navigation arrays."
  - "Course and resource pages share `LibrarySurface` with a mode prop while keeping action copy specific."

requirements-completed: [FOUND-02, FOUND-03, FOUND-04, FOUND-05]

duration: 5 min
completed: 2026-05-04
---

# Phase 01 Plan 04: Remaining product route shells Summary

**Student learning, classroom control, course/resource library, and low-emphasis admin route shells using static tonal UI surfaces.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-04T12:41:41Z
- **Completed:** 2026-05-04T12:46:53Z
- **Tasks:** 2 completed
- **Files modified:** 14

## Accomplishments

- Built `/student` and `/student/player` with a friendly student cockpit, progress cards, step navigation, readable learning content, and `沉浸学习` reduced-chrome section.
- Built `/classroom` with current step, static lock/unlock affordances, deterministic participant status, recovery copy, and mobile desktop-control guidance.
- Built `/courses`, `/resources`, and `/admin` with card-based tonal libraries and a safe low-emphasis admin empty state.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement student dashboard and player shells** - `c8ce030` (feat)
2. **Task 2: Implement classroom, library, and admin shells** - `8671e93` (feat)

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `src/app/(student)/student/layout.tsx` - Student route layout using `RouteShell` and student navigation.
- `src/app/(student)/student/page.tsx` - Student dashboard route rendering `StudentDashboardSurface`.
- `src/app/(student)/student/player/page.tsx` - Student player route rendering `PlayerSurface`.
- `src/components/surfaces/student-dashboard-surface.tsx` - Student cockpit with resume CTA to `/student/player` and positive progress state.
- `src/components/surfaces/player-surface.tsx` - Mobile-readable player with step rail, learning content, status region, and immersive section.
- `src/app/(classroom)/classroom/layout.tsx` - Classroom route layout using `RouteShell` and classroom navigation.
- `src/app/(classroom)/classroom/page.tsx` - Classroom route rendering `ClassroomConsoleSurface`.
- `src/components/surfaces/classroom-console-surface.tsx` - Static classroom control console using `classroomParticipants` demo data.
- `src/app/(library)/courses/page.tsx` - Course center route rendering `LibrarySurface mode="courses"`.
- `src/app/(library)/resources/page.tsx` - Resource center route rendering `LibrarySurface mode="resources"`.
- `src/components/surfaces/library-surface.tsx` - Shared card-based course/resource library surface.
- `src/app/(admin)/admin/layout.tsx` - Admin route layout using `RouteShell` and low-emphasis admin navigation.
- `src/app/(admin)/admin/page.tsx` - Admin route rendering `AdminSurface`.
- `src/components/surfaces/admin-surface.tsx` - Minimal admin shell proof with safe empty state and no management forms.

## Decisions Made

- Kept all new route shells static and publicly reachable, matching D-05 and avoiding fake authentication or user/session claims.
- Used a shared `LibrarySurface` for courses and resources to establish one card-library pattern while preserving distinct route copy and actions.
- Kept admin intentionally low-emphasis with only route proof and empty-state copy, avoiding unfinished school or user workflow forms.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Normalized library card union typing**
- **Found during:** Task 2 (classroom, library, and admin verification)
- **Issue:** `pnpm typecheck` failed because `LibrarySurface` mapped course and resource arrays into a union, then accessed mode-specific fields without narrowing.
- **Fix:** Normalized both modes into a shared card view model containing `title`, `badge`, `description`, and `actionLabel` before rendering.
- **Files modified:** `src/components/surfaces/library-surface.tsx`
- **Verification:** `pnpm typecheck` and `pnpm lint` passed after the fix.
- **Committed in:** `8671e93`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix was required for type correctness and did not change product scope.

## Issues Encountered

- `pnpm build` reported that Next.js updated `tsconfig.json` include suggestions because `tsconfig.json` is an untracked scaffold from earlier work. The plan did not modify or stage it; build still passed.
- Several foundation files from earlier plans remain untracked in the working tree. Only Plan 04 files and metadata were staged for this plan.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - Plan 04 intentionally uses static Phase 1 product content, but no blocking placeholder or disconnected empty UI prevents the stated goal.

## Threat Flags

None - no network endpoint, auth path, file access, DB access, upload handler, or schema boundary was introduced.

## Verification

- `pnpm typecheck` — passed.
- `pnpm lint` — passed.
- `pnpm build` — passed with Next.js 16.2.4 and Turbopack.
- Task 1 acceptance checks — passed.
- Task 2 acceptance checks — passed.
- Production route smoke check via `next start` on port 3100 — `/student`, `/student/player`, `/classroom`, `/courses`, `/resources`, and `/admin` returned HTTP 200.
- Manual browser verification — not performed in this non-interactive executor; routes are ready for visual review.

## Self-Check: PASSED

- Created files exist on disk.
- Task commits `c8ce030` and `8671e93` exist in git history.
- Verification results match the implemented route surfaces.

## Next Phase Readiness

Ready for Plan 05 to complete Phase 1 verification, documentation, and navigation review across the full route shell set.

---
*Phase: 01-application-foundation-and-design-shell*
*Completed: 2026-05-04*
