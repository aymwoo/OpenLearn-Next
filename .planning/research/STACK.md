# Technology Stack — v2.3 Async Task Platform (BullMQ)

**Project:** OpenLearn Next  
**Researched:** 2026-05-18  
**Scope:** 只覆盖本 milestone 新增的 async worker / BullMQ 能力；不重写课堂 realtime 主链路，不做 PostgreSQL cutover，不扩 AI runtime，不做第三方 runtime governance。

## Existing Baseline We Must Keep

以下不是本 milestone 要替换的东西，而是要复用的既有基础：

- **Web app/runtime**：Next.js 16 App Router + React 19.2 + custom `server.ts` Node entrypoint 已在运行。
- **Auth/data truth**：Auth.js v5 + Drizzle ORM + SQLite-first + DAL / Server Actions 边界已成立。
- **Realtime**：WebSocket-first classroom transport 已交付；`ioredis` fanout 已存在，但它是 **delivery capability**，不是业务真相源。
- **Durable event patterns**：仓库里已经有 `runtimeEventOutbox`、`transportDeliveryAttempts`、`transportConsumerTraces` 等 append-only / audit-friendly persistence 模式。

**结论：** v2.3 不需要重选框架；只需要在现有 Node + Redis optional capability 之上补齐 **可复用 async queue + dedicated worker process + SQLite ledger/integration seam**。

## Recommended Stack Additions / Changes

### Core Additions

| Technology | Version | Purpose | Why This Milestone Needs It | Confidence |
|------------|---------|---------|------------------------------|------------|
| `bullmq` | `^5.76.10` | Redis-backed queue, worker, delayed/retry job orchestration | 当前最合适的新增核心库。BullMQ v5 已不需要 `QueueScheduler`，直接提供 `Queue`、`Worker`、`QueueEvents`、`FlowProducer` 能力，适合把 async platform 做成独立但仍在单体内的平台层。 | HIGH |
| `ioredis` | keep `^5.10.1` | Redis client for BullMQ | 项目已在用，无需换客户端；但要**新增 async queue 专用 connection factory**，不要直接复用现有 websocket fanout 连接单例。 | HIGH |
| Redis service | existing deploy capability, now with queue role | Durable queue backend for BullMQ | BullMQ 必须依赖 Redis。本 milestone 应把 Redis 从“仅课堂 fanout 可选能力”扩展为“async task capability 的 deploy prerequisite”，但仍不让 Redis 成为业务 truth。 | HIGH |
| Dedicated worker process | repo-local Node process via `tsx` / compiled Node entry | Runs `Worker` instances outside web request lifecycle | BullMQ worker 不应挂在 Next web server 请求进程里。当前仓库已有 `server.ts` 自定义入口，这正适合再加一个 `worker` entrypoint。 | HIGH |
| SQLite task ledger tables via Drizzle | new schema in existing DB | Durable enqueue intent, task run state, auditability, UI read model | 保持现有“SQLite + DAL 是真相源”的项目原则。BullMQ 是 orchestration engine，不应成为唯一任务状态来源。 | HIGH |
| `QueueEvents` projector | BullMQ built-in | Global job lifecycle observation | 用于把 `completed` / `failed` / `progress` 投影回 SQLite inspector / operator surface。推荐加入，但只创建少量共享实例。 | HIGH |

### Keep, But Use Differently

| Existing Piece | Keep? | New Role in v2.3 |
|---------------|-------|------------------|
| `server.ts` | Yes | 继续只承载 web app + websocket server；**不要**在这里顺手启动 BullMQ workers。 |
| `ioredis` fanout code | Yes | 保持课堂 transport 专用；抽共用 Redis env parsing，但**不要**把 BullMQ 直接绑进 `redis-fanout-connection.ts`。 |
| Drizzle + SQLite | Yes | 新增 async task ledger / projector 表，但继续作为 canonical operator truth。 |
| canonical verifiers | Yes | 新 milestone 应复用现有验证风格，新增单一 `verify:phaseXX` 风格 close gate。 |

## Recommended Integration Shape

## 1) Process Topology

**推荐：两个 Node 进程，仍在同一 repo / 同一部署单元内。**

```text
Process A: web
- Next.js app router
- Server Actions / DAL
- existing WebSocket classroom transport
- BullMQ producers only

Process B: worker
- BullMQ Worker instances
- QueueEvents listeners / projector
- DAL/Core API calls back into SQLite truth
```

**为什么这样做：**

- worker 生命周期和 web 请求生命周期不同；混在 `server.ts` 会让重启、扩缩容、错误隔离都变差。
- BullMQ 官方文档明确区分 producer 与 worker 的 Redis 连接语义：producer 应该 fail fast，worker 应长期等待恢复。
- 这和你们现有“realtime 主链路已收口”的事实兼容，不会把 classroom mainline blast radius 扩大到 background execution。

## 2) Connection Strategy

### 必须拆成两类 Redis 连接

| Connection Type | Used By | Recommended Behavior | Why |
|-----------------|--------|----------------------|-----|
| **Producer connection** | Next Route Handlers / Server Actions / DAL enqueue path | fail fast; do **not** wait forever | 用户请求不能因为 Redis 临时不可达而无限挂住。 |
| **Worker connection** | BullMQ `Worker` | `maxRetriesPerRequest: null`; long-lived reconnecting connection | BullMQ 官方要求 worker 连接长期等待恢复；否则会破坏消费稳定性。 |
| **QueueEvents connection** | observer / projector | dedicated blocking connection | BullMQ 文档说明 `QueueEvents` 不能像普通 producer 一样随意共享。 |

### Recommendation

- 新建 `src/features/runtime-platform/async-tasks/redis.ts`
- 提供：
  - `createAsyncQueueProducerConnection()`
  - `createAsyncQueueWorkerConnection()`
  - `createAsyncQueueEventsConnection()`
- **不要复用** `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts` 作为 BullMQ connection singleton。

### Important Redis rules

- 使用 **BullMQ `prefix`** 做 key namespace（例如 `openlearn:async`）。
- **不要使用 ioredis `keyPrefix`**；BullMQ 官方明确说它与 BullMQ 不兼容。
- Redis 生产配置需满足：
  - persistence enabled（官方推荐 AOF）
  - `maxmemory-policy=noeviction`

## 3) Data Truth Pattern

### 推荐新增：SQLite task ledger，而不是只靠 Redis job state

BullMQ 负责“排队与执行”；**SQLite 负责“任务真相、操作员可见性、与业务对象关联”**。

推荐在 Drizzle 中新增一组通用表：

| Table | Purpose |
|------|---------|
| `asyncTaskRuns` | 一个业务任务的一次 durable intent / current status / queue binding |
| `asyncTaskAttempts` | 每次 worker 尝试、错误、耗时、重试计数 |
| `asyncTaskProgress` or JSON snapshot on run | 面向 UI 的最新进度、阶段、summary |
| `asyncTaskDeadLetters` (optional) | 如果需要审计失败 payload，可单独存；否则先放在 attempts 即可 |

### Why this is the right shape

- 与现有 `runtimeEventOutbox` / `transportDeliveryAttempts` 的 append-only 思路一致。
- SQLite 仍可被 runtime inspector / settings / admin surfaces 直接消费。
- Redis job 被 auto-remove 后，平台仍保有本地历史。
- 后续如果换 Redis topology 或者补 queue replay，不会失去业务审计链。

### Strong recommendation

入队链路应是：

```text
Server Action / DAL mutation
-> write durable business truth in SQLite
-> write asyncTaskRuns durable intent in SQLite
-> enqueue BullMQ job with taskRunId + idempotency key
```

而不是：

```text
HTTP request -> directly push BullMQ job -> hope Redis state becomes truth
```

## 4) BullMQ Primitives To Adopt Now

| Primitive | Adopt Now? | How to Use |
|----------|------------|------------|
| `Queue` | Yes | 统一 producer facade，所有 feature 只能通过内部 enqueue API 发任务。 |
| `Worker` | Yes | 独立 worker 进程消费；按任务类型注册 processor。 |
| `QueueEvents` | Yes | 投影全局完成/失败/进度到 SQLite ledger 和 operator UI。 |
| `FlowProducer` | **Defer by default** | 只有当任务存在明确 parent-child dependency tree 时再引入。v2.3 先不要把平台复杂化成 DAG orchestration。 |

## 5) Queue Semantics To Standardize

### Default job policy

推荐在平台层统一：

- `attempts`: 3~5（按任务类型覆盖）
- `backoff`: exponential + jitter
- `removeOnComplete`: 保留少量最近成功 job
- `removeOnFail`: 保留较多失败 job
- 关键任务启用 `jobId` 或 `deduplication`，避免重复入队

### Why

- BullMQ 原生支持 retries / backoff / deduplication，足够支撑 v2.3。
- 自动清理 Redis job 状态是必须的，否则 Redis 会变成无限增长的临时历史仓库。
- 但不要把“BullMQ auto removal”误当成“可以不写 SQLite ledger”。两者职责不同。

## Concrete Package / Script Changes

## Dependencies

```bash
pnpm add bullmq
```

**No Redis client change needed** — `ioredis` 已经存在。

## Recommended npm scripts

```json
{
  "worker:dev": "node --import tsx src/workers/async-task-worker.ts",
  "worker:start": "NODE_ENV=production node --import tsx src/workers/async-task-worker.ts"
}
```

如果后续需要单进程跑多个 queue family，可再补：

```json
{
  "worker:imports": "node --import tsx src/workers/import-worker.ts",
  "worker:runtime": "node --import tsx src/workers/runtime-worker.ts"
}
```

但 v2.3 先做一个统一 worker runner 更稳。

## Recommended File Layout

```text
src/features/runtime-platform/async-tasks/
  contracts.ts          # task name, payload, result, progress schemas (Zod)
  queues.ts             # Queue singletons/factories
  redis.ts              # producer/worker/events connection factories
  enqueue.ts            # the only enqueue API for app code
  ledger.ts             # Drizzle helpers for task run/attempt/progress truth
  projector.ts          # QueueEvents -> SQLite projection
  registry.ts           # taskName -> processor implementation

src/workers/
  async-task-worker.ts  # boot Worker(s), QueueEvents, shutdown hooks
```

## Environment Variables

**不要复用** `REDIS_FANOUT_ENABLED` 作为 async worker 总开关。

推荐新增：

| Variable | Purpose | Recommendation |
|---------|---------|----------------|
| `ASYNC_TASKS_ENABLED` | deploy-authoritative feature gate | 独立于 realtime fanout 开关 |
| `BULLMQ_REDIS_URL` | queue Redis URL | 若未提供，可回退 `REDIS_URL`；但配置语义要独立 |
| `BULLMQ_PREFIX` | BullMQ key prefix | 默认 `openlearn:async` |
| `WORKER_CONCURRENCY_DEFAULT` | safe default concurrency | 从小值开始，如 2 或 4 |
| `WORKER_INSTANCE_ID` | operator visibility / logs | 类似当前 `RUNTIME_INSTANCE_ID` 思路 |

**Why separate flags matter:**

- `REDIS_FANOUT_ENABLED` 表示课堂 transport capability；
- `ASYNC_TASKS_ENABLED` 表示后台任务 capability；
- 两者不能绑死，否则会让课堂 delivery posture 和 async platform posture 互相污染。

## Recommended Integration Points With Current Stack

## 1) DAL + Server Actions remain the enqueue boundary

任何 UI 或 page 不直接调用 BullMQ：

- UI -> Server Action / Route Handler
- Server Action / DAL -> durable DB write
- 然后调用内部 `enqueueAsyncTask(...)`

这与当前“UI 禁止直连 DB”的原则完全一致，也避免把 Redis queue API 暴露进页面层。

## 2) Worker must re-enter through DAL / Core APIs

worker 执行业务时，不应绕过现有权限 / DTO / cache discipline。

推荐：

- worker processor 调 feature-level service / DAL helper
- 不让 processor 直接在散落文件里裸写表
- 重要 mutation 继续沿用现有 canonical write path vocabulary

## 3) Reuse existing operator posture

现有系统已经有：

- runtime inspector
- settings operator surface
- degraded honesty
- canonical verify scripts

v2.3 应复用同样模式，把 async platform 暴露为：

- enabled / disabled
- healthy / degraded
- worker connected / disconnected
- queue backlog size
- last failure reason

而不是再造一套不一致的运维语言。

## What NOT To Add This Milestone

| Do Not Add | Why |
|-----------|-----|
| PostgreSQL cutover | 用户已明确排除；而且 async worker 平台不需要先换主库。 |
| Realtime mainline rewrite | WebSocket classroom transport 已交付，不应为了 BullMQ 再动主链路。 |
| Redis Streams | 本 milestone 目标是 BullMQ worker platform，不是再开第二套 Redis messaging abstraction。 |
| `QueueScheduler` | BullMQ v5 已不需要它来支撑 delayed jobs / retries / rate limiting。 |
| `FlowProducer` as default foundation | 只有出现真正 parent-child job 依赖时才值得上；现在默认会过度设计。 |
| bull-board / 外部 queue admin UI | 先把 SQLite ledger + repo-local operator surfaces 跑通；不要先引入新管理后台。 |
| worker_threads / sandboxed processors | 除非出现明确 CPU-heavy job。当前 milestone 更像 I/O + orchestration 型任务平台。 |
| `keyPrefix` in ioredis | BullMQ 官方明确不兼容；应使用 BullMQ 自己的 `prefix`。 |
| 把 BullMQ job data 当成唯一历史存储 | Redis job auto-removal 是常态；历史必须回写 SQLite ledger。 |
| 把 async tasks 和 `REDIS_FANOUT_ENABLED` 绑死 | transport capability 与 queue capability 是两条独立运维姿态。 |
| AI runtime expansion / third-party runtime governance | 用户已明确排除。 |

## Opinionated Recommendation

**本 milestone 最对的新增栈，不是“再加一个 Redis 功能”，而是：**

1. **`bullmq@5.76.x` + existing `ioredis@5.10.1`** 作为 async orchestration engine。  
2. **独立 worker 进程**，不要塞进 `server.ts`。  
3. **SQLite task ledger** 作为任务真相与 operator read model。  
4. **独立 async Redis connection factory + env flags**，不要直接挪用 websocket fanout 单例。  
5. **Queue / Worker / QueueEvents 先上，FlowProducer 先不默认引入。**

如果只做其中一半，例如“只装 BullMQ，不加 SQLite ledger，不拆 worker 进程”，那不会得到一个 reusable async task platform，只会得到几个难运维的临时后台任务。

## Installation

```bash
# New dependency
pnpm add bullmq

# No new Redis client required
# ioredis is already present in the repo
```

## Sources

- Repo read: `.planning/PROJECT.md`, `.planning/MILESTONES.md`, `.planning/STATE.md`, `package.json`, `server.ts`, `src/db/schema.ts`, `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts`, `src/features/runtime-platform/seams/transport/redis-fanout-manager.ts`. Confidence: HIGH.
- BullMQ official docs: Introduction, Connections, Workers, Going to production, Auto-removal of jobs, Retrying failing jobs, Deduplication. Confidence: HIGH.
- BullMQ official API/docs site showing current release `v5.76.10`. Confidence: HIGH.
- Context7 CLI fallback (`ctx7`) for BullMQ and ioredis, used because MCP Context7 API key was unavailable in this agent session. Confidence: MEDIUM on retrieval path, HIGH on content because official docs were cross-checked.
