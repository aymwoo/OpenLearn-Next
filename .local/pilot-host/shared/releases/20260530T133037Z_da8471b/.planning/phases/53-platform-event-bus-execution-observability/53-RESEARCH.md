# Phase 53: Platform Event Bus & Execution Observability - Research

**Researched:** 2026-05-22  
**Domain:** typed platform events, durable platform event ledger/outbox, execution observability  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
- 在 Phase 53 直接把 Redis / WebSocket platform event delivery 做成完整产品级 bridge —— 超出当前最小 blast radius，留给后续 phase。
- 把 `runtimeEventOutbox`、runtime event bus 或 classroom transport trace 升格成 platform event truth —— 明确不做。
- 为每种失败都引入成体系的领域失败事件族 —— 暂不做，避免事件语义膨胀。
- 把 invalidation intent 扩成独立 noisy event family，例如 `platform.cache.invalidation.requested` —— 当前不做，先保持 command summary 可观测即可。
- 把 operator 面重构成纯事件流控制台 —— 不在本阶段采用，继续保持 command-first summary posture。
- AI-native descriptor discovery、delegated metadata、agent-callable contract surface —— 属于 Phase 54，不提前吸入本 phase。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EVNT-01 | command 成功后会产生 typed platform event，与 command envelope 明确分离。 | 需要扩展 handler execute 返回值，显式返回 generic/domain events，而不是只返回 `resultSummary` + `invalidation`。[VERIFIED: src/features/platform-core/commands/contracts.ts][VERIFIED: src/features/platform-core/commands/handlers/plugins.ts] |
| EVNT-02 | 平台事件会写入 durable event outbox / ledger，并关联 `commandId`、`correlationId`、`causationId`。 | 需要新增独立 platform event ledger/outbox 表，禁止复用 `runtimeEventOutbox`。[VERIFIED: src/db/schema.ts][VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md] |
| EVNT-03 | 插件、审计、分析和 future workflow / agent 订阅者可以消费 platform events，而不依赖 classroom runtime transport bus。 | 需要新增 platform event in-process subscriber seam；runtime event seam 只能继续服务 classroom transport。[VERIFIED: src/features/runtime-platform/seams/event-bus/contract.ts][VERIFIED: src/features/runtime-platform/seams/event-bus/default-adapter.ts] |
| EVNT-04 | 系统可以把 platform events 桥接到 in-process、Redis、WebSocket delivery adapters，但不改变 SQLite truth ownership。 | 需要 bridge contract / adapter interface，但 Phase 53 只实现 in-process delivery。[VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md] |
| EVNT-05 | command、event、task、audit 共享统一 correlation metadata。 | 当前 command 与 governance audit 已有 `correlationId` / `commandId` 锚点，platform events 需要沿用同一元数据结构。[VERIFIED: src/features/platform-core/commands/contracts.ts][VERIFIED: src/db/schema.ts][VERIFIED: src/lib/dal/plugins.ts] |
| EVNT-06 | command handlers 返回 invalidation intent，使入口层能统一 `updateTag()` / `revalidateTag()`。 | 当前 handlers 已返回 invalidation，Server Actions 在入口层消费；Phase 53 只应增强可观测性，不应把 `updateTag()` 拉入 bus。[VERIFIED: src/features/platform-core/commands/contracts.ts][VERIFIED: src/actions/plugin-actions.ts] |
| EVNT-07 | 平台维护者可以在最小 operator surface 查看 command / event execution summary 与 failure attribution。 | 可复用 async task 的“主记录 + timeline”读面模式，但需保持 command-first posture。[VERIFIED: src/features/async-tasks/server/operator-read-model.ts][VERIFIED: src/features/async-tasks/infra/queue-events.ts] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 必须继续使用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite-first。[VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- UI 组件禁止直连数据库；所有读写必须通过 DAL 和 Server Actions。[VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- Node.js 20.9+ 是主 runtime；Edge Runtime 仅用于 SSE 实时同步。[VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- Next.js 16 缓存必须显式处理；写入后必须更新或失效 tag。[VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 首发数据库只针对 SQLite；关联需 cascade delete。[VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 课堂广播继续使用 SSE / runtime transport；Phase 53 不得重开 classroom realtime 主链路。[VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md][VERIFIED: .planning/REQUIREMENTS.md]
- 插件禁止 `eval()`、动态执行第三方代码、直接访问 DB 或核心 API。[VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 页面实现需参考 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`；但 Phase 53 的 UI 目标只应是最小 operator-visible summary，不应扩成完整 event console。[VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md][VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md]

## Planning Question

在不重做 Command Bus、不复用 `runtimeEventOutbox`、不把 Redis/WebSocket 升格为 truth、也不提前吸入 Phase 54 AI contract 的前提下，如何把现有 plugin-governance command execution path 扩展为：**typed platform events + 独立 durable platform event ledger/outbox + command-first operator execution summary**？[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md][VERIFIED: .planning/ROADMAP.md]

## Summary

当前代码已经具备 Phase 53 的三个关键前提：一是统一 command envelope 与 dual-ledger command truth 已经落在 `platformCommands` / `platformCommandAttempts`；二是 handlers 已经显式返回 `resultSummary` 与 `invalidation`；三是 Server Action / host action 都已统一走 `dispatchPluginGovernanceCommand()`，因此平台事件不需要新开一条 mutation path，只需要扩展现有 command execution result contract。[VERIFIED: src/features/platform-core/commands/contracts.ts][VERIFIED: src/features/platform-core/commands/bus.ts][VERIFIED: src/features/platform-core/commands/producers/plugin-governance.ts][VERIFIED: src/actions/plugin-actions.ts][VERIFIED: src/features/runtime-platform/host-actions/plugin-host.ts]

当前缺口也很明确：代码里还没有 platform event contract、没有 platform event ledger/outbox、没有 platform event subscriber seam、没有 operator-visible command+event read model；并且 `platformCommands` 目前没有持久化 invalidation summary，也没有把 failure attribution 结构化到 operator-friendly 读面里。[VERIFIED: src/features/platform-core/commands/contracts.ts][VERIFIED: src/features/platform-core/commands/bus.ts][VERIFIED: src/db/schema.ts]

**Primary recommendation:** 以 `dispatchPlatformCommand()` 为唯一执行主线，新增 `src/features/platform-core/events/*` 和独立 SQLite-owned platform event ledger/outbox；让 handlers 显式返回少量 generic/domain events，bus 负责持久化与投递 in-process subscribers；operator 只看 command-first summary + event timeline，不做 raw stream console。[VERIFIED: src/features/platform-core/commands/bus.ts][VERIFIED: src/features/async-tasks/infra/queue-events.ts][VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md]

## Recommended Approach

1. 先扩展 command execute contract：从“`resultSummary` + `invalidation`”升级为“`resultSummary` + `invalidation` + `emittedEvents?` + `failureEvent?`”。事件由 handler 显式声明，bus 只负责持久化与桥接，不自动猜业务语义。[VERIFIED: src/features/platform-core/commands/contracts.ts][VERIFIED: src/features/platform-core/commands/handlers/plugins.ts]
2. 新增独立 platform event ledger/outbox，表上至少保存 `eventId`、`commandId`、`attemptNumber`、`eventType`、`channelStatus/dispatchStatus`、`correlationId`、`causationId`、`payloadSummaryJson`、`createdAt`；truth owner 继续是 SQLite，不与 `runtimeEventOutbox` 共表。[VERIFIED: src/db/schema.ts][VERIFIED: src/features/runtime-platform/seams/event-bus/contract.ts]
3. Phase 53 首版只实现 in-process subscribers；Redis/WebSocket 只保留 adapter bridge contract，不写 delivery productization，不引入 Redis 作为 truth 或 replay authority。[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md][VERIFIED: .planning/REQUIREMENTS.md]
4. operator 读面应复用 async-task 的“主记录 + 时间线”模式：`platformCommands` 继续是 summary 主记录，platform event ledger 提供 timeline，下钻时显示 generic/domain events、failure attribution、invalidation intent。[VERIFIED: src/features/async-tasks/server/operator-read-model.ts][VERIFIED: src/features/async-tasks/infra/queue-events.ts][VERIFIED: src/db/schema.ts]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Typed platform event contract generation | API / Backend | Database / Storage | events 必须跟随 command handler 成功/失败事实生成，不能在浏览器或 transport 层推导。[VERIFIED: src/features/platform-core/commands/handlers/plugins.ts][VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md] |
| Durable platform event ledger/outbox | Database / Storage | API / Backend | SQLite 继续持有 truth；backend 只负责写入与读取，不把 Redis/WebSocket 变成 authoritative layer。[VERIFIED: src/db/schema.ts][VERIFIED: .planning/REQUIREMENTS.md] |
| Event persistence + dispatch orchestration | API / Backend | — | `dispatchPlatformCommand()` 已经是统一 pipeline，最小 blast radius 是在这里扩展 event write/bridge。[VERIFIED: src/features/platform-core/commands/bus.ts] |
| In-process subscriber execution | API / Backend | — | 当前 runtime default adapter 证明 in-memory subscriber pattern 可接受，但平台事件需要独立 seam。[VERIFIED: src/features/runtime-platform/seams/event-bus/default-adapter.ts] |
| Future Redis/WebSocket bridge seam | API / Backend | CDN / Static | 只是 backend adapter contract，不是前端 authority，也不是 CDN concern。[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md] |
| Operator execution summary read model | API / Backend | Database / Storage | 读面应聚合 command summary + event timeline，由 server read model 提供，而不是直接由 UI 拼装 SQL。[VERIFIED: src/features/async-tasks/server/operator-read-model.ts][VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md] |
| Cache invalidation consumption | Frontend Server (SSR) | API / Backend | handlers 继续返回 invalidation intent，但真正 `updateTag()` 仍应停留在 Server Actions / entry adapters。[VERIFIED: src/actions/plugin-actions.ts][VERIFIED: src/features/platform-core/commands/contracts.ts] |

## Existing Patterns to Reuse

### Pattern 1: Command-first execution pipeline
- `dispatchPlatformCommand()` 已有 `validate -> authorize -> execute -> record result` 主线；Phase 53 最稳的做法是在 execute 结果之后追加 `persist events -> notify subscribers`，而不是再造第二条 event execution seam。[VERIFIED: src/features/platform-core/commands/bus.ts]

### Pattern 2: Handler-owned business semantics
- `pluginCommandHandlers` 当前已经在 handler 里显式决定 `resultSummary` 和 invalidation tags；platform domain events 应继续在 handler 层声明，避免 bus 根据 `commandType` 反推事件，或把 event ownership 下沉给 DAL。[VERIFIED: src/features/platform-core/commands/handlers/plugins.ts]

### Pattern 3: Producer unification across entrypoints
- Server Actions 与 host actions 都走 `dispatchPluginGovernanceCommand()`；因此平台事件天然能覆盖 UI 与 host 两条入口，不应只覆盖 Server Action。[VERIFIED: src/actions/plugin-actions.ts][VERIFIED: src/features/runtime-platform/host-actions/plugin-host.ts][VERIFIED: src/features/platform-core/commands/producers/plugin-governance.ts]

### Pattern 4: Main record + timeline read model
- async task 已经采用 `asyncTasks` + `asyncTaskEvents` + operator read model 的结构；Phase 53 可复用同一结构思想：`platformCommands` 作为主记录，`platformEvents` 作为 timeline。[VERIFIED: src/features/async-tasks/infra/queue-events.ts][VERIFIED: src/features/async-tasks/server/operator-read-model.ts]

### Pattern 5: Transport seam without truth inversion
- runtime default adapter 已明确写出“publishing does not move truth ownership away from SQLite-backed path”；platform event seam 应复用这个接口 posture，但不能共用 runtime truth semantics。[VERIFIED: src/features/runtime-platform/seams/event-bus/default-adapter.ts][VERIFIED: src/features/runtime-platform/seams/event-bus/contract.ts]

### Pattern 6: Governance/failure semantics as stable payload source
- `actions/registry.ts` 与 `governance-projection.ts` 已经沉淀 lifecycle state、reason code、recommended recovery、failure attribution 语义，这些应直接成为首批 domain event summary payload 的来源，而不是重新发明一套字符串协议。[VERIFIED: src/features/platform-core/actions/registry.ts][VERIFIED: src/features/platform-core/plugins/governance-projection.ts]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.6 (published 2026-05-07) | Server Actions / cache invalidation consumer layer | Entry adapters already rely on server-side `updateTag()` posture; Phase 53 should preserve that boundary.[VERIFIED: npm registry][VERIFIED: src/actions/plugin-actions.ts] |
| Drizzle ORM | 0.45.2 (published 2026-03-27) | SQLite ledger/outbox schema + typed persistence | Existing command/runtime/async durable anchors are already on Drizzle + SQLite.[VERIFIED: npm registry][VERIFIED: src/db/schema.ts] |
| Zod | 4.4.3 (published 2026-05-04) | Typed event envelope / subscriber contract validation | Existing command envelopes already use Zod; platform events should match this contract style.[VERIFIED: npm registry][VERIFIED: src/features/platform-core/commands/contracts.ts] |
| Vitest | 4.1.7 current, 4.1.5 installed | Regression tests + verify support | Existing command/handler/host/runtime seams already use Vitest heavily, so Phase 53 should extend rather than switch frameworks.[VERIFIED: npm registry][VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SQLite (via current Drizzle schema) | repo-local | canonical truth for platform events | Use as the only platform event truth store; do not introduce Redis truth in this phase.[VERIFIED: src/db/schema.ts][VERIFIED: .planning/REQUIREMENTS.md] |
| Existing runtime event adapter shape | in-repo seam | interface reference for in-process publish/subscribe | Reuse only the API shape ideas (`publish`, `subscribe`, `describeOwnership`), not the truth model.[VERIFIED: src/features/runtime-platform/seams/event-bus/contract.ts][VERIFIED: src/features/runtime-platform/seams/event-bus/default-adapter.ts] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New platform event ledger | `runtimeEventOutbox` | Forbidden because runtime outbox is classroom/runtime truth, not platform event truth.[VERIFIED: src/db/schema.ts][VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md] |
| SQLite truth + adapter seam | Redis/WebSocket as primary bus | Forbidden because project and requirement both lock Redis/WebSocket to delivery posture only.[VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md] |
| Summary payload events | Full object snapshot events | Violates Phase 53 boundary and would create noisy/unstable event families.[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md] |

**Installation:**
```bash
npm install next drizzle-orm zod vitest
```

## Architecture Patterns

### System Architecture Diagram

```text
Server Action / Host Action / Future Worker Producer
        |
        v
dispatchPluginGovernanceCommand()
        |
        v
dispatchPlatformCommand()
  -> validate envelope
  -> authorize actor
  -> execute handler
        |
        +--> resultSummary + invalidation intent
        +--> emitted platform events (generic + minimal domain)
        |
        v
SQLite writes
  -> platformCommands / platformCommandAttempts
  -> platformEventLedger / platformEventOutbox (new)
        |
        +--> in-process platform subscribers (Phase 53 only)
        +--> future Redis/WebSocket bridge seam (contract only)
        |
        v
Operator read model
  -> command summary first
  -> event timeline second
  -> failure attribution + invalidation visibility
```

### Recommended Project Structure
```text
src/features/platform-core/
├── commands/                 # existing command bus, handlers, producers
├── events/
│   ├── contracts.ts          # PlatformEvent envelope / payload schemas
│   ├── ledger.ts             # SQLite-backed event persistence helpers
│   ├── bus.ts                # publish/subscribe orchestration over persisted events
│   ├── subscribers.ts        # in-process subscriber registry
│   └── adapters/             # in-process adapter now, Redis/WebSocket seams later
└── observability/
    ├── read-model.ts         # command-first execution summary + timeline
    └── dto.ts                # operator-facing DTOs
```

### Pattern 1: Handler explicitly emits events
**What:** handlers return stable event facts alongside result summary.  
**When to use:** every command that reaches a true business outcome, and every failure path that needs one generic failure event.  
**Example:**
```typescript
type PlatformEventEmission = {
  eventType: string
  payloadSummary: Record<string, unknown>
  category: "outcome" | "domain"
}

type PlatformCommandExecutionResult = {
  resultSummary: Record<string, unknown> | null
  invalidation?: { tags: string[] }
  emittedEvents?: PlatformEventEmission[]
  failureEvent?: PlatformEventEmission
}
```
// Source: current execute contract extension point in `src/features/platform-core/commands/contracts.ts` and handler-owned summaries in `src/features/platform-core/commands/handlers/plugins.ts`.[VERIFIED: src/features/platform-core/commands/contracts.ts][VERIFIED: src/features/platform-core/commands/handlers/plugins.ts]

### Pattern 2: Persist truth before notify
**What:** bus writes platform event ledger/outbox inside the command result path before any subscriber delivery.  
**When to use:** all platform event publication.  
**Example:**
```typescript
const execution = await definition.execute({ command, attemptNumber })
await store.appendAttempt(...)
await store.updateCommandSummary(...)
await platformEventStore.appendEvents({
  command,
  attemptNumber,
  events: execution.emittedEvents ?? [],
  failureEvent: undefined,
})
await platformEventBus.publishPersisted(command.id, attemptNumber)
```
// Source: command persistence flow in `src/features/platform-core/commands/bus.ts`; main-record-before-delivery posture mirrors async task projector structure.[VERIFIED: src/features/platform-core/commands/bus.ts][VERIFIED: src/features/async-tasks/infra/queue-events.ts]

### Pattern 3: Command-first operator read model
**What:** read `platformCommands` as the primary list and join/fetch events only on detail view.  
**When to use:** operator dashboard, diagnostics, debugging.  
**Example:**
```typescript
export async function getPlatformCommandWithEvents(commandId: string) {
  const command = await db.query.platformCommands.findFirst(...)
  const events = await db.query.platformEvents.findMany(...)
  return { command, events }
}
```
// Source: async task operator read model shape in `src/features/async-tasks/server/operator-read-model.ts`.[VERIFIED: src/features/async-tasks/server/operator-read-model.ts]

### Anti-Patterns to Avoid
- **Reusing `runtimeEventOutbox` as platform truth:** breaks frozen runtime/platform separation.[VERIFIED: src/db/schema.ts][VERIFIED: .planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md]
- **Bus auto-infers domain events from `commandType`:** makes event semantics unstable and contradicts D-53-07.[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md]
- **Turning invalidation intent into a new event family:** creates noisy non-domain events and directly violates D-53-14.[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md]
- **Making Redis/WebSocket the replayable source of truth:** violates SQLite-first ownership.[VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event truth store | ad-hoc JSON stuffed into `platformCommands.resultSummaryJson` | dedicated platform event ledger/outbox tables | command summary and event timeline have different ownership and retention semantics.[VERIFIED: src/db/schema.ts][VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md] |
| Subscriber transport truth | custom Redis-first delivery authority | SQLite truth + thin bridge adapter seam | delivery retries and truth persistence must stay decoupled.[VERIFIED: src/features/runtime-platform/seams/event-bus/default-adapter.ts][VERIFIED: .planning/REQUIREMENTS.md] |
| Operator stream console | raw event-stream-only UI | summary-first read model with drill-down timeline | repo already prefers list/detail operator cognition over raw stream browsing.[VERIFIED: src/features/async-tasks/server/operator-read-model.ts][VERIFIED: src/features/async-tasks/infra/queue-events.ts] |

**Key insight:** 本阶段不需要“新的事件平台产品”，而是需要“让现有 command truth 多一张 event truth 账本和一层最小 delivery seam”。[VERIFIED: src/features/platform-core/commands/bus.ts][VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md]

## Context vs Code Deviations

1. `53-CONTEXT.md` 预期 handler 会显式返回 platform events，但当前 execute contract 只允许 `resultSummary` 与 `invalidation`，没有 `emittedEvents` 字段；这不是 scope 冲突，而是明确的 implementation gap。[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md][VERIFIED: src/features/platform-core/commands/contracts.ts]
2. `53-CONTEXT.md` 预期 command summary/read model 直接暴露 invalidation intent，但当前 `platformCommands` 表未持久化 invalidation tags；这些 tags 目前只由 dispatch result 暂时返回给 entry adapter 使用。[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md][VERIFIED: src/db/schema.ts][VERIFIED: src/actions/plugin-actions.ts]
3. `53-CONTEXT.md` 预期 command-first operator summary + event timeline，但当前 repo 还没有 platform command/operator read model；只有 async task 有类似模式。[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md][VERIFIED: src/features/async-tasks/server/operator-read-model.ts]
4. `53-CONTEXT.md` 把 failure attribution 作为 operator-visible summary 的一部分；当前 command ledger 只有 `failureDetailJson`，而稳定的 failure attribution 语义主要沉淀在 plugin governance projection，而不是 platform command summary 表本身。[VERIFIED: src/db/schema.ts][VERIFIED: src/features/platform-core/plugins/governance-projection.ts]

## Risks and Planning Implications

### Risk 1: Event-family scope creep
**What goes wrong:** generic outcome events + domain events + invalidation intent + future AI descriptor hints 全部被一次吸入。  
**Planning implication:** 首批事件族必须限制在“少量 generic outcome + 少量 plugin governance domain facts”，并显式排除 Phase 54 metadata。[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md]

### Risk 2: Truth inversion through adapter work
**What goes wrong:** 为了做 Redis/WebSocket seam，planner 把 dispatch/retry/replay 逻辑过早迁移到 adapter 层。  
**Planning implication:** adapter 计划必须只定义 contract 和 no-op / placeholder implementation；不得要求 Redis 环境或 delivery queue as truth。[VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: src/features/runtime-platform/seams/event-bus/default-adapter.ts]

### Risk 3: DAL regains event ownership
**What goes wrong:** 为了方便，把 domain events 在 `lib/dal/plugins.ts` 里顺手生成。  
**Planning implication:** DAL 只继续写 plugin truth / audits；event emission ownership 必须留在 command handler return contract。[VERIFIED: src/lib/dal/plugins.ts][VERIFIED: src/features/platform-core/commands/handlers/plugins.ts]

### Risk 4: Operator surface turns into a product rewrite
**What goes wrong:** planner 把 Phase 53 拉成完整 observability UI overhaul。  
**Planning implication:** 读面先做 server/operator DTO 与最小 surface extension；不做纯 event console，不做 analytics productization。[VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md]

### Risk 5: Retry / failure event semantics become inconsistent
**What goes wrong:** `plugin.retry` 作为同一 command identity 的新 attempt，但事件 ledger 若按“新 business command”建模会断裂。  
**Planning implication:** event rows必须显式包含 `commandId` + `attemptNumber`；失败 generic event 也必须挂在同一 command identity 上。[VERIFIED: src/features/platform-core/commands/handlers/plugins.ts][VERIFIED: src/features/platform-core/commands/producers/plugin-governance.ts]

## Code Examples

### Existing command invalidation pattern
```typescript
const result = await dispatchPluginGovernanceCommand({ ... })
updateTag(cacheTags.pluginRegistry)
updateTag(cacheTags.plugin(pluginId))
updateInferredTags(result.invalidationTags.filter(...))
```
// Source: `src/actions/plugin-actions.ts`.[VERIFIED: src/actions/plugin-actions.ts]

### Existing runtime adapter seam shape to mirror, not reuse
```typescript
export interface RuntimeEventBusAdapter {
  readonly id: string
  readonly ownership: RuntimeEventBusOwnership
  describeOwnership(): RuntimeEventBusOwnership
  publish(event: RuntimeEventEnvelope): Promise<void>
  subscribe(topic: string, handler: RuntimeEventHandler): () => void
}
```
// Source: `src/features/runtime-platform/seams/event-bus/contract.ts`.[VERIFIED: src/features/runtime-platform/seams/event-bus/contract.ts]

### Existing operator list/detail pattern
```typescript
export async function getAsyncTaskWithEvents(taskId: string) {
  const task = await db.query.asyncTasks.findFirst(...)
  const events = await db.query.asyncTaskEvents.findMany(...)
  return { task, events }
}
```
// Source: `src/features/async-tasks/server/operator-read-model.ts`.[VERIFIED: src/features/async-tasks/server/operator-read-model.ts]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| direct DAL mutation from plugin entrypoints | unified command producer adapters for server/host | Phase 51-52 artifacts now present in code | Phase 53 can extend existing command path instead of opening another write seam.[VERIFIED: src/actions/plugin-actions.ts][VERIFIED: src/features/runtime-platform/host-actions/plugin-host.ts] |
| runtime event seam only | runtime seam remains runtime-only; platform seam still missing | locked in Phase 50 and still reflected in code | platform event work must add a parallel seam, not mutate runtime ownership.[VERIFIED: src/features/runtime-platform/seams/event-bus/contract.ts][VERIFIED: .planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] |
| action/lifecycle semantics scattered | governance projection centralizes reason codes and recovery hints | Phase 52 | domain event payloads can reuse stable semantics immediately.[VERIFIED: src/features/platform-core/actions/registry.ts][VERIFIED: src/features/platform-core/plugins/governance-projection.ts] |

**Deprecated/outdated:**
- `runtimeEventOutbox` as a candidate for platform event truth is outdated for Phase 53 because Phase 50 and Phase 53 both lock it to runtime-only posture.[VERIFIED: src/db/schema.ts][VERIFIED: .planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md][VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md]

## Assumptions Log

All material claims in this research were verified against repo files, planning artifacts, or npm registry output during this session.

## Resolved Planning Decisions

1. **首批 domain event type 最小集合如何命名？**
   - Resolved in `53-01-PLAN.md` and `53-02-PLAN.md`: 首批领域事件固定为 `plugin.installed`、`plugin.lifecycle.changed`、`plugin.kill_switch.changed`，而 `plugin.reconcile` 不单列新事件族，只映射为 generic outcome + lifecycle domain event 组合。
   - Why this resolution: 它满足 D-53-01 / D-53-02 的最小业务语义要求，同时避免事件族膨胀和 subscriber 语义漂移。[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-01-PLAN.md][VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-02-PLAN.md]

2. **invalidation intent 需要落 command 主表还是只落 read-model projection？**
   - Resolved in `53-01-PLAN.md` and `53-04-PLAN.md`: Phase 53 先把 invalidation intent 持久化到 `platformCommands` 的 command-summary carrying fields，再由 command-first operator read model 直接读取；不额外扩成独立 invalidation event family。
   - Why this resolution: 这样 blast radius 最小，且能直接满足 D-53-13 / D-53-14 与 EVNT-06 / EVNT-07 对 operator summary 的可见性要求。[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-01-PLAN.md][VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-04-PLAN.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js/server-side platform core | ✓ | v24.1.0 | — [VERIFIED: local shell] |
| npm | package/version verification | ✓ | 11.6.2 | pnpm [VERIFIED: local shell] |
| pnpm | fast local test/verify commands | ✓ | 10.33.0 | npm [VERIFIED: local shell] |
| Vitest | unit/regression tests | ✓ | 4.1.5 installed | — [VERIFIED: package.json] |

**Missing dependencies with no fallback:**
- None for Phase 53 research/planning.[VERIFIED: local shell]

**Missing dependencies with fallback:**
- Redis is intentionally not required for Phase 53 because bridge work is contract-only, not productized delivery.[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 installed / 4.1.7 current npm latest [VERIFIED: package.json][VERIFIED: npm registry] |
| Config file | `vitest.config.ts` [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/vitest.config.ts] |
| Quick run command | `pnpm vitest run src/features/platform-core/commands/bus.test.ts src/features/platform-core/commands/handlers/plugins.test.ts src/features/runtime-platform/host-actions/plugin-host.test.ts` [VERIFIED: package.json] |
| Full suite command | `pnpm test -- --run` [VERIFIED: package.json] |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EVNT-01 | handler emits typed generic/domain platform events | unit | `pnpm vitest run src/features/platform-core/events/contracts.test.ts src/features/platform-core/commands/handlers/plugins.events.test.ts` | ❌ Wave 0 |
| EVNT-02 | event rows persist with command/correlation linkage | unit/integration | `pnpm vitest run src/features/platform-core/events/ledger.test.ts` | ❌ Wave 0 |
| EVNT-03 | subscribers consume platform events without runtime bus dependency | unit | `pnpm vitest run src/features/platform-core/events/bus.test.ts` | ❌ Wave 0 |
| EVNT-04 | in-process adapter works; Redis/WebSocket seam stays contract-only | unit | `pnpm vitest run src/features/platform-core/events/adapters.test.ts` | ❌ Wave 0 |
| EVNT-05 | command/event/audit metadata stay correlated | integration | `pnpm vitest run src/features/platform-core/commands/producers/plugin-governance.test.ts src/features/platform-core/events/metadata.test.ts` | ❌ Wave 0 |
| EVNT-06 | invalidation intent remains returned to entry adapters and visible to operator summary | unit/integration | `pnpm vitest run src/actions/plugin-actions.test.ts src/features/platform-core/observability/read-model.test.ts` | ❌ Wave 0 |
| EVNT-07 | operator summary shows command summary + event timeline + failure attribution | unit/integration | `pnpm vitest run src/features/platform-core/observability/read-model.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run src/features/platform-core/commands/bus.test.ts src/features/platform-core/commands/handlers/plugins.test.ts`
- **Per wave merge:** `pnpm test -- --run`
- **Phase gate:** add `verify:phase53` script plus focused Vitest suite before `/gsd-verify-work`.[VERIFIED: package.json]

### Wave 0 Gaps
- [ ] `src/features/platform-core/events/contracts.test.ts` — covers EVNT-01
- [ ] `src/features/platform-core/events/ledger.test.ts` — covers EVNT-02 + EVNT-05
- [ ] `src/features/platform-core/events/bus.test.ts` — covers EVNT-03 + EVNT-04
- [ ] `src/features/platform-core/observability/read-model.test.ts` — covers EVNT-06 + EVNT-07
- [ ] `scripts/verify-phase53-platform-events.ts` + `package.json#verify:phase53` — phase regression gate

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | reuse current actor/session resolution and teacher/system authorization before event emission.[VERIFIED: src/features/platform-core/commands/handlers/plugins.ts][VERIFIED: src/actions/plugin-actions.ts] |
| V3 Session Management | no | Phase 53 does not introduce new session primitives; keep existing Auth.js posture untouched.[VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md] |
| V4 Access Control | yes | subscribers and operator read models must respect current command/teacher/host scope boundaries.[VERIFIED: src/features/runtime-platform/host-actions/plugin-host.ts][VERIFIED: src/features/platform-core/commands/handlers/plugins.ts] |
| V5 Input Validation | yes | Zod event envelope / payload schemas; reject invalid event rows before persistence.[VERIFIED: src/features/platform-core/commands/contracts.ts] |
| V6 Cryptography | no | do not introduce custom crypto; current producer correlation hashing is sufficient and already centralized.[VERIFIED: src/features/platform-core/commands/producers/plugin-governance.ts] |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged event payload / type from producer | Tampering | only handlers may emit domain events; bus validates envelope with Zod before persistence.[VERIFIED: src/features/platform-core/commands/contracts.ts][VERIFIED: src/features/platform-core/commands/handlers/plugins.ts] |
| Unauthorized host/operator access to execution summaries | Information Disclosure | continue using teacher/host governance checks before exposing read models.[VERIFIED: src/features/runtime-platform/host-actions/plugin-host.ts] |
| Truth inversion through adapter replay | Tampering | persist event truth in SQLite first; adapters only consume persisted records.[VERIFIED: src/features/runtime-platform/seams/event-bus/default-adapter.ts][VERIFIED: .planning/REQUIREMENTS.md] |
| Sensitive/noisy payload leakage | Information Disclosure | keep payloads summary-only and move detail lookups back to ledger/read models.[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md] |

## Verification Recommendations

1. 新增 focused unit tests，直接断言 handler 是否显式产出 generic/domain events，而不是只测 command summary。[VERIFIED: src/features/platform-core/commands/handlers/plugins.test.ts]
2. 为 bus/ledger 增加 integration tests，断言成功 command 会写 event rows，失败 command 只写一条 generic failure event。[VERIFIED: src/features/platform-core/commands/bus.test.ts][VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md]
3. 为 host/server producer 路径加 correlation assertions，确保 `commandId` / `correlationId` / `causationId` 贯穿到 event ledger 和 governance audits。[VERIFIED: src/features/platform-core/commands/producers/plugin-governance.ts][VERIFIED: src/lib/dal/plugins.ts][VERIFIED: src/features/runtime-platform/host-actions/plugin-host.ts]
4. 为 operator read model 加 list/detail tests，确保 UI 不需要直接读 raw event table，也不会丢掉 invalidation/failure attribution。[VERIFIED: src/features/async-tasks/server/operator-read-model.ts]
5. 增加 `verify:phase53`，做静态 guard：禁止 `runtimeEventOutbox` 被 platform event 模块 import；禁止 invalidation intent 被扩成独立 event family；禁止 Redis/WebSocket adapter 成为 truth store。[VERIFIED: package.json][VERIFIED: src/db/schema.ts]

## Sources

### Primary (HIGH confidence)
- `.planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md` — scope, prohibitions, operator posture
- `.planning/ROADMAP.md` — Phase 53 goal / success criteria / dependency on Phase 52
- `.planning/REQUIREMENTS.md` — EVNT-01..EVNT-07 truth
- `.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md` — runtime vs platform event separation
- `.planning/phases/51-command-bus-foundation/51-CONTEXT.md` — command ledger / producer boundary
- `.planning/phases/52-action-registry-plugin-lifecycle-governance/52-CONTEXT.md` — governance semantics / operator diagnostics posture
- `src/features/platform-core/commands/contracts.ts`
- `src/features/platform-core/commands/bus.ts`
- `src/features/platform-core/commands/producers/plugin-governance.ts`
- `src/features/platform-core/commands/handlers/plugins.ts`
- `src/features/platform-core/actions/registry.ts`
- `src/features/platform-core/plugins/governance-projection.ts`
- `src/actions/plugin-actions.ts`
- `src/features/runtime-platform/host-actions/plugin-host.ts`
- `src/features/async-tasks/infra/queue-events.ts`
- `src/features/async-tasks/server/operator-read-model.ts`
- `src/features/runtime-platform/seams/event-bus/contract.ts`
- `src/features/runtime-platform/seams/event-bus/default-adapter.ts`
- `src/db/schema.ts`
- `package.json`
- npm registry version checks for `next`, `drizzle-orm`, `zod`, `vitest`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package/runtime claims were verified via `package.json`, local shell, or npm registry.[VERIFIED: package.json][VERIFIED: npm registry][VERIFIED: local shell]
- Architecture: HIGH — recommendations are directly anchored to current command bus, producer seams, runtime seam, and async-task read-model patterns.[VERIFIED: src/features/platform-core/commands/bus.ts][VERIFIED: src/features/runtime-platform/seams/event-bus/default-adapter.ts][VERIFIED: src/features/async-tasks/infra/queue-events.ts]
- Pitfalls: HIGH — all major risks are explicit in locked context and visible in current code boundaries.[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md][VERIFIED: src/db/schema.ts]

**Research date:** 2026-05-22  
**Valid until:** 2026-06-21

## Planning Recommendation

**Recommend 4 plans.** 其中 **Plan 1 必须先做**；**Plan 2 与 Plan 3 可以在 Plan 1 完成后并行**；**Plan 4 必须串行收口**。

### Plan 53-01 — Event contracts + ledger/outbox foundation *(serial prerequisite)*
- Scope: 扩展 `commands/contracts.ts` execute return contract；新增 platform event schema / table / store；补 command summary 对 invalidation / failure attribution 的承载策略；建立 commandId-attemptNumber-event linkage。[VERIFIED: src/features/platform-core/commands/contracts.ts][VERIFIED: src/db/schema.ts]
- Covers: **EVNT-02**, **EVNT-05**, **EVNT-06 foundation**, and the storage foundation for **EVNT-01**.
- Why serial: 没有这一层，后续 handler event emission、subscriber seam、operator timeline 都没有稳定持久化目标。

### Plan 53-02 — Explicit event emission on command path *(parallel after 53-01)*
- Scope: 让 plugin governance handlers 显式返回 generic/domain events；bus 在 success/failure path 持久化这些事件；失败路径只写通用失败事件。[VERIFIED: src/features/platform-core/commands/handlers/plugins.ts][VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md]
- Covers: **EVNT-01**, closes command-side semantics for **EVNT-02**, and contributes to **EVNT-03** / **EVNT-05**.
- Parallel note: 可以和 Plan 53-03 并行，只要两边都建立在 Plan 53-01 已稳定的 ledger contract 之上。

### Plan 53-03 — In-process subscriber seam + future adapter bridge contract *(parallel after 53-01)*
- Scope: 新增 platform event bus / subscriber registry / in-process adapter；定义 Redis/WebSocket bridge interface 和 ownership description，但不做完整 delivery。[VERIFIED: src/features/runtime-platform/seams/event-bus/contract.ts][VERIFIED: src/features/runtime-platform/seams/event-bus/default-adapter.ts]
- Covers: **EVNT-03**, **EVNT-04**, and metadata continuity for **EVNT-05**.
- Parallel note: 这份 plan 可与 53-02 并行，因为它主要锁定 seam/interface；最终接线在 Plan 53-04 汇合。

### Plan 53-04 — Operator execution summary + verification gate *(serial closeout)*
- Scope: 建 command-first read model / timeline DTO / minimal operator surface extension；补 `verify:phase53` 和 focused tests；确认 invalidation intent/failure attribution 对 operator 可见。[VERIFIED: src/features/async-tasks/server/operator-read-model.ts][VERIFIED: package.json]
- Covers: **EVNT-07**, closes **EVNT-06**, and verifies **EVNT-01..EVNT-05** end-to-end.
- Why serial: 需要消费 Plan 53-02 的事件语义与 Plan 53-03 的 delivery seam 最终形状，才能避免读面漂移。

**Net recommendation:** 不建议只拆 2 份，因为会把“truth contract / emission semantics / adapter seam / operator read model”揉在一起，planner 很难并行；也不建议拆 5+ 份，因为本 phase 边界已被锁得很窄，过碎会增加协调成本。[VERIFIED: .planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md][VERIFIED: .planning/ROADMAP.md]
