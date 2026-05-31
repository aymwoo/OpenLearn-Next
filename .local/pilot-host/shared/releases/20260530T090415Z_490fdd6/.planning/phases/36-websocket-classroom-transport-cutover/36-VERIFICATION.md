---
phase: 36-websocket-classroom-transport-cutover
verified: 2026-05-18T03:27:36Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 2/6 must-haves verified
  gaps_closed:
    - real_schema_handshake_auth_and_raw_upgrade_request_compatibility
    - canonical_teacher_control_and_runtime_command_routing
    - websocket_producer_consumer_cutover_with_sse_rollback
    - canonical_verify_phase36_gate
  gaps_remaining: []
  regressions: []
human_verification: []
---

# Phase 36: WebSocket classroom transport cutover verification report

本报告按 Phase 36 的 roadmap success criteria、四个计划文件与 `RTPX-03`
的代码证据倒推验证，不采信旧的 summary 叙述。当前结论是：Phase 36 的实际代码、
focused suites 和单一 verifier 已收口到 `passed`，而且结论明确保留了
SSE rollback surface 与 Redis future-phase posture。

**Phase Goal:** 在现有 transport gateway 和课堂 durability truth 之上，完成
课堂与 runtime 的正式 WebSocket 双向通信切换，并固定技术选型为 `ws`。
**Verified:** 2026-05-18T03:27:36Z
**Status:** passed
**Re-verification:** Yes — gap closure after the initial blocker report

## Goal achievement

### Observable truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Teacher、student、classroom、runtime host 之间存在统一的鉴权 WebSocket 握手与真实 route boundary | ✓ VERIFIED | `src/features/runtime-platform/seams/transport/ws-auth.ts` 现在使用 `memberships.status === "active"`、`classMembers.userId`、`classMembers.role` 与 `classroomSessions.teacherId` 推导 actor scope；`server.ts -> ws-server.ts` 是真实 upgrade 边界；`src/app/api/ws/classroom/[sessionId]/route.ts` 继续诚实返回 `426` 与 `rollbackSurface`。 |
| 2 | `teacher.control`、`runtime.command`、`classroom.snapshot`、`runtime.event` 与 `transport.keepalive` 通过同一合法 contract 流动 | ✓ VERIFIED | `src/features/runtime-platform/seams/transport/ws-server.ts` 只接受 `transport.keepalive`、`teacher.control`、`runtime.command`；`src/features/runtime-platform/seams/transport/contract.ts` 与 `src/db/schema.ts` 对齐 `runtime_event` 等 traceType；`ws-adapter.ts` 保留 canonical `kind`、`correlationId` 与 `truthRef`。 |
| 3 | durable truth 继续留在 SQLite + DAL + canonical runtime path；WebSocket 不是新的业务真相源 | ✓ VERIFIED | `src/lib/dal/classroom.ts` 提供 `getClassroomSnapshotForActor()` 与 `applyWebSocketTeacherControlForActor()`；`src/features/runtime-platform/classroom/runtime-session.ts` 继续承接 `recordTeacherControlEvent()`；transport 仅做 delivery 与 trace。 |
| 4 | teacher producer、classroom consumer、student player 和 runtime host 都已切到 WS-first，同时保留 rollback 与 snapshot correction posture | ✓ VERIFIED | `src/components/classroom/classroom-control-panel.tsx` 先发 `teacher.control` / `runtime.command`，失败时回退到现有 Server Actions；`src/components/classroom/classroom-live-snapshot-refresh.tsx` 与 `src/components/learning/classroom-runtime-client.tsx` 均为 WS-first，并保留 EventSource / durable snapshot / manual reconnect。 |
| 5 | 技术选型固定为 `ws`；当前 phase 不引入 Socket.IO 或并行 transport runtime | ✓ VERIFIED | `package.json` 依赖中保留 `ws`；transport adapter 只有 `sse` 与 `websocket` 两种 mode；仓库未出现 Socket.IO 接线。 |
| 6 | 仓库存在单一、诚实的 `verify:phase36` 外部 gate，并明确 SSE rollback surface 与 Redis out-of-scope posture | ✓ VERIFIED | `package.json` 注册 `verify:phase36`；`scripts/verify-phase36-websocket-cutover.ts` 执行 non-comment static guards、8 个 focused suites、`pnpm typecheck`，并输出 `SSE rollback surface` 与 `Redis ... out of scope for Phase 36`。 |

**Score:** 6/6 truths verified

### Required artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/app/api/ws/classroom/[sessionId]/route.ts` | honest WebSocket route posture with rollback surface | ✓ VERIFIED | 普通 HTTP GET 继续返回 `426`、`upgradeRequired: true` 与 `/api/classroom/${sessionId}/events`。 |
| `src/features/runtime-platform/seams/transport/ws-auth.ts` | real-schema handshake auth | ✓ VERIFIED | 不再依赖伪 schema 字段，且已适配 raw upgrade request header/cookie 形状。 |
| `src/lib/dal/classroom.ts` | actor-aware snapshot read and teacher-control write helper | ✓ VERIFIED | `getClassroomSnapshotForActor()` 与 `applyWebSocketTeacherControlForActor()` 均存在并被 ws host 调用。 |
| `src/features/runtime-platform/seams/transport/ws-server.ts` | canonical upgrade host and inbound routing | ✓ VERIFIED | 统一承接 upgrade、message validation、snapshot emit、teacher control 和 runtime command。 |
| `src/features/runtime-platform/seams/transport/ws-adapter.ts` | gateway -> websocket bridge with canonical metadata | ✓ VERIFIED | outbound envelope 保留 canonical `kind`、`truthRef`、`correlationId`。 |
| `src/features/runtime-platform/seams/transport/gateway.ts` | supplemental failure observability | ✓ VERIFIED | WebSocket supplemental reject 会写 `stream_failed` trace。 |
| `src/components/classroom/classroom-control-panel.tsx` | teacher-side producer cutover with fallback | ✓ VERIFIED | 支持 `teacher.control` / `runtime.command` 与 fallback Server Actions。 |
| `src/components/classroom/classroom-live-snapshot-refresh.tsx` | teacher consumer WS-first + EventSource fallback | ✓ VERIFIED | 仅消费 `classroom.snapshot`，websocket 异常时回退到 SSE snapshot。 |
| `src/components/learning/classroom-runtime-client.tsx` | player consumer parity and manual reconnect posture | ✓ VERIFIED | 保留 `touchClassroomPresenceAction`、durable snapshot fetch、`snapshot_fallback` 与 manual reconnect。 |
| `scripts/verify-phase36-websocket-cutover.ts` | canonical Phase 36 verifier | ✓ VERIFIED | 包含 forbidden-token drift guard、focused suites、`pnpm typecheck` 与 honest rollback note。 |

### Key link verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `server.ts` | `src/features/runtime-platform/seams/transport/ws-server.ts` | Node host initializes upgrade server | ✓ WIRED | `server.ts` 初始化 `classroomWebSocketTransportServer`。 |
| `src/features/runtime-platform/seams/transport/ws-server.ts` | `src/features/runtime-platform/seams/transport/ws-auth.ts` | authenticate before connection registration | ✓ WIRED | 连接注册前先执行 `authenticateClassroomWebSocket()`。 |
| `src/features/runtime-platform/seams/transport/ws-server.ts` | `src/lib/dal/classroom.ts` | `getClassroomSnapshotForActor()` | ✓ WIRED | raw upgrade 首帧 snapshot 不再走 request-scoped DTO helper。 |
| `src/features/runtime-platform/seams/transport/ws-server.ts` | `src/lib/dal/classroom.ts` | `applyWebSocketTeacherControlForActor()` | ✓ WIRED | `teacher.control` 只进 canonical classroom mutation helper。 |
| `src/features/runtime-platform/seams/transport/ws-server.ts` | `src/features/runtime-platform/classroom/runtime-session.ts` | `recordTeacherControlEvent()` | ✓ WIRED | `runtime.command` 继续走 canonical runtime bridge path。 |
| `src/features/runtime-platform/seams/transport/gateway.ts` | `src/features/runtime-platform/seams/transport/ws-adapter.ts` | supplemental websocket delivery | ✓ WIRED | SSE 继续 primary，WebSocket supplemental failure 仍可观测。 |
| `src/components/learning/classroom-runtime-client.tsx` | `src/features/runtime-platform/host/runtime-host-client.tsx` | runtime event metadata -> typed host bridge | ✓ WIRED | runtime event 不直接注入 iframe，而是先汇入 host inputs。 |

### Data-flow trace (level 4)

| Artifact | Data variable | Source | Produces real data | Status |
| --- | --- | --- | --- | --- |
| `ws-auth.ts` | `userId`, `schoolId`, `actorScope`, `sessionId` | Auth.js token + `memberships` + `classMembers` + `classroomSessions` | Yes | ✓ FLOWING |
| `ws-server.ts` | outbound `classroom.snapshot` | `getClassroomSnapshotForActor()` | Yes | ✓ FLOWING |
| `ws-server.ts` | inbound teacher control result | `applyWebSocketTeacherControlForActor()` | Yes | ✓ FLOWING |
| `ws-server.ts` | inbound runtime command result | `recordTeacherControlEvent()` | Yes | ✓ FLOWING |
| `classroom-runtime-client.tsx` | corrected runtime shell state | `/api/classroom/${sid}/snapshot` durable fetch + typed runtime event metadata | Yes | ✓ FLOWING |

### Behavioral spot-checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| canonical phase gate | `pnpm verify:phase36` | 8 test files passed, 23 tests passed, `pnpm typecheck` passed | ✓ PASS |

### Requirements coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `RTPX-03` | `36-01`~`36-04` | Classroom and runtime delivery can move to WebSocket after transport parity and rollback support are verified. | ✓ SATISFIED | handshake auth、canonical routing、producer/consumer cutover、SSE rollback posture 与 `verify:phase36` 都已落到真实代码与 focused suites。 |

### Anti-patterns found

本次 re-verification 没有发现需要继续记录为 blocker 或 warning 的 active issue。
旧报告中的伪 schema 字段、协议漂移、request-scoped snapshot read、以及 verifier 缺失问题均已关闭。

## Gaps summary

当前没有 Phase 36 blocker gap。Phase 36 的结论是：

1. `ws` classroom transport cutover 已在代码与 focused verification 层完成。
2. SSE rollback surface 被保留为设计内的一部分，而不是未完成缺口。
3. Redis fanout、多实例 delivery、bootstrap/observability closeout 仍属于 Phase 37/38，
   不被错误计入 Phase 36 已交付范围。

---

_Verified: 2026-05-18T03:27:36Z_
_Verifier: the agent (gsd-verifier)_
