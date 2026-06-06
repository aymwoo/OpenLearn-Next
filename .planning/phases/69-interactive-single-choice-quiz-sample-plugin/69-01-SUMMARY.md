---
phase: 69-interactive-single-choice-quiz-sample-plugin
plan: 01
subsystem: database
tags: [plugin-owned-data, built-in-plugin, quiz-sample, drizzle, testing]
requires:
  - phase: 67-declarative-plugin-owned-data-model-migration-proof
    provides: compile-time plugin-owned schema generation and migration baseline
  - phase: 68-governed-declarative-data-access-verbs
    provides: governed plugin data access allowlist and append-only write posture
provides:
  - frozen quiz question snapshot columns for option A-D text in a single plugin-owned table
  - real built-in quiz sample teaching-step definition and bootstrap registration path
  - focused tests covering quiz sample discoverability and bootstrap wiring
affects: [phase-69-02, phase-69-03, phase-69-04, phase-70]
tech-stack:
  added: []
  patterns: [single-table quiz snapshot fields, built-in plugin host registration via bootstrap]
key-files:
  created: [.planning/phases/69-interactive-single-choice-quiz-sample-plugin/69-01-SUMMARY.md, drizzle/0007_hard_echo.sql, drizzle/meta/0007_snapshot.json]
  modified: [plugins/quiz-sample/data-model.ts, src/db/schema/generated/plugin-owned/quiz.ts, src/db/schema/generated/plugin-owned/data-access-allowlist.ts, drizzle/meta/0006_snapshot.json, drizzle/meta/_journal.json, src/lib/dto/lesson-authoring.ts, src/lib/dto/resource-ai.ts, scripts/bootstrap-dev-db.ts, src/lib/dal/plugins.builtins.test.ts, src/lib/dal/plugins.test.ts]
key-decisions:
  - "quiz sample uses stable pluginKey builtin-teaching-step-quiz-sample across built-in definition and bootstrap manifest"
  - "question snapshot migration upgrades plugin_owned_quiz_questions in place via SQLite table-recreate instead of introducing an options child table"
patterns-established:
  - "Pattern 1: frozen quiz prompt plus option A-D text stays in plugin_owned_quiz_questions as a single source of truth"
  - "Pattern 2: sample plugins must enter governance through BUILT_IN_TEACHING_STEP_DEFINITIONS plus BUILT_IN_PLUGIN_DEFINITIONS"
requirements-completed: [QUIZ-03, QUIZ-01]
duration: 24min
completed: 2026-06-03
---

# Phase 69 Plan 01: Interactive Single-Choice Quiz Sample Plugin Summary

**Quiz sample now has a real built-in host identity plus single-table frozen question snapshots with prompt, option A-D text, and correct answer.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-06-03T17:06:00Z
- **Completed:** 2026-06-03T17:30:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Extended `plugin_owned_quiz_questions` to store full frozen prompt and option A-D text without adding a second table.
- Regenerated checked-in plugin-owned schema and allowlist artifacts, then added a migration for the question-table upgrade.
- Added quiz sample built-in teaching-step metadata, bootstrap registration, and focused tests for discoverability and bootstrap wiring.

## Task Commits

Not committed in this execution run.

## Files Created/Modified
- `plugins/quiz-sample/data-model.ts` - Added `optionAText` through `optionDText` to the quiz question snapshot source of truth.
- `src/db/schema/generated/plugin-owned/quiz.ts` - Regenerated Drizzle table with the new frozen option text fields.
- `src/db/schema/generated/plugin-owned/data-access-allowlist.ts` - Regenerated allowlist columns, insertable columns, and group-by fields for the expanded question table.
- `drizzle/0007_hard_echo.sql` - Added SQLite table-recreate migration for `plugin_owned_quiz_questions` upgrade.
- `drizzle/meta/0006_snapshot.json` - Repaired snapshot chain so future migration generation can proceed.
- `drizzle/meta/0007_snapshot.json` - Checked-in new snapshot head reflecting expanded quiz question schema.
- `drizzle/meta/_journal.json` - Recorded the new migration journal entry.
- `src/lib/dto/lesson-authoring.ts` - Registered `quizSample` as a built-in teaching-step key.
- `src/lib/dto/resource-ai.ts` - Added quiz sample built-in definition and authoring contract metadata.
- `scripts/bootstrap-dev-db.ts` - Added quiz sample built-in plugin manifest to bootstrap registration path.
- `src/lib/dal/plugins.builtins.test.ts` - Added built-in definition assertions for quiz sample.
- `src/lib/dal/plugins.test.ts` - Added bootstrap-path assertion for the quiz sample manifest.

## Decisions Made
- Reused the existing built-in host seams instead of inventing a separate sample-plugin registration path.
- Used empty-string backfill for newly required `optionAText`/`optionBText` and nullable backfill for `optionCText`/`optionDText` to keep old rows migratable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Repaired drizzle snapshot chain before generating migration artifacts**
- **Found during:** Task 1 (schema + migration generation)
- **Issue:** `pnpm db:generate` failed with a snapshot collision because `drizzle/meta/0006_snapshot.json` pointed to the wrong `prevId`, creating a forked migration history.
- **Fix:** Repointed `0006_snapshot.prevId` to `0005_snapshot.id`, regenerated migration metadata, then converted the generated SQL into the minimal SQLite table-recreate migration required for `plugin_owned_quiz_questions`.
- **Files modified:** `drizzle/meta/0006_snapshot.json`, `drizzle/0007_hard_echo.sql`, `drizzle/meta/0007_snapshot.json`, `drizzle/meta/_journal.json`
- **Verification:** `pnpm db:generate`, migration materialization proof command

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required to produce the checked-in migration artifact the plan explicitly asked for; no scope creep beyond migration-chain repair.

## Issues Encountered
- `drizzle-kit generate` initially emitted duplicate full-table creation SQL because the local snapshot chain was broken; fixing the chain restored generation and allowed a minimal checked-in migration.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 69-02 can now build authoring on top of a real built-in quiz sample identity and stable plugin key.
- Phase 69-03 can freeze classroom-session snapshots into the expanded `plugin_owned_quiz_questions` table without needing additional schema work.

## Self-Check: PASSED
- Found summary file, generated schema files, and migration files on disk.
- Verified migration materialization creates `optionAText`, `optionBText`, `optionCText`, `optionDText`, and `correctOption` on `plugin_owned_quiz_questions`.
