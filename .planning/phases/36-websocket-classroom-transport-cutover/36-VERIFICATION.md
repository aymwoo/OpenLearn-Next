---
phase: 36-websocket-classroom-transport-cutover
verified: 2026-05-18T06:55:00Z
status: gaps_found
score: 2/6 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Teacher、student、classroom、runtime host 之间存在统一且可编译的鉴权 WebSocket 握手与 route boundary"
    status: failed
    reason: "`route.ts` 只是 426 说明页；真正握手在 `ws-server.ts`。同时 `ws-auth.ts` 与 `ws-server.ts` 当前均被 `pnpm typecheck` 阻断，握手主链路不成立。"
    artifacts:
      - path: "src/app/api/ws/classroom/[sessionId]/route.ts"
        issue: "未执行 upgrade/auth；PLAN 的 route -> ws-auth key_link 未建立"
      - path: "src/features/runtime-platform/seams/transport/ws-auth.ts"
        issue: "引用不存在的 schema 字段 `classroomSessions.schoolId`、`classMembers.studentId/status`，且 `getToken()` 输入类型不兼容 `IncomingMessage`"
      - path: "src/features/runtime-platform/seams/transport/ws-server.ts"
        issue: "依赖损坏的握手上下文，upgrade failure path 还存在 socket 类型错误"
    missing:
      - "按真实 Drizzle schema 重写 handshake scope 校验"
      - "为 custom Node upgrade 适配 Auth.js 可接受的 request 形状"
      - "让正式 upgrade/auth 边界与 plan artifact 对齐，或显式更新 must_have 并补 override"
  - truth: "Teacher control、runtime command、snapshot push、keepalive 通过同一合法 WebSocket channel contract 流动"
    status: failed
    reason: "协议枚举在 `ws-envelope.ts`、`ws-server.ts`、`gateway.ts` 与 DB trace schema 之间漂移；focused tests 通过，但没有证明真实 upgrade/data path 正常。"
    artifacts:
      - path: "src/features/runtime-platform/seams/transport/ws-server.ts"
        issue: "判断 `transport.ping` / `presence.update`，发送 `classroom.keepalive`；这些值都不在 envelope schema 中"
      - path: "src/features/runtime-platform/seams/transport/gateway.ts"
        issue: "`recordTransportConsumerTrace()` 使用 `runtime_event`，但 `transportConsumerTraces.traceType` schema 不支持，typecheck 失败"
      - path: "src/features/runtime-platform/seams/transport/ws-adapter.ts"
        issue: "将大多数 classroom 事件压扁成 `classroom.snapshot`，并伪造 actor"
    missing:
      - "统一 envelope、server handler、gateway trace schema 的 kind/traceType 枚举"
      - "补 teacher control/runtime command/keepalive 的真实集成验证"
      - "保留 canonical actor/event kind，不要在 ws adapter 中压扁语义"
  - truth: "Phase 36 已达到可执行的 WebSocket cutover 起点，并满足 RTPX-03 所需的 transport parity / rollback verification 前置条件"
    status: failed
    reason: "ROADMAP 的 Phase 36 仍包含 36-02 与 36-03，但仓库只落了 36-01 基线；consumer cutover 与 parity verification 都未完成，当前 ws path 也因编译 blocker 不能作为可执行起点。"
    artifacts:
      - path: ".planning/ROADMAP.md"
        issue: "Phase 36 success criteria 2/4 需要 consumer/parity，但 36-02/36-03 尚未完成"
      - path: "src/app/api/ws/classroom/[sessionId]/route.ts"
        issue: "仍只是说明面；SSE rollback 在，WS 还不是可替代现有 surface 的正式入口"
      - path: "src/features/runtime-platform/seams/transport/ws-auth.test.ts"
        issue: "测试基于伪 schema，未覆盖真实表结构与 raw upgrade 路径"
    missing:
      - "完成 36-02 的 classroom/player/runtime consumer 接线"
      - "完成 36-03 的 route auth / message validation / parity focused verification"
      - "在完成前撤销 ROADMAP/REQUIREMENTS 中将 RTPX-03 标为 Complete 的结论，或拆分 phase scope"
---

# Phase 36: WebSocket classroom transport cutover Verification Report

**Phase Goal:** 在现有 transport gateway 和课堂 durability truth 之上，完成课堂与
runtime 的正式 WebSocket 双向通信切换，并固定技术选型为 `ws`。
**Verified:** 2026-05-18T06:55:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

本次验证不接受 `36-01-SUMMARY.md` 的“已完成”叙述为证据，而是直接核对
ROADMAP success criteria、PLAN must_haves、REQUIREMENTS 与实际代码。

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Teacher、student、classroom、runtime host 之间存在统一的鉴权 WebSocket 握手与双向消息信封 | ✗ FAILED | `ws-auth.ts:82-136` 依赖不存在的 schema 字段；`pnpm typecheck` 直接报错。`route.ts:3-30` 仅返回 426，未执行握手。仓库也没有 36-02 对 consumer 的接线。 |
| 2 | teacher control、runtime command、snapshot push、keepalive 都通过同一 WebSocket contract 流动，并校验 actor/session scope | ✗ FAILED | `ws-server.ts:130-151` 判断 `transport.ping`/`presence.update`，但 `ws-envelope.ts:9-29` 只允许 `transport.keepalive`/`teacher.control`/`runtime.command`。`gateway.ts:167-198` 与 `schema.ts:753-755` 的 `traceType` 也漂移。 |
| 3 | durable truth 继续留在 SQLite + DAL + canonical event path；WebSocket 不成为新的业务真相源 | ✓ VERIFIED | `classroom.ts:92-114`、`runtime-host.ts:171-188`、`runtime-session.ts:258-272` 都是先走 canonical write path，再 `publishTransportEvent()`。`ws-adapter.ts:11-20` 也明确声明 transport 仅是 delivery 层。 |
| 4 | 现有 classroom/player/runtime surface 在切换后仍保留锁定/解锁、环节推进、snapshot recovery 与错误反馈语义 | ✗ FAILED | 代码里没有看到 36-02 的 consumer cutover；当前 `ws-server.ts` 只会发 snapshot / error，并未承接 teacher control 或 runtime command 的真实流转。 |
| 5 | 技术选型固定为 `ws`；未引入 Socket.IO 或并行 transport runtime | ✓ VERIFIED | `package.json:52,65` 新增 `ioredis`、`ws`；源码只有 `sse` 与 `websocket` 两种 adapter。仓库源码未发现 Socket.IO runtime 接线。 |
| 6 | 当前连接、握手、消息信封和 route/gateway 边界已足够稳定，可作为后续 `ioredis` fanout 的 cutover 起点，且 Redis 不是 prerequisite | ✗ FAILED | `ws-server.ts` 可选探测 `REDIS_URL`，但握手、协议、trace schema 当前都未稳定且无法通过 typecheck，不具备“稳定边界”资格。 |

**Score:** 2/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/app/api/ws/classroom/[sessionId]/route.ts` | authenticated classroom WebSocket upgrade endpoint | ✗ FAILED | 文件存在且被 App Router 暴露，但内容仅是 `GET -> 426` 说明面；不做 upgrade，也不导入 `ws-auth.ts`。 |
| `src/features/runtime-platform/seams/transport/ws-envelope.ts` | typed bidirectional WebSocket message envelope | ✓ VERIFIED | envelope schema、server/client schema 与 builder 都存在，且被 `ws-server.ts` / `ws-adapter.ts` 引用。问题在消费者未遵守该 contract。 |
| `src/features/runtime-platform/seams/transport/ws-connection-registry.ts` | session-scoped connection ownership and lifecycle registry | ✓ VERIFIED | 注册、注销、列出、广播都存在，并由 `ws-server.ts` 真正调用；`ws-connection-registry.test.ts` 覆盖基本行为。 |
| `src/features/runtime-platform/seams/transport/ws-auth.ts` | shared handshake auth and actor-scope validation | ✗ FAILED | 文件存在但主逻辑依赖不存在字段且类型不兼容，当前不可编译，不可视为有效 artifact。 |
| `src/features/runtime-platform/seams/transport/ws-server.ts` | actual Node upgrade host for real handshake path | ✗ FAILED | 真实 upgrade 确实在这里，但协议分支、DAL 边界、socket 类型都存在 blocker。 |
| `src/features/runtime-platform/seams/transport/ws-adapter.ts` | gateway -> ws delivery bridge | ⚠️ PARTIAL | 已接入 gateway，但会压扁 event kind 并伪造 actor，语义不可信。 |
| `src/features/runtime-platform/seams/transport/gateway.ts` | canonical publish + trace gateway | ✗ FAILED | publish 主链路存在，但 `recordTransportConsumerTrace()` 与 DB schema 枚举不一致，`pnpm typecheck` 失败。 |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `src/app/api/ws/classroom/[sessionId]/route.ts` | `src/features/runtime-platform/seams/transport/ws-auth.ts` | handshake validation before connection registration | ✗ NOT_WIRED | `route.ts` 没有导入或调用 `ws-auth.ts`；真正握手发生在 `server.ts` -> `ws-server.ts`。PLAN 的 key_link 未成立。 |
| `src/features/runtime-platform/seams/transport/gateway.ts` | `src/features/runtime-platform/seams/transport/ws-envelope.ts` | transport publish contract reused by WebSocket adapter | ⚠️ PARTIAL | `gateway.ts` -> `ws-adapter.ts` -> `ws-envelope.ts` 的链路存在，但 `ws-adapter.ts:22-28,42-60` 会压扁 kind 并伪造 actor。 |
| `server.ts` | `src/features/runtime-platform/seams/transport/ws-server.ts` | Node host initializes upgrade server | ✓ WIRED | `server.ts:21-23` 会初始化 `classroomWebSocketTransportServer`。 |
| `src/features/runtime-platform/seams/transport/ws-server.ts` | `src/features/runtime-platform/seams/transport/ws-auth.ts` | authenticate before connection registration | ⚠️ PARTIAL | `ws-server.ts:179-188` 确实先鉴权再注册，但鉴权实现本身不可编译。 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `ws-auth.ts` | handshake context (`userId/schoolId/actorScope`) | `classroomSessions` + `memberships` + `classMembers` | No | ✗ DISCONNECTED — 代码引用了真实 schema 中不存在的字段，数据流在编译期就断了。 |
| `ws-server.ts` | `snapshot` | `getClassroomSnapshotDTO({ sessionId })` | No | ⚠️ HOLLOW — `getClassroomSnapshotDTO()` 内部依赖 `getCurrentUserDTO()` / `auth()`，而当前调用发生在 raw Node upgrade 回调中。 |
| `ws-adapter.ts` | outbound `actor/kind` | `truthRef` + transport payload | No | ⚠️ STATIC — actor 与 kind 被合成/压扁，不是 canonical event metadata。 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| focused ws tests | `pnpm test --run src/features/runtime-platform/seams/transport/ws-envelope.test.ts src/features/runtime-platform/seams/transport/ws-auth.test.ts src/features/runtime-platform/seams/transport/gateway.test.ts` | 3 files, 10 tests passed | ✓ PASS |
| type safety / build signal | `pnpm typecheck` | 失败；覆盖 `gateway.ts`、`ws-auth.ts`、`ws-server.ts` 等本 phase 关键文件 | ✗ FAIL |
| additional build signal | `pnpm build` | 未执行：typecheck 已先阻断，继续 build 没有验证价值 | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `RTPX-03` | `36-01-PLAN.md` + `ROADMAP.md` | Classroom and runtime delivery can move to WebSocket or Socket.IO after transport parity and rollback support are verified. | ✗ BLOCKED | 当前仅有 36-01 基线，36-02/36-03 缺失；`pnpm typecheck` 失败且 parity/rollback verification 不存在。 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/features/runtime-platform/seams/transport/ws-auth.ts` | 82-136 | 依赖不存在的 schema 字段与错误 `getToken()` request 形状 | 🛑 Blocker | 握手主链路不可编译，teacher/student auth 无法成立。 |
| `src/features/runtime-platform/seams/transport/ws-server.ts` | 130-151 | 协议枚举漂移：`transport.ping` / `presence.update` / `classroom.keepalive` | 🛑 Blocker | keepalive / refresh 分支永远打不中合法 contract。 |
| `src/features/runtime-platform/seams/transport/ws-server.ts` | 72-103 | raw upgrade 回调直接调用 request-scoped DAL | 🛑 Blocker | 破坏了“复用现有 auth/DAL posture”的 phase 边界。 |
| `src/features/runtime-platform/seams/transport/gateway.ts` | 167-198 | trace schema 漂移：代码写 `runtime_event`，DB enum 不支持 | 🛑 Blocker | gateway 自身 typecheck 失败，transport trace 主链不可信。 |
| `src/features/runtime-platform/seams/transport/ws-adapter.ts` | 22-60 | 把多数 classroom 事件压扁为 `classroom.snapshot` 且伪造 actor | ⚠️ Warning | cutover 后客户端收到的语义不是 canonical truth。 |
| `src/features/runtime-platform/seams/transport/ws-auth.test.ts` | 37-50, 103-107 | 测试 fixture 使用伪 schema 字段 | ⚠️ Warning | 测试通过并不能证明真实 schema 下可工作。 |
| `src/features/runtime-platform/seams/transport/gateway.test.ts` | 126-154 | 只验证“调用过 ws adapter”，没验证 supplemental failure observability | ⚠️ Warning | ws supplemental delivery 失败可能被静默吞掉。 |

### Gaps Summary

当前代码**不能证明 Phase 36 已达成 phase goal**。

核心原因不是“还有一点尾巴”，而是 **cutover 起点本身不成立**：

1. **握手/auth 主链路不可用。** `ws-auth.ts` 与 `ws-server.ts` 当前就会让
   `pnpm typecheck` 失败，说明不是文档没补，而是代码本体还没站住。
2. **协议 contract 自相矛盾。** envelope、server handler、gateway trace schema
   三层枚举已经漂移，focused tests 通过也只是局部 mock 通过，不是系统 truth。
3. **ROADMAP 的 Phase 36 被过早标记为 complete。** 仓库只有 36-01 基线，
   36-02/36-03 对应的 consumer cutover 与 parity verification 尚未完成；因此
   `REQUIREMENTS.md` 中把 `RTPX-03` 标成 `Complete` 没有代码证据支撑。

结论：这不是“任务做了但还差验收”，而是 **SUMMARY 叙述超前于真实代码状态**。
在这些 blocker 修复前，Phase 36 不应关闭。

---

_Verified: 2026-05-18T06:55:00Z_
_Verifier: the agent (gsd-verifier)_
