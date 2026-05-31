---
phase: 58
slug: operator-recovery-and-production-surfaces
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 58 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

Phase 58 closes only when operator/support can start from a classroom incident, see a truthful degraded posture, trace related runtime/plugin/command/task state from one authoritative read model, and execute recovery actions without bypassing audited server-owned seams.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest@4.1.5` in repo |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `pnpm exec vitest --run src/components/classroom/classroom-control-panel.test.tsx src/actions/classroom-actions.test.ts src/components/surfaces/runtime-inspector-surface.test.tsx src/components/surfaces/async-task-operator-surface.test.tsx src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` |
| **Full suite command** | `pnpm verify:phase58` |
| **Estimated runtime** | ~120-300 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest --run src/components/classroom/classroom-control-panel.test.tsx src/actions/classroom-actions.test.ts src/components/surfaces/runtime-inspector-surface.test.tsx src/components/surfaces/async-task-operator-surface.test.tsx src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx`
- **After every plan wave:** Run `pnpm verify:phase58`
- **Before `/gsd-verify-work`:** `pnpm verify:phase58` plus the Phase 58 operator walkthrough proof must be green
- **Max feedback latency:** 300 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 58-01-01 | 01 | 1 | OPS-01 | T-58-01 / — | classroom/session read model correlates school, lesson version, runtime session, plugin, command, and task truth from one server-owned seam | unit + integration | `pnpm exec vitest --run src/lib/dal/classroom-incident-operator.test.ts src/components/surfaces/classroom-incident-operator-surface.test.tsx` | ❌ W0 | ⬜ pending |
| 58-02-01 | 02 | 2 | OPS-02 | T-58-02 / T-58-03 | degraded posture renders the fixed trust-boundary template with impact scope and next-step guidance | component + verifier | `pnpm exec vitest --run src/components/surfaces/classroom-incident-operator-surface.test.tsx scripts/verify-phase58-operator-recovery-and-surfaces.test.ts` | ❌ W0 | ⬜ pending |
| 58-03-01 | 03 | 3 | OPS-03, PLUG-03 | T-58-04 / T-58-05 | recovery action availability is reason-gated; high-risk actions stay off the summary surface and keep audit-safe recovery semantics | action + component | `pnpm exec vitest --run src/actions/operator-classroom-recovery-actions.test.ts src/actions/plugin-actions.test.ts src/components/surfaces/classroom-incident-operator-surface.test.tsx src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` | ❌ W0 / ✅ partial | ⬜ pending |
| 58-04-01 | 04 | 4 | SAFE-02 | T-58-06 | retry/recovery paths append auditable history, invalidate cache tags, and do not overwrite durable truth in place | regression | `pnpm exec vitest --run src/actions/classroom-actions.test.ts src/features/async-tasks/server/recovery.test.ts src/actions/async-task-operator-actions.test.ts` | ✅ / partial W0 for new incident actions | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/dal/classroom-incident-operator.test.ts` — correlation read-model coverage for OPS-01
- [ ] `src/components/surfaces/classroom-incident-operator-surface.test.tsx` — summary-first IA, honesty template, and action visibility coverage
- [ ] `src/app/settings/labs/incidents/page.tsx` route/source assertions — incident-list-first entry
- [ ] `src/app/settings/labs/incidents/[sessionId]/page.tsx` route/source assertions — classroom-anchored incident detail
- [ ] `scripts/verify-phase58-operator-recovery-and-surfaces.ts` — phase-scoped verifier
- [ ] `scripts/verify-phase58-operator-recovery-and-surfaces.test.ts` — verifier self-test
- [ ] `package.json` entry `verify:phase58`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| operator can understand a degraded classroom without misreading it as a hard stop | OPS-02 | trust-boundary copy, visual emphasis, and escalation timing need real browser judgment | Open a degraded classroom incident, confirm the surface first explains what remains trustworthy, then impact scope, then next step |
| support can start from the incident list and reach the right detail without manually copying IDs | OPS-01, OPS-03 | cross-surface wayfinding is hard to prove fully with unit tests | From Settings Labs incident list, enter an affected classroom and follow the provided links to runtime/plugin/task detail without manual ID lookup |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or explicit Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing incident-route, incident-surface, and phase-verifier references
- [ ] No watch-mode flags appear in automated commands
- [ ] Feedback latency remains under 300 seconds for the quick gate
- [ ] `nyquist_compliant: true` can only be set after Phase 58 verification artifacts are green

**Approval:** pending
