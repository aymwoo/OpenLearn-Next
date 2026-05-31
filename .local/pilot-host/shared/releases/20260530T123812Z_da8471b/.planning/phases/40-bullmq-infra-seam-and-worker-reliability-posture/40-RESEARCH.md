# Phase 40: BullMQ infra seam and worker reliability posture - Research

**Researched:** 2026-05-18
**Status:** Ready for planning
**Confidence:** HIGH

## Executive Summary

Phase 40 不需要再研究“是否要用 BullMQ”或“是否要把 worker 从 web 分开”；这些在
v2.3 milestone research、ROADMAP、以及 Phase 39 的 deferred scope 中都已经固定。

本阶段真正要解决的是：在保持 SQLite + DAL 为 durable truth 的前提下，把
`enqueueAsyncTask()` 从“只写 durable intent”升级成真实的 BullMQ dispatch 平台，并且把
worker pickup、QueueEvents projection、retry/backoff、idempotency、graceful shutdown、
stalled recovery 这些运行时语义收敛到统一 seam 上。

研究结论很清楚：

- 需要 **独立 worker 进程**，不能把 consumer 混进 `server.ts` 或 Next dev/HMR。
- 需要 **BullMQ 专用 Redis connection factories**，producer/worker/QueueEvents 分离。
- 需要 **QueueEvents -> SQLite projector**，因为产品可见状态不能直接来自 Redis job state。
- 需要 **registry-driven reliability metadata**，否则 retry/backoff/idempotency 会退化成散落硬编码。
- 需要 **graceful shutdown + stalled honesty**，否则 ATP-08/09 无法被证明。

## Phase-Specific Findings

### 1. Dedicated worker process is non-negotiable

`server.ts` 当前只负责 Next HTTP server 与 WebSocket transport bootstrap，这条边界是正确的。
Phase 40 不能为了“省一个进程”把 BullMQ worker 并入 web 启动流程，否则会带来：

- dev/HMR 重复启动 worker
- web pod 与 worker pod 生命周期耦合
- job 重复消费难以定位
- 主站 CPU/内存被后台任务抢占

因此本阶段应新增独立 entrypoint，例如：

```text
src/server/workers/async-task-worker.ts
```

并在 `package.json` 中新增脚本，例如：

- `worker:dev`
- `worker:start`

### 2. BullMQ connections must be split by role

BullMQ 文档与现有仓库 Redis 经验都指向同一个结论：不能把 producer、worker、QueueEvents
当成“同一连接换个类名”。至少需要以下分层：

- **producer connection**：web request path 使用，fail-fast，避免 Redis 不可用时请求无限挂起
- **worker connection**：blocking 消费，`maxRetriesPerRequest: null`
- **QueueEvents connection**：独立 blocking 连接，监听全局 runtime events

另外：

- 不应直接复用 realtime fanout 的 publisher/subscriber 单例
- 不应使用 ioredis `keyPrefix`
- prefix/queueName 应由 BullMQ option/registry metadata 控制

### 3. QueueEvents is the right projection input, not the final truth

QueueEvents 可以稳定监听：

- `waiting`
- `active`
- `progress`
- `completed`
- `failed`
- `stalled`
- `deduplicated`

但这些事件本身不是产品审计日志。正确姿势是：

1. QueueEvents 作为 runtime signal source
2. projector 把 signal 映射成 SQLite `asyncTask` latest snapshot 更新
3. projector 同时追加 `asyncTaskEvent` 历史
4. DAL/read model 继续只读 SQLite DTO

也就是说，Phase 40 要交付的是 **runtime event projector**，不是“让 UI 直接读 BullMQ”。

### 4. Retry/backoff/idempotency belongs in registry metadata and helpers

Phase 39 的 registry 已经有 `reliability.queueName` metadata slot。Phase 40 最自然的推进是把它扩成：

- queueName
- attempts
- backoff
- deduplication/jobId strategy
- concurrency or execution boundary hints
- dead-letter / terminal failure posture summary

这样有几个好处：

- task type 的 runtime policy 可审计
- enqueue seam 与 worker bootstrap 能消费同一套 metadata
- Phase 41-43 新接 workload 时无需再发明每个任务自己的 retry 配置模型

本阶段不必一次性把所有未来策略都做满，但必须先把接口和最小 helper 固定住。

### 5. Stable job identity is the minimum idempotency seam

ATP-07 不要求 Phase 40 就完成所有业务幂等细节，但至少需要一个稳定平台入口：

- 使用 durable task id 作为 BullMQ `jobId`，或
- 使用 registry-driven `buildJobId()` / `buildDeduplicationKey()` helper

这样可以保证：

- queue 内不会因为重复 dispatch 意外生成多份同 task job
- retry / restart / reconciliation 有稳定映射
- later workload 可以在此基础上叠加业务唯一键

对 Phase 40 来说，先把 **平台级 stable job identity** 锁住就足够；更细粒度业务幂等留到真实 workload phase。

### 6. Graceful shutdown and stalled recovery must be explicit

BullMQ 官方建议在 shutdown 时调用 `worker.close()`，等待当前任务完成或失败；若未优雅退出，任务会按 stalled 语义恢复。

对 OpenLearn Next 来说，这意味着：

- worker bootstrap 需要显式注册 `SIGTERM` / `SIGINT`
- shutdown sequence 需要关闭 Worker、QueueEvents、queue handles、Redis connections
- stalled/recovery 状态需要投影到 durable task truth，而不是只依赖 BullMQ 内部自动恢复

如果没有这层 durable projection，ATP-08 就只能停留在“理论上 BullMQ 会恢复”，而不是系统可观察事实。

### 7. Attempt history likely needs dedicated storage or richer event payloads

ATP-09 要求“operators can inspect failure reasons, attempt history, and recovery posture later”。
现有 `asyncTaskEvent` 只有：

- `taskId`
- `eventType`
- `status`
- `payloadJson`

理论上可以把 attempt 信息塞进 `payloadJson`，但若要稳定支持后续 operator surfaces，研究更倾向于二选一：

1. **Minimal change**：继续用 `asyncTaskEvent`，但固定 attempt event vocabulary 与 payload schema
2. **Cleaner model**：新增 `asyncTaskAttempt` 表，latest/task history 各司其职

考虑“最小正确改动”原则，Phase 40 更适合先走方案 1，除非实现时发现查询/一致性明显别扭。

### 8. Platform healthcheck/noop task is enough for this phase

ROADMAP 已明确 Phase 40 不应接真实业务 workload，因此本阶段的验证任务只需要证明：

- queue add works
- worker pickup works
- QueueEvents projection works
- retry/backoff helper wiring works
- graceful shutdown / stalled posture has tests and source guards

现有 `platform.healthcheck` definition 很适合继续承载这个 proof，不需要新造业务任务。

## Constraints Carried into Planning

### Must implement exactly per roadmap and requirements

- **ATP-04:** worker 独立进程，与 web server 生命周期分离
- **ATP-05:** BullMQ runtime events 可回投到 durable ledger 和 DTO
- **ATP-06:** 每种 task type 可声明 retry/backoff/dead-letter posture
- **ATP-07:** 平台具备 stable job identity / idempotency seam
- **ATP-08:** shutdown/restart/stalled recovery 保持 honest status
- **ATP-09:** failure reason、attempt history、recovery posture 可 inspect
- **ATP-10:** worker 仍走 DAL/validation/cache discipline

### Must not appear in plans

以下内容属于 later phase，不应混入 Phase 40：

- batch import / reminder / resource processing 真 workload 接入
- operator dashboard / operator retry UI
- teacher/staff-visible async task 页面
- BullMQ 成为产品态直接数据源
- DAG / FlowProducer / broader async topology

## Codebase Patterns to Reuse

### Pattern 1: Capability-gated Redis connection factory

参考：`src/features/runtime-platform/seams/transport/redis-fanout-connection.ts`

可复用做法：

- `getEnvironmentCapability()` 返回 deploy/configured/URL posture
- 连接健康快照集中保存在模块级 state
- `attachConnectionObservers()` 统一监听 `connect/ready/error/close/end`
- 失败后重置 promise，允许后续安全重连

### Pattern 2: Degraded/recovery manager with explicit listeners

参考：`src/features/runtime-platform/seams/transport/redis-fanout-manager.ts`

可复用做法：

- listener attach 只做一次
- 维护 desired vs actual runtime subscription/connection state
- 通过 helper 记录 degraded / healthy posture
- recovery 逻辑不是“自动就好”，而是显式记录状态

### Pattern 3: Canonical seam over raw infra clients

参考：`src/features/async-tasks/server/enqueue.ts`

可复用做法：

- feature seam 是唯一对外入口
- 先 parse registry definition，再触发外部行为
- 成功/失败都回写 durable truth 和 cache tags

### Pattern 4: Verifier with source guard + focused suites

参考：`scripts/verify-phase37-redis-fanout.ts`、`scripts/verify-phase39-async-tasks.ts`

Phase 40 verifier 应继续采用：

- 检查 worker 不在 `server.ts` 启动
- 检查 action/DAL 不直接 import `bullmq`
- 检查 dedicated worker entry、QueueEvents projector、graceful shutdown token 存在
- 跑 focused async-task infra / worker / projector suites

## Planning Implications

Phase 40 与 roadmap 当前槽位一致，最自然的三计划拆分为：

1. **Infra + worker entry plan**：BullMQ 依赖、connection factory、queue/worker bootstrap、独立 worker scripts
2. **Projection + recovery plan**：QueueEvents projector、attempt/failure history、stalled/shutdown posture、graceful close
3. **Reliability + verification plan**：retry/backoff/idempotency helpers、minimal platform task processor、`verify:phase40`

依赖顺序：

- Plan 01 -> Plan 02 -> Plan 03

原因：

- projector 依赖 queue/worker runtime infrastructure
- reliability helpers 与 focused verification 依赖 projector 和 worker loop 已存在

## Verification Expectations for Planning

Planning 时应要求最终实现至少能通过下列验证路径：

- BullMQ infra factory tests
- worker bootstrap / graceful shutdown tests
- QueueEvents projector tests
- enqueue-to-worker minimal loop tests
- dedicated `verify:phase40`

可接受的自动化命令示例：

- `pnpm test --run src/features/async-tasks/infra/*.test.ts src/features/async-tasks/worker/*.test.ts`
- `pnpm verify:phase40`
- 视范围决定是否跑 `pnpm db:migrate`

## Sources

- `.planning/phases/40-bullmq-infra-seam-and-worker-reliability-posture/40-CONTEXT.md`
- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/research/SUMMARY.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`
- `.planning/phases/39-async-contracts-and-durable-task-truth/39-CONTEXT.md`
- `.planning/phases/39-async-contracts-and-durable-task-truth/39-RESEARCH.md`
- `.planning/phases/39-async-contracts-and-durable-task-truth/39-03-SUMMARY.md`
- `src/features/async-tasks/server/enqueue.ts`
- `src/features/async-tasks/server/registry.ts`
- `src/lib/dal/async-tasks.ts`
- `src/db/schema.ts`
- `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts`
- `src/features/runtime-platform/seams/transport/redis-fanout-manager.ts`
- `server.ts`
- `scripts/verify-phase37-redis-fanout.ts`
- Context7 `/taskforcesh/bullmq` docs for QueueEvents, separate connections, graceful shutdown, retries/backoff, and jobId/deduplication.

---

*Phase: 40-bullmq-infra-seam-and-worker-reliability-posture*
*Research completed: 2026-05-18*
