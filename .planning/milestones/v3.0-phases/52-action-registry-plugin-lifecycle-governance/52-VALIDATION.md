---
phase: 52
slug: action-registry-plugin-lifecycle-governance
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-22
source_plans:
  - 52-01-PLAN.md
  - 52-02-PLAN.md
  - 52-03-PLAN.md
  - 52-04-PLAN.md
  - 52-05-PLAN.md
  - 52-06-PLAN.md
  - 52-07-PLAN.md
  - 52-08-PLAN.md
---

# Phase 52 - Validation Strategy

> Per-phase validation contract and audit trail for Nyquist coverage.

Phase 52 closes only when three truths stay aligned at the same time: action discovery is machine-readable and split from blocked diagnostics, plugin lifecycle governance is projected through one external contract, and every operator recovery or uninstall path is enforced by the same server-owned read/write seams.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x + phase verifier script + completed UAT artifacts |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run src/features/platform-core/actions/static-catalog.test.ts src/features/platform-core/commands/handlers/plugins.test.ts src/actions/plugin-actions.test.ts src/features/platform-core/plugins/governance-projection.test.ts src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx src/components/surfaces/settings-surface.test.tsx src/lib/dal/plugins.test.ts` |
| **Full suite command** | `pnpm run verify:phase52` |
| **Estimated runtime** | quick ~10 seconds, full ~20 seconds |

## Sampling Rate

- **After every task commit:** Run the task-local verify command declared in the owning Phase 52 plan.
- **After Wave 1:** Run `pnpm exec vitest run src/features/platform-core/actions/static-catalog.test.ts src/features/platform-core/plugins/governance-projection.test.ts`.
- **After Wave 2:** Run `pnpm exec vitest run src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx && pnpm tsx scripts/verify-phase52-action-registry-and-lifecycle.ts`.
- **After Waves 3-6 and at phase close:** Run `pnpm run verify:phase52`.
- **Before `/gsd-verify-work`:** `pnpm run verify:phase52` must be green.
- **Max feedback latency:** 20 seconds.

`pnpm run verify:phase52` is the single external close gate for this phase. It must statically guard action registry, lifecycle projection, reconcile wiring, retained uninstall truth, and operator recovery dispatch drift, then run the focused Phase 52 suites in one command.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 52-01-01 | 01 | 1 | ACTN-01, ACTN-04, ACTN-05 | T-52-01-01 / T-52-01-02 / T-52-01-03 | typed action descriptor, executable catalog DTO, and blocked diagnostic DTO stay split and machine-readable | unit | `pnpm exec vitest run src/features/platform-core/actions/static-catalog.test.ts` | ✅ | ✅ green |
| 52-01-02 | 01 | 1 | ACTN-02, ACTN-05 | T-52-01-01 / T-52-01-03 | static catalog projection rejects duplicate action keys and preserves main-repo-only authority | unit | `pnpm exec vitest run src/features/platform-core/actions/static-catalog.test.ts` | ✅ | ✅ green |
| 52-02-01 | 02 | 1 | LIFE-01, LIFE-03, LIFE-04, LIFE-05, LIFE-06 | T-52-02-01 / T-52-02-03 / T-52-02-04 | external lifecycle, reason code, and recovery action contract remain stable and explicit | unit | `pnpm exec vitest run src/features/platform-core/plugins/governance-projection.test.ts` | ✅ | ✅ green |
| 52-02-02 | 02 | 1 | ACTN-03, LIFE-02, LIFE-03, LIFE-05, LIFE-06 | T-52-02-02 / T-52-02-03 / T-52-02-04 | dependency ordering, failure attribution, and uninstall governance projection block only affected chains and never auto-recover | unit | `pnpm exec vitest run src/features/platform-core/plugins/governance-projection.test.ts` | ✅ | ✅ green |
| 52-03-01 | 03 | 2 | ACTN-03, ACTN-04, LIFE-01, LIFE-02, LIFE-03, LIFE-05, LIFE-06 | T-52-03-01 / T-52-03-02 | ordinary server and host reads expose executable actions only, while blocked diagnostics stay operator-only | integration | `pnpm exec vitest run src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts` | ✅ | ✅ green |
| 52-03-02 | 03 | 2 | ACTN-03, LIFE-01, LIFE-03, LIFE-04, LIFE-05, LIFE-06 | T-52-03-03 / T-52-03-04 | operator surface keeps executable catalog and governance diagnostics in separate views, with explicit retain-first uninstall UX | component | `pnpm exec vitest run src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` | ✅ | ✅ green |
| 52-03-03 | 03 | 2 | ACTN-03, ACTN-04, LIFE-01, LIFE-02, LIFE-03, LIFE-04, LIFE-05, LIFE-06 | T-52-03-01 / T-52-03-02 / T-52-03-03 / T-52-03-04 | phase verifier remains the canonical close gate for registry, lifecycle, and operator semantics | script | `pnpm exec vitest run src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx && pnpm tsx scripts/verify-phase52-action-registry-and-lifecycle.ts` | ✅ | ✅ green |
| 52-04-01 | 04 | 3 | ACTN-03, LIFE-05 | T-52-04-01 / T-52-04-02 | retain and cleanup uninstall semantics are enforced by the server with deterministic confirmation tokens | integration | `pnpm exec vitest run src/actions/plugin-actions.test.ts src/lib/dal/plugins.test.ts` | ✅ | ✅ green |
| 52-04-02 | 04 | 3 | LIFE-02 | T-52-04-03 / T-52-04-04 | dependency-aware activation ordering and reason-matched host recovery enter the real write path | integration | `pnpm exec vitest run src/features/platform-core/plugins/governance-projection.test.ts src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts` | ✅ | ✅ green |
| 52-04-03 | 04 | 3 | ACTN-03, LIFE-02, LIFE-05 | T-52-04-01 / T-52-04-03 / T-52-04-04 | live schema and phase close gate stay aligned after cleanup token and dependency-path hardening | script | `npx drizzle-kit push && pnpm run verify:phase52` | ✅ | ✅ green |
| 52-05-01 | 05 | 4 | ACTN-03, ACTN-04, LIFE-01, LIFE-03, LIFE-04, LIFE-06 | T-52-05-01 / T-52-05-02 / T-52-05-03 | settings and operator surfaces consume one governance dashboard bundle instead of raw plugin DTO inference | component | `pnpm exec vitest run src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` | ✅ | ✅ green |
| 52-05-02 | 05 | 4 | ACTN-03, ACTN-04, LIFE-01, LIFE-03, LIFE-04, LIFE-06 | T-52-05-01 / T-52-05-02 / T-52-05-03 | verifier rejects UI drift back to `listPluginsAction`, `PluginRegistrationDTO`, or client-side lifecycle guessing | script | `pnpm run verify:phase52` | ✅ | ✅ green |
| 52-06-01 | 06 | 5 | LIFE-01, LIFE-06 | T-52-06-01 / T-52-06-02 | retained uninstall metadata flows through DAL snapshot and governance projection as real `uninstalled` state | integration | `pnpm exec vitest run src/lib/dal/plugins.test.ts src/features/platform-core/plugins/governance-projection.test.ts` | ✅ | ✅ green |
| 52-06-02 | 06 | 5 | LIFE-01, LIFE-06 | T-52-06-03 | operator diagnostics render `uninstalled` as audit-only with no primary recovery action | component | `pnpm exec vitest run src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` | ✅ | ✅ green |
| 52-07-01 | 07 | 5 | ACTN-03, LIFE-02, LIFE-03 | T-52-07-01 / T-52-07-03 | `plugin.reconcile` exists as a real command family and fails loudly when dependency problems remain unresolved | unit | `pnpm exec vitest run src/features/platform-core/commands/handlers/plugins.test.ts` | ✅ | ✅ green |
| 52-07-02 | 07 | 5 | ACTN-03, LIFE-02, LIFE-03 | T-52-07-01 / T-52-07-02 / T-52-07-03 | producer, server action, and host recovery gate expose reconcile explicitly and only for dependency-blocked recovery | integration | `pnpm exec vitest run src/actions/plugin-actions.test.ts src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts` | ✅ | ✅ green |
| 52-08-01 | 08 | 6 | ACTN-03, LIFE-01, LIFE-03 | T-52-08-01 / T-52-08-03 | diagnostics CTA dispatches explicit enable, retry, resume, and reconcile actions by recommendation and keeps `uninstalled` actionless | component | `pnpm exec vitest run src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` | ✅ | ✅ green |
| 52-08-02 | 08 | 6 | ACTN-03, LIFE-01, LIFE-03 | T-52-08-02 | verifier guards reconcile wiring, retained uninstall truth, and operator recovery drift as long-term close evidence | script | `pnpm run verify:phase52` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

## Wave 0 Requirements

- [x] `src/features/platform-core/actions/static-catalog.test.ts` — action descriptor and duplicate-key regression coverage
- [x] `src/features/platform-core/plugins/governance-projection.test.ts` — lifecycle, dependency, and uninstall projection coverage
- [x] `src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts` — host gating and diagnostics separation coverage
- [x] `src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` — operator diagnostics, recovery CTA, and audit-only rendering coverage
- [x] `src/components/surfaces/settings-surface.test.tsx` — governance dashboard bundle wiring coverage
- [x] `src/features/platform-core/commands/handlers/plugins.test.ts` — reconcile and dependency-chain handler coverage
- [x] `src/actions/plugin-actions.test.ts` — server action dispatch and invalidation coverage
- [x] `src/lib/dal/plugins.test.ts` — uninstall contract, retained uninstall metadata, and namespace parity coverage
- [x] `scripts/verify-phase52-action-registry-and-lifecycle.ts` — canonical phase close gate
- [x] `drizzle/0011_phase44_plugin_identity_namespace.sql` — stable namespace parity corpus fixture required by `src/lib/dal/plugins.test.ts`

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Operator diagnostics end-to-end recovery flow *(passed in `52-UAT.md`)* | ACTN-03, LIFE-02, LIFE-03 | requires real browser, server action, data refresh, and operator flow confirmation beyond focused component tests | Open `settings/labs`, switch to `查看治理诊断`, trigger `运行 reconcile` on a `dependency_missing` or `dependency_cycle` plugin, and confirm the UI refreshes to the updated governance state without falling back to a generic enable path |
| Retain uninstall audit-only presentation *(passed in `52-UAT.md`)* | LIFE-01, LIFE-05, LIFE-06 | requires a real user-flow check that audit-only rendering remains honest after a destructive governance action | Perform retain uninstall for an external plugin, revisit governance diagnostics, and confirm the row shows `已卸载`, keeps the uninstall summary, and exposes no primary lifecycle action |

## Validation Audit 2026-05-22

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

Resolved gap summary:

- `phase52-verify-fixture`: `pnpm run verify:phase52` was blocked by a missing namespace parity corpus file referenced from `src/lib/dal/plugins.test.ts`. Nyquist audit restored the test-side fixture at `drizzle/0011_phase44_plugin_identity_namespace.sql`, preserving adversarial parity coverage without changing implementation code.

## Validation Sign-Off

- [x] All tasks have automated verify evidence or completed manual UAT coverage
- [x] Sampling continuity: no 3 consecutive execution tasks lack automated verification
- [x] Wave 0 covers all required test files, verifier scripts, and supporting fixtures
- [x] No watch-mode flags appear in automated commands
- [x] Feedback latency < 20s for the full close gate in current local verification
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-22 after `pnpm run verify:phase52` passed and `52-UAT.md` recorded both manual checks as passed.
