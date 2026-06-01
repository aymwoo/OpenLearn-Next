---
phase: 65-eval-guardrails-verify-phase-close-gate
plan: 02
subsystem: ai
tags: [guardrails, server-only, draft-tool, prompt-injection, deny-list, zod, vitest]

# Dependency graph
requires:
  - phase: 65-01
    provides: "DraftGuardrailRejection + GuardrailReasonCode enum + GUARDRAIL_MAX_FIELD_LENGTH contract; shared draftStepCorpus (valid + counter-examples)"
provides:
  - "server-only pure validator assertStepWithinGuardrails(step) rejecting all 5 reason codes"
  - "exported FORBIDDEN_MARKERS deny-list (named, grep-able for 65-05 static check)"
  - "guardrail interception wired into createDraftLessonStepTool.execute (after aiGenerateObject, before return)"
affects: [65-03, 65-04, 65-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Defense-in-depth chokepoint: untrusted model output validated at the single authoritative generation path before leaving the tool"
    - "Corpus-driven tests: every assertion sourced from the shared draftStepCorpus, no hand-duplicated cases"
    - "Typed assertion function (asserts step is LessonStepPayload) narrows on pass, throws typed rejection on fail"

key-files:
  created:
    - src/server/ai/tools/guardrails.ts
    - src/server/ai/tools/guardrails.test.ts
  modified:
    - src/server/ai/tools/lesson-draft.ts

key-decisions:
  - "illegal_step_type rejection uses sentinel stepType=\"content\" — never echoes arbitrary LLM type literal into the typed rejection (T-65-PII)"
  - "Validation order is deterministic (illegal_step_type → invalid_teaching_structure → quiz_correct_index_out_of_range → oversize_field → forbidden_content) so each counter-example hits exactly one reason code"
  - "Rejection deliberately NOT caught in the tool — propagates to the 65-04 command handler which distinguishes out-of-bounds rejection from real generation failure"

patterns-established:
  - "Guardrail validator: pure, server-only, no DB/DAL/env/network/eval — only deterministic structural judgement"
  - "Named deny-list constant (FORBIDDEN_MARKERS) exported for downstream static grep"

requirements-completed: [EVAL-02]

# Metrics
duration: 5min
completed: 2026-06-01
---

# Phase 65 Plan 02: Draft Guardrail Validator + Tool Wiring Summary

**server-only pure `assertStepWithinGuardrails` rejects every out-of-bounds draft step (illegal type, invalid teaching structure, quiz index overflow, oversize field, injection/forbidden content) as a typed `DraftGuardrailRejection`, wired as the chokepoint inside the draft tool's single generation channel.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-01T02:05:09Z
- **Completed:** 2026-06-01T02:09:48Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `assertStepWithinGuardrails(step)` — server-only, pure validator covering all 5 reason codes with deterministic ordering; narrows `step` to `LessonStepPayload` on pass.
- `FORBIDDEN_MARKERS` deny-list (prompt-injection / `<script` / `eval(` / `drop table` / `system prompt`) scans every free-text field of the generated step (T-65-INJ).
- Wired the guardrail into `createDraftLessonStepTool.execute` immediately after `aiGenerateObject` and before `return step`, so out-of-bounds output is structurally impossible to return (SC2 part 1).
- Corpus-driven test suite (12 cases) proving every counter-example rejects with the correct reason code and every valid step passes; no-leak and existing tool tests stay green.

## Task Commits

Each task was committed atomically:

1. **Task 1: server-only guardrail validator** - `1c28885` (feat)
2. **Task 2: corpus-driven guardrail tests** - `0701574` (test)
3. **Task 3: wire guardrail into draft-tool execute** - `9062d5c` (feat)

## Files Created/Modified
- `src/server/ai/tools/guardrails.ts` - Pure server-only validator + exported `FORBIDDEN_MARKERS` deny-list.
- `src/server/ai/tools/guardrails.test.ts` - 12 cases sourced from shared corpus: per-reason-code rejection, valid passes, T-65-PII structural check, non-object inputs, deny-list export.
- `src/server/ai/tools/lesson-draft.ts` - Added `assertStepWithinGuardrails(step)` call in `execute` (after generation, before return) + import.

## Decisions Made
- **Sentinel stepType for illegal types:** `illegal_step_type` rejections set `stepType="content"` rather than reflecting the untrusted LLM literal, keeping the typed rejection from carrying arbitrary model-controlled strings (T-65-PII).
- **Deterministic validation order:** structural invariants checked before quiz-index/oversize/forbidden, so the shared corpus counter-examples each map to a single, stable reason code.
- **No catch at the tool:** the rejection propagates uncaught; routing to a `rejected` event is the 65-04 command handler's responsibility.
- **Import discipline:** imported only `DraftGuardrailRejection` + `GUARDRAIL_MAX_FIELD_LENGTH` + `LessonStepPayload` (avoided unused-import lint by not pulling the unused schemas).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EVAL-02 guardrail chokepoint complete; `DraftGuardrailRejection` now thrown from the live generation path, ready for the 65-04 command handler to catch and record as a `rejected` event.
- `FORBIDDEN_MARKERS` is a named export ready for the 65-05 static-check grep.
- No blockers.

---
*Phase: 65-eval-guardrails-verify-phase-close-gate*
*Completed: 2026-06-01*

## Self-Check: PASSED

All created files exist on disk; all 3 task commits present in git history.
