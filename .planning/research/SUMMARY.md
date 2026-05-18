# Project Research Summary

**Project:** OpenLearn Next  
**Domain:** v2.3 Async Task Platform inside the existing education monolith  
**Milestone:** v2.3 Async Task Platform  
**Researched:** 2026-05-18  
**Confidence:** HIGH

## Executive Summary

v2.3 不应被定义成一次新的基础设施大迁移，而应被定义成：**在现有 Next.js 单体、SQLite durable truth、DAL/Server Actions 边界和已交付的 WebSocket/Redis delivery posture 之上，补齐一个可复用、可观测、可重试、可注册真实任务的后台任务平台。** 研究结论高度一致：BullMQ 适合作为执行与调度引擎，但它只能是 orchestration substrate，不能成为新的业务真相源。

推荐路线很明确：新增 `bullmq`、独立 worker 进程、BullMQ 专用 Redis 连接工厂、以及 SQLite task ledger/read model；所有业务仍然先同步写入 SQLite，再通过统一 enqueue boundary 入队；worker 再通过 DAL / domain service 回写结果与进度。首批验证不应碰 classroom 主链路，也不应顺手拉入 PostgreSQL、AI runtime 扩张或 broader infra rewrite，而应优先用 **batch import、scheduled reminders、resource processing 或 event post-processing** 这类真实教育任务证明平台成立。

最大的风险不是“BullMQ 不够强”，而是**边界失守**：把 Redis 当真相源、让 worker 绕过 DAL、没有幂等设计、enqueue 与事务脱节、以及把 web/worker 生命周期混在一起。只要 milestone requirements 从一开始就把这些约束写死，v2.3 就能成为后续 async workload 的稳定平台，而不是几个难运维的临时后台脚本。

## Key Findings

### Recommended Stack

v2.3 不需要重选基础框架。应保持 Next.js 16、React 19.2、Auth.js v5、Drizzle、SQLite、DAL/Server Actions、现有 WebSocket 与 optional Redis fanout posture 不变，只为 async platform 增加最小必要能力。

**Core technologies:**
- **BullMQ `^5.76.10`**：后台任务队列、重试、延迟任务、QueueEvents —— 当前最合适的 async orchestration engine。
- **`ioredis` `^5.10.1`（沿用）**：BullMQ Redis client —— 继续使用，但必须新增 queue 专用 connection factory，不能直接复用 realtime fanout 单例。
- **Redis service（新增 queue role）**：BullMQ backend —— 从“课堂 delivery optional capability”扩展为“async tasks deploy prerequisite”，但仍不是业务 truth。
- **Dedicated worker process**：独立于 web 进程的 Node worker —— 避免把请求生命周期与消费生命周期耦合。
- **SQLite task ledger via Drizzle**：`asyncTask` / `asyncTaskEvent` 或同类表 —— 持有任务真相、进度、失败原因、attempt history、operator read model。
- **QueueEvents projector**：监听 `progress/completed/failed` —— 把运行态投影回 SQLite，而不是让 UI 直接读 Redis job state。

**关键新增/约束：**
- 独立 env：`ASYNC_TASKS_ENABLED`、`BULLMQ_REDIS_URL`、`BULLMQ_PREFIX`、`WORKER_INSTANCE_ID`。
- Redis 必须按 BullMQ 生产要求配置：AOF / persistence、`maxmemory-policy=noeviction`。
- 禁止使用 ioredis `keyPrefix`；使用 BullMQ `prefix` 做 namespace。
- 先采用 `Queue + Worker + QueueEvents`，**默认不引入 `FlowProducer`**。

### Expected Features

v2.3 的 feature 定义不应是“所有异步统一平台化”，而应是：**建立统一 contract + 可运营能力 + 用户可见状态，并用至少 3 类真实任务验证。**

**Must have (table stakes):**
- **Typed task registry** —— 统一定义 `taskType`、payload schema、processor、progress contract、retry policy。
- **Canonical task record** —— 应用侧保留 durable task truth，而不是只依赖 BullMQ 内部状态。
- **Standard enqueue boundary** —— UI 不能直接碰队列，所有入队必须经过 Server Action / DAL。
- **Queue/worker separation** —— 请求侧只负责提交，worker 负责执行。
- **Per-task retry / idempotency posture** —— 每类任务定义 attempts、backoff、jobKey/幂等键、terminal failure 语义。
- **Progress reporting contract** —— 至少支持教师/staff 可见的处理中状态与结果摘要。
- **Operator-visible run detail** —— 能看到 waiting/active/failed/stalled、错误原因、重试轨迹、人工 retry 姿势。
- **Trigger support** —— 至少覆盖 manual、scheduled、event-driven 三类中的两类，最好三类。
- **Real-job validation** —— 至少 3 个真实任务跑在同一平台上。

**Should have (competitive / productized):**
- 教师/员工任务历史或 inbox。
- 部分成功结果摘要（例如导入 120 成功 117、失败 3）。
- 失败分类与 retry recommendation hints。
- task policy presets、shared result/progress schema helpers。

**Defer (not v2.3):**
- PostgreSQL cutover。
- Classroom realtime rewrite。
- Full workflow/DAG engine。
- AI runtime expansion / AI job factory。
- Third-party runtime governance。
- External worker fabric / arbitrary code jobs。
- bull-board 之类外部 admin UI 作为 milestone headline。

**首批最值得验证的真实任务：**
1. **Batch import processing** —— 最能证明进度、部分成功、幂等与 operator 价值。  
2. **Scheduled reminders** —— 最能证明平台不只是“手动点一下跑个 worker”。  
3. **Resource processing** 或 **event post-processing** —— 最能证明长任务/派生任务能力。

### Architecture Approach

架构结论非常统一：**BullMQ 是单体内的后台执行平面，不是新的主写路径。** 推荐数据流为：`UI / Route / Server Action -> feature server orchestrator -> DAL transaction -> SQLite task record + enqueue intent -> BullMQ -> Worker -> DAL/domain service -> SQLite status DTO + cache invalidation`。

**Major components:**
1. **`src/features/async-tasks` feature root** —— 统一承载 contracts、enqueue API、status service、worker registry、BullMQ seam。
2. **Feature server orchestrator** —— 同步完成鉴权、主业务写入、task record 创建、enqueue 编排。
3. **BullMQ infra seam** —— `connection.ts`、`bullmq.ts`、`queue-events.ts`，隔离 Redis/BullMQ 细节。
4. **Dedicated worker bootstrap** —— 独立 `src/server/workers/entry.ts` 或 `src/workers/async-task-worker.ts`，只消费 job，不并入 `server.ts`。
5. **SQLite task ledger/read model** —— `asyncTask`、`asyncTaskEvent`、attempt/progress snapshot，作为 UI/operator 真相层。
6. **Worker processors** —— 只调用 DAL / domain service / typed command，不直接裸写数据库。

**必须遵守的模式：**
- 先写业务 truth，再 enqueue；不能先 `queue.add()` 再希望事务成功。
- UI 和 route 层只读稳定 DTO，不直接读 BullMQ `Job` 或 Redis 状态。
- Worker 写回后必须接入缓存失效策略；不能假设“用户刷新页面就好了”。
- 采用 feature-by-feature migration；首批优先迁移 reminder dispatch，而不是动课堂主链路。

### Critical Pitfalls

1. **把 BullMQ/Redis 变成新的业务真相源** —— 必须坚持 SQLite + DAL 为 truth，Redis 仅负责排队与执行。
2. **worker 绕过 DAL / auth / DTO / cache 边界** —— worker 只能走 server-side application service / DAL，不直接裸写表。
3. **任务没有幂等设计** —— BullMQ 最坏语义是 at-least-once，必须为 reminder/import/resource/event 定义业务级幂等键。
4. **把“queued”误当成“done”** —— 对用户承诺必须区分同步完成、提交后异步、纯派生任务三种语义。
5. **enqueue 与数据库事务脱节** —— 至少要有 SQLite task intent / ledger，可补偿重扫；不能只信 Redis。
6. **误以为已有 ioredis 就够了** —— producer/worker/events 连接策略必须分离，Redis 要满足 BullMQ 生产要求。
7. **web 与 worker 混跑** —— 禁止在 `server.ts` 或 Next dev/HMR 里隐式启动真实 worker。
8. **没有 durable status model** —— 如果只能去 Redis 看状态，就还没有产品化 async platform。

## Implications for Roadmap

基于研究，v2.3 最合理的是一个 **4 阶段主线 + 1 阶段扩展验证** 的 roadmap，而不是一口气并行铺开所有任务类型。

### Phase 1: Async Contracts & Durable Task Truth
**Rationale:** 所有后续能力都依赖统一任务定义与稳定状态模型；先定义 truth，后接执行引擎。  
**Delivers:**
- `src/features/async-tasks` 基础 root
- task/job names、payload/result/progress Zod schemas
- `asyncTask` / `asyncTaskEvent` / attempt/progress ledger schema
- status DTO 与基础查询服务
**Addresses:** typed task registry、canonical task record、progress contract、operator read model foundation  
**Avoids:** “Redis 成为真相源”“UI 直接读 Job 状态”“无审计历史”  
**Research posture:** **可直接规划，基本无需额外 research-phase**。

### Phase 2: BullMQ Infra Seam & Worker Bootstrap
**Rationale:** 在不改业务模块的前提下，先跑通 enqueue -> worker pickup -> status projection 的最小平台闭环。  
**Delivers:**
- BullMQ connection factories（producer/worker/events 分离）
- Queue / Worker / QueueEvents factories
- 独立 worker entrypoint 与 dev/start scripts
- QueueEvents -> SQLite projector
- 一个 `debug.ping` / `system.noop` 最小验证任务
**Uses:** `bullmq`、现有 `ioredis`、独立 Redis env flags  
**Implements:** async infra seam、worker lifecycle boundary  
**Avoids:** web/worker 混跑、Redis 连接配置错误、无 graceful shutdown  
**Research posture:** **可直接规划**，但部署要求应在 requirement 中明确写入 Redis production checklist。

### Phase 3: First Real Product Slice — Batch Import or Reminder Dispatch
**Rationale:** 平台只有接入真实教育任务才成立；第一条真实链路应优先选 blast radius 小、用户价值高、状态容易解释的任务。  
**Delivers:**
- 首个真实 task family 接入统一 registry
- 用户发起异步任务后立即获得 taskId / queued status
- UI 可见 progress、result summary、failure summary
- Worker 执行后回写业务对象与任务状态
**Recommended priority:**
1. **Batch import processing**（最佳演示链路）
2. **若要更稳起步，则先做 schedule reminder dispatch**（最小迁移风险）
**Addresses:** teacher/staff-visible status、retry/idempotency、correlation to source object  
**Avoids:** “只交 infra 没有产品价值”“queued 被误说成 success”  
**Research flags:**
- **Batch import path**：需要细化 row/chunk-level idempotency、partial success model。
- **Reminder path**：需要细化时区、补课/改课、missed window 业务语义。

### Phase 4: Operator Visibility & Recovery
**Rationale:** 平台化的核心是可运营，不是日志里能看到 job id。  
**Delivers:**
- queue-level operator dashboard / settings-labs operator surface
- run detail、attempt history、last error、progress snapshot
- safe manual retry / replay posture
- degraded honesty：worker connected/disconnected、backlog、last failure
**Addresses:** operator visibility、run detail、safe retry、event/log correlation  
**Avoids:** “失败只留在 worker 日志”“没有人工补偿姿势”  
**Research posture:** **可直接规划**；优先复用现有 runtime inspector / settings operator 语言，不新造运维概念。

### Phase 5: Second and Third Validation Workloads
**Rationale:** 平台必须证明自己能承接不同触发模式，而不是单一 job demo。  
**Delivers:**
- Scheduled reminders（若未在 Phase 3 完成）
- Resource processing 或 event post-processing
- 至少三类真实任务运行在同一平台上
**Addresses:** scheduled + event-driven trigger support、long-running progress、derived async follow-up  
**Avoids:** 把 v2.3 误做成只支持 manual enqueue 的半成品平台  
**Research flags:**
- **Resource processing**：CPU/IO 特征、concurrency、payload schema versioning、cache invalidation matrix 需要 deeper planning。
- **Event post-processing**：需要严格限定为 derived effects，避免误入主业务写路径。

### Phase Ordering Rationale

- **先定义 truth，再接执行引擎，再接真实任务，再做 operator/productization，最后扩 workload。** 这是依赖关系最清晰、blast radius 最小的顺序。
- Phase 1-2 解决平台骨架和运维边界；Phase 3 才有资格谈“这个平台对教师/员工到底有价值”；Phase 4-5 再把它做成真正可运营、可扩展的平台。
- 这个顺序也最能规避研究中反复出现的几个大坑：truth 漂移、worker 越权、幂等失守、事务脱节、web/worker 生命周期污染。

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3（若选择 batch import）**：需要补充 row/chunk 级幂等、partial success UX、失败归档策略。
- **Phase 3/5（scheduled reminders）**：需要补充时间语义、时区、改课/补课后的 reschedule 规则。
- **Phase 5（resource processing）**：需要补充并发/限流/timeout、CPU-heavy isolation、payload schemaVersion、缓存失效矩阵。
- **Phase 5（event post-processing）**：需要验证与现有 canonical event/outbox 的衔接，避免升级成新的主写路径。

Phases with standard patterns (skip research-phase):
- **Phase 1**：schema、DTO、feature root、ledger/read model 形态已有充分共识。
- **Phase 2**：BullMQ producer/worker/events split、独立 worker 进程、Redis 生产约束已有成熟模式。
- **Phase 4**：operator visibility 可大量复用当前 runtime inspector / degraded honesty 既有语言。

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | BullMQ、ioredis、Redis 生产要求、独立 worker、SQLite ledger 结论清晰且与项目约束强一致。 |
| Features | HIGH | milestone framing、table stakes、anti-features、真实任务验证集与当前项目状态高度吻合。 |
| Architecture | HIGH | feature root + seam + worker process + SQLite truth + DAL 回写的模式与现有仓库哲学完全一致。 |
| Pitfalls | HIGH | 风险集中且反复交叉验证，特别是 truth drift、idempotency、transaction ordering、worker boundary、Redis ops posture。 |

**Overall confidence:** HIGH

### Gaps to Address

- **首个真实任务到底选 batch import 还是 reminder dispatch**：planning 时必须做一次明确取舍；前者产品证明更强，后者迁移风险更低。
- **跨进程 cache invalidation 策略**：worker 完成后如何触发 Next.js 16 显式缓存更新，需要 requirement 级写清 mapping 或补偿策略。
- **scheduled reminder 的时间语义**：学校时区、改课/补课、missed window 是否补发，不能在实现期边做边猜。
- **resource processing 的执行特征**：如果包含 CPU-heavy 处理，可能需要独立 queue/worker/concurrency，而不适合直接沿用默认 worker preset。
- **enqueue failure reconciliation**：若暂不做完整 outbox，需要至少定义 SQLite-backed pending intent + reconciliation posture。

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — v2.3 Async Task Platform stack additions, Redis/BullMQ posture, SQLite ledger recommendation.
- `.planning/research/FEATURES.md` — milestone framing, table stakes, differentiators, anti-features, real-job validation set.
- `.planning/research/ARCHITECTURE.md` — feature root, worker/bootstrap split, data flow, component boundaries, safe build order.
- `.planning/research/PITFALLS.md` — critical/moderate pitfalls, phase warnings, operational guardrails.
- `.planning/PROJECT.md` — current product constraints, active exclusions, single-main-direction milestone guidance.
- `.planning/MILESTONES.md` — v2.2 archived status and explicit deferment of broader RTPX-02 async worker slice.
- `.planning/STATE.md` — project ready for next milestone planning; v2.2 archived and deferred frontier list.
- Official BullMQ docs — queues, workers, connections, QueueEvents, retries, deduplication, job schedulers, production guidance.

### Secondary (MEDIUM confidence)
- bull-board ecosystem references — useful for understanding operator UI options, but not recommended as v2.3 headline surface.

---
*Research completed: 2026-05-18*  
*Ready for requirements definition and roadmap planning: yes*
