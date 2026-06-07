---
phase: 68-governed-declarative-data-access-verbs
plan: 05
subsystem: testing
tags: [plugin-data-access, governance, command-bus, drizzle, libsql, verify-gate]

# Dependency graph
requires:
  - phase: 68-04
    provides: dispatchPluginDataAccess facade + read verbs (getByIndex/count/aggregate)
  - phase: 68-03
    provides: governance gate (lifecycle/kill-switch/non-school-actor rejection)
  - phase: 68-02
    provides: insert/upsert handlers + validateInsertPayload shape gate
  - phase: 68-01
    provides: generated data-access allowlist (single source of truth, D-06)
  - phase: 67
    provides: materializeDrizzleMigrations + sqlite migration-proof harness
provides:
  - End-to-end close gate over the public dispatchPluginDataAccess facade
  - Negative-sample suite asserting all 10 D-08 rejection reasons (exact reason + exactly one denied governanceAudit row)
  - Legal five-verb pass (insert/upsert/getByIndex/count/aggregate) with zero denied audits
  - verify:phase68 one-shot chain (plugin:compile + allowlist zero-drift + vitest + runner)
  - Two production bug fixes uncovered by the real command-bus write path
affects: [phase-69, plugin-data-access, command-bus, future verify gates]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "End-to-end close gate driving the PUBLIC facade (not internals) against a real seeded libsql DB"
    - "Negative samples assert exact named reason AND exactly +1 matching denied audit row"
    - "Journal-dropped migration catch-up replay for throwaway seed DB schema parity"

key-files:
  created:
    - scripts/verify-phase68-data-access-verbs.ts (committed Task 1, completed Task 2)
    - scripts/lib/phase68-auth-stub.ts
    - tsconfig.verify-phase68.json
  modified:
    - package.json
    - src/features/platform-core/events/ledger.ts
    - src/features/platform-core/plugin-data-access/facade.ts

key-decisions:
  - "Option A (approved): standalone runner tsconfig remaps @/lib/auth/auth to a fixed-session stub returning the seeded teacher; production auth.ts untouched. Everything else runs REAL against a fresh temp libsql DB."
  - "Drive ALL negatives through the public dispatchPluginDataAccess facade — no internal shortcuts — so the gate proves the real authorize→reject→audit path."
  - "Legal writes target the responses table (the only append-only write target with attemptNo/isLatest); questions is intentionally NOT a legal write target."
  - "Non-school actor seeded as a real user row so the denial audit's actorId FK resolves while still triggering non_school_actor_rejected."

patterns-established:
  - "Reason-coverage completeness guard: assert every declared D-08 reason is exercised by a negative sample, failing if a new reason is added without a sample."
  - "Empty-collection guards before drizzle .values() for zero-row inserts."

requirements-completed: [ACCESS-01, ACCESS-02, ACCESS-03]

# Metrics
duration: ~3h (incl. 5 blocker investigations)
completed: 2026-06-03
---

# Phase 68 Plan 05: Governed Data-Access Close Gate Summary

**End-to-end close gate over `dispatchPluginDataAccess` proving all 5 legal verbs succeed with zero denied audits and all 10 D-08 rejection reasons each throw the exact named reason plus exactly one denied governanceAudit row — surfacing and fixing two latent production bugs in the command-bus write path.**

## Performance

- **Duration:** ~3h (5 blockers investigated and resolved)
- **Tasks:** 2 plan tasks (plus 1 deviation commit for production fixes)
- **Files modified:** 6 (3 created earlier, 3 modified)

## Accomplishments
- Built the phase-68 close gate exercising the real facade against a freshly seeded temp libsql DB (Option A: only `auth()` stubbed, everything else real).
- All 10 D-08 rejection reasons covered, each asserting `{ exact reason code, +1 denied audit }`; legal five-verb pass writes zero denied audits.
- Wired `verify:phase68` (plugin:compile + allowlist zero-drift git-diff gate + plugin-data-access/handler vitest + runner) and repointed `verify:phase` from phase67 to phase68. Full chain is green and one-shot reproducible.
- Uncovered and fixed two genuine production bugs masked by unit-test fakes (zero-event ledger insert crash; write-command correlation collapse / data loss).

## Task Commits

1. **Task 1: end-to-end negative-sample close gate scaffold** - `3e9be4d` (feat) — runner + auth stub + tsconfig
2. **Production Rule-1 fixes (deviation)** - `ed438e6` (fix) — ledger zero-event guard + facade correlation identity
3. **Task 2: verify:phase68 wiring + negative-sample completion** - `6b74482` (test) — script + alias + journal catch-up + intruder seed + responses-table legal writes

## Files Created/Modified
- `scripts/verify-phase68-data-access-verbs.ts` - Close-gate runner: seeds school/teacher/plugins, legal five-verb pass, 10 negative samples, reason-coverage guard.
- `package.json` - `verify:phase68` chain + `verify:phase` alias → phase68.
- `src/features/platform-core/events/ledger.ts` - Guard `appendPlatformEvents` against `.values([])` for zero-event success commands.
- `src/features/platform-core/plugin-data-access/facade.ts` - Pass facade correlationId as causationId (not write correlationId) so distinct payloads don't collapse to one command.
- `scripts/lib/phase68-auth-stub.ts` - Fixed-session `auth()` stub returning `SEEDED_TEACHER_ID`.
- `tsconfig.verify-phase68.json` - Path remap selecting the auth stub (Option A).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zero-event ledger insert crashed every legal plugin data write**
- **Found during:** Task 2 (legal five-verb pass)
- **Issue:** `appendPlatformEvents` called drizzle `.values([])` for zero-event success commands (`plugin.data.insert/upsert` are append-only writes that emit no platform events, recording a `governanceAudit` instead), throwing `values() must be called with at least one value`. The production producer uses the real `appendPlatformEvents` (does not inject a fake), so every legal plugin data write crashed in production. Passing unit tests masked it via an injected `persistPlatformEvents` fake.
- **Fix:** Guard the insert on a non-empty event list, mirroring the existing `dispatches` empty-guard.
- **Files modified:** `src/features/platform-core/events/ledger.ts`
- **Commit:** `ed438e6`

**2. [Rule 1 - Bug] Write-command correlation collapse caused silent data loss**
- **Found during:** Task 2 (negative `free_where_rejected` not throwing)
- **Issue:** `dispatchPluginDataAccess` passed the facade `correlationId` (derived from `verb:actor:pluginKey:table`, excluding `values`) as the write command's `correlationId`. Since `commandId = type:correlationId`, distinct-payload inserts/upserts to the same table collapsed to one command; the second returned the first cached result without persisting (data loss). Surfaced as the free-where negative colliding with a prior failed command.
- **Fix:** Pass the facade correlationId as `causationId`; the producer derives a payload-inclusive `correlationId`. Facade unit tests mock the producer and don't assert the correlation field, so the change is safe.
- **Files modified:** `src/features/platform-core/plugin-data-access/facade.ts`
- **Commit:** `ed438e6`

**3. [Rule 3 - Blocking] Journal-dropped migration replay**
- **Found during:** Task 2 (legal write failing with `no such column: auditSummaryJson`)
- **Issue:** Checked-in `drizzle/meta/_journal.json` is a curated subset that omits `0013_phase54_audit_summary_truth.sql` (adds `auditSummaryJson` to `platformCommand`/`platformEvent`). Replaying the journal alone yields a schema mismatch versus `schema.ts`; the real command-bus write path needs that column. Phase 67's verifier never hit it because it does not dispatch through the command bus.
- **Fix:** `applyJournalDroppedCatchUp` replays ONLY that one checked-in, journal-omitted migration into the throwaway seed DB. Production migrations and the journal are untouched.
- **Files modified:** `scripts/verify-phase68-data-access-verbs.ts`
- **Commit:** `6b74482`

**4. [Rule 3 - Test input] Legal writes moved to responses table**
- **Found during:** Task 2 (legal insert crash in append-only write handler)
- **Issue:** The generic append-only write handler hard-requires `attemptNo` + `isLatest` columns (stamps `attemptNo = max+1`, `isLatest = true`); only the responses table declares them. The questions table is therefore not a valid append-only write target.
- **Fix:** Legal writes target the responses table with two distinct student keys; read/count/aggregate assertions tightened accordingly (count=2, aggregate=2 groups of 1).
- **Files modified:** `scripts/verify-phase68-data-access-verbs.ts`
- **Commit:** `6b74482`

**5. [Rule 3 - Test seed] Non-school actor seeded as a real user**
- **Found during:** Task 2 (`non_school_actor_rejected` returning `reason: undefined`)
- **Issue:** `governanceAudits.actorId` has an FK to `user.id`. The negative used a phantom actor id, so the denial audit insert hit an FK violation — a non-`PluginDataAccessError` that propagated with no `.reason`, rather than surfacing the rejection.
- **Fix:** Seed the intruder as a real `user` row holding no membership in the school, so the gate still rejects with `non_school_actor_rejected` while the denial audit's `actorId` FK resolves. A realistic non-school actor IS a real authenticated user; no production change.
- **Files modified:** `scripts/verify-phase68-data-access-verbs.ts`
- **Commit:** `6b74482`

## Known Stubs

`auth()` from `@/lib/auth/auth` is stubbed (Option A, approved) to return the seeded teacher session — this is the intended, approved test seam for the runner, not a product stub. Everything else (DB, command bus, gate, audit, allowlist) runs real. No product-facing stubs introduced.

## Verification

`pnpm verify:phase68` — PASSED end-to-end:
- vitest: 5 files / 52 tests passed
- allowlist zero-drift git-diff: clean (D-06)
- legal five-verb pass: succeeded, zero denied audits
- 10/10 negative samples: each threw exact reason + exactly one denied audit
- reason-coverage completeness guard: all 10 declared reasons covered
- `tsc --noEmit -p tsconfig.json`: exit 0

## Self-Check: PASSED

- FOUND: scripts/verify-phase68-data-access-verbs.ts
- FOUND: tsconfig.verify-phase68.json
- FOUND: scripts/lib/phase68-auth-stub.ts
- FOUND commit: 3e9be4d (Task 1)
- FOUND commit: ed438e6 (production fixes)
- FOUND commit: 6b74482 (Task 2)
