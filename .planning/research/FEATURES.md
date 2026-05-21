# Feature Landscape — v3.0 AI Native Educational OS Upgrade

**Milestone:** v3.0 first-stage platform core upgrade  
**Domain:** Brownfield AI-native platform kernel for an existing education app  
**Researched:** 2026-05-21  
**Confidence:** HIGH

## Scope Framing

这一轮不是“把 Agent Runtime 做出来”，而是把现有系统升级成一个**可被 Agent、插件、工作流共同调用的正式平台内核**。

成熟系统里的共同模式很明确：

- **VS Code**：command 是统一动作入口，activation/lifecycle 明确，避免扩展到处直接互调。
- **JupyterLab**：plugin 通过 token/service 和 activation ordering 协作，先注册扩展点，再初始化宿主。
- **Backstage**：extension point / module 明确区分“平台提供什么能力”和“扩展如何接入”，并要求先完成模块注册再启动插件。

对 OpenLearn Next 来说，第一阶段最有价值的不是新 runtime，而是先把下面五类 contract 做实：

1. Command Bus
2. Dynamic Action Registry
3. Formal Plugin Lifecycle
4. Event Bus（与 command 分离）
5. Agent / Skill / Observability future-proof platform contracts

---

## Category 1 — Command Bus

### 1. Table stakes

- 所有系统级可变更动作都必须有统一 command envelope：`id`、`type`、`actor`、`target scope`、`payload`、`causation/correlation`、`timestamp`。
- 执行链路固定为：**validate → authorize → execute → emit events → audit/result**。
- command handler 必须是**唯一 authoritative write boundary**；插件、workflow、未来 agent 都不能绕过它直写核心服务。
- command result 必须是 typed outcome，而不是散落的 boolean / throw-only 语义。
- 至少覆盖第一批高价值 command families：`plugin.*`、`lesson.*` 中真正需要平台化的动作、以及 future-safe 的 `ai.*`/`workflow.*` 命名位。

### 2. Differentiators worth doing now

- **Command metadata 可发现**：让未来 agent 能 `listCommands()`、看到描述、输入 schema、所需 capability、是否产生 side effects。
- **Idempotency / dedupe key**：对 install/enable/disable/retry 这类平台动作很值钱。
- **Audit-ready causation chain**：能把“教师触发 / 插件触发 / agent delegated”串起来。

### 3. Anti-features / defer

- 不做完整 event sourcing。
- 不做通用 undo/replay 引擎，只保留 command log / replay-ready metadata。
- 不把所有现有 service 一次性强行迁移；优先收口平台级动作和新增动作。
- 不引入跨进程命令总线或分布式 saga；当前单体内平台化足够。

### 4. Complexity / dependency notes

- 这是本 milestone 的 **P0**，其他几类都依赖它。
- 依赖 Zod/DTO、capability check、DAL write path、audit schema。
- 最大风险是“双轨执行”：新 command bus 和旧 ad-hoc action 同时长期存在。必须明确迁移名单。

---

## Category 2 — Dynamic Action Registry

### 1. Table stakes

- action registry 必须从 hard-coded built-ins 升级为**运行时可注册的 typed registry**。
- 每个 action 必须声明：`actionKey`、owner plugin、输入 schema、输出 schema、capability requirement、side-effect class、stability/version。
- registry 必须支持冲突检测，禁止相同 key 被静默覆盖。
- action 只能作为 **command handler 内部可调用能力** 或 command-dispatch target，不能变成新的绕过边界入口。

### 2. Differentiators worth doing now

- **Discoverability for planning**：支持列出 action catalog，给 future agent/tool router 用。
- **Scoped availability**：按 plugin enabled state、school install state、feature flag 暴露 action。
- **Built-in actions 与 plugin actions 同模型**：先消灭 built-in 特权通道。

### 3. Anti-features / defer

- 不做任意第三方远程 action 下载。
- 不做“用户自定义脚本即 action”。
- 不做过度通用的 low-code action composer；先保证 typed registry 清晰可靠。
- 不把 registry 直接做成 workflow engine。

### 4. Complexity / dependency notes

- 依赖 plugin identity、plugin enabled/install state、command bus dispatch contract。
- 与 capability security 强耦合；否则 action catalog 会变成安全漏洞目录。
- 首批只需要支持**注册、解析、校验、执行前鉴权、冲突报错、列举**。

---

## Category 3 — Formal Plugin Lifecycle

### 1. Table stakes

- lifecycle 至少要区分：`register`、`resolve dependencies`、`activate`、`running`、`deactivate`、`dispose`。
- install state 与 runtime state 必须分开：**installed ≠ enabled ≠ active**。
- lifecycle 必须有 dependency ordering；缺依赖插件不能半启动。
- 插件停用默认保留数据，卸载才进入数据清理/保留策略。
- 启动失败必须可归因到具体 plugin/module，而不是只表现为平台整体失败。

### 2. Differentiators worth doing now

- **Startup failure attribution**：参考 Backstage factory-style extension point 思路，把失败归因到模块/插件。
- **Kill switch / suspend posture**：出问题时可全局停用某插件但不伤主系统。
- **Built-in plugin 也走正式 lifecycle**：这是平台是否真实成立的试金石。

### 3. Anti-features / defer

- 不做 hot reload / live reload plugin runtime。
- 不做独立 extension host / multi-process isolation。
- 不做 sandbox execution；这属于后续阶段。
- 不做复杂 marketplace distribution protocol。

### 4. Complexity / dependency notes

- 依赖 plugin manifest contract、dependency graph、registry bootstrap。
- 需要和现有 plugin marketplace / governance audit 语义对齐，避免产品语义倒退。
- 生命周期设计过大最容易失控；v1 先保证**deterministic startup/stop semantics**。

---

## Category 4 — Event Bus (distinct from command execution)

### 1. Table stakes

- 明确区分：**command = 请求动作**，**event = 已发生事实**。
- event envelope 至少包含：`id`、`type`、`source`、`subject`、`payload`、`timestamp`、`causation/correlation`。
- command 成功后才能发 domain event；禁止把 event bus 当 command bus 用。
- 支持最小可用订阅模型：平台内插件监听、审计/分析监听、未来 workflow/agent 监听。
- 事件命名必须事实化：如 `plugin.enabled`、`plugin.disabled`、`command.failed`、`lesson.published`。

### 2. Differentiators worth doing now

- **Outbox-friendly contract**：即使现在先做进程内 event bus，也保留未来接 Redis/BullMQ/analytics pipeline 的演进位。
- **Typed event catalog**：给 observability、workflow、agent subscription 做统一入口。
- **Policy hooks on events**：允许后续 approval / notification / analytics 直接接入。

### 3. Anti-features / defer

- 不做全量 event sourcing 存储模型。
- 不做跨实例强一致事件系统。
- 不做实时协作总线重写；课堂 WebSocket 主链路不在本轮 blast radius。
- 不把 UI local events 和 platform domain events 混在一起。

### 4. Complexity / dependency notes

- 强依赖 command bus 的 causation metadata。
- 需要和现有 async task platform 对接，但不应被 BullMQ 反向绑架成“队列即事件总线”。
- 最容易犯的错是事件过细、过噪，导致后续 agent/workflow 难以消费。

---

## Category 5 — Future-proof Platform Contracts (Agent / Skill / Observability)

### 1. Table stakes

- 平台 contract 必须让未来能力**可发现、可校验、可授权、可审计**。
- 至少定义这些基础描述对象：
  - command descriptor
  - action descriptor
  - event descriptor
  - plugin capability / permission descriptor
- actor model 必须预留：human actor、system actor、plugin actor、delegated agent actor。
- 所有 contract 都必须仍然走 SQLite + DAL + centralized migrations，不引入旁路 truth source。

### 2. Differentiators worth doing now

- **Agent-callable but not agent-dependent**：现在先做 machine-readable contracts，不急着落完整 agent runtime。
- **Observability-ready metadata**：trace/span ids、latency class、side-effect class、failure reason taxonomy 现在就预留。
- **Capability delegation seam**：为未来“teacher approve → agent execute”留接口。

### 3. Anti-features / defer

- 不做完整 planner/memory/skill runtime。
- 不做 QuickJS / Docker / remote sandbox matrix。
- 不做全面 OTel 平台与 tracing UI，只先埋 contract 和最小 audit/metrics 位。
- 不做 Temporal / full workflow runtime。

### 4. Complexity / dependency notes

- 这是架构边界项，不该演变成第二个大平台项目。
- 关键是 descriptor schema 和 actor/capability semantics 要稳定，否则后续 Agent Runtime 会返工。
- 该类 feature 的成功标准不是“能跑 AI”，而是“后续 AI 不必重写平台内核”。

---

## Recommended First-Milestone Scope Boundary

### Must ship

1. **Command Bus v1**
   - 统一 envelope、handler registry、validation/auth/audit pipeline
   - 覆盖 plugin lifecycle 相关命令 + 少量平台级核心命令
2. **Action Registry v1**
   - typed registration、conflict detection、discoverability、enabled-state gating
3. **Plugin Lifecycle v1**
   - register/activate/deactivate/dispose semantics
   - dependency ordering
   - startup failure attribution
4. **Event Bus v1**
   - command-success emits fact events
   - typed subscription for internal platform consumers
5. **Platform descriptors v1**
   - commands/actions/events/capabilities 可列举、可审计、可被 future agent 调用

### Worth doing now if it stays small

- command idempotency key
- minimal command/event explorer for operators
- plugin kill switch posture
- actor delegation metadata

### Explicitly defer

- Agent Runtime
- Skill Runtime
- Workflow Engine
- QuickJS / Extension Host / sandbox isolation
- PostgreSQL / pgvector cutover
- classroom realtime rewrite
- event sourcing / undo engine / distributed bus

---

## MVP Recommendation

如果只保一条最小闭环，应该保：

**“插件和未来 Agent 的动作都能通过同一 command boundary 进入系统；系统能基于 registry 找到可执行能力；执行后产出事实事件与审计记录；插件生命周期不再是隐式约定。”**

这才是把现有 app 升级成 AI-native platform core 的第一性门槛。

## Sources

- `.planning/PROJECT.md` — milestone goals, constraints, out-of-scope. Confidence: HIGH.
- `openlearn_next_upgrade_plan.md` — target platform direction and staged priorities. Confidence: HIGH.
- VS Code official docs, Commands — commands as discoverable execution surface and activation model. https://code.visualstudio.com/api/extension-guides/command Confidence: HIGH.
- VS Code official docs, Activation Events — explicit activation/deactivation expectations for extensions. https://code.visualstudio.com/api/references/activation-events Confidence: HIGH.
- JupyterLab official docs, Develop Extensions — plugin/service/token model, activation ordering, provider-consumer pattern. https://jupyterlab.readthedocs.io/en/stable/extension/extension_dev.html Confidence: HIGH.
- Backstage official docs, Backend System Architecture / Extension Points / Modules — plugin/module boundary, extension point API design, module-before-plugin initialization. https://backstage.io/docs/backend-system/architecture/index/ https://backstage.io/docs/backend-system/architecture/extension-points https://backstage.io/docs/backend-system/architecture/modules Confidence: HIGH.
