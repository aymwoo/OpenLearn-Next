# Phase 50: Boundary Freeze & Platform Vocabulary - Research

**Researched:** 2026-05-21
**Domain:** platform boundary freeze, vocabulary freeze, ownership mapping
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
- QuickJS sandbox / arbitrary plugin code execution — 明确不属于 `v3.0` committed scope。
- Extension Host / external process plugin runtime — 明确 deferred，不能作为 Phase 50-54 的隐含前提。
- PostgreSQL / pgvector cutover — 继续保持 SQLite-first，不在本 milestone 偷渡数据库升级。
- Workflow Engine / Temporal — deferred；Phase 51-54 只交付 command/action/event/lifecycle 核心 contract，不引入重型 orchestration framework。
- Full Agent Runtime / Skill Runtime — deferred；`v3.0` 只做到 machine-readable contract exposure 与 delegated metadata seam。
- Distributed event bus / event sourcing rewrite — deferred；平台只补 durable outbox / ledger，不做全系统事件溯源重写。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BOUND-01 | 平台维护者可以在文档与代码中用统一 vocabulary 区分 `command`、`action`、`event`、`task`、`runtime transport`。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] | `## Summary`、`## Architecture Patterns`、`## Code Examples` 提供冻结语义、命名规则与现有锚点映射。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] |
| BOUND-02 | 平台维护者可以在 `platform-core` 层找到命令执行、action 注册、lifecycle orchestration、event outbox 的 authoritative ownership。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] | `## Architectural Responsibility Map`、`## Architecture Patterns`、`## Common Pitfalls` 规定 authoritative owner、adapter-only owner 与最小代码触点。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/ARCHITECTURE.md] |
| BOUND-03 | 系统继续把 SQLite + DAL 作为 canonical truth，并显式限制 Redis、BullMQ、WebSocket 只承担 delivery / orchestration。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] | `## Summary`、`## Don't Hand-Roll`、`## Security Domain` 冻结 truth posture 与 substrate posture。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] |
| BOUND-04 | 平台维护者可以依赖正式的 deferred 清单，防止 QuickJS、Extension Host、PostgreSQL、Workflow Engine 等高风险能力被偷偷纳入 `v3.0` committed scope。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] | `## Summary`、`## State of the Art`、`## Open Questions` 明确 named hard exclusions 与 plan guardrails。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 必须使用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite 首发。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- UI 组件禁止直连数据库；所有读写必须通过 DAL 和 Server Actions。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- Node.js 20.9+ 为主；Edge Runtime 仅用于 SSE 实时同步。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- Next.js 16 必须显式缓存；写入后必须更新或失效 tag。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 首发只针对 SQLite，所有关联必须 cascade delete。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 课堂广播使用 SSE，支持 locked/unlocked。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 插件禁止 `eval()`、动态执行第三方代码、直接访问 DB 或核心 API。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 页面实现必须参考 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 本仓库要求通过 GSD workflow 进行改动；本次用户明确要求生成研究产物，因此只写规划文档，不做产品代码实现。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md] [VERIFIED: user prompt]
- 项目 skills 目录中仅发现 `web-design-engineer`，它面向视觉前端交付，不适用于本 phase 的 boundary-freeze 研究，因此本研究不引入额外 skill 约束。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.agents/skills/web-design-engineer/SKILL.md]

## Summary

Phase 50 最重要的现实判断是：它不是“先搭一个轻量 platform-core 骨架”，而是“先冻结未来 platform-core 必须遵守的边界地图”。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] 当前仓库里，`src/actions/plugin-actions.ts` 仍以 Server Actions 直调 plugin DAL，`src/lib/dal/plugins.ts` 同时承载持久化、lifecycle transition、hook run 与治理审计，`src/server/plugins/registry.ts` 仍以 allowlist + switch 承载静态实现分发，runtime event seam 明确把 `classroom-session-write-path` 作为 truth owner，async task registry/enqueue 则已经把 task 建模成 deferred orchestration unit。 [VERIFIED: codebase src/actions/plugin-actions.ts] [VERIFIED: codebase src/lib/dal/plugins.ts] [VERIFIED: codebase src/server/plugins/registry.ts] [VERIFIED: codebase src/features/runtime-platform/seams/event-bus/contract.ts] [VERIFIED: codebase src/features/async-tasks/server/registry.ts] [VERIFIED: codebase src/features/async-tasks/server/enqueue.ts]

因此，Phase 50 应产出的是一套足以约束后续 Phase 51-54 的**权威输入包**：冻结 vocabulary、冻结 authoritative ownership map、冻结 canonical truth posture、冻结 named deferred wall，并把“现有入口只是 future adapter / static catalog / runtime seam / task substrate”这件事写到后续 planner 无法误读的程度。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/SUMMARY.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/ARCHITECTURE.md] 由于 `src/features/platform-core/` 目前尚不存在，本 phase 最低风险的代码侧动作应当只是**最小锚点化**：例如放置 type-only / comment-only / TODO-owned future authority markers，或在现有入口文件中明确 adapter-only posture，而不是开始实现 bus、registry、outbox 或 lifecycle orchestrator。 [VERIFIED: glob src/features/platform-core/** returned no files] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md]

**Primary recommendation:** 把 Phase 50 规划成“文档为主、最小代码锚点为辅”的 boundary contract phase；至少拆成 2 个 plan，分别覆盖权威文档冻结与最小代码锚点冻结，若 planner 希望降低 review blast radius，可拆成第 3 个 deferred wall / cross-phase handoff plan。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/PITFALLS.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/SUMMARY.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Vocabulary truth (`command/action/event/task/runtime transport`) | Planning docs + `platform-core` future authority | Existing code anchors | 本 phase 的主要责任是冻结术语，而不是执行业务逻辑；术语要先在权威文档中定死，再由 future `platform-core` 消费。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] |
| Command execution ownership | `src/features/platform-core/commands` future tier | Server Actions / plugin host / async processors as producers | 上游已锁定 `platform-core` 为 authoritative orchestration layer，而 `Server Actions`、plugin host、async task processors 只是 future command producers。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] |
| Plugin persistence and transaction truth | DAL (`src/lib/dal/plugins.ts`) | `platform-core` handlers | 当前 DAL 已持有 SQLite transaction、DTO shaping、lifecycle transition 写入等事实；Phase 50 只把它重新定性为 domain DAL。 [VERIFIED: codebase src/lib/dal/plugins.ts] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] |
| Static action implementation catalog | `src/server/plugins/registry.ts` | future dynamic action registry projection | 现有 registry 是 allowlist + switch 分发，适合作为 static implementation catalog，不适合作为 discoverability/lifecycle/conflict authority。 [VERIFIED: codebase src/server/plugins/registry.ts] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] |
| Runtime transport truth | runtime classroom write path | runtime event bus / runtimeEventOutbox | runtime event ownership contract 已显式写明 `classroom-session-write-path` 为 source of truth，delivery 不转移 SQLite truth ownership。 [VERIFIED: codebase src/features/runtime-platform/seams/event-bus/contract.ts] [VERIFIED: codebase src/features/runtime-platform/seams/event-bus/default-adapter.ts] |
| Deferred execution truth | async task ledger in SQLite | BullMQ queue job | `enqueueAsyncTask()` 先写 SQLite `asyncTasks` / `asyncTaskEvents`，再请求 queue dispatch，证明 queue 是 orchestration substrate 不是 canonical truth。 [VERIFIED: codebase src/features/async-tasks/server/enqueue.ts] |
| Platform event truth | future `platform-core/events` + dedicated platform outbox | delivery adapters | Phase 50 明确要求 Phase 53 新增独立 platform event outbox，不得直接复用 runtimeEventOutbox。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] |

## Standard Stack

### Core
| Library / Artifact | Version | Purpose | Why Standard |
|--------------------|---------|---------|--------------|
| Existing planning artifacts (`CONTEXT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`) | current repo state | Freeze authoritative vocabulary, ownership, and deferred wall | 本 phase 的 requirement 都是 boundary contract，不是 runtime feature；这些 planning artifacts 已是当前 milestone truth source。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/STATE.md] |
| Next.js Server Actions + cache invalidation boundary | 16.2.6 docs checked | Preserve current entrypoint semantics while marking them future command producers | 当前 `plugin-actions.ts` 使用 Server Actions + `updateTag()`；官方文档确认 `updateTag()` 只能在 Server Actions 中调用，因此后续 command bus 不能把 `updateTag()` 下沉进通用内核。 [VERIFIED: codebase src/actions/plugin-actions.ts] [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag] |
| Existing Drizzle + SQLite schema anchors | current repo state | Ground ownership map in real durable tables | `pluginRegistrations`、`pluginLifecycleTransitions`、`runtimeEventOutbox` 已是当前 durable anchors；Phase 50 应冻结其角色，不新建第二真相源。 [VERIFIED: codebase src/db/schema.ts] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] |
| Existing Zod contract style | current repo state | Mirror current contract vocabulary style if a minimal code anchor is added | runtime event bus 和 async task registry 都以 Zod schema 表达 contracts，说明未来 `platform-core` contract 也应沿用现有风格。 [VERIFIED: codebase src/features/runtime-platform/seams/event-bus/contract.ts] [VERIFIED: codebase src/features/async-tasks/server/registry.ts] |

### Supporting
| Library / Artifact | Version | Purpose | When to Use |
|--------------------|---------|---------|-------------|
| Minimal TypeScript code anchors under `src/features/platform-core/` | not yet present | Give later phases a stable import/location target without pre-implementing logic | 仅当 planner 需要代码侧锚点来满足 BOUND-02 时使用；应保持 type-only / comment-only / export-only posture。 [VERIFIED: glob src/features/platform-core/** returned no files] |
| Existing code anchors (`plugin-actions.ts`, `dal/plugins.ts`, `server/plugins/registry.ts`, runtime event seam, async registry/enqueue) | current repo state | Annotate adapter-only, static-catalog-only, runtime-only, task-only posture | 这些文件已经承载真实职责，最适合作为 boundary freeze 的引用对象。 [VERIFIED: codebase src/actions/plugin-actions.ts] [VERIFIED: codebase src/lib/dal/plugins.ts] [VERIFIED: codebase src/server/plugins/registry.ts] [VERIFIED: codebase src/features/runtime-platform/seams/event-bus/contract.ts] [VERIFIED: codebase src/features/async-tasks/server/enqueue.ts] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Docs-first + minimal code anchors | Immediate `platform-core` implementation scaffold | 会把 boundary freeze 提前变成 Phase 51/52 的实现启动，触发 scope creep 与 review 混线。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/PITFALLS.md] |
| Explicit named deferred wall | Generic “out of scope for now” wording | 抽象表述不足以阻止 QuickJS、Extension Host、PostgreSQL、Workflow Engine 等高风险项被偷渡进 `v3.0`。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] |
| Authority map anchored to existing files | Abstract ADR without code references | 纯抽象 ADR 容易与现有入口脱节，planner 无法准确给 adapter migration 排任务。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/ARCHITECTURE.md] |

**Installation:**
```bash
# No package installation required for Phase 50.
```

**Version verification:** Next.js official docs fetched in-session report `updateTag` and `proxy` pages at version `16.2.6`, last updated `2026-05-19`. [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag] [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/proxy]

## Architecture Patterns

### System Architecture Diagram

```text
Locked decisions / requirements / milestone research
  -> Phase 50 authoritative freeze docs
      -> vocabulary glossary
      -> ownership map
      -> canonical truth posture
      -> named deferred wall
  -> minimal code anchors (optional, no runtime logic)
      -> plugin-actions.ts marked as future command producer adapter
      -> dal/plugins.ts marked as plugin domain DAL only
      -> server/plugins/registry.ts marked as static implementation catalog only
      -> runtime event seam marked runtime-only
      -> async task seams marked task/orchestration-only
  -> downstream phases 51-54 consume the frozen map
      -> Phase 51 command bus
      -> Phase 52 action registry + lifecycle
      -> Phase 53 platform event outbox
      -> Phase 54 AI-native descriptors
```

### Recommended Project Structure
```text
.planning/phases/50-boundary-freeze-and-platform-vocabulary/
├── 50-CONTEXT.md              # locked decisions already gathered
├── 50-RESEARCH.md             # this research artifact
├── 50-01-PLAN.md              # docs / contract freeze
├── 50-02-PLAN.md              # minimal code anchors / adapter posture freeze
└── 50-03-PLAN.md              # optional: deferred wall + downstream handoff verification

src/
├── actions/plugin-actions.ts  # mark future command producer posture
├── lib/dal/plugins.ts         # mark plugin domain DAL posture
├── server/plugins/registry.ts # mark static implementation catalog posture
└── features/
    ├── runtime-platform/seams/event-bus/  # runtime-only seam posture
    ├── async-tasks/server/                # task/orchestration posture
    └── platform-core/                     # optional minimal authority anchor only
```

### Pattern 1: Docs-first boundary freeze
**What:** 用权威规划文档先冻结术语、ownership、truth posture、deferred wall，再让后续实现 phase 消费这些决议。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/SUMMARY.md]
**When to use:** 当阶段 requirement 本身是 contract / boundary / vocabulary，而不是行为实现时。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md]
**Example:**
```typescript
// Source: src/features/runtime-platform/seams/event-bus/contract.ts
export const RuntimeEventBusOwnershipSchema = z.object({
  sourceOfTruth: z.literal("classroom-session-write-path"),
  delivery: RuntimeEventBusDeliverySchema,
  posture: z.literal("default-only"),
  notes: z.array(z.string()).default([]),
});
```
这段现有代码已经在用“ownership contract”表达 runtime seam；Phase 50 应复制这种表达方式到 platform boundary 文档，而不是直接重写 runtime bus。 [VERIFIED: codebase src/features/runtime-platform/seams/event-bus/contract.ts]

### Pattern 2: Authoritative owner + adapter-only legacy seams
**What:** future authority 只声明一个；现有入口保留兼容，但被正式降级为 adapter-only / static-catalog-only / runtime-only / task-only。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md]
**When to use:** 当仓库已经存在多个半权威入口，且后续 phase 需要统一 execution boundary 时。 [VERIFIED: codebase src/actions/plugin-actions.ts] [VERIFIED: codebase src/lib/dal/plugins.ts]
**Example:**
```typescript
// Source: src/actions/plugin-actions.ts
export async function setPluginEnabledAction(data: z.infer<typeof SetEnabledSchema>) {
  const parsed = SetEnabledSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const actorId = await requireCurrentActorId();
  const result = await setPluginEnabled({ ...parsed.data, actorId });
  updateTag(cacheTags.pluginRegistry);
  updateTag(cacheTags.plugin(parsed.data.pluginId));
  return { success: true, data: result };
}
```
这个入口已经证明 Server Action 是 mutation producer；官方文档同时确认 `updateTag()` 只能留在 Server Action，因此后续统一 command boundary 时，入口层保留 invalidation，核心层只返回 intent。 [VERIFIED: codebase src/actions/plugin-actions.ts] [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]

### Pattern 3: Truth / delivery / orchestration split
**What:** durable truth 在 SQLite + DAL；delivery 在 WebSocket/SSE/runtime bus；orchestration 在 BullMQ/tasks。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] [VERIFIED: codebase src/features/async-tasks/server/enqueue.ts] [VERIFIED: codebase src/features/runtime-platform/seams/event-bus/default-adapter.ts]
**When to use:** 当 planner 需要决定某个现有系统是否可以升格为 command/event authority 时。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md]
**Example:**
```typescript
// Source: src/features/async-tasks/server/enqueue.ts
const [task] = await db.insert(asyncTasks).values({
  actorId: input.actorId,
  schoolId: input.schoolId,
  taskType: definition.taskType,
  status: input.dispatchFailureReason ? "dispatch_failed" : initialStatus,
  enqueueIntentStatus: initialEnqueueIntentStatus,
  payloadJson: payload,
}).returning();

const queue = await getAsyncTaskQueue(input.taskType);
const job = await queue.add(definition.taskType, payload, dispatchOptions);
```
这里先写 SQLite 再触发 queue，已经把 truth 与 orchestration 分开；Phase 50 只需要把这种 posture 正式命名为 `task`, 而不是把它升级成 command 或 event。 [VERIFIED: codebase src/features/async-tasks/server/enqueue.ts]

### Anti-Patterns to Avoid
- **Boundary freeze 变平台实现预热:** 在 Phase 50 就创建 bus、registry、outbox 的执行逻辑，会把 BOUND-01..04 与 CMD/ACTN/LIFE/EVNT 混成一阶段。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/PITFALLS.md]
- **只冻结术语，不冻结 owner:** 只有 glossary 没有 authority map，planner 仍会把任务散落回 `dal/plugins.ts`、`server/plugins/registry.ts`、runtime seam。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/ARCHITECTURE.md]
- **只写 future owner，不标定 current anchors:** 如果不明确现有文件降级成什么角色，后续 phase 很容易继续扩展旧 seam。 [VERIFIED: codebase src/lib/dal/plugins.ts] [VERIFIED: codebase src/server/plugins/registry.ts]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Freeze platform boundaries | New runtime framework or DI container | Existing planning docs + current code anchors | 本 phase 要解决的是 authority naming，不是新的 execution substrate。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/SUMMARY.md] |
| Canonical truth posture | Redis/BullMQ/WebSocket truth ledger | Existing SQLite + DAL truth model | 项目和上游 phase 都已锁定“不要制造第二真相源”。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/43-additional-validation-workloads-and-milestone-proof/43-CONTEXT.md] |
| Dynamic action authority | Runtime-evaluated plugin code | Static implementation catalog + future metadata registry | 插件禁止 `eval()` / remote code；现有 registry 也已经是受控代码目录。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md] [VERIFIED: codebase src/server/plugins/registry.ts] |
| Phase-50 code coverage | Full `platform-core` implementation | Minimal type/comment anchors only | `platform-core` 目录目前不存在；强行实现只会越过本 phase scope。 [VERIFIED: glob src/features/platform-core/** returned no files] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] |

**Key insight:** 本 phase 失败通常不是因为“文档不够多”，而是因为 planner 被允许继续把旧入口当半权威 seam 使用。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/PITFALLS.md]

## Common Pitfalls

### Pitfall 1: 把 boundary freeze 做成 Phase 51 的半实现
**What goes wrong:** 计划里顺手创建 `dispatch()`、handler registry、outbox schema 或 lifecycle orchestrator，导致 Phase 50 开始吞 CMD/ACTN/LIFE/EVNT scope。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/PITFALLS.md]
**Why it happens:** `platform-core` 被锁定为 authoritative layer 后，团队容易把“先建目录”误解成“先建机制”。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/ARCHITECTURE.md]
**How to avoid:** 计划中明确限制 code deliverable 为 docs references、type-only stubs、ownership comments、TODO-owned anchor exports。 [VERIFIED: glob src/features/platform-core/** returned no files]
**Warning signs:** plan task 出现 command schema、bus handler、outbox migrations、registry conflict logic 等实现性动词。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md]

### Pitfall 2: 只有 vocabulary glossary，没有 ownership remap
**What goes wrong:** 术语文档写完了，但后续 planner 仍不知道 `plugin-actions.ts`、`dal/plugins.ts`、`server/plugins/registry.ts`、runtime event seam、async enqueue 各自被定性成什么。 [VERIFIED: codebase src/actions/plugin-actions.ts] [VERIFIED: codebase src/lib/dal/plugins.ts] [VERIFIED: codebase src/server/plugins/registry.ts] [VERIFIED: codebase src/features/async-tasks/server/enqueue.ts]
**Why it happens:** glossary 容易写，authority remap 需要逐文件面对当前技术债。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md]
**How to avoid:** 必须交付一张 current-anchor-to-future-role 对照表，并让 plan task 显式覆盖这些触点。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/ARCHITECTURE.md]
**Warning signs:** deliverable 只有 markdown glossary，没有 code touchpoint matrix。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md]

### Pitfall 3: Deferred wall 写得太抽象
**What goes wrong:** 文档只说“重型升级不在本阶段”，但没有点名 QuickJS、Extension Host、PostgreSQL、Workflow Engine、full Agent Runtime、distributed event bus、event sourcing rewrite。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md]
**Why it happens:** 团队倾向用模糊措辞保留灵活性。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/PITFALLS.md]
**How to avoid:** 把 hard exclusions 直接写进 authoritative artifact，并在后续 plan acceptance 中作为排除检查项。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md]
**Warning signs:** plan 中出现“预留 sandbox / extension host / workflow runtime / pg cutover 支持”之类表述。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md]

### Pitfall 4: 把 runtime event seam 误升格成 platform event truth
**What goes wrong:** 因为已有 `runtimeEventOutbox` 与 event bus，就把它们当成 future platform event outbox 起点。 [VERIFIED: codebase src/db/schema.ts] [VERIFIED: codebase src/features/runtime-platform/seams/event-bus/contract.ts]
**Why it happens:** 名字里都有 “event”，容易发生语义偷换。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/PITFALLS.md]
**How to avoid:** 在 Phase 50 artifact 里明确写出 runtime transport 与 platform event 的双层分离。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md]
**Warning signs:** planner 打算在 Phase 53 直接复用 `runtimeEventOutbox` 表名或 ownership。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/ARCHITECTURE.md]

## Code Examples

Verified patterns from official/code sources:

### Existing mutation producer boundary
```typescript
// Source: src/actions/plugin-actions.ts
export async function transitionPluginLifecycleAction(data: z.infer<typeof TransitionPluginLifecycleSchema>) {
  const parsed = TransitionPluginLifecycleSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const actorId = await requireCurrentActorId();
  const result = await transitionPluginLifecycle({ ...parsed.data, actorId });
  updateTag(cacheTags.pluginRegistry);
  updateTag(cacheTags.plugin(parsed.data.pluginId));
  return { success: true, data: result };
}
```
这证明 Server Action 当前是 mutation 入口，同时 cache invalidation 也在入口层。 [VERIFIED: codebase src/actions/plugin-actions.ts] [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]

### Existing static implementation catalog pattern
```typescript
// Source: src/server/plugins/registry.ts
export const PLUGIN_ACTION_ALLOWLIST = [
  "addStepSuggestion",
  "annotateLesson",
  "createNotificationStub",
] as const;

export function dispatchPluginAction(input: PluginActionInput): PluginActionResult {
  switch (input.action) {
    case "addStepSuggestion":
      return { proposalType: "stepSuggestion", payload: input.payload };
    default:
      return { proposalType: "unknown", payload: input.payload, denied: true };
  }
}
```
这证明现有 registry 更像受控实现目录，而不是 future dynamic authority。 [VERIFIED: codebase src/server/plugins/registry.ts]

### Existing runtime-only ownership contract
```typescript
// Source: src/features/runtime-platform/seams/event-bus/default-adapter.ts
const ownership: RuntimeEventBusOwnership = RuntimeEventBusOwnershipSchema.parse({
  sourceOfTruth: "classroom-session-write-path",
  delivery: "in-process",
  posture: "default-only",
  notes: [
    "Event delivery is in-process only for Phase 27.",
    "Publishing does not move truth ownership away from the SQLite-backed classroom/session path.",
  ],
});
```
这正是 Phase 50 可直接借用的“ownership posture freeze”写法。 [VERIFIED: codebase src/features/runtime-platform/seams/event-bus/default-adapter.ts]

### Existing task-orchestration split
```typescript
// Source: src/features/async-tasks/server/registry.ts
export const classroomSessionSummaryTaskDefinition = createAsyncTaskDefinition({
  taskType: "classroom.session_summary",
  featureArea: "runtime",
  reliability: {
    queueName: "classroom-summary",
    attempts: 3,
    idempotency: { strategy: "task_id" },
  },
});
```
这证明 task 已被建模成 execution/orchestration unit，而不是 command/event 同义词。 [VERIFIED: codebase src/features/async-tasks/server/registry.ts]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 散落术语：action / event / task / transport 在不同子系统中局部定义 | Phase 50 要冻结单一 vocabulary，并让后续 phase 全部消费该定义。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] | Locked in context on 2026-05-21. [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] | 防止后续 planner 把 command、event、task、runtime transport 混写。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/PITFALLS.md] |
| 多入口半权威：Server Actions、DAL、registry、runtime seam、async processors 各自带一点调度语义 | `platform-core` future authority + legacy adapter posture。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] | Locked in context on 2026-05-21. [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] | 后续 phases 可以按 authority map 安全迁移，而不是重写所有入口。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/ARCHITECTURE.md] |
| runtimeEventOutbox 名称容易被误会成通用平台事件账本 | runtimeEventOutbox 继续 runtime-only；platform event outbox 后续独立新增。 [VERIFIED: codebase src/db/schema.ts] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] | Locked in context on 2026-05-21. [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] | 避免 Phase 53 把课堂 transport seam 误升格成平台事实层。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/ARCHITECTURE.md] |

**Deprecated/outdated:**
- “旧入口与未来 authority 长期并存” 这一 posture 已被研究和 context 明确否定；旧入口只允许 adapter-only 生存。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/PITFALLS.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md]
- 把 `middleware.ts` 当作当前 Next.js 术语已经过时；官方文档已改为 `proxy.ts`，并强调不要只依赖 Proxy 做 authz。 [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/proxy]

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this
> section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | None. All material claims in this research were verified against repo artifacts or official docs. | — | — |

## Open Questions (RESOLVED)

1. **RESOLVED — Phase 50 需要最小 `platform-core` 代码锚点，但只能是 contract-only。**
   - Resolution: BOUND-02 由 docs-first + minimal-code-anchor 共同满足；保留 `50-01` 作为权威文档冻结，并在 `50-02` 创建 `src/features/platform-core/contracts.ts` / `index.ts` 作为 non-executable authority anchor。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-02-PLAN.md]
   - Guardrail: 该锚点只允许 schema/type/note exports，不允许 dispatch、registry、outbox、lifecycle orchestration 实现。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/PITFALLS.md]

2. **RESOLVED — Phase 50 保持 3 个 plans。**
   - Resolution: `50-01` 负责 vocabulary / ownership docs，`50-02` 负责最小代码锚点与 legacy seam posture 注释，`50-03` 负责 deferred wall 与 downstream handoff；这样既保留 docs-first posture，也把 deferred guardrails 单独隔离，降低 review blast radius。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-03-PLAN.md]

3. **RESOLVED — 必须 code-touch 的 legacy seams 限定为四个文件；`runtimeEventOutbox` 的 durable-anchor freeze 通过 companion doc 明确冻结。**
   - Resolution: `plugin-actions.ts`、`src/lib/dal/plugins.ts`、`src/server/plugins/registry.ts`、`src/features/runtime-platform/seams/event-bus/contract.ts` 保留 comment-only code touch；`src/db/schema.ts` 不做 schema-shape 变更，但必须在 `50-OWNERSHIP-MAP.md` 中明确写出 `runtimeEventOutbox = runtime-only durable anchor, not platform event truth`，以冻结 D-50-04 的 durable anchor posture。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-01-PLAN.md]
   - Guardrail: async task seams 继续只在文档层作为 `task = deferred execution / orchestration unit` 的类比来源，不追加本 phase 代码改动。 [VERIFIED: codebase src/features/async-tasks/server/enqueue.ts]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 本 phase 不新增登录/认证机制；只冻结 future command producer 边界。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md] |
| V3 Session Management | no | 本 phase 不改 session handling；runtime transport 与 auth/session 仍由既有系统承担。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md] |
| V4 Access Control | yes | authoritative owner 只能有一个，旧入口必须 adapter-only；插件仍禁止直连 DB / 核心 API。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] |
| V5 Input Validation | yes | 后续 `PlatformCommand` / action / event / task vocabulary 都以 typed contract 进入；现有 repo 已用 Zod 表达类似边界。 [VERIFIED: codebase src/features/runtime-platform/seams/event-bus/contract.ts] [VERIFIED: codebase src/features/async-tasks/server/registry.ts] |
| V6 Cryptography | no | 本 phase 不引入新的 crypto 或 secret storage。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md] |

### Known Threat Patterns for this phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Second truth source via queue/transport promotion | Tampering | 明确 SQLite + DAL 是 canonical truth；BullMQ/Redis/WebSocket 仅是 delivery/orchestration。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] |
| Privilege bypass through legacy seams | Elevation of Privilege | 把 legacy seams 降级为 adapter-only，并在 future execution boundary 中统一 authorize。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] |
| Dynamic code execution disguised as action registry | Elevation of Privilege | registry 只做 discoverability/metadata；插件禁止 `eval()`、remote code、direct DB/API。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/ARCHITECTURE.md] |
| Audit ambiguity from mixed terminology | Repudiation | 先冻结 command/event/task vocabulary，再做 ledger/outbox/descriptor phases。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/SUMMARY.md] |

## Sources

### Primary (HIGH confidence)
- `/home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md` - locked Phase 50 decisions, ownership map, vocabulary split, deferred wall.
- `/home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md` - BOUND-01..04 requirement truth and out-of-scope list.
- `/home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md` - milestone ordering, phase dependency chain, success criteria.
- `/home/wuxf/Develop/OpenLearn-Next/.planning/research/SUMMARY.md` - first-stage platform-core convergence and phase ordering rationale.
- `/home/wuxf/Develop/OpenLearn-Next/.planning/research/ARCHITECTURE.md` - recommended `platform-core` ownership, integration cautions, build order.
- `/home/wuxf/Develop/OpenLearn-Next/.planning/research/PITFALLS.md` - boundary-freeze-specific traps and anti-patterns.
- `src/actions/plugin-actions.ts` - current Server Action mutation producer boundary.
- `src/lib/dal/plugins.ts` - current plugin DAL + lifecycle/governance/hook orchestration responsibilities.
- `src/server/plugins/registry.ts` - current static allowlist + switch dispatch model.
- `src/features/runtime-platform/seams/event-bus/contract.ts` and `default-adapter.ts` - runtime-only truth ownership contract.
- `src/features/async-tasks/server/registry.ts` and `enqueue.ts` - task registry/orchestration posture.
- `src/db/schema.ts` - existing `runtimeEventOutbox` and plugin durable anchors.
- `glob src/features/platform-core/**` - confirmed no current `platform-core` implementation files exist.

### Secondary (MEDIUM confidence)
- `https://nextjs.org/docs/app/api-reference/functions/updateTag` - official `updateTag` constraints and read-your-own-writes semantics; fetched in-session.
- `https://nextjs.org/docs/app/api-reference/file-conventions/proxy` - official `proxy.ts` convention and warning not to rely on Proxy alone for authz; fetched in-session.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 本 phase 几乎不涉及新技术选型，主要依赖现有 repo stack 与官方 Next.js 边界文档。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/SUMMARY.md] [CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]
- Architecture: HIGH - ownership map、future authority、current anchor roles 已被 CONTEXT + architecture research + codebase 三方对齐。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/ARCHITECTURE.md]
- Pitfalls: HIGH - pitfalls 文档与 Phase 50 context 对 scope creep、second truth source、event confusion 的判断高度一致。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/research/PITFALLS.md] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md]

**Research date:** 2026-05-21
**Valid until:** 2026-06-20
