---
phase: 65-eval-guardrails-verify-phase-close-gate
plan: 03
subsystem: testing
tags: [vitest, eval, lesson-agent, ai-sdk, zod, schema-validation]

# Dependency graph
requires:
  - phase: 65-01
    provides: shared draftStepCorpus fixture + mock-model fixtures consumed by this eval
provides:
  - EVAL-01 deterministic eval suite (src/server/ai/tools/lesson-draft.eval.test.ts)
  - Schema-legality check replaying shared corpus through the draft tool's controlled generation channel
  - Teaching-structure invariant assertions (D-02) for content/task/quiz outputs
affects: [65-verify-phase-close-gate, eval-guardrails, lesson-agent]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixture-driven *.eval.test.ts replaying shared corpus through aiGenerateObject mock (D-01) — not a tsx script, not LLM-as-judge"
    - "Typed helper narrows ai SDK tool.execute widened (T | AsyncIterable<T>) return back to LessonStepPayload via cast"

key-files:
  created:
    - src/server/ai/tools/lesson-draft.eval.test.ts
  modified: []

key-decisions:
  - "draftFromCorpus(stepType) helper casts awaited tool.execute result to LessonStepPayload to escape the ai SDK's widened AsyncIterable union, then narrows per-test via discriminated result.type guard"
  - "Reused shared draftStepCorpus.valid + mock-model fixtures (D-03) rather than redefining corpus, keeping eval and guardrail tests in lockstep"

patterns-established:
  - "Deterministic AI eval: vi.mock('server-only'), hoisted aiGenerateObjectMock over @/server/ai/providers, hoisted DAL preview mock — no network, no provider key"
  - "Schema + teaching-invariant assertions co-located in one eval describe block per requirement (EVAL-01)"

requirements-completed: [EVAL-01]

# Metrics
duration: 5min
completed: 2026-06-01
---

# Phase 65 Plan 03: EVAL-01 Draft Eval Suite Summary

**Deterministic fixture-driven Vitest eval replaying the shared draft corpus through a mocked generation channel, asserting every step is lessonStepPayloadSchema-valid and meets basic teaching-structure invariants (content/task/quiz).**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-01T02:14:00Z (approx)
- **Completed:** 2026-06-01T02:19:11Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Created `lesson-draft.eval.test.ts` — a repeatable, deterministic eval (no network, no provider key) replaying `draftStepCorpus.valid` through the draft tool's controlled generation channel.
- Schema-legality: each produced content/task/quiz step verified against `lessonStepPayloadSchema.safeParse`.
- Teaching-structure invariants (D-02): content has non-empty title+body; task has non-empty prompt + valid submissionType; quiz has >=2 options + in-range correctOptionIndex.
- 6 tests pass in isolation via a single `vitest run` command with stable pass/fail.

## Task Commits

Each task was committed atomically:

1. **Task 1: schema-legality eval over shared corpus** - `05d812b` (test)
2. **Task 2: teaching-structure invariant assertions** - `2a2a40b` (test)

**Plan metadata:** (this commit) (docs: complete plan)

## Files Created/Modified
- `src/server/ai/tools/lesson-draft.eval.test.ts` - EVAL-01 schema + teaching-invariant eval over the shared corpus

## Decisions Made
- `draftFromCorpus(stepType)` helper casts the awaited `tool.execute` result to `LessonStepPayload` to escape the ai SDK's widened `T | AsyncIterable<T>` return type, then narrows per-test via a discriminated `result.type` guard. This keeps assertions type-safe without re-deriving the union.
- Reused the shared `draftStepCorpus.valid` and mock-model fixtures (D-03) instead of redefining the corpus, keeping the eval and the guardrail tests in lockstep.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- The ai SDK widens `tool.execute`'s return type to `T | AsyncIterable<T>`, so discriminant fields (`type`, `title`, etc.) were not directly accessible and produced type errors. Resolved by narrowing through the typed `draftFromCorpus` helper (cast to `LessonStepPayload`) plus per-test `if (result.type !== ...) throw` guards. `tsc --noEmit` reports no errors in the eval file; 6/6 tests pass.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EVAL-01 satisfied: SC1's repeatable schema + teaching-structure eval is in place and green.
- Ready for the phase verify / close-gate plan to incorporate this eval into the phase verification.

---
*Phase: 65-eval-guardrails-verify-phase-close-gate*
*Completed: 2026-06-01*

## Self-Check: PASSED

- FOUND: src/server/ai/tools/lesson-draft.eval.test.ts
- FOUND: commit 05d812b (task 1)
- FOUND: commit 2a2a40b (task 2)
- 6/6 tests pass; tsc --noEmit clean for eval file
