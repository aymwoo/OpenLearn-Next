---
phase: 42
slug: operator-visibility-and-recovery
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-19
---

# Phase 42 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + project verifier scripts |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `./node_modules/.bin/vitest --run src/features/async-tasks/server/recovery.test.ts src/actions/async-task-operator-actions.test.ts` |
| **Full suite command** | `pnpm exec tsx scripts/verify-phase42-operator-recovery.ts` |
| **Estimated runtime** | quick ~20 seconds, full ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run one focused smoke pair that completes in under 25 seconds
- **After every plan wave:** Run `./node_modules/.bin/vitest --run src/lib/dal/async-task-operator.test.ts src/components/surfaces/async-task-operator-surface.test.tsx` first, then run `pnpm exec tsx scripts/verify-phase42-operator-recovery.ts`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 25 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 42-01-01 | 01 | 1 | ATP-15 | T-42-01 / T-42-03 | worker heartbeat truth is durable and role-scoped health checks do not trust web in-memory runtime | unit | `./node_modules/.bin/vitest --run src/features/async-tasks/worker/bootstrap.test.ts` | ✅ W0 | ✅ green |
| 42-01-02 | 01 | 1 | ATP-15, ATP-18 | T-42-02 / T-42-05 | operator-related registry metadata stays truthful for school operator visibility and recovery baseline | unit | `./node_modules/.bin/vitest --run src/features/async-tasks/server/registry.reliability.test.ts` | ✅ W0 | ✅ green |
| 42-02-01 | 02 | 2 | ATP-15, ATP-16, ATP-18 | T-42-06 / T-42-09 | operator DAL remains request-fresh and returns overview/detail DTOs with grouped attempts | unit | `./node_modules/.bin/vitest --run src/lib/dal/async-task-operator.test.ts` | ✅ W0 | ✅ green |
| 42-02-02 | 02 | 2 | ATP-15, ATP-16, ATP-18 | T-42-08 / T-42-10 | overview/detail routes only compose DAL output and preserve summary-first UI hierarchy | component | `./node_modules/.bin/vitest --run src/components/surfaces/async-task-operator-surface.test.tsx` | ✅ W0 | ✅ green |
| 42-03-01 | 03 | 3 | ATP-17 | T-42-11 / T-42-12 / T-42-13 | same-task retry contract appends seeded attempt truth and recovery audit without enqueueing a second task | unit | `./node_modules/.bin/vitest --run src/features/async-tasks/server/recovery.test.ts src/features/async-tasks/infra/queue-events.test.ts` | ✅ W0 | ✅ green |
| 42-03-02 | 03 | 3 | ATP-17, ATP-18 | T-42-14 | retry action keeps typed action contract, precise cache invalidation, and correct owner-facing list invalidation | integration | `./node_modules/.bin/vitest --run src/actions/async-task-operator-actions.test.ts` | ✅ W0 | ✅ green |
| 42-03-03 | 03 | 3 | ATP-17, ATP-18 | T-42-15 | verifier script statically guards retry wrapper copy, no-direct-bullmq drift, and Phase 41 regression wiring | smoke | `pnpm exec tsx scripts/verify-phase42-operator-recovery.ts` | ✅ W0 | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/features/async-tasks/worker/bootstrap.test.ts` — heartbeat durable truth and shutdown posture coverage
- [x] `src/features/async-tasks/server/registry.reliability.test.ts` — registry visibility and operatorRecovery baseline coverage
- [x] `src/lib/dal/async-task-operator.test.ts` — operator scope, posture thresholds, problem-task ordering, detail grouping coverage
- [x] `src/components/surfaces/async-task-operator-surface.test.tsx` — overview + detail route/surface summary-first assertions
- [x] `src/features/async-tasks/server/recovery.test.ts` — same-task retry audit and eligibility coverage
- [x] `src/features/async-tasks/infra/queue-events.test.ts` — recovery projection semantics after operator retry
- [x] `src/actions/async-task-operator-actions.test.ts` — action result contract and cache invalidation coverage
- [x] `scripts/verify-phase42-operator-recovery.ts` — canonical phase verifier

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Settings Labs operator IA feels parallel to Runtime Inspector rather than a generic admin console | ATP-15, ATP-18 | tonal hierarchy, visual rhythm, and information smell are easier to confirm in-browser after implementation | Start dev server, open `/settings/labs`, verify async operator quick link copy references worker/queue/backlog/problem tasks and matches existing Labs card rhythm |
| Retry confirm interaction clearly communicates same-task new attempt + recovery event semantics before execution | ATP-17 | exact wording can be statically guarded, but real click-flow comprehension still benefits from one manual pass | Open a failed, recovery-enabled task detail page, trigger `重试此任务`, confirm the popover shows both required sentences and returns to honest retrying copy after submit |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** human verification complete on 2026-05-19; manual-only checks passed.
