---
phase: 66-wire-ai-lessonagent-draft-loop-end-to-end-bridge-run-persist
plan: 07
subsystem: testing
tags: [vitest, command-bus, ai-lessonagent, lesson-draft, e2e]

# Dependency graph
requires:
  - phase: 66-01
    provides: "lesson.draft.accepted version >= 1 fix (no longer hardcoded 0)"
  - phase: 66-03
    provides: "draftLessonWithAgentAction flag-gated server action"
  - phase: 66-04
    provides: "accept/discard rewired through Command Bus (lesson.draft.accept)"
provides:
  - "End-to-end closure spec exercising the assembled AI draft loop in one path"
  - "Regression guard that lesson.draft.accepted carries version >= 1 (never 0)"
affects: [66-05, lesson-agent, lesson-draft, command-bus]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "In-memory @/db drizzle fake driving the production (non-injectable) PlatformCommandStore"
    - "appendPlatformEvents capture mock returning empty dispatches to short-circuit publish"
    - "Flag enablement via mocked getAgentRegistryDTO fixture (never flips seed default)"

key-files:
  created:
    - src/server/ai/agents/lesson-draft-loop.e2e.test.ts
  modified: []

key-decisions:
  - "Drove BOTH action paths (agent draftLessonStep + accept action) through the real Command Bus; only @/db, appendPlatformEvents, the in-process adapter, plugin handlers, and DALs are mocked."
  - "Faked @/db (not the store) because both action entrypoints use db-backed stores with no dependency-injection seam."
  - "Overrode drizzle-orm eq() to a {__eqValue} predicate so the fake can match rows by id or dedupeKey."

patterns-established:
  - "Pattern: single-spec assembled-loop closure test sitting on top of per-seam integration tests"

requirements-completed: [DRAFT-01, AGENT-03, REVIEW-01, REVIEW-03]

# Metrics
duration: ~12min
completed: 2026-06-01
---

# Phase 66 Plan 07: AI LessonAgent Draft Loop End-to-End Closure Summary

**One Vitest spec now drives the full enable → trigger → run+persist → review → accept → publish chain through the real Command Bus and asserts the accepted event carries a real version (>= 1, never the old hardcoded 0).**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-01T14:55Z (approx)
- **Completed:** 2026-06-01T15:07Z
- **Tasks:** 1 completed
- **Files modified:** 1 (created)

## Accomplishments
- Closed the audit's flows 0/1 core gap: the assembled loop is exercised by one automated spec, not just isolated seams.
- Proved flag-enabled (mocked registry fixture) → `draftLessonWithAgentAction` → `lesson.draft.run` + `lesson.draft.persist` both dispatched through the real bus → draft version lands (version 1).
- Proved `applyDraftLessonVersionAction` dispatches `lesson.draft.accept` through the real bus, emits `lesson.draft.accepted` with `version >= 1`, and reaches the publish chain (`applyDraftToLiveLesson`).

## Task Commits

1. **Task 1: end-to-end closure spec** - `ccc5016` (test)

**Plan metadata:** committed with SUMMARY/STATE/ROADMAP.

## Files Created/Modified
- `src/server/ai/agents/lesson-draft-loop.e2e.test.ts` - End-to-end closure integration spec for the full AI LessonAgent draft loop; 2 tests covering the run+persist bridge and the accept→publish leg with the `version >= 1` invariant.

## How It Works
- The spec mocks `@/db` with an in-memory drizzle fake (findFirst/insert/update over `platformCommands` + `platformCommandAttempts`) so the production, non-injectable `PlatformCommandStore` instances (in `lesson-agent.ts` and the accept producer) operate against shared in-memory state.
- `appendPlatformEvents` is mocked to capture every emitted domain event and return empty `dispatches`, which short-circuits `publishPersistedIfNeeded`.
- Plugin handlers and the in-process adapter are stubbed to keep the real bus + registry + `lesson-draft` handler while cutting the unrelated plugin → next-auth chain.
- Flag enablement is injected through a mocked `getAgentRegistryDTO` returning `enabled: true`; the seed default is never touched.

## Deviations from Plan

None - plan executed exactly as written (test-only, no production source changed).

## Deferred Issues (Out of Scope)

Running the full suite (`pnpm test run`) surfaced 16 failing tests in two files that are
**pre-existing at HEAD** (`git diff --stat HEAD` shows them unmodified) and **unrelated** to
this isolated new test file (Vitest isolates module graphs per file):

- `src/lib/dal/lesson-authoring.draft-review.test.ts` (DAL draft-review assertion mismatches)
- `src/components/surfaces/classroom-incident-operator-surface.test.tsx` (`window is not defined` env error)

Logged in `deferred-items.md`. Not fixed here per the executor scope boundary. The 66-07
target spec passes 2/2 in isolation.

## Self-Check: PASSED

- `src/server/ai/agents/lesson-draft-loop.e2e.test.ts` — FOUND
- `66-07-SUMMARY.md` — FOUND
- Commit `ccc5016` — FOUND
