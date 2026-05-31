---
phase: 54
slug: ai-native-contract-exposure
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-22
source_plans:
  - 54-01-PLAN.md
  - 54-02-PLAN.md
  - 54-03-PLAN.md
  - 54-04-PLAN.md
---

# Phase 54 - Validation Strategy

> Per-phase validation contract for machine-readable descriptor exposure, delegated metadata, and scope-fenced AI-native contracts.

Phase 54 closes only when four truths stay aligned: descriptor discovery remains machine-readable and code-owned, capability and command/action metadata stay consistent with their upstream source-of-truth contracts, delegated actor / approval metadata stays summary-only without privilege escalation, and the phase does not drift into full Agent Runtime / Skill Runtime implementation.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x + phase verifier script |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | task-local verify command from the active plan |
| **Full suite command** | `pnpm verify:phase54` |
| **Estimated runtime** | quick ~10-20 seconds, full ~30 seconds |

## Sampling Rate

- **After every task commit:** Run the task-local verify command declared in the owning Phase 54 plan.
- **After Wave 1 (`54-01`, `54-02`):** run focused contract + registry/read-model suites.
- **After Wave 2 (`54-03`, `54-04`) and at phase close:** run `pnpm verify:phase54`.
- **Before `/gsd-verify-work`:** `pnpm verify:phase54` must be green.
- **Max feedback latency:** 30 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 54-01-01 | 01 | 1 | AINT-01, AINT-02 | shared descriptor contracts stay machine-readable, versioned, and code-owned | unit | `pnpm vitest run src/features/platform-core/ai-contracts/contracts.test.ts` | ⬜ planned | ⬜ pending |
| 54-02-01 | 02 | 1 | AINT-01, AINT-02, AINT-05 | command/action/capability discovery lists are projected from real repo truth sources and do not invent unavailable capabilities | integration | `pnpm vitest run src/features/platform-core/ai-contracts/registry.test.ts src/features/platform-core/ai-contracts/read-model.test.ts` | ⬜ planned | ⬜ pending |
| 54-03-01 | 03 | 2 | AINT-03, AINT-04 | delegated actor and approval metadata stay summary-only and do not imply implicit privilege escalation | unit | `pnpm vitest run src/features/platform-core/ai-contracts/delegation.test.ts` | ⬜ planned | ⬜ pending |
| 54-04-01 | 04 | 2 | AINT-01, AINT-04, AINT-05 | minimal discovery/operator surface consumes AI-native contract read model without becoming a runtime console | integration | `pnpm vitest run src/components/surfaces/settings-surface.test.tsx src/features/platform-core/ai-contracts/read-model.test.ts` | ⬜ planned | ⬜ pending |
| 54-04-02 | 04 | 2 | AINT-01, AINT-02, AINT-03, AINT-04, AINT-05 | `verify:phase54` blocks authority drift, privilege escalation, and full runtime scope creep | script | `pnpm verify:phase54` | ⬜ planned | ⬜ pending |

## Exit Criteria

- command/action/capability descriptors are machine-readable and sourced from existing authoritative contracts.
- delegated actor and approval metadata exist as summary-level contract fields.
- no Phase 54 artifact implies full Agent Runtime / Skill Runtime delivery.
- `pnpm verify:phase54` is the canonical close gate for the phase.

**Approval:** planning-stage validation strategy drafted on 2026-05-22; execution evidence pending.
