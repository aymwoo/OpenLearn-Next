---
phase: 66-wire-ai-lessonagent-draft-loop-end-to-end-bridge-run-persist
plan: 04
subsystem: api
tags: [command-bus, lesson-draft, server-actions, dedupe, cache-invalidation, drizzle, next-cache]

# Dependency graph
requires:
  - phase: 66-01
    provides: lesson.draft.accept/discard handlers + contracts (version>=1, courseId in resultSummary, assertActiveTeacher scope authorization)
provides:
  - "buildLessonDraftCommand producer (strict accept/discard envelopes, required dedupeKey)"
  - "lessonDraftCommandStore + lessonDraftCommandBusDependencies (db-backed command store + in-process publication port)"
  - "applyDraftLessonVersionAction/discardDraftLessonVersionAction routed through dispatchPlatformCommand (no direct DAL writes)"
affects: [66-verify, lesson-authoring, draft-review-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Action → typed producer → dispatchPlatformCommand (single source of truth for review accept/discard writes)"
    - "Required dedupeKey derived from intent+lessonId+draftVersionId+actor for replay-safe idempotency"
    - "Cache invalidation driven by authoritative command resultSummary.courseId, never client-supplied"

key-files:
  created:
    - src/features/platform-core/commands/producers/lesson-draft.ts
  modified:
    - src/actions/lesson-authoring-actions.ts
    - src/actions/lesson-authoring-actions.draft-routing.test.ts
    - src/actions/lesson-authoring-actions.test.ts

key-decisions:
  - "Producer exports pure buildLessonDraftCommand (throws LESSON_DRAFT_DEDUPE_KEY_REQUIRED on empty dedupeKey) plus db-backed store deps; action imports dispatchPlatformCommand from the existing bus (no second bus)."
  - "scope = { schoolId: actor.schoolIds[0], pluginId: 'core.lesson-agent' sentinel }; actor = { actorId: userId, actorScope: 'teacher' }."
  - "Bus rethrows handler failures, so DRAFT_NOT_PENDING propagates to the action try/catch and is mapped by handleActionError."
  - "courseId consumed only from result.resultSummary for course-scoped invalidation (T-66-14 cross-tenant EoP mitigation)."

patterns-established:
  - "Review-write Server Actions dispatch authoritative commands instead of calling the DAL directly."
  - "Existing action test suites that newly pull the bus must stub bus+producer to avoid eager registry→handler→auth load."

requirements-completed: [REVIEW-01, REVIEW-03]

# Metrics
duration: 8min
completed: 2026-06-01
---

# Phase 66 Plan 04: Route Draft Accept/Discard Through the Command Bus Summary

**Teacher draft accept/discard now dispatch `lesson.draft.accept`/`lesson.draft.discard` through the v3.0 Command Bus via a strict typed producer with required dedupeKey, replacing direct DAL writes while preserving DRAFT_NOT_PENDING and course-scoped cache invalidation.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-01T14:43:42Z
- **Completed:** 2026-06-01T14:50:54Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- New `lesson-draft` producer: `buildLessonDraftCommand` constructs strict accept/discard envelopes (payloads type-narrowed to the contract schemas), enforces a non-empty `dedupeKey`, and ships a db-backed `lessonDraftCommandStore` + `lessonDraftCommandBusDependencies` wired to the in-process publication port.
- `applyDraftLessonVersionAction` and `discardDraftLessonVersionAction` rewired to `dispatchPlatformCommand` — direct DAL calls (`applyDraftToLiveLesson`/`discardDraftLessonVersion`) removed; no second source of truth introduced.
- Accept invalidation now derives `courseId` from the authoritative `result.resultSummary` (not client input), preserving `updateTag` draft/lesson cache behaviour; `DRAFT_NOT_PENDING` still surfaces through the command path to a structured `ActionResult` error.

## Task Commits

Each task was committed atomically:

1. **Task 1: Failing command-routing test (RED)** - `ef77810` (test)
2. **Task 2: lesson-draft command producer** - `d48ded3` (feat)
3. **Task 3: Rewire accept/discard actions through bus (GREEN)** - `402badd` (feat)

_TDD gate sequence satisfied: `test(ef77810)` → `feat(402badd)`._

## Files Created/Modified
- `src/features/platform-core/commands/producers/lesson-draft.ts` - **Created.** Pure envelope builder `buildLessonDraftCommand` (required-dedupeKey guard), db-backed `PlatformCommandStore`, and exported bus dependencies.
- `src/actions/lesson-authoring-actions.ts` - **Modified.** Both draft actions dispatch via the Command Bus; removed dead DAL imports; sentinel `LESSON_AGENT_SENTINEL_PLUGIN_ID` const added; courseId-from-resultSummary invalidation.
- `src/actions/lesson-authoring-actions.draft-routing.test.ts` - **Created (Task 1).** 3 tests: accept routes via bus, discard routes via bus, DRAFT_NOT_PENDING surfaced.
- `src/actions/lesson-authoring-actions.test.ts` - **Modified (deviation).** Added `vi.mock` stubs for bus + producer to prevent eager registry→handler→auth load.

## Decisions Made
- Producer stays a pure builder + exported deps; the action imports `dispatchPlatformCommand` from the existing bus directly (satisfies must_have "contains dispatchPlatformCommand" and avoids a second dispatch path).
- `dedupeKey` = `lesson.draft.{accept|discard}:${lessonId}:${draftVersionId}:${userId}` — replay-safe per teacher intent.
- Relied on the bus rethrow semantics (bus.ts:376) so handler errors reach the action's existing `handleActionError` mapping rather than adding bespoke error handling.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Repaired import-time crash in existing `lesson-authoring-actions.test.ts`**
- **Found during:** Task 3 (post-rewire regression check)
- **Issue:** Adding the bus import to the actions module made the pre-existing extended test suite eager-load `bus → ./registry → all command handlers → lesson DAL → @/lib/auth → next-auth`, which crashed at import (`Cannot find module next/server` from next-auth in the vitest env). Confirmed regression: 28/28 passed on the unmodified file, 28/28 failed after the rewire.
- **Fix:** Added `vi.mock` stubs for `@/features/platform-core/commands/bus` and `@/features/platform-core/commands/producers/lesson-draft` in that suite. Safe because the suite has zero references to the draft accept/discard actions (covered by the new draft-routing suite).
- **Files modified:** src/actions/lesson-authoring-actions.test.ts
- **Verification:** Combined run green — 31/31 (28 existing + 3 new); full draft sweep 46/46.
- **Committed in:** `402badd` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — regression directly caused by this plan's import).
**Impact on plan:** Necessary to keep the existing suite green. In-scope, no scope creep; the new import surface is the sole cause.

## Issues Encountered
- The DAL functions `applyDraftToLiveLesson`/`discardDraftLessonVersion` remain referenced by `src/actions/lesson-authoring-draft-review-actions.test.ts`, but that test has **no corresponding source file** (orphan/test-only reference against the still-exported DAL). Out of scope; unaffected by this change.

## Threat Mitigations Verified
- **T-66-11 (Tampering):** Producer payloads are type-narrowed to the strict contract schemas; handler re-checks school scope.
- **T-66-12 (DoS/replay):** Required `dedupeKey` on every envelope; empty key throws `LESSON_DRAFT_DEDUPE_KEY_REQUIRED`.
- **T-66-13 (Tampering, non-pending):** `DRAFT_NOT_PENDING` guard preserved end-to-end; surfaced as `ActionResult` error.
- **T-66-14 (EoP, cross-tenant):** Authorization uses `assertActiveTeacher` scope; `courseId` consumed only from the authoritative command result for cache invalidation.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Review accept/discard write paths are now Command-Bus-native; ready for phase 66 verification (`pnpm verify:phase` recommended as the final phase-level gate over a clean tree).
- No blockers introduced.

---
*Phase: 66-wire-ai-lessonagent-draft-loop-end-to-end-bridge-run-persist*
*Completed: 2026-06-01*

## Self-Check: PASSED

All created files exist on disk; all task commits (ef77810, d48ded3, 402badd) present in git history.
