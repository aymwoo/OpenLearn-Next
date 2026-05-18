---
phase: 36-websocket-classroom-transport-cutover
reviewed: 2026-05-18T03:27:36Z
depth: focused
files_reviewed: 16
files_reviewed_list:
  - package.json
  - scripts/verify-phase36-websocket-cutover.ts
  - server.ts
  - src/app/api/ws/classroom/[sessionId]/route.ts
  - src/lib/dal/classroom.ts
  - src/features/runtime-platform/seams/transport/contract.ts
  - src/features/runtime-platform/seams/transport/gateway.ts
  - src/features/runtime-platform/seams/transport/gateway.test.ts
  - src/features/runtime-platform/seams/transport/ws-adapter.ts
  - src/features/runtime-platform/seams/transport/ws-adapter.test.ts
  - src/features/runtime-platform/seams/transport/ws-auth.ts
  - src/features/runtime-platform/seams/transport/ws-auth.test.ts
  - src/features/runtime-platform/seams/transport/ws-server.ts
  - src/features/runtime-platform/seams/transport/ws-server.test.ts
  - src/components/classroom/classroom-control-panel.tsx
  - src/components/learning/classroom-runtime-client.tsx
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 36: Code review report

**Reviewed:** 2026-05-18T03:27:36Z
**Depth:** focused
**Files Reviewed:** 16
**Status:** clean

## Summary

本次 review 聚焦 Phase 36 的四条主线：真实 schema 握手与 raw upgrade 边界、
canonical teacher/runtime routing、producer/consumer cutover 与 rollback posture、
以及最终 `verify:phase36` gate。

结论：旧 review 中记录的 blocker 和 warning 已关闭，当前实现满足 Phase 36
锁定边界，没有发现新的 critical 或 warning 级问题需要阻止 closeout。

## Findings

本次 focused review 未发现需要继续记录的 critical 或 warning 级问题。

## What was checked

| Area | Status | Evidence |
| --- | --- | --- |
| Handshake auth uses real schema instead of pseudo fields | ✓ PASS | `src/features/runtime-platform/seams/transport/ws-auth.ts` 只使用 `memberships.status`、`classMembers.userId`、`classMembers.role` 与 `classroomSessions.teacherId`。 |
| Raw upgrade snapshot read stays inside explicit actor context | ✓ PASS | `src/lib/dal/classroom.ts` 暴露 `getClassroomSnapshotForActor()`，`ws-server.ts` 不再调用 request-scoped snapshot DTO helper。 |
| Inbound teacher and runtime commands stay on canonical write paths | ✓ PASS | `ws-server.ts` 只调用 `applyWebSocketTeacherControlForActor()` 与 `recordTeacherControlEvent()`。 |
| Gateway and adapter preserve canonical metadata and trace supplemental failure | ✓ PASS | `gateway.ts` 记录 `stream_failed`；`ws-adapter.ts` 保留 canonical `kind`、`truthRef` 与 `correlationId`。 |
| Teacher and student surfaces are WS-first but rollback-safe | ✓ PASS | `classroom-control-panel.tsx`、`classroom-live-snapshot-refresh.tsx`、`classroom-runtime-client.tsx` 都保留 fallback Server Actions、EventSource、durable snapshot 或 manual reconnect。 |
| Runtime host bridge boundary remains intact | ✓ PASS | Phase 36 consumer wiring 没有把 raw WebSocket payload 直接注入 iframe，runtime updates 仍走 `RuntimeHostClient` 的 typed bridge path。 |
| Phase verifier is honest and executable in the current repo environment | ✓ PASS | `package.json` 使用 `node --import tsx scripts/verify-phase36-websocket-cutover.ts`，verifier 自带 direct vitest runner fallback。 |

## Residual risks

- Phase 36 仍然只覆盖 `RTPX-03`。`ioredis` fanout、多实例 delivery、bootstrap
  closeout 与 observability 仍属于 Phase 37/38，而不是本次 clean review 的缺口。
- 当前保留 SSE rollback surface 是有意设计，不是遗留债；Phase 37 之前不应把它
  误写成“已经完全移除的旧路径”。

---

_Reviewed: 2026-05-18T03:27:36Z_
_Reviewer: the agent (focused Phase 36 close review)_
_Depth: focused_
