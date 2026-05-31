---
phase: 39
plan: 02
status: completed
created: 2026-05-18
files_changed:
  - src/db/schema.ts
  - drizzle/0004_phase39_async_tasks.sql
  - drizzle/meta/_journal.json
  - drizzle/meta/0004_snapshot.json
  - src/lib/cache-policy.ts
  - src/lib/dal/async-tasks.ts
  - src/lib/dal/async-tasks.test.ts
  - src/features/async-tasks/server/status.ts
  - src/features/async-tasks/server/mapper.ts
  - scripts/prepare-dev-db.ts
---

# Plan 39-02 summary

## What changed

- Added the SQLite durable async task truth with `asyncTask` and
  `asyncTaskEvent` tables following the latest-snapshot plus append-only-history
  pattern.
- Added the Phase 39 migration, snapshot metadata, and development DB bridge so
  `pnpm db:migrate` recognizes the new baseline cleanly.
- Extended cache policy with async task detail, actor-list, and entity-list tag
  boundaries.
- Added async task status and mapper helpers so durable rows are normalized into
  product-facing DTOs with honest enqueue posture.
- Implemented the async task DAL read models for actor-scoped lists,
  entity-scoped lists, and detail views without depending on BullMQ state.
- Added focused DAL tests that lock schema presence, cache tags, DTO parsing,
  and deterministic timeline ordering.

## Verification

- `pnpm db:migrate`
- `pnpm test --run src/lib/dal/async-tasks.test.ts src/db/schema.learning.test.ts`

## Notes

- SQLite remains the product-visible source of truth for async task status.
- `queueJobId` is present only as a nullable handoff point for later BullMQ
  phases, not as current truth.
