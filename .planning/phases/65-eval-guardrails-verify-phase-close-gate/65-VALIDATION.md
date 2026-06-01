---
phase: 65
slug: eval-guardrails-verify-phase-close-gate
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-01
---

# Phase 65 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 `[VERIFIED: package.json]` |
| **Config file** | `vitest.config.mts` (include glob `src/**/*.{test,spec}.ts`, `scripts/**/*.test.ts`; testTimeout 30000) |
| **Quick run command** | `npx vitest run src/server/ai/tools/lesson-draft.eval.test.ts` |
| **Full suite command** | `npx vitest run` (CI single run; `npm test` is watch) |
| **Estimated runtime** | ~30 seconds (targeted AI subset); close gate adds full `npm run build` |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <changed eval/guardrail/handler test>`
- **After every plan wave:** Run targeted AI subset `npx vitest run src/server/ai/ src/features/platform-core/commands/handlers/lesson-draft.events.test.ts src/features/platform-core/events/contracts.test.ts`
- **Before `/gsd-verify-work`:** `npm run verify:phase` must be green (build + AI subset + eval suite + Phase 61–65 static checks)
- **Max feedback latency:** ~30 seconds (targeted run); close gate is heavier and runs at phase/milestone boundary

---

## Per-Task Verification Map

> Task IDs (`65-PP-TT`) are assigned by the planner; rows below bind each phase requirement to its concrete automated check. Plans MUST map their tasks onto these requirement lines (Dimension 8).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 65-PP-TT | TBD | 1 | EVAL-01 | — | Draft output schema-valid (`lessonStepPayloadSchema.safeParse`) + teaching invariants (content/task/quiz) on deterministic mock-model replay; no network/provider key | eval (unit) | `npx vitest run src/server/ai/tools/lesson-draft.eval.test.ts` | ❌ W0 | ⬜ pending |
| 65-PP-TT | TBD | 1 | EVAL-02 | T-65-INJ (forbidden-content injection) | Guardrail rejects out-of-bounds step (illegal type / oversize / `correctOptionIndex>=options.length` / forbidden content); tool `execute` throws typed `DraftGuardrailRejection`, no step returned | unit | `npx vitest run src/server/ai/tools/guardrails.test.ts` | ❌ W0 | ⬜ pending |
| 65-PP-TT | TBD | 2 | EVAL-02 | T-65-EVT (event leak) | Command handler resolves rejection as **success/rejected outcome** and emits `lesson.draft.rejected` (NOT `platform.command.failed`); satisfies D-53-08 (D-11) | handler integration | `npx vitest run src/features/platform-core/commands/handlers/lesson-draft.events.test.ts` | ✅ extend | ⬜ pending |
| 65-PP-TT | TBD | 2 | EVAL-02 | T-65-PII (payload over-share) | `lesson.draft.rejected` contract is summary-only (lessonId, stepType, reasonCode, teacherId; NO step snapshot / `*Json`) and registered in the event discriminatedUnion | contract | `npx vitest run src/features/platform-core/events/contracts.test.ts` | ✅ extend | ⬜ pending |
| 65-PP-TT | TBD | 3 | EVAL-03 | — | `verify:phase` close gate aggregates build + AI test subset + eval suite + Phase 61–65 static contract checks; any failure → `process.exit(1)` | script (smoke) | `npm run verify:phase` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/server/ai/tools/guardrails.ts` (+ reason-code enum module) — guardrail implementation under test (EVAL-02)
- [ ] `src/server/ai/tools/guardrails.test.ts` — pure-function unit stubs, one per reason code (EVAL-02)
- [ ] `src/server/ai/tools/lesson-draft.eval.test.ts` — eval stub covering EVAL-01 (+ shares corpus for EVAL-02 negative cases, per D-03)
- [ ] Extend `src/features/platform-core/commands/handlers/lesson-draft.events.test.ts` — stub asserting `lesson.draft.rejected` on guardrail rejection (EVAL-02 / D-11)
- [ ] Extend `src/features/platform-core/events/contracts.test.ts` — stub for `LessonDraftRejectedEventSchema` summary-only + union membership (EVAL-02 / D-07)
- [ ] `scripts/verify-phase65-<slug>.ts` + `package.json` scripts `verify:phase65` and authoritative alias `verify:phase` (EVAL-03 / D-08, D-09)
- Framework install: none — Vitest 4.1.5 already present.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| (none) | — | — | — |

*All phase behaviors have automated verification.* EVAL-03 is itself the authoritative automated close gate; no manual close step beyond running `npm run verify:phase`.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (use `vitest run`, not `vitest`)
- [ ] Feedback latency < 30s (targeted runs)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
