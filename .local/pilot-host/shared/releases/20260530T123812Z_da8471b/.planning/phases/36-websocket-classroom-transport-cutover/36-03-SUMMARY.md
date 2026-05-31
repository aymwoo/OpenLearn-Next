---
phase: 36
plan: 03
status: completed
created: 2026-05-18
files_changed:
  - src/components/classroom/classroom-control-panel.tsx
  - src/components/classroom/classroom-control-panel.test.tsx
  - src/components/classroom/classroom-live-snapshot-refresh.tsx
  - src/components/classroom/classroom-live-snapshot-refresh.test.tsx
  - src/components/learning/classroom-runtime-client.tsx
  - src/components/learning/classroom-runtime-client.test.tsx
  - src/features/runtime-platform/host/runtime-host-client.tsx
---

# Plan 36-03 summary

## What changed

- Cut the teacher control producer over to authenticated WebSocket envelopes:
  `ClassroomControlPanel` now sends `teacher.control` and `runtime.command`
  first, then falls back to the existing Server Actions when the socket cannot
  send or the server returns `transport.error`.
- Switched the classroom refresh surface to WS-first consumption while keeping
  `EventSource('/api/classroom/${sessionId}/events')` as the rollback path.
- Switched the student runtime shell to the same typed WebSocket consumer while
  preserving durable snapshot parity, presence updates, `snapshot_fallback`, and
  manual reconnect behavior.
- Kept the runtime iframe boundary unchanged: runtime updates still flow through
  `RuntimeHostClient` and the typed bridge helpers instead of injecting raw
  WebSocket payloads straight into the iframe.

## Verification

- `node "node_modules/vitest/vitest.mjs" --run src/components/classroom/classroom-control-panel.test.tsx src/components/classroom/classroom-live-snapshot-refresh.test.tsx src/components/learning/classroom-runtime-client.test.tsx`

## Notes

- Phase 36-03 is intentionally WS-first, not WS-only. SSE remains the rollback
  surface and durable snapshot fetch remains the correction layer for classroom
  and student UI state.
