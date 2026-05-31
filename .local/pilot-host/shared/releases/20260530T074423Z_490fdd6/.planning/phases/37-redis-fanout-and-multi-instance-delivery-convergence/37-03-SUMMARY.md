---
phase: 37
plan: 03
status: completed
created: 2026-05-18
files_changed:
  - src/features/runtime-platform/seams/transport/redis-fanout-recovery.test.ts
  - src/features/runtime-platform/seams/transport/redis-fanout-manager.test.ts
  - src/lib/dal/system-transport-settings.test.ts
  - scripts/verify-phase37-redis-fanout.ts
  - scripts/bootstrap-dev-db.ts
  - package.json
  - src/features/runtime-platform/seams/transport/ws-adapter.test.ts
  - src/features/runtime-platform/seams/transport/ws-server.test.ts
  - src/components/classroom/classroom-roster-panel.test.tsx
  - src/components/classroom/classroom-student-detail-panel.test.tsx
  - src/components/surfaces/classroom-console-surface.test.tsx
---

# Plan 37-03 summary

## What changed

- Added the dedicated Redis recovery suite that proves reconnect,
  resubscribe, and local-only posture behavior explicitly.
- Published the canonical `verify:phase37` gate and a Redis-specific entrypoint
  in `package.json`.
- Made the verifier robust to the current repo environment by using the direct
  `node_modules/vitest/vitest.mjs` runner fallback when local `.bin` links are
  missing.
- Updated `bootstrap-dev-db.ts` to seed `systemTransportSetting` as
  `local_only` and print an honest local-dev message instead of implying Redis
  is on by default.
- Repaired the newly touched transport and snapshot test fixtures so Phase 37
  typecheck and focused suites close cleanly.

## Verification

- `node --import tsx scripts/verify-phase37-redis-fanout.ts`

## Notes

- The canonical close posture is now explicit: Redis fanout is optional,
  deploy-authoritative, and only proven as a live smoke path when
  `REDIS_FANOUT_ENABLED=true` and `REDIS_URL` are provided.
