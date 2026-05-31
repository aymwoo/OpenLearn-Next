---
phase: 53
slug: platform-event-bus-execution-observability
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-22
source_plans:
  - 53-01-PLAN.md
  - 53-02-PLAN.md
  - 53-03-PLAN.md
  - 53-04-PLAN.md
---

# Phase 53 - Validation Strategy

> Per-phase validation contract and Nyquist coverage plan for platform event truth, delivery seams, and operator-visible execution observability.

Phase 53 closes only when four truths stay aligned: platform events remain distinct from command envelopes, SQLite owns an independent platform event ledger/outbox, delivery adapters remain transport-only over persisted truth, and operator visibility stays command-first with event timeline drill-down rather than raw stream browsing.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x + phase verifier script |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | task-local verify command from the active plan |
| **Full suite command** | `pnpm verify:phase53` |
| **Estimated runtime** | quick ~10-20 seconds, full ~30 seconds |

## Sampling Rate

- **After every task commit:** Run the task-local verify command declared in the owning Phase 53 plan.
- **After Wave 1 (`53-01`):** Run `pnpm vitest run src/features/platform-core/events/contracts.test.ts src/features/platform-core/events/ledger.test.ts`.
- **After Wave 2 (`53-02` and `53-03`):** Run `pnpm vitest run src/features/platform-core/commands/handlers/plugins.events.test.ts src/features/platform-core/commands/bus.test.ts src/features/platform-core/events/bus.test.ts src/features/platform-core/events/adapters.test.ts`.
- **After Wave 3 and at phase close (`53-04`):** Run `pnpm verify:phase53`.
- **Before `/gsd-verify-work`:** `pnpm verify:phase53` must be green.
- **Max feedback latency:** 30 seconds.

`pnpm verify:phase53` is the single external close gate for this phase. It must statically guard truth ownership, block noisy invalidation event drift, reject Redis/WebSocket truth claims, and prevent Phase 54 descriptor/capability leakage before running the focused Phase 53 suites.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 53-01-01 | 01 | 1 | EVNT-02, EVNT-05, EVNT-06 | T-53-01 / T-53-03 / T-53-04 | typed platform event contracts stay summary-only, failure-safe, and distinct from command envelopes | unit | `pnpm vitest run src/features/platform-core/events/contracts.test.ts` | ✅ planned | ⬜ pending |
| 53-01-02 | 01 | 1 | EVNT-02, EVNT-05, EVNT-06 | T-53-02 / T-53-04 | SQLite owns independent platform event ledger/outbox truth and command-summary carrying fields | integration | `pnpm vitest run src/features/platform-core/events/ledger.test.ts` | ✅ planned | ⬜ pending |
| 53-02-01 | 02 | 2 | EVNT-01, EVNT-02, EVNT-05 | T-53-05 / T-53-07 | successful handlers emit generic/domain events explicitly and failed handlers emit only one generic failure event | unit | `pnpm vitest run src/features/platform-core/commands/handlers/plugins.events.test.ts` | ✅ planned | ⬜ pending |
| 53-02-02 | 02 | 2 | EVNT-01, EVNT-02, EVNT-05 | T-53-06 / T-53-08 | `dispatchPlatformCommand()` persists command summary first, then event truth, without runtime-bus or cache side effects | integration | `pnpm vitest run src/features/platform-core/commands/bus.test.ts` | ✅ planned | ⬜ pending |
| 53-03-01 | 03 | 2 | EVNT-03, EVNT-04, EVNT-05 | T-53-09 / T-53-11 | platform subscribers consume persisted event truth through a platform-scoped bus and isolated dispatch records | unit | `pnpm vitest run src/features/platform-core/events/bus.test.ts` | ✅ planned | ⬜ pending |
| 53-03-02 | 03 | 2 | EVNT-03, EVNT-04, EVNT-05 | T-53-10 / T-53-12 | in-process delivery works and future Redis/WebSocket bridges stay contract-only, delivery-only, and non-authoritative | unit | `pnpm vitest run src/features/platform-core/events/adapters.test.ts` | ✅ planned | ⬜ pending |
| 53-04-01 | 04 | 3 | EVNT-03, EVNT-04, EVNT-06, EVNT-07 | T-53-13 / T-53-14 / T-53-15 | producer composition injects the concrete persisted-event publication port, `/settings/labs` consumes the operator entrypoint, and operator surface remains command-summary-first with event timeline drill-down and invalidation visible only on summary | integration | `pnpm vitest run src/features/platform-core/commands/producers/plugin-governance.test.ts src/features/platform-core/observability/operator-read-model.test.ts src/components/surfaces/settings-surface.test.tsx` | ✅ planned | ⬜ pending |
| 53-04-02 | 04 | 3 | EVNT-01, EVNT-02, EVNT-03, EVNT-04, EVNT-05, EVNT-06, EVNT-07 | T-53-15 / T-53-16 | `verify:phase53` statically blocks truth inversion and scope creep, then runs all focused Phase 53 suites | script | `pnpm verify:phase53` | ✅ planned | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

## Wave 0 Requirements

- [ ] `src/features/platform-core/events/contracts.test.ts` will be added by `53-01` and becomes the contract guard for typed platform event families.
- [ ] `src/features/platform-core/events/ledger.test.ts` will be added by `53-01` and becomes the durable truth/outbox regression suite.
- [ ] `src/features/platform-core/commands/handlers/plugins.events.test.ts` will be added by `53-02` and becomes the explicit handler emission proof.
- [ ] `src/features/platform-core/commands/bus.test.ts` will be extended by `53-02` to cover persist-before-notify and generic failure-event rules.
- [ ] `src/features/platform-core/events/bus.test.ts` will be added by `53-03` and becomes the platform subscriber seam proof.
- [ ] `src/features/platform-core/events/adapters.test.ts` will be added by `53-03` and becomes the transport-only adapter ownership proof.
- [ ] `src/features/platform-core/commands/producers/plugin-governance.test.ts` will be added by `53-04` and becomes the real command-path publication wiring proof.
- [ ] `src/features/platform-core/observability/operator-read-model.test.ts` will be added by `53-04` and becomes the command-first operator summary proof.
- [ ] `src/components/surfaces/settings-surface.test.tsx` will be extended by `53-04` and becomes the `/settings/labs` operator entrypoint integration proof.
- [ ] `scripts/verify-phase53-platform-events.ts` will be added by `53-04` and becomes the canonical close gate.
- [ ] `package.json` will expose `verify:phase53` by the end of `53-04`.

## Validation Architecture

Phase 53 uses a four-layer validation stack:

1. **Contract and truth layer**
   Validate that command result contracts, typed event envelopes, and SQLite-backed platform event truth stay distinct from runtime transport seams.
2. **Command emission layer**
   Validate that handlers own domain-event emission semantics and failure paths only emit one generic failure event.
3. **Delivery seam layer**
   Validate that persisted events can be consumed by platform subscribers and that all concrete/future adapters stay delivery-only over persisted truth.
4. **Operator and regression gate layer**
   Validate that command summaries surface invalidation and failure attribution directly, and that `verify:phase53` blocks future truth/scope drift.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Operator execution summary remains understandable for maintainers after platform-event wiring | EVNT-06, EVNT-07 | human comprehension of summary-first diagnostics is partly UX/copy driven and not fully captured by server-side tests | Open the operator-facing execution summary surface once implemented, inspect one success and one failure command, and confirm the primary mental model is still “command result first, event timeline second” without requiring raw event decoding |
| In-process subscriber delivery remains side-effect consumer only and does not get treated as the new truth source in maintainer docs or runtime reasoning | EVNT-03, EVNT-04 | architectural posture can drift in explanations even if tests stay green | Review code comments / docs around platform event adapters and confirm they explicitly describe SQLite ledger as truth owner and in-process delivery as a consumer of persisted events |

## Validation Sign-Off

- [x] All plans have explicit automated verify commands.
- [x] Sampling continuity: no three consecutive execution tasks lack automated verification.
- [x] Wave 0 prerequisites are named explicitly, including planned new tests and verifier script.
- [x] No watch-mode flags appear in automated commands.
- [x] `nyquist_compliant: true` matches `.planning/config.json`.
- [x] Feedback latency target remains under 30 seconds for the full close gate.

## Exit Criteria

- Phase 53 has one independent SQLite platform event ledger/outbox truth.
- Successful commands emit typed platform events and failed commands emit only one generic failure event.
- Platform subscribers consume persisted events without depending on classroom runtime transport.
- Operator diagnostics remain command-first with event timeline drill-down.
- `pnpm verify:phase53` is the canonical automated close command for the phase.

**Approval:** planning-stage validation strategy drafted on 2026-05-22; execution evidence pending.
