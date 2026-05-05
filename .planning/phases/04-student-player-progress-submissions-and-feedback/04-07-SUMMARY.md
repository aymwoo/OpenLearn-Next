---
phase: 04-student-player-progress-submissions-and-feedback
plan: 07
subsystem: ui
tags: [nextjs, react, suspense, cache, dal, dto, student-player]

requires:
  - phase: 04-student-player-progress-submissions-and-feedback
    provides: DTO-backed student learning loop, progress, submissions, and feedback
provides:
  - Cached student player lesson shell DAL and DTO contract
  - Suspense-streamed personal progress, runtime, latest submissions, and history region
  - Phase 04 verification guard for LEARN-02 PPR regression
affects: [phase-04, phase-05-classroom-runtime, student-player]

tech-stack:
  added: []
  patterns: [Next.js Cache Components, Suspense streaming, DAL DTO split]

key-files:
  created:
    - .planning/phases/04-student-player-progress-submissions-and-feedback/04-07-SUMMARY.md
  modified:
    - src/lib/dto/learning.ts
    - src/lib/dal/learning.ts
    - src/app/(student)/student/player/page.tsx
    - src/components/surfaces/player-surface.tsx
    - src/components/surfaces/student-player-surfaces.test.ts
    - src/lib/dto/learning.test.ts
    - src/lib/dal/learning.test.ts
    - scripts/verify-phase4-learning.ts

key-decisions:
  - "Student player authorization runs outside the cached shell reader; the cached reader receives only stable lesson parameters and uses lesson and steps tags."
  - "The existing getStudentPlayerDTO API remains as a compatibility composer, but the route now uses split shell and personal loaders."

patterns-established:
  - "PPR player pattern: cached shell chrome plus Suspense personalSlot."
  - "Verification pattern: source invariant checks reject full DTO loading in the player route."

requirements-completed: [LEARN-02]

duration: 9 min
completed: 2026-05-05
---

# Phase 04 Plan 07: LEARN-02 gap closure summary

**Cached student player shell with Suspense-streamed personal progress,
runtime, submissions, and attempt history.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-05T05:06:49Z
- **Completed:** 2026-05-05T05:16:23Z
- **Tasks:** 3 completed
- **Files modified:** 8

## Accomplishments

- Split `StudentPlayerDTO` into explicit shell and personal DTO contracts.
- Added a cached shell DAL loader using `cacheLife('hours')`,
  `cacheTags.lesson`, and `cacheTags.steps`.
- Refactored the student player route to render shell chrome immediately and
  stream personal learning state through `<Suspense>`.
- Extended `pnpm verify:phase4` so LEARN-02 cannot regress to one resolved
  player DTO before render.

## Task commits

Each task was committed atomically:

1. **Task 1 RED: Split player DTO and DAL tests** - `3660fc8` (test)
2. **Task 1 GREEN: Split player data loaders** - `7195d3b` (feat)
3. **Task 2 RED: Player Suspense tests** - `c0e0958` (test)
4. **Task 2 GREEN: Stream player personal state** - `275d9e5` (feat)
5. **Task 3: Verify player PPR split** - `cb6ee42` (test)

**Plan metadata:** pending final docs commit.

## Files created/modified

- `src/lib/dto/learning.ts` - Added shell and personal player schemas/types.
- `src/lib/dal/learning.ts` - Added cached shell loader, dynamic personal
  loader, and compatibility composer.
- `src/app/(student)/student/player/page.tsx` - Added Suspense-backed route
  composition using split loaders.
- `src/components/surfaces/player-surface.tsx` - Split cached shell chrome from
  `PlayerPersonalRegion` and `PlayerPersonalFallback`.
- `src/components/surfaces/student-player-surfaces.test.ts` - Added source
  invariants for Suspense and shell/personal separation.
- `src/lib/dto/learning.test.ts` - Added DTO split export coverage.
- `src/lib/dal/learning.test.ts` - Added cached shell and dynamic personal DAL
  coverage.
- `scripts/verify-phase4-learning.ts` - Added LEARN-02 gap closure checks.

## Decisions made

- Student authorization now runs in `assertStudentCanOpenPlayer()` before the
  cached shell reader executes, preserving the unified `课时暂不可学习` boundary
  without reading session or membership inside cached code.
- The cached shell reader receives only the stable `lessonId`, applies lesson and
  step cache tags, and returns published shell data.
- Personal player reads are intentionally not cached because they depend on the
  active student, progress rows, task submissions, quiz attempts, and future
  classroom runtime state.

## Deviations from plan

None - plan executed exactly as written.

## Issues encountered

- TDD RED gates failed as expected before implementation.
- A focused DAL invariant initially expected the helper name
  `lessonStepProgress` inside the personal loader body. The implementation was
  adjusted to query `db.query.lessonStepProgress` directly in the dynamic loader,
  making the source invariant and implementation intent explicit.

## Known stubs

- `src/components/surfaces/player-surface.tsx:46` uses the existing empty-content
  lesson copy `这个步骤暂时没有正文内容，请继续下一个步骤。`. This is an intentional empty
  state for published content steps without body text, not a blocking stub.

## Threat flags

No new unplanned trust boundaries were introduced. The plan's threat register
covered the cached shell loader, dynamic personal loader, route step selection,
and Suspense fallback behavior.

## Verification

- `pnpm exec vitest run "src/lib/dto/learning.test.ts" "src/lib/dal/learning.test.ts" "src/components/surfaces/student-player-surfaces.test.ts" "src/components/learning/student-step-cards.test.ts"` — PASS, 4 files / 20 tests
- `pnpm verify:phase4` — PASS, prints `Phase 4 learning verification passed`
- `pnpm exec tsc --noEmit` — PASS

## Gap fix addendum

- Moved request-specific student auth/session/membership reads out of the cached
  player shell reader. `getStudentPlayerShellDTO()` now receives an explicit
  authorized `scope` from `assertStudentCanOpenPlayer()`, while the internal
  cached shell reader uses only the stable `lessonId` plus cache tags.
- Extended DAL and Phase 04 verification checks to fail if the cached shell reader
  calls `assertActiveStudent()`, `assertStudentCanAccessLesson()`,
  `getCurrentUserDTO()`, or `getUserMembershipsDTO()`.

## User setup required

None - no external service configuration required.

## Next phase readiness

LEARN-02 is directly addressed. Phase 05 can now build classroom runtime and
Edge SSE on top of a player architecture that already separates cached lesson
shell data from user-specific learning state.

## Self-check: PASSED

- Summary file exists.
- Task commits exist: `3660fc8`, `7195d3b`, `c0e0958`, `275d9e5`, `cb6ee42`.
- Key modified files exist.

---

*Phase: 04-student-player-progress-submissions-and-feedback*  
*Completed: 2026-05-05*
