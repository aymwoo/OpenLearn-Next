---
phase: 67-declarative-plugin-owned-data-model-migration-proof
plan: 03
subsystem: database
tags: [sqlite, drizzle, migrations, plugin-data-model, ddl-gate, pragma, foreign-key-check, multi-tenant]

# Dependency graph
requires:
  - phase: 67-02
    provides: governed Drizzle fragments + checked-in migration (0005_lean_sage.sql) materializing plugin_owned_quiz_* tables + pluginRegistration.dataVersion
  - phase: 45
    provides: verify-phase45 physical-proof pattern + scripts/lib/sqlite-migration-proof.ts (materializeDrizzleMigrations/cleanupSqliteArtifacts)
provides:
  - Static zero-runtime-DDL gate (scripts/gate-no-runtime-ddl.ts) proving no DDL execution outside drizzle/** + src/db/schema/generated/**
  - Phase67 physical verifier (scripts/verify-phase67-plugin-owned-data.ts) asserting D-12 invariants, schoolId cascade, dataVersion default, drift guard, foreign_key_check
  - verify:phase67 script + verify:phase alias repointed to 67 (phase close gate green)
affects: [plugin-data-model, future plugin-owned tables, migration governance, phase-close-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zero-runtime-DDL static gate: node:fs recursive scan, execution-channel-aware DDL detection, explicit auditable dir-whitelist + file-exemption"
    - "Behavior-first physical migration proof: materialize checked-in migrations into throwaway SQLite, PRAGMA index_info column-order assertions, cascade-delete proof, foreign_key_check"

key-files:
  created:
    - scripts/gate-no-runtime-ddl.ts
    - scripts/verify-phase67-plugin-owned-data.ts
  modified:
    - package.json

key-decisions:
  - "Zero-DDL gate uses node:fs recursion instead of ripgrep (D-08) for zero-dependency CI stability; scans a superset of D-08 dirs (adds scripts/**, plugins/**)"
  - "Narrow literal DDL flagged only with an execution channel (.execute/.run/sql.raw); interpolated template DDL (keyword+backtick) always flagged — removes detection-regex false positives while keeping interpolation guard"
  - "scripts/prepare-dev-db.ts file-exempted (documented): it is the db:migrate applier bootstrapping drizzle's own __drizzle_migrations ledger — sanctioned migration-path DDL, not plugin/app runtime"

patterns-established:
  - "Static security gate: explicit auditable allowlists (dir whitelist + named file exemptions) over regex broadening, so divergences stay visible to audits"
  - "Index correctness via PRAGMA index_info seqno-ordered column comparison, not mere existence"

requirements-completed: [DATA-02, DATA-03, DATA-04]

# Metrics
duration: 25min
completed: 2026-06-02
---

# Phase 67 Plan 03: Zero-DDL Gate + Plugin-Owned Data Physical Proof Summary

**Static zero-runtime-DDL gate plus a behavior-first SQLite verifier that materializes checked-in migrations and PRAGMA-asserts D-12 plugin_owned_quiz invariants, schoolId cascade, dataVersion=1, and zero declaration↔generated drift — closing the phase 67 gate (verify:phase repointed to 67, green).**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-02
- **Completed:** 2026-06-02
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `scripts/gate-no-runtime-ddl.ts`: recursive node:fs scan of src/scripts/plugins flags executed/interpolated DDL outside the drizzle/** + generated/** whitelist; PASS on current repo (472 files).
- `scripts/verify-phase67-plugin-owned-data.ts`: materializes checked-in migrations into throwaway SQLite, asserts plugin_owned_quiz_questions/responses tables + schoolId(notNull), composite scope index and dedupe unique constraint **column order** (via PRAGMA index_info), pluginRegistration.dataVersion default 1, schoolId cascade-delete to zero, PRAGMA foreign_key_check clean, declaration↔generated alignment, drift guard, and zero-DDL gate orchestration.
- `verify:phase67` added and `verify:phase` alias repointed 65 → 67; `pnpm verify:phase` runs green end-to-end.

## Task Commits

Each task was committed atomically:

1. **Task 67-03-01: Zero-runtime-DDL static gate** - `51dafe6` (feat)
2. **Task 67-03-02: Phase67 physical verifier + verify:phase67 + alias repoint** - `c1891b4` (feat)

**Plan metadata:** (this docs commit)

## Files Created/Modified
- `scripts/gate-no-runtime-ddl.ts` - Static zero-runtime-DDL gate (whitelist drizzle/** + generated/**, documented migration-runner exemption).
- `scripts/verify-phase67-plugin-owned-data.ts` - Physical PRAGMA proof + cascade + foreign_key_check + drift + zero-DDL gate orchestration.
- `package.json` - Added `verify:phase67`; repointed `verify:phase` from `pnpm verify:phase65` to `pnpm verify:phase67`.

## Decisions Made
- node:fs scan over ripgrep (zero-dependency, CI-stable); scan scope is a strict superset of the D-08 directory list. Documented inline as a deliberate enhancement.
- Execution-channel-aware DDL detection: a DDL keyword in a regex literal/deny-list (detection, not execution) is correctly not flagged.
- prepare-dev-db.ts is a named, documented file exemption (sanctioned drizzle migration-ledger bootstrap), kept as an explicit allowlist entry rather than weakening detection regexes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Detection-regex false positive in zero-DDL gate**
- **Found during:** Task 67-03-01 (running the gate against the current repo)
- **Issue:** First gate implementation (broad narrow-DDL regex with no execution-context requirement) flagged `src/server/ai/tools/guardrails.ts:40` `/drop table/i` — a SQL-injection **detection** regex in `FORBIDDEN_MARKERS`, the opposite of executing DDL.
- **Fix:** Required narrow literal DDL to co-occur with an execution channel (`.execute(`/`.run(`/`.exec(`/`sql.raw(`/`client.execute`/`db.run`); interpolated template DDL (keyword + backtick) remains always-flagged to preserve the Plan-Check #1 interpolation guard.
- **Files modified:** scripts/gate-no-runtime-ddl.ts
- **Verification:** Inline regex sanity (executed literal flagged ✓, detection regex not flagged ✓, interpolated flagged ✓); gate PASS exit 0.
- **Committed in:** `51dafe6` (Task 1 commit)

**2. [Rule 3 - Blocking] Migration-runner DDL blocked gate PASS**
- **Found during:** Task 67-03-01 (running the gate)
- **Issue:** `scripts/prepare-dev-db.ts:269` executes `db.run(sql.raw(\`CREATE TABLE IF NOT EXISTS __drizzle_migrations ...\`))` — legitimate drizzle migration-ledger bootstrap. The plan's whitelist (`drizzle/**` + `generated/**`) did not cover the migration applier, so the gate could not reach PASS as the plan expected.
- **Fix:** Added a single named, documented `EXEMPT_FILES` allowlist entry for `scripts/prepare-dev-db.ts` (sanctioned migration path, conceptual sibling of drizzle/**), kept explicit and auditable rather than broadening regexes.
- **Files modified:** scripts/gate-no-runtime-ddl.ts
- **Verification:** `tsx scripts/gate-no-runtime-ddl.ts` → PASS (472 files); `pnpm verify:phase` green.
- **Committed in:** `51dafe6` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both necessary for a correct, passing gate. The exemption is narrow and documented; the gate's security intent (T-67-10: block runtime plugin DDL) is preserved. No scope creep.

## Issues Encountered
- None beyond the two documented deviations. The `0005_lean_sage.sql` non-contiguous prefix is by-design (journal-tag application order), not drift.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DATA-02/DATA-03/DATA-04 close gate satisfied; `pnpm verify:phase` (= verify:phase67) green end-to-end → ready for `/gsd-verify-work`.
- Out-of-scope (deferred-items.md): `scripts/prepare-dev-db.ts` `detectExistingSchemaTag()` only recognizes up to `0002_daffy_xavin`; fresh-db verification is authoritative and unaffected.

---
*Phase: 67-declarative-plugin-owned-data-model-migration-proof*
*Completed: 2026-06-02*
