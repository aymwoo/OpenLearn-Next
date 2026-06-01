---
phase: 65-eval-guardrails-verify-phase-close-gate
plan: 01
subsystem: ai
tags: [zod, guardrails, dto, fixtures, vitest, draft-step]

requires:
  - phase: 62-lesson-draft-command-handler
    provides: lessonStepPayloadSchema + LessonStepTypeSchema enum style + summary-only payload rationale
provides:
  - GuardrailReasonCodeSchema (5-member reason-code enum) in lowest layer src/lib/dto
  - GuardrailReasonCode type + GUARDRAIL_MAX_FIELD_LENGTH threshold (8000)
  - DraftGuardrailRejection error class carrying ONLY { reasonCode, stepType } (T-65-PII)
  - draftStepCorpus single shared fixture (3 valid types + counter-examples for all 5 reason codes)
affects: [65-02-guardrail-validator, 65-03-command-handler, 65-04-events-contracts, eval-suite]

tech-stack:
  added: []
  patterns:
    - "Reason-code vocabulary lives in lowest layer (lib/dto) so server-only validator, events/contracts, and command handler share it without events→tools import or server-only leak"
    - "Rejection error structurally carries only { reasonCode, stepType } — name made non-enumerable so Object.keys exposes no extra field (content-leak guarantee at source)"
    - "Single shared corpus (D-03) feeds both EVAL-01 pass path and EVAL-02 reject path"

key-files:
  created:
    - src/lib/dto/draft-guardrails.ts
    - src/lib/dto/draft-guardrails.test.ts
    - src/server/ai/tools/__fixtures__/draft-step-corpus.ts
  modified: []

key-decisions:
  - "DraftGuardrailRejection.name set via Object.defineProperty (non-enumerable) so the rejection object exposes only reasonCode + stepType per T-65-PII"
  - "GUARDRAIL_MAX_FIELD_LENGTH=8000 defined here as the deterministic oversize threshold consumed by 65-02 guardrails.ts"

patterns-established:
  - "Non-server-only contract module in lib/dto for cross-layer enum/error sharing"
  - "counterExamples typed with `satisfies DraftCounterExample[]`, step kept as Record<string,unknown> so out-of-bounds literals don't fight the discriminated union"

requirements-completed: [EVAL-02]

duration: 4min
completed: 2026-06-01
---

# Phase 65 Plan 01: Guardrail Foundation Summary

**Reason-code enum + content-leak-proof DraftGuardrailRejection in lib/dto, plus the single shared draft-step corpus (3 valid types + all 5 reason-code counter-examples) that every downstream Phase 65 plan consumes.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-06-01T01:55Z
- **Completed:** 2026-06-01T01:58:48Z
- **Tasks:** 2
- **Files modified:** 3 created

## Accomplishments
- Neutral, non-server-only contract module exposes the 5-member guardrail reason-code enum importable by both the AI tool layer and the events/contracts layer with zero boundary crossing.
- `DraftGuardrailRejection` structurally carries ONLY `{ reasonCode, stepType }` — `name` made non-enumerable so downstream emitters cannot leak draft content via the error object (T-65-PII / D-07).
- Single shared fixture corpus: `valid` (content/task/quiz, all parse `lessonStepPayloadSchema`) + `counterExamples` (≥1 out-of-bounds case per reason code).

## Task Commits

1. **Task 65-01-01: Reason-code enum + DraftGuardrailRejection** - `0335e0c` (feat)
2. **Task 65-01-02: Single shared fixture corpus** - `a513e54` (feat)

**Plan metadata:** (docs commit follows this summary)

## Files Created/Modified
- `src/lib/dto/draft-guardrails.ts` - GuardrailReasonCodeSchema + GuardrailReasonCode + GUARDRAIL_MAX_FIELD_LENGTH + DraftGuardrailRejection class
- `src/lib/dto/draft-guardrails.test.ts` - asserts exact 5-member enum + structural no-content-leak guarantee
- `src/server/ai/tools/__fixtures__/draft-step-corpus.ts` - draftStepCorpus.valid (3 types) + draftStepCorpus.counterExamples (5 reason codes)

## Decisions Made
- `DraftGuardrailRejection.name` assigned via `Object.defineProperty({ enumerable: false })` instead of `this.name = ...`. Reason: a plain assignment creates an enumerable own key, breaking the plan's `Object.keys(rejection) === [reasonCode, stepType]` T-65-PII assertion. Non-enumerable name preserves standard `error.name` access while keeping the structural guarantee.
- `GUARDRAIL_MAX_FIELD_LENGTH = 8000` defined here (lowest layer) so 65-02's guardrails.ts references one deterministic threshold.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Non-enumerable `name` on DraftGuardrailRejection**
- **Found during:** Task 1 (test run)
- **Issue:** `this.name = "DraftGuardrailRejection"` (as literally written in the plan action) creates an enumerable own property, so `Object.keys(rejection)` returned `["name","reasonCode","stepType"]` and failed the plan's own `action_after` assertion that keys contain only `reasonCode` + `stepType`.
- **Fix:** Set `name` via `Object.defineProperty(this, "name", { value, enumerable: false, ... })`.
- **Files modified:** src/lib/dto/draft-guardrails.ts
- **Verification:** draft-guardrails.test.ts green (Object.keys === ["reasonCode","stepType"]).
- **Committed in:** `0335e0c`

---

**Total deviations:** 1 auto-fixed (1 bug). **Impact:** Necessary to satisfy the plan's stated T-65-PII acceptance assertion; no scope change.

## Issues Encountered
None — both tasks executed as specified. Pre-existing unrelated working-tree changes (noted in STATE blockers) were left untouched; only the 3 task files were staged/committed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Foundation ready for 65-02 (server-only guardrail validator), 65-03 (command handler), 65-04 (events/contracts payload).
- All three consumers can import `GuardrailReasonCodeSchema` / `DraftGuardrailRejection` / `draftStepCorpus` with zero server-only or cross-feature import violations (no-leak.test.ts green).

## Self-Check: PASSED

- `src/lib/dto/draft-guardrails.ts` — FOUND
- `src/lib/dto/draft-guardrails.test.ts` — FOUND
- `src/server/ai/tools/__fixtures__/draft-step-corpus.ts` — FOUND
- Commit `0335e0c` — FOUND
- Commit `a513e54` — FOUND
- Verification: draft-guardrails.test.ts green, no-leak.test.ts green, enum=5 members, corpus=5 reason codes + 3 valid types

---
*Phase: 65-eval-guardrails-verify-phase-close-gate*
*Completed: 2026-06-01*
