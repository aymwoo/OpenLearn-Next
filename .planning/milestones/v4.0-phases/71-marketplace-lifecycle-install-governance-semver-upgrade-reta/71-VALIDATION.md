---
phase: 71
slug: marketplace-lifecycle-install-governance-semver-upgrade-reta
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-04
---

# Phase 71 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `pnpm vitest run src/lib/dal/plugins.test.ts src/actions/plugin-actions.test.ts src/components/surfaces/plugin-marketplace-surface.test.tsx src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` |
| **Full suite command** | `node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase71-marketplace-lifecycle.ts` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/lib/dal/plugins.test.ts src/actions/plugin-actions.test.ts src/components/surfaces/plugin-marketplace-surface.test.tsx src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx`
- **After every plan wave:** Run `node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase71-marketplace-lifecycle.ts`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 71-01-01 | 01 | 1 | MKT-02 | T-71-01 | phase verifier seeds real quiz owned-data, retained rows, and live sessions before lifecycle proofs run | integration + verifier foundation | `node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase71-marketplace-lifecycle.ts` | ✅ existing | ✅ green |
| 71-02-01 | 02 | 2 | MKT-01 / MKT-04 | T-71-02 | external install preflight rejects invalid manifest/dataModel/conflicts and retained reinstall takes over data with a new plugin identity | unit + surface | `pnpm vitest run src/lib/dal/plugins.test.ts src/actions/plugin-actions.test.ts src/components/surfaces/plugin-marketplace-surface.test.tsx` | ✅ existing | ✅ green |
| 71-03-01 | 03 | 3 | MKT-02 / MKT-03 / MKT-05 | T-71-03 | upgrade keeps old version usable until `verify` passes; cleanup requires real blast-radius token; active classroom hard-blocks destructive ops | integration + verifier | `pnpm vitest run src/features/platform-core/commands/handlers/plugins.test.ts src/lib/dal/plugins.test.ts src/actions/plugin-actions.test.ts && node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase71-marketplace-lifecycle.ts` | ✅ existing | ✅ green |
| 71-04-01 | 04 | 4 | MKT-01 / MKT-02 / MKT-03 / MKT-04 / MKT-05 | T-71-04 | `/settings/plugins` renders the single-page dual-section lifecycle UI with preflight-first, cleanup token, recovery, and active-blocker honesty | surface + manual | `pnpm vitest run src/components/surfaces/plugin-marketplace-surface.test.tsx` | ✅ existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `scripts/verify-phase71-marketplace-lifecycle.ts` — end-to-end verifier for seeded quiz data, upgrade parity, retain/cleanup, and active-session blocking
- [x] `src/components/surfaces/plugin-marketplace-surface.test.tsx` — external dual-section, inline install reject reasons, recover badge, upgrade-preflight-first coverage
- [x] `src/lib/dal/plugins.test.ts` — structured quiz impact counts, audit outcome correctness, retain-recover install path, active classroom blockers
- [x] `src/actions/plugin-actions.test.ts` — install/upgrade/uninstall/recover action coverage plus cache invalidation assertions
- [x] `src/lib/dal/classroom.test.ts` or dedicated lifecycle blocker test — live session destructive-op blocking proof

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| External marketplace visual hierarchy follows Stitch/DESIGN while keeping built-in and external on one page | MKT-01 | Requires human review of tonal surfaces, CTA hierarchy, and governance-summary prominence | Open `/settings/plugins`, compare built-in vs external sections, confirm governance summary appears before install CTA and no separate external route is introduced |
| Upgrade progress communicates `backfill -> verify -> cutover` clearly and verify failure leaves old version posture intact | MKT-02 | Human-readable progress copy and failure-state honesty need UI review beyond data assertions | Trigger an upgrade in the UI against seeded data, confirm three explicit stages render and verify failure copy states that the old version remains usable |
| Cleanup confirmation copy foregrounds real impact counts and token entry before destructive CTA | MKT-03 | Needs copy/interaction review to ensure danger posture is not hidden behind generic modal text | Open cleanup preflight, confirm counts and token are visible before the destructive button and wording matches the governance posture |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified via `pnpm verify:phase71` on 2026-06-05
