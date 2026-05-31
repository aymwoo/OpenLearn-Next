# Phase 37: Redis fanout and multi-instance delivery convergence - Research

**Researched:** 2026-05-18  
**Domain:** WebSocket transport 上的可选 Redis fanout、多实例分发、降级与观测  
**Confidence:** MEDIUM-HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Redis fanout posture
- **D-01:** Phase 37 的 Redis fanout 固定为可选能力，不是默认 transport 基线；默认开发和单实例部署仍允许继续使用当前非 Redis 的单进程内存 fanout。
- **D-02:** Redis 模式启用后，也只能承担 WebSocket fanout / multi-instance delivery 职责；SQLite + DAL + classroom/runtime session write path 继续是唯一 durable truth。
- **D-03:** 业务侧继续只通过 `publishTransportEvent()` 进入 transport gateway；Phase 37 不允许新开一条绕过 gateway 的 Redis publish path。

### Enablement and authority
- **D-04:** Redis fanout 的启用条件同时存在于部署配置层和产品设置层，但部署配置是最终权威。
- **D-05:** 只有当服务端部署明确允许 Redis fanout 且 Redis 连接实际可用时，产品设置中的 Redis 模式才能生效；否则产品设置只能显示未就绪/不可启用状态，不能强行切换 transport。
- **D-06:** 产品内 Redis 设置固定为全局系统级设置，不按 school、不按 classroom session 分散配置。
- **D-07:** 只有 `developer` / `super_admin` 可以修改这个全局 Redis 设置；其他角色最多查看当前模式与健康状态。

### Session-scoped transport mode
- **D-08:** Redis 模式的产品设置变更只影响新创建的 classroom session；已存在会话不热切换 transport 模式。
- **D-09:** 具体落点固定为“在 classroom session 创建时快照本次会话的 transport mode”；后续连接握手、publish、subscribe 都消费该会话快照，而不是每次读取全局当前值。
- **D-10:** Phase 37 因此需要一个可持久化的全局系统配置真相源，供“创建课堂会话时快照 transport mode”读取；仓库当前没有现成的系统级 config table，可视为本阶段新增边界之一。

### Redis topic and routing granularity
- **D-11:** Redis topic 主作用域固定为 `classroomSessionId`，不改成 school-wide、instance-wide 或 runtime-only 顶层 topic。
- **D-12:** 在主作用域下，Redis routing 采用 `session + channel` 粒度，而不是把所有 snapshot / runtime / control 消息都塞进单一 session topic。
- **D-13:** 至少固定拆成 `classroom` 和 `runtime` 两类子 channel：step sync、lock/unlock、snapshot 等 classroom 语义走 classroom；runtime event / runtime teacher control 走 runtime。
- **D-14:** Phase 37 不把 topic 再细分到 per-command 或 per-runtime-instance 级别，避免订阅拓扑和恢复语义过早复杂化。

### Failure and degradation semantics
- **D-15:** 当 Redis 模式已启用但 publish / subscribe 发生故障时，系统必须诚实降级并显式记录 failure；不能把“多实例 fanout 已失效”伪装成 delivery 仍然正常。
- **D-16:** Redis 故障后的第一回退固定是“仅当前实例继续使用本地 connection registry 投递”；这样课堂可以继续，但只保证本实例，不保证跨实例一致性。
- **D-17:** SSE rollback posture 继续保留为已验证事实；但 Phase 37 不把 Redis 故障下的 recover 伪装成“透明成功”，而要明确区分“本实例仍可实时”和“跨实例 fanout 已失效”。
- **D-18:** Redis 相关降级状态必须同时暴露给 settings/inspector 与 classroom 操作者：前者看到完整模式和健康状态，后者在 `/classroom` 看到简洁但明确的 degradation 提示。

### Development and verification posture
- **D-19:** 本地开发默认不要求 Redis；开发者不启动 Redis 也应能继续跑当前单实例内存 fanout。
- **D-20:** Redis 模式与多实例 fanout 的完成证据必须落在专门的 Redis-focused verification command 或 `verify:phase37` gate 中，而不是只停留在手工说明或 runtime console output。
- **D-21:** Phase 37 的 close posture 必须诚实写明：Redis fanout 只在显式启用并完成配置时成立，默认仓库运行姿态仍兼容无 Redis 的单实例开发路径。

### the agent's Discretion
- Redis channel 的精确命名格式、adapter factory 结构、connection health probe 细节和 verifier 的具体脚本组织，可以由 planner 收敛，只要不违背 D-01 到 D-21。
- settings UI 是落在 `/settings` 还是 `/settings/labs` 的哪一块、如何展示“部署层允许但产品层关闭 / 部署层不允许”等状态，可由 planner 按现有设置面语言细化。
- classroom 页面上的 degradation 提示具体文案、密度与位置可由 planner 决定，但必须保持“操作者能明确知道跨实例 fanout 已失效”。

### Deferred Ideas (OUT OF SCOPE)
- 把 Redis fanout 提升为所有环境默认基线，或把 Phase 37 对外宣称成“默认多实例已完成”。
- 按 school 或按 classroom session 分散配置 Redis 模式。
- 允许运行中的课堂热切换 transport mode。
- 把 Redis topic 再细分到 per-command / per-runtime-instance 级别。
- Redis 故障时继续伪装跨实例 fanout 正常，或把 failure 隐藏成仅日志可见。
- 让学生侧也直接看到 Redis degrade 状态提示。
- 复用 cookie / actor-level preference 方式来持久化全局 Redis 设置。
- 把 Redis Streams、BullMQ、PostgreSQL、Socket.IO 或第二 runtime 一并拉进本阶段。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RTPX-02 | System can run Redis or BullMQ-backed fanout and async workers after the outbox model is stable. [VERIFIED: REQUIREMENTS.md] | 本研究将 Phase 37 明确收敛到 **Redis-backed WebSocket fanout only**，不引入 BullMQ、不改变 durable truth，并给出 adapter / session snapshot / degrade / verification 的可执行边界。 [VERIFIED: REQUIREMENTS.md] [VERIFIED: codebase read] |
</phase_requirements>

## Summary

Phase 37 的真实起点不是“给 WebSocket 加一个 Redis 开关”，而是**在已经完成的 Phase 36 WS-first delivery 基线之上，把单机 `ws-adapter -> in-memory registry` 演进成“本地 registry 负责最后一跳、Redis 负责跨实例 fanout”的可选拓扑**；同时必须保持 `publishTransportEvent()` 仍是唯一业务入口，SQLite + DAL 仍是 durable truth。当前代码已经满足这条主链：`src/lib/dal/classroom.ts` 与 runtime host path 都统一经 `publishTransportEvent()` 写 `transportDeliveryAttempts` / `transportConsumerTraces`，`ws-adapter.ts` 只做 delivery 映射，`ws-server.ts` 只做握手、注册、本地 socket 投递与 trace。 [VERIFIED: codebase read]

本阶段新增的真正边界只有三类：**(1) 可持久化的全局系统配置真相源；(2) `classroomSession` 创建时的 transport mode 快照；(3) Redis fanout manager / connection factory / degrade observability**。Redis Pub/Sub 本身是 at-most-once，不提供 durable replay；ioredis 的 subscriber 连接进入订阅模式后不能兼做普通命令连接，因此 Phase 37 不能把 Redis 设计成业务真相，也不能试图用单连接同时做 pub/sub 与健康探针。 [CITED: https://redis.io/docs/latest/develop/pubsub/] [CITED: https://github.com/redis/ioredis]

**Primary recommendation:** 把 Phase 37 实现为“`publishTransportEvent()` -> websocket adapter -> fanout manager -> (Redis pub/sub if session snapshot says redis && deploy capability ready) -> local registry broadcast`”的单通路，并在 Redis publish/sub 失败时把 `attemptStatus` 记为失败、同时允许 publisher 实例做 **local-only degraded fallback**，再把 degraded 状态统一暴露到 settings / runtime inspector / classroom operator。 [VERIFIED: codebase read] [CITED: https://redis.io/docs/latest/develop/pubsub/]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| classroom / runtime durable truth | Database / Storage | API / Backend | 课堂会话、runtime session、event outbox、transport attempts/traces 都已持久化在 SQLite/Drizzle，现有 DAL 是唯一真相写链。 [VERIFIED: codebase read] |
| canonical transport publish | API / Backend | — | `publishTransportEvent()` 已是唯一合法 publish 入口，业务侧没有第二条 Redis publish path。 [VERIFIED: codebase grep] [VERIFIED: codebase read] |
| WebSocket handshake / local socket host | Frontend Server (Node host) | Browser / Client | `server.ts -> ws-server.ts` 承接真实 upgrade；client 只消费 `/api/ws/classroom/[sessionId]`。 [VERIFIED: codebase read] |
| optional Redis fanout | API / Backend | — | Redis 只负责跨实例 message distribution，不负责 durable truth，也不应进入 browser 或 DAL truth layer。 [VERIFIED: 37-CONTEXT.md] [CITED: https://redis.io/docs/latest/develop/pubsub/] |
| session transport mode snapshot | Database / Storage | API / Backend | transport mode 必须在 `classroomSession` 创建时落库，后续 ws handshake / adapter / subscriber 都消费该快照。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase read] |
| global product transport setting | Database / Storage | API / Backend | 当前仓库没有系统级配置表；该真相源必须服务端持久化，不能落 cookie。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase grep] |
| deploy capability authority | API / Backend | — | Redis 是否允许启用取决于部署配置与连接可用性，服务端是最终权威。 [VERIFIED: 37-CONTEXT.md] |
| degraded health exposure | API / Backend | Frontend Server / Browser | degrade 事实应由服务端聚合 attempt / trace / in-memory health 后投射给 `/settings`、`/settings/labs/runtime-inspector` 与 `/classroom` 教师面。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase read] |

## Project Constraints (from AGENTS.md)

- 必须继续使用 **Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite-first**；本阶段不能借 Redis 引入新的 durable store。 [VERIFIED: AGENTS.md]
- UI 组件禁止直连数据库；所有读写必须经 **DAL + Server Actions**。Redis 设置 UI 也不能绕过这一边界。 [VERIFIED: AGENTS.md]
- 主 runtime 仍是 **Node.js**；Edge Runtime 仅用于 SSE。Redis 连接、Drizzle、Auth adapter 都应留在 Node 侧。 [VERIFIED: AGENTS.md]
- Next.js 16 缓存必须显式处理；任何全局设置写入或 inspector/settings 读模型变化，都应有明确 tag/update posture。 [VERIFIED: AGENTS.md]
- 首发数据库仍是 **SQLite**；新增 `classroomSession` 字段或全局系统表时，外键与 cascade posture 必须延续现有模式。 [VERIFIED: AGENTS.md] [VERIFIED: codebase read]
- Realtime 基线仍承认 **SSE rollback**；Phase 37 只能在此基础上增加 Redis-backed fanout，不得删除 rollback posture。 [VERIFIED: AGENTS.md] [VERIFIED: 36-VERIFICATION.md]
- 插件与扩展安全规则不变：不得使用 `eval()`、动态执行第三方代码、直接访问 DB 或核心 API。Redis fanout 只能留在服务端 seam。 [VERIFIED: AGENTS.md]
- 任何新增 settings / operator UI 仍应复用 Stitch / `DESIGN.md` 的产品语言，不新起 utilitarian admin console。 [VERIFIED: AGENTS.md]

## Current Baseline & Blast Radius

### 已确认事实

| Boundary / File | Current Role | Phase 37 posture |
|---|---|---|
| `src/features/runtime-platform/seams/transport/gateway.ts` | canonical publish + attempt/trace 持久化；primary=`sse`，supplemental=`websocket`。 [VERIFIED: codebase read] | **必须修改**：这里是唯一允许接入 Redis-aware websocket delivery semantics 的入口；不要新建平行 publish helper。 [VERIFIED: codebase read] |
| `src/features/runtime-platform/seams/transport/ws-adapter.ts` | 当前只把 event 映射后直接 `registry.broadcast()`。 [VERIFIED: codebase read] | **必须修改**：这是从“本地直发”升级为“fanout manager”最直接的落点。 [VERIFIED: codebase read] |
| `src/features/runtime-platform/seams/transport/ws-connection-registry.ts` | 当前只维护本实例 session -> sockets。 [VERIFIED: codebase read] | **应保留并轻改**：继续承担最后一跳投递与 session ownership；不要把它变成 Redis truth。 [VERIFIED: codebase read] |
| `src/features/runtime-platform/seams/transport/ws-server.ts` | 握手、register/unregister、初始 snapshot、teacher/runtime inbound routing。 [VERIFIED: codebase read] | **只应小改**：把 connection register/unregister 与 Redis subscription manager 挂接；不要把 Redis publish logic 塞进 message handler。 [VERIFIED: codebase read] |
| `src/lib/dal/classroom.ts` | `launchClassroomSession()` 创建 session；后续 classroom writes 统一 publish transport event。 [VERIFIED: codebase read] | **必须修改**：session 创建处是 transport mode snapshot 的唯一正确落点。其余 mutation 只需继续走 canonical publish，不应读全局当前值。 [VERIFIED: codebase read] |
| `src/db/schema.ts` | 已有 `classroomSessions`、`transportDeliveryAttempts`、`transportConsumerTraces`；没有系统级配置表。 [VERIFIED: codebase grep] [VERIFIED: codebase read] | **必须修改**：新增 system-level transport settings truth + session snapshot fields + 必要 trace metadata。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase read] |
| `src/lib/dal/runtime-inspector.ts` / `src/lib/dto/runtime-inspector.ts` / `runtime-inspector-surface.tsx` | 当前能展示 transport attempt/consumer trace，但只理解 delivered/failed/closed 等简化状态。 [VERIFIED: codebase read] | **应修改**：接 Redis mode/degraded/fallback facts；不要另建第二个 operator page。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase read] |
| `src/components/surfaces/settings-surface.tsx` / `/settings` / `/settings/labs` | 当前 settings 是 server-first surface；labs 页已承载 operator-style surface。 [VERIFIED: codebase read] | **应修改**：新增全局 Redis mode 状态与 developer/super_admin mutation UI；优先复用这里，不另起管理台。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase read] |
| `src/actions/theme-actions.ts` | 现有 server action 模式参考，但 persistence 是 actor cookie。 [VERIFIED: codebase read] | **只读参考，不应复用为真相源**：Redis 全局配置不能落 cookie。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase read] |
| `src/features/runtime-platform/seams/index.ts` | 当前 transport supportedAdapters = `sse` + `ws`。 [VERIFIED: codebase read] | **应小改**：表达“outer transport mode 仍是 websocket / sse；Redis 是 websocket fanout capability，不必伪装成第三 transport mode”。 [VERIFIED: codebase read] |
| `src/features/runtime-platform/seams/event-bus/*` | 当前 event bus seam 仅 future adapter vocabulary。 [VERIFIED: codebase read] | **只读不改**：Phase 37 不要把 WebSocket fanout 混成 event bus / Redis Streams cutover。 [VERIFIED: 37-CONTEXT.md] |

### 推荐的 blast-radius 控制

- **业务真相边界不动**：`classroomEvents`、`classroomSessions`、`runtimeEventOutbox`、runtime/classroom write helper 仍只走 DAL/host actions。 [VERIFIED: codebase read]
- **不要改 student-facing runtime truth model**：学生端仍通过 durable snapshot 校正 UI，不要开始直接信任 Redis payload。 [VERIFIED: codebase read]
- **不要改 `subscribeClassroomSocket()` 的产品姿态**：client 仍是 WS-first + SSE fallback；Phase 37 只让 server delivery 更诚实，不改学生端 degrade 提示策略。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase read]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ioredis` | `5.10.1` | Redis pub/sub 连接、publish、subscribe、reconnect。 [VERIFIED: npm registry] | 项目锁定 `ws + ioredis`；仓库已安装该版本。ioredis 文档明确支持 Pub/Sub、retryStrategy、autoResubscribe，足够支撑 Phase 37。 [VERIFIED: package.json] [CITED: https://github.com/redis/ioredis] |
| `ws` | `8.20.1` | Node-side WebSocket host。 [VERIFIED: npm registry] | Phase 36 已经真实落地在 `server.ts -> ws-server.ts` 上；Phase 37 只是在其下补 fanout，不换协议栈。 [VERIFIED: package.json] [VERIFIED: 36-VERIFICATION.md] |
| `drizzle-orm` | `0.45.2` | system setting truth、session snapshot、attempt/trace 持久化。 [VERIFIED: package.json] | Phase 37 所有 durable 事实仍应继续通过 Drizzle/SQLite 表达，不把 Redis 抬升为真相源。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase read] |
| SQLite | repo baseline | `classroomSession` snapshot、settings truth、attempt/trace evidence。 [VERIFIED: AGENTS.md] | Redis Pub/Sub 是 at-most-once；因此 durable 事实必须继续留在 SQLite。 [CITED: https://redis.io/docs/latest/develop/pubsub/] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `4.4.3` | 新增 Redis system setting DTO、deployment capability DTO、degraded status DTO。 [VERIFIED: package.json] | 用于 settings action 输入、inspector/settings 读模型输出、fanout detail JSON 解析。 [VERIFIED: codebase read] |
| existing transport seam (`contract.ts`, `gateway.ts`, `ws-envelope.ts`) | repo baseline | 现有 canonical transport vocabulary。 [VERIFIED: codebase read] | 所有 Redis fanout 只应扩在这些 seam 上，不应新开 ad hoc helper。 [VERIFIED: 37-CONTEXT.md] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ioredis` | `node-redis` | ioredis 官方 README 现在对新项目更推荐 `node-redis`，但本 phase 已被锁定到 `ioredis`，planner 不应擅自换栈。 [CITED: https://github.com/redis/ioredis] [VERIFIED: 37-CONTEXT.md] |
| Redis Pub/Sub | Redis Streams / BullMQ | Streams/BullMQ 提供更强交付语义或异步 worker，但本阶段明确 deferred；引入它们会改变 blast radius 与 truth posture。 [CITED: https://redis.io/docs/latest/develop/pubsub/] [VERIFIED: 37-CONTEXT.md] |
| Redis as delivery layer | Redis as truth / replay store | 这会直接违背 `TRNS-02` 与 D-02；而且 Pub/Sub 本身无重放保证。 [VERIFIED: REQUIREMENTS.md] [CITED: https://redis.io/docs/latest/develop/pubsub/] |

**Installation:**
```bash
pnpm add ioredis ws
```

> 当前仓库已包含 `ioredis@^5.10.1` 与 `ws@^8.20.1`，通常无需新增安装；planner 只需在 verify / CI 中确保 Redis server 可用。 [VERIFIED: package.json] [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Teacher / Runtime write path
        |
        v
DAL / host action persists classroom/runtime truth
        |
        v
publishTransportEvent()  ------------------------------+
        |                                              |
        v                                              |
transportDeliveryAttempts row                         |
        |                                              |
        v                                              |
resolve session transport snapshot -------------------+
        |
        +--> local-only session -> ws adapter -> local registry -> local sockets
        |
        +--> redis-enabled session
                |
                v
         fanout manager
          |           \
          |            \-- Redis unavailable/publish fail --> mark degraded + local-only fallback on publisher instance
          v
      Redis publish(topic = namespace:session:channel)
          |
          v
   subscribed instances receive message
          |
          v
   local registry broadcast on each instance
          |
          v
 transportConsumerTraces + inspector/settings/classroom operator visibility
```

该拓扑把 `publishTransportEvent()` 保持为唯一业务入口，把 `classroomWebSocketConnectionRegistry` 保持为最后一跳本地投递器，把 Redis 限定为 **cross-instance distribution bus**；这与现有 codebase 的 seam 组织完全同向。 [VERIFIED: codebase read]

### Recommended Project Structure

```text
src/
├── features/runtime-platform/seams/transport/
│   ├── redis-fanout-connection.ts      # Redis connection factory + health snapshot
│   ├── redis-fanout-manager.ts         # publish / subscribe / local fallback orchestration
│   ├── redis-fanout-topics.ts          # session + channel topic naming
│   ├── ws-adapter.ts                   # delegate to fanout manager, not direct registry.broadcast
│   ├── ws-connection-registry.ts       # local final-hop delivery + optional subscribe hooks
│   └── gateway.ts                      # canonical attempt status + degrade trace semantics
├── lib/dal/
│   ├── system-transport-settings.ts    # global product setting truth + role checks
│   ├── classroom.ts                    # snapshot transport mode during classroomSession create
│   └── runtime-inspector.ts            # read degraded / fanout evidence
├── lib/dto/
│   ├── system-transport-settings.ts    # settings DTO / action schema / health DTO
│   └── runtime-inspector.ts            # Redis-aware inspector fields
├── components/surfaces/
│   ├── settings-surface.tsx            # global setting + deployment authority + health state
│   └── runtime-inspector-surface.tsx   # degraded timeline / topology display
└── scripts/
    └── verify-phase37-redis-fanout.ts  # dedicated phase verifier
```

### Pattern 1: `publishTransportEvent()` 之下只扩 fanout，不扩业务真相

**What:** `classroom.ts`、`runtime-session.ts`、`runtime-host.ts` 已经统一经 `publishTransportEvent()` 进入 transport seam；Redis 必须只在 seam 内实现。 [VERIFIED: codebase grep] [VERIFIED: codebase read]

**When to use:** 所有 classroom snapshot、teacher control、runtime event、runtime teacher control 的跨实例投递。 [VERIFIED: codebase read]

**Why:** Redis Pub/Sub 是 at-most-once；一旦 subscriber 丢消息，Redis 不会补发，因此不能承载业务 truth。 [CITED: https://redis.io/docs/latest/develop/pubsub/]

**Example:**
```typescript
// Source: local code — src/lib/dal/classroom.ts
await publishTransportEvent({
  sessionId: input.sessionId,
  channel: "classroom-events",
  kind: input.kind,
  correlationId: input.correlationId,
  truthPersisted: true,
  truthRef: {
    type: "classroom-event",
    id: input.eventId,
    classroomSessionId: input.sessionId,
    schoolId: input.schoolId ?? undefined,
  },
  payload: input.payload,
})
```

### Pattern 2: transport mode 在 `classroomSession` 创建时快照

**What:** 全局系统设置只回答“新 session 默认希望走哪条 transport topology”；真正运行时只看 `classroomSession.transportModeSnapshot`。 [VERIFIED: 37-CONTEXT.md]

**When to use:** `launchClassroomSession()` 插入 `classroomSessions` 时。 [VERIFIED: codebase read]

**Recommended durable fields:**

| Table | Field | Purpose |
|---|---|---|
| `systemTransportSettings` *(new)* | `classroomTransportMode` enum: `local_only` \| `redis_fanout` | 产品层全局设置真相源；只表示“新会话默认目标模式”。 [VERIFIED: 37-CONTEXT.md] |
| `systemTransportSettings` *(new)* | `updatedById`, `updatedAt` | 审计谁改了全局模式。 [VERIFIED: 37-CONTEXT.md] |
| `classroomSessions` | `transportModeSnapshot` enum: `local_only` \| `redis_fanout` | 会话创建时快照；后续 handshake/publish/subscribe 都读它。 [VERIFIED: 37-CONTEXT.md] |
| `classroomSessions` | `transportAuthoritySnapshot` enum: `deploy_disallowed` \| `product_disabled` \| `redis_enabled` *(optional)* | **建议不要首发就加**；该类 authority 结果更适合写 attempt detail，不必污染 session 主表。 [VERIFIED: codebase read] |

**Who reads what:**

- `launchClassroomSession()`：读取 deploy capability + global product setting，决定新 session snapshot。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase read]
- `publishTransportEvent()` / `ws-adapter`：读取 session snapshot，决定 local-only 还是 redis fanout。 [VERIFIED: 37-CONTEXT.md]
- `ws-server` register/unregister：读取 session snapshot 或由 fanout manager 查询，以决定是否维护 Redis 订阅。 [VERIFIED: codebase read]
- `/settings`：读取 global product setting + deploy capability + current health。 [VERIFIED: 37-CONTEXT.md]

### Pattern 3: deploy authority 与 product setting 分层

**What:** 推荐用一个服务端 helper（例如 `getTransportDeploymentCapability()`）统一读取部署配置、Redis URL、连接可用性，输出：`deployAllowsRedis`, `redisReachable`, `effectiveEnablement`, `reasonCode`。这是 settings、launch snapshot、inspector 的共同真相入口。 [VERIFIED: 37-CONTEXT.md] [CITED: https://github.com/redis/ioredis]

**When to use:** settings page render、settings mutation action、classroom session create、phase verifier。 [VERIFIED: 37-CONTEXT.md]

**Do not:**

- 不要让 `/settings` 直接根据前端 toggle 假定 Redis 可用。 [VERIFIED: 37-CONTEXT.md]
- 不要让 `launchClassroomSession()` 直接读 cookie 或 client form 决定 snapshot。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase read]

### Pattern 4: Redis pub/sub 用双连接 + 会话级订阅引用计数

**What:** ioredis 订阅连接进入 subscriber mode 后，不能兼做普通命令连接；因此必须使用 **publisher connection** 与 **subscriber connection** 两条独立连接。 [CITED: https://github.com/redis/ioredis]

**When to use:** Redis-enabled session 的 publish / subscribe 生命周期。 [CITED: https://github.com/redis/ioredis]

**Recommended shape:**

- `redis-fanout-connection.ts`：建立 singleton `pub` / `sub` 两连接，暴露 health snapshot。 [CITED: https://github.com/redis/ioredis]
- `redis-fanout-manager.ts`：维护 `topic -> refCount`，在某实例首个本地 socket 注册时 `SUBSCRIBE`，最后一个 socket 离开时 `UNSUBSCRIBE`。 [VERIFIED: codebase read] [CITED: https://github.com/redis/ioredis]
- publisher 实例**不要同时本地直发+Redis 发布**，否则会与本机 subscriber 回调重复投递；正常路径应统一由 subscriber 回调 fanout 到本地 registry。 [CITED: https://redis.io/docs/latest/develop/pubsub/] [VERIFIED: codebase read]
- 只有在 Redis publish/sub 状态不健康时，才允许 publisher 实例走 `local registry` degraded fallback。 [VERIFIED: 37-CONTEXT.md]

### Pattern 5: degraded 诚实收口——attempt 失败，但 local consumer trace 可以成功

**What:** 如果 session snapshot = `redis_fanout`，而 Redis publish 或 subscriber delivery 失败，但 publisher 当前实例仍做了 local fallback，那么**outer transport attempt 仍应记为 failed**，同时单独记录本实例 local emit trace。 [VERIFIED: 37-CONTEXT.md]

**Why:** 这能同时表达两件事实：`(a)` 跨实例 fanout 已经失败；`(b)` 当前实例上的课堂没完全停摆。把 attempt 记成 delivered 会伪装跨实例仍正常。 [VERIFIED: 37-CONTEXT.md]

**Recommended durable vs memory split:**

| Data | Where | Reason |
|---|---|---|
| session snapshot mode | DB (`classroomSessions`) | durable contract，后续连接/发布都要复用。 [VERIFIED: 37-CONTEXT.md] |
| global product toggle | DB (`systemTransportSettings`) | 新 session 的系统级真相源。 [VERIFIED: 37-CONTEXT.md] |
| publish result / degraded reason / topic / instanceId | DB (`transportDeliveryAttempts.failureReason` + `payloadSummaryJson` or detail extension) | operator 必须能回看某次 publish 是否 degraded。 [VERIFIED: codebase read] |
| subscriber receive / local emit / stream_failed / stream_closed | DB (`transportConsumerTraces`) | inspector timeline 已依赖这些 trace。 [VERIFIED: codebase read] |
| current Redis connection status / retrying / subscribed topics ref-count | memory singleton | 高频、实例态、无需 durable replay。 [CITED: https://github.com/redis/ioredis] |
| classroom operator 当前 degrade banner visible state | memory/UI state, fed by server DTO | 这是呈现态，不是业务真相。 [VERIFIED: 37-CONTEXT.md] |

### Anti-Patterns to Avoid

- **绕开 `publishTransportEvent()` 直接 `redis.publish()`：** 会绕过 attempt/trace 持久化，破坏 canonical transport seam。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase read]
- **把 Redis 作为 `classroomSession`/runtime truth：** Pub/Sub 无重放且 at-most-once，不适合 truth ownership。 [CITED: https://redis.io/docs/latest/develop/pubsub/]
- **单连接同时做 pub/sub 与 publish/health probe：** subscriber mode 下命令受限，容易死锁或语义错乱。 [CITED: https://github.com/redis/ioredis]
- **对 redis-enabled session 把 local fallback 标成 delivered：** 会伪装跨实例成功。 [VERIFIED: 37-CONTEXT.md]
- **对在途 session 热切 transport mode：** 直接违背 D-08/D-09。 [VERIFIED: 37-CONTEXT.md]
- **让学生端显示 Redis degrade：** 决策已明确禁止。 [VERIFIED: 37-CONTEXT.md]

## Don’t Hand-Roll

| Problem | Don’t Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Redis connection lifecycle | ad hoc socket reconnect loop | `ioredis` built-in `retryStrategy` / `autoResubscribe` + explicit health listeners | 已有成熟 reconnect 事件与 auto-resubscribe；手写更易漏状态边界。 [CITED: https://github.com/redis/ioredis] |
| cross-instance event truth | custom in-memory cluster map | existing `publishTransportEvent()` + SQLite attempts/traces + Redis only for fanout | 这样才能保住 durable truth 与 inspector 证据链。 [VERIFIED: codebase read] |
| session subscription ownership | global subscribe-all hack | session+channel ref-count manager | D-11~D-14 已锁定 topic 粒度；subscribe-all 会扩大噪音与 blast radius。 [VERIFIED: 37-CONTEXT.md] |
| operator health inference | console-only logs | DB attempts/traces + settings / inspector DTO | 当前 inspector 已基于 DB timeline；继续沿用最省风险。 [VERIFIED: codebase read] |
| product global setting persistence | cookie / localStorage | typed server-side DB table + role-checked DAL/action | Phase 37 明确要求全局系统级真相源。 [VERIFIED: 37-CONTEXT.md] |

**Key insight:** Phase 37 的复杂度不在“发 Redis 消息”，而在 **authority、snapshot、duplicate avoidance、degraded honesty、operator evidence**。这些都已有现成 pattern：DAL、gateway、attempt/trace、server-first settings surface。 [VERIFIED: codebase read]

## Common Pitfalls

### Pitfall 1: 把 Redis 当成 transport mode 本身，而不是 websocket fanout capability

**What goes wrong:** 在 `contract.ts` / `adapterMode` / `supportedAdapters` 中直接加第三种 `redis` transport，导致业务层误以为存在 `sse` / `websocket` / `redis` 三条平级 delivery path。 [VERIFIED: codebase read]

**Why it happens:** 当前 schema 里的 `adapterMode` 只有 `sse` / `websocket`，很容易顺手把 Redis 也做成第三 adapter。 [VERIFIED: codebase read]

**How to avoid:** outer mode 仍保持 `websocket`；Redis fanout 作为 websocket adapter 内部 topology 或 attempt/trace detail 表达。 [VERIFIED: 37-CONTEXT.md]

**Warning signs:** settings、inspector、DTO 出现 `transportMode = redis` 但 UI 又还在说 WebSocket classroom transport。 [VERIFIED: codebase read]

### Pitfall 2: publish 成功就认定跨实例 delivery 成功

**What goes wrong:** 只要 `redis.publish()` resolve 就把 attempt 标记为 delivered，忽略 subscriber 掉线或本实例只 local fallback 的事实。 [CITED: https://redis.io/docs/latest/develop/pubsub/]

**Why it happens:** Pub/Sub 没有 end-to-end ack，publish 端很容易误判。 [CITED: https://redis.io/docs/latest/develop/pubsub/]

**How to avoid:** 对 redis-enabled session，把“Redis publish path failed / subscriber disconnected / only local fallback happened”显式记为 degraded failure，再用 consumer trace 补充本地 emit 证据。 [VERIFIED: 37-CONTEXT.md]

**Warning signs:** classroom operator 明明跨实例不同步，但 inspector 只显示 delivered、没有 degraded trace。 [VERIFIED: 37-CONTEXT.md]

### Pitfall 3: publisher 本地直发 + subscriber 回调再次直发，造成重复消息

**What goes wrong:** 同一实例收到双份 snapshot/runtime event。 [VERIFIED: codebase read]

**Why it happens:** 既想低延迟，又忘了 publisher 实例自己也会订阅该 topic。 [CITED: https://redis.io/docs/latest/develop/pubsub/]

**How to avoid:** 正常路径统一走 subscriber fanout；只有 degraded 时才本地直发，并以 `messageId` / `correlationId` 做明确 trace。 [VERIFIED: 37-CONTEXT.md]

**Warning signs:** 同一 session 同一 correlationId 出现双次 `snapshot` consumer trace。 [VERIFIED: codebase read]

### Pitfall 4: 用当前全局设置替代 session snapshot

**What goes wrong:** 已存在 classroom session 因为管理员切换了全局设置而在运行中改变拓扑。 [VERIFIED: 37-CONTEXT.md]

**Why it happens:** launch create path 没落库，只在 publish/handshake 时实时读取当前设置。 [VERIFIED: 37-CONTEXT.md]

**How to avoid:** 只在 `launchClassroomSession()` 读取全局 setting + deploy capability 并落 `transportModeSnapshot`。 [VERIFIED: codebase read] [VERIFIED: 37-CONTEXT.md]

**Warning signs:** 同一 session 不同时刻同一 page 显示 local_only / redis_fanout 结果不一致。 [VERIFIED: 37-CONTEXT.md]

### Pitfall 5: 把 Redis 健康提示暴露给学生端

**What goes wrong:** 学生看到基础设施异常文案，破坏课堂体验且不符合锁定决策。 [VERIFIED: 37-CONTEXT.md]

**Why it happens:** 直接复用现有 `snapshot_fallback` 或 transport error UI。 [VERIFIED: codebase read]

**How to avoid:** 学生端仍维持“正在重新连接课堂 / durable snapshot fallback”语义；Redis degrade 仅暴露给 settings/inspector 与 `/classroom` 操作者。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase read]

**Warning signs:** `classroom-runtime-client.tsx` 或 student surface 出现 Redis / multi-instance / degraded 文案。 [VERIFIED: codebase read]

## Code Examples

Verified patterns from official and local sources:

### 使用独立 pub/sub 连接
```typescript
// Source: https://github.com/redis/ioredis
import Redis from "ioredis"

const sub = new Redis(process.env.REDIS_URL)
const pub = new Redis(process.env.REDIS_URL)

await sub.subscribe("namespace:classroom-session:session-1:classroom")
sub.on("message", (channel, message) => {
  // fan out to local ws registry
})

await pub.publish(
  "namespace:classroom-session:session-1:classroom",
  JSON.stringify({ correlationId: "corr-1" }),
)
```

### 保住 canonical publish gateway
```typescript
// Source: local code — src/features/runtime-platform/seams/transport/gateway.ts
const event = RuntimeTransportPublishInputSchema.parse(input)
const adapter = resolveTransportAdapter(event)

const [attempt] = await db.insert(transportDeliveryAttempts).values({
  classroomSessionId: event.truthRef.classroomSessionId ?? event.sessionId,
  channel: event.channel,
  kind: event.kind,
  correlationId: event.correlationId,
  truthPersisted: event.truthPersisted,
  attemptStatus: adapter ? "pending" : "skipped",
}).returning()

await adapter?.deliver(event)
```

### 当前 client 仍是 WS-first + fallback
```typescript
// Source: local code — src/components/classroom/classroom-ws-client.ts
socket = new WebSocket(createClassroomWebSocketUrl(input.sessionId, input.actorScope))
socket.addEventListener("message", (event) => {
  handleSnapshotSignal(event.data)
})
socket.addEventListener("error", () => {
  attachFallbackSource()
})
```

## Recommended Implementation Topology

### 建议方案

1. **新增 `redis-fanout-connection.ts`**：封装 `pub` / `sub` 双连接、health state、事件监听、lazy connect。 [CITED: https://github.com/redis/ioredis]
2. **新增 `redis-fanout-topics.ts`**：统一 topic format，建议 `"${namespace}:classroom-session:${sessionId}:${subchannel}"`，其中 `subchannel ∈ {classroom, runtime}`。Redis 官方文档明确建议通过 channel prefix 做环境/作用域隔离。 [CITED: https://redis.io/docs/latest/develop/pubsub/]
3. **新增 `redis-fanout-manager.ts`**：
   - `publish(envelope, sessionSnapshot)`
   - `ensureSubscribed(sessionId, subchannel)`
   - `releaseSubscription(sessionId, subchannel)`
   - `getHealthSnapshot()`
   - `getDesiredTopics()`  
   由它统一调 Redis + local registry。 [VERIFIED: codebase read] [CITED: https://github.com/redis/ioredis]
4. **改 `ws-connection-registry.ts`**：注册/注销时返回 session owner count，供 fanout manager 做 topic ref-count。 [VERIFIED: codebase read]
5. **改 `ws-adapter.ts`**：不再直接 `registry.broadcast()`，而是把 canonical envelope 交给 fanout manager；只有 manager 才知道本 session 是 `local_only` 还是 `redis_fanout`。 [VERIFIED: codebase read] [VERIFIED: 37-CONTEXT.md]
6. **改 `gateway.ts`**：对 redis-enabled session 的 degraded path 记 attempt failure + trace detail，而不是简单 `delivered`。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase read]

### 不要做的事

- 不要在 `classroom.ts` / `runtime-session.ts` 里直接 `import Redis from "ioredis"`。 [VERIFIED: 37-CONTEXT.md]
- 不要在 `ws-server.ts` 的 inbound teacher/runtime handler 里直接做 Redis publish。 [VERIFIED: codebase read]
- 不要让 `/classroom` UI 直接轮询 Redis health；它应消费 server-provided DTO。 [VERIFIED: 37-CONTEXT.md]

## Session-Scoped Transport Mode Snapshot

### 已确认事实

- `launchClassroomSession()` 当前在事务内插入 `classroomSessions`、`classroomParticipants`、`classroomEvents`，然后再 `publishClassroomTransportEvent()`；这正是 transport mode snapshot 插入的最佳位置。 [VERIFIED: codebase read]
- 当前 `LaunchClassroomInputSchema` 只有 `lessonId/publishedVersionId/classId`，没有 transport mode 参数；这很好，因为 mode 不应由前端 launch 表单直接指定。 [VERIFIED: codebase read]
- 当前仓库没有 `systemConfig`/`globalSetting`/`siteSetting` 表。 [VERIFIED: codebase grep]

### 建议方案

**Global truth source:** 新增专用 typed 表 `systemTransportSettings`，而不是宽泛无类型 KV 表；原因是本阶段只有一个全局 transport capability，需要清晰列模型、权限与审计，不需要过早引入泛用配置系统。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase read]

**Recommended schema sketch:**

| Table | Column | Notes |
|---|---|---|
| `systemTransportSettings` | `id` singleton (`default`) | 允许简单 upsert。 [ASSUMED] |
| `systemTransportSettings` | `classroomTransportMode` (`local_only` / `redis_fanout`) | 只影响新 session。 [VERIFIED: 37-CONTEXT.md] |
| `systemTransportSettings` | `updatedById` FK -> `users.id` | 满足 developer/super_admin 审计。 [VERIFIED: 37-CONTEXT.md] |
| `systemTransportSettings` | `updatedAt` | 常规审计字段。 [ASSUMED] |
| `classroomSessions` | `transportModeSnapshot` (`local_only` / `redis_fanout`) | 会话创建时快照。 [VERIFIED: 37-CONTEXT.md] |

**Authority merge rule:**

```text
effective session snapshot =
  if deploy disallows redis -> local_only
  else if product global setting = redis_fanout and redis currently reachable -> redis_fanout
  else -> local_only
```

这个 merge 发生在 `launchClassroomSession()`；之后任何地方都只读 `classroomSessions.transportModeSnapshot`。 [VERIFIED: 37-CONTEXT.md]

## Degradation & Observability

### transport attempts / consumer traces 应如何收口

**Recommendation:**

- `transportDeliveryAttempts` 继续代表“本次 canonical publish 是否满足了该 session 的预期 delivery topology”。 [VERIFIED: codebase read]
- 对 `local_only` session：本地 registry broadcast 成功即可 `delivered`。 [VERIFIED: 37-CONTEXT.md]
- 对 `redis_fanout` session：
  - Redis publish + subscriber path 正常：`delivered`。 [CITED: https://github.com/redis/ioredis]
  - Redis publish/sub 故障但 publisher 实例做了 local fallback：`failed`，`failureReason` 明确写 degraded reason，同时 consumer trace 允许记录本机 `snapshot` / `runtime_event` emitted。 [VERIFIED: 37-CONTEXT.md]

**Recommended trace additions:**

| Surface | Recommended addition | Why |
|---|---|---|
| `transportDeliveryAttempts.payloadSummaryJson` | `fanoutMode`, `redisTopic`, `degraded`, `degradedReason`, `publisherInstanceId` | 不一定非要新列，但必须能被 inspector/settings 解释。 [VERIFIED: codebase read] |
| `transportConsumerTraces.detailJson` | `receivedVia: local_registry|redis_subscriber`, `instanceId`, `subchannel` | 区分本机 emit 与 Redis receive。 [VERIFIED: codebase read] |
| `RuntimeInspectorDTO.health` | `transportTopology`, `degraded`, `degradedReason`, `lastHealthyAt` | 现有 health 只有 delivered/failed，解释力不足。 [VERIFIED: codebase read] |

### settings / inspector / classroom operator 应如何展示

| Surface | Should show | Should not show |
|---|---|---|
| `/settings` | deploy capability、product toggle、effective mode、Redis reachability、最近 degraded 原因。 [VERIFIED: 37-CONTEXT.md] | 不要展示学生态文案或把 toggle 做成所有角色可改。 [VERIFIED: 37-CONTEXT.md] |
| `/settings/labs/runtime-inspector` | timeline 中明确分辨 `redis_fanout`、`local_only`、`degraded local fallback`。 [VERIFIED: 37-CONTEXT.md] | 不要只显示 generic failed/delivered，让 operator 猜是否跨实例失效。 [VERIFIED: 37-CONTEXT.md] |
| `/classroom` teacher operator | 简洁 banner：例如“跨实例实时分发暂不可用，当前仅保证本实例连接继续同步”。 [VERIFIED: 37-CONTEXT.md] | 不要把低层技术细节淹没控课主界面。 [VERIFIED: 37-CONTEXT.md] |
| student/player | 维持 reconnecting / snapshot fallback 语义。 [VERIFIED: codebase read] | 不要出现 Redis / multi-instance / deployment capability。 [VERIFIED: 37-CONTEXT.md] |

## Verification & Local Development

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | server host / verifier | ✓ | `v24.1.0` | — [VERIFIED: shell probe] |
| pnpm | verify command orchestration | ✓ | `10.33.0` | `npm exec` 可做次优替代，但 repo 已采用 pnpm scripts。 [VERIFIED: shell probe] |
| `ioredis` package | Redis fanout implementation | ✓ | `5.10.1` | — [VERIFIED: package.json] [VERIFIED: npm registry] |
| `ws` package | current websocket host | ✓ | `8.20.1` | — [VERIFIED: package.json] [VERIFIED: npm registry] |
| `redis-server` | 本地 Redis smoke / multi-instance 验证 | ✗ | — | 默认开发姿态回退到 local-only；CI 或显式本地验证时提供 Redis。 [VERIFIED: shell probe] |
| `redis-cli` | 手工 smoke / debug | ✗ | — | 使用 verifier 集成测试或 ioredis test helper。 [VERIFIED: shell probe] |

**Missing dependencies with no fallback:**
- 无。Phase 37 本地默认可在无 Redis 情况下继续开发 `local_only` path。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: shell probe]

**Missing dependencies with fallback:**
- `redis-server` / `redis-cli` 缺失会阻止本机 multi-instance smoke，但不会阻止默认开发；planner 应把 Redis integration 标成“显式提供 Redis 时必跑”。 [VERIFIED: shell probe] [VERIFIED: 37-CONTEXT.md]

### 推荐的 `verify:phase37` 范围

**建议方案：**

1. **静态 guard**  
   - 禁止新增 `publishRedis*(` 之类绕过 gateway 的 helper。 [VERIFIED: 37-CONTEXT.md]
   - 禁止 student UI 出现 `Redis` / `multi-instance` / `degraded` 文案。 [VERIFIED: 37-CONTEXT.md]
   - 要求 `launchClassroomSession()` 写入 `transportModeSnapshot`。 [VERIFIED: 37-CONTEXT.md]
   - 要求 settings mutation 做 `developer` / `super_admin` 检查。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: membership DTO]

2. **focused unit / component suites**  
   - `gateway.test.ts`：redis-enabled session 的 delivered / degraded / local fallback 语义。 [VERIFIED: codebase read]
   - `ws-adapter.test.ts`：canonical envelope 仍保留 `kind/correlationId/truthRef`，并委托 fanout manager。 [VERIFIED: codebase read]
   - `ws-server.test.ts`：register/unregister 时 subscription manager hook；不把 Redis publish 放进 inbound handler。 [VERIFIED: codebase read]
   - `settings-surface` / settings action tests：权限 + authority merge + readonly posture。 [VERIFIED: 37-CONTEXT.md]
   - `runtime-inspector` tests：degraded 解释面。 [VERIFIED: codebase read]

3. **Redis integration smoke**  
   - 启两个 app 实例、同一个 Redis、两个 WS 客户端挂到不同实例，验证 teacher control / classroom snapshot / runtime event 能跨实例送达。 [VERIFIED: 37-CONTEXT.md] [CITED: https://redis.io/docs/latest/develop/pubsub/]
   - 断开 Redis 或让 subscriber 失联，验证 publisher 实例 local fallback 仍继续、本实例 UI 提示 degraded、attempt 记 failed。 [VERIFIED: 37-CONTEXT.md]

4. **typecheck**  
   - 延续 Phase 36 verifier 模式，`pnpm typecheck` 必跑。 [VERIFIED: codebase read]

### 推荐的本地开发姿态

- `pnpm dev` 默认无需 Redis；系统应落回 `local_only`，settings 显示“部署未提供 Redis capability”。 [VERIFIED: 37-CONTEXT.md]
- 可选提供 `REDIS_URL` 后再启用 Redis integration 或显式切 product toggle。 [VERIFIED: 37-CONTEXT.md] [ASSUMED]
- 推荐把 canonical 脚本注册为：  
  - `verify:phase37`：静态 + focused suites + typecheck +（如果有 `REDIS_URL` 则跑 integration；没有则诚实 skip） [VERIFIED: 37-CONTEXT.md]  
  - `verify:phase37:redis`：强制 Redis integration；本地/CI 专项门。 [ASSUMED]

## Risk & Tradeoffs

| Risk | Why it matters | Recommended stance |
|------|----------------|--------------------|
| Pub/Sub at-most-once | subscriber 掉线即丢消息，不能 replay。 [CITED: https://redis.io/docs/latest/develop/pubsub/] | 继续把 SQLite + DAL 当 truth；Redis 只做 fanout。 |
| subscriber-mode connection limits | ioredis subscriber 连接不能兼做普通命令。 [CITED: https://github.com/redis/ioredis] | 必须双连接（pub/sub），health probe 也不要复用 subscriber。 |
| reconnect / resubscribe semantics | autoResubscribe 有帮助，但仍需本实例记住当前 desired topics。 [CITED: https://github.com/redis/ioredis] | fanout manager 保存 `topic -> refCount` 内存态；连接重建后以此恢复。 |
| duplicate local delivery | publisher 本地直发 + subscriber 回调再次直发会重复。 [VERIFIED: codebase read] | 正常路径只走 subscriber fanout；degraded 才 local direct。 |
| roadmap wording tension | ROADMAP 说“Back the new WebSocket transport with ioredis fanout”，容易被误读成默认基线。 [VERIFIED: ROADMAP.md] | planner 必须诚实改写为“when enabled / when deploy capability allows”，并在 PLAN/closeout 中写明默认开发仍可无 Redis。 [VERIFIED: 37-CONTEXT.md] |
| SSE rollback coexistence | 当前 client 仍保留 SSE fallback。 [VERIFIED: 36-VERIFICATION.md] | Phase 37 不应删除它；Redis 故障下不必退回 SSE for all cases，但 rollback posture 仍是 milestone truth。 |

## Recommended Plan Split

### 37-01 — System setting + session snapshot + Redis fanout seam infra

**Boundary:** schema、DAL、DTO、settings action、fanout connection factory、topic naming、`ws-adapter` 委托改造。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase read]

**Goal:** 先把 authority 与 topology 基础搭起来，让“新 session 可以被创建为 local_only 或 redis_fanout”成为稳定 contract。 [VERIFIED: 37-CONTEXT.md]

### 37-02 — Runtime/classroom fanout convergence + degraded operator surfaces

**Boundary:** `gateway.ts` attempt/trace semantics、`ws-server.ts` subscribe lifecycle、`runtime-inspector`、`settings-surface`、`classroom-control-panel` degradation affordance。 [VERIFIED: codebase read]

**Goal:** 让跨实例 classroom/runtime delivery 与 degraded honesty 在产品面和 operator 面都能解释清楚。 [VERIFIED: 37-CONTEXT.md]

### 37-03 — Dedicated verification gate + local-dev honest posture

**Boundary:** `scripts/verify-phase37-*.ts`、package script 注册、Redis integration smoke harness、bootstrap/dev notes。 [VERIFIED: package.json] [VERIFIED: shell probe]

**Goal:** 把“默认无 Redis 也能开发、显式提供 Redis 时必须证明 multi-instance fanout”固化为唯一 gate。 [VERIFIED: 37-CONTEXT.md]

## Candidate File Map for Planner

| File | Action | Closest analog / pattern |
|---|---|---|
| `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts` | new | `event-bus/default-adapter.ts` 的 singleton/subscriber map 思路 + ioredis pub/sub docs。 [VERIFIED: codebase read] [CITED: https://github.com/redis/ioredis] |
| `src/features/runtime-platform/seams/transport/redis-fanout-manager.ts` | new | `ws-connection-registry.ts` + `gateway.ts`；负责 ref-count、publish、fallback。 [VERIFIED: codebase read] |
| `src/features/runtime-platform/seams/transport/redis-fanout-topics.ts` | new | 无直接 analog；做纯函数 topic builder。 [VERIFIED: 37-CONTEXT.md] |
| `src/features/runtime-platform/seams/transport/ws-adapter.ts` | modify | 现有 ws adapter。 [VERIFIED: codebase read] |
| `src/features/runtime-platform/seams/transport/ws-connection-registry.ts` | modify | 现有 registry；增加 hook 或 owner count。 [VERIFIED: codebase read] |
| `src/features/runtime-platform/seams/transport/gateway.ts` | modify | 现有 canonical attempt/trace writer。 [VERIFIED: codebase read] |
| `src/features/runtime-platform/seams/index.ts` | modify | 现有 seam export map。 [VERIFIED: codebase read] |
| `src/lib/dal/system-transport-settings.ts` | new | `runtime-inspector.ts` 的 role-scope read model + `theme-actions.ts` 的 server action pattern（只借模式不借 persistence）。 [VERIFIED: codebase read] |
| `src/lib/dto/system-transport-settings.ts` | new | `runtime-inspector.ts` / `classroom.ts` DTO style。 [VERIFIED: codebase read] |
| `src/db/schema.ts` | modify | 现有 typed tables + enum columns。 [VERIFIED: codebase read] |
| `src/lib/dal/classroom.ts` | modify | `launchClassroomSession()` current transaction pattern。 [VERIFIED: codebase read] |
| `src/lib/dto/classroom.ts` | modify | `LaunchClassroomInputSchema` / `ClassroomSnapshotDTOSchema`。 [VERIFIED: codebase read] |
| `src/lib/dal/runtime-inspector.ts` | modify | 现有 timeline aggregation。 [VERIFIED: codebase read] |
| `src/lib/dto/runtime-inspector.ts` | modify | 现有 health/timeline DTO。 [VERIFIED: codebase read] |
| `src/components/surfaces/runtime-inspector-surface.tsx` | modify | 现有 metric cards + unified timeline。 [VERIFIED: codebase read] |
| `src/components/surfaces/settings-surface.tsx` | modify | 现有 server-rendered settings/labs 双 surface。 [VERIFIED: codebase read] |
| `src/app/settings/page.tsx` / `src/app/settings/labs/page.tsx` | maybe modify | 现有 settings route shell。 [VERIFIED: codebase read] |
| `src/components/classroom/classroom-control-panel.tsx` | modify | 现有 operator banner + runtime proof affordance。 [VERIFIED: codebase read] |
| `scripts/verify-phase37-redis-fanout.ts` | new | `scripts/verify-phase36-websocket-cutover.ts`。 [VERIFIED: codebase read] |
| `package.json` | modify | `verify:phase36` script registration pattern。 [VERIFIED: package.json] |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 单进程本地 registry 是 websocket 唯一 fanout 机制 | **可选** Redis-backed pub/sub fanout + local registry final-hop | Phase 37 target on top of Phase 36 baseline。 [VERIFIED: ROADMAP.md] [VERIFIED: 37-CONTEXT.md] | 提供多实例 delivery，但只在显式启用时成立。 |
| 单 Redis 连接既想 publish 又想 subscribe | 分离 `pub` / `sub` 两连接 | ioredis pub/sub contract。 [CITED: https://github.com/redis/ioredis] | 避免 subscriber mode 限制普通命令。 |
| 认为 pub/sub 可当 truth/replay | 将 pub/sub 明确限制为 delivery-only | Redis Pub/Sub docs 已明确 at-most-once。 [CITED: https://redis.io/docs/latest/develop/pubsub/] | 防止 durable truth 漂移到 Redis。 |

**Deprecated/outdated:**
- “Redis 一加上就等于默认多实例 ready” 这一路径对本仓库是过时/错误口径；Phase 37 context 已把它收紧为 optional capability。 [VERIFIED: 37-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `systemTransportSettings` 使用 singleton `id=default` 最省风险。 | Session-Scoped Transport Mode Snapshot | 如果团队更偏好 key-value 或 broader system config table，schema 命名需要重画，但不会改变 authority/snapshot 主设计。 |
| A2 | 额外提供 `verify:phase37:redis` 子命令会比只靠环境变量触发更清晰。 | Verification & Local Development | 如果团队坚持单一命令，也只需收敛脚本组织，不影响测试内容。 |
| A3 | 全局设置入口更适合放在 `/settings` 主面而不是单独新建 route。 | Candidate File Map / Settings | 如果最终决定放 `/settings/labs`，只影响信息架构，不影响权限和持久化边界。 |

## Resolved Planning Decisions

1. **(RESOLVED) 全局 Redis 设置入口放在 `/settings` 主面。**
   - 已决：`/settings` 主面承载 capability/status/toggle；`/settings/labs` 继续保留 runtime inspector drill-down。
   - 理由：这项能力是系统级 transport setting，不是 actor-level labs preference；同时当前 `SettingsSurface` 已具备 server-first 设置聚合模式。 [VERIFIED: codebase read] [VERIFIED: 37-CONTEXT.md]

2. **(RESOLVED) Redis integration proof 采用双层 gate。**
   - 已决：`verify:phase37` 作为默认 phase gate，未提供 `REDIS_URL` 时诚实跳过 Redis integration smoke；另提供显式 Redis 专项 gate（如 `verify:phase37:redis`）用于本地和 CI 的多实例 fanout / reconnect recovery proof。
   - 已决：Phase 37 close 口径必须把“CI 或 phase-close 环境提供 Redis service”写成 Redis fanout 证明前提，而不是假设所有开发环境默认具备 Redis。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: shell probe]

**Planning status:** research 不再存在阻塞 planner 的未决问题；剩余细节属于既定边界内的实现裁量。

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `ws-auth.ts` 继续使用 Auth.js token + membership + session scope 校验。 [VERIFIED: codebase read] |
| V3 Session Management | yes | `classroomSession` snapshot + actor-scoped ws handshake；不让 client 自己声明 authority。 [VERIFIED: codebase read] |
| V4 Access Control | yes | 全局 Redis setting 只允许 `developer` / `super_admin` 修改；其他角色只读。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: membership DTO] |
| V5 Input Validation | yes | 新增 settings action / DTO / topic builder 输入继续用 Zod。 [VERIFIED: package.json] [VERIFIED: codebase style] |
| V6 Cryptography | no | 本 phase 不新增密码学；继续依赖现有 Auth/session 机制。 [VERIFIED: codebase read] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 未授权 actor 打开 teacher-scoped ws 或修改全局设置 | Elevation of Privilege | 继续使用 `ws-auth.ts` + server-side role check；settings mutation 在 DAL/action 层拒绝非 `developer` / `super_admin`。 [VERIFIED: codebase read] [VERIFIED: 37-CONTEXT.md] |
| channel/topic 命名碰撞导致跨环境串流 | Information Disclosure | channel prefix 加 deployment namespace/environment。 [CITED: https://redis.io/docs/latest/develop/pubsub/] |
| Redis 故障被伪装成成功 | Repudiation / Integrity | attempt 记 failed，detail/trace 记 degraded local fallback。 [VERIFIED: 37-CONTEXT.md] |
| 绕过 gateway 直发 Redis | Tampering | 静态 guard + architecture rule：所有 producer 只许走 `publishTransportEvent()`。 [VERIFIED: 37-CONTEXT.md] [VERIFIED: codebase grep] |
| student-facing 泄漏基础设施细节 | Information Disclosure | Redis degraded 仅给 settings/inspector/operator，不给 student UI。 [VERIFIED: 37-CONTEXT.md] |

## Sources

### Primary (HIGH confidence)
- `src/features/runtime-platform/seams/transport/contract.ts` / `gateway.ts` / `ws-adapter.ts` / `ws-server.ts` / `ws-connection-registry.ts` — 现有 transport seam、canonical publish、local registry 与 ws host 行为。 [VERIFIED: codebase read]
- `src/lib/dal/classroom.ts` — classroom session create、snapshot read、teacher control write、publish chain。 [VERIFIED: codebase read]
- `src/db/schema.ts` — `classroomSessions`、`transportDeliveryAttempts`、`transportConsumerTraces`、无系统设置表的现状。 [VERIFIED: codebase read]
- `src/lib/dal/runtime-inspector.ts` / `src/lib/dto/runtime-inspector.ts` / `src/components/surfaces/runtime-inspector-surface.tsx` — 现有 inspector 读模型与 UI。 [VERIFIED: codebase read]
- `src/components/surfaces/settings-surface.tsx` / `src/app/settings/page.tsx` / `src/app/settings/labs/page.tsx` — 现有 settings surface 与 route posture。 [VERIFIED: codebase read]
- `.planning/phases/37-redis-fanout-and-multi-instance-delivery-convergence/37-CONTEXT.md` — 本阶段锁定决策。 [VERIFIED: codebase read]
- `.planning/ROADMAP.md` / `.planning/REQUIREMENTS.md` / `.planning/STATE.md` / Phase 36 close artifacts — milestone truth、RTPX-02 requirement、WS baseline 已验证。 [VERIFIED: codebase read]
- Redis Pub/Sub docs — at-most-once、channel prefix/scoping、subscriber command limits。 [CITED: https://redis.io/docs/latest/develop/pubsub/]
- ioredis README — pub/sub separate connections、auto reconnect、auto resubscribe、project status note。 [CITED: https://github.com/redis/ioredis]
- npm registry — `ioredis@5.10.1` published 2026-03-19；`ws@8.20.1` published 2026-05-12。 [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- `package.json` — 当前 repo 已安装 `ioredis` / `ws` / `drizzle-orm` / `zod`。 [VERIFIED: package.json]
- shell probes — `Node v24.1.0`、`pnpm 10.33.0`、无 `redis-server` / `redis-cli`。 [VERIFIED: shell probe]

### Tertiary (LOW confidence)
- 无。

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — 包版本与 Redis/ioredis 基础行为都已验证。 [VERIFIED: npm registry] [CITED: https://github.com/redis/ioredis]
- Architecture: **MEDIUM-HIGH** — 基于现有 codebase seam 与锁定决策得出，方案收敛度高，但仍有少量 planner discretion（settings route、verify script组织）。 [VERIFIED: codebase read] [VERIFIED: 37-CONTEXT.md]
- Pitfalls: **HIGH** — 主要来自现有实现边界与官方 Pub/Sub / ioredis 约束。 [VERIFIED: codebase read] [CITED: https://redis.io/docs/latest/develop/pubsub/] [CITED: https://github.com/redis/ioredis]

**Research date:** 2026-05-18  
**Valid until:** 2026-06-17
