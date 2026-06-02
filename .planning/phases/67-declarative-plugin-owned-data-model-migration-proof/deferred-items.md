# Deferred Items — Phase 67

Out-of-scope discoveries logged during execution. NOT fixed in this phase.

## Pre-existing: dev-db bridging tag detection is incomplete

- **Found during:** 67-02 Task 2 (fresh-db migrate verification)
- **Symptom:** Running `pnpm db:migrate` against a pre-existing `local.db` (created before phase63/64 schema was tracked) fails with `table draftLessonVersion already exists`. The `_journal.json` baseline already lists `0014_phase63_draft_lesson_versions`, but `detectExistingSchemaTag()` in `scripts/prepare-dev-db.ts` only recognizes up to `0002_daffy_xavin`, so it under-detects the real applied schema and replays migrations that already exist.
- **Scope:** Pre-existing defect in `scripts/prepare-dev-db.ts` bridging logic — unrelated to 67-02's compiler/migration changes. 67-02 was verified clean on a **fresh** DB (`pnpm db:migrate` applies `0005_lean_sage.sql` with no errors).
- **Suggested fix (future):** Extend `detectExistingSchemaTag()` to recognize phase53/63/64 schema markers so legacy `local.db` files bridge to the correct journal index instead of replaying tracked migrations.
- **Files:** `scripts/prepare-dev-db.ts`
