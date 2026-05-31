---
phase: 57
slug: classroom-runtime-sample-chain
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-25
---

# Phase 57 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

Phase 57 closes only when the classroom voting sample chain proves five truths together: launch binds the correct published snapshot and only blocks on true blockers, teacher voting control stays on the classroom-control chain, student voting submit writes canonical progress/submission/evidence truth through the runtime bridge, reconnect/duplicate/cutoff semantics remain replay-safe, and the teacher classroom view shows real-time aggregate results plus an incomplete roster rather than raw logs.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + repo-local browser/UAT proof |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `pnpm vitest run src/features/runtime-platform/classroom/runtime-session.test.ts src/actions/classroom-actions.test.ts src/actions/learning-actions.test.ts src/lib/dal/learning.test.ts src/components/learning/classroom-runtime-client.test.tsx` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | quick ~60-120 seconds, full ~180-300 seconds |

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/features/runtime-platform/classroom/runtime-session.test.ts src/actions/classroom-actions.test.ts src/actions/learning-actions.test.ts src/lib/dal/learning.test.ts src/components/learning/classroom-runtime-client.test.tsx`
- **After every plan wave:** Run `pnpm vitest run`
- **Before `/gsd-verify-work`:** Full suite plus `pnpm verify:phase57` must be green; `verify:phase57` itself must include the browser/UAT hard gate
- **Max feedback latency:** 300 seconds

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 57-01-01 | 01 | 1 | CHAIN-03, SAFE-01 | T-57-01 / — | launch readiness only blocks on blocker issues and launch binds the correct `publishedVersionId` / snapshot truth | action + DAL | `pnpm vitest run src/actions/classroom-actions.test.ts` | ✅ existing suite, extended and verified | ✅ green |
| 57-02-01 | 02 | 2 | CHAIN-03, CHAIN-04, SAFE-02 | T-57-02 / T-57-03 | teacher trigger/end stays on classroom control chain, preserves version conflict handling, and drives student voting state plus forced focus to the current voting step | action + component | `pnpm vitest run src/actions/classroom-actions.test.ts src/components/classroom/classroom-control-panel.test.tsx src/components/learning/classroom-runtime-client.test.tsx` | ✅ existing suites, extended and verified | ✅ green |
| 57-03-01 | 03 | 3 | CHAIN-04, SAFE-01, SAFE-02 | T-57-04 / T-57-05 / T-57-06 | voting submit writes canonical evidence/submission/progress, same-payload repeats are deduped, reconnect restores submitted state, and post-close submits are rejected | runtime session + DAL + component | `pnpm vitest run src/features/runtime-platform/classroom/runtime-session.test.ts src/actions/learning-actions.test.ts src/lib/dal/learning.test.ts src/components/learning/classroom-runtime-client.test.tsx` | ✅ existing suites, extended and verified | ✅ green |
| 57-04-01 | 04 | 4 | CHAIN-05, PLUG-03 | T-57-07 / T-57-08 | teacher result read model shows aggregate results, incomplete roster, folded named detail, classroom-visible failure consequences, and current-round recovery actions | DAL + action + component | `pnpm vitest run src/lib/dal/classroom.test.ts src/actions/classroom-actions.test.ts src/components/classroom/classroom-control-panel.test.tsx src/components/classroom/classroom-roster-panel.test.tsx` | ✅ coverage landed and verified | ✅ green |
| 57-05-01 | 05 | 5 | CHAIN-03, CHAIN-04, CHAIN-05, SAFE-01, SAFE-02 | T-57-09 | end-to-end sample chain proves launch -> teacher trigger -> student completion -> teacher result visibility with published snapshot binding intact, and browser/UAT proof is part of the close gate | browser/UAT | `pnpm proof:phase57` (and `pnpm verify:phase57` must call it) | ✅ proof script landed and wired | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

## Wave 0 Requirements

- [x] `vitest.config.mts` exists and is the canonical test config.
- [x] `src/features/runtime-platform/classroom/runtime-session.test.ts` exists and already covers save/submit separation baseline.
- [x] `src/actions/classroom-actions.test.ts` exists and already covers classroom control baseline.
- [x] `src/actions/learning-actions.test.ts` exists and already covers learning submit baseline.
- [x] `src/lib/dal/learning.test.ts` exists and already covers canonical write/read baseline.
- [x] `src/lib/dal/classroom.test.ts` or equivalent DAL test file must cover voting aggregation, incomplete roster, and frozen-result read model.
- [x] `src/components/classroom/classroom-control-panel.test.tsx` needs teacher voting control / result-panel cases.
- [x] `src/components/learning/classroom-runtime-client.test.tsx` needs synchronized voting-state / submitted-waiting / reconnect cases.
- [x] A phase-scoped browser/UAT proof command must be added for launch -> trigger -> submit -> teacher result visibility, and wired into `verify:phase57` as a hard gate.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Teacher can recognize classroom-internal degraded warning without confusing it for a hard stop | CHAIN-03, PLUG-03 | copy, timing, and panel hierarchy are best judged in the real browser shell | Launch a sample classroom with a voting step, simulate a degraded/runtime warning, and confirm the teacher remains in the classroom with a visible warning plus next-step guidance |
| Student submitted-waiting state feels clear in the real runtime shell | CHAIN-04 | UX pacing and status copy are hard to prove fully with unit tests | Join as a student, submit a vote, verify the runtime shows a stable “已提交，等待老师结束” style state until the teacher ends the round |

## Validation Sign-Off

- [x] All expected Phase 57 task clusters now have explicit automated verify commands.
- [x] Sampling continuity: no three consecutive task clusters lack an automated verification step.
- [x] Wave 0 gaps are explicit instead of hidden inside later execution.
- [x] No watch-mode flags appear in automated commands.
- [x] Feedback latency target stays under 300 seconds for the quick gate.
- [x] `nyquist_compliant: true` can only be set after the execution artifacts and commands above are green.

**Approval:** execution evidence complete on 2026-05-25; `pnpm proof:phase57` and `pnpm verify:phase57` are green.
