# Phase 50 Deferred Wall

本文件把 `v3.0` 第一阶段明确排除的高风险能力逐项点名，防止后续 phase 以 prerequisite、scaffold、optional runtime 或 hidden fallback 的形式偷偷带入 committed scope。

## Named Hard Exclusions

- QuickJS sandbox
- Extension Host
- PostgreSQL / pgvector cutover
- Workflow Engine / Temporal
- full Agent Runtime / Skill Runtime
- distributed event bus
- event sourcing rewrite

## Why These Stay Deferred

这些能力都会把当前 milestone 从 boundary freeze + platform core contract 收口，拉向更重的 runtime、infra 或 architecture migration。`v3.0` 第一阶段只允许冻结 vocabulary、authoritative ownership、command/action/event/lifecycle/event outbox 的 future 落点，不允许顺手补上新的执行宿主、数据库拓扑、重型 workflow runtime 或全局事件重写。

QuickJS sandbox 与 Extension Host 会把插件安全模型升级为独立运行时工程；PostgreSQL / pgvector cutover 会直接破坏 SQLite-first 与 DAL canonical truth posture；Workflow Engine / Temporal、distributed event bus、event sourcing rewrite 会把 Phase 51-54 需要的最小 orchestration boundary提前膨胀成整套分布式基础设施；full Agent Runtime / Skill Runtime 则超出本 milestone 承诺的 machine-readable contracts 与 delegated metadata 范围。

## Anti-Smuggling Rule

No Phase 51-54 plan may introduce these capabilities as prerequisite, scaffold, optional runtime, or hidden fallback.
