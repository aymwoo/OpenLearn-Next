---
phase: 04-student-player-progress-submissions-and-feedback
plan: 01
subsystem: database
tags: [drizzle, sqlite, zod, vitest, learning-progress]

requires:
  - phase: 03-courses-lessons-steps-and-teacher-authoring
    provides: published lesson versions, lesson steps, and lesson payload DTOs
provides:
  - Phase 04 learning persistence schema for progress, attempts, and feedback
  - Learning DTO contracts for dashboard, player, attempts, teacher review, and mutations
  - Phase 04 invariant verification script and package command
affects: [student-player, learning-dal, learning-actions, teacher-review, phase-04]

tech-stack:
  added: []
  patterns: [append-only attempts, latest-read marker, Zod DTO boundary, source invariant verification]

key-files:
  created:
    - src/db/schema.learning.test.ts
    - src/lib/dto/learning.test.ts
    - src/lib/dto/learning.ts
    - scripts/verify-phase4-learning.ts
  modified:
    - src/db/schema.ts
    - package.json

key-decisions:
  - "Phase 04 attempts use append-only task and quiz tables with attemptNo, isLatest, and latest/history indexes."
  - "Learning DTOs expose retry and answer reveal as server-controlled booleans before UI implementation."
  - "pnpm verify:phase4 intentionally fails until later Phase 04 DAL, action, and UI files exist."

patterns-established:
  - "Learning persistence uses cascade references to published versions, lessons, steps, and users."
  - "Learning contracts are guarded by Vitest source-level RED/GREEN tests plus a phase verification script."

requirements-completed: [LEARN-01, LEARN-02, LEARN-03, LEARN-04, LEARN-05, LEARN-06, LEARN-07, LEARN-08, LEARN-09]

duration: 4 min
completed: 2026-05-05
---

# Phase 04 Plan 01: Learning contracts summary

**SQLite learning persistence, Zod student/player/review DTO contracts, and a Phase 04 invariant gate for downstream DAL and UI plans**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-05T03:19:40Z
- **Completed:** 2026-05-05T03:23:40Z
- **Tasks:** 3 completed
- **Files modified:** 6

## Accomplishments

- Added Phase 04 Drizzle tables for step progress, append-only task submissions,
  append-only quiz attempts, and attempt feedback.
- Created learning DTO schemas and inferred types for student dashboard, player,
  attempt history, teacher review, feedback input, and mutation results.
- Registered `pnpm verify:phase4` with source-invariant checks for current
  contracts and future DAL/action/UI boundaries.

## Task commits

Each task was committed atomically:

1. **Task 1 RED: schema contract tests** - `5158d1d` (test)
2. **Task 1 GREEN: learning persistence schema** - `185aa91` (feat)
3. **Task 2 RED: DTO contract tests** - `9382308` (test)
4. **Task 2 GREEN: learning DTO contracts** - `abc9722` (feat)
5. **Task 2 REFACTOR: player policy flags** - `e47199c` (refactor)
6. **Task 3: verification gate and package script** - `00ef028` (chore)

**Plan metadata:** pending final docs commit

## Files created/modified

- `src/db/schema.ts` - Adds `lessonStepProgress`, `taskSubmissions`,
  `quizAttempts`, and `attemptFeedback` tables with cascade relations and
  required indexes.
- `src/db/schema.learning.test.ts` - Guards Phase 04 persistence exports,
  append-only fields, latest/history indexes, and cascade ownership.
- `src/lib/dto/learning.ts` - Defines student dashboard, player, progress,
  attempt, feedback, teacher review, input, and mutation DTO contracts.
- `src/lib/dto/learning.test.ts` - Guards DTO exports, feedback length limits,
  and server-controlled learning policy flags.
- `scripts/verify-phase4-learning.ts` - Adds Phase 04 source-invariant checks
  for schema, DTO, future DAL/actions/UI, and deferred-scope exclusions.
- `package.json` - Adds the `verify:phase4` script.

## Decisions made

- Used separate task and quiz attempt tables to keep append-only histories and
  latest-read indexes explicit for downstream DAL implementation.
- Modeled feedback as a single short record targeting `task_submission` or
  `quiz_attempt`, matching Phase 04 scope and avoiding threaded comments.
- Kept `pnpm verify:phase4` registered now but allowed to fail until later
  plans create the expected DAL, Server Actions, and UI files.

## Deviations from plan

None - plan executed exactly as written.

## Issues encountered

None. `pnpm exec tsc --noEmit` and the focused learning contract tests pass.

## Known stubs

None in files created or modified by this plan. `pnpm verify:phase4` contains
future-file checks by design, but they are verification placeholders for later
Phase 04 plans rather than runtime/UI stubs.

## Threat flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: schema_trust_boundary | `src/db/schema.ts` | New user-owned learning progress, attempt, and feedback persistence crosses app logic into SQLite. |
| threat_flag: dto_trust_boundary | `src/lib/dto/learning.ts` | New DTO schemas normalize persisted JSON and future form inputs before UI use. |

## Verification

- `pnpm exec vitest run "src/db/schema.learning.test.ts"` — PASS
- `pnpm exec vitest run "src/lib/dto/learning.test.ts"` — PASS
- `pnpm exec vitest run "src/db/schema.learning.test.ts" "src/lib/dto/learning.test.ts"` — PASS
- `pnpm exec tsc --noEmit` — PASS

`pnpm verify:phase4` is expected to fail until Plans 02-05 add the DAL,
Server Actions, student UI, and teacher review files that the gate checks.

## TDD gate compliance

- RED schema test commit exists: `5158d1d`
- GREEN schema implementation commit exists: `185aa91`
- RED DTO test commit exists: `9382308`
- GREEN DTO implementation commit exists: `abc9722`
- Optional DTO refactor commit exists: `e47199c`

## User setup required

None - no external service configuration required.

## Next phase readiness

Ready for `04-02-PLAN.md`: downstream agents can build learning DAL functions
against stable table names, DTO field names, and verification expectations.

## Self-check: PASSED

- Found `src/db/schema.learning.test.ts`
- Found `src/lib/dto/learning.test.ts`
- Found `src/lib/dto/learning.ts`
- Found `scripts/verify-phase4-learning.ts`
- Found commit `5158d1d`
- Found commit `185aa91`
- Found commit `9382308`
- Found commit `abc9722`
- Found commit `e47199c`
- Found commit `00ef028`

---
*Phase: 04-student-player-progress-submissions-and-feedback*
*Completed: 2026-05-05*
