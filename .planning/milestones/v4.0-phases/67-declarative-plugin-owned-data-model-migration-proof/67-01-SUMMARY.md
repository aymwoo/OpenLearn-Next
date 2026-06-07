---
phase: 67-declarative-plugin-owned-data-model-migration-proof
plan: 01
subsystem: database
tags: [zod, drizzle-zod, semver, dto, plugin, dataModel, validation, meta-schema]

# Dependency graph
requires:
  - phase: 44-48 (plugin identity/schema/migration governance)
    provides: pluginOwnedBusinessData physical table shape + plugin namespace conventions
provides:
  - PluginDataModelSchema — pure non-server-only Zod meta-schema validating declarative dataModel at the trust boundary
  - 5 reject reasons (RAW_SQL_FORBIDDEN / MISSING_OWNED_PREFIX / MISSING_SCHOOL_SCOPE / INVALID_COLUMN_TYPE / ENUM_REQUIRES_VALUES) + strict() unrecognized_keys for FK-to-core
  - plugins/quiz-sample/data-model.ts — single legal quiz dataModel (question + response tables), compiler input source of truth
  - package.json scripts db:generate / plugin:compile + semver/drizzle-zod/@types/semver deps in place
affects: [67-02 compiler, 67-03 verify, Phase 68 drizzle-zod sourcing, Phase 71 semver dataVersion]

# Tech tracking
tech-stack:
  added: [semver@^7.8.1, drizzle-zod@^0.8.3, "@types/semver"]
  patterns:
    - "lib/dto pure meta-schema (no server-only) consumed by both vitest and compiler"
    - "UPPER_SNAKE reject-reason constants + Zod superRefine (resource-ai/draft-guardrails analog)"
    - "z.strictObject everywhere -> unknown keys (incl. foreignKeys) rejected as unrecognized_keys"

key-files:
  created:
    - src/lib/dto/plugin-data-model.ts
    - src/lib/dto/plugin-data-model.test.ts
    - plugins/quiz-sample/data-model.ts
  modified:
    - package.json

key-decisions:
  - "FK-to-core (negative #3) guarded by strict() unrecognized_keys, deliberately NOT a named reason constant"
  - "DDL keyword scan via JSON.stringify(table) regex catches raw SQL smuggled into any string field"
  - "Declaration surface omits id/pluginId/isLatest/createdAt/updatedAt and all FKs — compiler injects these (D-11)"

patterns-established:
  - "Declarative dataModel validated at boundary before reaching governed table-creation pipeline (compile, don't execute)"
  - "Column types restricted to 5 scalars via z.enum; json/blob structurally unrepresentable"

requirements-completed: [DATA-01]

# Metrics
duration: 13min
completed: 2026-06-02
---

# Phase 67 Plan 01: Declarative Plugin dataModel Meta-Schema Summary

**Pure non-server-only Zod meta-schema (`PluginDataModelSchema`) that rejects 5 classes of illegal plugin dataModel declarations at the trust boundary, with a legal quiz sample as the compiler's source of truth**

## Performance

- **Duration:** ~13 min
- **Completed:** 2026-06-02
- **Tasks:** 2
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- `PluginDataModelSchema` — pure DTO meta-schema (no `server-only`, vitest-runnable, no DB), the single safety boundary for the "compile, don't execute" pipeline
- 5 negative samples each rejected with a specific reason: raw SQL/DDL (`RAW_SQL_FORBIDDEN`), missing `plugin_owned_` prefix (`MISSING_OWNED_PREFIX`), FK-to-core (strict `unrecognized_keys`), missing `schoolId` scope (`MISSING_SCHOOL_SCOPE`), json/blob column type (`INVALID_COLUMN_TYPE`)
- Legal quiz `dataModel` (question + response tables, D-12 composite index/unique) as shared truth source for tests and the Phase 2 compiler
- Phase dependencies + `db:generate` / `plugin:compile` script entries in place

## Task Commits

1. **Task 67-01-01: deps + package.json scripts** - `fca4389` (chore)
2. **Task 67-01-02 (RED): failing test + legal quiz sample** - `257328e` (test)
3. **Task 67-01-02 (GREEN): meta-schema implementation** - `5e07318` (feat)

_TDD task: RED (test) → GREEN (feat). No REFACTOR commit needed — implementation was clean on first green._

## Files Created/Modified
- `src/lib/dto/plugin-data-model.ts` - PluginDataModelSchema + COLUMN_TYPES whitelist + PLUGIN_DATA_MODEL_REASONS constants + inferred TS types
- `src/lib/dto/plugin-data-model.test.ts` - 1 happy-path + 5 negative-sample assertions (9 tests total)
- `plugins/quiz-sample/data-model.ts` - legal quiz dataModel declaration (compiler input)
- `package.json` - semver/drizzle-zod/@types/semver deps + db:generate/plugin:compile scripts

## Decisions Made
- **FK-to-core via strict():** Negative #3 (FK to a core table) is intentionally guarded by `z.strictObject` `unrecognized_keys` rather than a named reason constant — the declaration surface simply has no `foreignKeys`/`references` field, so any such key is rejected as unknown. Documented inline next to the reasons array to prevent "missing reason" confusion.
- **DDL scan strategy:** `JSON.stringify(table)` against `/\b(CREATE|ALTER|DROP)\b/i` catches DDL smuggled into any string value (column default, enum value, name), not just dedicated keys.
- **`enum` custom error:** `z.enum(COLUMN_TYPES, { error: () => "INVALID_COLUMN_TYPE" })` surfaces the named reason with `path` ending in `type`, satisfying the boundary-rejection assertion while keeping genuine z.enum whitelist semantics.

## Deviations from Plan

None - plan executed exactly as written. Both tasks completed per spec; all `must_haves` truths and artifacts satisfied.

## Issues Encountered
- **`server-only` token in prose:** Initial doc comments mentioned the literal string `server-only` while explaining the module is NOT server-only. The 67-03 verification gate (`grep -L 'server-only'` expecting a match) would have read those prose mentions as a positive hit. Reworded the comments to "服务端专属边界" wording so the literal token no longer appears; re-ran `grep -L` (now prints the filename = no match) and the test suite (still 9/9 green). Fix folded into the GREEN commit `5e07318`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DATA-01 validation foundation is in place: meta-schema rejects all 5 illegal classes with specific reasons; legal quiz sample parses and is ready as the compiler input.
- 67-02 can now build `scripts/compile-plugin-data-model.ts` consuming `quizDataModel` and emitting governed physical tables + migrations (FK injection, id/timestamps).
- `verify:phase` alias still points to `verify:phase65` by design — to be repointed to `verify:phase67` in 67-03 once the verify script exists.

## Self-Check: PASSED

- FOUND: src/lib/dto/plugin-data-model.ts
- FOUND: src/lib/dto/plugin-data-model.test.ts
- FOUND: plugins/quiz-sample/data-model.ts
- FOUND commit: fca4389
- FOUND commit: 257328e
- FOUND commit: 5e07318

---
*Phase: 67-declarative-plugin-owned-data-model-migration-proof*
*Completed: 2026-06-02*
