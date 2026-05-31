---
phase: 37-redis-fanout-and-multi-instance-delivery-convergence
verified: 2026-05-18T07:54:19Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
gaps: []
---

# Phase 37: Redis fanout and multi-instance delivery convergence verification report

本报告按 Phase 37 的 roadmap success criteria、`37-01`~`37-03` 计划文件与
`RTPX-02` 的本期交付边界倒推验证。当前结论是：Phase 37 已经把 Redis-backed
fanout、session snapshot、degraded observability、以及 canonical verifier
收口到 `passed`，同时保持“Redis 只是可选 delivery capability，不是默认业务真相源”的诚实口径。

**Phase Goal:** 用 `ioredis` 把新的 WebSocket transport 升级为可多实例分发的课堂 fanout 基础设施，同时保持 Redis 只是 delivery 层，不是业务真相源。
**Verified:** 2026-05-18T07:54:19Z
**Status:** passed
**Re-verification:** No

## Goal achievement

### Observable truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | 全局 transport posture 有 durable server truth，且只对新 session 生效 | ✓ VERIFIED | `src/db/schema.ts` 新增 `systemTransportSetting` 与 `classroomSession.transportModeSnapshot`；`src/lib/dal/system-transport-settings.ts` 合并 deploy authority、product toggle、reachability；`src/lib/dal/classroom.ts` 在 launch 时写 snapshot，不热切换既有 session。 |
| 2 | Redis fanout 建立在既有 transport gateway 之下，没有新增绕过 `publishTransportEvent()` 的 publish path | ✓ VERIFIED | `src/features/runtime-platform/seams/transport/ws-adapter.ts` 只把 canonical envelope 委托给 `classroomRedisFanoutManager.deliver()`；`src/features/runtime-platform/seams/transport/gateway.ts` 仍是 attempt truth writer；verifier 还通过 static guard 检查未绕过 `publishTransportEvent()`。 |
| 3 | redis_fanout 正常与 degraded 语义都能被记录、解释、并暴露给 operator | ✓ VERIFIED | `src/features/runtime-platform/seams/transport/gateway.ts` 在 degraded fallback 时记录 failed attempt；`src/lib/dal/runtime-inspector.ts`、`src/components/surfaces/runtime-inspector-surface.tsx`、`src/components/surfaces/settings-surface.tsx`、`src/components/classroom/classroom-control-panel.tsx` 都已暴露 `fanoutMode`、`degraded`、`degradedReason`。 |
| 4 | 仓库存在单一、诚实的 `verify:phase37` 外部 gate，且默认 local-only 开发姿态被明确保留 | ✓ VERIFIED | `package.json` 注册 `verify:phase37` 与 `verify:phase37:redis`；`scripts/verify-phase37-redis-fanout.ts` 执行 static guards、11 个 focused suites 与 `pnpm typecheck`，并在缺少 deploy capability 时明确输出 `Redis smoke skipped ...`；`scripts/bootstrap-dev-db.ts` 默认 seed `local_only`。 |

**Score:** 4/4 truths verified

### Required artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/db/schema.ts` | durable transport setting truth and session snapshot | ✓ VERIFIED | 新增 `systemTransportSetting` 与 `transportModeSnapshot`。 |
| `src/lib/dal/system-transport-settings.ts` | deploy-authoritative effective mode merge | ✓ VERIFIED | 明确区分 deploy authority、product toggle、effective mode 与 role-based manage ability。 |
| `src/actions/system-transport-settings-actions.ts` | developer/super_admin-only mutation | ✓ VERIFIED | 写路径只暴露给高权限角色。 |
| `src/features/runtime-platform/seams/transport/redis-fanout-topics.ts` | canonical session+subchannel topic naming | ✓ VERIFIED | topic 固定为 `classroomSessionId + classroom|runtime` 粒度。 |
| `src/features/runtime-platform/seams/transport/redis-fanout-manager.ts` | fanout seam with reconnect-aware desired topic tracking | ✓ VERIFIED | manager 保留 `desiredTopics`、`subscribedTopics`、`refCount` 与 reconnect 后恢复订阅语义。 |
| `src/features/runtime-platform/seams/transport/gateway.ts` | honest degraded attempt truth | ✓ VERIFIED | Redis fanout degrade 不再伪装成 delivered。 |
| `src/components/surfaces/settings-surface.tsx` | operator surface for deploy authority, toggle, and health | ✓ VERIFIED | 可区分 deploy disallowed、deploy allowed but product disabled、effective redis_fanout、以及 degraded。 |
| `src/components/surfaces/runtime-inspector-surface.tsx` | single inspector surface for transport topology | ✓ VERIFIED | 单 timeline surface 暴露 `receivedVia`、`fanoutMode` 与 degraded reason。 |
| `src/components/classroom/classroom-control-panel.tsx` | teacher-only degraded affordance | ✓ VERIFIED | 教师 `/classroom` 会看到“当前仅保证本实例课堂同步”的紧凑提示。 |
| `scripts/verify-phase37-redis-fanout.ts` | canonical phase verifier | ✓ VERIFIED | 包含 non-comment static guard、focused suites、`pnpm typecheck` 与 honest Redis smoke skip posture。 |
| `scripts/bootstrap-dev-db.ts` | honest local-only bootstrap | ✓ VERIFIED | 本地默认输出 `local_only` posture，不伪装成 Redis 已开启。 |

### Key link verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `src/lib/dal/classroom.ts` | `src/lib/dal/system-transport-settings.ts` | `launchClassroomSession()` reads effective mode once | ✓ WIRED | 新 session fanout posture 在创建时一次性快照。 |
| `src/features/runtime-platform/seams/transport/ws-adapter.ts` | `src/features/runtime-platform/seams/transport/redis-fanout-manager.ts` | websocket adapter delegates fanout topology | ✓ WIRED | adapter 不再把本地 registry 当成唯一 fanout 机制。 |
| `src/features/runtime-platform/seams/transport/ws-server.ts` | `src/features/runtime-platform/seams/transport/redis-fanout-manager.ts` | local socket ownership drives subscribe or release lifecycle | ✓ WIRED | 首个连接时 ensure subscribe，最后一个连接断开后 release subscribe。 |
| `src/features/runtime-platform/seams/transport/gateway.ts` | `src/features/runtime-platform/seams/transport/redis-fanout-manager.ts` | attempt truth maps redis delivery result and degraded fallback | ✓ WIRED | degraded fallback 会保留本地投递，但 outer attempt 仍然失败。 |
| `src/lib/dal/runtime-inspector.ts` | `src/components/surfaces/runtime-inspector-surface.tsx` | transport topology read model | ✓ WIRED | inspector 直接解释 local_only / redis_fanout / degraded local fallback。 |

### Behavioral spot-checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| canonical phase gate | `node --import tsx scripts/verify-phase37-redis-fanout.ts` | 11 test files passed, 74 tests passed, `pnpm typecheck` passed | ✓ PASS |
| optional redis smoke posture | `node --import tsx scripts/verify-phase37-redis-fanout.ts` without Redis env | printed `Redis smoke skipped because deploy capability not provided` | ✓ PASS |

### Requirements coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `RTPX-02` | `37-01`~`37-03` | Redis-backed websocket fanout, session-scoped topic routing, degraded fallback honesty, and operator-visible transport status are shipped behind an optional capability posture. | ✓ SCOPED SLICE SATISFIED | Phase 37 closes the Redis fanout slice of `RTPX-02`; BullMQ or broader async worker expansion remains outside this phase and is not claimed here. |

### Anti-patterns found

本次验证没有发现继续阻断 Phase 37 close 的 active gap。已显式关闭以下高风险偏差：

1. 把 Redis 写成新的 outer transport mode。
2. 绕过 `publishTransportEvent()` 直接从业务侧 publish Redis。
3. 在 degraded fallback 时把 cross-instance delivery 伪装成 delivered。
4. 把 Redis-specific degraded copy 泄漏到 student-facing runtime surface。

## Gaps summary

当前没有 Phase 37 blocker gap。Phase 37 的结论是：

1. Redis-backed websocket fanout 已在代码、focused suites 和 phase verifier 层完成。
2. 默认仓库姿态仍是 `local_only`，没有把 optional capability 错写成默认多实例完成态。
3. Phase 38 仍负责 cutover closeout、fallback or rollback 文档化、以及最终运营硬化，不被错误计入 Phase 37 已交付范围。

---

_Verified: 2026-05-18T07:54:19Z_
_Verifier: the agent_
