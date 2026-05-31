---
phase: 37
plan: 02
status: completed
created: 2026-05-18
files_changed:
  - src/features/runtime-platform/seams/transport/gateway.ts
  - src/features/runtime-platform/seams/transport/ws-server.ts
  - src/features/runtime-platform/seams/transport/ws-connection-registry.ts
  - src/features/runtime-platform/seams/transport/redis-fanout-manager.ts
  - src/lib/dto/runtime-inspector.ts
  - src/lib/dal/runtime-inspector.ts
  - src/lib/dto/classroom.ts
  - src/components/surfaces/runtime-inspector-surface.tsx
  - src/components/surfaces/settings-surface.tsx
  - src/components/classroom/classroom-control-panel.tsx
  - src/features/runtime-platform/seams/transport/ws-connection-registry.test.ts
  - src/lib/dal/runtime-inspector.test.ts
  - src/components/surfaces/runtime-inspector-surface.test.tsx
  - src/components/surfaces/settings-surface.test.tsx
  - src/components/classroom/classroom-control-panel.test.tsx
---

# Plan 37-02 summary

## What changed

- Converged websocket delivery on the session snapshot and Redis fanout seam
  without creating a parallel publish path.
- Updated `gateway.ts` so Redis fanout degradation is recorded honestly as a
  failed cross-instance attempt even when the publisher instance can still do a
  local-only fallback.
- Tied websocket topic subscribe or release lifecycle to local socket ownership
  in `ws-server.ts` and `ws-connection-registry.ts`.
- Extended runtime inspector and classroom DTOs with transport topology,
  degraded status, degraded reason, and `receivedVia` semantics.
- Surfaced operator-visible transport status on `/settings`, runtime inspector,
  and teacher `/classroom`, while keeping Redis-specific degraded copy out of
  student-facing surfaces.

## Verification

- `"$(command -v node)" node_modules/vitest/vitest.mjs --run src/features/runtime-platform/seams/transport/gateway.test.ts src/features/runtime-platform/seams/transport/ws-server.test.ts src/features/runtime-platform/seams/transport/redis-fanout-manager.test.ts`
- `"$(command -v node)" node_modules/vitest/vitest.mjs --run src/lib/dal/runtime-inspector.test.ts src/components/surfaces/runtime-inspector-surface.test.tsx src/components/surfaces/settings-surface.test.tsx src/components/classroom/classroom-control-panel.test.tsx`

## Notes

- Redis remains delivery-only; SQLite + DAL + canonical runtime or classroom
  write paths remain the durable truth.
- Degraded fanout is now observable instead of being silently treated as a
  transparent success.
