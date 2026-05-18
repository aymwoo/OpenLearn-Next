# Domain Pitfalls

**Domain:** v2.3 Async Task Platform (BullMQ in existing Next.js monolith)  
**Researched:** 2026-05-18  
**Confidence:** HIGH for BullMQ/Redis operational risks and brownfield integration hazards; MEDIUM for final queue topology until milestone requirements are frozen.

## Critical Pitfalls

### Pitfall 1: 把异步队列变成新的业务真相源
**What goes wrong:** 业务状态先写 BullMQ/Redis，再由 worker “稍后补写” SQLite，导致页面、课堂、运营视角看到的状态不一致。  
**Why it happens:** 队列很容易被误当成“更灵活的事件总线”，团队把 reminder、import、post-processing 的异步需求一路扩大到核心写路径。  
**Consequences:** 读写后不一致、缓存失效时机错乱、失败重试造成重复副作用，甚至出现“Redis 里说做了，但 SQLite 没做成”。  
**Prevention:** 保持现有原则不变：**SQLite + DAL 仍是 durable truth**。同步请求先完成主事务，再 enqueue 派生任务。若任务依赖事务结果，优先用 **DB commit → outbox/enqueue** 模式，而不是“先发 job 再希望 DB 成功”。  
**Detection:** 出现“队列里成功但页面没更新”“重试后结果不同”“需要人工对账 Redis 和 SQLite”的征兆。

### Pitfall 2: worker 绕过 DAL / auth / DTO / cache 边界
**What goes wrong:** worker 直接 import DB client 或复用页面内部逻辑，跳过权限、DTO 清洗、tag invalidation、审计字段。  
**Why it happens:** 团队把 worker 当成“后台脚本”，而不是同样受架构约束的服务入口。  
**Consequences:** 权限模型分叉、缓存长期陈旧、系统账号写入不可追踪、未来 PostgreSQL/第二 runtime 演进更难。  
**Prevention:** 为 worker 建立独立的 **server-side application service** 层：worker 只能调用 DAL / domain service / typed command，不直接碰 UI helper 或裸 SQL。所有会改变主数据的 job handler 必须声明“写了哪些 tag，需要谁来失效/更新”。  
**Detection:** worker 代码出现 `db.`、直接 `update`/`insert`、直接 import `src/app/**`、写后没有任何 tag 更新记录。

### Pitfall 3: 没把 job 设计成可重试、可重复执行
**What goes wrong:** job 第一次半成功，重试时又重复发通知、重复导入、重复生成资源或重复写事件。  
**Why it happens:** BullMQ 是 **at least once** 最坏语义；stalled job、手工 retry、部署中断都会让 handler 被再次执行。BullMQ 官方也要求 job 设计为 idempotent。  
**Consequences:** 批量导入重复建记录、提醒消息重复发送、资源处理重复消耗 CPU/存储、运营侧需要人工清理。  
**Prevention:** 每类 job 都定义幂等键和副作用边界：  
- reminders：`recipient + template + dueSlot` 级别去重  
- batch imports：`importRunId + rowId` 级别去重  
- resource processing：`resourceId + processorVersion` 级别去重  
- event post-processing：`sourceEventId + projectionType` 级别去重  
结合 BullMQ 的 deduplication / stable `jobId` / 业务侧唯一约束，而不是只靠“希望不会重复”。  
**Detection:** 同一任务失败重试后产生多个通知、多个导入结果、多个资源产物。

### Pitfall 4: 把“用户请求必须马上完成”的事情误塞进队列
**What goes wrong:** enqueue 成功被当成“业务成功”，但真实结果要几秒甚至几分钟后才知道。  
**Why it happens:** 为了“平台化”把任何重一点的操作都异步化，没有区分用户感知语义。  
**Consequences:** 教师看到“导入成功”其实只是“已排队”；提醒配置看似保存成功却没真正生效；客服和产品口径混乱。  
**Prevention:** 明确三类语义：  
- **同步完成**：必须在请求内给出最终结果  
- **提交后异步**：请求只返回 `accepted/queued`，UI 必须有状态页/进度/失败反馈  
- **纯派生任务**：对用户无立即承诺  
不要把 classroom correctness、auth correctness、核心 publish correctness 放进异步队列。  
**Detection:** PRD 或接口文档里把“queued”写成“done”，或者前端没有 job status/失败面板。

### Pitfall 5: enqueue 与数据库事务脱节
**What goes wrong:** DB 成功但 job 没入队，或 job 入队了但对应记录并不存在/尚未提交。  
**Why it happens:** 在 Server Action 里顺手 `queue.add()`，但没有考虑事务顺序与失败恢复。  
**Consequences:** reminder 漏发、导入后处理漏跑、资源状态卡住在 `pending`、人工补偿复杂。  
**Prevention:** 采用统一模式：  
1. 事务内先写主记录和 job-intent/outbox；  
2. 事务提交后由 dispatcher 安全入队；  
3. dispatcher 失败要有重扫补偿。  
如果暂时不做完整 outbox，也至少要在 schema 里保留 `taskRun` / `pendingWork` 之类的 durable tracking，而不是只信 Redis。  
**Detection:** 线上出现“数据库说待处理，但队列里找不到 job”或“job 执行时查不到实体”。

### Pitfall 6: 把 Redis/BullMQ 运维要求当成“已有 ioredis 就够了”
**What goes wrong:** Redis 没开 AOF、`maxmemory-policy` 不是 `noeviction`、连接参数不区分 producer/worker。  
**Why it happens:** 团队已有 WebSocket/optional Redis fanout 经验，就误以为 BullMQ 只是再加几个 queue。  
**Consequences:** job key 被驱逐、队列状态损坏、worker 因连接参数不对而异常、请求侧在 Redis 挂掉时无限卡住。  
**Prevention:** 以 BullMQ 官方生产要求单独落配置：  
- Redis persistence 开启 AOF  
- `maxmemory-policy=noeviction`  
- producer 走 fail-fast 配置  
- worker 使用 `maxRetriesPerRequest: null`，并允许离线队列恢复  
- 不使用 ioredis `keyPrefix`  
把 queue Redis 与现有 realtime Redis capability 视为**同类基础设施，不是同一默认配置可直接复用**。  
**Detection:** BullMQ warning、job 丢失、连接恢复后 worker 不再消费、生产请求在 Redis 降级时长时间挂起。

### Pitfall 7: 在 web 进程、HMR、worker 进程之间职责不清
**What goes wrong:** 开发环境或生产多实例里重复启动 worker；Next dev/HMR 导致重复 consumer；web pod 吃掉 CPU 和内存。  
**Why it happens:** 想偷快把 worker 跟 Next server 放一起跑，却没有严格的启动边界。  
**Consequences:** job 重复消费、资源处理拖慢主站、排障时分不清哪个实例在工作。  
**Prevention:** 明确三类进程：  
- **web**：只接请求与 enqueue  
- **worker**：只消费 job  
- **scheduler/bootstrap**：只负责 repeat/scheduler 注册（如果需要）  
即使短期同仓库部署，也要用独立 entrypoint 和 env 开关，禁止 Next dev server 自动带起真实 worker。  
**Detection:** 本地开发每保存一次代码，job 消费次数增加；生产上 web 实例日志出现 worker lifecycle 日志。

### Pitfall 8: 没有 job 状态模型，只能靠 Redis 临时状态观察
**What goes wrong:** 前端、运营、客服无法可靠回答“这个导入现在到哪一步了、失败在哪、是否可重试”。  
**Why it happens:** 过度依赖 BullMQ dashboard 或 QueueEvents，没在主库保留业务可解释状态。  
**Consequences:** 用户体验差、审计困难、无法做失败补偿界面，也无法跟 Next cache/DAL 读模型对齐。  
**Prevention:** 对用户可见任务建立 SQLite 侧 `taskRuns` / `importRuns` / `resourceProcessingRuns` / `notificationRuns` 读模型，记录：状态、attempt、startedAt、finishedAt、errorSummary、initiator、subject entity。BullMQ 是执行引擎，不是最终产品态展示层。  
**Detection:** 只能去 Redis/Bull Board 查问题；应用数据库里没有任何任务执行历史。

## Moderate Pitfalls

### Pitfall 1: 提醒与定时任务的“时间语义”没先讲清楚
**What goes wrong:** cron/job scheduler 看似正确，但学校时区、夏令时、补课/改课、节假日、延迟消费导致提醒时间错位。  
**Prevention:** 不把“每分钟扫一次”当业务语义。先定义 reminder truth：基于哪个时区、哪个 dueAt、课程变更如何重算、错过窗口如何补发/跳过。对学校/班级维度的提醒优先保存**已计算的下一次触发时间**，而不是把所有业务规则藏在 cron 表达式里。

### Pitfall 2: 并发参数拍脑袋设置
**What goes wrong:** 资源处理类 CPU 重任务把单机打满；导入类 I/O 任务又因为并发太低跑得慢。  
**Prevention:** 按任务类型拆队列或至少拆 processor 配置：  
- reminders / post-processing：高并发 I/O 型  
- batch imports：中并发，受 DB 写入能力约束  
- resource processing：低并发甚至独立 worker，必要时用 sandboxed processor / separate process  
并为每类任务单独设 limiter、concurrency、timeout、attempt/backoff。

### Pitfall 3: 失败策略只有 retry，没有终态处置
**What goes wrong:** job 无限重试或反复人工 retry，却没有 dead-letter、人工干预入口和补偿流程。  
**Prevention:** 每类任务都定义：最大 attempts、backoff+jitter、何时转人工、何时标记永久失败、谁负责处理。对批量导入要支持“部分失败可继续”，不要让一个坏行卡死整批。

### Pitfall 4: 任务 payload 塞太多、还带敏感数据
**What goes wrong:** Redis 里存大对象和明文敏感信息；job 数据结构版本一改，旧 job 直接炸。  
**Prevention:** payload 只放最小引用和处理所需快照；敏感字段尽量不进 job，必要时加密。加 `schemaVersion`，worker 能处理旧版本或拒绝并标明原因。

### Pitfall 5: 缺少 cache invalidation 设计
**What goes wrong:** worker 改完数据库，教师/学生页面仍显示旧数据，因为现有 Next.js 16 显式缓存体系没有被异步写路径接入。  
**Prevention:** 在 milestone 设计期就写出 **async write → tags** 映射表。对不能直接 `updateTag()` 的跨进程场景，定义统一 revalidation channel 或“由 web 侧读取 durable state 时自然刷新”的读模型策略，不能靠“用户刷新页面就好了”。

### Pitfall 6: 缺少可观测性，只能看 completed/failed 数量
**What goes wrong:** 看得到 queue backlog，看不到哪一类任务、哪个租户、哪一步慢、哪个 handler 失败最多。  
**Prevention:** 每个 job 打上 `queueName`、`jobName`、`taskType`、`tenant/schoolId`、`entityId`、`attempt`、`traceId`。接入现有日志/trace 体系，至少能回答：入队速率、处理耗时、失败率、重试率、排队时长、stalled 数。

## Minor Pitfalls

### Pitfall 1: queue 命名和边界过粗
**What goes wrong:** 一个 `default` 队列塞满所有任务，优先级、限流、失败策略彼此污染。  
**Prevention:** 按执行特征而不是按“大家都异步”分队列，例如 `reminders`、`imports`、`resource-processing`、`event-projections`。

### Pitfall 2: 把 QueueEvents 当成业务审计日志
**What goes wrong:** 事件监听一丢，应用就失去任务历史。  
**Prevention:** QueueEvents 只用于运行时观测与辅助自动化；正式审计落 SQLite 读模型。

### Pitfall 3: 手工删 job 破坏 dedup 语义
**What goes wrong:** 为了清队列直接 remove job，结果 dedup key 提前失效，重复任务重新涌入。  
**Prevention:** 为运维提供受控“取消/重置”命令，而不是直接删 Redis 数据；理解 BullMQ dedup 文档里“manual deletion disables deduplication”的约束。

## Requirement-Scoping Pitfalls

### Pitfall 1: 把 milestone 做成“通用后台平台大一统”
**What goes wrong:** reminder、imports、event bus、resource pipeline、workflow engine、跨服务编排一次性全上。  
**Prevention:** v2.3 只交付**可复用 async task 平台最小片段**：统一 enqueue/worker contract、1-2 个 producer 模式、4 类已知任务接入、基础可观测性、失败补偿面。不要顺手扩成 BPM/temporal 替代品。

### Pitfall 2: 顺手把 PostgreSQL / realtime rewrite / AI expansion 一起拉进来
**What goes wrong:** 失败域叠加，任何问题都无法归因。  
**Prevention:** 严守 exclusions。BullMQ milestone 只解决 async execution，不借机改 durable DB truth、classroom transport truth 或 AI runtime breadth。

### Pitfall 3: 先追求“平台抽象漂亮”，后补真实用例
**What goes wrong:** 抽象出了 `TaskEngine`、`ExecutionGraph`、`JobCapability`，但 reminders/imports 仍没一个真闭环可上线。  
**Prevention:** 用真实用例倒逼接口：  
1. reminder scheduling  
2. batch import processing  
3. event post-processing  
4. resource processing  
抽象只服务这些 use case，不为未来未知任务过度设计。

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Queue contract design | 把 enqueue API 设计成可传任意 payload，后续难以审计和迁移 | 用 typed job schema + `schemaVersion` + minimal payload references |
| Producer integration in Server Actions | 请求已返回成功，但 job 实际未入队 | 用 DB-backed task intent/outbox + enqueue reconciliation |
| Worker service bootstrap | web/worker 混跑导致重复消费 | 独立 entrypoint、独立 deploy role、dev 环境禁真实 worker 自动启动 |
| Reminder scheduling | cron 语义替代业务语义，时区/改课错发漏发 | 持久化 nextDueAt + reschedule rules，不把所有规则塞进 cron |
| Batch imports | 单个坏数据阻塞整批、重试整批导致重复写 | 以 import run + row job / chunk job 建模，行级幂等与错误归档 |
| Event post-processing | 队列被误用为主业务写路径 | 仅处理 derived effects / projections，不负责 canonical truth writes |
| Resource processing | CPU 密集任务拖垮主站或其它 worker | 独立 queue/worker、低并发、必要时 sandboxed processor |
| Async writes and cache | worker 修改后页面陈旧 | 设计 tag invalidation / revalidation matrix，并对关键页面做 E2E proof |
| Failure handling | 只有 retry 没有人工补偿 | 为每类任务定义 permanent-fail、manual-retry、cancel、rebuild 流程 |
| Operations | Redis 没开 AOF/noeviction，worker 不优雅退出 | 生产前 checklist + startup validation + SIGTERM graceful shutdown |

## Sources

- `.planning/PROJECT.md` — 当前单体内平台化路线、SQLite durable truth、DAL/Server Actions/cache/runtime 边界、明确 exclusions。Confidence: HIGH.
- `.planning/MILESTONES.md` — `broader RTPX-02 async worker/BullMQ slice` 仍是 deferred frontier，说明本 milestone 必须独立控 scope。Confidence: HIGH.
- `.planning/STATE.md` — v2.2 刚归档，当前阶段应避免把更多 infra rewrite 重新捆绑。Confidence: HIGH.
- BullMQ official docs — Introduction, Connections, Going to production, Idempotent jobs, Deduplication, Retrying jobs, Graceful shutdown, Parallelism and Concurrency, Rate limiting, Job Schedulers. Accessed 2026-05-18. Confidence: HIGH.
- BullMQ docs note: workers require `maxRetriesPerRequest: null`; producers and workers should use different Redis connection behavior; Redis must use persistence and `maxmemory-policy=noeviction`; job handlers should be idempotent; graceful shutdown is required to minimize stalled jobs. Confidence: HIGH.
