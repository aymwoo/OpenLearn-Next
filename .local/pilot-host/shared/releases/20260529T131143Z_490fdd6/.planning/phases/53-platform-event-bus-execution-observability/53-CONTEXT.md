# Phase 53: Platform Event Bus & Execution Observability - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只负责把已有 Command Bus 的执行结果转成正式的 platform event contract：
typed platform events、独立的 durable platform event ledger / outbox，以及最小
operator-visible execution summary。

Phase 53 建立在 Phase 50-52 已锁定的 platform-core vocabulary、command boundary、
action/lifecycle governance 之上，目标是让 future plugin subscriber、audit、analysis、
workflow / agent consumer 可以消费 platform after-fact facts，而不必复用 classroom
runtime transport bus，也不把事件系统升格为新的 truth source。

本阶段不重做 Command Bus，不把 `runtimeEventOutbox` 复用成 platform event truth，
不把 Redis / WebSocket delivery 扩成新的 authoritative layer，也不提前交付完整
AI-native descriptor discovery surface。

</domain>

<decisions>
## Implementation Decisions

### Event model and payload shape
- **D-53-01:** Phase 53 采用双层事件模型：保留少量通用 platform outcome 事件，同时允许少量明确的领域事件并存。
- **D-53-02:** 通用事件承担跨 command 的统一订阅与审计入口；领域事件承担稳定业务语义，避免 future subscriber 只能反解 command summary。
- **D-53-03:** platform event payload 锁定为摘要型 payload，只携带稳定 summary 字段，例如资源标识、前后状态、reason code、failure attribution、少量 counters；详细对象继续回到 ledger/read model 查询。
- **D-53-04:** 失败 command 也要产生 platform event，但失败路径只写通用失败事件，不生成伪领域变更事件。

### Command ledger and platform event ledger relationship
- **D-53-05:** `platformCommands` 与 `platformCommandAttempts` 继续是 authoritative command request / attempt ledger，不承担 event truth 角色。
- **D-53-06:** Phase 53 必须新增独立的 platform event ledger / outbox，并通过 `commandId` 反向关联 command ledger，而不是把 event 数据塞回 command summary 字段。
- **D-53-07:** command 成功时，event 由 command handler 显式返回并落入独立 event ledger；不能由 bus 自动推导业务语义，也不能把 event ownership 下沉回 DAL helper。
- **D-53-08:** command 失败时，event ledger 只记录一条通用失败事件，关联 `commandId`、attempt/failure attribution 与 correlation metadata；领域事件只在成功事实真实发生时写入。

### Delivery adapters and truth ownership
- **D-53-09:** Phase 53 的第一版 delivery posture 先落 `in-process` subscriber + 明确的 adapter seam；Redis / WebSocket 只要求保留可扩展 bridge contract，不要求在本阶段做成完整产品级 delivery。
- **D-53-10:** `runtimeEventOutbox` 与 classroom runtime transport bus 继续保持 runtime-only posture；Phase 53 不得复用它们承载 platform event truth。
- **D-53-11:** platform event bridge 可以面向 future Redis / WebSocket adapter 暴露投递 seam，但 SQLite-owned platform event ledger 继续是唯一 platform event truth。

### Operator-visible observability
- **D-53-12:** 最小 operator-visible observability 采用“command 主表/摘要 + 关联 event timeline”的读模，而不是纯事件流视角。
- **D-53-13:** command summary 需要直接暴露 status、result summary、failure attribution，以及 handler 返回的 invalidation intent，方便 operator 先看执行结果，再下钻 event timeline。
- **D-53-14:** invalidation intent 在 Phase 53 保持 command execution outcome 的一部分，进入 command summary/read model；它可以被 event timeline 引用，但不单独扩成新的 noisy event family。

### the agent's Discretion
- 双层事件里具体保留哪些通用 event type 与哪些首批领域 event type，可由 planner 在“不让事件族膨胀”的前提下做最小正确收敛。
- 独立 platform event ledger 的精确表名、DTO 名、projection 名与目录拆分可由 planner 依据现有 `platformCommands` / `asyncTaskEvents` 命名习惯收敛。
- operator 读面最终落在独立 server read-model、现有 governance/operator surface 扩展，还是 platform-core observability projection，可由 planner 决定，只要继续保持 command-first summary + event timeline posture。
- in-process subscriber contract、future Redis/WebSocket adapter interface 的精确 API 形状可由 planner 收敛，但不得改变“first-phase only in-process delivery is sufficient”这一边界。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth and locked requirements
- `.planning/ROADMAP.md` — Phase 53 的正式 goal、requirements、success criteria，与 Phase 54 dependency。
- `.planning/REQUIREMENTS.md` — `EVNT-01` 到 `EVNT-07` 的 requirement truth，定义 typed events、durable event outbox、adapter bridge、invalidation intent 与 operator summary 目标。
- `.planning/PROJECT.md` — `v3.0` 平台升级 posture、SQLite-first、DAL-only、禁止把 delivery substrate 升格成 truth source 等硬约束。
- `.planning/STATE.md` — 当前 milestone 会话状态与 “Phase 52 complete, Phase 53 next” handoff。

### Locked upstream context
- `.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md` — 锁定 `command/action/event/task/runtime transport` vocabulary、`platform-core` ownership，以及 `runtimeEventOutbox` 只能是 runtime-only seam。
- `.planning/phases/51-command-bus-foundation/51-CONTEXT.md` — 锁定 command bus、dual-ledger command truth、producer migration boundary 与 invalidation intent 当前归属。
- `.planning/phases/52-action-registry-plugin-lifecycle-governance/52-CONTEXT.md` — 锁定 action/lifecycle governance、structured reason codes、operator diagnostics posture；Phase 53 的首批领域事件应建立在这些稳定语义上。

### Research and architecture direction
- `.planning/research/SUMMARY.md` — `v3.0` 第一阶段平台内核 build order，说明 Event Bus / Observability 应建立在 command/action/lifecycle core 之后。
- `.planning/research/ARCHITECTURE.md` — `src/features/platform-core/*` 作为 authoritative ownership layer 的推荐落点与 integration cautions。
- `openlearn_next_upgrade_plan.md` — 平台升级长线蓝图背景；仅在不冲突于已锁定 Phase 50-53 边界时作为背景参考。

### Current code ownership and integration anchors
- `src/features/platform-core/commands/contracts.ts` — 当前 `PlatformCommand`、correlation metadata、invalidation intent 的 typed contract。
- `src/features/platform-core/commands/bus.ts` — 现有 `validate -> authorize -> execute -> record result` pipeline，与 handler 返回 result/invalidation 的收口点。
- `src/features/platform-core/commands/producers/plugin-governance.ts` — 当前 command ledger store、producer correlation、command id / dedupe 生成逻辑；Phase 53 event 写入需围绕这一 authoritative path 扩展。
- `src/features/platform-core/commands/handlers/plugins.ts` — 现有 plugin governance handlers；Phase 53 首批领域事件应从这里显式声明，而不是在 bus 或 DAL 中隐式推导。
- `src/features/platform-core/actions/registry.ts` — 现有 executable catalog / blocked diagnostics / governance dashboard projection，可作为首批 operator summary 与领域事件 payload 的语义来源。
- `src/features/platform-core/plugins/governance-projection.ts` — 当前 lifecycle state、reason code、recovery attribution 的稳定投影来源。
- `src/actions/plugin-actions.ts` — 现有 Server Action producer adapter，说明 `updateTag()` 仍留在入口层；Phase 53 只需让 invalidation intent 更可观测，不改这条边界。
- `src/features/runtime-platform/host-actions/plugin-host.ts` — host action 也已统一进 command producer seam，说明 platform event emission 不能只覆盖 Server Action 路径。
- `src/db/schema.ts` — 当前 `platformCommands`、`platformCommandAttempts`、`runtimeEventOutbox`、`pluginActionAudits`、`governanceAudits` durable anchors；Phase 53 必须在此基础上新增独立 platform event ledger，而不是复用 runtime outbox。

### Comparable patterns already in repo
- `src/features/async-tasks/server/operator-read-model.ts` — 现有 operator-visible 主列表/详情读面基线。
- `src/features/async-tasks/infra/queue-events.ts` — 现有“主记录 + 事件时间线 + projection + cache invalidation”模式，可作为 platform execution observability 的结构参考，但不能照搬其 BullMQ truth posture。
- `src/features/runtime-platform/seams/event-bus/contract.ts` — runtime-only event bus ownership contract，提醒 Phase 53 必须新增 platform event seam 而不是混用 runtime bus。
- `src/features/runtime-platform/seams/event-bus/default-adapter.ts` — runtime in-process adapter 的最小 delivery shape，可作为 platform event in-process adapter 的接口参考，但不能共享 truth semantics。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/platform-core/commands/bus.ts`：已有清晰的 command dispatch pipeline，适合在 handler execution 结果上继续扩展 emitted events，而不是重开第二条 execution seam。
- `src/features/platform-core/commands/producers/plugin-governance.ts`：已经把 producer correlation、command id、dedupe 和 durable store 收口，适合作为 event-command linkage 的 authoritative anchoring point。
- `src/features/platform-core/actions/registry.ts`：已经有 machine-readable executable/blocked catalog 与 governance dashboard bundle，可直接为首批 platform domain events 和 operator summary 提供语义源。
- `src/features/platform-core/plugins/governance-projection.ts`：已把 lifecycle state、reason code、recommendedRecoveryAction、failure attribution 做成稳定 projection，适合作为摘要型领域 payload 原料。
- `src/features/async-tasks/infra/queue-events.ts` + `src/features/async-tasks/server/operator-read-model.ts`：已证明“durable 主记录 + timeline events + operator read model + cache invalidation”在仓库中是可接受模式。

### Established Patterns
- 平台层当前已锁定 `command = request truth`、`event = after-fact fact`；因此 Phase 53 必须保持 command ledger 与 event ledger 分离，而不是把两者揉成一个 summary store。
- 入口层继续负责 `updateTag()`，说明 invalidation intent 目前属于 command execution outcome，而不是 infrastructure delivery concern；Phase 53 只能让它变得更可见，不能把缓存 API 拉进 platform-core bus。
- `runtimeEventOutbox` 和 runtime event bus 已明确声明 `classroom-session-write-path` 为 truth owner，这直接排除了“顺手复用 runtime outbox 做 platform event truth”的路线。
- 项目已多次锁定 Redis/BullMQ/WebSocket 只能是 orchestration / delivery substrate；因此 platform event adapters 也必须服从“SQLite ledger first, adapters second”的 posture。
- operator 面当前更接近“summary first, timeline second”而不是 raw stream first；Phase 53 应延续这种认知模型，而不是迫使 operator 直接读 event stream。

### Integration Points
- `src/features/platform-core/events/*` 或等价目录：platform event contracts、ledger/outbox write path、subscriber seam 与 operator projection 的主落点。
- `src/features/platform-core/commands/contracts.ts` / `handlers/*`：需要为 handler execution 结果增加 emitted events contract，并保持 invalidation intent 继续同行返回。
- `src/features/platform-core/commands/producers/plugin-governance.ts`：需要连接 command ledger 与 future platform event ledger，确保 `commandId` / correlation metadata 一致。
- operator/governance surfaces：需要新增 command summary + event timeline 读面，复用现有治理 surface posture，而不是再造一套 transport-oriented dashboard。
- future Redis/WebSocket bridge seam：只需要接口和边界，为 Phase 54 或后续 phase 留演进点，不要求在 Phase 53 做完所有 delivery 接线。

</code_context>

<specifics>
## Specific Ideas

- 双层事件不是“多发事件越好”，而是保留一个稳定的通用订阅入口，再补极少数真正有业务语义的领域事件。
- 摘要型 payload 是硬意图：event ledger 应该像 durable notification fact，而不是第二数据库快照。
- 成功 command 才发领域事件；失败 command 只发通用失败事件，这样 future subscriber 不会把未发生的业务变化误当真。
- operator 面应该先让人看见 “哪条 command 做了什么、结果如何、是否需要缓存刷新、有哪些关联事件”，再决定是否下钻事件时间线。
- Phase 53 明确只要求 in-process delivery 可跑通，Redis / WebSocket bridge 保持 seam 即可，避免把 observability phase 拖回 transport 工程。

</specifics>

<deferred>
## Deferred Ideas

- 在 Phase 53 直接把 Redis / WebSocket platform event delivery 做成完整产品级 bridge —— 超出当前最小 blast radius，留给后续 phase。
- 把 `runtimeEventOutbox`、runtime event bus 或 classroom transport trace 升格成 platform event truth —— 明确不做。
- 为每种失败都引入成体系的领域失败事件族 —— 暂不做，避免事件语义膨胀。
- 把 invalidation intent 扩成独立 noisy event family，例如 `platform.cache.invalidation.requested` —— 当前不做，先保持 command summary 可观测即可。
- 把 operator 面重构成纯事件流控制台 —— 不在本阶段采用，继续保持 command-first summary posture。
- AI-native descriptor discovery、delegated metadata、agent-callable contract surface —— 属于 Phase 54，不提前吸入本 phase。

</deferred>

---

*Phase: 53-Platform Event Bus & Execution Observability*
*Context gathered: 2026-05-22*
