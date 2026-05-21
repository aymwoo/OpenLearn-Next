# Architecture Report — v3.0 AI Native Educational OS Upgrade

**Scope:** 仅覆盖本 milestone 新增内核能力如何接入现有架构  
**Researched:** 2026-05-21  
**Confidence:** HIGH

## 1. New components/modules to add

### A. Platform Core feature root
建议新增一个**单体内平台内核根目录**，不要现在就拆成 monorepo packages：

`src/features/platform-core/`

建议包含：

- `commands/contracts.ts`
  - `PlatformCommand`、metadata、result、error taxonomy
- `commands/bus.ts`
  - 统一 `dispatch()` 入口
- `commands/registry.ts`
  - command type -> handler 映射
- `commands/handlers/*`
  - `plugin.install`、`plugin.enable`、`plugin.disable`、`plugin.transition`、后续 `lesson.*`/`workflow.*`
- `actions/registry.ts`
  - **Dynamic Action Registry**；按 school/plugin/lifecycle/capability 解析“此时可调用什么 action”
- `events/contracts.ts`
  - `PlatformEvent` 定义；与 command 明确分离
- `events/bus.ts`
  - 平台级 publish/subscribe 接口
- `events/outbox.ts`
  - 事实事件的 durable outbox / projector seam
- `plugins/lifecycle-orchestrator.ts`
  - register → resolveDependencies → activate → running → deactivate → dispose
- `plugins/dependency-graph.ts`
  - 插件依赖排序、循环检测、禁用传播
- `capabilities/authorizer.ts`
  - command/action 级 capability 判定入口（先做薄层）
- `observability/trace.ts`
  - commandId / correlationId / causationId 生成与传播

### B. Persistence additions
在现有 SQLite durable truth 上新增最小必要账本：

- `platformCommandExecutions`
  - 记录 command 输入、actor、status、result summary、correlationId
- `platformEventOutbox`
  - 记录 command 成功后产生的 domain events
- `pluginActivationState` 或 `pluginRuntimeBindings`
  - 记录当前已注册 action / subscription / activation snapshot

原则：**先加 ledger/outbox，不做 event sourcing rewrite。**

## 2. Existing components likely to change

### 必改模块

- `src/actions/plugin-actions.ts`
  - 现状：Server Actions 直调 `lib/dal/plugins`
  - 目标：改成 **Server Action -> Command Bus**，保留 `updateTag()` 但不把它塞进 bus 内核

- `src/lib/dal/plugins.ts`
  - 现状：同时做 lifecycle、governance、hook run、dispatch orchestration
  - 目标：收敛为**插件领域 DAL + transaction helpers**；不要继续承担“总调度器”角色

- `src/server/plugins/registry.ts`
  - 现状：`PLUGIN_ACTION_ALLOWLIST + switch dispatchPluginAction()`
  - 目标：改为**静态实现 + 动态注册元数据**；保留代码受控实现，去掉硬编码总表

- `src/features/runtime-platform/seams/event-bus/*`
  - 现状：这是 runtime/session 级 event bus，默认 in-process
  - 目标：继续保留为**runtime transport/event seam**，但**不要冒充平台级 Event Bus**

- `src/features/runtime-platform/host-actions/plugin-host.ts`
  - 现状：可直接 publish runtime event
  - 目标：改成通过 platform contracts 发 command / emit platform event，避免 host action 成为旁路

- `src/features/async-tasks/server/registry.ts`
  - 现状：typed task registry 已存在
  - 目标：后续让 task processor 也能 dispatch command；不要各 processor 自造 mutation seam

- `src/db/schema.ts`
  - 需要增加 command/event ledger 表，并给 `governanceAudits` 增加 command/event 关联键

- `src/lib/cache-policy.ts`
  - 需要新增 command/event 影响的 cache tag map，避免继续在各入口分散维护

### 很可能受影响的现有表/审计面

- `pluginRegistrations`
- `pluginLifecycleTransitions`
- `pluginActionAudits`
- `governanceAudits`
- `runtimeEventOutbox`

## 3. Data flow / control flow changes

## 新主路径

```text
UI / Plugin host / Async task / Future Agent
  -> Server Action / Node entrypoint
  -> Command Bus
  -> validate command schema
  -> capability + lifecycle + school-scope checks
  -> command handler
  -> DAL transaction against SQLite
  -> write governance/audit/command ledger
  -> append PlatformEvent outbox records
  -> return invalidation intent + result
  -> edge/app layer calls updateTag()
```

## Command vs Event boundary

- **Command** = 请求系统做事；只能走 unified execution boundary
- **Event** = 已经发生的事实；只能在 command 成功提交后发出
- **Rule:** event handler 若要改 durable truth，必须再 dispatch command，不能直接写库

## 与现有 runtime transport 的关系

应拆成三层，不要混：

1. **Platform Event Bus**
   - 面向插件、工作流、未来 Agent、analytics
2. **Runtime Event/Transport Bus**
   - 面向课堂 session、WebSocket/SSE delivery
3. **Async Task Queue**
   - 面向长任务执行，不是事实广播总线

现有 `runtimeEventOutbox + publishTransportEvent()` 保持课堂实时语义；
新的 `platformEventOutbox` 只承接平台领域事实，如：

- `plugin.installed`
- `plugin.enabled`
- `plugin.lifecycle.transitioned`
- `action.registered`
- `action.unregistered`
- `command.failed`

## Dynamic Action Registry boundary

建议采用：

- **动态的是可发现元数据**：action id、capability、plugin owner、lifecycle requirement、input schema key
- **静态的是真实实现**：handler 仍由主仓库代码提供

即：

```text
plugin manifest / built-in definition
  -> Action Registry projection
  -> command/action discoverability
  -> implementation resolved to code-owned handler
```

这样能支持 Agent/Workflow discoverability，同时不突破“禁止任意第三方代码执行”的约束。

## 4. Recommended build order

### Step 1 — Command contracts + ledger first
- 加 `PlatformCommand` contract、`dispatch()`、command execution ledger
- 先只接入**插件生命周期命令**，不重写 lesson/runtime 主链路

### Step 2 — Wrap existing plugin operations behind handlers
- 把 `plugin-actions.ts` 的 install/enable/disable/transition 改成 command handlers
- `lib/dal/plugins.ts` 退回领域服务角色

### Step 3 — Add Dynamic Action Registry
- 从当前 `server/plugins/registry.ts` 抽出 action metadata registry
- 先兼容旧 allowlist，再逐步替换 `switch` 型分发

### Step 4 — Add Platform Event Bus + outbox
- command 成功后写 `platformEventOutbox`
- 先做 in-process subscribers；不要一开始就上 Redis Streams

### Step 5 — Formal Plugin Lifecycle orchestration
- 在 enable/disable 之外补 `activate/deactivate/dispose`
- 增加 dependency ordering / cycle detection / activation snapshot

### Step 6 — Migrate secondary producers
- `plugin-host.ts`
- async task processors
- 后续 agent/tool entrypoints

### Step 7 — Only then expose discovery surfaces
- `listCommands()`
- `listActions()`
- `listCapabilities()`

这个顺序最安全，因为它先统一执行边界，再开放更多调用者。

## 5. Specific integration cautions for this repo

### A. 不要让 Command Bus 绕过 DAL
这个仓库的硬约束是 **DAL-only data access**。
正确姿势是：

`command handler -> DAL/domain service -> db`

不要在 bus handler 里直接散落 Drizzle 写入。

### B. 不要把 `next/cache` 带进平台内核
当前 `updateTag()` 在 Server Action 很合理；
但 command bus 未来还要被 worker / agent / host action 调用。

建议：**bus 返回 invalidation intents，入口层再执行 `updateTag()`**。

### C. 不要把现有 runtime event seam 误当成平台 Event Bus
当前 runtime event bus 明确绑定 `classroom-session-write-path`，而且 transport 已有 WebSocket-first 语义。
v3.0 新 Event Bus 必须是**平台事实层**，不要复用成课堂广播总线。

### D. 不要把 Dynamic Action Registry 做成动态代码执行
这个 repo 明确禁止 `eval()`、插件直接访问核心 API/DB。
所以 action registry 只能是：

- 动态发现
- 动态授权
- 动态装配

不能是“插件上传 JS 后直接执行”。

### E. 不要让 async task processor 成为旁路 mutation 面
`v2.3` 已经有 typed task registry。后续 task 完成业务写入时，也应通过 command handler 或共享 domain service；否则统一 execution boundary 会被 worker 绕开。

### F. 审计键要统一
现有已有：

- `pluginActionAudits`
- `governanceAudits`
- `runtimeEventOutbox`

v3.0 需要新增并贯通：

- `commandId`
- `correlationId`
- `causationId`

否则后续 Observability / Replay / Agent trace 很难补。

### G. 生命周期不要直接复用当前 plugin state 名字做未来 runtime 总状态机
当前 `installed/enabled/mounted/ready/suspended/disabled/failed` 已落库。可以兼容，但建议新增**activation orchestration layer**，而不是马上重写表枚举，避免 blast radius 过大。

## Bottom line

这次 v3.0 第一阶段最稳的接法是：

**在现有 Next.js 单体里新增 platform-core 层，用 Command Bus 收口所有系统动作；让 Dynamic Action Registry 只负责发现与授权，不负责执行任意代码；让 Event Bus 成为 command 提交后的事实广播层，并与现有 runtime transport bus 保持严格分层。**

这样既能承接后续 Agent Runtime / Skill Runtime / Capability / Observability，又不会破坏当前 SQLite、DAL、WebSocket transport、async task platform 已经建立的稳定边界。

## Sources

- `.planning/PROJECT.md` — v3.0 目标、约束、现有平台边界。Confidence: HIGH.
- `.planning/ROADMAP.md` — v2.4 已完成插件数据治理与 lifecycle 输入。Confidence: HIGH.
- `openlearn_next_upgrade_plan.md` — v3.x 升级方向与优先级。Confidence: HIGH.
- `src/actions/plugin-actions.ts` — 当前 plugin Server Action 入口。Confidence: HIGH.
- `src/lib/dal/plugins.ts` — 当前插件 lifecycle / governance / hook orchestration 聚合点。Confidence: HIGH.
- `src/server/plugins/registry.ts` — 当前硬编码 action allowlist 与分发实现。Confidence: HIGH.
- `src/features/runtime-platform/seams/event-bus/*` — 当前 runtime event seam 仍是 in-process/default-only。Confidence: HIGH.
- `src/features/runtime-platform/classroom/runtime-session.ts` — runtime transport 事件在 durable write 后发布。Confidence: HIGH.
- `src/features/async-tasks/server/registry.ts` + `worker/registry.ts` — 现有 typed async task registry 与 processor map。Confidence: HIGH.
- `src/db/schema.ts` — `pluginRegistrations`、`pluginLifecycleTransitions`、`pluginActionAudits`、`governanceAudits`、`runtimeEventOutbox` 现状。Confidence: HIGH.
