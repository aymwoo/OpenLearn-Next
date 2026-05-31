# Phase 39: Async contracts and durable task truth - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定建立在 v2.2 已关闭、v2.3 roadmap 已定义的事实上，目标不是提前交付
BullMQ worker、retry/recovery 或 operator recovery 全量能力，而是先把 async task
platform 的 durable truth 和统一 contract 定下来。

Phase 39 只交付四类基础能力：

1. 建立 `src/features/async-tasks` feature root，作为平台 contract、registry、enqueue
   seam 和 read model 的单一入口。
2. 建立 typed task registry，让每类后台任务都通过同一套 payload、progress、result
   contract 和平台 metadata 注册，而不是各 feature 自建 queue vocabulary。
3. 建立 SQLite task ledger、latest snapshot 与 append-only event history，确保任务状态、
   进度、结果和可见性都以应用内 durable truth 表达，而不是依赖 Redis 或 BullMQ 状态。
4. 建立统一 application enqueue boundary：所有异步任务都先写 durable task record 和
   enqueue intent，再由后续平台推进真正入队，不允许 UI、route 或 DAL 直接触碰 queue。

本阶段不实现独立 worker bootstrap、QueueEvents projector、retry/backoff 语义、
idempotency 执行细节、operator retry action，也不把 batch import 真正迁到 async path。
这些分别属于 Phase 40-42 的边界。

</domain>

<decisions>
## Implementation Decisions

### Task ownership and visibility
- **D-39-01:** task 主记录必须显式存储 `actorId`、`schoolId`、`taskType`、`featureArea`，
  不能只把这些信息隐含在 payload JSON 里。
- **D-39-02:** 任务目标对象统一走平台级 `typed entityRef`，至少包含
  `entityType + entityId`，可选携带轻量 `entityLabel`；不采用每类任务各自发散的对象字段。
- **D-39-03:** Phase 39 只锁定 `visibilityScope`，不提前锁定 retry/manage/recover
  action 权限语义；后者留到 Phase 42 的 operator recovery 再收口。
- **D-39-04:** 默认 visibility posture 为 `actor-owned`；registry 可声明特定任务额外对
  school operator 或 system 可见，但平台默认不做 school-wide 全公开。

### Progress and outcome contract
- **D-39-05:** progress contract 必须是 structured progress snapshot，而不是仅靠
  message string 或百分比；平台需要统一承载状态标签、计数、阶段信息等结构化字段。
- **D-39-06:** result contract 采用 `summary + outcome payload` 双层模型：平台层保留
  human-readable summary 和结构化 outcome 概览，任务类型可附带 typed result payload。
- **D-39-07:** durable truth 采用 `latest snapshot + append-only events` 双层持久化：
  主表承载最新状态/进度/结果快照，事件表承载状态变化与历史轨迹。
- **D-39-08:** partial success 是平台一等 outcome，不能被压缩成“成功”或“失败”二元语义。

### Enqueue honesty and orchestration seam
- **D-39-09:** 应用必须先写 durable task record 与 enqueue intent，再尝试真正派发；
  enqueue 不是唯一 truth 触发点。
- **D-39-10:** 产品面不得把“record 已创建”直接表述成“已经 queued”；平台需要显式支持
  `pending_enqueue` / `dispatching` 之类的中间态，保持 honest posture。
- **D-39-11:** 如果真正 enqueue 失败，任务记录不能删除或回滚成“仿佛没发生过”；
  必须保留为可 reconciliation 的诚实状态，例如 `dispatch_failed` 或同义状态。
- **D-39-12:** 统一 enqueue seam 只允许 feature server orchestrator 调用；
  Server Action 负责鉴权和输入解析后进入 orchestrator，DAL 不直接负责入队。

### Registry scope and metadata
- **D-39-13:** Phase 39 的 task registry 至少锁定 `taskType`、payload/progress/result
  schema、`featureArea`、`visibilityScope`、`entityRef` kind 以及产品侧 metadata。
- **D-39-14:** registry 承载稳定 `labelKey` / `summaryKey` 等文案键和最少元数据，
  但不把最终中文文案模板或 surface 文案组装逻辑塞进 registry。
- **D-39-15:** `visibilityScope` 和 `entityRef` kind 是所有 task type 的必填平台字段，
  不允许做成“有些任务有、有些任务没有”的可选扩展。
- **D-39-16:** retry、idempotency、concurrency 等 reliability metadata 可以在 registry
  中预留字段位，但本阶段不锁定其枚举、执行策略或运行语义，这些留给 Phase 40。

### the agent's Discretion
- async task 表、snapshot 表、event 表的精确命名，以及 snapshot 与 event 的字段拆分方式，
  可由 planner 根据现有 Drizzle schema 风格收敛。
- `pending_enqueue`、`dispatching`、`dispatch_failed` 的最终枚举命名，可由 planner 在
  保持 honest posture 的前提下收敛为一致 vocabulary。
- `labelKey` / `summaryKey` 的命名规范、DTO 组装层的 helper 组织方式，可由 planner 结合
  `course-import` 与 `runtime-inspector` 现有模式细化。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth
- `.planning/ROADMAP.md` — Phase 39 的正式 goal、requirements、success criteria 与 3 个 plan 槽位。
- `.planning/REQUIREMENTS.md` — `ATP-01`、`ATP-02`、`ATP-03` 的 requirement truth，以及
  v2.3 对 async platform 的总体边界。
- `.planning/PROJECT.md` — v2.3 milestone posture、out-of-scope 边界，以及
  “BullMQ/Redis 不是业务真相源”的总原则。
- `.planning/STATE.md` — 当前 milestone 状态、下一阶段指向与已累积的上游决定。

### Locked upstream decisions
- `.planning/phases/36-websocket-classroom-transport-cutover/36-CONTEXT.md` —
  WebSocket 交付层仍不拥有业务真相，delivery path 不能绕过 DAL。
- `.planning/phases/37-redis-fanout-and-multi-instance-delivery-convergence/37-CONTEXT.md` —
  Redis 继续只是 delivery capability，deploy authority 与 durable truth 分层的表达方式。
- `.planning/phases/38-cutover-verification-fallback-and-operational-hardening/38-CONTEXT.md` —
  v2.2 close 后固定的 truthful posture：SQLite + DAL 仍是 canonical truth。

### Existing code anchors to reuse
- `src/db/schema.ts` — 现有 Drizzle schema 风格，以及 `systemTransportSettings`、
  `courseImportBatch`、`courseImportRow` 等可复用的持久化组织方式。
- `src/lib/dal/course-import.ts` — batch/read-model 型 DAL 组织、summary 计算、
  durable DTO 返回模式。
- `src/lib/dto/course-import.ts` — 结构化 status、summary、result DTO 的现成 vocabulary。
- `src/actions/course-authoring-actions.ts` — Server Action -> validation -> DAL/orchestrator
  的现有边界模式。
- `src/lib/dal/system-transport-settings.ts` — 全局系统级配置真相源、actor 权限和 DTO 输出模式。
- `src/lib/dal/runtime-inspector.ts` — latest health + append-only timeline 的读取面模式。
- `src/features/runtime-platform/seams/transport/contract.ts` — 平台级 typed contract、
  ownership metadata 与 Zod schema 组织方式。
- `src/features/runtime-platform/seams/transport/gateway.ts` — 单一 orchestration seam、
  truth persisted 再 delivery attempted 的诚实语义。

### Research anchors for v2.3 async platform
- `.planning/research/SUMMARY.md` — v2.3 总研究结论、推荐数据流和边界失守风险。
- `.planning/research/ARCHITECTURE.md` — 建议的 `src/features/async-tasks` 结构、
  worker/ledger/enqueue seam 位置和系统级数据流。
- `.planning/research/FEATURES.md` — registry、progress、result、visibility、scheduled/event-driven
  task 等平台能力拆解。
- `.planning/research/PITFALLS.md` — batch import、幂等、重试和 brownfield async 平台常见失败模式。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/dal/course-import.ts`：已经体现“主记录 + 行记录 + summary/read model”模式，适合借鉴
  async task ledger + result summary 的分层组织。
- `src/lib/dto/course-import.ts`：已有 `status`、`summary`、`applySummary`、row result 的
  typed DTO vocabulary，可迁移为 task progress/result contract 的参考。
- `src/lib/dal/system-transport-settings.ts`：已经证明仓库可以维护单行全局系统配置表，并把
  deploy truth、actor 权限和 DTO 输出统一收口。
- `src/lib/dal/runtime-inspector.ts`：已存在“latest health + append-only timeline”读取模式，
  适合作为 async task detail / history read model 的前身。
- `src/features/runtime-platform/seams/transport/contract.ts`：展示了 feature root 内
  `contract.ts + zod schemas + type exports` 的稳定组织方式。
- `src/features/runtime-platform/seams/transport/gateway.ts`：已经有 canonical seam 和
  `truth persisted + delivery attempted` 的诚实编排语义，可直接迁移到 async enqueue 平台。

### Established Patterns
- durable truth 先落 SQLite，再向外部 execution/delivery substrate 推进，已经是项目固定模式；
  async tasks 必须延续，而不是让 BullMQ 成为主状态源。
- UI 不直接访问数据库，Server Action 不直接写复杂业务编排，feature orchestrator / DAL
  承载真相写入和 DTO 组织，这是当前仓库稳定边界。
- DTO 层倾向先定义 Zod schema 和稳定状态枚举，再由 DAL 输出 parse 后的 DTO；
  async task registry 和 ledger 也应遵循这条路径。
- append-only history + latest snapshot 在现有 runtime inspector 场景已经被验证可解释，
  不需要从 event sourcing 或纯 current-state 二选一重新发明模式。

### Integration Points
- `src/features/async-tasks/*` 将成为新 feature root，承接 registry、contract、enqueue seam、
  ledger DTO/read model 与后续 BullMQ seam。
- `src/db/schema.ts` 需要新增 async task 主表、snapshot/event/history 表，且遵循现有
  cascade / index / JSON 字段风格。
- `src/actions/*` 与未来 feature orchestrators 之间需要形成统一 enqueue 调用方式，
  避免 route/action 直接接触 queue client。
- Phase 41 的 batch import 会直接挂到本阶段定义的 entityRef、visibility、progress、
  result summary 和 pending-enqueue honest posture 上，因此这些 contract 必须先稳定。

</code_context>

<specifics>
## Specific Ideas

- task 主记录显式保留 `actorId`、`schoolId`、`taskType`、`featureArea`，而不是依赖 payload 反推。
- 目标对象采用统一 `typed entityRef`，避免 batch import、reminder、resource processing 各自发散。
- 平台默认 visibility scope 是 `actor-owned`，但 registry 可为 operator/system 扩展可见性。
- progress 必须是 structured snapshot，result 必须支持 `summary + outcome payload`。
- durable 形态为 `latest snapshot + append-only events`，并显式支持 partial success。
- enqueue posture 固定为“先写 ledger + intent，再诚实推进 dispatch”，产品面允许
  `pending_enqueue` / `dispatching`，失败保留 reconciliation posture。
- registry 先锁 contract + product metadata，文案只保留 key，不把最终文案模板塞入平台。
- retry / idempotency 只预留字段位，不在本阶段锁死执行语义。

</specifics>

<deferred>
## Deferred Ideas

- 在 Phase 39 就完整实现 worker bootstrap、QueueEvents projector、retry/backoff、
  idempotency enforcement 或 graceful shutdown。
- 在本阶段就把 operator retry/manage action 权限一并锁死。
- 把 registry 扩成 full workflow/DAG engine 或多 worker pool/concurrency fabric。
- 让 DAL 直接负责 enqueue，或让 BullMQ/Redis 成为用户可见状态的 primary truth。
- 在本阶段就把 batch import 真正迁移到 async execution path；这属于 Phase 41。

</deferred>

---

*Phase: 39-async-contracts-and-durable-task-truth*
*Context gathered: 2026-05-18*
