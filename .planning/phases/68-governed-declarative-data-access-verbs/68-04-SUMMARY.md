---
phase: 68-governed-declarative-data-access-verbs
plan: 04
subsystem: platform-core
tags: [plugin-data-access, drizzle, sqlite, governance, facade, read-verbs, multi-tenant]

# Dependency graph
requires:
  - phase: 68-01
    provides: allowlist (resolvePluginTable/assertIndexAllowed/assertGroupByAllowed), PluginDataAccessError + reasons
  - phase: 68-02
    provides: PluginDataAccessInput verb discriminated union, assertActionExecutable gate, writePluginDataAccessAudit
  - phase: 68-03
    provides: producePluginDataInsert/producePluginDataUpsert write-verb producers (Command Bus)
provides:
  - dispatchPluginDataAccess — single governed entry for all five data-access verbs (D-01)
  - getByIndex / count / aggregate — governed read verbs over plugin-owned tables (direct DAL, no Command Bus)
  - ReadVerbAuditContext — facade-injected audit context for read verbs
affects: [plugin-host-actions, plugin-runtime, phase-70-correctness-distribution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single facade discriminated dispatch by verb (writes→producer, reads→direct DAL)"
    - "runGuardedRead wrapper: denied-only audit on PluginDataAccessError, success unaudited (D-04)"
    - "Forced eq(table.schoolId, session-derived) tenant scope on every read; eq map rejects schoolId key"
    - "Leftmost declared-index-prefix enforcement; aggregate projects only {key,count} (D-05)"

key-files:
  created:
    - src/features/platform-core/plugin-data-access/facade.ts
    - src/features/platform-core/plugin-data-access/read-verbs.ts
    - src/features/platform-core/plugin-data-access/facade.test.ts
    - src/features/platform-core/plugin-data-access/read-verbs.test.ts
  modified: []

key-decisions:
  - "getByIndex caller passes full leftmost index prefix INCLUDING schoolId (validated by assertIndexAllowed); schoolId VALUE injected server-side, never from eq map"
  - "read verbs do NOT call the gate — facade calls assertActionExecutable once, passes derived schoolId + ReadVerbAuditContext down"
  - "aggregate constrained to count + whitelisted groupBy → {key,count} only; no arbitrary aggregates / option distribution (deferred to Phase 70)"
  - "facade dispatches with actor scope 'plugin' for both write command actor and read audit context (aligns with gate audit semantics)"

patterns-established:
  - "Facade-as-single-entry: five verbs converge on dispatchPluginDataAccess; injection surface (tenant key / free predicate / raw SQL) unrepresentable at type layer"
  - "Asymmetric read audit: governed reads write exactly one denied audit on reject, nothing on success"

requirements-completed: [ACCESS-01, ACCESS-03]

# Metrics
duration: 10min
completed: 2026-06-03
---

# Phase 68 Plan 04: Governed Data-Access Facade + Read Verbs Summary

**Single governed entry `dispatchPluginDataAccess` (D-01) routing writes through Command Bus producers and reads through new governed `getByIndex`/`count`/`aggregate` DAL verbs, with session-derived schoolId scoping and denied-only read audit.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-03T01:40:28Z
- **Completed:** 2026-06-03T01:50:37Z
- **Tasks:** 2
- **Files modified:** 4 (all created)

## Accomplishments
- `read-verbs.ts`: three governed read verbs (`getByIndex`, `count`, `aggregate`) querying plugin-owned SQLite tables directly — never via `platformCommands` (D-03) — each forcing `eq(table.schoolId, derived)` and validating against the Plan 01 server-side allowlist.
- `runGuardedRead` wrapper enforcing D-04 asymmetric audit: one `denied` audit on any `PluginDataAccessError` reject (allowlist/cross-school), zero audits on success; non-governance errors rethrown unaudited.
- `facade.ts`: `dispatchPluginDataAccess` — the single public entry for all five verbs. Governance gate (`assertActionExecutable`) runs first; on success it discriminates by `verb` (insert/upsert→producers, getByIndex/count/aggregate→read-verbs).
- 13 new tests (7 read-verb against real libSQL, 6 facade wiring) — full plugin-data-access suite green at 47/47.

## Task Commits

Each task followed the TDD gate (test → feat):

1. **Task 1: read-verbs.ts governed read verbs** - `af55bfa` (test) → `3700eeb` (feat)
2. **Task 2: facade.ts dispatchPluginDataAccess** - `215c76e` (test) → `0ee908c` (feat)

**Plan metadata:** see final docs commit.

## Files Created/Modified
- `src/features/platform-core/plugin-data-access/read-verbs.ts` - `getByIndex`/`count`/`aggregate` governed reads + `runGuardedRead`/`buildIndexedConditions` helpers + `ReadVerbAuditContext` export
- `src/features/platform-core/plugin-data-access/read-verbs.test.ts` - 7 real-DB (libSQL) tests: tenant scoping, index/unknown/cross-school rejections, denied-only audit, aggregate projection shape
- `src/features/platform-core/plugin-data-access/facade.ts` - `dispatchPluginDataAccess` single governed entry, five-verb discriminated dispatch
- `src/features/platform-core/plugin-data-access/facade.test.ts` - 6 wiring tests: write→producer / read→read-verb routing, governance-precedes-dispatch, schoolId-only-derived

## Decisions Made
- **Index prefix includes schoolId, value injected server-side:** `getByIndex`/`count` callers pass the full declared leftmost index prefix (which begins with `schoolId`) for `assertIndexAllowed` validation, but supply `eq` values only for non-tenant columns. The `schoolId` value is injected from the session-derived scope; an `eq` map carrying a `schoolId` key is rejected as `cross_school_rejected`. Missing an `eq` value for a non-tenant index column → `invalid_payload_rejected` (prevents `eq(col, undefined)`).
- **Gate called once at facade, not in read verbs:** read verbs receive the already-derived `schoolId` + a `ReadVerbAuditContext` from the facade; they never call `assertActionExecutable` themselves, avoiding a double gate.
- **aggregate is a named aggregate only:** projects strictly `{key, count}` via `db.select({key, count: count()}).groupBy(key)` — no arbitrary aggregate functions or extra columns (D-05). Answer correctness / option distribution deferred to Phase 70.
- **actor scope `"plugin"`:** facade builds the write command actor and the read audit context with `actorScope: "plugin"`, matching the governance gate's audit semantics (verb execution represents governed plugin behavior, not a raw user op).

## Deviations from Plan

None - plan executed exactly as written. (Two minor in-task implementation iterations on `read-verbs.ts` TypeScript types — `SQLiteColumn` for dynamic column indexing and `Number()` coercion of the `count()` aggregate — were normal GREEN-phase typing work, not deviation-rule fixes.)

## TDD Gate Compliance

Both tasks show the required `test(...)` → `feat(...)` commit order in git history (gate sequence satisfied). Caveat: the implementation file was authored on disk before the `test` commit was staged in each task, so the `test` commits do not capture a clean isolated RED state (running the suite at the test commit passes because the untracked implementation is present in the working tree). RED was confirmed interactively (module-not-found) before implementation in both tasks. No functional impact; flagged for transparency.

## Issues Encountered
None. The transient LSP "Cannot find module './read-verbs'" / "./handlers/plugin-data" diagnostics observed during editing are known module-resolution false positives — `pnpm tsc --noEmit` reports no errors for any plugin-data-access file, and the full suite passes 47/47.

## Known Considerations (not stubs)
- `count`/`aggregate` over `plugin_owned_quiz_responses` (append-only with `isLatest`) currently count **all** rows including superseded attempts unless the caller constrains via an indexed `eq`. Latest-only counting / answer-correctness distribution is intentionally out of scope here and deferred to Phase 70 (consistent with D-05). No stub values are emitted.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All five governed verbs now reachable through the single `dispatchPluginDataAccess` entry — plugin host-action wiring (runtime) can consume this facade directly.
- No blockers. Phase 70 will layer correctness/distribution semantics atop the `aggregate` read verb without changing the facade contract.

---
*Phase: 68-governed-declarative-data-access-verbs*
*Completed: 2026-06-03*

## Self-Check: PASSED
- All 4 source files + SUMMARY.md verified present on disk.
- All 4 task commits (af55bfa, 3700eeb, 215c76e, 0ee908c) verified in git history.
