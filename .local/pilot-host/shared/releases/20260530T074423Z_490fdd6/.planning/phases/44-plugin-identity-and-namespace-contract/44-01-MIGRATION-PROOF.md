---
phase: 44-plugin-identity-and-namespace-contract
plan: 01
task: 2
type: migration-proof
completed: 2026-05-20T10:23:18Z
---

# 44-01 Migration proof

## Standard flow

- Ran `pnpm db:migrate` after approving the repo's pending pnpm build gate.
- Migration entry applied through `tsx scripts/prepare-dev-db.ts`.

## SQLite truth checks

- `PRAGMA table_info("pluginRegistration")` contains `pluginKey`, `dbNamespace`, `sourceType`, `installSource`
- `sqlite_master` contains `pluginRegistration_school_pluginKey_unique`
- `sqlite_master` contains `pluginRegistration_school_dbNamespace_unique`

## Backfill sample

- built-in records now read back with frozen SQL truth such as:
  - `builtin-teaching-step-direct-instruction` → `builtin_teaching_step_direct_instruction`
  - `dev-theme-starlight-classroom` → `dev_theme_starlight_classroom`
