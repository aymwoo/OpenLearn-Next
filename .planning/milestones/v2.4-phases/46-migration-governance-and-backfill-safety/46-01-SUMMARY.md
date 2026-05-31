---
phase: 46-migration-governance-and-backfill-safety
plan: 01
subsystem: database
tags: [drizzle, sqlite, plugin, migration, backfill, cutover, vitest]
requires:
  - phase: 44-plugin-identity-and-namespace-contract
    provides: plugin identity, db namespace contract, pluginRegistration truth seam
  - phase: 45-plugin-schema-and-physical-tables
    provides: plugin_ext/plugin_owned physical tables and cascade guarantees
provides:
  - transactional plugin JSON-to-schema cutover hardening
  - stable phase45/46 close gates using temporary SQLite proof databases
  - plugin data table/index namespace enforcement scoped to governed plugin surfaces
affects: [47-dal-authz-cache-audit-integration, 48-lifecycle-and-uninstall-semantics, plugin-governance]
tech-stack:
  added: []
  patterns: [transactional re-verify before cutover, proof-database close gates, scoped plugin naming governance]
key-files:
  created: [.planning/phases/46-migration-governance-and-backfill-safety/46-01-SUMMARY.md]
  modified: [src/lib/dal/plugin-migration.ts, src/lib/dal/plugin-migration.test.ts, scripts/verify-phase45-plugin-schema.ts, scripts/verify-phase46-migration-governance.ts]
key-decisions:
  - "Cutover must re-verify extension payloads inside the transaction before erasing legacy JSON."
  - "Phase 45/46 close gates must validate physical plugin tables against temporary SQLite proof databases, not developer-local local.db state."
  - "Phase 46 naming governance should only police plugin-owned/plugin-extension data tables and indexes, not unrelated later platform tables."
patterns-established:
  - "Transactional cutover pattern: verify outside for fast fail, verify again inside transaction for atomic safety."
  - "Verifier resilience pattern: use ephemeral proof databases for physical schema assertions."
requirements-completed: [GOV-01, GOV-02, GOV-03, GOV-04]
duration: 7min
completed: 2026-05-24
---

# Phase 46 Plan 01: Migration Governance & Backfill Safety Summary

**Plugin JSON cutover now re-verifies physical extension truth inside the transaction, while Phase 45/46 close gates validate governed plugin schema on repeatable temporary SQLite proof databases.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-24T04:20:59Z
- **Completed:** 2026-05-24T04:27:55Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Hardened `cutoverPluginJsonToSchema()` so it aborts if extension payloads drift between preflight verify and transactional erase.
- Added regression coverage proving transactional mismatch rollback before legacy JSON removal.
- Reworked `verify:phase45` and `verify:phase46` to use temporary SQLite proof databases and narrowed Phase 46 naming enforcement to actual plugin data tables/indexes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden transactional cutover atomicity** - `7f16a82` (fix)
2. **Task 2: Stabilize migration governance close gates** - `a84ed9e` (fix)

**Plan metadata:** pending current commit (docs)

## Files Created/Modified
- `src/lib/dal/plugin-migration.ts` - Adds transactional re-verification before lesson/step/resource legacy payload erasure.
- `src/lib/dal/plugin-migration.test.ts` - Covers rollback when physical payload drifts after preflight verify.
- `scripts/verify-phase45-plugin-schema.ts` - Uses temporary SQLite proof database for physical plugin table/index checks.
- `scripts/verify-phase46-migration-governance.ts` - Uses temporary SQLite proof database and scopes namespace enforcement to governed plugin data surfaces.
- `.planning/phases/46-migration-governance-and-backfill-safety/46-01-SUMMARY.md` - Execution summary and deviation record.

## Decisions Made
- Transactional cutover safety beats a single preflight verify; erase only after reading matching physical extension rows inside the same transaction.
- Close gates must be environment-independent; local workstation database drift is not acceptable proof.
- Phase 46 namespace governance should enforce the plugin data contract it owns, without blocking later non-plugin platform tables.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Closed verify/cutover race window in plugin migration cutover**
- **Found during:** Task 1
- **Issue:** `cutoverPluginJsonToSchema()` trusted a pre-transaction `verifyBackfillData()` result, leaving a drift window before legacy JSON deletion.
- **Fix:** Re-read physical extension payloads inside the transaction and abort on mismatch before any legacy payload mutation.
- **Files modified:** `src/lib/dal/plugin-migration.ts`, `src/lib/dal/plugin-migration.test.ts`
- **Verification:** `pnpm exec vitest --run src/lib/dal/plugin-migration.test.ts`
- **Committed in:** `7f16a82`

**2. [Rule 3 - Blocking] Removed close-gate dependence on workstation-local SQLite history**
- **Found during:** Task 2
- **Issue:** `verify:phase45` / `verify:phase46` failed because physical checks depended on the caller's existing `local.db` migration state rather than repeatable proof state.
- **Fix:** Switched physical schema assertions to temporary SQLite proof databases created inside the verifier itself.
- **Files modified:** `scripts/verify-phase45-plugin-schema.ts`, `scripts/verify-phase46-migration-governance.ts`
- **Verification:** `pnpm run verify:phase45`, `pnpm run verify:phase46`
- **Committed in:** `a84ed9e`

**3. [Rule 1 - Bug] Scoped Phase 46 naming governance to actual plugin data surfaces**
- **Found during:** Task 2
- **Issue:** The verifier treated later `platformCommand` / `platformEvent` tables as plugin naming violations, causing false failures unrelated to Phase 46 governance.
- **Fix:** Limited table/index prefix enforcement to governed plugin extension and plugin-owned data structures.
- **Files modified:** `scripts/verify-phase46-migration-governance.ts`
- **Verification:** `pnpm run verify:phase46`
- **Committed in:** `a84ed9e`

---

**Total deviations:** 3 auto-fixed (2 Rule 1, 1 Rule 3)
**Impact on plan:** All deviations were correctness or verification-hardening work required to make the planned close gate truly repeatable.

## Issues Encountered
- `gitnexus impact` / `gitnexus detect-changes` could not complete because the local GitNexus install is missing the `@ladybugdb/core` native binary; impact was assessed via direct code-reference inspection and git diff instead.

## Auth Gates

None.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 47 can rely on `verify:phase46` as a repeatable regression gate instead of a developer-environment-sensitive one.
- Plugin migration cutover now has explicit anti-drift protection before legacy payload erasure.
- No blocking issues remain for this plan.

## Self-Check: PASSED

- FOUND: `.planning/phases/46-migration-governance-and-backfill-safety/46-01-SUMMARY.md`
- FOUND: `7f16a82`
- FOUND: `a84ed9e`
