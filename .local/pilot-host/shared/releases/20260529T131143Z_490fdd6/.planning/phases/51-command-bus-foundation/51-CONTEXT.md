# Phase 51: Command Bus Foundation - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只负责把平台级 mutation 收口到统一的 Command Bus v1，并以插件治理命令作为首批真实覆盖对象，交付统一 command envelope、执行 pipeline、durable command ledger 与 idempotency contract。

Phase 51 的完成标准不是继续讨论 vocabulary，也不是提前做 Dynamic Action Registry、Formal Plugin Lifecycle dependency graph、Platform Event Bus 或 AI discovery surface，而是让现有 plugin governance mutation 不再各走各的 DAL / service seam，而能通过单一 command boundary 执行、重试、归因和审计。

本阶段允许旧入口保留为 thin adapter，但不允许它们继续作为 authoritative mutation path 长期存在；同时也不把 runtime transport bus、BullMQ 或 `runtimeEventOutbox` 升格为 command truth。

</domain>

<decisions>
## Implementation Decisions

### Command surface
- **D-01:** Phase 51 的 v1 对外 command surface 采用显式命令集，而不是以泛化 `plugin.transition` 作为主入口。
- **D-02:** Phase 51 需要覆盖当前 plugin governance 的完整显式命令清单：`plugin.install`、`plugin.enable`、`plugin.disable`、`plugin.retry`、`plugin.suspend`、`plugin.resume`、`plugin.uninstall.preflight`、`plugin.uninstall`、`plugin.kill_switch.set`。
- **D-03:** `plugin.transition` 如果仍然存在，只能作为内部 adapter / helper seam，不能继续作为对外 primary command contract。

### Ledger and retry semantics
- **D-04:** durable command ledger 采用双层模型：稳定的 command 主记录 + 独立的 execution attempt 历史记录。
- **D-05:** `plugin.retry` 的语义锁定为“同一 command 的新 attempt”，而不是创建一个新的 business command。
- **D-06:** command 主记录承载 authoritative business intent、envelope、最终结果摘要与当前状态；attempt 记录承载每次执行的状态流转、失败归因、时间戳与重试历史。

### Idempotency and dedupe
- **D-07:** 幂等 / dedupe 在 Phase 51 只强制覆盖副作用敏感命令：`plugin.install`、`plugin.enable`、`plugin.disable`、`plugin.retry`、`plugin.suspend`、`plugin.resume`、`plugin.uninstall`、`plugin.kill_switch.set`；`plugin.uninstall.preflight` 不要求强制 dedupe。
- **D-08:** producer 可以显式传入 dedupe key；未传入时由系统按 command intent / target scope 生成兜底 key，保证 legacy adapter 也能迁移到统一 contract。
- **D-09:** dedupe 语义锁定在 command boundary，而不是下沉到 queue、worker 或 transport 层；同步与异步 producer 必须共享同一幂等规则。

### Producer migration boundary
- **D-10:** Phase 51 的真实接入完成线包括 plugin Server Actions、plugin host，以及会触发上述 plugin governance commands 的 worker / async producer；这些入口都必须通过 Command Bus dispatch，而不是继续直连旧 seam。
- **D-11:** 除了首批真实接入入口，本阶段还要补出 shared producer / adapter seam，给 future host / worker / agent entrypoints 预埋统一接线方式，防止后续新入口再创建 direct-DAL mutation path。
- **D-12:** 本阶段虽然要为 future producers 预埋统一入口，但实际 business command coverage 仍固定在 plugin governance family，不扩展到 lesson、runtime、workflow、AI 等新命令族。

### the agent's Discretion
- command / attempt ledger 的精确表名、DTO 名、status 枚举与 result summary 字段可由 planner 收敛，只要保持“双层 durable ledger + retry 追加 attempt”不变。
- `src/features/platform-core/commands/*` 下 bus、registry、handlers、producer helpers 的精确拆分粒度可由 planner 决定，只要 authoritative ownership 继续留在 `platform-core`。
- 旧 `plugin.transition`、现有 DAL helper、Server Action wrapper、worker entry adapter 的具体保留方式可由 planner 调整，只要它们不再暴露第二套 primary mutation contract。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth and locked boundary
- `.planning/ROADMAP.md` — Phase 51 的正式 goal、requirements、success criteria 与后续 phase dependency。
- `.planning/REQUIREMENTS.md` — `CMD-01` 到 `CMD-05` 的 requirement truth，定义 command envelope、pipeline、ledger 与 idempotency 目标。
- `.planning/PROJECT.md` — `v3.0` 当前 milestone posture、SQLite-first、DAL-only、no arbitrary code execution 等硬约束。
- `.planning/STATE.md` — 当前 milestone 状态与“Phase 50 已完成、Phase 51 ready to start”的 handoff。
- `.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md` — Phase 51 必须继承的 vocabulary、ownership map、adapter-only posture 与 deferred wall。

### Research and architecture direction
- `.planning/research/SUMMARY.md` — 第一阶段平台内核的收敛结论，明确 Phase 51 应先做 Command Bus Foundation，而不是平台重写。
- `.planning/research/ARCHITECTURE.md` — `platform-core` 模块建议、双层 ledger 方向、producer migration caution 与 build order。
- `openlearn_next_upgrade_plan.md` — v3.x 长线蓝图与 Command Bus 的原始产品动机；仅在不冲突于已锁定 Phase 50/51 边界时作为背景参考。

### Current code ownership and mutation seams
- `src/features/platform-core/contracts.ts` — 当前已落地的 platform-core contract anchor，定义 authoritative ownership vocabulary。
- `src/actions/plugin-actions.ts` — 当前 plugin Server Actions；后续应变成 Command Bus producer adapters，并继续在入口层执行 `updateTag()`。
- `src/lib/dal/plugins.ts` — 当前 plugin domain persistence、lifecycle transition、preflight、kill switch、audit helper 的主要聚合点；Phase 51 应复用这些 domain helpers，而不是重写 plugin persistence。
- `src/server/plugins/registry.ts` — 当前 static implementation catalog / allowlist；可继续作为 code-owned implementation catalog，但不是 command authority。
- `src/features/runtime-platform/host-actions/plugin-host.ts` — 当前 host action seam；Phase 51 必须防止它成长为绕过 Command Bus 的旁路入口。
- `src/features/async-tasks/server/registry.ts` — 现有 typed async task registry 模式，提供 future producer wiring 的结构参考。
- `src/features/async-tasks/server/enqueue.ts` — 现有 SQLite truth + queue dispatch 分层模式，说明 orchestration substrate 不应成为 mutation authority。

### Durable schema anchors
- `src/db/schema.ts` — 当前 `pluginRegistrations`、`pluginLifecycleTransitions`、`pluginActionAudits`、`governanceAudits`、`runtimeEventOutbox` 等 durable anchors；Phase 51 的 command ledger 需与这些现有表形成清晰边界。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/platform-core/contracts.ts`：已经有 `platform-core` authoritative ownership anchor，适合作为 Phase 51 Command Bus contracts 的根入口。
- `src/actions/plugin-actions.ts`：已集中所有主要 plugin governance Server Actions，并把 `updateTag()` 留在入口层，天然适合改成 producer adapter。
- `src/lib/dal/plugins.ts`：已具备 lifecycle transition matrix、uninstall preflight、kill switch、audit write helper、plugin identity / scope checks，是 command handlers 最该复用的 domain helper 集合。
- `src/features/async-tasks/server/registry.ts` + `src/features/async-tasks/server/enqueue.ts`：已证明“typed registry + SQLite durable record + queue dispatch 分层”模式可行，可作为 command/attempt ledger 和 future producer wiring 的结构参考。
- `src/db/schema.ts`：已有 append-only 审计与 transition 历史表，说明仓库已经接受“主记录 + 时间线/历史记录”的 durability 模式。

### Established Patterns
- 入口层先做 Zod parse / actor resolution，再调用 server-side helper，最后执行 `updateTag()`；Command Bus 应延续这一模式，而不是把缓存 API 拉进内核。
- SQLite + DAL 始终是唯一 durable truth；BullMQ、WebSocket、runtime transport 和 Redis 只做 orchestration / delivery。
- `runtimeEventOutbox` 与 `transportDeliveryAttempts` 已清楚分离“事实已写入”和“delivery 已尝试”的语义；Phase 51 的 command/attempt ledger 应沿用这种分层思路，而不是复用 runtime 表。
- 当前 `src/server/plugins/registry.ts` 仍是 static code-owned implementation catalog，说明 Phase 51 可以先复用现有实现，再通过 command handlers 收口执行边界，而不需要引入动态代码执行。

### Integration Points
- `src/features/platform-core/commands/*`：Command Bus、command registry、explicit plugin governance handlers、producer helpers 的新增主落点。
- `src/actions/plugin-actions.ts`：从 “Server Action -> DAL” 改为 “Server Action -> Command Bus -> domain helper”。
- `src/features/runtime-platform/host-actions/plugin-host.ts`：需要显式接入同一 command producer seam，避免 host action 成为旁路。
- async task / worker 入口：需要共享 command producer contract，至少让与 plugin governance family 相关的异步入口不再独立造 mutation seam，并为后续 producer 预埋统一接口。
- `src/db/schema.ts`：需要新增 command / attempt ledger durable tables，并考虑和现有审计 / correlation 字段的衔接。

</code_context>

<specifics>
## Specific Ideas

- v1 Command Bus 应首先表现为一条“插件治理命令平面”，而不是抽象到看不出业务意图的通用 transition API。
- `plugin.retry` 被视为同一 command identity 的新执行尝试，这使 operator 归因、幂等分析和最终结果读取都更直接。
- future producers 虽然暂不扩展新命令族，但应在本阶段获得统一 producer seam，避免后续 host / worker / agent 接入时再次产生 direct-DAL bypass。

</specifics>

<deferred>
## Deferred Ideas

- Dynamic Action Registry 的 discoverability、conflict detection 与 lifecycle-gated catalog —— 属于 Phase 52，不在 Phase 51 先行交付。
- Formal Plugin Lifecycle 的依赖排序、activation snapshot、failure isolation 全量模型 —— 属于 Phase 52 的正式治理范围。
- Platform Event Bus / platform event outbox、cache invalidation intent 的统一消费与 operator-visible event summary —— 属于 Phase 53。
- lesson / runtime / workflow / AI 等非 plugin governance command families —— 不纳入 Phase 51 的实际 command coverage。
- 把 `runtimeEventOutbox`、BullMQ 或 transport substrate 直接拿来充当 command ledger / command truth —— 明确不做。

</deferred>

---

*Phase: 51-Command Bus Foundation*
*Context gathered: 2026-05-21*
