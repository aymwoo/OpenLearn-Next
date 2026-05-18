---
phase: 36-websocket-classroom-transport-cutover
reviewed: 2026-05-17T22:42:54Z
depth: deep
files_reviewed: 25
files_reviewed_list:
  - AGENTS.md
  - .gitignore
  - .planning/phases/36-websocket-classroom-transport-cutover/36-CONTEXT.md
  - .planning/phases/36-websocket-classroom-transport-cutover/36-01-PLAN.md
  - .planning/phases/36-websocket-classroom-transport-cutover/36-01-SUMMARY.md
  - package.json
  - server.ts
  - src/app/api/classroom/[sessionId]/events/route.ts
  - src/app/api/ws/classroom/[sessionId]/route.ts
  - src/db/schema.ts
  - src/features/runtime-platform/seams/index.ts
  - src/features/runtime-platform/seams/transport/contract.ts
  - src/features/runtime-platform/seams/transport/gateway.ts
  - src/features/runtime-platform/seams/transport/gateway.test.ts
  - src/features/runtime-platform/seams/transport/sse-adapter.ts
  - src/features/runtime-platform/seams/transport/ws-adapter.ts
  - src/features/runtime-platform/seams/transport/ws-auth.ts
  - src/features/runtime-platform/seams/transport/ws-auth.test.ts
  - src/features/runtime-platform/seams/transport/ws-connection-registry.ts
  - src/features/runtime-platform/seams/transport/ws-connection-registry.test.ts
  - src/features/runtime-platform/seams/transport/ws-envelope.ts
  - src/features/runtime-platform/seams/transport/ws-envelope.test.ts
  - src/features/runtime-platform/seams/transport/ws-server.ts
  - src/lib/auth/auth.ts
  - src/lib/dal/classroom.ts
findings:
  critical: 3
  warning: 3
  info: 0
  total: 6
status: issues_found
---

# Phase 36: Code Review Report

**Reviewed:** 2026-05-17T22:42:54Z
**Depth:** deep
**Files Reviewed:** 25
**Status:** issues_found

## Summary

本次审查聚焦 Phase 36 的 WebSocket transport cutover 代码与刚生成的
plan/summary 产物，并沿着 auth、DAL、gateway、custom server 边界做了交叉检查。

结论：当前实现不能视为可上线的 cutover baseline。我本地执行
`pnpm typecheck` 直接失败，且失败点正落在本 phase 新增的 `ws-auth.ts`
与 `ws-server.ts`。除编译级问题外，还存在协议枚举漂移、在 raw Node upgrade
路径里直接调用 request-scoped DAL、以及测试用例与真实 schema 脱节的问题。

## Critical Issues

### CR-01: 握手鉴权建立在不存在的 schema 字段上，当前实现无法编译

**File:** `src/features/runtime-platform/seams/transport/ws-auth.ts:67-136`
**Issue:** `authenticateClassroomWebSocket()` 依赖了真实 schema 中不存在的字段与错误的鉴权输入：`classroomSessions.schoolId`、`classMembers.studentId`、`classMembers.status` 都不存在；同时 `getToken()` 也未接收当前传入的 `IncomingMessage` 类型。`pnpm typecheck` 已直接在这些位置失败，说明握手主链路当前不可用。
**Fix:** 按真实 schema 重写握手校验，使用 `classMembers.userId` 与 `classMembers.role` 校验学生归属，并从真实关系链推导 school scope；同时为 custom Node upgrade 单独适配 Auth.js 可接受的 request 形状。

```ts
const classMember = await db.query.classMembers.findFirst({
  where: and(
    eq(classMembers.classId, session.classId),
    eq(classMembers.userId, userId),
    eq(classMembers.role, "student"),
  ),
});
```

### CR-02: WebSocket 协议枚举已漂移，keepalive/refresh 分支永远走不到

**File:** `src/features/runtime-platform/seams/transport/ws-server.ts:110-150`
**Issue:** `ws-envelope.ts` 只声明了 `transport.keepalive` 等 kind，但 `ws-server.ts` 实际判断的是 `transport.ping`、`presence.update`，响应里又发送 `classroom.keepalive`。这些值都不在 schema 中，导致 client/server 协议自相矛盾，类型检查也已失败，keepalive 与 refresh 分支在正确协议下根本不会命中。
**Fix:** 统一协议枚举后再实现 handler。若保留 keepalive，则请求与响应都统一用 `transport.keepalive`；若需要 snapshot refresh，请放进已声明的 `runtime.command` 或 `teacher.control` payload 中，不要临时发明新 kind。

```ts
if (parsed.data.kind === "transport.keepalive") {
  ws.send(JSON.stringify(buildClassroomWebSocketServerEnvelope({
    sessionId: context.sessionId,
    actor,
    kind: "transport.keepalive",
    correlationId: parsed.data.messageId,
    payload: { acknowledged: true },
    truthPersisted: false,
  })));
}
```

### CR-03: raw WebSocket upgrade 路径直接调用 request-scoped DAL，越过 auth/DAL 边界

**File:** `src/features/runtime-platform/seams/transport/ws-server.ts:72-103,200-216`
**Issue:** 连接建立后直接调用 `getClassroomSnapshotDTO()` 推首帧，但该 DAL 内部依赖 `getCurrentUserDTO()` → `auth()` 的常规 Next request context。当前代码运行在自建 Node HTTP upgrade 回调里，不具备 App Router 的隐式请求态，因此这里要么抛 `TEACHER_AUTH_REQUIRED`，要么在错误上下文里鉴权。这破坏了本 phase 自己要求的“复用现有 auth/DAL posture”边界。
**Fix:** 把 snapshot 读取改成显式 actor 上下文版本，例如 `getClassroomSnapshotForActor({ sessionId, actorId, actorScope, schoolId })`，并且基于握手结果做授权，不再在 custom ws server 中调用依赖 `auth()` 的 request-scoped DAL。

## Warnings

### WR-01: ws-auth 测试验证的是伪造 schema，没能兜住真实回归

**File:** `src/features/runtime-platform/seams/transport/ws-auth.test.ts:37-50,103-107`
**Issue:** 测试 fixture 伪造了 `classroomSessions.schoolId` 和 `classMembers.studentId/status`，但真实 schema 并没有这些字段。于是测试通过只能证明“错误的数据模型下逻辑自洽”，并不能证明代码能接上真实表结构，这也是为什么它没拦住 `ws-auth.ts` 的 typecheck 失败。
**Fix:** 测试改为贴合真实 schema：使用 `classMembers.userId/role`，移除不存在字段，并把 `pnpm typecheck` 纳入 phase verification；同时补一条 ws upgrade 集成测试覆盖真实握手路径。

### WR-02: ws adapter 伪造 actor，并把所有 classroom 事件压扁成 `classroom.snapshot`

**File:** `src/features/runtime-platform/seams/transport/ws-adapter.ts:22-28,42-60`
**Issue:** `resolveWebSocketTransportKind()` 对所有非 `runtime.*` 事件一律返回 `classroom.snapshot`；同时 actor 也是由 `truthRef.id` / `runtimeSessionId` 临时拼装，且非 runtime 场景默认伪装成 `teacher`。这样会让 `active_step_changed`、`lock_mode_changed` 等事件在 WS 边界丢失语义，也会把错误 actor 信息下发给客户端，给后续 Phase 37 的 Redis fanout 埋协议债。
**Fix:** 把 canonical actor/type metadata 纳入 transport envelope，做显式映射；拿不到真实 actor 时不要伪造为 teacher，至少应使用 system/runtime actor 或在 envelope 中明确 `sourceActor` 缺失。

### WR-03: gateway 测试只断言“调用了 ws adapter”，没有覆盖 supplemental delivery 失败语义

**File:** `src/features/runtime-platform/seams/transport/gateway.ts:114-121`
**Related:** `src/features/runtime-platform/seams/transport/gateway.test.ts:126-154`
**Issue:** 现在 supplemental adapter 使用 `Promise.allSettled()`，意味着 WebSocket delivery 即使失败，主结果仍会被标记为 `delivered`，且不会留下单独失败信号。测试也只验证“被调用一次”，没有验证 supplemental delivery 失败时如何可观测。这会让 cutover 期间出现“数据库显示 delivered，但 ws 客户端完全没收到”的静默回归。
**Fix:** 至少补两层保护：一是为 supplemental adapter 单独记录 trace/failure；二是补测试覆盖 `websocketDeliverMock` reject 的场景，确认失败不会被吞掉成不可观测状态。

## Additional Notes

- `server.ts:6-8` 把 `dev/start` 全切到 `tsx server.ts` 后，部署与运行姿态已经改变，但本 phase 没有对应验证 custom server 与 Next 16 的集成行为；这本身就是回归面，建议在后续 phase 补 smoke test。
- `36-01-SUMMARY.md` 中“no external service configuration required”与实际引入 `ioredis` / `REDIS_URL` 探测不完全一致。虽然当前不是硬依赖，但文档最好明确“可选探测，不配置不会启用 Redis”。

---

_Reviewed: 2026-05-17T22:42:54Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
