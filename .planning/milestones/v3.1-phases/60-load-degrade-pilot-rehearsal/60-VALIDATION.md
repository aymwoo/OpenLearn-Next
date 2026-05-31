---
phase: 60
slug: load-degrade-pilot-rehearsal
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-28
---

# Phase 60 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + Playwright 1.59.1 library proof + k6 v2.0.0 target |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `pnpm exec vitest --run scripts/verify-phase60-load-and-rehearsal.test.ts` |
| **Full suite command** | `pnpm verify:phase57 && pnpm verify:phase58 && pnpm verify:phase59 && pnpm verify:phase60` |
| **Estimated runtime** | ~600 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest --run scripts/verify-phase60-load-and-rehearsal.test.ts`
- **After every plan wave:** Run `pnpm verify:phase57 && pnpm verify:phase58 && pnpm verify:phase59 && pnpm verify:phase60`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 600 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 60-01-01 | 01 | 0 | LOAD-01 | T-60-01 | `verify:phase60` exposes exact script contract, static artifact checks, and stop-rule helper coverage before any rehearsal runs | unit | `pnpm exec vitest --run scripts/verify-phase60-load-and-rehearsal.test.ts` | ❌ W0 | ⬜ pending |
| 60-02-01 | 02 | 1 | LOAD-01 | T-60-02 | Capacity gate preserves `5 classroom x 40 student actor` semantics and fails on breached thresholds | protocol load | `k6 run scripts/load/phase60-capacity.k6.js` or Docker equivalent | ❌ W0 | ⬜ pending |
| 60-03-01 | 03 | 1 | LOAD-02, OPS-02 | T-60-03 | Redis degraded, worker backlog, reconnect/retry, and partial failure drills stay aligned with existing honesty posture | protocol + seam tests | `k6 run scripts/load/phase60-drills.k6.js` plus focused Vitest assertions | ❌ W0 | ⬜ pending |
| 60-04-01 | 04 | 2 | ENVR-03, SAFE-03 | T-60-04 | Controlled rollback rehearsal only passes when `health + ready + sample smoke` recover on the rollback target | scripted rehearsal | `pnpm verify:phase60` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-phase60-load-and-rehearsal.ts` — unified close-gate orchestrator
- [ ] `scripts/verify-phase60-load-and-rehearsal.test.ts` — verifier helper and stop-rule coverage
- [ ] `scripts/load/phase60-capacity.k6.js` — 40/5 scenario gate
- [ ] `scripts/load/phase60-drills.k6.js` — degraded/backlog/reconnect/partial-failure drills
- [ ] `package.json` — add `verify:phase60` script entry
- [ ] `ops/releases/evidence/phase60/` or equivalent — rehearsal summary and rehearsal note artifacts

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| transport fallback rehearsal | LOAD-02, OPS-02 | D-60-06 locks transport fallback as rehearsal/runbook execution, not first-choice automated gate | Execute the fallback path using the approved runbook, record trigger, impact scope, operator action, and final conclusion in the phase 60 evidence artifact |
| controlled rollout/rollback operator narration | ENVR-03, SAFE-03 | The rollback trigger and checklist execution need human confirmation even when scripts are reused | Run the canonical rollout/rollback checklists, note the blocker that triggered rollback, and attach post-rollback `health + ready + sample smoke` results |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 600s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
