# Feature Landscape

**Milestone:** v2.3 Async Task Platform  
**Domain:** Brownfield education product background job platform  
**Researched:** 2026-05-18  
**Confidence:** HIGH for milestone framing against current project state and deferred roadmap direction; MEDIUM for BullMQ-specific implementation details because Context7 MCP was unavailable and docs were verified via official web/CLI fallback

## Scope Framing

这个 milestone 不应被定义成“把系统里所有异步都平台化”，而应被定义成：**在现有课堂产品不重写的前提下，建立一个可复用、可观测、可重试、可注册真实任务的后台任务平台，并用 3-4 类真实任务完成验证**。

这是 brownfield 里程碑，不是 greenfield 队列实验。它必须尊重三件事：

1. **durable truth 仍在 SQLite + DAL + canonical write path**，队列只负责异步执行，不成为业务真相源。
2. **课堂主链路不能因任务平台被重写**，尤其不能顺手把 realtime、runtime、Redis posture 一起翻修。
3. **首批任务必须来自真实教育流程**，不是只做一个 demo queue 然后声称平台成立。

## Feature Categories

建议把新 milestone 的 feature scope 组织成 6 组，便于后续直接拆 requirement：

| Category | Why it belongs in v2.3 | Requirement question |
|---------|-------------------------|----------------------|
| Task contract & registration | 没有统一任务定义方式，后续每个 job 都会重新发明入口和状态 | 新任务是否能按统一 contract 注册、入队、执行、回报状态？ |
| Reliability & execution safety | “能跑”不等于“可上线” | job 失败、重试、幂等、重复提交时系统是否仍可控？ |
| User-visible progress | 教师必须知道系统在处理中，而不是卡住或无反馈 | 教师是否能看到 import / processing / reminder 等任务的状态与结果？ |
| Operator visibility & recovery | 平台化的核心是可运营，不是藏在日志里 | 运维/开发是否能看到失败原因、重试轨迹、卡住任务与积压？ |
| Scheduling & event-driven triggers | 首批真实任务需要覆盖定时与异步后处理两类触发 | 平台是否同时支持 schedule 和 domain-event enqueue？ |
| Real-job validation slices | 平台必须被真实业务验证 | 至少 3 类真实任务是否已用同一平台跑通？ |

## Table Stakes

这些是 **v2.3 不做就不算真正落地 async task platform** 的基础能力。

### 1. Platform Core

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Typed task registry | 后续任务注册必须统一，而不是每个模块自建 worker | Medium | 每个 task 至少声明：`taskType`、payload schema、enqueue入口、processor、progress contract、retry policy。 |
| Canonical task record | 需要在应用侧留下 durable task truth，而不只依赖队列内部状态 | High | 建议保留 app-level `asyncTasks` / `taskRuns` 投影，记录 actor、scope、trigger、status、summary、lastError。 |
| Standard enqueue boundary | 所有入队必须走 DAL / server boundary，不能组件直接塞队列 | Medium | 便于鉴权、幂等 key、审计、DTO 清洗。 |
| Queue/worker separation | 平台必须区分“创建任务”和“执行任务”边界 | Medium | brownfield 里尤其重要，避免页面请求线程做伪异步。 |

### 2. Reliability & Safety

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Retry policy per task type | 不同任务失败语义不同，不能一刀切 | Medium | BullMQ docs支持 `attempts` + fixed/exponential/custom backoff；平台层要把它产品化成策略。 |
| Idempotency / deduplication | brownfield 里最容易出现重复点击、重复事件、重复导入 | High | 至少支持业务幂等 key；BullMQ 可用 `jobId` 或 deduplication 模式，但应用层仍需定义“同一任务”的业务语义。 |
| Progress reporting contract | 没有进度契约就无法做教师可见状态 | Medium | Worker 必须能上报 number 或 structured object progress，而不是只给 running/completed。 |
| Terminal failure posture | 失败不能只留在 worker 日志 | Medium | 必须区分：retrying、exhausted、cancelled（若支持）、completed with warnings。 |
| Stall / stuck detection posture | 长任务最怕“看起来还在跑，实际没人处理” | Medium | 需要 operator surface 明确区分 queued / active / stalled / failed / exhausted。 |

### 3. Teacher / Staff Visible Status

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Task status surfaces in product UI | 用户发起异步动作后必须有可见反馈 | Medium | 首批至少覆盖 batch import、resource processing 两类长任务。 |
| Human-readable progress & result summary | 教师不看 queue name 和 raw payload | Medium | 例如“已导入 43/120 条学生记录”“资源转码失败 2 个文件”。 |
| Task completion/failure feedback | 处理结束后要回到用户工作流 | Medium | 可先做站内状态/任务中心，不必一开始上全量通知矩阵。 |
| Correlation to source object | 用户必须知道哪个课程/资源/导入批次正在处理 | Low | 每个任务都应能反查到 lesson/course/resource/importBatch。 |

### 4. Operator / Developer Visibility

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Queue-level operator dashboard | milestone 目标明确要求 operator-visible failure/retry posture | Medium | 需要看到 waiting/active/completed/failed/retrying/stalled counts。 |
| Run detail with error and retry history | “失败了”不够，需要知道为什么、试过几次 | Medium | 包括 attempts、backoff、lastError、timestamps、progress snapshot。 |
| Safe retry and replay controls | 运维需要恢复姿势，但不能无脑重放 | Medium | 至少支持按权限手动 retry 单任务；bulk retry 应谨慎。 |
| Event/log correlation | 平台问题排查不能只看 Redis 内部状态 | Medium | 要把任务 run 与应用事件、source actor、domain object 关联起来。 |

### 5. Trigger Modes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Scheduled task support | 候选首批任务里明确有 reminders / scheduled jobs | Medium | BullMQ 当前推荐 Job Scheduler；旧 repeatable jobs 已被官方标记为 deprecated。 |
| Event-driven task enqueue | event post-processing 天然依赖领域事件触发 | Medium | 应从 canonical domain event / action completion 统一入队。 |
| Manual enqueue for operator workflows | import 重试、补跑、重处理需要人工触发入口 | Low | 但必须走同一 task registry 和审计。 |

## Useful Differentiators

这些不是平台存在的最低门槛，但对 OpenLearn Next 这种教育产品很值钱，能把 milestone 从“基础 infra”拉成“可被产品团队真正使用的平台”。

### 1. Productized Async UX

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Teacher-facing task inbox/history | 把“后台处理中”产品化，而不是临时 toast | Medium | 适合导入、资源处理、批量修复等长任务。 |
| Progress projected into source workflows | 用户不必跳去运维页看处理状态 | Medium | 例如资源详情页直接显示 processing pipeline 状态。 |
| Partial success summaries | 教育场景大量批处理是“部分成功”而非全成全败 | Medium | 例如 120 名学生导入成功 117，失败 3。 |

### 2. Better Recovery Posture

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Failure classification | 比单纯 failed 更可运营 | Medium | 区分 validation error、dependency unavailable、transient infra、poison payload。 |
| Retry recommendation hints | 降低 operator 判断成本 | Medium | 例如“建议稍后重试”“需修复 CSV 模板后重传”。 |
| Quarantine / poison-task posture | 防止坏 payload 反复压垮队列 | Medium | 不一定要单独 DLQ 产品，但要有明确隔离与人工处理姿势。 |

### 3. Platform Extensibility

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| One-file task registration pattern | 降低未来新增任务成本 | Low | 新任务开发应更像“填 contract”而不是复制整套 wiring。 |
| Shared progress/result schema helpers | 让任务结果可被 UI 一致消费 | Low | 避免每个任务输出完全不同的结构。 |
| Task policy presets | 让“轻任务 / 长任务 / schedule 任务”快速复用 | Low | 例如 default retry/backoff/retention/concurrency presets。 |

## Anti-Features

这些功能很诱人，但放进 v2.3 会把里程碑从“可复用任务平台”拖成“新一轮基础设施重构”。

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| PostgreSQL cutover | 用户已明确排除；而且这会模糊 async 平台的成败标准 | 保持 SQLite 为 durable truth，只把 async 平台建立在现有数据边界之上。 |
| Classroom realtime rewrite | 当前 WebSocket-first posture 已完成，没必要把 transport 重做一遍 | 只消费现有 domain events / product actions，不重写 realtime 主链路。 |
| Full workflow engine / BPMN system | 会把 milestone 变成通用编排平台，不再是 job platform | 先支持单任务和少量 task family，不做可视化工作流编排。 |
| AI expansion / AI job factory | 用户已明确排除，而且会引入成本、评测、provider policy | 用 reminders/import/resource processing 证明平台即可。 |
| Third-party runtime governance | 与本 milestone 目标不直接相关，blast radius 太大 | 先只做 first-party task registration。 |
| Full multi-tenant external worker fabric | 现阶段会过度设计 | 先做应用内 worker boundary + optional Redis-based queue backbone。 |
| Generic “run arbitrary code” jobs | 直接破坏安全边界 | 只允许注册过的 typed task processors。 |
| Fancy DAG / orchestration-first design | 首批任务不需要完整 flow engine | 如有必要，只做 task chaining 的最小内部模式，不把它作为 milestone headline。 |
| Operator-only milestone | 只有后台队列面板会让产品价值不明显 | 必须有教师或 staff 可见的 async UX。 |

## Real Jobs to Validate the Platform

这个 milestone 不应只交付基础设施；必须用真实任务证明平台覆盖不同触发方式和不同失败模型。

### Recommended validation set

| Job Family | Why it should be in milestone | Trigger Type | User Value | Platform capability proven |
|-----------|-------------------------------|--------------|------------|----------------------------|
| Reminders / scheduled jobs | 验证 schedule、dedupe、operator visibility | Scheduled | 提醒教师/学生待办、课前/课后提醒 | Job Scheduler、retry posture、safe recurrence |
| Batch import processing | 最典型长任务，最需要 teacher-visible progress | Manual upload / staff action | 导入学生、成员、资源清单等 | Progress, partial success, failure summary, idempotency |
| Event post-processing | 验证 domain event -> async follow-up 的标准路径 | Event-driven | 把主链路中的非阻塞动作移出同步请求 | Enqueue boundary, event-trigger model, reliability |
| Resource processing | 验证较重任务与多阶段状态投影 | Upload / publish action | 资源解析、转码、索引、封面生成等 | Long-running progress, stuck detection, retries |

### Best milestone validation mix

建议 **至少交付 3 个真实任务**，而不是 1 个：

1. **Batch import processing** — 最能证明用户可见进度与部分失败处理。
2. **Reminders / scheduled jobs** — 最能证明平台不只是“手动点一下再跑个 worker”。
3. **Resource processing** 或 **event post-processing** — 用来证明平台能承接长任务或系统后处理，而非只做 CRON。

其中最值得优先做的“演示链路”是：

- **教师上传导入文件 → 系统排队处理 → UI 可见进度 → 部分成功结果可查看 → operator 可见失败重试轨迹**

这是最完整的 brownfield 产品化证明。

## Requirement-Oriented Cut Lines

### Must ship in v2.3

| Requirement Area | Must-have outcome |
|------------------|-------------------|
| Registration | 新 task 可通过统一 registry 注册并入队 |
| Reliability | 每类 task 有明确 retry/backoff/idempotency posture |
| User UX | 至少一类 teacher/staff 发起的长任务有清晰进度与结果反馈 |
| Operations | 有 operator 可见的失败、重试、积压与 run detail surface |
| Triggering | 至少覆盖 manual + scheduled + event-driven 三类中的两类，最好三类 |
| Validation | 至少 3 个真实任务跑在同一平台上 |

### Good to ship if scope allows

| Requirement Area | Nice-to-have outcome |
|------------------|----------------------|
| Recovery | 失败分类与重试建议 |
| UX | 用户任务历史 / inbox |
| Extensibility | task presets、shared result schema helpers |
| Ops | queue visibility by role、read-only operator mode |

### Explicitly defer

| Defer | Reason |
|------|--------|
| Workflow/DAG engine | 不是首批教育任务的主要痛点 |
| External task marketplace | 不属于 first-party background platform MVP |
| Broad infra migration | 会稀释 milestone 成败标准 |
| AI task expansion | 与本 milestone 验证目标不一致 |

## MVP Recommendation

优先级建议如下：

1. **Typed task registry + canonical task record**
2. **Retry / idempotency / progress contract**
3. **Batch import processing with teacher-visible progress**
4. **Operator run detail + retry posture**
5. **Scheduled reminders using Job Scheduler**
6. **One event-driven post-processing or resource-processing task**

如果只能保住一条最小闭环，应该保：

**“用户发起长任务 → 平台异步执行 → UI 看见进度 → 失败能解释 → operator 能重试 → 新任务可按同一模式继续注册”**

没有这条闭环，v2.3 就容易退化成“接了 BullMQ，但产品没真正得到一个任务平台”。

## Feature Dependencies

```text
Task registry
  → standard enqueue boundary
  → canonical task record
  → progress/result schema

Canonical task record
  → teacher-visible status
  → operator run detail

Retry/idempotency posture
  → safe manual retry
  → scheduled jobs
  → event post-processing

Scheduled trigger support
  → reminders

Long-running progress projection
  → batch import
  → resource processing
```

## Sources

- `.planning/PROJECT.md` — 当前项目状态、deferred frontier、非目标约束。Confidence: HIGH.
- `.planning/MILESTONES.md` — v2.2 已归档边界，证明 async worker slice 需要作为独立 milestone。Confidence: HIGH.
- `.planning/STATE.md` — 当前里程碑状态与 deferred follow-up。Confidence: HIGH.
- Official BullMQ docs `https://docs.bullmq.io/readme.md` — Redis-backed queue feature set, retries, scheduled jobs, progress, worker/events baseline. Confidence: HIGH.
- Official BullMQ docs `https://docs.bullmq.io/guide/retrying-failing-jobs.md` — attempts/backoff/jitter/custom retry strategy. Confidence: HIGH.
- Official BullMQ docs `https://docs.bullmq.io/guide/events.md` — `QueueEvents`, progress/completed/failed events, Redis stream delivery semantics. Confidence: HIGH.
- Official BullMQ docs `https://docs.bullmq.io/guide/job-schedulers.md` — `upsertJobScheduler`, scheduler semantics, repeatable job deprecation direction. Confidence: HIGH.
- Official BullMQ docs `https://docs.bullmq.io/guide/jobs/job-ids.md` — queue-scoped unique job IDs and duplicate suppression behavior. Confidence: HIGH.
- Official BullMQ docs `https://docs.bullmq.io/guide/jobs/deduplication.md` — simple/throttle/debounce/keepLastIfActive dedupe modes. Confidence: HIGH.
- Official BullMQ docs `https://docs.bullmq.io/patterns/idempotent-jobs.md` — idempotent job design guidance. Confidence: HIGH.
- GitHub `felixmosh/bull-board` README and release metadata — operator dashboard ecosystem maturity, read-only/retry posture options, latest visible release `v7.1.5` dated 2026-05-14. Confidence: MEDIUM.
