# Phase 40: BullMQ infra seam and worker reliability posture - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定建立在 Phase 39 已完成的事实上：`src/features/async-tasks` feature
root、typed registry、SQLite durable task ledger、DAL read model、以及 canonical
`enqueueAsyncTask()` 已存在。Phase 40 的职责不是再定义第二套 contract，而是在不改
业务主链路的前提下，把 **enqueue -> BullMQ -> worker -> QueueEvents -> SQLite
projection** 跑成一个真实可运行、可恢复、可验证的平台闭环。

Phase 40 只交付五类平台能力：

1. 建立 BullMQ 专用 Redis 连接工厂，以及 queue / worker / QueueEvents 的 infra seam，
   明确与现有 realtime Redis fanout 配置分离。
2. 建立独立 worker 进程入口与启动脚本，确保 web server 生命周期和后台消费生命周期完全分离。
3. 把 QueueEvents 与 worker runtime 事件回写到 SQLite durable truth，使 queued、running、retrying、completed、failed、stalled 等状态能被应用侧诚实观察。
4. 把 retry、backoff、idempotency、dead-letter/recovery posture 收敛到 task registry 与执行 helper，而不是散落在各 feature 或 route 中。
5. 用一个最小平台验证任务证明 runtime 闭环成立，但不在本阶段迁移 batch import、reminder 或 resource processing 真 workload。

本阶段不实现 teacher/staff 产品 surface、operator dashboard、operator retry UI，
也不把真实业务任务挂到 async platform。这些分别属于 Phase 41 和 Phase 42 的边界。

</domain>

<decisions>
## Implementation Decisions

### Worker lifecycle and process boundary
- **D-40-01:** worker 必须通过独立 entrypoint 启动，不能并入 `server.ts`、Next request lifecycle、或 dev HMR 自动副作用。
- **D-40-02:** `pnpm dev` / `pnpm start` 继续只跑 web app；Phase 40 只能新增 `worker:dev` / `worker:start` 之类脚本，不能替换主路径。
- **D-40-03:** worker bootstrap 需要显式 signal handling（至少 `SIGTERM` / `SIGINT`），并在 shutdown 时关闭 Worker、QueueEvents 和 Redis 连接，保持 stalled recovery 语义诚实。

### BullMQ infra seam and Redis posture
- **D-40-04:** BullMQ 连接工厂必须与 realtime fanout 连接分离，不能直接复用 `getRedisFanoutConnections()` 或其 publisher/subscriber 单例。
- **D-40-05:** BullMQ producer、worker、QueueEvents 使用分离连接策略：producer fail-fast；worker 与 QueueEvents 允许 blocking 并要求 `maxRetriesPerRequest: null`。
- **D-40-06:** 平台只允许通过 feature-root infra seam 创建 `Queue`、`Worker`、`QueueEvents`，业务代码与 server action 不直接 `new Queue()` / `new Worker()`。
- **D-40-07:** Phase 40 默认采用 `Queue + Worker + QueueEvents`，不引入 `FlowProducer`、scheduler graph 或更复杂拓扑。

### Durable projection and honest status
- **D-40-08:** 用户与 operator 可见状态继续以 SQLite 为主真相；BullMQ runtime 事件只负责投影回 `asyncTask` / `asyncTaskEvent`，不能让 UI 直接读 Redis/BullMQ job state。
- **D-40-09:** Phase 39 已有 `pending_enqueue` / `dispatching` / `dispatch_failed`；Phase 40 必须新增真实运行态 vocabulary，例如 `queued`、`running`、`retrying`、`completed`、`partially_completed`、`failed`、`stalled_recovery` 或等价语义。
- **D-40-10:** 每次 runtime 状态推进都必须同步更新主表 latest snapshot，并追加 append-only event；不能只写 event 不写 latest，也不能只写 latest 丢失历史。
- **D-40-11:** `queueJobId` 与 durable task id 的映射必须稳定存在；BullMQ job 命名与 queue 名只能来自 typed registry/reliability metadata，不允许 ad hoc 字符串。

### Retry, idempotency, and execution discipline
- **D-40-12:** retry、backoff、dead-letter posture 由 task definition/reliability metadata 显式声明，不能在 enqueue 处硬编码统一默认值后失去可见性。
- **D-40-13:** worker 执行必须走 server-side execution helper/DAL，不能直接裸写数据库；任何成功、失败、进度更新都必须经过 platform helper，带上 cache invalidation 责任。
- **D-40-14:** idempotency/deduplication 必须先以 stable `jobId` 或等价 job key 收口到 helper 层；真实业务级幂等细节可在 Phase 41 workload 中细化，但 Phase 40 先锁平台接口。
- **D-40-15:** stalled/restart/retry 都不能让任务“凭空消失”；即使 worker 中断，也必须保留 inspectable recovery posture 和 attempt history。

### the agent's Discretion
- BullMQ 相关模块最终命名可在 `src/features/async-tasks/infra/*` 与 `worker/*` 内适度收敛，但必须保留 connection factory、queue factory、QueueEvents projector、worker bootstrap 这些稳定职责。
- attempt history 既可通过扩展 `asyncTaskEvent` payload 先承载，也可新增专门 attempt table；由 planner 根据最小正确变更收敛，但必须满足 ATP-09 的 inspectable history 目标。
- 最小平台验证任务可继续使用 `platform.healthcheck` 或同义 noop/health task，但不能提前变成真实产品 workload。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth
- `.planning/ROADMAP.md` — Phase 40 的正式 goal、requirements、success criteria 与 3 个 plan 槽位。
- `.planning/REQUIREMENTS.md` — `ATP-04` 到 `ATP-10` 的 requirement truth。
- `.planning/PROJECT.md` — SQLite + DAL truth、Node runtime、explicit cache、独立 worker posture 等非协商约束。
- `.planning/STATE.md` — 当前 phase 已切到 40，Phase 39 已完成。

### Locked upstream decisions
- `.planning/phases/39-async-contracts-and-durable-task-truth/39-CONTEXT.md` — 已锁定 async task durable truth、honest enqueue posture、registry metadata 与 deferred scope。
- `.planning/phases/39-async-contracts-and-durable-task-truth/39-RESEARCH.md` — Phase 39 已明确 deferred 的 worker / QueueEvents / retry / idempotency 语义，现阶段需要接续而不是重开 contract。
- `.planning/phases/39-async-contracts-and-durable-task-truth/39-03-SUMMARY.md` — canonical enqueue seam 已存在，BullMQ runtime 接入明确 deferred 到 Phase 40。
- `.planning/phases/38-cutover-verification-fallback-and-operational-hardening/38-CONTEXT.md` — Redis 继续只是 delivery/execution substrate，不能升级为业务真相源。

### Existing code anchors to reuse
- `src/features/async-tasks/server/enqueue.ts` — Phase 39 canonical enqueue seam，Phase 40 要在其基础上接 BullMQ dispatch，而不是新开入口。
- `src/features/async-tasks/server/registry.ts` — typed registry 与 reliability metadata slot 的现有落点。
- `src/lib/dal/async-tasks.ts` — durable read model 与 cache tags 的现有输出边界。
- `src/db/schema.ts` — `asyncTasks` / `asyncTaskEvents` 现有字段、JSON 风格、index 风格。
- `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts` — Redis 连接 health snapshot、capability gating、observer attach 的现成模式。
- `src/features/runtime-platform/seams/transport/redis-fanout-manager.ts` — subscriber listener、degraded posture、恢复逻辑的仓库样板。
- `server.ts` — 当前 web-only 启动边界，明确不能混入 worker autorun。
- `scripts/verify-phase37-redis-fanout.ts` 与 `scripts/verify-phase39-async-tasks.ts` — static guard + focused suites verifier 的仓库标准写法。

### Research anchors for v2.3 async platform
- `.planning/research/SUMMARY.md` — BullMQ、独立 worker、QueueEvents projector、idempotent jobs 的总研究结论。
- `.planning/research/ARCHITECTURE.md` — `async-tasks` feature root、worker entry、BullMQ infra seam、data flow 的推荐形态。
- `.planning/research/PITFALLS.md` — truth drift、worker 绕过 DAL、idempotency、graceful shutdown、Redis 配置 等关键风险。
- Context7 `/taskforcesh/bullmq` — Queue、Worker、QueueEvents、graceful shutdown、retry/backoff、jobId/deduplication 官方示例。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/async-tasks/server/enqueue.ts` 已把 durable task record 与 append-only event 的 truth write 固定下来，Phase 40 只需要在成功 dispatch 后补 `queueJobId` 与 queued status，不必重写入口。
- `src/features/async-tasks/server/registry.ts` 已有 `reliability.queueName` 元数据位，可自然扩展 retry/backoff/idempotency 配置。
- `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts` 已展示 capability-based Redis factory、health snapshot、observer attach 的实现风格，适合复制到 BullMQ 连接工厂但保持完全独立。
- `src/features/runtime-platform/seams/transport/redis-fanout-manager.ts` 已展示 subscriber 监听、恢复 desired subscription、degraded 标记、append-only trace 的风格，可借鉴到 QueueEvents projector / stalled recovery posture。
- `server.ts` 目前纯 web server bootstrap，没有 signal handling 或 worker side effect，是 Phase 40 必须保留的正确边界。

### Established Patterns
- Redis capability 与连接状态要有明确 snapshot / degraded honesty，而不是只在日志里输出 error。
- feature seam/orchestrator 负责 truth write 与 external delivery coordination；server action 与 UI 不直接碰 infra client。
- verifier 采用静态 source guard + focused Vitest suite + 必要命令链的结构，不依赖笼统“跑全量”。

### Integration Points
- `src/features/async-tasks/index.ts` 需要在不破坏现有 public barrel 的前提下，逐步 re-export BullMQ infra / execution helper。
- `src/db/schema.ts` 很可能需要新增 attempt/recovery 字段或专门 attempt table，来承载 ATP-08/09。
- `package.json` 需要新增 worker 启动脚本与 `verify:phase40`。
- `scripts/prepare-dev-db.ts` 与 migration metadata 可能要在新增 Phase 40 schema 后继续保持 migration-first 可执行。

</code_context>

<specifics>
## Specific Ideas

- BullMQ 连接 factory 至少导出 environment capability、instance id、producer connection、worker connection、QueueEvents connection、health snapshot。
- canonical enqueue seam 在 durable row 创建后，调用 queue helper 执行 `Queue.add()`，并以 stable durable task id / idempotency key 作为 `jobId` 或 dedupe identity。
- QueueEvents projector 需要监听 `waiting`、`active`、`progress`、`completed`、`failed`、`stalled`、必要时 `deduplicated`，并把其投影为 durable task status/event。
- worker bootstrap 需要注册 processors、worker event listeners、QueueEvents listeners、error handler、signal-based graceful shutdown。
- execution helper 要把 worker processor 的成功/失败/partial success 写回 durable truth，并承担 `updateTag()` 或等价 cache invalidation 责任。
- 最小验证任务只验证平台闭环：enqueue 后获得 `queueJobId`，worker 能 pickup，QueueEvents 能回写 queued/running/completed 或 failed，retry/backoff/idempotency helper 能被静态和 focused tests 证明。

</specifics>

<deferred>
## Deferred Ideas

- 把 batch import、scheduled reminders、resource processing 真 workload 迁到平台。
- 增加 teacher/staff 可见的 async task 产品 surface。
- 增加 operator dashboard、operator retry action、queue backlog surface。
- 引入 `FlowProducer`、复杂 DAG、独立 CPU-heavy worker pool、或 broader RTPX-02 async runtime 扩张。

</deferred>

---

*Phase: 40-bullmq-infra-seam-and-worker-reliability-posture*
*Context gathered: 2026-05-18*
