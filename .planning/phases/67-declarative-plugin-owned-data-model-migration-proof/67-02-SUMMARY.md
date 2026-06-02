---
phase: 67-declarative-plugin-owned-data-model-migration-proof
plan: 02
subsystem: plugin-data-model
tags: [plugin, codegen, drizzle, migration, governance]
requires: [DATA-01]
provides: [DATA-02, DATA-03]
affects: [src/db/schema.ts, drizzle/]
tech-stack:
  added: []
  patterns: ["compile-don't-execute codegen", "fixed-injected governed FKs", "checked-in migrations only (zero runtime DDL)", "byte-stable drift guard"]
key-files:
  created:
    - scripts/compile-plugin-data-model.ts
    - src/db/schema/generated/plugin-owned/quiz.ts
    - src/db/schema/generated/index.ts
    - drizzle/0005_lean_sage.sql
    - drizzle/meta/0005_snapshot.json
  modified:
    - src/db/schema.ts
    - drizzle/meta/_journal.json
decisions:
  - "Generated fragments import the core schema via relative ../../../schema thunks; the resulting declaration↔core circular import is safe (drizzle-kit loads both successfully) and required for lazy FK references."
  - "Migration prefix 0005_ is non-contiguous with the curated bridging journal by design; the migrator applies by tag, not filename prefix — not drift, not fixed."
  - "Fresh-db verification is authoritative; the pre-existing local.db bridging defect (deferred-items.md) is out of scope."
metrics:
  duration: ~1h
  completed: 2026-06-02
---

# Phase 67 Plan 02: Compile Declarative dataModel to Governed Drizzle Fragments + Checked-in Migration Summary

Compiled the validated declarative `dataModel` into deterministic governed Drizzle table fragments and a checked-in migration — physical DDL is written only by drizzle-kit, never executed at runtime (DATA-02 / DATA-03).

## What Was Built

**Task 1 — Compiler + generated fragments (commit `d464c60`):**
- `scripts/compile-plugin-data-model.ts` (`pnpm plugin:compile`): imports `quizDataModel`, re-validates through `PluginDataModelSchema` (67-01), then deterministically emits Drizzle fragments. Compiler fixed-injects `id` (PK), `pluginId` (FK→pluginRegistrations cascade), `schoolId` (FK→schools cascade), `createdAt`/`updatedAt` — the declaration cannot express these FKs ("compile, don't trust").
- `src/db/schema/generated/plugin-owned/quiz.ts`: `pluginOwnedQuizQuestions` + `pluginOwnedQuizResponses`, with D-12 physical invariants — composite index `(schoolId, classroomSession, student, question)` and unique `(classroomSession, student, question)` on the responses table.
- `src/db/schema/generated/index.ts`: barrel re-exporting every generated fragment.

**Task 2 — schema wiring + checked-in migration (this commit):**
- `src/db/schema.ts`: added `pluginRegistrations.dataVersion` (`integer`, notNull, default 1) and `export * from "./schema/generated"` so drizzle-kit sees the generated tables.
- `pnpm db:generate` produced checked-in migration `drizzle/0005_lean_sage.sql` (+ snapshot, journal entry) creating both plugin-owned tables (cascade FKs + D-12 index/unique) and `ALTER TABLE pluginRegistration ADD dataVersion`.

## Verification

- **Drift guard:** `pnpm plugin:compile && git diff --exit-code src/db/schema/generated` → CLEAN (byte-stable recompile).
- **Migration content:** both tables + `dataVersion` present in `drizzle/*.sql`.
- **Fresh-db migrate:** `pnpm db:migrate` against a fresh timestamped DB applies `0005_lean_sage.sql` with zero errors.
- **Materialization (`@libsql/client` introspection on fresh DB):** `pluginRegistration.dataVersion` = INTEGER, notnull=1, default=1; `plugin_owned_quiz_questions` + `plugin_owned_quiz_responses` tables present with D-12 composite index and unique index.
- **Typecheck:** no errors in compiler / generated fragments / schema.ts.

## Deviations from Plan

None — plan executed as written. One out-of-scope pre-existing defect logged to `deferred-items.md` (legacy-`local.db` bridging tag under-detection in `scripts/prepare-dev-db.ts`); 67-02 verified clean on a fresh DB.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: scripts/compile-plugin-data-model.ts
- FOUND: src/db/schema/generated/plugin-owned/quiz.ts
- FOUND: src/db/schema/generated/index.ts
- FOUND: drizzle/0005_lean_sage.sql
- FOUND: src/db/schema.ts (dataVersion + barrel re-export)
- FOUND commit: d464c60 (Task 1)
