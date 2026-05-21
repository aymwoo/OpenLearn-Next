# Technology Stack — v3.0 Platform Core Phase 1

**Project:** OpenLearn Next  
**Researched:** 2026-05-21  
**Scope:** 只回答 v3.0 第一阶段平台内核升级：Command Bus、Dynamic Action Registry、Plugin Lifecycle、Event Bus，以及为后续 Agent / Skill / Capability / Observability 演进预留的低风险 stack 决策。

## Executive Decision

v3.0 phase 1 **不需要引入新的“大平台框架”**。正确路线是：

- 继续以 **Next.js 16 + Node runtime + Drizzle + SQLite + DAL** 为主骨架
- 在主仓库内新增 **typed platform core modules**，而不是上 Temporal / Kafka / Redis Streams / DI framework / sandbox runtime
- 把 **command、event、action、lifecycle** 做成清晰 contract + durable ledger + adapter seam

结论：**这是一次平台内核收口，不是基础设施重建。**

## 1. Recommended Libraries / Platform Primitives

### A. 必须新增或正式引入

| Addition | Version | Use In v3.0 Phase 1 | Why |
|---|---:|---|---|
| `@opentelemetry/api` | `^1.x` | command / event / action / lifecycle correlation span API | 现在先加 API 层最合适，能为后续 observability 留出标准 tracing seam，又不会把本阶段拖进 exporter / collector / infra 配置泥潭。 |
| Node `AsyncLocalStorage` | Node 20 built-in | correlationId / causationId / actor context propagation | Command Bus、Event Bus、plugin lifecycle 都需要贯穿一次执行链的上下文；直接用 Node 内建能力，避免额外依赖。 |

### B. 必须复用并上升为平台正式原语

| Reused Primitive | Current Version | v3.0 Role | Why |
|---|---:|---|---|
| `zod` | `^4.4.3` | command / event / action definition schema | 已是项目边界验证标准；继续作为 registry contract 的唯一 schema 语言。 |
| `drizzle-orm` + `drizzle-kit` | `^0.45.2` / `^0.31.10` | command ledger / event ledger / lifecycle persistence | 现有 migration 治理已成立；新增平台表必须继续走 Drizzle。 |
| SQLite / `@libsql/client` | `^0.17.3` | durable truth for commands/events | 项目已明确 SQLite-first；phase 1 不做 event infra 外置化。 |
| `bullmq` | `^5.76.10` | deferred / async command execution bridge only | 已有 async task platform。只在“命令需要异步执行”时复用，不替代 Command Bus 本身。 |
| `ioredis` | `^5.10.1` | optional event fanout adapter only | 已有 optional Redis posture。可作为非 durable delivery adapter，不能成为事实流真相源。 |
| existing WebSocket transport (`ws`) | `^8.20.1` | classroom/runtime event delivery edge | 已完成 cutover；Event Bus 只需桥接，不应重写实时主链路。 |

### C. 需要新增的内部平台原语（优先级高于加库）

| Internal Primitive | Backing Stack | Notes |
|---|---|---|
| `CommandDefinition` / `CommandHandler` registry | TypeScript + Zod | 统一插件、工作流、Agent、后台任务的执行边界。 |
| `ActionDefinition` registry | TypeScript + Zod + existing plugin manifests | 替换当前 hard-coded allowlist/switch 为声明式注册表。 |
| `PlatformEventDefinition` + publisher | TypeScript + Zod + SQLite ledger | Event 是事实，不是异步命令。 |
| `ExecutionContext` | AsyncLocalStorage + optional OTel API | 承载 `correlationId` / `causationId` / actor / school / plugin / command metadata。 |
| durable `platformCommand*` tables | Drizzle + SQLite | 记录 command receipt / validation / execution / result / failure。 |
| durable `platformEvent*` tables | Drizzle + SQLite | 记录 domain fact stream，供 replay / audit / future agent memory ingestion。 |

## 2. What Existing Stack Pieces Should Be Reused Instead of Replaced

| Existing Piece | Reuse Decision | Why |
|---|---|---|
| DAL-only data access | Keep | Command handlers 和 lifecycle handlers 仍必须调用 DAL，不允许绕过。 |
| `pluginRegistrations` + `pluginLifecycleTransitions` + `governanceAudits` + `pluginActionAudits` | Extend, don’t replace | 这些表已经构成 plugin governance baseline；v3.0 要在其上补 command/event 账本，而不是另起一套审计体系。 |
| current plugin manifest + lifecycle state model | Keep and formalize | 已有 installed/enabled/mounted/ready/... 状态，不应重做状态机。 |
| current runtime event contracts | Reuse naming/envelope discipline | 现有 runtime event envelope 已有 type、actor、delivery metadata，可作为平台事件 contract 设计参考。 |
| async task registry + enqueue boundary | Reuse as async execution backend | 某些 command handler 可选择 enqueue BullMQ，但“收到命令/鉴权/审计/发事实事件”仍应先在 Command Bus 完成。 |
| Redis + WebSocket degraded posture | Keep optional | phase 1 只桥接，不扩大其 truth ownership。 |

## 3. Concrete Stack Changes Needed in v3.0 Phase 1

### Recommended schema additions

| Addition | Why |
|---|---|
| `platformCommands` | durable command receipt + actor + target + payload + status + correlation metadata |
| `platformCommandAttempts` | 支持 retry / replay / deferred execution，而不污染单行 command record |
| `platformEvents` | durable fact stream，明确 command 与 event 分离 |
| optional `platformEventDeliveries` | 如需跟踪 websocket / redis / in-process 投递结果，可单独记录 delivery，不让 delivery 状态污染事实表 |

### Recommended package/config additions

- 新增 `@opentelemetry/api`
- 不新增 full telemetry exporter stack；先只埋 instrumentation seam
- 不新增新的 queue / event broker / DI framework

## 4. What NOT to Add in v3.0 Phase 1

| Do Not Add | Why Not Now |
|---|---|
| Temporal | 这是 workflow runtime，不是 phase 1 command boundary 所必需；会把里程碑重心从“收口 contract”变成“引入新平台”。 |
| Redis Streams / Kafka / NATS | 当前项目 durable truth 明确在 SQLite；这些 broker 会制造第二事实源。 |
| CQRS / event-sourcing framework | 现阶段需要的是项目内可控 contract，不是教科书式框架迁移。 |
| DI container (`inversify`, `awilix`, `tsyringe`) | phase 1 不需要容器；registry + explicit module wiring 足够，且更透明。 |
| QuickJS / `isolated-vm` / `vm2` / Extension Host | 项目已明确 deferred；与“无任意插件代码执行”约束冲突。 |
| PostgreSQL / pgvector | 不属于本阶段；也会破坏 SQLite-first 决策。 |
| Yjs / Lumino / Monaco | 来自长期蓝图，但与本阶段平台核心无直接关系。 |
| full `@opentelemetry/sdk-node` + exporters + collector rollout | 观测性会演进，但 phase 1 只需要 tracing API seam，不需要一次性上全套 infra。 |

## 5. Integration Notes Specific to This Codebase

### 5.1 Command Bus integration

- 新 Command Bus 应放在新的平台 feature root 中，**不要**散落到 `src/server/plugins/registry.ts` 或单个 DAL 文件里。
- 当前 `dispatchPluginAction()` 是 hard-coded switch；应重构为：
  `plugin manifest / built-in definition -> ActionDefinition registry -> Command Bus handler dispatch`
- Server Actions 不应直接做复杂平台逻辑；应改为：
  `Server Action -> commandBus.execute() -> DAL/async bridge -> emit platform event`

### 5.2 Event Bus integration

- 现有 `src/features/runtime-platform/seams/event-bus/default-adapter.ts` 只是 in-process adapter，可保留为默认 delivery adapter。
- v3.0 phase 1 应新增 **durable event ledger in SQLite**；in-process / websocket / redis 只负责 delivery。
- classroom/runtime 现有 websocket 事件不应被“平台 Event Bus”替代；正确做法是**桥接**：平台 event -> transport adapter。

### 5.3 Plugin lifecycle integration

- 复用现有 `pluginRegistrations.lifecycleState` 与 `pluginLifecycleTransitions`。
- 新 lifecycle service 负责 `register -> resolveDependencies -> activate -> running/ready -> deactivate -> dispose` 的 orchestration；
  但 phase 1 仍应保持 **no arbitrary plugin code execution**，所以 activate/deactivate 本质上是注册表装配、权限决策、可运行性切换，不是执行第三方 JS。

### 5.4 Async / deferred command integration

- 某些命令可在 handler 内进入 BullMQ：例如耗时导入、批处理、AI 生成。
- 但模式必须是：
  `accept command -> validate/authz/audit -> persist command -> optionally enqueue -> emit accepted/scheduled event`
- 不要让 BullMQ 直接变成“命令入口”。

### 5.5 Observability integration

- phase 1 先统一生成并传递：`commandId`、`correlationId`、`causationId`、`actorId`、`schoolId`、`pluginId?`
- 这些字段同时进入：command ledger、event ledger、governance audit、async task linkage
- OTel span 命名建议围绕：`command.execute`、`command.validate`、`command.authorize`、`event.publish`、`plugin.lifecycle.transition`

## 6. Key Risks / Tradeoffs

| Risk / Tradeoff | Impact | Mitigation |
|---|---|---|
| 把 Event Bus 直接建在 Redis/BullMQ 上 | 会引入第二事实源，违背当前 durable truth posture | 先 SQLite ledger，broker 只做 delivery/execution |
| 把 Command Bus 做成“又一个 service helper” | 仍然无法统一 Agent / plugin / workflow 执行边界 | 强制所有跨平台动作走 `commandBus.execute()` |
| 过早引入 DI / workflow / sandbox | 范围失控，phase 1 无法收口 | 保持 registry + explicit module wiring |
| lifecycle 设计过度面向未来 runtime | 会暗中引入任意代码执行预期 | phase 1 明确 lifecycle = registration/governance/run-state，不是 JS plugin runtime |
| command/event schema 设计太松 | 后续 agent-callable / replay / audit 都会变脆弱 | 所有 definition 必须用 Zod、显式 metadata、显式 actor/scope |
| observability 完全延期 | 以后很难补 causation chain | 至少现在补 `@opentelemetry/api` + AsyncLocalStorage context seam |

## Recommended Bottom Line

**v3.0 phase 1 stack新增很少，平台原语新增很多。**

最推荐的组合是：

1. **继续使用** Next.js 16 / Node / Drizzle / SQLite / DAL / Zod / BullMQ / ioredis / WebSocket
2. **新增** `@opentelemetry/api` + `AsyncLocalStorage` 作为 execution context / tracing seam
3. **新增内部平台层**：Command Bus、Action Registry、Event Ledger、Lifecycle Orchestrator
4. **明确禁止** Temporal、Redis Streams、Kafka、DI framework、QuickJS、PostgreSQL 等重型升级

这条路线最符合当前代码库：**低 blast radius、可审计、可演进、且不破坏既有 SQLite-first 与 DAL-only 纪律。**

## Sources

- `.planning/PROJECT.md` — v3.0 milestone constraints and validated baseline. Confidence: HIGH.
- `openlearn_next_upgrade_plan.md` — target platform direction; phase 1 scope filtered against current constraints. Confidence: HIGH.
- `package.json` — currently installed versions (`bullmq`, `ioredis`, `zod`, `drizzle-orm`, `ws`). Confidence: HIGH.
- `src/lib/dal/plugins.ts` — existing plugin lifecycle/governance/audit baseline. Confidence: HIGH.
- `src/db/schema.ts` — existing plugin lifecycle/audit tables already in SQLite truth path. Confidence: HIGH.
- `src/features/runtime-platform/seams/event-bus/default-adapter.ts` and `contract.ts` — current in-process event bus adapter posture. Confidence: HIGH.
- `src/features/async-tasks/server/enqueue.ts` and `server/registry.ts` — existing BullMQ-backed async execution boundary. Confidence: HIGH.
- Context7 CLI `/taskforcesh/bullmq` — QueueEvents, retries, jobId/idempotency patterns. Confidence: HIGH.
- Context7 CLI `/redis/ioredis/v5_4_0` — Pub/Sub and Streams capabilities; suitable as optional delivery adapter, not durable truth. Confidence: HIGH.
- Context7 CLI `/open-telemetry/opentelemetry-js` — tracing API, context propagation, AsyncLocalStorage context manager patterns. Confidence: HIGH.
