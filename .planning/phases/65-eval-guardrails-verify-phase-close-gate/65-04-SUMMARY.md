---
phase: 65-eval-guardrails-verify-phase-close-gate
plan: 04
subsystem: platform-core/events + commands
tags: [events, guardrails, lesson-draft, eval, contracts]
requires: [65-01]
provides:
  - "lesson.draft.rejected domain event contract (summary-only payload)"
  - "executeLessonDraftRun guardrail-rejection branch (resolved outcome, not failure)"
affects:
  - src/features/platform-core/events/contracts.ts
  - src/features/platform-core/commands/handlers/lesson-draft.ts
tech-stack:
  added: []
  patterns:
    - "instanceof DraftGuardrailRejection splits recoverable rejection from genuine failure"
    - "summaryOnlyStrictPayload for PII-safe domain event payloads (D-07)"
key-files:
  created: []
  modified:
    - src/features/platform-core/events/contracts.ts
    - src/features/platform-core/events/contracts.test.ts
    - src/features/platform-core/commands/handlers/lesson-draft.ts
    - src/features/platform-core/commands/handlers/lesson-draft.events.test.ts
decisions:
  - "Guardrail rejection is a resolved success-type outcome emitting one lesson.draft.rejected event, NOT a platform.command.failed (D-11/D-53-08 preserved)"
  - "Rejected payload built from cause.stepType/cause.reasonCode only — never a step snapshot (T-65-PII/D-07)"
metrics:
  duration: 6m
  completed: 2026-06-01
requirements: [EVAL-02]
---

# Phase 65 Plan 04: lesson.draft.rejected Event + Handler Branch Summary

Guardrail-intercepted lesson drafts are now recorded as a queryable, summary-only `lesson.draft.rejected` domain event distinct from system failures, by classifying the tool throw via `instanceof DraftGuardrailRejection` in `executeLessonDraftRun`.

## What Was Built

### Task 65-04-01: Register `LessonDraftRejectedEventSchema` (commit `ec81ae2`)
- Added `LessonDraftRejectedPayloadSchema` via `summaryOnlyStrictPayload` carrying exactly `{ lessonId, stepType, reasonCode, teacherId }` — strict, rejects `*Json` keys and unknown fields.
- Added `LessonDraftRejectedEventSchema` mirroring the `LessonDraftAppliedEventSchema` analog exactly (domain category, lesson aggregate, audit default).
- Registered in all three sites: `PlatformEventSchema` discriminatedUnion, `PlatformDomainEventSchema` union, and exported `LessonDraftRejectedEvent` + `LessonDraftRejectedPayload` types.
- Imported `GuardrailReasonCodeSchema` from `@/lib/dto/draft-guardrails` (downward dependency; events never reach up to `server/ai/tools`).
- `contracts.test.ts`: union-membership parse, `*Json`/snapshot + undeclared-field rejection, invalid `reasonCode` rejection.

### Task 65-04-02: Handler distinguishes rejection from failure (commit `035bd2e`)
- Imported `DraftGuardrailRejection`; `executeLessonDraftRun` catch now branches FIRST on `instanceof DraftGuardrailRejection`.
- Rejection path returns `successResult` with `resultSummary { stepType, reasonCode, rejected: true }`, empty invalidation, and a single `lesson.draft.rejected` event (no requested/tool.invoked/produced — a rejected draft produced nothing).
- Genuine errors fall through to `throwDraftFailure` → `PlatformCommandExecutionError` + generic failure event, no domain event (D-53-08/D-11 unchanged).
- `lesson-draft.events.test.ts`: `mockToolRejecting` helper, resolved-outcome assertion (no throw, `failureEvent === null`, 1 event, payload keys exactly `[lessonId, reasonCode, stepType, teacherId]`, schema-valid); the existing real-error regression case is preserved.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx vitest run src/features/platform-core/events/contracts.test.ts src/features/platform-core/commands/handlers/lesson-draft.events.test.ts` → 18 passed.
- `grep -c LessonDraftRejectedEventSchema contracts.ts` → 4; `grep lesson.draft.rejected` → match.
- `grep instanceof DraftGuardrailRejection lesson-draft.ts` → match inside catch before `throwDraftFailure`.
- `npx tsc --noEmit` → exit 0 (control-flow: `throwDraftFailure` returns `never`, so `step` remains definitely-assigned after the catch).

## Threat Flags

None — no security surface introduced beyond the plan's threat model (T-65-EVT and T-65-PII both mitigated and asserted).

## Self-Check: PASSED
- FOUND: src/features/platform-core/events/contracts.ts (LessonDraftRejectedEventSchema, 3 sites)
- FOUND: src/features/platform-core/commands/handlers/lesson-draft.ts (instanceof branch)
- FOUND commit ec81ae2
- FOUND commit 035bd2e
