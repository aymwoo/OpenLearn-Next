# Phase 43: Additional validation workloads and milestone proof - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定建立在 Phase 39-42 已完成的事实上：async platform 的 typed registry、durable
task ledger、独立 worker、QueueEvents projection、batch import 产品面、operator health/detail/retry
都已经存在。Phase 43 的职责不是继续补平台底座，也不是把 teacher 或 operator 产品面再做一轮
重构，而是把剩余三类真实 workload 接到同一 async contract 上，并用 milestone 级 proof 证明这
不是只为 batch import 定制的单任务通道。

Phase 43 只交付四类结果：

1. 把 scheduled reminders 接入 async platform，证明平台支持真正的 scheduled workload。
2. 把基于 `classroomEvents` 的 session summary / aggregation 后处理接入 async platform，
   证明平台支持 derived workload。
3. 把 resource `knowledgeSource` 的 RAG ingest / indexing 接入 async platform，证明平台
   能承载资源处理类后台任务。
4. 产出 milestone proof / coverage matrix，明确证明四类 task family 共享同一 registry、enqueue
   path、worker posture、operator visibility 与 result semantics。

本阶段不重开 classroom realtime 主链路，不把 Redis/BullMQ 提升为业务真相源，不新增第二套
teacher task center，也不把 reminder rule 保存、resource 编辑或课堂主写路径本身改造成 async。

</domain>

<decisions>
## Implementation Decisions

### Scheduled reminders workload
- **D-43-01:** reminder 规则的保存、修改与 planned dispatch 生成继续留在 `schedule/reminders`
  feature 内完成；Phase 43 只把真正的 delivery dispatch 接到 async platform。
- **D-43-02:** 一条 `scheduleReminderDispatch` 记录对应一条 async reminder task；不按 rule 聚合，
  也不按学校批次聚合。
- **D-43-03:** reminder delivery task 在 `scheduledFor` 到点时由系统自动创建/入队，用来证明
  Phase 43 的 scheduled workload，而不是只把失败后的手动 retry 任务化。
- **D-43-04:** `/teacher/schedule/reminders` 继续以 reminder rule 与 delivery list 作为主产品面；
  该页只展示基于 async task truth 映射出的 honest delivery 状态，不升级成通用任务中心。
- **D-43-05:** reminder delivery 的 retry / recovery 不再留在教师页；失败后的恢复动作只收口到
  operator 面，继续沿用 Phase 42 已建立的 recovery posture。

### Event post-processing workload
- **D-43-06:** Phase 43 的 event post-processing task family 固定以 `classroomEvents` 作为事件
  事实源，不挂到 runtime transport trace 或其他 infra-level event 流上。
- **D-43-07:** 这条 task family 的主要后处理产物固定为 session-level summary / aggregation，
  而不是异常告警优先，也不是纯 projection cache。
- **D-43-08:** `classroomEvents` 的 post-processing 同时支持两类触发：关键事件后的增量处理，
  以及课堂结束后的 finalize 处理；二者共同构成 Phase 43 的 derived workload proof。
- **D-43-09:** event post-processing 必须保持“derived write”语义：它可以生成课后摘要、聚合、
  recap 或等价派生产物，但不能反向改写 classroom realtime 主链路的 canonical truth。

### Resource processing workload
- **D-43-10:** Phase 43 的 resource processing 固定走 `RAG ingest / indexing` 路线，不做泛化
  的 resource metadata enrichment 或外链探测任务。
- **D-43-11:** 一条 async resource task 对应一个 `knowledgeSource`，而不是按 resource 粗粒度
  合并，也不在本阶段拆成 source ingest / chunk indexing 两个独立 task family。
- **D-43-12:** resource task 的 durable business truth 继续由 `knowledgeSources.status` 与
  `knowledgeChunks.indexingStatus` 承载；teacher 产品面继续优先展示这些业务状态，不直接任务化。
- **D-43-13:** 只有 `ragEligible` 的资源才允许进入这条 async resource processing 链路；不借
  Phase 43 扩张新的资源处理入口或新的 eligibility 语义。

### Milestone proof and close posture
- **D-43-14:** Phase 43 的 milestone close 以“workload proof / coverage matrix”作为主证明
  形式，逐项证明 batch import、reminder delivery、classroom event summary、resource ingest
  这四类任务共享同一平台 contract。
- **D-43-15:** proof matrix 至少要覆盖三种 workload 类型：manual（batch import）、scheduled
  （reminders）、derived（classroom event summary / resource ingest）。
- **D-43-16:** proof 不只证明“任务跑起来”，还必须覆盖 registry、enqueue path、worker
  posture、durable truth、operator visibility、recovery/result semantics 这些平台级共性。

### the agent's Discretion
- reminder delivery task 在 registry 中最终落到 `featureArea: "schedule"` 还是
  `featureArea: "notifications"`，以及精确 `taskType` 命名，可由 planner 结合现有 registry 和
  reminder 边界做最小正确收敛；但一条 task 对应一条 `scheduleReminderDispatch` 的事实已锁定。
- `classroomEvents` 增量触发选取哪些事件类型作为首发关键事件，可由 planner 在
  `active_step_changed`、`lock_mode_changed`、`slide_changed`、`ended` 等现有事件里收敛；但
  “增量 + finalize 双触发”已锁定。
- session summary / aggregation 的具体落点可以是现有 recap/read model 的异步补写、
  独立 summary artifact，或等价派生聚合表；但不能回写课堂实时主事实。
- `knowledgeSource` task 内部如何组织 chunking 与 indexing 细节，可由 planner 在一个 task
  family 内部收敛；但 Phase 43 不再拆成第二个独立 task family。
- proof matrix 的精确文档名、表格结构与是否附带 focused verifier，可由 planner 根据现有
  `verify:phase*` / milestone close artifact 风格细化；但主证明形式必须保持为人工可读矩阵。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth
- `.planning/ROADMAP.md` — Phase 43 的正式 goal、requirements、success criteria 与 3 个 plan 槽位。
- `.planning/REQUIREMENTS.md` — `ATP-20`、`ATP-21`、`ATP-22`、`ATP-23` 的 requirement truth。
- `.planning/PROJECT.md` — v2.3 Async Task Platform 的总边界，以及 SQLite + DAL truth、
  不重开 classroom realtime 主链路等非协商约束。
- `.planning/STATE.md` — 当前 milestone / phase 状态，确认 Phase 42 已完成并准备推进 Phase 43。

### Locked upstream decisions
- `.planning/phases/39-async-contracts-and-durable-task-truth/39-CONTEXT.md` — async task
  durable truth、typed entityRef、visibility scope、honest enqueue posture 的平台契约。
- `.planning/phases/40-bullmq-infra-seam-and-worker-reliability-posture/40-CONTEXT.md` —
  独立 worker、QueueEvents durable projection、retry/idempotency/recovery posture 的平台边界。
- `.planning/phases/41-first-real-product-slice-batch-import-async-workflow/41-CONTEXT.md` —
  batch import 作为 manual workload 的产品面与单一事实页已经锁定。
- `.planning/phases/42-operator-visibility-and-recovery/42-CONTEXT.md` — operator health、
  task detail、safe retry 作为统一 operator recovery posture 已锁定。

### Reminder workload anchors
- `src/features/schedule/reminders/server.ts` — 当前 reminder rule 保存、planned dispatch 生成与
  retry dispatch 的同步写法；Phase 43 需要把 delivery dispatch 接到 async contract。
- `src/features/schedule/reminders/actions.ts` — reminder server action 边界与 tag invalidation 样板。
- `src/features/schedule/shared/dto/reminders.ts` — reminder rule / dispatch 的业务状态 vocabulary。
- `src/components/surfaces/schedule-reminder-surface.tsx` — teacher reminder center 的现有产品面，
  Phase 43 需要保持业务实体列表而非任务中心。
- `src/server/schedule/reminder-dispatch.ts` — 当前实际发送逻辑与 channel allowlist。

### Event post-processing anchors
- `src/db/schema.ts` — `classroomEvents` append-only event truth，以及 asyncTasks / asyncTaskEvents /
  asyncWorkerHeartbeats 的平台 schema。
- `src/lib/dal/classroom.ts` — `classroomEvents` 的写入点、session 级课堂事实与 recap 聚合入口。
- `src/features/runtime-platform/contracts/events.ts` — 现有 runtime / classroom 事件 vocabulary（如需关联）。

### Resource processing anchors
- `src/actions/resource-actions.ts` — 资源创建 / 更新 / `ragEligible` 切换的当前 action 边界。
- `src/lib/dal/resources.ts` — 资源业务 truth 与 `ragEligible` 持久化入口。
- `src/lib/dal/ai-rag.ts` — `registerKnowledgeSourceForResource()`、knowledge source / chunk metadata
  的现有半成品链路。
- `src/lib/dto/resource-ai.ts` — `KnowledgeSourceDTO` / `KnowledgeChunkDTO` 的业务状态 vocabulary。
- `src/server/rag/retrieval-boundary.ts` — retrieval 边界要求 `ragEligible=true` 的现有约束。
- `src/components/surfaces/library-surface.tsx` — 资源中心当前只展示业务状态，不直接展示 task 语义。

### Existing async platform anchors
- `src/features/async-tasks/server/registry.ts` — 当前 platform task family 注册入口与 recovery metadata。
- `src/features/async-tasks/server/enqueue.ts` — canonical enqueue seam。
- `src/features/async-tasks/infra/queue-events.ts` — runtime event 到 durable truth 的投影路径。
- `src/features/async-tasks/shared/contract.ts` — async task status / progress / result vocabulary。
- `src/lib/dal/async-tasks.ts` — actor/entity/detail 读取面。
- `src/lib/dal/async-task-operator.ts` — operator overview/detail read model，Phase 43 workload 也必须兼容。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/schedule/reminders/server.ts` 已经提供 `scheduleReminderDispatch` 这一条明确的
  delivery truth，Phase 43 可以直接把“每条 dispatch 对应一条 async task”挂上去，而不必重做
  reminder rule 业务模型。
- `src/components/surfaces/schedule-reminder-surface.tsx` 已经具备教师页 rule + delivery list 的
 产品承载面，适合继续复用，只需把状态映射切换到 async truth。
- `src/db/schema.ts` 里 `classroomEvents` 已经是 append-only event 流，天然适合作为 derived
  workload 的事件源。
- `src/lib/dal/ai-rag.ts`、`knowledgeSources`、`knowledgeChunks` 已经把 resource ingest/indexing
  的 durable business truth 做到一半，Phase 43 只需把 processing 真正迁到 async platform。
- `src/features/async-tasks/server/registry.ts` 当前已有 `platform.healthcheck` 与
  `course_import.apply_batch` 两个 task family，可直接作为 Phase 43 扩展更多 workload family 的命名与
  metadata 样板。

### Established Patterns
- teacher/staff-facing 页面继续围绕业务实体 truth 组织，而不是直接任务化；Phase 41 的 batch import
  和当前 reminder center 都已经验证了这一点。
- operator recovery 收口到 `/settings/labs/async-tasks` 这类统一 operator 面，而不是在每个 feature
  的业务页重复实现 retry；Phase 42 已经锁定了这一分层。
- async platform 持续坚持 `latest snapshot + append-only events` 的 durable truth 结构，新的 workload
  family 只应复用而非另起一套状态系统。
- derived workload 必须是“由已有事实派生”的异步任务，不能借 Phase 43 回头改写课堂实时主链路或其他
  业务主事实。

### Integration Points
- 需要在 `src/features/async-tasks/server/registry.ts` 与 worker processors 中新增至少三类
  task family：reminder delivery、classroom event summary、resource knowledge source ingest。
- 需要在 reminder feature 内补齐“到点自动入队”的边界，把 `scheduleReminderDispatch` 转成 async task
  实例，同时保留 teacher reminder center 的业务表面。
- 需要在 classroom event 写入或课后收口路径中接入 async enqueue，支撑“增量 + finalize”双触发。
- 需要在 resource / ai-rag 边界中把 `knowledgeSource.status=pending` 的后续 processing 真正交给
  worker，而不是停留在未完成的手工步骤。
- 需要新增 milestone proof artifact，把四类 task family 的平台共性做成统一 coverage matrix。

</code_context>

<specifics>
## Specific Ideas

- reminder delivery task 是真正的 scheduled workload：到点自动入队，而不是只把失败重试任务化。
- teacher reminder center 保持“规则 + 最近 delivery”业务视角，只把状态换成 async truth，不在教师页
  暴露通用 retry 或 operator recovery。
- classroom event post-processing 采用“关键事件增量处理 + ended 后 finalize”双触发，产出 session-level
  summary / aggregation。
- resource processing 固定围绕 `knowledgeSource` 做 RAG ingest / indexing，不把 Phase 43 扩成更泛的
  resource enrichment 平台。
- milestone close 的主 artifact 是一份人工可读的 workload proof / coverage matrix，明确 manual /
  scheduled / derived 三类 workload 都已经跑在同一平台 contract 上。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 43-Additional validation workloads and milestone proof*
*Context gathered: 2026-05-19*
