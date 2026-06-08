---
phase: 73
slug: multi-type-quiz-schema-live-ws-event-teacher-live-dashboard
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-07
---

# Phase 73 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing in project) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm run test:unit` |
| **Full suite command** | `pnpm run test:ci` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm run test:unit`
- **After every plan wave:** Run `pnpm run test:ci`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 73-01-01 | 01 | 1 | QUIZ-EXT-01-A | — | N/A | unit | `pnpm vitest run tests/quiz/schema.test.ts` | ✅ W0 | ⬜ pending |
| 73-01-02 | 01 | 1 | QUIZ-EXT-01-B | — | N/A | unit | `pnpm vitest run tests/quiz/data-model.test.ts` | ✅ W0 | ⬜ pending |
| 73-01-03 | 01 | 1 | QUIZ-EXT-01-C | — | N/A | unit | `pnpm vitest run tests/quiz/dal.test.ts` | ✅ W0 | ⬜ pending |
| 73-01-04 | 01 | 1 | QUIZ-EXT-01-D | T-73-01 | append-only/isLatest across 5 types | integration | `pnpm vitest run tests/quiz/submit.test.ts` | ✅ W0 | ⬜ pending |
| 73-01-05 | 01 | 1 | QUIZ-EXT-01-E | — | N/A | unit | `pnpm vitest run tests/quiz/recap-stats.test.ts` | ✅ W0 | ⬜ pending |
| 73-02-01 | 02 | 1 | QUIZ-EXT-02-A | T-73-02 | teacher-only WS channel | integration | `pnpm vitest run tests/classroom/ws-events.test.ts` | ✅ W0 | ⬜ pending |
| 73-02-02 | 02 | 1 | QUIZ-EXT-02-B | T-73-03 | Redis fanout parity | contract | `pnpm vitest run tests/classroom/fanout.test.ts` | ✅ W0 | ⬜ pending |
| 73-02-03 | 02 | 1 | QUIZ-EXT-02-C | — | access control | unit | `pnpm vitest run tests/classroom/dashboard.test.ts` | ✅ W0 | ⬜ pending |
| 73-02-04 | 02 | 1 | QUIZ-EXT-02-D | — | N/A | component | `pnpm vitest run tests/classroom/live-view.test.ts` | ✅ W0 | ⬜ pending |
| 73-02-05 | 02 | 1 | QUIZ-EXT-02-E | T-73-04 | zero write Server Actions | static | `grep` static assertion | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/quiz/schema.test.ts` — stubs for QUIZ-EXT-01-A
- [x] `tests/quiz/data-model.test.ts` — stubs for QUIZ-EXT-01-B
- [x] `tests/quiz/dal.test.ts` — stubs for QUIZ-EXT-01-C
- [x] `tests/quiz/submit.test.ts` — stubs for QUIZ-EXT-01-D
- [x] `tests/quiz/recap-stats.test.ts` — stubs for QUIZ-EXT-01-E
- [x] `tests/classroom/ws-events.test.ts` — stubs for QUIZ-EXT-02-A
- [x] `tests/classroom/fanout.test.ts` — stubs for QUIZ-EXT-02-B
- [x] `tests/classroom/dashboard.test.ts` — stubs for QUIZ-EXT-02-C
- [x] `tests/classroom/live-view.test.ts` — stubs for QUIZ-EXT-02-D

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 写操作隔离 grep 断言 | QUIZ-EXT-02-E | Static grep, no runtime | `grep -r "update\|delete\|grade" src/components/classroom/live-answer-dashboard-surface.tsx` — must produce no matches |
| Redis fanout contract parity | QUIZ-EXT-02-B | Requires REDIS_URL env toggle | Run test suite with and without REDIS_URL set; assert behavioral equivalence |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** ✅ ready
