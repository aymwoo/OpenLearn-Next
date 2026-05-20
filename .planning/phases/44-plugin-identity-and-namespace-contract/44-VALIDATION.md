---
phase: 44
slug: plugin-identity-and-namespace-contract
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-20
source_plans:
  - 44-01-PLAN.md
  - 44-02-PLAN.md
  - 44-03-PLAN.md
  - 44-04-PLAN.md
---

# Phase 44 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

Phase 44 focuses on a frozen plugin identity and `dbNamespace` contract. Validation must
prove three things together rather than separately: SQL truth is upgraded once,
DAL/action writes cannot fork a second identity model, and default plugin bootstrap +
built-in dispatch + operator surfaces all consume the same canonical contract.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + phase verifier script + SQLite schema checks |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | task-local `pnpm exec vitest --run ...` or static schema check from the active plan |
| **Full suite command** | `pnpm verify:phase44` |
| **Estimated runtime** | quick ~20-45 seconds, full ~90 seconds |

## Sampling Rate

- **After every task commit:** Run the task-local verify command declared in the owning PLAN.
- **After Wave 1:** Run `pnpm db:migrate` plus the Phase 44 schema/static checks from `44-01`.
- **After Wave 2:** Run `pnpm exec vitest --run src/lib/dal/plugins.test.ts src/actions/plugin-actions.test.ts`.
- **After Wave 3:** Run `pnpm exec vitest --run src/lib/dal/plugins.builtins.test.ts scripts/bootstrap-dev-db.test.ts`.
- **After Wave 4 and at phase close:** Run `pnpm verify:phase44`.
- **Before `/gsd-verify-work`:** `pnpm verify:phase44` must be green.
- **Max feedback latency:** 90 seconds.

`pnpm verify:phase44` is the single external close gate for this phase. It must statically
guard schema, DAL, bootstrap, registry, and UI identity drift, and then run the focused
Phase 44 suites in one command.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 44-01-00 | 01 | 1 | PLUG-01, PLUG-02, PLUG-03 | preflight | GitNexus impact analysis is recorded before editing schema/DTO symbols | manual-summary | `Read 44-01-SUMMARY.md for gitnexus impact + detect_changes log` | ✅ planned | ⬜ pending |
| 44-01-01 | 01 | 1 | PLUG-01, PLUG-02, PLUG-03 | T-44-01 / T-44-02 / T-44-03 | plugin registration rows gain durable `pluginKey`, `dbNamespace`, provenance columns, and school-scoped unique truth | static + schema | `python - <<'PY' ...` static check from `44-01-PLAN.md` | ✅ planned | ⬜ pending |
| 44-01-02 | 01 | 1 | PLUG-01, PLUG-02, PLUG-03 | T-44-02 / T-44-03 | migration-first DB flow applies the contract to SQLite and exposes new columns/indexes via `PRAGMA` / `sqlite_master` | integration | `pnpm db:migrate && node --input-type=module --import tsx -e "...PRAGMA table_info..."` | ✅ planned | ⬜ pending |
| 44-02-00 | 02 | 2 | PLUG-01, PLUG-02, PLUG-03, PLUG-04 | preflight | GitNexus impact analysis is recorded before editing DAL/action identity seams | manual-summary | `Read 44-02-SUMMARY.md for gitnexus impact + detect_changes log` | ✅ planned | ⬜ pending |
| 44-02-01 | 02 | 2 | PLUG-01, PLUG-02, PLUG-03, PLUG-04 | T-44-05 / T-44-06 / T-44-08 | DAL install/reconcile seam writes canonical identity, preserves frozen namespace, and rejects school conflicts with explicit tokens | unit | `pnpm exec vitest --run src/lib/dal/plugins.test.ts` | ✅ planned | ⬜ pending |
| 44-02-02 | 02 | 2 | PLUG-01, PLUG-02, PLUG-03, PLUG-04 | T-44-07 / T-44-09 | Server Actions stay thin, delegate to DAL, and preserve cache invalidation plus conflict surfacing | integration | `pnpm exec vitest --run src/actions/plugin-actions.test.ts src/lib/dal/plugins.test.ts` | ✅ planned | ⬜ pending |
| 44-03-00 | 03 | 3 | PLUG-04 | preflight | GitNexus impact analysis is recorded before editing bootstrap and built-in dispatch symbols | manual-summary | `Read 44-03-SUMMARY.md for gitnexus impact + detect_changes log` | ✅ planned | ⬜ pending |
| 44-03-01 | 03 | 3 | PLUG-04 | T-44-10 / T-44-11 / T-44-13 | default plugin bootstrap moves to the shared reconcile seam and preserves stable `pluginId` for historical lesson payloads | unit | `pnpm exec vitest --run scripts/bootstrap-dev-db.test.ts` | ✅ planned | ⬜ pending |
| 44-03-02 | 03 | 3 | PLUG-04 | T-44-12 / T-44-13 | built-in teaching definitions resolve by canonical key instead of `pluginName`, while display copy survives | unit | `pnpm exec vitest --run src/lib/dal/plugins.builtins.test.ts scripts/bootstrap-dev-db.test.ts` | ✅ planned | ⬜ pending |
| 44-04-00 | 04 | 4 | PLUG-01, PLUG-02, PLUG-04 | preflight | GitNexus impact analysis is recorded before editing operator surfaces and verifier entrypoints | manual-summary | `Read 44-04-SUMMARY.md for gitnexus impact + detect_changes log` | ✅ planned | ⬜ pending |
| 44-04-01 | 04 | 4 | PLUG-01, PLUG-02, PLUG-04 | T-44-14 | settings and marketplace surfaces render formal plugin metadata without regressing existing product semantics | component | `pnpm exec vitest --run src/components/surfaces/settings-surface.test.tsx src/components/surfaces/plugin-marketplace-surface.test.tsx` | ✅ planned | ⬜ pending |
| 44-04-02 | 04 | 4 | PLUG-01, PLUG-02, PLUG-03, PLUG-04 | T-44-15 / T-44-16 | `verify:phase44` becomes the single close gate and catches schema/DAL/bootstrap/registry/UI drift in one command | script | `node --import tsx scripts/verify-phase44-plugin-identity.ts` | ✅ planned | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

## Wave 0 Requirements

- [x] `src/lib/dal/plugins.test.ts` exists and is the canonical DAL contract suite for plugin install/reconcile.
- [x] `src/actions/plugin-actions.test.ts` exists and can prove Server Action delegation + cache invalidation.
- [x] `src/lib/dal/plugins.builtins.test.ts` exists and can prove built-in dispatch contract behavior.
- [x] `scripts/bootstrap-dev-db.test.ts` exists and can prove default plugin bootstrap posture.
- [x] `src/components/surfaces/settings-surface.test.tsx` exists and can prove operator-facing metadata rendering.
- [ ] `src/components/surfaces/plugin-marketplace-surface.test.tsx` will be added by `44-04` and then becomes required by the close gate.
- [ ] `scripts/verify-phase44-plugin-identity.ts` will be added by `44-04` and then becomes the canonical full verifier.

## Validation Architecture

Phase 44 uses a layered validation stack:

1. **Schema truth layer**
   Validate `pluginKey`, `dbNamespace`, provenance columns, and school-scoped unique indexes at both source and SQLite runtime levels.
2. **DAL/action truth layer**
   Validate that all writes flow through one install/reconcile seam, conflict tokens stay explicit, and default-enabled policy does not silently override operator state.
3. **Bootstrap/registry compatibility layer**
   Validate that default plugin reconcile preserves stable `pluginId` and built-in registry no longer uses `pluginName` as canonical identity.
4. **Operator-facing truth layer**
   Validate that settings and marketplace surfaces read formal DTO fields directly and do not regress the existing visual/product language.
5. **Phase close gate**
   Validate that `pnpm verify:phase44` combines static drift checks with focused test suites so closeout is repeatable and auditable.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Settings Labs and plugin marketplace still feel like the same Luminous Academy surface family after metadata expansion | PLUG-01, PLUG-02, PLUG-04 | tonal hierarchy, Lexend rhythm, and no-line surface nesting are easiest to verify in-browser after implementation | Start dev server, open the settings labs plugin card list and the built-in marketplace surface, verify the new metadata appears without introducing divider lines, border-heavy cards, or off-system typography |
| A maintainer can explain plugin identity from one screen without opening raw JSON | PLUG-01, PLUG-02 | comprehension of `pluginKey` / `dbNamespace` / source metadata is partly a wording problem, not just a render problem | Open the operator-facing plugin surfaces, confirm the card copy makes it obvious that `pluginKey` and `dbNamespace` are formal fields and `name` remains display-only |

## Validation Sign-Off

- [x] All plans now have explicit automated verify commands or summary-based preflight checks.
- [x] Sampling continuity: no three consecutive execution tasks lack an automated or phase-script verification step.
- [x] Wave 0 covers existing prerequisite tests; planned additions are explicitly named.
- [x] No watch-mode flags appear in automated commands.
- [x] Feedback latency remains under 90 seconds for the full close gate.
- [x] `nyquist_compliant: true` is set in frontmatter.

## Exit Criteria

- `pluginRegistrations` rows can be upgraded and read as formal plugin identity truth without JSON fallbacks.
- DAL/action/bootstrap/registry/UI all consume the same canonical Phase 44 contract.
- `pnpm verify:phase44` is the only external automated close command for the phase.
- The operator-facing surfaces expose the formal metadata while keeping existing product semantics and design language intact.

**Approval:** planning-stage validation strategy drafted on 2026-05-20; execution evidence pending.
