# ROADMAP

**Current milestone:** `v3.0 AI Native Educational OS Upgrade`
**Status:** 🚧 In progress
**Latest archive:** `.planning/milestones/v2.3-ROADMAP.md`
**Current requirements file:** `.planning/REQUIREMENTS.md`

## Overview

`v3.0` 第一阶段只做平台内核收口：先冻结 platform vocabulary 与 authoritative ownership，再建立统一 Command Bus，随后把 action registry 与 plugin lifecycle 收进同一治理模型，补齐 platform event bus / observability hooks，最后暴露 machine-readable AI-native contracts。范围严格限制在 research summary 的 first-stage core；`v2.4` 仅作为冻结的历史 planning context，不自动继承为当前 milestone scope。

## Milestones

- 📋 **v3.0 AI Native Educational OS Upgrade** - Phases 50-54 planned.
- 🧊 **v2.4 Plugin Data Architecture & Default Plugins** - Phases 44-49 frozen as historical context; not current milestone scope.
- ✅ **v2.3 Async Task Platform** - Phase 39-43 archived 2026-05-20 with accepted gaps. See `.planning/milestones/v2.3-ROADMAP.md`.
- ✅ **v2.2 WebSocket Classroom Transport Cutover** - Phase 36-38 archived 2026-05-18. See `.planning/milestones/v2.2-ROADMAP.md`.
- ✅ **v2.1 Safety Closure and Course Membership Loop** - Phase 33-35 archived 2026-05-17.
- ✅ **v2.0 Runtime Platform Foundations** - Phase 27-32 archived 2026-05-17.
- ✅ **v1.3 Teaching Orchestration & Classroom Intelligence** - Phase 21-26 archived 2026-05-15.

## Phases

- [x] **Phase 50: Boundary Freeze & Platform Vocabulary** - 冻结第一阶段平台术语、authoritative ownership 与 deferred boundary。
- [x] **Phase 51: Command Bus Foundation** - 建立统一 command envelope、execution pipeline 与 durable command ledger。 (completed 2026-05-21)
- [x] **Phase 52: Action Registry & Plugin Lifecycle Governance** - 让 action catalog 与 plugin lifecycle 进入同一受治理模型，并关闭 verification gaps。 (completed 2026-05-21)
- [x] **Phase 53: Platform Event Bus & Execution Observability** - 为 command 结果建立 typed events、outbox truth 与 operator-visible execution summary。 (completed 2026-05-22)
- [ ] **Phase 54: AI-Native Contract Exposure** - 暴露 machine-readable commands/actions/capabilities 与 delegated actor contract。

## Phase Details

### Phase 50: Boundary Freeze & Platform Vocabulary
**Goal**: 平台维护者可以用单一 vocabulary 和单一 ownership map 理解第一阶段平台内核，并明确哪些高风险能力仍然 deferred。
**Depends on**: Nothing (milestone kickoff; v2.4 is frozen context only)
**Requirements**: BOUND-01, BOUND-02, BOUND-03, BOUND-04
**Success Criteria** (what must be TRUE):
  1. 平台维护者可以在文档与代码中清楚区分 `command`、`action`、`event`、`task`、`runtime transport`，不再混用术语。
  2. 平台维护者可以在 `platform-core` authoritative ownership 中直接定位命令执行、action 注册、lifecycle orchestration 与 event outbox 的归属。
  3. 系统边界会明确保留 SQLite + DAL 作为 canonical truth，并把 Redis、BullMQ、WebSocket 标记为 delivery / orchestration-only。
  4. QuickJS、Extension Host、PostgreSQL、Workflow Engine 等高风险能力会出现在正式 deferred 清单中，而不是被隐性带入 `v3.0` committed scope。
**Plans**: 3 plans

Plans:
- [x] 50-01-PLAN.md — Freeze vocabulary, canonical truth posture, and authoritative ownership map
- [x] 50-02-PLAN.md — Add minimal platform-core contract anchor and legacy seam posture notes
- [x] 50-03-PLAN.md — Publish named deferred wall and downstream handoff guardrails

### Phase 51: Command Bus Foundation
**Goal**: 平台调用方可以通过统一 Command Bus 提交和执行系统级 mutation，并获得可审计、可重试、可归因的结果记录。
**Depends on**: Phase 50
**Requirements**: CMD-01, CMD-02, CMD-03, CMD-04, CMD-05
**Success Criteria** (what must be TRUE):
  1. 平台调用方可以提交包含 `id`、`type`、`actor`、`scope`、`payload` 与 correlation metadata 的 `PlatformCommand`。
  2. 每个 command 都会经过统一的 `validate -> authorize -> execute -> record result` pipeline，而不是各走各的 service seam。
  3. 插件 lifecycle 核心动作如 `install`、`enable`、`disable`、`retry` 会通过 Command Bus v1 执行，而不是继续直连旧 action / service 路径。
  4. 每次 command 执行都会写入 durable command ledger，并保留 success / failure summary。
  5. 重复敏感 command 在提供 idempotency / dedupe key 时不会产生重复副作用。
**Plans**: 3 plans

Plans:
- [x] 51-01-PLAN.md — Add explicit command contracts, dual ledger schema, and pipeline shell for Command Bus v1
- [x] 51-02-PLAN.md — Implement explicit plugin governance handlers and tx-aware DAL integration on the command path
- [x] 51-03-PLAN.md — Migrate Server Actions, plugin host, and current non-UI producer seam to unified command producers

### Phase 52: Action Registry & Plugin Lifecycle Governance
**Goal**: 平台可以在同一治理模型下注册、发现、启停 built-in 与 plugin actions，并让插件生命周期状态、依赖和失败归因都可控。
**Depends on**: Phase 51
**Requirements**: ACTN-01, ACTN-02, ACTN-03, ACTN-04, ACTN-05, LIFE-01, LIFE-02, LIFE-03, LIFE-04, LIFE-05, LIFE-06
**Success Criteria** (what must be TRUE):
  1. 平台维护者可以为 built-in 与 plugin action 注册 typed descriptor，并在 action key 冲突时看到明确拒绝而不是静默覆盖。
  2. 平台调用方只能发现当前 lifecycle 条件满足的 action catalog；未安装、未启用、被挂起或依赖不满足的插件 action 不会暴露。
  3. 学校操作员可以区分 `installed`、`enabled`、`active`、`suspended`、`uninstalled` 状态，且 built-in / default plugins 复用同一 lifecycle model。
  4. 插件会按依赖顺序激活；缺依赖、循环依赖或激活失败时，系统会阻止半启动状态并归因到具体插件或模块。
  5. `disable`、`suspend` 与 `uninstall` 会体现不同治理语义：前两者停止运行能力但默认保留数据，卸载前会明确 retention / cleanup 影响。
**Plans**: 8 plans
**UI hint**: yes

Plans:
- **Wave 1** *(parallel)*
  - [x] 52-01-PLAN.md — Define typed action descriptor contracts and build the static descriptor source with duplicate-key rejection.
  - [x] 52-02-PLAN.md — Add external lifecycle governance projection, dependency ordering, failure attribution, and retain/cleanup semantics.
- **Wave 2** *(blocked on Wave 1 completion)*
  - [x] 52-03-PLAN.md — Wire executable catalog and governance diagnostics into host/server/UI surfaces, then add `verify:phase52`.
- **Wave 3** *(gap closure)*
  - [ ] 52-04-PLAN.md — Make retain/cleanup uninstall semantics, dependency ordering, and host recovery commands real on the mutation path.
- **Wave 4** *(blocked on Wave 3 completion)*
  - [ ] 52-05-PLAN.md — Rewire settings/operator UI to the unified governance read model and harden `verify:phase52` against UI drift.
- **Wave 5** *(gap closure, parallel)*
  - [ ] 52-06-PLAN.md — Project retain uninstall metadata into the governance read model so `uninstalled` becomes a real external lifecycle state.
  - [ ] 52-07-PLAN.md — Add executable `plugin.reconcile` recovery wiring across command bus, server actions, and host governance adapters.
- **Wave 6** *(blocked on Wave 5 completion)*
  - [ ] 52-08-PLAN.md — Wire operator diagnostics to explicit recovery commands and harden `verify:phase52` against `uninstalled` / `reconcile` drift.

Cross-cutting constraints:
- 主 action catalog 只暴露当前可执行 actions；blocked actions 只能在 operator/governance diagnostics 中可见。
- `src/server/plugins/registry.ts` 继续只是 static implementation catalog，不能恢复动态 authority。
- 恢复路径必须显式走 `enable` / `retry` / `resume` / `reconcile`，不得隐式 auto-recovery。

### Phase 53: Platform Event Bus & Execution Observability
**Goal**: 平台可以把 command 执行结果转化为 typed events、durable outbox truth 与最小 operator-visible observability，而不把事件系统变成新的真相源。
**Depends on**: Phase 52
**Requirements**: EVNT-01, EVNT-02, EVNT-03, EVNT-04, EVNT-05, EVNT-06, EVNT-07
**Success Criteria** (what must be TRUE):
  1. command 成功后会产生与 command envelope 分离的 typed platform event，并关联 `commandId`、`correlationId` 与 `causationId`。
  2. platform events 会写入 durable event outbox / ledger，作为插件、审计、分析和 future workflow / agent 的统一 after-fact 事实源。
  3. 平台订阅者可以消费 platform events，而不必复用 classroom runtime transport bus。
  4. 系统可以把 platform events 桥接到 in-process、Redis、WebSocket delivery adapters，同时继续由 SQLite 持有 canonical truth ownership。
  5. 入口层可以根据 command handler 返回的 invalidation intent 统一刷新缓存，并让操作员查看最小 command / event execution summary 与 failure attribution。
**Plans**: 4 plans
**UI hint**: yes

Plans:
- [x] 53-01-PLAN.md — Establish typed platform event contracts, independent SQLite event ledger/outbox truth, and command-summary carrying fields
- [x] 53-02-PLAN.md — Emit explicit generic/domain events on the command path and persist failure-safe event facts
- [x] 53-03-PLAN.md — Add persisted-event subscriber seam with an in-process adapter plus future Redis/WebSocket bridge contracts
- [x] 53-04-PLAN.md — Deliver command-first operator execution summary, event timeline, and `verify:phase53` regression gate

### Phase 54: AI-Native Contract Exposure
**Goal**: 平台调用方和未来 Agent 可以发现稳定的 machine-readable platform contracts，同时保持 delegated execution、capability boundary 与 v3.0 scope 的克制。
**Depends on**: Phase 53
**Requirements**: AINT-01, AINT-02, AINT-03, AINT-04, AINT-05
**Success Criteria** (what must be TRUE):
  1. 平台调用方可以列出 commands、actions、capabilities 的 machine-readable descriptors，而不是依赖人工文档或源码猜测。
  2. 每个 descriptor 都会声明 input schema、required capability、side-effect class、stability / version metadata。
  3. command、event 与 audit metadata 可以区分 human actor、system actor、plugin actor 与 delegated agent actor。
  4. delegated agent action 可以携带 delegation / approval metadata，不会默认继承高权限执行。
  5. `v3.0` 只交付 agent-callable contracts 与 future evolution seam，不要求完整 Agent Runtime / Skill Runtime 在本 milestone 一次落地。
**Plans**: 4 plans

Plans:
- [x] 54-01-PLAN.md — Define shared AI-native descriptor contracts and outward DTO shell for command/action/capability discovery
- [x] 54-02-PLAN.md — Project real command/action/capability descriptors into server-side registry and read-model APIs
- [x] 54-03-PLAN.md — Add delegated actor and approval metadata contracts without changing execution authority
- [ ] 54-04-PLAN.md — Add minimal discoverability surface and `verify:phase54` regression gate

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 50. Boundary Freeze & Platform Vocabulary | 3/3 | Completed | 2026-05-21 |
| 51. Command Bus Foundation | 3/3 | Complete   | 2026-05-21 |
| 52. Action Registry & Plugin Lifecycle Governance | 8/8 | Complete   | 2026-05-21 |
| 53. Platform Event Bus & Execution Observability | 4/4 | Complete | 2026-05-22 |
| 54. AI-Native Contract Exposure | 3/4 | In Progress|  |

## Frozen Historical Context

`v2.4 Plugin Data Architecture & Default Plugins`（Phases 44-49）保留为历史 planning input。它不是当前 milestone，也不会自动把未完成 scope 带入 `v3.0`；只有当 `v3.0` phase planning 证明某项能力是新架构的直接依赖时，才按最小必要原则吸收。
