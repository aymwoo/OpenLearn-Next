---
phase: 36-websocket-classroom-transport-cutover
plan: 01
subsystem: api
tags: [websocket, ws, transport, classroom, gateway]

requires:
  - phase: 31-transport-boundary-and-runtime-inspector
    provides: transport gateway、SSE adapter、delivery attempt truth
provides:
  - authenticated classroom WebSocket handshake contract
  - session-scoped connection registry and ws transport adapter entrypoint
  - classroom WebSocket route plus gateway fanout baseline with SSE rollback surface
affects: [Phase 36, Phase 37, RTPX-03, classroom transport]

tech-stack:
  added: [ws, ioredis]
  patterns: [node http upgrade host, typed websocket envelope, SSE-primary ws-supplemental delivery]

key-files:
  created:
    - src/features/runtime-platform/seams/transport/ws-envelope.ts
    - src/features/runtime-platform/seams/transport/ws-auth.ts
    - src/features/runtime-platform/seams/transport/ws-connection-registry.ts
    - src/features/runtime-platform/seams/transport/ws-adapter.ts
    - src/features/runtime-platform/seams/transport/ws-server.ts
    - src/app/api/ws/classroom/[sessionId]/route.ts
    - src/features/runtime-platform/seams/transport/ws-envelope.test.ts
    - src/features/runtime-platform/seams/transport/ws-auth.test.ts
    - src/features/runtime-platform/seams/transport/ws-connection-registry.test.ts
    - server.ts
  modified:
    - src/features/runtime-platform/seams/transport/contract.ts
    - src/features/runtime-platform/seams/transport/gateway.ts
    - src/features/runtime-platform/seams/transport/gateway.test.ts
    - src/features/runtime-platform/seams/index.ts
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "WebSocket 握手显式校验 token、membership、session scope 与请求 actor scope，避免 route 直接信任客户端 actor。"
  - "Gateway 保持 SSE 为 primary rollback surface，同时把 ws 接入 supplemental delivery，避免 cutover 第一阶段改变 durable truth。"
  - "普通 HTTP GET 访问 /api/ws/classroom/[sessionId] 返回 426 说明，真实 upgrade 由 Node http server 承接。"

patterns-established:
  - "Pattern: WebSocket envelope 统一包含 messageId、sessionId、actor、sentAt、correlation、payload。"
  - "Pattern: session-scoped registry 只维护连接 ownership/lifecycle，不承载 classroom 业务真相。"

requirements-completed: [RTPX-03]

duration: 11 min
completed: 2026-05-17
---

# Phase 36 Plan 01: classroom WebSocket cutover 第一阶段 Summary

**基于 `ws` 的课堂握手、消息信封、连接注册表与 Node upgrade 入口已落地，并保持 SSE 为短期 rollback surface。**

## Performance

- **Duration:** 11 min
- **Started:** 2026-05-17T22:24:43Z
- **Completed:** 2026-05-17T22:35:50Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments

- 固定了 classroom WebSocket 的双向 envelope contract，覆盖 teacher control、snapshot、runtime command/event、keepalive 与 error。
- 新增 session-scoped connection registry 与 handshake auth，确保连接 ownership 独立于业务真相。
- 打通 `/api/ws/classroom/[sessionId]` 正式入口、Node upgrade host、ws adapter 与 gateway fanout 基线，同时保留 SSE route 作为回滚面。

## Task Commits

Each task was committed atomically:

1. **Task 1: 定义 `ws` 握手、双向消息信封与连接注册表** - `72f91bf` (feat)
2. **Task 2: 新增课堂 WebSocket route，并把 gateway 扩成可承接 `ws` adapter 的正式入口** - `3ea5615` (feat)

**Plan metadata:** pending (将在 metadata commit 后补入 git 历史)

## Files Created/Modified

- `src/features/runtime-platform/seams/transport/ws-envelope.ts` - 定义双向消息信封与 correlation metadata。
- `src/features/runtime-platform/seams/transport/ws-auth.ts` - 复用 Auth.js token + membership/classroom scope 完成握手鉴权。
- `src/features/runtime-platform/seams/transport/ws-connection-registry.ts` - 维护 session-scoped 连接 ownership 与生命周期。
- `src/features/runtime-platform/seams/transport/ws-adapter.ts` - 提供 WebSocket transport adapter，并将 gateway 事件镜像到连接注册表。
- `src/features/runtime-platform/seams/transport/ws-server.ts` - 在 Node HTTP upgrade 上承接真实 ws 握手与消息处理。
- `src/app/api/ws/classroom/[sessionId]/route.ts` - 暴露正式 WebSocket route 说明面，HTTP GET 返回 426。
- `src/features/runtime-platform/seams/transport/gateway.ts` - 扩展为 SSE primary + ws supplemental delivery 入口。
- `server.ts` - 提供 Next + Node HTTP server 宿主以支持 upgrade。

## Decisions Made

- 使用 `ws` 的 `noServer + handleUpgrade` 模式，把鉴权与 path 选择放在 HTTP upgrade 边界完成，避免依赖不推荐的 `verifyClient`。
- WebSocket adapter 不直接写数据库；gateway 先记录 delivery attempt，再将事件镜像到 ws 连接，确保 transport 不成为新的 truth source。
- SSE 继续作为 primary adapter 和 rollback surface，Phase 36 只建立 ws 正式入口，不同时迁移全部 consumer。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 增加 Node upgrade host 承接真实 WebSocket 握手**
- **Found during:** Task 2 (新增课堂 WebSocket route，并把 gateway 扩成可承接 `ws` adapter 的正式入口)
- **Issue:** 仅新增 App Router route 无法处理真实 `Upgrade: websocket` 请求，ws cutover 入口会停留在说明页，无法形成最小可运行链路。
- **Fix:** 新增 `server.ts` 与 `ws-server.ts`，把 Next 请求处理与 `ws` `handleUpgrade` 收口到同一 Node HTTP server。
- **Files modified:** `server.ts`, `src/features/runtime-platform/seams/transport/ws-server.ts`, `package.json`, `pnpm-lock.yaml`
- **Verification:** `pnpm test --run src/features/runtime-platform/seams/transport/gateway.test.ts`；总验证通过
- **Committed in:** `3ea5615`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 该偏差是让 Task 2 变成“可执行 cutover 起点”的必要补充，没有改变 durable truth ownership，也没有引入超计划 consumer 迁移。

## Issues Encountered

- 工作区已存在未提交的 consumer 侧 WebSocket 草稿（如 `classroom-runtime-client.tsx`、`classroom-live-snapshot-refresh.tsx`）。执行时未将这些超范围改动纳入 task commit，避免污染原子提交与 blast radius。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 36-02 可以在当前 envelope、handshake、registry 与 gateway 基线上迁移 teacher control、player sync、runtime command consumer。
- 当前仍保留 SSE rollback surface，适合在 Phase 37 引入 `ioredis` fanout 前继续做渐进式 cutover。
- 高风险 blast radius 已识别：`publishTransportEvent` 为 CRITICAL，`resolveTransportAdapter` 为 HIGH；后续修改必须继续限制在 delivery 层，不触碰 durable truth 写链。

---
*Phase: 36-websocket-classroom-transport-cutover*
*Completed: 2026-05-17*

## Self-Check: PASSED

- FOUND: `.planning/phases/36-websocket-classroom-transport-cutover/36-01-SUMMARY.md`
- FOUND: `72f91bf`
- FOUND: `3ea5615`
