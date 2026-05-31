# Phase 42: Operator visibility and recovery - Research

**Researched:** 2026-05-19
**Domain:** Async task operator visibility, durable recovery, Settings Labs operator UX
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Operator 入口与页面归属
- **D-42-01:** Phase 42 的 async operator 能力固定挂在 `Settings Labs` 体系内，而不是另起独立产品域。
- **D-42-02:** async operator 采用独立子页承载，规划为类似 `/settings/labs/async-tasks` 的专门页面；不并入现有 `runtime-inspector` 页面，也不只做 settings 首页局部卡片。
- **D-42-03:** 该 operator 页面默认面向 `admin + developer` 角色；数据仍按学校范围与角色范围裁切，不做 school 之外的全局暴露。
- **D-42-04:** async operator 首页第一屏必须先回答“平台当前是否健康”，优先于 workload 业务细节或任务族分区。

### 健康总览与问题任务首页
- **D-42-05:** 首页主结构固定为“平台健康 + 问题任务”两段式：上半部分看 worker / queue / degraded / backlog posture，下半部分直接列出需要 operator 处理的任务。
- **D-42-06:** backlog posture 不只显示原始计数，必须做风险分层表达，让 operator 一眼看出是正常、堆积还是异常，而不是自己读数字判断。
- **D-42-07:** 若 worker 断连、queue 不可用或平台进入 degraded posture，首页必须像现有 runtime inspector 一样给出显式告警卡，单独说明当前不能信任什么、以及接下来去哪里排查。
- **D-42-08:** 首页里的“问题任务”列表默认按“待处理优先”组织，优先展示 failed、stalled recovery、长期 retrying 等需要人工介入的任务，而不是简单按最近时间倒序。

### 任务详情页的信息层级
- **D-42-09:** 单个 async task 详情页固定采用“状态摘要优先”的信息层级；operator 打开页面后先看当前状态、latest error、recovery posture、最近 progress，再继续下钻 attempts 与 timeline。
- **D-42-10:** 若任务失败，latest error 必须在详情页顶部作为单独错误卡提升呈现，而不是埋在时间线或 attempts 列表中。
- **D-42-11:** attempt history 采用“按 attempt 分组”的产品语义组织，而不是纯事件流；每次尝试应能看见开始、失败、完成与人工 recovery 之间的关系。
- **D-42-12:** progress snapshot 需要直接出现在顶部摘要区，至少包含 progress label、processed/total 或等价结构，以及最近更新时间；operator 不应靠滚动到下方才看到当前推进情况。
- **D-42-13:** timeline 在详情页中是辅助审计轨迹，而不是主判断界面；它主要用于复盘与核对事件，不取代顶部摘要、错误卡与 attempts 分组。

### 安全重试与 recovery 语义
- **D-42-14:** failed task 的 recovery 采用“同一 durable task 内追加新 attempt”的事实模型，不为每次人工 retry 新建第二个任务事实页。
- **D-42-15:** retry CTA 只对 registry 明确声明支持 recovery 的 failed task 展示；不是所有失败任务都默认允许重试。
- **D-42-16:** operator 点击 retry 后，系统必须写入显式的 recovery event，记录谁在何时触发了恢复动作，而不是只把状态静默改回 queued/running。
- **D-42-17:** retry 触发后，任务详情页应立即回到 `queued / retrying` 这类诚实状态，明确告诉 operator 当前已经进入恢复流程，而不是继续伪装成 terminal failed。
- **D-42-18:** retry 交互采用“轻确认后执行”模式：在执行前明确说明会追加新 attempt 并写 recovery event，但不强制 operator 填写长文本说明。

### the agent's Discretion
- async operator 子页的精确 route segment、导航文案与 labs 入口卡片名称，可由 planner 结合现有 `settings-surface.tsx` 与 `/settings/labs` 路由结构做最小正确收敛，但必须保持“Settings Labs 下的独立 operator 子页”这一定位。
- 风险分层的具体阈值与 label（例如 queued backlog 多大算 warning / critical）可由 researcher / planner 根据现有 async ledger 字段和 workload 规模收敛，但必须输出明确的 operator-facing posture，而不是裸数字。
- 详情页最终采用单栏、双栏或摘要 + 下钻 section 的具体布局可由 planner 结合 `runtime-inspector-surface.tsx` 与现有 teacher surface rhythm 收敛，但信息层级已锁定，不能让 timeline 抢主位。
- 轻确认交互的精确 UI 形态可由 planner 选择 modal、popover confirm 或等价安全确认模式，但必须在执行前明确“追加新 attempt + 写 recovery event”的语义。

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ATP-15 | Operator can inspect queue health, worker connectivity, backlog posture, and degraded status for the async platform. | 新增 operator overview DAL/read model，组合 BullMQ 连接健康、跨进程 worker heartbeat、SQLite backlog/problem-task 聚合。 [VERIFIED: codebase read] |
| ATP-16 | Operator can inspect task run details, attempt history, progress snapshots, and the latest error for a specific task. | 复用 `AsyncTaskDetailDTO` 基底并补 operator-specific summary / retry eligibility / grouped attempts read model。 [VERIFIED: codebase read] |
| ATP-17 | Operator can safely retry supported failed tasks through an explicit recovery action instead of manual data patching. | 新增 registry recovery metadata + operator server action + BullMQ manual retry + explicit recovery event + immediate cache invalidation。 [VERIFIED: codebase read] [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/retrying-job.md] |
| ATP-18 | Operator-facing surfaces expose async task state through application read models and DTOs rather than direct BullMQ admin state. | 新增 `/settings/labs/async-tasks` 页面只消费 DAL/DTO；禁止 surface 直接读 BullMQ / Redis admin state。 [VERIFIED: codebase read] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 必须继续使用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite 首发。 [VERIFIED: codebase read]
- UI 组件禁止直连数据库，所有读写必须通过 DAL 和 Server Actions。 [VERIFIED: codebase read]
- Node.js 20.9+ 为主；Edge Runtime 仅用于 SSE，Phase 42 的 DAL / retry action / BullMQ 交互应保持在 Node 侧。 [VERIFIED: codebase read]
- Next.js 16 必须显式缓存；所有写入后必须 `updateTag()` / `revalidatePath()` / 等价失效。 [VERIFIED: codebase read] [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/updateTag.mdx]
- 设计实现必须继续对齐 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`，沿用 Settings / Runtime Inspector 的 tonal、no-line、Lexend 节奏。 [VERIFIED: codebase read]
- 不要在 GSD 之外做代码直接实现；本研究只产出规划依据。 [VERIFIED: codebase read]

## Summary

Phase 42 的规划重点不是“再造一个后台管理台”，而是把 Phase 39-41 已存在的 durable async platform 收口成一个 **可运营、可排障、可安全恢复** 的应用内 operator 面。现有代码已经具备 durable task ledger、QueueEvents projection、attempt/failure/recovery 基础字段、Settings Labs 入口语言，以及 batch import 这条真实 workload；因此本阶段不需要重新发明任务模型，只需要补齐 **operator scope read model + operator surface + explicit recovery action** 三段能力。 [VERIFIED: codebase read]

最关键的研究发现有三个。第一，当前 web 进程无法直接知道独立 worker 进程是否“真的在线”，因为 `getAsyncTaskWorkerRuntimeSnapshot()` 只读取当前进程内单例；如果直接拿它给 `/settings/labs/async-tasks` 做健康判断，首页会得到假阴性或假阳性。Phase 42 因而必须新增跨进程 heartbeat / runtime snapshot 持久化，而不能只读 in-memory runtime。 [VERIFIED: codebase read]

第二，当前 `course_import.apply_batch` 在 registry 中的 `visibilityScope` 仍是 `actor_owned`，这与 D-42-03 的 `admin + developer` school-scoped operator 视角天然冲突；如果不改，operator 首页看不到同校他人触发的 batch import 任务。第三，`enqueueAsyncTask()` 会新建 durable task，因此它不能直接承担 D-42-14 的“同一 durable task 内追加 attempt”恢复语义；安全重试必须走已有 task 的 recovery path，而不是再次 enqueue 新 task row。 [VERIFIED: codebase read]

**Primary recommendation:** 按 `overview health/read model` → `detail/read model + route/surface` → `safe retry action + verifier` 的 3-plan 顺序推进；并把“worker heartbeat 持久化”和“registry recovery metadata”列为 Wave 1 blocking dependency。 [VERIFIED: codebase read] [ASSUMED]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Settings Labs operator entry | Frontend Server (SSR) | Browser / Client | Labs 入口和页面装配发生在 App Router page + RSC surface，客户端只负责轻交互。 [VERIFIED: codebase read] |
| Platform health overview | API / Backend | Database / Storage | 健康汇总来自 DAL 聚合：BullMQ health snapshot、worker heartbeat、SQLite backlog/problem-task 统计。 [VERIFIED: codebase read] |
| Problem task list | Database / Storage | API / Backend | 问题任务排序和过滤应基于 durable task ledger/event history，而不是浏览器本地拼装。 [VERIFIED: codebase read] |
| Task detail summary | Database / Storage | API / Backend | detail 依赖 `asyncTasks + asyncTaskEvents + registry metadata` 的服务端 read model。 [VERIFIED: codebase read] |
| Safe retry action | API / Backend | Database / Storage | recovery 需要权限校验、registry eligibility、BullMQ retry、event audit、cache invalidation。 [VERIFIED: codebase read] [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/retrying-job.md] |
| Worker connectivity truth | Database / Storage | API / Backend | 独立 worker 进程状态不能靠 web 进程内存读取，必须跨进程持久化或心跳化。 [VERIFIED: codebase read] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | `16.2.4` repo pinned; npm latest `16.2.6` | App Router pages, Server Actions, cache invalidation | 本仓库已固定 `next@16.2.4`；Phase 42 不应夹带框架升级，只复用 `updateTag()` / `revalidatePath()` 的现有写法。 [VERIFIED: codebase read] [VERIFIED: npm registry] |
| React / React DOM | `19.2.5` repo pinned; npm latest `19.2.6` | RSC + interactive confirm UI | 现有 surface 均基于 React 19；本阶段只加 operator surface，不升级运行时。 [VERIFIED: codebase read] [VERIFIED: npm registry] |
| BullMQ | `5.76.10` | Manual retry, QueueEvents, worker lifecycle | 仓库已使用 BullMQ，且 npm latest 仍为 `5.76.10`；`QueueEvents`、`worker.close()`、`job.retry()` 都有官方文档支持。 [VERIFIED: codebase read] [VERIFIED: npm registry] [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/events/README.md] [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/workers/graceful-shutdown.md] [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/retrying-job.md] |
| Zod | `4.4.3` | Operator action / DTO validation | 当前 async task contract 与 action 输入都靠 Zod；Phase 42 继续沿用，不要引入第二套验证层。 [VERIFIED: codebase read] [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Drizzle ORM | `0.45.2` repo pinned | Heartbeat / operator aggregate 持久化与查询 | 若补 worker heartbeat 或 operator snapshot table，应继续用现有 Drizzle schema/migration 风格。 [VERIFIED: codebase read] |
| lucide-react | `1.14.0` repo pinned | Health / retry / warning iconography | 复用现有 Settings / Runtime Inspector icon tone；不新增 dashboard 风格图表库。 [VERIFIED: codebase read] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 独立 Settings Labs operator page | 继续塞进 `runtime-inspector` | 违背 D-42-02，且会把 runtime session 排障和 async operator 混成一页。 [VERIFIED: codebase read] |
| 应用 DTO / DAL 聚合 | 直接接 BullMQ admin UI / bull-board | 会绕过 ATP-18 的 application read model 约束，且与当前产品 IA 不一致。 [VERIFIED: codebase read] [ASSUMED] |
| 同一 durable task 内 retry | 再次 `enqueueAsyncTask()` 新建 task row | 违背 D-42-14；当前 enqueue seam天生会 insert 新 task。 [VERIFIED: codebase read] |

**Installation:**
```bash
npm install
```

**Version verification:** `bullmq@5.76.10` 为当前最新，npm `time.modified=2026-05-17T14:08:22.337Z`；`next` npm 最新为 `16.2.6`，本仓库仍锁定 `16.2.4`；`zod@4.4.3` 为当前最新。 [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
SettingsSurface quick link
        |
        v
/settings/labs/async-tasks -------------------------------> /settings/labs/async-tasks/[taskId]
        |                                                           |
        v                                                           v
getAsyncOperatorOverviewDTO()                               getAsyncOperatorTaskDetailDTO()
        |                                                           |
        +--> resolve operator scope (admin/developer + school) <----+
        |
        +--> BullMQ connection health snapshot
        |
        +--> worker heartbeat / runtime snapshot store
        |
        +--> asyncTasks + asyncTaskEvents aggregate queries
        |
        v
operator DTOs -> surface cards / alerts / grouped attempts / timeline

retryTaskAction(taskId)
        |
        v
scope check -> registry recovery eligibility -> task status check -> BullMQ Job.retry()
        |                                              |
        |                                              +--> only failed/completed jobs support manual retry in BullMQ docs
        v
append recovery event + update durable latest snapshot + updateTag/revalidatePath
        |
        v
QueueEvents waiting/active/progress/completed/failed projection keeps ledger honest
```

### Recommended Project Structure

```text
src/
├── app/settings/labs/async-tasks/page.tsx           # operator 首页 route
├── app/settings/labs/async-tasks/[taskId]/page.tsx  # 单任务详情 route
├── actions/async-task-operator-actions.ts           # operator retry action
├── components/surfaces/async-task-operator-surface.tsx
├── components/surfaces/async-task-operator-detail-surface.tsx
├── lib/dal/async-task-operator.ts                   # operator scope + overview/detail/retry read models
├── lib/dto/async-task-operator.ts                   # operator-specific DTOs
└── features/async-tasks/
    ├── server/registry.ts                           # recovery eligibility metadata
    ├── infra/queue-events.ts                        # recovery event projection / cache invalidation
    └── infra/connection.ts                          # connection health snapshot reuse
```

### Pattern 1: Operator scope resolver mirrors runtime-inspector, but excludes teacher
**What:** 复用 `runtime-inspector.ts` 的 `developer/admin + schoolIds` 范围解析方式，做一个只允许 `admin + developer` 的 async operator scope resolver。 [VERIFIED: codebase read]
**When to use:** 所有 operator overview/detail/retry DAL 和 action。 [VERIFIED: codebase read]
**Example:**
```typescript
// Source: src/lib/dal/runtime-inspector.ts
const memberships = await getUserMembershipsDTO(user.id)
const activeSchoolIds = [...new Set(activeMemberships.map((membership) => membership.schoolId))]
if (activeMemberships.some((membership) => membership.role === "developer")) {
  return { role: "developer", actorId: user.id, schoolIds: activeSchoolIds }
}
if (activeMemberships.some((membership) => membership.role === "admin")) {
  return { role: "admin", actorId: user.id, schoolIds: activeSchoolIds }
}
```

### Pattern 2: Surfaces consume DAL/DTO truth, never BullMQ classes
**What:** 页面只调用 DAL，DAL 产出 operator DTO；surface 不直接 import `Queue`, `Worker`, `QueueEvents`, `Job`。 [VERIFIED: codebase read]
**When to use:** operator 首页、detail 页、retry confirm 后刷新。 [VERIFIED: codebase read]
**Example:**
```typescript
// Source: src/app/settings/labs/runtime-inspector/page.tsx
const inspector = await getRuntimeInspectorDTO({ runtimeSessionId })
return <RuntimeInspectorSurface inspector={inspector} />
```

### Pattern 3: Retry action follows existing server-action wrapper discipline
**What:** 参考 schedule reminder 的 action 包装：Zod/permission error -> typed result；服务端函数负责真实写入；action 负责 `updateTag()`。 [VERIFIED: codebase read]
**When to use:** `retryAsyncTaskAction`。 [VERIFIED: codebase read]
**Example:**
```typescript
// Source: src/features/schedule/reminders/actions.ts
export async function retryScheduleReminderDispatchAction(input: { dispatchId: string }) {
  const dto = await retryScheduleReminderDispatch(input)
  invalidateScheduleReminderTags(updateTag, dto.schoolId)
  return { ok: true, data: dto }
}
```

### Pattern 4: Immediate read-your-own-writes uses `updateTag()` in Server Actions
**What:** retry 成功后，detail 页和 overview 列表要立即刷新，应在 Server Action 内 `updateTag()`；若需要路径级刷新，再补 `revalidatePath()`。 [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/updateTag.mdx] [VERIFIED: codebase read]
**When to use:** retry action、可能的 worker heartbeat admin mutation。 [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/updateTag.mdx]
**Example:**
```typescript
// Source: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/01-getting-started/09-revalidating.mdx
import { updateTag } from 'next/cache'

export async function createPost(formData: FormData) {
  updateTag('posts')
}
```

### Anti-Patterns to Avoid
- **用 web 进程内存判断 worker 是否在线：** `getAsyncTaskWorkerRuntimeSnapshot()` 只知道当前进程是否 `start()` 过 worker；web 进程读不到独立 worker 真状态。 [VERIFIED: codebase read]
- **让 operator surface 直接 `new Queue()` / `Job.fromId()`：** 违背 ATP-18，且把权限判断散到 UI/page 层。 [VERIFIED: codebase read]
- **retry 走 `enqueueAsyncTask()`：** 会创建第二个 durable task row，直接违背 D-42-14。 [VERIFIED: codebase read]
- **为所有 failed task 默认展示 retry：** 当前 registry 没有 recovery eligibility 明示位，必须先补 metadata。 [VERIFIED: codebase read]
- **把问题任务做成 dense table：** 与 `42-UI-SPEC.md`、现有 Settings/Inspector tonal rhythm 冲突。 [VERIFIED: codebase read]

## Don’t Hand-Roll

| Problem | Don’t Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Manual retry semantics | 自己 patch SQLite 状态把 `failed` 改成 `queued` | BullMQ `Job.retry()` + explicit recovery event + durable snapshot update | 文档明确 `retry()` 支持 failed/completed job；直接 patch DB 会制造 truth drift。 [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/retrying-job.md] [VERIFIED: codebase read] |
| Queue lifecycle audit | 自写一套“伪事件”猜 worker 状态 | 继续复用 QueueEvents + `asyncTaskEvents` append-only history | 当前 Phase 40 已有 durable projection；Phase 42 应扩展，不应平行重写。 [VERIFIED: codebase read] |
| Cache refresh | `router.refresh()` 兜底一切 | `updateTag()` / `revalidatePath()` 按 task / list / route 精准失效 | Next.js 16 对 `updateTag()` 有明确作用域；当前仓库已大量采用 tag discipline。 [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/updateTag.mdx] [VERIFIED: codebase read] |
| Operator list ranking | 在客户端临时 sort 原始 task 数组 | DAL 直接输出“待处理优先” problem-task list DTO | 优先级和 visibility 是服务端业务规则，不应放到 surface。 [VERIFIED: codebase read] |

**Key insight:** Phase 42 最大风险不是“功能做不出来”，而是把 operator truth 偷偷重新散回 BullMQ substrate、UI 客户端排序、或手工数据 patch；这些都会破坏 ATP-18 和 D-42-14~18。 [VERIFIED: codebase read]

## Common Pitfalls

### Pitfall 1: 把 worker runtime snapshot 当成跨进程真相
**What goes wrong:** 首页会把“web 进程没有 worker 单例”误判成“worker 掉线”，或者在本地 dev 混跑时错误显示健康。 [VERIFIED: codebase read]
**Why it happens:** `AsyncTaskWorkerRuntime` 是进程内 singleton，不是 durable heartbeat。 [VERIFIED: codebase read]
**How to avoid:** 在 Plan 01 先补 heartbeat / runtime status 持久化，再让 overview DAL 消费它。 [ASSUMED]
**Warning signs:** overview 只 import `getAsyncTaskWorkerRuntimeSnapshot()`，却没有任何 DB heartbeat 或跨进程状态来源。 [VERIFIED: codebase read]

### Pitfall 2: 让 admin/operator 越过 registry visibility 直接查全校任务
**What goes wrong:** 表面上功能可用，但平台 visibility truth 被绕开，后续 workload 会出现“不知道哪些任务本应 operator 可见”的长期漂移。 [VERIFIED: codebase read]
**Why it happens:** 当前 `course_import.apply_batch` 还是 `actor_owned`，最简单的临时方案是 DAL 偷偷 ignore visibility。 [VERIFIED: codebase read]
**How to avoid:** 把 operator-relevant task type 的 registry visibility 显式改为 `school_operator`，并让 operator DAL respect registry metadata。 [ASSUMED]
**Warning signs:** operator list 查询只按 schoolId 过滤，没有读取 task definition / visibilityScope。 [VERIFIED: codebase read]

### Pitfall 3: retry 成功后 UI 仍停在 failed
**What goes wrong:** operator 点击重试后，页面继续显示 terminal failed，直到 QueueEvents 异步回来才变；这违反 D-42-17。 [VERIFIED: codebase read]
**Why it happens:** 当前 `queue-events.ts` 只在收到 `waiting/active` 后更新 `queued/retrying/running`。 [VERIFIED: codebase read]
**How to avoid:** retry action 成功时立即写 recovery event，并同步把 durable latest snapshot 更新为 `retrying` 或 `queued`。 [ASSUMED]
**Warning signs:** retry action 只调用 BullMQ API，没有 DB update / event insert / updateTag。 [VERIFIED: codebase read]

### Pitfall 4: 首页 backlog posture 只展示数字
**What goes wrong:** operator 需要自己解释 queued/running/retrying/stalled 的数量，第一屏回答不了“现在是否健康”。 [VERIFIED: codebase read]
**Why it happens:** 直接把 SQL count 输出成 metric card 最省事。 [ASSUMED]
**How to avoid:** DAL 输出 posture label + rationale + supporting counts，surface 只渲染。 [ASSUMED]
**Warning signs:** DTO 只有 `queuedCount` / `failedCount`，没有 `posture` / `reason`。 [ASSUMED]

## Code Examples

Verified patterns from official sources:

### BullMQ QueueEvents for durable projection
```typescript
// Source: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/events/README.md
import { QueueEvents } from 'bullmq'

const queueEvents = new QueueEvents('Paint')

queueEvents.on('completed', ({ jobId }) => {
  // Called every time a job is completed in any worker.
})

queueEvents.on('progress', ({ jobId, data }) => {
  // jobId received a progress event
})
```

### BullMQ manual retry for failed job
```typescript
// Source: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/retrying-job.md
import { Queue, Job } from 'bullmq'

const queue = new Queue('my-queue')
const job = await Job.fromId(queue, 'job-id')
await job.retry()
```

### Next.js immediate tag invalidation in Server Actions
```typescript
// Source: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/01-getting-started/09-revalidating.mdx
import { updateTag } from 'next/cache'

export async function createPost(formData: FormData) {
  updateTag('posts')
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 只靠 worker 日志 / BullMQ substrate 看 job | SQLite durable task ledger + QueueEvents projection + DTO/read model | Phase 39-40 | Phase 42 应继续 build on read models，而不是回退成 queue admin 页面。 [VERIFIED: codebase read] |
| teacher/staff 业务页展示 batch import 状态 | teacher/staff 业务页继续只承载业务事实，operator 另走 Settings Labs | Phase 41 → Phase 42 boundary | 避免把运营/排障信息污染 teacher 产品面。 [VERIFIED: codebase read] |
| 失败后人工 patch / 再建新任务 | 显式 recovery event + 同一 durable task 新 attempt | Phase 42 target | 保持 task detail 连续性和审计性。 [VERIFIED: context read] [ASSUMED] |

**Deprecated/outdated:**
- 直接把 `/settings/labs/runtime-inspector` 当作 async operator 容器。原因：D-42-02 明确排除。 [VERIFIED: context read]
- 通过 `enqueueAsyncTask()` 做 operator retry。原因：当前实现必然 insert 新 task。 [VERIFIED: codebase read]

## Phase-Ready 3-Plan Split

### Plan 01 — Operator overview health/read model
- 新增 `src/lib/dal/async-task-operator.ts`，提供 `getAsyncTaskOperatorOverviewDTO()`；聚合 operator scope、BullMQ connection health、worker heartbeat、backlog posture、problem-task list。 [VERIFIED: codebase read] [ASSUMED]
- 新增 worker heartbeat truth（推荐 `asyncWorkerHeartbeat` 或等价表），因为现有 in-memory runtime snapshot 不能跨进程。 [VERIFIED: codebase read] [ASSUMED]
- 修改 `src/features/async-tasks/server/registry.ts`，把 operator-relevant task type 暴露正确 visibility/recovery metadata；至少 `course_import.apply_batch` 需要从 `actor_owned` 调整到 operator-compatible posture。 [VERIFIED: codebase read] [ASSUMED]
- 修改 `src/components/surfaces/settings-surface.tsx`，在 Labs quick links 增加 async operator 入口。 [VERIFIED: codebase read]
- 新增 `/src/app/settings/labs/async-tasks/page.tsx` 和首页 surface。 [ASSUMED]

### Plan 02 — Task detail read model + detail route/surface
- 在 `async-task-operator.ts` 中新增 `getAsyncTaskOperatorDetailDTO(taskId)`；在现有 `AsyncTaskDetailDTO` 基础上补 `latestErrorCard`, `retryEligibility`, `groupedAttempts`, `auditTimeline`, `operatorStatusSummary`。 [VERIFIED: codebase read] [ASSUMED]
- 新增 `/src/app/settings/labs/async-tasks/[taskId]/page.tsx`。 [ASSUMED]
- 新增 `src/components/surfaces/async-task-operator-detail-surface.tsx`，顶部先渲染状态摘要 / progress / latest error / retry posture，再渲染 grouped attempts，最后渲染 timeline。 [VERIFIED: context read] [ASSUMED]
- 不修改 batch import detail truth page；它继续是 teacher/staff truth，不应被 operator detail 替换。 [VERIFIED: context read]

### Plan 03 — Safe retry action + audit + verification
- 新增 `src/actions/async-task-operator-actions.ts` 与服务端 `retryAsyncTaskForOperator()`。 [ASSUMED]
- 服务端 recovery path 必须做：operator auth → visibility check → registry recovery eligibility → terminal failed check → BullMQ `Job.fromId(...).retry()` → append explicit recovery event → immediate durable status update → `updateTag()` / `revalidatePath()`. [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/retrying-job.md] [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/updateTag.mdx] [ASSUMED]
- 新增 `scripts/verify-phase42-operator-recovery.ts` 与 `package.json` 的 `verify:phase42`。 [ASSUMED]

**Dependency order:** Plan 01 → Plan 02 → Plan 03。原因：detail/overview 都依赖 operator scope 与 heartbeat truth；retry action 又依赖 detail DTO 的 eligibility 和 route refresh contract。 [VERIFIED: codebase read] [ASSUMED]

## Minimal Correct Implementation Paths

### 1. Operator 首页最小正确路径
1. 在 `settings-surface.tsx` 的 Labs quick links 增加 `/settings/labs/async-tasks`。 [VERIFIED: codebase read]
2. 新增 `getAsyncTaskOperatorOverviewDTO()`：
   - 解析 `admin + developer` school scope； [VERIFIED: codebase read]
   - 读取 `getBullmqConnectionHealthSnapshot()`； [VERIFIED: codebase read]
   - 读取新的 worker heartbeat truth； [ASSUMED]
   - 按 schoolId 聚合 queued/running/retrying/stalled/failed/dispatch_failed 计数、oldest active age、problem-task list； [ASSUMED]
   - 输出 `platformHealth`, `degradedAlert`, `backlogPosture`, `problemTasks[]` DTO。 [ASSUMED]
3. surface 第一屏先渲染 `platformHealth + degradedAlert`，第二段渲染按 `failed > stalled_recovery > long retrying > dispatch_failed` 排序的问题任务卡。 [VERIFIED: context read] [ASSUMED]

### 2. Task detail 最小正确路径
1. 新增 detail route `/settings/labs/async-tasks/[taskId]`。 [ASSUMED]
2. DAL 基于 `asyncTasks + asyncTaskEvents + registry` 生成 operator detail DTO，而不是让 surface 自己扫 history。 [VERIFIED: codebase read]
3. detail DTO 顶部至少包含：`statusSummary`, `latestError`, `progressSnapshot`, `recoveryPosture`, `retryEligibility`。 [VERIFIED: context read] [ASSUMED]
4. attempts 必须按 `attemptNumber` 分组，timeline 保持辅助审计区。当前 `shared/dto.ts` 虽已有 `attempts[]`，但只是平铺事件，还不是 grouped attempt view。 [VERIFIED: codebase read]

### 3. Safe retry action 最小正确路径
1. action 层禁止复用 `enqueueAsyncTask()`；它会新建 durable task。 [VERIFIED: codebase read]
2. 通过 queue name + `Job.fromId(queue, task.queueJobId ?? task.id)` 找到现有 BullMQ job，再对 failed job 调 `job.retry()`。 [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/retrying-job.md] [ASSUMED]
3. action 成功后立刻写一条 `task.operator_recovery_requested` 或等价 event，并把 latest snapshot 切到 `retrying/queued`。 [VERIFIED: context read] [ASSUMED]
4. `updateTag()` 至少失效：`asyncTask(taskId)`, operator overview list tag, school-scoped problem-task list tag, detail route path。 [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/updateTag.mdx] [ASSUMED]

## DTO / DAL / route / surface / action / verifier Change Map

### DTO
- **Modify:** `src/features/async-tasks/shared/dto.ts` — 如需补 `retryEligibility`、`latestErrorSummary`、`attemptGroup` 原子字段，可扩展基底 schema。 [VERIFIED: codebase read] [ASSUMED]
- **Add (recommended):** `src/lib/dto/async-task-operator.ts` — 定义 `AsyncTaskOperatorOverviewDTO`, `AsyncTaskOperatorProblemTaskDTO`, `AsyncTaskOperatorDetailDTO`, `AsyncTaskRetryEligibilityDTO`；避免 teacher/staff DTO 被 operator 语义污染。 [ASSUMED]

### DAL
- **Add:** `src/lib/dal/async-task-operator.ts` — operator scope resolver、overview aggregate、detail aggregate、problem-task ordering。 [ASSUMED]
- **Modify lightly:** `src/lib/dal/async-tasks.ts` 仅在需要共享底层 helper 时抽公共函数；不要把 operator scope 直接塞回 actor/entity DAL。 [VERIFIED: codebase read] [ASSUMED]

### Route
- **Add:** `src/app/settings/labs/async-tasks/page.tsx`。 [ASSUMED]
- **Add:** `src/app/settings/labs/async-tasks/[taskId]/page.tsx`。 [ASSUMED]
- **No change required:** `src/lib/theme-layout/route-surface-registry.ts` 已把所有 `/settings/labs/**` 路径映射到 `/settings/labs` shell。 [VERIFIED: codebase read]

### Surface
- **Modify:** `src/components/surfaces/settings-surface.tsx` — 增加 async operator quick link。 [VERIFIED: codebase read]
- **Add:** `src/components/surfaces/async-task-operator-surface.tsx` — 首页。 [ASSUMED]
- **Add:** `src/components/surfaces/async-task-operator-detail-surface.tsx` — 详情页。 [ASSUMED]

### Action / Server
- **Add:** `src/actions/async-task-operator-actions.ts`。 [ASSUMED]
- **Add or modify:** `src/features/async-tasks/server/recovery.ts`（推荐）或扩展现有 server 模块，承载 `retryAsyncTaskForOperator()`。 [ASSUMED]
- **Modify:** `src/features/async-tasks/server/registry.ts` — recovery eligibility metadata。 [VERIFIED: codebase read] [ASSUMED]
- **Modify:** `src/features/async-tasks/infra/queue-events.ts` — 支持 operator-triggered recovery event / immediate cache invalidation contract。 [VERIFIED: codebase read] [ASSUMED]

### Verifier
- **Add:** `scripts/verify-phase42-operator-recovery.ts`。 [ASSUMED]
- **Modify:** `package.json` 增加 `verify:phase42`。 [VERIFIED: codebase read] [ASSUMED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Phase 42 应新增跨进程 worker heartbeat / runtime snapshot 持久化，而不是只依赖现有 in-memory runtime snapshot。 | Summary / Plan 01 | 如果仓库已存在别的跨进程 worker health truth，则会造成重复实现。 |
| A2 | `course_import.apply_batch` 最好调整为 `school_operator` visibility，而不是让 operator DAL 绕过 registry visibility。 | Summary / Pitfall 2 / Plan 01 | 若产品希望 admin 只能看自己触发的任务，需要重新收口权限模型。 |
| A3 | operator detail/overview 最好新增独立 DTO/DAL 文件，而不是重载现有 `shared/dto.ts` 与 `lib/dal/async-tasks.ts`。 | Change Map | 若团队偏好集中式文件，planner 需要改成抽 helper 而非新增文件。 |
| A4 | retry 成功后应立即把 durable latest snapshot 切到 `retrying/queued`，不等待 QueueEvents。 | Pitfall 3 / Minimal retry path | 若实现层决定完全依赖 QueueEvents，UI 可能短暂不诚实。 |
| A5 | backlog posture 初版应基于 ledger counts + age 阈值输出 risk posture。 | Plan 01 / Pitfall 4 | 若实际 workload 规模远大于当前假设，阈值需重调。 |

## Open Questions (RESOLVED)

1. **RESOLVED: Worker heartbeat 采用多实例 heartbeat table。** [VERIFIED: codebase read] [ASSUMED]
   - Decision: Phase 42 直接采用 `instanceId + queueNames + lastSeenAt + status` 的 heartbeat table，而不是单行 system table。
   - Why resolved: 当前没有跨进程 worker truth，且 v2.3 已经把 worker 定义为独立进程；heartbeat table 同时兼容单实例与未来多实例，不需要在 Phase 43 重构事实模型。
   - Planning impact: 42-01 必须把 heartbeat table、Drizzle migration、worker start/stop/upsert 规则一起写清楚，overview health 只消费该 durable truth。

2. **RESOLVED: BullMQ job 已不存在时，retry 必须诚实失败并写 recovery-failed audit。** [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/retrying-job.md] [ASSUMED]
   - Decision: Phase 42 不允许在 job 丢失时自动 clone 新 task，也不允许 fallback 到 `enqueueAsyncTask()`；系统必须返回 typed error，并追加 `task.operator_recovery_failed` audit event。
   - Why resolved: `enqueueAsyncTask()` 会创建第二个 durable task row，直接违背 D-42-14；BullMQ docs 也没有为“丢失 job 但保留 durable task”提供透明恢复语义。
   - Planning impact: 42-03 必须明确 `Job.fromId(...)` miss / retry throw 的错误路径、event payload、detail DTO 的 latest error copy，以及 verifier 的静态守卫。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js / worker / verifier | ✓ | `v24.1.0` | — [VERIFIED: bash] |
| npm | registry checks / package scripts | ✓ | `11.6.2` | — [VERIFIED: bash] |
| Python | local helper tooling | ✓ | `3.14.5` | — [VERIFIED: bash] |
| BullMQ package | async platform runtime | ✓ | `5.76.10` | — [VERIFIED: codebase read] [VERIFIED: npm registry] |
| `ASYNC_TASKS_ENABLED` env | live worker runtime | ✗ | unset | Use mocked/focused tests; no live end-to-end recovery proof without env. [VERIFIED: bash] |
| `BULLMQ_REDIS_URL` env | live queue / retry / heartbeat | ✗ | unset | Use mocked/focused tests; live operator health cannot be proven locally yet. [VERIFIED: bash] |
| `redis-cli` | optional manual local probing | ✗ | — | Not required for unit/verifier path. [VERIFIED: bash] |

**Missing dependencies with no fallback:**
- Live BullMQ/worker verification is blocked until `ASYNC_TASKS_ENABLED=true` and `BULLMQ_REDIS_URL` are configured. [VERIFIED: bash]

**Missing dependencies with fallback:**
- `redis-cli` 缺失不阻塞 Phase 42；可用 Vitest + source verifier + app DTO tests 代替。 [VERIFIED: bash]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Auth.js session + `getCurrentUserDTO()` 解析当前用户。 [VERIFIED: codebase read] |
| V3 Session Management | yes | 服务端 session 读取，不在 client 直接决定 operator 权限。 [VERIFIED: codebase read] |
| V4 Access Control | yes | operator scope resolver 必须按 membership role + schoolId 过滤；retry action 再次校验 task visibility。 [VERIFIED: codebase read] [ASSUMED] |
| V5 Input Validation | yes | 所有 operator action / DTO 继续使用 Zod schema。 [VERIFIED: codebase read] |
| V6 Cryptography | no | Phase 42 不新增密码学功能；沿用 Auth.js 既有能力。 [VERIFIED: codebase read] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-school task inspection | Information Disclosure | 所有 overview/detail query 必须带 operator `schoolIds` 过滤，并尊重 registry visibility。 [VERIFIED: codebase read] [ASSUMED] |
| Unsupported failed task gets retry CTA | Tampering | registry recovery metadata 作为唯一 eligibility source；surface 不自行猜测。 [VERIFIED: codebase read] [ASSUMED] |
| Silent retry with no audit trail | Repudiation | append explicit recovery event with actorId, timestamp, previous attempt/state。 [VERIFIED: context read] [ASSUMED] |
| UI trusts BullMQ admin state over ledger | Tampering | app surfaces only consume DAL/DTO built from SQLite + sanctioned infra snapshots。 [VERIFIED: codebase read] |
| Operator action used from teacher role | Elevation of Privilege | 独立 operator auth resolver；不要复用 `assertActiveTeacher()`。 [VERIFIED: codebase read] |

## Sources

### Primary (HIGH confidence)
- `/taskforcesh/bullmq` - QueueEvents, graceful shutdown, manual retry docs via Context7 CLI fallback. [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/events/README.md] [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/workers/graceful-shutdown.md] [CITED: https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/retrying-job.md]
- `/vercel/next.js/v16.2.2` - `updateTag()` semantics via Context7 CLI fallback. [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/04-functions/updateTag.mdx] [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/01-getting-started/09-revalidating.mdx]
- npm registry - `bullmq`, `next`, `react`, `zod` current versions and modified timestamps. [VERIFIED: npm registry]
- Required planning docs and Phase 39-41 artifacts listed in the user prompt. [VERIFIED: context read]
- Code anchors explicitly listed in the user prompt plus supporting files (`enqueue.ts`, `mapper.ts`, `connection.ts`, `worker/bootstrap.ts`, `actions/course-import-actions.ts`, `cache-policy.ts`, `route-surface-registry.ts`). [VERIFIED: codebase read]

### Secondary (MEDIUM confidence)
- None.

### Tertiary (LOW confidence)
- Recovery metadata shape, heartbeat table shape, backlog threshold defaults, and exact file split recommendations in this research are planning assumptions derived from current codebase constraints rather than verified upstream docs. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 所有核心库与版本都来自 `package.json` + npm registry + current docs。 [VERIFIED: codebase read] [VERIFIED: npm registry]
- Architecture: HIGH - 关键结论直接来自 Phase 42 context、现有 async-task code path、Settings Labs/runtime-inspector patterns。 [VERIFIED: context read] [VERIFIED: codebase read]
- Pitfalls: HIGH - 主要 pitfall 均是从当前代码边界直接推导出的真实冲突点（worker snapshot 跨进程、enqueue 新建 task、visibility actor_owned）。 [VERIFIED: codebase read]

**Research date:** 2026-05-19
**Valid until:** 2026-06-18 for codebase findings; re-check npm/doc versions if planning slips beyond 30 days. [VERIFIED: npm registry] [ASSUMED]

调查结论：
- 现状是：Phase 39-41 已经有 durable ledger、QueueEvents projection、attempt/failure/recovery 基底、Settings Labs operator 风格，但还没有真正的 async operator route、operator read model、safe retry action、跨进程 worker health truth。 [VERIFIED: codebase read]
- 关键约束是：必须留在 Settings Labs、必须用 DAL/DTO truth、必须对 admin+developer 做 school-scoped access control、必须保持“同一 durable task 内追加 attempt”的恢复语义。 [VERIFIED: context read]
- 我之前不知道但现在知道的是：当前 `getAsyncTaskWorkerRuntimeSnapshot()` 无法作为 operator 健康真相，因为它只是当前进程内 singleton；当前 `course_import.apply_batch` 仍是 `actor_owned`；当前 `enqueueAsyncTask()` 无法承担同 task retry。 [VERIFIED: codebase read]
- 基于以上，我的判断是：Phase 42 最自然的 3-plan 拆法就是先补 overview health/read model，再补 detail/read model/surface，最后补 safe retry + verifier；其中 worker heartbeat 与 registry recovery metadata 是规划阶段必须先锁定的 blocking seam。 [VERIFIED: codebase read] [ASSUMED]
