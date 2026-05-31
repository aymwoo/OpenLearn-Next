---
phase: 51
slug: command-bus-foundation
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-05-21
source_plans:
  - 51-01-PLAN.md
  - 51-02-PLAN.md
  - 51-03-PLAN.md
---

# Phase 51 - Validation Strategy

> Per-phase execution validation contract for feedback sampling during implementation.

Phase 51 closes only when three truths hold together: the command ledger is durable in SQLite, plugin governance handlers all run through one explicit command family, and the current producer entrypoints no longer bypass the bus through direct DAL mutation seams.

## Validation Mode

- `.planning/config.json` currently sets `workflow.nyquist_validation` to `false`. `[VERIFIED: codebase read .planning/config.json]`
- This file still defines the execution-time validation contract for Phase 51 because `gsd-plan-checker` expects a per-phase validation artifact, but the phase does **not** require Nyquist-specific expansion work beyond the explicit checks listed below.
- `nyquist_compliant: false` is intentional and matches current project config.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Drizzle migration check + Vitest + Phase verifier script |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | task-local verify command from the owning plan |
| **Full suite command** | `pnpm verify:phase51` |
| **Estimated runtime** | quick ~20-60 seconds, full ~120 seconds |

## Sampling Rate

- **After every task commit:** Run the task-local verify command declared in the active Phase 51 plan.
- **After Wave 1:** Run `pnpm db:migrate` and `pnpm test -- --run src/features/platform-core/commands/bus.test.ts`.
- **After Wave 2:** Run `pnpm test -- --run src/lib/dal/plugins.test.ts src/features/platform-core/commands/handlers/plugins.test.ts`.
- **After Wave 3 and at phase close:** Run `pnpm verify:phase51`.
- **Before `/gsd-verify-work`:** `pnpm verify:phase51` must be green.
- **Max feedback latency:** 120 seconds.

`pnpm verify:phase51` is the single external close gate for this phase. It must statically guard producer migration drift, prove the explicit command family remains complete, and run the focused ledger/handler/producer suites in one command.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 51-01-01 | 01 | 1 | CMD-01, CMD-04, CMD-05 | T-51-01 / T-51-02 / T-51-03 | command row + attempt row schema exists, dedupe identity is command-bound, and plugin/governance audits can link back via `commandId` | migration | `pnpm db:migrate` | ✅ planned | ⬜ pending |
| 51-01-02 | 01 | 1 | CMD-01, CMD-02, CMD-05 | T-51-01 / T-51-04 | explicit contract union, registry, validation-before-write, and dedupe/attempt pipeline behavior remain true in bus shell | unit | `pnpm test -- --run src/features/platform-core/commands/bus.test.ts` | ✅ planned | ⬜ pending |
| 51-02-01 | 02 | 2 | CMD-02, CMD-03, CMD-04 | T-51-05 / T-51-08 | tx-aware plugin DAL helpers preserve existing domain rules and write command attribution into audits when context is present | unit | `pnpm test -- --run src/lib/dal/plugins.test.ts` | ✅ planned | ⬜ pending |
| 51-02-02 | 02 | 2 | CMD-02, CMD-03, CMD-04, CMD-05 | T-51-05 / T-51-06 / T-51-07 | all nine plugin governance commands resolve through one explicit handler family; retry appends attempts on same command identity | unit | `pnpm test -- --run src/features/platform-core/commands/handlers/plugins.test.ts` | ✅ planned | ⬜ pending |
| 51-03-01 | 03 | 3 | CMD-01, CMD-03, CMD-05 | T-51-09 / T-51-11 | mutation Server Actions dispatch through shared producer seam and keep cache invalidation only at the action edge | integration | `pnpm test -- --run src/actions/plugin-actions.test.ts` | ✅ planned | ⬜ pending |
| 51-03-02 | 03 | 3 | CMD-03, CMD-05 | T-51-10 / T-51-12 | plugin host governance path and the current repo's real non-UI producer seam use explicit command dispatch instead of direct DAL mutation | unit + script | `pnpm test -- --run src/features/runtime-platform/host-actions/plugin-host.test.ts && pnpm verify:phase51` | ✅ planned | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

## Wave 0 Requirements

- [ ] `drizzle/0013_phase51_command_bus_foundation.sql` will be added by `51-01` and becomes the canonical migration artifact.
- [ ] `drizzle/meta/0013_snapshot.json` will be added by `51-01` and becomes the snapshot anchor for the command ledger schema.
- [ ] `src/features/platform-core/commands/bus.test.ts` will be added by `51-01` and becomes the canonical bus-shell proof.
- [x] `src/lib/dal/plugins.test.ts` exists and is the canonical plugin DAL contract suite.
- [ ] `src/features/platform-core/commands/handlers/plugins.test.ts` will be added by `51-02` and becomes the explicit command-family regression suite.
- [x] `src/actions/plugin-actions.test.ts` exists and can prove Server Action producer migration + cache invalidation behavior.
- [ ] `src/features/runtime-platform/host-actions/plugin-host.test.ts` will be added by `51-03` and becomes the host governance producer proof.
- [ ] `scripts/verify-phase51-command-bus.ts` will be added by `51-03` and becomes the canonical full verifier.
- [ ] `package.json` will expose `verify:phase51` by the end of `51-03`.

## Validation Architecture

Phase 51 uses a four-layer validation stack:

1. **Ledger truth layer**
   Validate that SQLite owns one stable command row plus append-only attempt rows, and that plugin/governance audits can link back to command truth.
2. **Handler truth layer**
   Validate that every in-scope plugin governance command runs through one explicit handler family with stable retry/dedupe semantics.
3. **Producer migration layer**
   Validate that Server Actions, plugin host governance paths, and the current repo's real non-UI producer seam all dispatch through shared producer adapters instead of direct DAL mutation helpers.
4. **Phase close gate**
   Validate that `pnpm verify:phase51` combines static drift checks with focused suites so closeout remains repeatable and auditable.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Settings and marketplace plugin operations still feel identical from the operator side after producer migration | CMD-03 | command-bus cutover can preserve tests while still regressing perceived operator latency/copy flow | Start dev server, open the plugin operator surfaces, toggle enable/disable and uninstall preflight paths, confirm success/failure copy still matches existing product language and no new admin-style friction is introduced |
| Host-triggered governance mutations remain explainable to maintainers as explicit command names, not hidden transition jargon | CMD-02, CMD-03 | naming comprehension across host surfaces is partly a human-factor check | Review the updated host input surface and its docs/tests, confirm maintainers can identify `plugin.enable` / `plugin.disable` / `plugin.suspend` / `plugin.resume` without relying on `plugin.transition` vocabulary |

## Validation Sign-Off

- [x] All plans now have explicit automated verify commands.
- [x] Sampling continuity: no three consecutive execution tasks lack an automated verification step.
- [x] Wave 0 prerequisites are named explicitly, including planned new verifier/test files.
- [x] No watch-mode flags appear in automated commands.
- [x] Feedback latency remains under 120 seconds for the full close gate target.
- [x] `nyquist_compliant: false` matches `.planning/config.json` and is intentional for this phase.

## Exit Criteria

- Phase 51 has one durable command ledger with attempt history in SQLite.
- All in-scope plugin governance commands execute through the explicit command family and preserve same-command retry semantics.
- Server Actions, plugin host governance entrypoints, and the repo's current non-UI plugin producer seam all dispatch through shared command producers.
- `pnpm verify:phase51` is the only external automated close command for the phase.

**Approval:** planning-stage validation strategy drafted on 2026-05-21; execution evidence pending.
