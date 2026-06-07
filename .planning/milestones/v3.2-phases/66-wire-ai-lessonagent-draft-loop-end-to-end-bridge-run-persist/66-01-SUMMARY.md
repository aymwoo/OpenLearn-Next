---
phase: 66-wire-ai-lessonagent-draft-loop-end-to-end-bridge-run-persist
plan: 01
subsystem: api
tags: [zod, drizzle, command-bus, domain-events, lesson-draft, dto, dal]

# Dependency graph
requires:
  - phase: 64-draft-review-lifecycle
    provides: ApplyDraftResultDTO/DiscardDraftResultDTO, applyDraftToLiveLesson/discardDraftLessonVersion DAL, accept/discard command handlers
provides:
  - "Apply/Discard result DTOs carry the persisted draft version (positive int)"
  - "lesson.draft.accepted/discarded domain events emit the real draft version (>= 1), no longer hardcoded 0"
  - "accept resultSummary re-carries courseId for downstream course-scoped cache invalidation"
affects: [66-02-wire-action-agent-dispatch, lesson-authoring-actions, lesson-agent]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Edit ordering DTO → DAL → handler so .parse() never rejects a newly-added field"
    - "Event version sourced from authoritative DAL draft.version row, never client/LLM input"

key-files:
  created:
    - .planning/phases/66-wire-ai-lessonagent-draft-loop-end-to-end-bridge-run-persist/66-01-SUMMARY.md
  modified:
    - src/lib/dto/lesson-authoring.ts
    - src/lib/dal/lesson-authoring.ts
    - src/features/platform-core/commands/handlers/lesson-draft.ts
    - src/features/platform-core/commands/handlers/lesson-draft.events.test.ts

key-decisions:
  - "Reused the already-loaded draft row (findFirst) for version — no second DB read introduced"
  - "Preserved summary-only event invariant: only added scalar version/courseId, no *Json snapshot fields"

patterns-established:
  - "DTO-first edit ordering: schema gains field before DAL .parse() supplies it"
  - "Domain-event version fidelity sourced from persisted DAL result DTO threaded through handler"

requirements-completed: [DRAFT-03, REVIEW-03]

# Metrics
duration: 4min
completed: 2026-06-01
---

# Phase 66 Plan 01: Draft Event Version Fidelity Fix Summary

**accept/discard domain events now emit the persisted draft version (>= 1) instead of hardcoded 0, and the accept resultSummary re-carries courseId for cache invalidation — a pure DTO→DAL→handler data-flow fix.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-01T13:46:54Z
- **Completed:** 2026-06-01T13:50:24Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Fixed the `version: 0` root cause: `ApplyDraftResultDTO`/`DiscardDraftResultDTO` now require a positive-int `version`, supplied by the DAL from the already-loaded `draft` row.
- `lesson.draft.accepted` and `lesson.draft.discarded` event payloads now carry `result.version` (the real persisted version), removing both `version: 0, // TODO` literals.
- Restored `courseId` to the accept handler's `resultSummary` (dropped in Phase 64), needed downstream for course-scoped cache tag invalidation.

## Task Commits

Each task was committed atomically:

1. **Task 1: Failing event-version test (RED)** - `de69ab6` (test)
2. **Task 2: Thread version through DTO + DAL** - `f8ead5f` (feat)
3. **Task 3: Use result.version + re-add courseId in handler (GREEN)** - `b8732de` (feat)

_Note: TDD plan — RED (test) → GREEN (DTO/DAL then handler)._

## Files Created/Modified
- `src/lib/dto/lesson-authoring.ts` - Added `version: z.number().int().positive()` to ApplyDraftResultDTOSchema and DiscardDraftResultDTOSchema
- `src/lib/dal/lesson-authoring.ts` - `applyDraftToLiveLesson`/`discardDraftLessonVersion` now include `version: draft.version` in their parsed result (reusing the existing findFirst row, no extra DB read)
- `src/features/platform-core/commands/handlers/lesson-draft.ts` - accept/discard events use `result.version`; accept resultSummary re-adds `courseId: result.courseId` and `version: result.version`
- `src/features/platform-core/commands/handlers/lesson-draft.events.test.ts` - Added accept/discard event-version + courseId assertions; extended DAL mock with `applyDraftToLiveLesson`/`discardDraftLessonVersion`

## Decisions Made
- Reused the existing `draftLessonVersions.findFirst` row for `draft.version` rather than adding a second read — keeps the DAL invariant (discard touches only `draftLessonVersions`, apply unchanged except result shape).
- Kept the summary-only event invariant: only scalar `version`/`courseId` added, no `*Json` snapshot fields.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## TDD Gate Compliance
- RED gate: `test(66-01)` commit `de69ab6` — 3 new assertions failed against current code (version 0 / missing courseId), 7 existing tests still passing.
- GREEN gate: `feat(66-01)` commits `f8ead5f` (DTO/DAL) + `b8732de` (handler) — all 10 tests pass.
- No REFACTOR commit needed.

## Self-Check: PASSED

- FOUND: src/lib/dto/lesson-authoring.ts
- FOUND: src/lib/dal/lesson-authoring.ts
- FOUND: src/features/platform-core/commands/handlers/lesson-draft.ts
- FOUND: src/features/platform-core/commands/handlers/lesson-draft.events.test.ts
- FOUND commit: de69ab6 (Task 1)
- FOUND commit: f8ead5f (Task 2)
- FOUND commit: b8732de (Task 3)

## Next Phase Readiness
- Result DTOs now expose `version` + `courseId`, unblocking the action rewire (apply/discard → `dispatchPlatformCommand` with `invalidateLessonAuthoringTags(actorId, courseId, lessonId)`) in subsequent Phase 66 plans.
- No blockers.

---
*Phase: 66-wire-ai-lessonagent-draft-loop-end-to-end-bridge-run-persist*
*Completed: 2026-06-01*
