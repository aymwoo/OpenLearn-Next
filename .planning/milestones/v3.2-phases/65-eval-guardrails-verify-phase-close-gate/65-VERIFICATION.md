---
phase: 65-eval-guardrails-verify-phase-close-gate
verified: 2026-06-01T11:00:00Z
status: passed
score: 3/3 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
---

# Phase 65: Eval, Guardrails & verify:phase Close Gate — Verification Report

**Phase Goal:** 建立 AI 起草链路的质量与闭环闸门：可重复 eval 验证起草输出 schema 合法性与基本教学结构；guardrails 拦截越界输出并记录；`verify:phase` close gate 对整条链路做端到端回归，作为里程碑 close 的单一权威闸门。
**Verified:** 2026-06-01T11:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification
**Methodology:** Goal-backward. Each EVAL requirement verified against actual codebase (existence → substance → live wiring → data/control flow), not SUMMARY claims. Test subset and typecheck re-run independently.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria → EVAL-01/02/03)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 (SC1 / EVAL-01) | 存在可重复运行的 eval，验证起草输出 schema 合法性 + 基本教学结构达标 | ✓ VERIFIED | `src/server/ai/tools/lesson-draft.eval.test.ts` — deterministic fixture-driven Vitest; mocks `server-only`, `@/server/ai/providers` (facade), and read-only DAL → no network / no provider key. Replays shared `draftStepCorpus.valid` through the LIVE `createDraftLessonStepTool().execute`, asserts `lessonStepPayloadSchema.safeParse` legality (content/task/quiz) + D-02 teaching invariants (non-empty title/body; non-empty prompt + valid submissionType; ≥2 options + in-range correctOptionIndex). **6/6 tests pass** on independent re-run. |
| 2 (SC2 / EVAL-02) | guardrails 拦截越界输出（非法类型/超长/注入禁止内容），被拦截输出记录可查 | ✓ VERIFIED | `src/server/ai/tools/guardrails.ts` — server-only pure `assertStepWithinGuardrails` covering all 5 reason codes with deterministic ordering + `FORBIDDEN_MARKERS` deny-list. **Wired into the LIVE execute path**: `lesson-draft.ts:67` calls it after `aiGenerateObject` (line 57) and before `return step` (line 70) — out-of-bounds output is structurally unreturnable. "记录可查" delivered via `lesson.draft.rejected` domain event (contracts.ts:314-331) + handler branch (lesson-draft.ts:145-168). |
| 3 (SC3 / EVAL-03) | `verify:phase` close gate 对链路做端到端回归，作为里程碑 close 单一权威闸门 | ✓ VERIFIED | `scripts/verify-phase65-eval-guardrails.ts` — 14 static D-10 boundary checks → `npm run build` → Phase 61–65 Vitest regression subset (18 files), `process.exit(1)` on any failure. `package.json`: `verify:phase65` + authoritative `verify:phase` → `pnpm verify:phase65`. **18 files / 145 tests pass** on independent re-run; `tsc --noEmit` clean. |

**Score:** 3/3 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/dto/draft-guardrails.ts` | reason-code enum + content-leak-proof rejection | ✓ VERIFIED | 5-member `GuardrailReasonCodeSchema`; `GUARDRAIL_MAX_FIELD_LENGTH=8000`; `DraftGuardrailRejection` carries only `{reasonCode, stepType}` with non-enumerable `name` (T-65-PII). Non-server-only (line 1 = `import { z }`). |
| `src/server/ai/tools/guardrails.ts` | server-only pure validator | ✓ VERIFIED | `import "server-only"`; pure (no DB/DAL/env/network/eval); 5 reason codes; exported `FORBIDDEN_MARKERS`. |
| `src/server/ai/tools/lesson-draft.ts` | guardrail wired into execute | ✓ WIRED | `assertStepWithinGuardrails(step)` at line 67, post-generation, pre-return. |
| `src/server/ai/tools/__fixtures__/draft-step-corpus.ts` | shared corpus (3 valid + 5 counter-examples) | ✓ VERIFIED | `valid` = content/task/quiz; `counterExamples` = exactly 1 per reason code, `satisfies DraftCounterExample[]`. |
| `src/server/ai/tools/lesson-draft.eval.test.ts` | EVAL-01 eval suite | ✓ VERIFIED | 6 tests, deterministic, corpus-driven, green. |
| `src/features/platform-core/events/contracts.ts` | rejected event contract | ✓ VERIFIED | `LessonDraftRejectedEventSchema` registered in 3 sites; payload `summaryOnlyStrictPayload({lessonId, stepType, reasonCode, teacherId})`; `reasonCode` typed via `GuardrailReasonCodeSchema`; `.strict()`. |
| `src/features/platform-core/commands/handlers/lesson-draft.ts` | instanceof rejection branch | ✓ VERIFIED | catch branches FIRST on `instanceof DraftGuardrailRejection` (line 145) → `successResult` + single `lesson.draft.rejected` event; real failures → `throwDraftFailure` (line 171). |
| `scripts/verify-phase65-eval-guardrails.ts` | close gate | ✓ VERIFIED | 14 static checks + build + 18-file vitest subset, `process.exit(1)` on failure. |
| `package.json` | verify:phase65 + verify:phase alias | ✓ VERIFIED | Both scripts present and exact. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `lesson-draft.ts` execute | `guardrails.ts` | `assertStepWithinGuardrails(step)` | ✓ WIRED | Live call between generation and return (line 67). |
| `guardrails.ts` | `draft-guardrails.ts` (dto) | import `DraftGuardrailRejection`, `GUARDRAIL_MAX_FIELD_LENGTH` | ✓ WIRED | Throws typed rejection on every reason code. |
| handler `executeLessonDraftRun` | `DraftGuardrailRejection` | `instanceof` in catch | ✓ WIRED | Splits rejection (resolved outcome) from failure (D-11 honored). |
| handler rejection branch | `lesson.draft.rejected` contract | `withAudit({eventType:"lesson.draft.rejected", payload:{...reasonCode}})` | ✓ WIRED | Field `reasonCode` (canonical), summary-only payload, no step snapshot. |
| close gate | EVAL-01 suite + guardrail tests + event tests | `runVitest([...18 files])` | ✓ WIRED | EVAL-01 `lesson-draft.eval.test.ts` explicitly included (line 268). |
| `verify:phase` | `verify:phase65` | npm script alias | ✓ WIRED | `"verify:phase": "pnpm verify:phase65"`. |

### Data/Control-Flow Trace (D-11 decision)

Guardrail rejection → tool `execute` throws `DraftGuardrailRejection` (uncaught in tool) → handler catch `instanceof` true → returns `successResult` (NOT `platform.command.failed`) → emits ONE `lesson.draft.rejected` domain event carrying typed `reasonCode` + summary-only payload (no content leak). Genuine generation errors bypass the branch → `throwDraftFailure` → generic failure event. **Decision D-11 fully implemented as specified.**

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 65 eval/guardrail/event subset green | `vitest run` (5 files) | 5 files / 40 tests passed | ✓ PASS |
| Full Phase 61–65 regression subset green | `vitest run` (18 files) | 18 files / 145 tests passed | ✓ PASS |
| Type safety | `tsc --noEmit` | exit 0, no errors | ✓ PASS |
| All 11 task commits present | `git log` grep | 11/11 found | ✓ PASS |
| Full `verify:phase65` build gate | `pnpm verify:phase65` | NOT re-run (slow build, optional per scope) | ? SKIP |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| EVAL-01 | repeatable eval: schema legality + teaching structure | ✓ SATISFIED | `lesson-draft.eval.test.ts` (6 tests green) |
| EVAL-02 | guardrails block + record out-of-bounds output | ✓ SATISFIED | `guardrails.ts` + wired execute + `lesson.draft.rejected` event + handler branch |
| EVAL-03 | `verify:phase` close gate, single authoritative milestone gate | ✓ SATISFIED | `verify-phase65` script + `verify:phase` alias; 18/145 green, typecheck clean |

No orphaned requirements. REQUIREMENTS.md and ROADMAP.md both mark all three Complete; codebase corroborates.

### Anti-Patterns Found

None. No TODO/FIXME/placeholder/stub patterns in delivered files. Validator is pure; rejection error is content-leak-proof by construction (non-enumerable `name`, structural `{reasonCode, stepType}` only); rejected event payload is `.strict()` summary-only.

### Human Verification Required

None — all truths are programmatically verifiable (deterministic tests, static wiring, typecheck) and were independently confirmed.

### Gaps Summary

No gaps. All three EVAL requirements are delivered with live wiring, not stubs:
- The EVAL-01 eval exercises the real `createDraftLessonStepTool().execute` (facade mocked deterministically per design D-01) — by design it validates schema/teaching-structure determinism, not live LLM output, which is the correct, repeatable, key-free eval contract.
- The EVAL-02 guardrail sits at the single authoritative generation chokepoint and its rejection is recorded as a queryable domain event distinct from system failure (D-11).
- The EVAL-03 close gate is the single authoritative `verify:phase` alias with build + 18-file regression + 14 static boundary checks.

### Concerns (non-blocking)

1. **Full `verify:phase65` build gate not re-run by verifier** — the `npm run build` portion is slow and explicitly optional for this read-only verification. It was reported green during execution (65-05-SUMMARY: build OK, 18/18 files, 145/145 tests, exit 0), and the verifier independently re-confirmed the 18-file vitest subset (145 passed) + `tsc --noEmit` (clean). Residual risk limited to the production build step only; low given typecheck is green.

---

## Overall Verdict: PASSED

All 3 must-haves (EVAL-01/02/03) verified against the actual codebase with live wiring confirmed. Independent re-run: 18 test files / 145 tests pass, typecheck clean, all 11 task commits present. Phase 65 goal achieved; milestone v3.2 close gate is functional and authoritative.

---

_Verified: 2026-06-01T11:00:00Z_
_Verifier: gsd-verifier (goal-backward)_
