---
phase: 03-courses-lessons-steps-and-teacher-authoring
plan: 01
subsystem: database
tags: [drizzle, sqlite, zod, lexorank, authoring]
requires:
  - phase: 02-auth-roles-schema-and-dal-boundary
    provides: Auth.js user, membership, school, class, and DAL boundary baseline
provides:
  - SQLite authoring schema for courses, lessons, steps, materials, enrollments, and published versions
  - DTO and Zod payload contracts for content, task, and quiz steps
  - Deterministic rank string helper for step ordering
affects: [teacher-authoring, lesson-publish, student-player, classroom]
tech-stack:
  added: []
  patterns: [SQLite cascade relations, Zod DTO boundary, rank-string ordering]
key-files:
  created:
    - src/lib/dto/lesson-authoring.ts
    - src/lib/ranking/lexorank.ts
    - src/lib/ranking/lexorank.test.ts
  modified:
    - src/db/schema.ts
key-decisions:
  - "Use a local deterministic base-62 rank helper instead of adding a dependency."
  - "Keep published lesson versions as stable snapshot rows separate from mutable lesson drafts."
patterns-established:
  - "Step ordering stores sortable rank strings and avoids integer position semantics."
  - "UI-facing authoring data is parsed through Zod DTO schemas before crossing boundaries."
requirements-completed: [LESSON-01, LESSON-02, LESSON-03, LESSON-04, LESSON-06, LESSON-07]
duration: 8min
completed: 2026-05-05
---

# Phase 03 Plan 01: Authoring schema, DTO, and rank contracts Summary

**SQLite authoring tables, Zod step payload DTOs, and base-62 rank strings for teacher lesson drafts and publish snapshots.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-05T00:13:00Z
- **Completed:** 2026-05-05T00:21:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added Phase 3 authoring tables with cascade relationships and the required `lessonSteps_lessonId_rank_idx` index.
- Defined `content`, `task`, and `quiz` payload validation through a Zod discriminated union.
- Implemented and tested local rank helpers for before, after, and between insertion.
- Pushed the updated Drizzle schema to the local SQLite database.

## Task Commits

1. **Task 1: Extend authoring schema and DTO contracts** - `6539e2f` (feat)
2. **Task 2 RED: Rank helper behavior tests** - `8191a58` (test)
3. **Task 2 GREEN: Rank string helper** - `e75d0cf` (feat)
4. **Task 3: Push updated Drizzle schema** - no code commit; `local.db` is ignored by project gitignore and the successful `pnpm exec drizzle-kit push` result is documented here.

## Files Created/Modified

- `src/db/schema.ts` - Adds authoring schema tables and indexes.
- `src/lib/dto/lesson-authoring.ts` - Defines sanitized DTOs and step payload schemas.
- `src/lib/ranking/lexorank.ts` - Provides deterministic rank string helpers.
- `src/lib/ranking/lexorank.test.ts` - Verifies rank insertion behavior.

## Decisions Made

- Used a local rank helper to avoid adding a package for this phase while still meeting sortable rank requirements.
- Left `local.db` uncommitted because it is intentionally ignored as a generated runtime database artifact.

## Deviations from Plan

### Auto-fixed Issues

None - plan executed as written. The only adjustment was operational: `local.db` was not committed because it is ignored generated output.

## Issues Encountered

- `local.db` could not be staged because it is ignored. This is expected for a local SQLite runtime artifact; `pnpm exec drizzle-kit push` exited 0 and verified the schema locally.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

Plan 02 can implement the server-only teacher authoring DAL against the new schema, DTOs, and rank helper.

## Self-Check: PASSED

- Found `src/lib/dto/lesson-authoring.ts`.
- Found `src/lib/ranking/lexorank.ts`.
- Found commit `6539e2f`.
- Found commit `8191a58`.
- Found commit `e75d0cf`.
- Verification passed: `pnpm exec tsc --noEmit`.
- Verification passed: `pnpm test -- src/lib/ranking/lexorank.test.ts`.
- Verification passed: `pnpm exec drizzle-kit push`.

---
*Phase: 03-courses-lessons-steps-and-teacher-authoring*
*Completed: 2026-05-05*
