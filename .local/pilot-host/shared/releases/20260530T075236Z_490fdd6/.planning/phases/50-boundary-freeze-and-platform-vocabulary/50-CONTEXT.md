# Phase 50: Boundary Freeze & Platform Vocabulary - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只负责冻结 `v3.0` 第一阶段平台内核的 vocabulary、authoritative ownership map、canonical truth posture 与正式 deferred wall，
让后续 Phase 51-54 能在同一套术语和边界上推进。

Phase 50 的职责不是开始实现 Command Bus、Action Registry、Plugin Lifecycle、Platform Event Bus 或 AI contract 本身，
也不是重写现有 plugin/runtime/async 平台。它只定义这些能力后续必须依附的正式边界：谁是 authoritative layer、哪些入口未来必须进 command path、
哪些现有 seam 只能保留为 adapter、哪些 substrate 只能做 delivery/orchestration，以及哪些高风险能力明确不属于 `v3.0` committed scope。

本阶段固定建立在现有事实之上：`pluginRegistrations` / `pluginLifecycleTransitions` / `runtimeEventOutbox` / async task registry 已存在，
`plugin-actions.ts`、`lib/dal/plugins.ts`、`server/plugins/registry.ts`、runtime event seam 和 async task processors 仍各自持有一部分调度职责。
Phase 50 要做的是把这些现状重新标定到统一的 platform-core vocabulary 与 ownership map 下，而不是继续默认它们长期并存。

</domain>

<decisions>
## Implementation Decisions

### Ownership map
- **D-50-01:** `src/features/platform-core/` 被锁定为 `v3.0` 第一阶段平台内核的 authoritative orchestration layer，后续 command execution、action registry、plugin lifecycle orchestration、platform event outbox 都归属这里，而不是继续散落在 ad-hoc 文件中。
- **D-50-02:** `src/lib/dal/plugins.ts` 在 Phase 50 的正式角色被收敛为 plugin domain DAL：负责 SQLite transaction、read/write helpers、DTO shaping 与领域持久化辅助，不再被视为平台总调度器或 policy router。
- **D-50-03:** `src/server/plugins/registry.ts` 这类现有 registry/dispatch 文件只被定性为 static implementation catalog：保留受控代码实现与 built-in definition 映射，但 dynamic discoverability、lifecycle gating、conflict detection 不再归它 authoritative 持有。
- **D-50-04:** 现有 `runtimeEventOutbox` 与 runtime event bus 被正式锁定为 runtime-only seam，继续服务 `classroom-session-write-path` 与课堂实时 delivery；它们不是平台级 event truth，也不能被 Phase 53 直接升格成 platform event outbox。

### Command entry boundary
- **D-50-05:** `Server Actions`、`plugin host`、`async task processors` 都被正式定义为 future `PlatformCommand` producers；后续若这些入口触发 durable mutation，必须汇入统一 command boundary。
- **D-50-06:** 现有直调 `DAL` / registry / service 的 mutation 路径从 Phase 50 起统一降级为 adapter-only posture：短期可以转发和兼容，但不再被允许扩展为长期 authoritative seam。
- **D-50-07:** `PlatformCommand` producer 的定义覆盖同步和异步入口，不仅限于 UI 或 Next Server Actions；worker/host 不得被默认豁免出统一 execution boundary。

### Vocabulary split
- **D-50-08:** `command` 的正式语义锁定为 authoritative mutation request：它是统一的 durable mutation envelope，后续必须经过 `validate -> authorize -> execute -> record result` pipeline。
- **D-50-09:** `action` 的正式语义锁定为 discoverable capability unit：它是可注册、可发现、受 capability/lifecycle gating 的调用能力，不等于 durable mutation request 本身。
- **D-50-10:** `event` 的正式语义锁定为 command 成功后产生的 after-fact fact；event 不是 mutation request，也不是 canonical truth write entry。
- **D-50-11:** `task` 的正式语义锁定为 deferred execution / orchestration unit；BullMQ task family、queue job、attempt/recovery 都属于这一层，不等同于 command 或 event。
- **D-50-12:** `runtime transport` 的正式语义锁定为课堂实时 delivery mechanism，例如 WebSocket / runtime event bus；它不是 platform event bus，也不是 command bus，更不是 canonical truth。

### Deferred wall and substrate posture
- **D-50-13:** BullMQ、Redis、WebSocket 在 `v3.0` 第一阶段中被正式锁定为 delivery / orchestration substrate，只能承担 deferred execution、fanout、transport 等角色，不能升级为 canonical truth、command bus 或 platform event source。
- **D-50-14:** `v3.0` committed scope 外的高风险能力必须以 named hard exclusions 形式写进正式 deferred wall，而不是只写抽象的“暂不考虑”。
- **D-50-15:** 正式 deferred 清单至少包括：QuickJS sandbox、Extension Host、PostgreSQL / pgvector cutover、Workflow Engine / Temporal、full Agent Runtime / Skill Runtime、distributed event bus、event sourcing rewrite。

### the agent's Discretion
- `platform-core` 下的精确子目录命名可由 planner 在 `commands/`、`actions/`、`events/`、`plugins/`、`observability/` 等推荐结构内做最小正确收敛，但 authoritative ownership 归属不能回退到现有 ad-hoc 文件。
- future adapter 的具体落点可以由 planner 选择保留在现有 entrypoint 文件中，或抽成 `legacy-adapters` / thin wrapper helper；但 adapter-only posture 已锁定，不能再长成第二套入口体系。
- `platform event outbox`、`command ledger`、`activation snapshot` 的最终表名和 projection 名可由 planner 结合现有 schema 做最小 blast radius 命名统一，但 runtime outbox 与 platform outbox 的严格分层已锁定。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth
- `.planning/ROADMAP.md` — Phase 50 的正式 goal、requirements、success criteria 与 milestone boundary。
- `.planning/REQUIREMENTS.md` — `BOUND-01` 到 `BOUND-04` 的 requirement truth。
- `.planning/PROJECT.md` — `v3.0 AI Native Educational OS Upgrade` 的总目标，以及 SQLite-first、DAL-only、禁止插件任意代码执行等非协商约束。
- `.planning/STATE.md` — 当前 milestone / phase 状态与 planning handoff 上下文。

### Research decisions that lock this phase
- `.planning/research/SUMMARY.md` — 第一阶段平台内核的总收敛结论：先冻结边界，再做 command/action/lifecycle/event 核心 contract。
- `.planning/research/ARCHITECTURE.md` — 推荐的 `src/features/platform-core/` 模块落点、ownership 重划方式、build order 与 integration cautions。

### Locked upstream context
- `.planning/phases/44-plugin-identity-and-namespace-contract/44-CONTEXT.md` — `pluginKey`、`dbNamespace`、default plugin reconcile 已是正式 contract，不能在 v3.0 重新发明另一套插件身份语义。
- `.planning/phases/42-operator-visibility-and-recovery/42-CONTEXT.md` — operator/async 平台的可观测性与恢复能力必须保持 honest posture，不能把 operator surface 误当新的真相源。
- `.planning/phases/43-additional-validation-workloads-and-milestone-proof/43-CONTEXT.md` — async platform 已被锁定为 shared workload platform，但不是第二 durable truth，也不是新的 mutation authority。

### Current ownership anchors in code
- `src/actions/plugin-actions.ts` — 当前 plugin Server Actions 仍直调 plugin DAL，是后续 Command Bus adapter 化的直接入口样板。
- `src/lib/dal/plugins.ts` — 当前同时承担 plugin domain persistence、lifecycle transition、hook run 与部分治理/dispatch 逻辑，是本 phase 要重新定性的关键 ownership seam。
- `src/server/plugins/registry.ts` — 当前 built-in/plugin action allowlist 与 dispatch switch 的实现目录；Phase 50 将其锁定为 static implementation catalog，而非 future action authority。
- `src/features/runtime-platform/seams/event-bus/contract.ts` — runtime event bus 已明确标注 `classroom-session-write-path` ownership，是 runtime-only posture 的直接依据。
- `src/features/runtime-platform/seams/event-bus/default-adapter.ts` — 当前 runtime event delivery 默认 in-process，且显式声明“不转移 SQLite-backed truth ownership”。
- `src/features/async-tasks/server/registry.ts` — 现有 typed task registry 说明 task 是 execution/orchestration unit，而不是 command/event 的同义词。
- `src/features/async-tasks/server/enqueue.ts` — 当前 enqueue seam 展示了 BullMQ/queue 只是 deferred delivery path，不应升格为 durable truth authority。
- `src/db/schema.ts` — `runtimeEventOutbox`、`pluginRegistrations`、`pluginLifecycleTransitions` 的现有 durable anchors，为 Phase 50 的 ownership map 提供事实基础。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/async-tasks/server/registry.ts` 已经有 typed registry pattern，可复用为后续 `platform-core` contract/registry 的结构参考。
- `src/features/async-tasks/server/enqueue.ts` 已经把“持久化事实 + queue dispatch”分成两层，证明 delivery/orchestration substrate 与 SQLite truth 分层是仓库里的既有模式。
- `src/features/runtime-platform/seams/event-bus/contract.ts` 和 `default-adapter.ts` 已经显式写出了 runtime transport ownership posture，可直接作为 platform/runtime event 分层的命名参考。
- `src/lib/dal/plugins.ts` 已持有 plugin lifecycle transition、governance audit、install/reconcile 等真实领域行为，可在后续阶段被 `platform-core` handler 复用，而不是重写 plugin domain persistence。

### Established Patterns
- 项目已明确坚持 SQLite + DAL 作为 canonical truth；任何 queue、transport、subscriber 都只能围绕 durable truth 工作，不能倒置 ownership。
- 现有 runtime seam 已经把 `classroom-session-write-path` 写成 source of truth，这和本 phase 冻结 runtime-only posture 完全一致。
- 近期 phase 已经多次锁定“不要制造第二真相源”，因此 platform-core 只能统一 vocabulary 和 boundary，不能把 async/runtime substrate 重新包装成新 authority。
- plugin identity / namespace 已在 Phase 44 成为正式 contract，因此 v3.0 platform-core 必须消费这个已存在的 plugin truth，而不是再发明 built-in/plugin 双轨身份系统。

### Integration Points
- 需要在 `src/features/platform-core/` 下集中安放 future command bus、action metadata registry、lifecycle orchestrator、platform event outbox 与 observability seam 的 authoritative definitions。
- 需要把 `src/actions/plugin-actions.ts`、plugin host、async task processors 在后续 phases 里逐步改成 command producer 或 adapter，而不是继续直接调用散落的 DAL/service seam。
- 需要把 `src/server/plugins/registry.ts` 的 static implementation catalog 与 future dynamic action discoverability 分层，防止 built-in allowlist 长期冒充平台 action authority。
- 需要让 future `platform event outbox` 与现有 `runtimeEventOutbox` 平行存在但严格分层，避免 runtime transport 和 platform facts 混到同一账本语义里。

</code_context>

<specifics>
## Specific Ideas

- `platform-core` 是唯一 authoritative orchestration layer；现有 ad-hoc files 最多保留 adapter 或 static implementation 角色。
- future `PlatformCommand` producers 明确覆盖 `Server Actions`、`plugin host`、`async task processors` 三类入口，避免只收口 UI 而把 host/worker 留成长期旁路。
- vocabulary 固定为：`command = authoritative mutation request`、`action = discoverable capability unit`、`event = after-fact fact`、`task = deferred execution unit`、`runtime transport = delivery mechanism`。
- `runtimeEventOutbox` 与 runtime event bus 继续只服务 classroom/runtime transport，后续 Phase 53 必须新增独立 platform event outbox，而不是复用 runtime truth。
- deferred wall 要用点名式排除项，而不是宽泛表述，确保高风险能力不会被“顺手补一下”带进 `v3.0`。

</specifics>

<deferred>
## Deferred Ideas

- QuickJS sandbox / arbitrary plugin code execution — 明确不属于 `v3.0` committed scope。
- Extension Host / external process plugin runtime — 明确 deferred，不能作为 Phase 50-54 的隐含前提。
- PostgreSQL / pgvector cutover — 继续保持 SQLite-first，不在本 milestone 偷渡数据库升级。
- Workflow Engine / Temporal — deferred；Phase 51-54 只交付 command/action/event/lifecycle 核心 contract，不引入重型 orchestration framework。
- Full Agent Runtime / Skill Runtime — deferred；`v3.0` 只做到 machine-readable contract exposure 与 delegated metadata seam。
- Distributed event bus / event sourcing rewrite — deferred；平台只补 durable outbox / ledger，不做全系统事件溯源重写。

</deferred>

---

*Phase: 50-Boundary Freeze & Platform Vocabulary*
*Context gathered: 2026-05-21*
