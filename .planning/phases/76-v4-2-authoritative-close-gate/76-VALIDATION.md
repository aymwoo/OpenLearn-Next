---
phase: 76
slug: v4-2-authoritative-close-gate
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-11
---

# Phase 76 — Validation Strategy

> Per-phase validation contract for v4.2 authoritative close gate. This phase produces verification scripts and documentation — validation focuses on script correctness, gate stage pass/fail, and regression integrity.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.5 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test run` |
| **Full suite command** | `pnpm test run && pnpm verify:phase` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run relevant gate stage script
- **After every plan wave:** Run full gate pipeline (`pnpm verify:phase`)
- **Before `/gsd:verify-work`:** Full suite must be green + all stages pass
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 76-01-01 | 01 | 1 | Gate 骨架 | T-76-01 / — | Alias is idempotent, no destructive ops | unit | `pnpm verify:phase --dry-run` | ❌ W0 | ⬜ pending |
| 76-02-01 | 02 | 2 | Stage 1-2 回归 | T-76-02 / — | Regression doesn't modify data | integration | `pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate` | ✅ | ⬜ pending |
| 76-03-01 | 03 | 3 | Stage 3 homework | T-76-03 / — | Homework tests run in isolation | integration | `pnpm verify:phase75` | ✅ | ⬜ pending |
| 76-04-01 | 04 | 4 | Stage 4 cross-plugin | T-76-04 / — | Cross-plugin tests don't interfere | integration | `pnpm verify:v42-cross-plugin` | ❌ W0 | ⬜ pending |
| 76-05-01 | 05 | 5 | Formal verification | T-76-05 / — | Proof map is deterministic | unit | `pnpm tsx scripts/verify-v42-formal.ts` | ❌ W0 | ⬜ pending |
| 76-06-01 | 06 | 6 | Sign-off + closeout | T-76-06 / — | Sign-off ledger can't be forged | manual | Manual surface verification | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/plugins/homework/__tests__/cross-plugin-regression.test.ts` — existing regression (Phase 75), verify green
- [ ] `package.json` §scripts — existing verify aliases, verify functional

*Existing infrastructure covers all phase requirements. Wave 0 validates existing test infrastructure before gate stage creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Manual Surface Sign-Off (8 rows) | D-07, D-08 | Requires human observation of UI surfaces | Open each surface, verify visual correctness, record status+date+signer |
| v4.2 MILESTONE-AUDIT review | D-10 | Requires human review of audit dimensions | Review audit report, verify all dimensions scored, sign off |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
