---
phase: 37
plan: 01
status: completed
created: 2026-05-18
files_changed:
  - src/db/schema.ts
  - src/lib/dto/system-transport-settings.ts
  - src/lib/dal/system-transport-settings.ts
  - src/actions/system-transport-settings-actions.ts
  - src/lib/cache-policy.ts
  - src/lib/dal/classroom.ts
  - src/features/runtime-platform/seams/transport/redis-fanout-connection.ts
  - src/features/runtime-platform/seams/transport/redis-fanout-manager.ts
  - src/features/runtime-platform/seams/transport/redis-fanout-topics.ts
  - src/features/runtime-platform/seams/transport/ws-adapter.ts
  - src/features/runtime-platform/seams/index.ts
  - drizzle/0003_phase37_redis_fanout.sql
  - drizzle/meta/_journal.json
  - drizzle/meta/0003_snapshot.json
---

# Plan 37-01 summary

## What changed

- Added the durable system truth for transport posture with
  `systemTransportSetting` and `classroomSession.transportModeSnapshot`.
- Introduced `system-transport-settings` DTO, DAL, and mutation action so
  deploy authority, product toggle, Redis reachability, and effective mode are
  merged on the server.
- Updated `launchClassroomSession()` to snapshot the effective transport mode at
  session creation time instead of re-reading a mutable global setting later.
- Added the Redis fanout seam: connection factory, session-scoped topic naming,
  and a fanout manager that stays behind the existing transport boundary.
- Kept `publishTransportEvent()` as the canonical business publish entry and
  changed the websocket adapter to delegate delivery through the fanout manager.
- Added the Phase 37 migration and snapshot metadata for the new table/column.

## Verification

- `"$(command -v node)" node_modules/vitest/vitest.mjs --run src/lib/dal/classroom.test.ts src/lib/dal/system-transport-settings.test.ts`

## Notes

- The default posture remains `local_only`.
- Existing classroom sessions are not hot-switched; only newly launched
  sessions receive the transport snapshot.
