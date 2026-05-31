# Phase 55 Pilot Contract

本文件冻结 `v3.1` 的单校试点定义、真实样板链路、baseline truths、容量口径与 deferred wall；它是试点 contract，不是实现设计。

## Pilot Definition

v3.1 = single-school pilot production readiness (plugin-first)
sample plugin = classroom voting

`v3.1` 的目标是在既有课堂、插件、transport、async 与 platform baseline 上，交付一个可上线、可值守、可恢复的单校试点样板。
本 milestone 不是下一轮平台抽象升级，也不是“全平台生产化清单清仓”。

单校试点的验收重点是：
- 样板插件是否真实可用，而不是只存在于 descriptor、registry 或 demo surface。
- 课堂链路是否能从教师设计跑到学生完成，而不是只打通 authoring 或课堂展示的一半。
- operator/support 是否能定位、恢复、回退，而不是只能依赖研发临场处理。

## Sample Chain

teacher design -> publish -> launch -> student completion -> teacher/operator verification

这个样板链路在 `v3.1` 中具有唯一优先级，所有 committed work 都必须能回挂到它。

样板链路的正式含义是：
- 教师可以在 lesson editor 中配置课堂投票插件步骤。
- publish 会冻结课堂投票插件配置并执行 readiness / compatibility preflight。
- launch 会绑定正确的 published lesson snapshot 与 plugin runtime context。
- 学生可以在真实课堂中参与投票并提交结果。
- canonical progress / submission / evidence 会被正确写回。
- 教师与 operator 可以看到结果、失败原因与下一步动作。

不满足以上任一环节，不能称为“样板链路成立”。

## Baseline Truths

WebSocket-first classroom transport = existing baseline
optional Redis fanout = existing baseline
BullMQ worker + SQLite task ledger = existing baseline
SQLite + DAL = canonical truth
plugin lifecycle / command / event baseline = existing baseline

这些 baseline 在 `v3.1` 中必须被视为前提，而不是待先建设的基础设施。

它们的正式姿态是：
- WebSocket-first classroom transport 继续承载课堂实时交付；SSE 只作为 rollback surface。
- optional Redis fanout 继续作为 deploy-authoritative 的多实例 delivery 能力，不成为新的真相源。
- BullMQ worker 与 SQLite task ledger 继续承担 orchestration 与 deferred execution，不取代业务真相写路径。
- SQLite + DAL 继续持有所有 canonical state；transport、queue、fanout 都只能围绕它工作。
- plugin lifecycle / command / event baseline 继续作为样板插件接入和 operator 恢复的治理底座。

## Capacity Envelope

40 students per classroom
5 simultaneous classrooms

以上数字是 `v3.1` 的正式试点容量口径，不是建议值，也不是“理想情况下”的软目标。

这意味着：
- Phase 60 的 load gate 必须围绕这两个数字建立。
- degraded、retry、worker backlog、reconnect 与 operator recovery rehearsal 也必须围绕这个口径验证。
- 如果系统只能在低于此口径的条件下稳定工作，则 milestone 不能宣称完成单校试点生产可用。

## Deferred Wall

- multi-school / multi-tenant SaaS operations
- generic plugin marketplace and store workflow
- Agent Runtime / Skill Runtime expansion
- PostgreSQL / pgvector primary cutover
- Kubernetes / Helm / ArgoCD migration
- heavy observability platform migration (Prometheus / Grafana / Loki / ELK)
- realtime transport rewrite
- BullMQ / workflow engine rewrite

这些能力在 `v3.1` 中继续保持 deferred，不允许作为 prerequisite、scaffold、hidden fallback 或“顺手补上”的形式重新进入 committed scope。

## Anti-Smuggling Rule

No Phase 56-60 plan may reframe an existing baseline as missing foundation, or reintroduce deferred work as prerequisite for the classroom voting pilot.
