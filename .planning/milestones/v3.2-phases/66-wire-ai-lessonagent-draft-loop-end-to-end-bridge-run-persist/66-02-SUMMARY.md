---
phase: 66-wire-ai-lessonagent-draft-loop-end-to-end-bridge-run-persist
plan: 02
subsystem: api
tags: [command-bus, lesson-agent, draft-persist, idempotency, correlation, tdd]

# Dependency graph
requires:
  - phase: 62
    provides: draftLessonStep server-only orchestration facade dispatching lesson.draft.run
  - phase: 63
    provides: lesson.draft.persist handler + persistDraftLessonVersion DAL + strict payload schema
  - phase: 66-01
    provides: real draft version identity (draftVersionId/version) threaded through persist resultSummary
provides:
  - run→persist orchestration bridge in draftLessonStep (sequential dispatch, shared correlationId)
  - draftLessonStep now returns persisted draft identity (draftVersionId, version) to callers
  - explicit same-sourceCommandId persist idempotency assertion (no double-write, no duplicate event, same draftVersionId)
affects: [lesson-agent, draft-loop, teacher-trigger-entry, accept-discard-bus-routing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sequential run→persist dispatch at orchestration entry (NOT nested in run handler) — keeps run handler pure (D-01)"
    - "Single-step run output wrapped as steps:[step] to satisfy strict persist payload schema (min 1)"
    - "Shared correlationId across run+persist with persist.causationId = run command id (one correlated unit)"
    - "Bus dedupe short-circuit drives persist idempotency — duplicate dedupeKey skips execute entirely"

key-files:
  created:
    - .planning/phases/66-wire-ai-lessonagent-draft-loop-end-to-end-bridge-run-persist/66-02-SUMMARY.md
  modified:
    - src/server/ai/agents/lesson-agent.ts
    - src/server/ai/agents/lesson-agent.test.ts
    - src/features/platform-core/commands/handlers/lesson-draft.persist.test.ts

key-decisions:
  - "Bridge lives at draftLessonStep orchestration entry as sequential dispatch (D-01); run handler stays pure (0 nested dispatch)"
  - "step===null (generation failure / guardrail rejection) short-circuits — no persist, returns draftVersionId/version=null (D-53-08 passthrough)"
  - "persist envelope reuses run correlationId; causationId points at the run command id; teacherId/source never enter payload (handler closure injects, T-66-05)"
  - "Same-sourceCommandId idempotency proven via real handler through bus: dedupe short-circuit → DAL written once, one persisted event, same draftVersionId (DRAFT-02)"

patterns-established:
  - "Pattern: orchestration-entry command chaining keeps individual handlers single-responsibility and replay-safe"
  - "Pattern: existing in-memory store fixtures extended to capture full command sequence (captured.commands[]) for multi-dispatch assertions"

requirements-completed: [DRAFT-01, DRAFT-02]

# Metrics
duration: ~12min
completed: 2026-06-01
---

# Phase 66 Plan 02: Wire run→persist bridge Summary

**LessonAgent draftLessonStep now sequentially dispatches lesson.draft.persist after a successful lesson.draft.run, sharing one correlationId, wrapping the single step as steps:[step], returning the persisted draft identity, and short-circuiting on null-step — with same-sourceCommandId idempotency asserted.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-01T22:13:00Z (approx)
- **Completed:** 2026-06-01T22:20:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Closed the run→persist seam: a successful `lesson.draft.run` is now followed by a correlated `lesson.draft.persist` dispatch carrying the produced step (DRAFT-01).
- `draftLessonStep` returns `{ ..., draftVersionId, version }` — callers receive the persisted draft version identity.
- Proved replay-safety: a duplicate persist with the same `sourceCommandId` writes the DAL exactly once, emits exactly one `lesson.draft.persisted` event, and resolves to the same `draftVersionId` (DRAFT-02).
- Kept the `lesson.draft.run` handler pure — bridge is sequential at the orchestration entry, no nested dispatch added to the handler (verified: 0 `dispatch` occurrences in `handlers/lesson-draft.ts`).

## Task Commits

Each task was committed atomically (TDD: RED test → GREEN impl):

1. **Task 1: Failing bridge test (RED)** — `38c0a4a` (test)
2. **Task 2: Add run→persist bridge dispatch (GREEN)** — `3d3cafa` (feat)
3. **Task 3: Assert same-sourceCommandId persist idempotency** — `421909a` (test)

**Plan metadata:** _(this commit)_ (docs: complete plan)

## Files Created/Modified
- `src/server/ai/agents/lesson-agent.ts` - Added the run→persist bridge: after a non-null run step, builds a `lesson.draft.persist` envelope (reused correlationId, causationId=run id, `steps:[step]`), dispatches via the same `dispatchPlatformCommand`+deps, returns `draftVersionId`/`version`; null-step short-circuits.
- `src/server/ai/agents/lesson-agent.test.ts` - Added 5 bridge tests (sequence, `[step]` wrap, shared correlationId, null-step short-circuit, returned identity); extended in-memory store to capture full command sequence; made Test 1/Test 4 bridge-robust.
- `src/features/platform-core/commands/handlers/lesson-draft.persist.test.ts` - Added 用例 C driving the real persist handler through the bus to assert duplicate dedupeKey → DAL written once, single `lesson.draft.persisted` event, same `draftVersionId`; preserved 用例 A/B.

## Decisions Made
- None beyond the locked plan decisions (D-01 sequential bridge, shared correlationId, `[step]` wrap). Followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. RED confirmed exactly 4 bridge assertions failing pre-implementation (Bridge 4 null-step path already short-circuited in existing code, as expected); all 18 assertions across both suites green post-implementation.

## Known Stubs
None - bridge wires real run output into the real persist command path; persist DAL write is mocked only in tests (hermetic), production path uses the real `platformCommandStore`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The orchestration seam is closed: agent-produced steps now reach the persist command path and produce a draft version.
- Ready for the teacher-trigger entry (Server Action) and accept/discard Command Bus routing plans in Phase 66.
- No blockers introduced; run handler purity and summary-only event invariant preserved.

---
*Phase: 66-wire-ai-lessonagent-draft-loop-end-to-end-bridge-run-persist*
*Completed: 2026-06-01*
