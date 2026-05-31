---
phase: 36
plan: 02
status: completed
created: 2026-05-18
files_changed:
  - src/features/runtime-platform/seams/transport/ws-auth.ts
  - src/features/runtime-platform/seams/transport/ws-server.ts
  - src/features/runtime-platform/seams/transport/contract.ts
  - src/features/runtime-platform/seams/transport/gateway.ts
  - src/features/runtime-platform/seams/transport/ws-adapter.ts
  - src/lib/dal/classroom.ts
  - src/app/api/ws/classroom/[sessionId]/route.ts
  - src/features/runtime-platform/seams/transport/ws-auth.test.ts
  - src/features/runtime-platform/seams/transport/ws-server.test.ts
  - src/features/runtime-platform/seams/transport/ws-adapter.test.ts
  - src/features/runtime-platform/seams/transport/gateway.test.ts
---

# Plan 36-02 summary

## What changed

- Reworked the WebSocket handshake so `ws-auth.ts` now validates against the real
  Drizzle schema chain: active `memberships`, `classMembers.userId`,
  `classMembers.role`, and `classroomSessions.teacherId`.
- Added the actor-aware classroom helpers needed by the raw Node upgrade host:
  `getClassroomSnapshotForActor()` for snapshot reads and
  `applyWebSocketTeacherControlForActor()` for canonical teacher-control writes.
- Tightened `ws-server.ts` so inbound `teacher.control` and `runtime.command`
  route only through the existing classroom DAL and runtime-session write paths,
  instead of creating a second truth source inside the transport layer.
- Unified the transport contract and trace enums around the shipped kinds and
  trace types: `classroom.snapshot`, `runtime.event`, `transport.keepalive`,
  `runtime_event`, and `stream_failed`.
- Kept the HTTP route posture honest: `/api/ws/classroom/[sessionId]` still
  returns `426` with an explicit rollback surface while the real handshake lives
  in `server.ts -> ws-server.ts`.

## Verification

- `node "node_modules/vitest/vitest.mjs" --run src/features/runtime-platform/seams/transport/ws-auth.test.ts src/features/runtime-platform/seams/transport/ws-adapter.test.ts src/features/runtime-platform/seams/transport/ws-server.test.ts src/features/runtime-platform/seams/transport/gateway.test.ts`
- `pnpm typecheck`

## Notes

- Phase 36-02 closes the backend cutover blockers but does not treat Redis as a
  prerequisite. WebSocket remains a delivery layer on top of the existing
  classroom and runtime durable truth.
