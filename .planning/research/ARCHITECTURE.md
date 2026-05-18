# Architecture Patterns: v2.3 Async Task Platform

**Domain:** BullMQ/async worker platform inside OpenLearn Next monolith  
**Researched:** 2026-05-18  
**Confidence:** HIGH

## Recommended Architecture

结论先说：**把 BullMQ 做成单体内的“后台执行平面”，不是新的业务真相源，也不是新的主写路径。**

OpenLearn Next 现有正确姿势已经很清晰：

- Next.js 16 monolith 继续承载 UI、Route Handlers、Server Actions
- SQLite + DAL 继续承载 durable truth
- Redis 已经是 optional delivery capability，并且已有连接/降级/posture 经验
- runtime-platform 已经证明了“feature root + seam + compatibility shim”这条渐进路线可行

因此 v2.3 不应该做成：

`UI -> BullMQ -> Worker -> DB -> UI`

而应该做成：

`UI / Route / Server Action -> Feature Server Orchestrator -> DAL transaction -> task record + enqueue request -> BullMQ -> Worker -> DAL side effect -> status DTO / cache invalidation`

也就是说：

1. **业务提交与鉴权仍同步发生在 monolith 内**
2. **BullMQ 只负责异步执行，不负责决定权限和业务真相**
3. **Worker 永远通过 DAL / server orchestration 写回，不直接绕过边界“裸写数据库”**
4. **先支持少量明确任务类型**（如 reminder dispatch、resource ingestion、AI/RAG preparation），不搞“万能任务平台”

---

## Incremental Target Shape

```text
src/
  features/
    async-tasks/                     # NEW: async task platform root
      index.ts                       # NEW: public barrel
      shared/
        contract.ts                  # NEW: queue names, job names, payload/result schemas
        dto.ts                       # NEW: task/job status DTO schemas
        idempotency.ts               # NEW: job key helpers
      server/
        enqueue.ts                   # NEW: enqueue boundary used by actions/routes/features
        status.ts                    # NEW: read-model/status aggregation
        orchestration.ts             # NEW: task record + queue add composition
      worker/
        registry.ts                  # NEW: worker processor registry
        bootstrap.ts                 # NEW: worker startup/bootstrap
        processors/
          schedule-reminder.ts       # NEW: first real processor
          resource-ingestion.ts      # NEW later
          rag-indexing.ts            # NEW later
      infra/
        bullmq.ts                    # NEW: Queue / Worker / QueueEvents factories
        connection.ts                # NEW: BullMQ-specific Redis connection policy
        queue-events.ts              # NEW: QueueEvents listeners -> status sync
      boundary-map.ts                # NEW: migration rules like runtime-platform

  server/
    workers/
      entry.ts                       # NEW: dedicated worker process entrypoint

  lib/
    dal/
      async-tasks.ts                 # NEW compatibility DAL entrypoint or shim
      schedule-reminders.ts          # MODIFIED: stop inline dispatch, enqueue instead
      ai-rag.ts                      # MODIFIED later: enqueue heavy work, not inline
      resources.ts                   # MODIFIED later: enqueue ingestion/index work

  app/
    api/
      internal/
        jobs/
          [taskId]/route.ts          # NEW optional operator/status endpoint
    settings/
      labs/
        jobs/page.tsx                # NEW optional operator UI

db/
  schema.ts                          # MODIFIED: persistent async task tables

server.ts                            # MODIFIED: web server stays web-only; no worker autorun here
scripts/
  worker.ts                          # NEW optional local bootstrap script
```

---

## New vs Modified Areas

## New Areas

### 1. `src/features/async-tasks/*` — new feature root

这是 v2.3 的核心。参考 `src/features/runtime-platform/*` 与 `src/features/schedule/*` 的既有做法，异步平台应该先成为一个独立 feature root，而不是散落在 `src/server/*` 与 `src/lib/*` 里。

**职责：**

- 定义 queue/job contract
- 提供 enqueue API
- 提供 worker processor registry
- 聚合 job status DTO
- 隔离 BullMQ 细节，避免业务代码直接 `new Queue()`

### 2. `src/server/workers/entry.ts` — new worker bootstrap

需要一个**独立于 Next web server 的 worker 入口**。现有 `server.ts` 已经只负责 Next HTTP server + WebSocket transport bootstrap，这个边界是正确的，不能把 BullMQ worker 直接塞进去，否则会把 web 生命周期与后台消费者生命周期绑死。

**建议：**

- `pnpm dev` / `pnpm start` 继续只跑 web app
- 新增 `pnpm worker:dev` / `pnpm worker:start` 跑后台 worker
- 本地可以同时开两个进程；部署时按 capability 决定是否启 worker

### 3. Persistent async task tables — new DB truth layer for job status

BullMQ 自身状态在 Redis，但本项目不能把 Redis 当业务真相源。所以需要新的 SQLite 持久层来表达“平台任务”的业务可见状态。

建议最少新增两张表：

#### `asyncTask`

面向产品/业务的任务记录。

建议字段：

| Field | Purpose |
|---|---|
| `id` | 内部 task id，UI/DAL 主键 |
| `queueName` | 业务队列名 |
| `jobName` | 任务类型 |
| `jobKey` | 幂等键/业务去重键 |
| `status` | `queued/running/completed/failed/cancelled` |
| `triggeredById` | 谁触发的 |
| `schoolId` | 租户范围 |
| `entityType` / `entityId` | 关联业务对象 |
| `inputJson` | 经 DTO 清洗后的输入快照 |
| `outputJson` | 结果摘要 |
| `failureCode` / `failureReason` | 错误摘要 |
| `progressJson` | 最新进度 |
| `queueJobId` | BullMQ job.id 映射 |
| `attemptsMade` | 重试次数快照 |
| `createdAt` / `startedAt` / `completedAt` / `updatedAt` | 生命周期 |

#### `asyncTaskEvent`

面向审计/排障的事件流。

建议字段：

| Field | Purpose |
|---|---|
| `id` | event id |
| `taskId` | 对应 asyncTask |
| `eventType` | `enqueued/progress/completed/failed/retried` |
| `payloadJson` | 事件明细 |
| `createdAt` | 事件时间 |

这和现有 `runtimeEventOutbox`、`transportDeliveryAttempts` 的模式一致：**Redis 负责 delivery，SQLite 负责 durable inspection truth。**

---

## Modified Areas

### 1. `src/lib/dal/schedule-reminders.ts` / `src/features/schedule/reminders/server.ts`

当前 reminder 逻辑仍然是：

- rule 保存到 SQLite
- dispatch 记录写入 `scheduleReminderDispatch`
- retry 时直接调用 `dispatchScheduleReminder()`

这非常适合做 v2.3 第一批迁移样板，但要改成：

- **保存 rule 时仍然同步写 `scheduleReminderDispatch`**
- **真正发送动作改为 enqueue `schedule-reminder.dispatch` job**
- worker 执行时调用现有 `dispatchScheduleReminder()`
- worker 成功/失败后更新 `scheduleReminderDispatch` + `asyncTask`

这样 blast radius 最小，因为：

- 现有 schema 已有 `planned/sent/failed/retry_required`
- 现有 server helper `dispatchScheduleReminder()` 已经存在
- UI 已有 DTO surface，可直接吃新状态

### 2. `src/lib/dal/ai-rag.ts`、`src/lib/dal/resources.ts`

这些是第二批候选。凡是可能出现：

- 文档解析
- 分块/embedding
- Qdrant upsert
- 大文件处理
- 多步 AI 任务

都应该未来迁到 async platform，但**不要在 v2.3 首批就全迁**。建议先只接一类任务，跑通平台，再扩张。

### 3. `server.ts`

只做**最小修改**：

- 保持当前 web server + websocket transport 初始化方式不变
- 不在 `server.ts` 中自动启动 BullMQ worker
- 如果需要共享基础连接工厂，只抽公共模块，不改变 server posture

### 4. `package.json`

新增而非替换脚本：

- `worker:dev`
- `worker:start`
- `verify:phaseXX` for async platform

不要替换现有 `dev/start` 主路径。

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|---|---|---|
| Server Action / Route Handler | 接收用户请求、鉴权、参数校验 | Feature server orchestrator |
| Feature server orchestrator | 同步业务写入 + 任务创建 + enqueue 编排 | DAL, async enqueue service |
| DAL | durable truth、authz、DTO shaping、cache tags | SQLite |
| Async enqueue service | 统一调用 BullMQ Queue.add，生成 jobId/jobKey | BullMQ Queue, asyncTask DAL |
| Worker bootstrap | 注册 processors、QueueEvents、error handling | BullMQ Worker/QueueEvents |
| Worker processor | 执行具体后台任务，不直接暴露给 UI | DAL/server helpers/external services |
| Async task status service | 聚合 SQLite task/task-event + 可选 BullMQ snapshot | app routes, settings UI |
| QueueEvents sync listener | 把 BullMQ completed/failed/progress 同步成 durable status | asyncTask tables |

---

## Data Flow

### Flow 1: enqueue

```text
UI action
  -> Server Action / Route Handler
  -> Feature server orchestration
  -> DAL transaction writes business truth
  -> DAL inserts asyncTask(status=queued)
  -> enqueue service calls Queue.add(jobName, payload, { jobId, attempts, backoff })
  -> DAL updates asyncTask.queueJobId
  -> updateTag() for impacted read models
  -> return task status DTO immediately
```

关键点：

- **用户能立刻得到可追踪 taskId**
- **同步请求只做“可提交、可追踪”的确认，不等待异步完成**
- **若 Queue.add 失败，要把 asyncTask 标记为 failed/queue_unavailable，而不是悄悄吞掉**

### Flow 2: worker execution

```text
BullMQ Worker receives job
  -> processor validates payload via Zod
  -> mark asyncTask running
  -> call domain server helper / DAL methods
  -> optionally update progress
  -> on success: persist output summary + completed status
  -> on failure: persist failure summary + retry metadata
```

### Flow 3: status read

```text
Page / polling route / operator UI
  -> async task status service
  -> read asyncTask + latest asyncTaskEvent from SQLite
  -> return stable status DTO
```

这里**不要直接把 BullMQ Redis 状态暴露给 UI 当唯一来源**。UI 读 durable DTO，必要时附加 Redis best-effort snapshot，但不能反过来。

---

## Recommended Contracts

### 1. Queue and job names

建议显式常量化，不允许业务代码手写字符串。

```ts
export const AsyncQueueName = {
  default: "default",
  notifications: "notifications",
  resourceProcessing: "resource-processing",
  ai: "ai",
} as const;

export const AsyncJobName = {
  scheduleReminderDispatch: "schedule-reminder.dispatch",
  resourceIngest: "resource.ingest",
  ragIndex: "rag.index",
} as const;
```

### 2. Job payload schemas

每种 job 必须有 Zod schema。

```ts
const ScheduleReminderDispatchJobSchema = z.object({
  taskId: z.string().min(1),
  dispatchId: z.string().min(1),
  schoolId: z.string().min(1),
  triggeredById: z.string().min(1),
});
```

### 3. Status DTO

UI 与 route 层不要直接吃 BullMQ `Job` 对象。

```ts
type AsyncTaskStatusDTO = {
  id: string;
  queueName: string;
  jobName: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: Record<string, unknown> | null;
  attemptsMade: number;
  failureReason: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};
```

---

## Patterns to Follow

### Pattern 1: Enqueue boundary, never direct queue usage

**What:** 所有业务代码都通过 `enqueueAsyncTask()` 进入队列。

**When:** 任何需要 BullMQ 的地方。

**Example:**

```ts
export async function enqueueScheduleReminderDispatch(input: ScheduleReminderDispatchInput) {
  const payload = ScheduleReminderDispatchJobSchema.parse(input);

  const task = await createQueuedAsyncTask({
    queueName: "notifications",
    jobName: "schedule-reminder.dispatch",
    jobKey: `schedule-reminder:${payload.dispatchId}`,
    inputJson: payload,
    schoolId: payload.schoolId,
    entityType: "scheduleReminderDispatch",
    entityId: payload.dispatchId,
  });

  await notificationQueue.add("schedule-reminder.dispatch", {
    ...payload,
    taskId: task.id,
  }, {
    jobId: task.jobKey,
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: false,
    removeOnFail: false,
  });

  return toAsyncTaskStatusDTO(task);
}
```

**Why:** 这样 future switch（BullMQ → another queue）时换的是 infra，不是全业务层。

### Pattern 2: Worker calls domain helpers, not ad-hoc SQL

**What:** processor 内不要散写 SQL；调用 feature server helper / DAL。

**When:** job processor 有业务 side effect 时。

**Example:**

```ts
const worker = new Worker("notifications", async (job) => {
  const payload = ScheduleReminderDispatchJobSchema.parse(job.data);
  await markAsyncTaskRunning(payload.taskId);

  const result = await runScheduleReminderDispatchJob(payload);

  await markAsyncTaskCompleted(payload.taskId, { result });
  return result;
});
```

### Pattern 3: Durable status first, Redis status second

**What:** 产品 UI 读 SQLite `asyncTask`。

**When:** settings、operator、user-facing async progress 页面。

**Why:** 项目已经明确 Redis 不是 durable truth。

### Pattern 4: Feature-by-feature migration with compatibility shims

**What:** 老入口保留 re-export，真实实现迁到 `src/features/async-tasks`。

**When:** 修改已有 schedule/resource/ai 模块时。

**Why:** 这和 schedule、runtime-platform 的既有迁移模式一致，风险最低。

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: starting workers inside `server.ts`

**What:** web app 启动时顺手启动 worker。

**Why bad:**

- web/worker 生命周期耦合
- scaling 时无法独立扩 worker
- local/dev/prod posture 混乱
- 容易把每个 web 实例都变成隐式消费者

**Instead:** 独立 worker entry process。

### Anti-Pattern 2: using BullMQ/Redis as the only status source

**What:** UI 直接查 Redis job state。

**Why bad:** 违背 SQLite durable truth；Redis flush/expiry/deploy posture 会破坏产品可见状态。

**Instead:** SQLite `asyncTask` 为主，BullMQ 仅做 execution substrate。

### Anti-Pattern 3: enqueue before business truth write

**What:** 先 Queue.add，再写业务表。

**Why bad:** job 可能先执行，读到不存在/未授权/未提交完成的数据。

**Instead:** 先同步写 durable truth，再 enqueue。

### Anti-Pattern 4: “generic any-job platform” from day one

**What:** 一开始设计 DSL、flow graph、dynamic processors、remote job definitions。

**Why bad:** 范围爆炸，验证慢，风险高。

**Instead:** 先做 1-2 个具体 job 类型，抽最小公共层。

### Anti-Pattern 5: worker bypasses authz and tenant boundaries

**What:** processor 只拿 ID 就直接改所有表。

**Why bad:** 多学校/多角色边界被破坏。

**Instead:** payload 中保留 `schoolId`/`triggeredById`/entity scope，worker helper 再做 scope validation。

---

## Integration Points

## 1. Existing runtime-platform seam style

`src/features/runtime-platform/seams/*` 已经证明：**基础设施能力应该先被 seam 化。**

BullMQ 也应沿用这一思路：

- `infra/connection.ts`：Redis connection policy
- `infra/bullmq.ts`：Queue/Worker/QueueEvents 工厂
- `worker/registry.ts`：processor registry

而不是业务代码到处 `import { Queue } from "bullmq"`。

## 2. Existing durable event/outbox precedent

`runtimeEventOutbox`、`transportDeliveryAttempts` 已经存在，说明项目接受这种模式：

- 先落 durable inspectable record
- 再做 delivery/execution

异步平台应复用这一设计哲学，而不是反过来把 job lifecycle 完全藏在 Redis 里。

## 3. Existing optional Redis posture

当前 Redis fanout 已经有：

- `REDIS_FANOUT_ENABLED`
- 健康探测
- degraded honesty
- instance id / connection state

BullMQ 平台应新增**自己的 capability flag**，不要偷用 websocket fanout 开关。

建议：

- `ASYNC_WORKER_ENABLED=true|false`
- `REDIS_URL=...`
- `WORKER_INSTANCE_ID=...`

并复用 ioredis posture 经验，但不要把两个 capability 混为一个开关。

## 4. Existing cache invalidation rules

当前项目大量依赖 `updateTag()`。异步任务平台要明确两层失效：

1. **enqueue 时**：更新任务列表/提交中心等“排队态”缓存
2. **worker 完成时**：更新真正受副作用影响的业务 tags

例如 reminder dispatch：

- enqueue 后：`schedule:reminder:${schoolId}`
- complete/fail 后：同样更新 `schedule:reminder:${schoolId}`

对于 resource ingestion，完成后还要额外打 `resources:${schoolId}`、`resource:${id}` 等 tag。

---

## Safe Build Order

这是最重要部分。建议按下面顺序推进。

### Phase A — contracts + persistent status, no worker yet

**新增：**

- `src/features/async-tasks/shared/contract.ts`
- `src/features/async-tasks/shared/dto.ts`
- `asyncTask` / `asyncTaskEvent` schema
- `src/features/async-tasks/server/status.ts`

**不做：**

- 不接 BullMQ worker
- 不迁移业务逻辑

**目标：** 先把“任务是什么、状态怎么看”定义清楚。

### Phase B — BullMQ infra seam + no-op sample worker

**新增：**

- BullMQ connection factory
- Queue factory
- Worker bootstrap
- QueueEvents sync listener
- worker dev/start scripts

**目标：** 跑通最小链路：enqueue -> worker pickup -> SQLite 状态变化。

**首个样例 job：** `debug.ping` 或 `system.noop`。

### Phase C — migrate schedule reminder dispatch as first real slice

**修改：**

- `src/features/schedule/reminders/server.ts`
- `src/lib/dal/schedule-reminders.ts`
- `src/features/schedule/reminders/actions.ts`（返回 task status DTO 或保留兼容 DTO）

**目标：** 用最小业务风险证明平台真能承载真实任务。

为什么先它：

- 已有 `scheduleReminderDispatch` durable table
- 任务语义简单
- 对 UI 影响清晰
- 不涉及 classroom 主链路

### Phase D — add operator/status surfaces

**新增：**

- internal jobs status route
- optional settings labs page / admin operator panel

**目标：** 让平台可观察、可验证、可演示，不靠日志猜测。

### Phase E — onboard second heavy workload

候选顺序：

1. resource ingestion
2. RAG indexing
3. AI generation/post-processing

不要在 reminder slice 还没稳定前一次上多个 workload。

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---|---|---|---|
| Queue topology | 单 worker + 1-2 queues 足够 | 按 workload 拆 queue，避免互相阻塞 | 独立 worker deployment，按队列横向扩展 |
| Redis posture | 单 Redis 即可 | Redis 成为 worker infra 依赖，但仍非业务 truth | 需要独立容量规划与 noeviction posture |
| Status reads | 直接查 SQLite task tables | 增加索引、task list 分页、operator filters | 需要按 school/entity/time 做归档与 retention |
| Retry handling | fixed/exponential backoff 即可 | 不同 job class 自定义 attempts/backoff | 需 dead-letter / poison job 策略 |
| Worker code isolation | 单 registry 可接受 | 按 notifications/resources/ai 模块化 | 可能拆多个 worker process entry |

---

## Explicit Recommendation

对 v2.3，我的明确建议是：

1. **新增 `src/features/async-tasks` 作为平台根**
2. **新增 SQLite `asyncTask` / `asyncTaskEvent` 作为产品可见真相层**
3. **BullMQ worker 独立进程启动，不并入 `server.ts`**
4. **所有 enqueue 都走统一 boundary，不允许业务代码直接接触 BullMQ**
5. **首批只迁移 `schedule reminder dispatch`，不要碰 classroom 主链路**
6. **等第一条真实任务稳定后，再迁 resource/RAG/AI 任务**

这条路线最符合项目当前哲学：**单体内平台化、SQLite durable truth、Redis optional capability、渐进 feature migration。**

## Sources

- `.planning/PROJECT.md` — 当前 milestone 背景、durable truth、Redis optional posture、单体内平台化方向。Confidence: HIGH.
- `.planning/MILESTONES.md` — BullMQ broader slice 仍 deferred，说明本轮必须控制范围。Confidence: HIGH.
- `.planning/STATE.md` — 当前项目已归档 v2.2，适合开始新 milestone planning。Confidence: HIGH.
- `src/features/runtime-platform/shared/boundary-map.ts` — 已验证的 public barrel + compatibility migration 模式。Confidence: HIGH.
- `src/features/runtime-platform/seams/index.ts`、`redis-fanout-connection.ts`、`gateway.ts` — seam 化基础设施、Redis capability 与 durable delivery inspection 的现有做法。Confidence: HIGH.
- `src/features/runtime-platform/classroom/runtime-session.ts` — `runtimeEventOutbox` 说明项目已经接受“SQLite inspectable truth + async delivery”模式。Confidence: HIGH.
- `src/features/schedule/reminders/server.ts`、`actions.ts`、`src/server/schedule/reminder-dispatch.ts` — reminder dispatch 是最适合的首批 async migration slice。Confidence: HIGH.
- `server.ts` — 当前 web server bootstrap 应保持 web-only。Confidence: HIGH.
- BullMQ docs: introduction, queues, workers, connections, retrying jobs — Queue/Worker/QueueEvents 基础模型、producer/worker connection split、`maxRetriesPerRequest`、attempts/backoff。Official docs fetched 2026-05-18. Confidence: HIGH.
