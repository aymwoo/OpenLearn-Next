# Phase 39: Async contracts and durable task truth - Research

**Researched:** 2026-05-18
**Status:** Ready for planning
**Confidence:** HIGH

## Executive Summary

Phase 39 不需要重新研究“是否要做 BullMQ 平台”，而是要把 milestone 已确定的
方向收敛成一个可执行的 first slice：先定义 `src/features/async-tasks` feature root、
typed registry、SQLite durable ledger/read model、以及 honest enqueue boundary，
暂时不引入 worker bootstrap、QueueEvents projector、retry/backoff runtime 语义或
operator recovery。

本阶段的关键不是接入 Redis/BullMQ 运行时，而是**先把业务 truth 定清楚**：

- 后台任务类型只能通过一个 typed registry 注册。
- 用户可见状态只能来自 SQLite ledger/read model，而不是 Redis/BullMQ job state。
- enqueue 语义必须是“先落 durable record + enqueue intent，再尝试 dispatch”。
- enqueue 失败必须保留诚实状态，不能回滚成“仿佛没有任务发生”。

研究与上游里程碑结论一致：这一步应作为 v2.3 的 contract foundation，后续
Phase 40-43 全部建立在它之上。

## Phase-Specific Findings

### 1. Feature root should be introduced now

Phase 39 应先落 `src/features/async-tasks` 作为单一 feature root，而不是把 contract、
schema、DAL、enqueue helper 分散到 `src/lib/*`、`src/server/*`、`src/actions/*`。

推荐首批结构：

```text
src/features/async-tasks/
  index.ts
  shared/
    contract.ts
    dto.ts
    metadata.ts
  server/
    registry.ts
    enqueue.ts
    status.ts
    mapper.ts
```

其中：

- `shared/contract.ts`：task type id、entityRef、visibilityScope、progress/result schema
- `shared/dto.ts`：产品/UI 读模型 DTO schema
- `server/registry.ts`：registry definition helpers + task definitions
- `server/enqueue.ts`：统一 enqueue orchestration seam
- `server/status.ts`：SQLite -> DTO 的 read model 组装

### 2. Registry must lock platform metadata, not only schemas

根据 CONTEXT 锁定决策，registry 不是只放 payload/progress/result schema；它至少还要包含：

- `taskType`
- `featureArea`
- `visibilityScope`
- `entityRefKind`
- `labelKey`
- `summaryKey`
- 预留但不锁定运行语义的 metadata 槽位（如 retry/idempotency/concurrency）

这意味着 Phase 39 的 registry contract 应先服务**平台与产品可见性**，而不是只服务 worker。

### 3. Ledger shape should follow existing repo truth patterns

当前仓库已有多处“latest snapshot + append-only history”模式：

- `runtimeStepStates` + `runtimeEventOutbox`
- `transportDeliveryAttempts` + `transportConsumerTraces`
- `courseImportBatch` + `courseImportRow`

因此 Phase 39 的 durable task truth 也应采用类似双层结构：

1. **Main task table**：承载当前/latest status、progress snapshot、result snapshot、actor/school/entity ownership
2. **Append-only task event table**：承载状态变化、dispatch attempt、progress update、terminal outcome 历史

研究建议的字段方向：

#### Main task table

- `id`
- `taskType`
- `featureArea`
- `status`
- `visibilityScope`
- `actorId`
- `schoolId`
- `entityType`
- `entityId`
- `entityLabel`
- `payloadJson`
- `latestProgressJson`
- `latestResultJson`
- `queueJobId`（nullable，后续 Phase 40 衔接）
- `enqueueIntentStatus`
- `createdAt` / `updatedAt` / `startedAt` / `completedAt`

#### Event table

- `id`
- `taskId`
- `eventType`
- `payloadJson`
- `createdAt`

其中 `eventType` 在 Phase 39 至少要能表达：

- task created
- dispatch requested / dispatching
- dispatch failed
- progress updated
- completed / partially_completed / failed

### 4. Honest enqueue vocabulary is part of the contract

这不是 Phase 40 的细节，而是 Phase 39 就必须锁住的 truth vocabulary。

平台状态不能只暴露 `queued/running/completed/failed`，因为在真正接 BullMQ 前后，
产品需要区分：

- durable record 已写入，但还没真正 dispatch
- 正在 dispatch
- dispatch 失败但任务仍需 reconciliation

因此 Phase 39 的 contract 应至少允许以下中间态之一：

- `pending_enqueue`
- `dispatching`
- `dispatch_failed`

最终枚举命名可收敛，但**这些语义不能丢**。

### 5. Enqueue boundary belongs to feature orchestrators, not DAL or UI

仓库现有稳定模式是：

- Server Action 做鉴权、输入 parse、结果封装
- DAL 做 truth write 与 DTO read model
- feature seam / orchestration 负责需要跨组件的业务编排

因此 Phase 39 的 enqueue boundary 应由 feature-level server orchestrator 调用：

`Server Action -> feature orchestrator -> durable task record + enqueue intent`

不能出现：

- UI / route 直接 import queue client
- DAL 直接承担 Queue.add
- Redis/BullMQ job state 直接成为 DTO source

### 6. Cache invalidation must be planned, even if Phase 39 only seeds the foundation

虽然 Phase 39 还不跑真实 worker，但一旦引入 task list / task detail 读模型，就需要显式缓存边界。

建议在 `src/lib/cache-policy.ts` 中新增 async task 相关 tags，例如：

- `asyncTask: (taskId) => ...`
- `asyncTaskList: (actorId) => ...`
- `asyncTaskEntity: (entityType, entityId) => ...`

并在 enqueue seam / task status write path 中使用 `updateTag()`。这能避免后续
Phase 40-43 再补“第二套 freshness vocabulary”。

## Constraints Carried into Planning

### Must implement exactly per user decisions

- **D-39-01 / D-39-02 / D-39-04**：主记录必须显式存 actor/school/task/entity visibility truth
- **D-39-05 / D-39-06 / D-39-08**：progress/result contract 必须结构化，并支持 partial success
- **D-39-07**：durable truth 必须是 latest snapshot + append-only history 双层模型
- **D-39-09 / D-39-10 / D-39-11 / D-39-12**：先写 ledger + intent，再诚实 dispatch；失败保留 reconciliation posture；seam 只给 feature orchestrator 调用
- **D-39-13 / D-39-14 / D-39-15**：registry 必须携带 platform metadata，且 visibility/entityRef kind 为必填

### Must not appear in plans

以下内容明确属于 deferred / later phase：

- worker bootstrap
- QueueEvents projector
- retry/backoff execution semantics
- idempotency enforcement runtime
- operator retry/manage/recover action semantics
- batch import 真正迁移到 async path
- Redis/BullMQ 作为 product status primary truth

## Codebase Patterns to Reuse

### Pattern 1: Zod-first contract modules

参考：

- `src/features/runtime-platform/seams/transport/contract.ts`
- `src/lib/dto/course-import.ts`

可直接复用的做法：

- schema 与 inferred type 同文件导出
- enum vocabulary 明确而不是 stringly typed comments
- UI/DAL 均只消费 parse 后 DTO

### Pattern 2: DAL read model with cache tags

参考：

- `src/lib/dal/course-import.ts`
- `src/lib/dal/system-transport-settings.ts`

可直接复用的做法：

- `"use cache"` + `cacheLife()` + `cacheTag()`
- get/read helpers 统一 parse DTO
- toIso / summary builder 等 mapper functions 在 DAL 层集中处理

### Pattern 3: Honest delivery/write seam

参考：

- `src/features/runtime-platform/seams/transport/gateway.ts`

可直接复用的做法：

- 先写 durable attempt row，再做 delivery attempted
- failure 要持久化为 inspectable posture
- primary truth 与 delivery substrate 明确分层

### Pattern 4: Phase verifier = static guards + focused suites

参考：

- `scripts/verify-phase15-course-import.ts`
- `scripts/verify-phase37-redis-fanout.ts`

Phase 39 后续验证脚本应沿用：

- 静态 token/source guard
- focused Vitest suites
- 必要时串 `pnpm typecheck`

## Planning Implications

Phase 39 最自然的 3-plan 拆分与 ROADMAP 当前槽位一致：

1. **Contract-first plan**：建 `src/features/async-tasks` root、registry helpers、shared Zod contracts
2. **Schema + read model plan**：建 SQLite ledger/event schema、DTO、DAL read models、cache tags
3. **Enqueue seam plan**：建统一 enqueue orchestration、intent recording、Server Action/feature seam integration baseline

其中 plan dependency 应为：

- Plan 01 -> Plan 02 -> Plan 03

原因：

- Schema/read model 依赖 registry/contract vocabulary
- enqueue seam 依赖 contract + schema + status write/read API

Phase 39 不适合再拆成更多平行 plan，因为核心文件会高度重叠：

- `src/db/schema.ts`
- `src/lib/cache-policy.ts`
- `src/features/async-tasks/**`

## Verification Expectations for Planning

Planning 时应要求最终实现至少能通过下列验证路径：

- focused async-task contract tests
- focused async-task DAL/status tests
- schema validation / migration presence checks
- dedicated `verify:phase39` command registered in `package.json`

可接受的自动化命令示例：

- `pnpm test --run src/features/async-tasks/**/*.test.ts src/lib/dal/async-tasks.test.ts src/db/schema.learning.test.ts`
- `pnpm typecheck`
- `pnpm verify:phase39`

## Sources

- `.planning/phases/39-async-contracts-and-durable-task-truth/39-CONTEXT.md`
- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/research/SUMMARY.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/FEATURES.md`
- `.planning/research/PITFALLS.md`
- `src/db/schema.ts`
- `src/lib/dal/course-import.ts`
- `src/lib/dto/course-import.ts`
- `src/actions/course-authoring-actions.ts`
- `src/lib/dal/system-transport-settings.ts`
- `src/lib/dal/runtime-inspector.ts`
- `src/features/runtime-platform/seams/transport/contract.ts`
- `src/features/runtime-platform/seams/transport/gateway.ts`
- Context7 `/taskforcesh/bullmq` docs for custom `jobId`, `QueueEvents`, retries, dedupe, scheduler, and idempotent jobs.

---

*Phase: 39-async-contracts-and-durable-task-truth*
*Research completed: 2026-05-18*
