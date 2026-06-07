# Phase 67 CORRECTIVE — Append-Only `isLatest`/`attemptNo` for Plugin-Owned Tables

**Type:** Surgical corrective (NOT a numbered GSD plan — no plan counters advanced)
**Applied during:** Phase 68 execution, before plan 68-03
**Date:** 2026-06-02

---

## Summary

The plugin data-model compiler did not materialize the project-mandated append-only
columns (`attemptNo`, `isLatest`) for plugin-owned tables that declare a uniqueness
constraint. This blocked phase 68 plan 68-03 (governed declarative data-access verbs),
which assumes plugin-owned mutable tables follow the same append-only / supersede
convention as core `taskSubmissions`. This corrective patches the **compiler** (the
single source of truth), regenerates the plugin-owned schema + allowlist, and adds a
**hand-authored** SQLite migration.

---

## Root Cause (two independent defects)

### 1. Compiler gap (primary)

`scripts/compile-plugin-data-model.ts` compiled declarative `data-model.ts` sources into
Drizzle tables and the data-access allowlist, but never injected the append-only columns.
A plugin table declaring `uniques` (e.g. quiz `responses` on
`classroomSession+student+question`) produced a **plain** unique index and had no
`attemptNo`/`isLatest`, making append-only superseding impossible. Core `taskSubmissions`
(src/db/schema.ts:674) is the convention being mirrored: `attemptNo` notNull (no default),
`isLatest` notNull default(true), with `uniqueIndex(dedupeKey, attemptNo)` +
`index(dedupeKey, isLatest)`.

### 2. Drizzle baseline desync (forced a hand-authored migration)

After fixing the compiler and regenerating the schema, `pnpm db:generate` emitted a
**duplicative** `0006` migration: it re-`CREATE TABLE`d *both* plugin-owned tables and
re-`ALTER … ADD dataVersion` — all of which `0005_lean_sage.sql` already ships (lines
1/16/31/32). Cause: the `drizzle/meta/0005_snapshot.json` baseline is desynced from
`0005_lean_sage.sql` (the snapshot predates the plugin tables + `dataVersion`), so drizzle
diffed against a stale baseline and re-emitted already-applied DDL. Applying that generated
file would fail with `table already exists` / `duplicate column dataVersion`.

Repairing the 0005 baseline (Option B) was explicitly out of scope (it perturbs the shared
chain other migrations depend on). Instead we **hand-authored** the `0006` body as a minimal
SQLite table-recreate and **preserved** the generated `0006` snapshot head + journal idx-6
entry — that snapshot captures the full correct current schema and therefore *repairs*
future `db:generate` diffs going forward rather than worsening the desync.

---

## Pinned Decisions (LOCKED)

1. Add `isLatest` + `attemptNo` to the compiler's `RESERVED_COLUMNS`.
2. **Inject ONLY into tables that declare `uniques`** (append-only is meaningful only where
   a dedupe key exists). Tables without `uniques` (e.g. quiz `questions`) are left untouched.
3. Injection order: `attemptNo` then `isLatest`, placed **after** declared columns and
   **before** `createdAt`/`updatedAt`.
4. Per `uniques` spec, emit `uniqueIndex(dedupeKey, attemptNo)` + `index(dedupeKey, isLatest)`,
   **replacing** the old plain `uniqueIndex(dedupeKey)`.
5. Allowlist `columns` (physical order) **include** the injected columns, but
   `insertableColumns` / `groupByColumns` / `indexes` / `uniques` are **UNCHANGED**
   (injected columns are runtime-managed, never plugin-insertable).
6. Do **not** touch `commands/` or `handlers/`.

Mirror `taskSubmissions` exactly: `attemptNo` notNull (no default); `isLatest` notNull
default(true).

---

## Files Changed

| File | Change | Commit |
|------|--------|--------|
| `scripts/compile-plugin-data-model.ts` | RESERVED_COLUMNS + inject cols + dual-index materialization + `hasIndex` + allowlist `columns` | `dbf616e` |
| `src/db/schema/generated/plugin-owned/quiz.ts` | Regenerated: responses gains `attemptNo`/`isLatest` + new indexes | `434ba2d` |
| `src/db/schema/generated/plugin-owned/data-access-allowlist.ts` | Regenerated allowlist (`columns` only changed) | `434ba2d` |
| `drizzle/0006_worried_wallow.sql` | Hand-authored table-recreate (responses only) | `48d30b7` |
| `drizzle/meta/0006_snapshot.json`, `drizzle/meta/_journal.json` | Preserved generated snapshot head + idx-6 (repairs future diffs) | `48d30b7` |
| `src/features/platform-core/plugin-data-access/allowlist.test.ts` | `validBase` gains `attemptNo:1` (now required by notNull) | `e0b0081` |

**Out of scope, untouched (verified):** quiz `questions` table, `pluginRegistration.dataVersion`
ALTER, the `0005` baseline snapshot, `commands/`, `handlers/`, and all pre-existing untracked
dev artifacts (`local.db-*`, `.local/…`, `66-05-*.png`, `verify66*.db`).

---

## Migration

**File:** `drizzle/0006_worried_wallow.sql` (journal idx 6, after `0005_lean_sage`)

SQLite table-recreate of `plugin_owned_quiz_responses` only:
`PRAGMA foreign_keys=OFF` → create `__new_plugin_owned_quiz_responses` (new shape) →
copy existing rows backfilling `attemptNo=1, isLatest=1` → drop old → rename → restore
`PRAGMA foreign_keys=ON` → recreate the schoolId composite index, the new
`(classroomSession,student,question,attemptNo)` unique, and the new
`(classroomSession,student,question,isLatest)` index. The old plain
`(classroomSession,student,question)` unique ceases to exist via the recreate. Index/column
names cross-checked against the committed `quiz.ts`.

---

## Verification Results

- **Fresh full-journal replay (0000 → 0006, in order): SUCCESS.** Produced the exact `quiz.ts`
  shape — cols `…selectedOption, attemptNo, isLatest, createdAt, updatedAt`; indexes =
  schoolId composite + `…attemptNo_unique` + `…isLatest_idx`; old plain unique absent. This is
  the authoritative proof of migration correctness.
- **`pnpm plugin:compile`** — deterministic (byte-identical on re-run).
- **`pnpm tsc --noEmit`** — clean (exit 0).
- **`pnpm vitest run src/features/platform-core/plugin-data-access`** — 34/34 passing (2 files).

### Known limitation — `pnpm db:migrate` on local.db (pre-existing, out of scope)

The dev `local.db` is in a pre-existing inconsistent state unrelated to this corrective:
its `__drizzle_migrations` records `0002_daffy_xavin`, yet it physically has phase-63
tables (`draftLessonVersion`) while **missing** the `0005` plugin-owned tables entirely.
`prepare-dev-db.ts`'s `detectExistingSchemaTag` bridge ladder tops out at `0002` (no rung
for phase 63/64/lean_sage), so incremental `db:migrate` replays `0014` and collides on an
existing table — and would do so regardless of this corrective's `0006`. Repairing the dev
DB requires a rebuild (out of scope; `local.db` is a gitignored dev artifact). The migration
**file** is independently proven correct via the fresh full-journal replay above.

---

## Notes for 68-03

The plugin-owned `responses` table now supports append-only superseding: insert a new row
with incremented `attemptNo` and `isLatest=true`, clear prior `isLatest` for the dedupe key
within a transaction (mirror `recordRuntimeTaskSubmission`, src/lib/dal/learning.ts ~L647).
`insertableColumns` deliberately excludes `attemptNo`/`isLatest` — the governed verb layer
manages them, plugins never set them directly.
