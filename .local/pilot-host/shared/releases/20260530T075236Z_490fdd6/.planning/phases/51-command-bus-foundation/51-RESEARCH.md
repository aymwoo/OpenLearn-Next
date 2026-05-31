# Phase 51: Command Bus Foundation - Research

**Researched:** 2026-05-21
**Domain:** Platform command bus, plugin governance mutation boundary, durable ledger, idempotency, producer migration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)
- Dynamic Action Registry 的 discoverability、conflict detection 与 lifecycle-gated catalog —— 属于 Phase 52，不在 Phase 51 先行交付。
- Formal Plugin Lifecycle 的依赖排序、activation snapshot、failure isolation 全量模型 —— 属于 Phase 52 的正式治理范围。
- Platform Event Bus / platform event outbox、cache invalidation intent 的统一消费与 operator-visible event summary —— 属于 Phase 53。
- lesson / runtime / workflow / AI 等非 plugin governance command families —— 不纳入 Phase 51 的实际 command coverage。
- 把 `runtimeEventOutbox`、BullMQ 或 transport substrate 直接拿来充当 command ledger / command truth —— 明确不做。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CMD-01 | 平台调用方可以提交带有 `id`、`type`、`actor`、`scope`、`payload`、`correlation metadata` 的 `PlatformCommand`。 | Use one explicit envelope contract in `platform-core`, and make Server Actions / host / worker all map into it. `[VERIFIED: codebase read src/actions/plugin-actions.ts][VERIFIED: codebase read src/features/runtime-platform/host-actions/plugin-host.ts][VERIFIED: codebase read src/features/platform-core/contracts.ts]` |
| CMD-02 | 系统会对每个 command 统一执行 `validate -> authorize -> execute -> record result` 的 pipeline。 | Reuse current entry validation posture with Zod, keep authorization before DAL mutation, and record command + attempt in one authoritative pipeline. `[VERIFIED: codebase read src/actions/plugin-actions.ts][VERIFIED: codebase read src/features/runtime-platform/host-actions/guards.ts][VERIFIED: codebase read src/lib/dal/plugins.ts]` |
| CMD-03 | 插件生命周期核心动作通过 Command Bus v1 执行，而不是继续直连旧 plugin action / service seam。 | Replace direct `plugin-actions -> plugins DAL` calls with producer adapters to explicit plugin governance handlers. `[VERIFIED: codebase read src/actions/plugin-actions.ts][VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]` |
| CMD-04 | Command Bus 会把每次执行写入 durable command ledger，并保留 success / failure summary。 | Mirror existing repo durability posture: main record + append-only history, with SQLite transaction ownership. `[VERIFIED: codebase read src/db/schema.ts][VERIFIED: codebase read src/features/async-tasks/server/recovery.ts][VERIFIED: codebase read src/lib/dal/plugins.ts]` |
| CMD-05 | `install`、`enable`、`disable`、`retry` 等重复敏感命令支持 idempotency / dedupe key。 | Implement dedupe at SQLite command boundary using unique conflict targets and shared fallback key generation, not queue-only job IDs. `[CITED: https://www.sqlite.org/lang_upsert.html][CITED: https://orm.drizzle.team/docs/insert#on-conflict-do-update][VERIFIED: codebase read src/features/async-tasks/shared/idempotency.ts]` |
</phase_requirements>

## Summary

Phase 51 不需要引入新框架；它需要把仓库里已经存在的两个成熟模式正式合并成 `platform-core` 的统一 mutation boundary：一是插件治理的领域 helper 与 append-only 审计/transition 写法，二是 async task 平台的“主记录 + attempt/history + same record retry”耐久化模式。 `[VERIFIED: codebase read src/lib/dal/plugins.ts][VERIFIED: codebase read src/db/schema.ts][VERIFIED: codebase read src/features/async-tasks/server/recovery.ts]`

对 planner 最重要的结论是：v1 Command Bus 应该是**显式 plugin governance 命令平面**，不是泛化 transition API，也不是 queue wrapper。 `plugin-actions.ts`、`plugin-host.ts`、future worker producers 都应退化为 producer adapters；唯一 authoritative mutation path 应变成 `producer -> command bus -> explicit handler -> DAL transaction -> command ledger/attempt ledger -> adapter-level cache invalidation`。 `[VERIFIED: codebase read src/actions/plugin-actions.ts][VERIFIED: codebase read src/features/runtime-platform/host-actions/plugin-host.ts][VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]`

本阶段最大的 landmine 不是“bus 写不出来”，而是继续容忍双轨 authority：旧 DAL seam 继续直写、`plugin.retry` 被做成新 command、dedupe 放到 queue jobId、或者把 `updateTag()` 塞进 bus 内核。 这些都会直接破坏 Phase 51 已锁定的 command boundary、producer unification 和 future worker/agent wiring。 `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md][VERIFIED: codebase read src/features/async-tasks/server/enqueue.ts][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]`

**Primary recommendation:** 先交付显式 envelope、registry、dual ledger、idempotency contract 与 producer adapters，再做最小范围的 plugin governance migration；不要在 Phase 51 提前扩到 lifecycle graph、event bus 或 dynamic registry。 `[VERIFIED: codebase read .planning/ROADMAP.md][VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`

## Project Constraints (from AGENTS.md)

- 必须继续使用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite 首发。 `[VERIFIED: codebase read AGENTS.md]`
- UI 组件禁止直连数据库，所有读写必须通过 DAL 和 Server Actions。 `[VERIFIED: codebase read AGENTS.md]`
- Node.js 20.9+ 是主 runtime；Edge Runtime 仅用于 SSE，Command Bus 不应依赖 Edge。 `[VERIFIED: codebase read AGENTS.md]`
- Next.js 16 缓存必须显式处理；写入后必须更新或失效 tag。 `[VERIFIED: codebase read AGENTS.md][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag][CITED: https://nextjs.org/docs/app/api-reference/functions/revalidateTag]`
- 数据库首发只针对 SQLite，所有关联必须 `onDelete: cascade`。 `[VERIFIED: codebase read AGENTS.md]`
- 插件禁止 `eval()`、动态执行第三方代码、直接访问 DB 或核心 API；插件只能走声明式权限与受限动作。 `[VERIFIED: codebase read AGENTS.md]`
- 本仓库当前没有适用于本阶段后端研究的 project skill rule 需要额外套用；仅发现 `.agents/skills/web-design-engineer/SKILL.md`，其作用域是视觉前端产物，不适用于 Command Bus/Foundation 研究。 `[VERIFIED: codebase read .agents/skills/web-design-engineer/SKILL.md]`

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Command producer adapter (`Server Actions`) | Frontend Server (SSR) | Browser / Client | Server Actions own input parsing, actor resolution, and `updateTag()` read-your-writes behavior; browser only submits intent. `[VERIFIED: codebase read src/actions/plugin-actions.ts][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]` |
| Command producer adapter (`plugin host`) | API / Backend | Frontend Server (SSR) | Host actions already execute in trusted server code and should dispatch commands instead of mutating runtime/plugin state directly. `[VERIFIED: codebase read src/features/runtime-platform/host-actions/plugin-host.ts]` |
| Command producer adapter (`worker / async producer`) | API / Backend | Database / Storage | Worker-side retries and enqueue logic are orchestration-only; mutation authority must still end in SQLite-backed command handlers. `[VERIFIED: codebase read src/features/async-tasks/server/enqueue.ts][VERIFIED: codebase read src/features/async-tasks/server/recovery.ts]` |
| Command validation + authorization pipeline | API / Backend | Database / Storage | Authorization and policy belong in server code before DAL writes, with DB only persisting the result. `[VERIFIED: codebase read src/features/runtime-platform/host-actions/guards.ts][VERIFIED: codebase read src/lib/dal/plugins.ts]` |
| Command ledger + attempt ledger | Database / Storage | API / Backend | SQLite is the canonical truth; backend orchestrates transactions and retries, but durable truth must live in DB tables. `[VERIFIED: codebase read .planning/PROJECT.md][VERIFIED: codebase read src/db/schema.ts]` |
| Plugin governance side effects | API / Backend | Database / Storage | Explicit handlers should call plugin DAL helpers and static catalog code, not the UI or queue layer. `[VERIFIED: codebase read src/lib/dal/plugins.ts][VERIFIED: codebase read src/server/plugins/registry.ts]` |
| Cache invalidation after successful mutation | Frontend Server (SSR) | API / Backend | `updateTag()` is Server Actions-only and `revalidateTag()` is the non-action fallback, so bus should return invalidation intent rather than importing cache APIs. `[CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag][CITED: https://nextjs.org/docs/app/api-reference/functions/revalidateTag]` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | `16.2.6` `[VERIFIED: npm registry][VERIFIED: package.json]` | Server Actions producer adapters and cache invalidation entrypoints | `updateTag()` is Server Actions-only and gives read-your-own-writes semantics, which matches this repo's “entrypoint owns cache invalidation” rule. `[CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]` |
| Drizzle ORM | `0.45.2` `[VERIFIED: npm registry][VERIFIED: package.json]` | SQLite transactions, unique indexes, upsert-based dedupe | Drizzle already backs the repo and exposes SQLite transaction behavior plus `onConflictDoUpdate` / `onConflictDoNothing`, which is the right primitive for command dedupe rows. `[CITED: https://orm.drizzle.team/docs/transactions][CITED: https://orm.drizzle.team/docs/insert#on-conflict-do-update]` |
| SQLite | repo canonical DB `[VERIFIED: codebase read AGENTS.md][VERIFIED: codebase read .planning/PROJECT.md]` | Command truth, dedupe truth, attempt history | SQLite supports one writer at a time, explicit transaction modes, and UPSERT on uniqueness constraints, so dedupe must be DB-backed and transactions should stay short. `[CITED: https://www.sqlite.org/lang_transaction.html][CITED: https://www.sqlite.org/lang_upsert.html]` |
| Zod | `4.4.3` `[VERIFIED: npm registry][VERIFIED: package.json]` | Command envelope and handler payload validation | Current repo already parses action/host/task contracts with Zod, so Command Bus should reuse the same boundary-validation discipline. `[VERIFIED: codebase read src/actions/plugin-actions.ts][VERIFIED: codebase read src/features/runtime-platform/host-actions/guards.ts][VERIFIED: codebase read src/features/async-tasks/server/registry.ts]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-auth / Auth.js v5 | `5.0.0-beta.31` `[VERIFIED: package.json]` | Authenticated human actor resolution at producer edge | Use existing session-backed actor identity at adapters; do not make bus itself discover sessions. `[VERIFIED: codebase read src/actions/plugin-actions.ts][VERIFIED: codebase read src/features/runtime-platform/host-actions/guards.ts]` |
| `@auth/drizzle-adapter` | `1.11.2` `[VERIFIED: package.json]` | Existing auth persistence layer | Relevant only because command actors are derived from the same authenticated user/session model. `[VERIFIED: codebase read package.json]` |
| BullMQ | `5.76.10` `[VERIFIED: package.json]` | Deferred producer transport only | Use only for async producer handoff; never treat queue job identity as command identity or dedupe truth. `[VERIFIED: codebase read src/features/async-tasks/server/enqueue.ts][VERIFIED: codebase read .planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Explicit command family | Generic `plugin.transition` | Simpler surface, but conflicts with locked decision D-01/D-03 and hides business intent from audit, retry, and AI-callable descriptors. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]` |
| Command row + attempt row | Single execution table | Simpler schema, but breaks locked retry semantics where `plugin.retry` must append a new attempt under one stable command identity. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]` |
| DB-backed dedupe | Queue jobId dedupe only | Queue dedupe helps dispatch, but cannot unify sync producers and async producers under one authoritative contract. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md][VERIFIED: codebase read src/features/async-tasks/shared/idempotency.ts]` |

**Installation:**
```bash
pnpm install
```

No additional dependency is required for the v1 foundation if the phase reuses the repo's existing Next.js + Drizzle + Zod stack. `[VERIFIED: codebase read package.json]`

## Architecture Patterns

### System Architecture Diagram

```text
Browser / UI intent
  -> Server Action adapter -------------------┐
Plugin host adapter --------------------------┼--> Command Bus dispatch(command)
Worker / async producer adapter -------------┘          |
                                                        v
                                              validate envelope + payload
                                                        |
                                                        v
                                              authorize actor + scope + command rules
                                                        |
                                                        v
                                              explicit handler registry by command type
                                                        |
                                         ┌--------------+--------------┐
                                         v                             v
                                command/attempt ledger write   plugin DAL helper calls
                                         |                             |
                                         └--------------+--------------┘
                                                        v
                                              single SQLite transaction commit
                                                        |
                                                        v
                                           result summary + invalidation intent
                                                        |
                         Server Action adapter -> updateTag() / non-action producer -> revalidate later
```

The authoritative path should end in one SQLite transaction that persists both business mutation and command bookkeeping together. `[VERIFIED: codebase read src/lib/dal/plugins.ts][CITED: https://www.sqlite.org/lang_transaction.html]`

### Recommended Project Structure
```text
src/
├── features/platform-core/
│   └── commands/
│       ├── contracts.ts        # PlatformCommand / result / status / metadata
│       ├── bus.ts              # dispatch() + pipeline shell
│       ├── registry.ts         # explicit command type -> handler map
│       ├── producers/          # shared adapter helpers for action/host/worker
│       └── handlers/
│           └── plugins/        # plugin.install / enable / disable / retry / ...
├── actions/                    # thin Server Action adapters only
├── features/runtime-platform/  # thin host adapters only
├── features/async-tasks/       # worker producers only, not command authority
└── lib/dal/                    # plugin domain persistence helpers
```

Keeping authoritative ownership inside `platform-core` is locked, while adapter placement remains planner discretion. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md][VERIFIED: codebase read .planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md]`

### Pattern 1: Explicit Command Envelope + Registry
**What:** One typed `PlatformCommand` contract with explicit `type`, actor, scope, payload, correlation metadata, and optional dedupe key. `[VERIFIED: codebase read .planning/REQUIREMENTS.md][VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`

**When to use:** For every producer path that requests a durable plugin governance mutation. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`

**Prescriptive shape:** Use `id`, `type`, `actor`, `scope`, `payload`, `correlation`, and optional `dedupe` on the envelope; keep business-specific fields inside typed payloads, not in a generic transition bag. `[VERIFIED: codebase read .planning/REQUIREMENTS.md][VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`

**Example:**
```typescript
// Source: official Next.js updateTag docs
'use server'

import { updateTag } from 'next/cache'

export async function createPost(formData: FormData) {
  const post = await db.post.create({
    data: {
      title: formData.get('title'),
      content: formData.get('content'),
    },
  })

  updateTag('posts')
}
```
Source: `[CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]`

### Pattern 2: Command Row + Attempt Row
**What:** Keep a stable command record for business intent and a separate append-only attempt history for retries and failure attribution. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`

**When to use:** For every command that can fail, be retried, or needs operator/audit correlation. `[VERIFIED: codebase read .planning/ROADMAP.md]`

**Recommendation:** Model the bus after the existing async task pattern: one durable primary record with `latestAttemptNumber`-style summary plus append-only attempt/event history. `[VERIFIED: codebase read src/db/schema.ts][VERIFIED: codebase read src/features/async-tasks/server/recovery.ts]`

**Example:**
```typescript
// Source: existing repo retry pattern
const previousAttemptNumber = task.latestAttemptNumber
const nextAttemptNumber = previousAttemptNumber + 1

await tx.update(asyncTasks).set({
  status: 'retrying',
  latestAttemptNumber: nextAttemptNumber,
})

await tx.insert(asyncTaskEvents).values([
  {
    taskId: task.id,
    eventType: 'task.operator_recovery_requested',
    status: 'retrying',
    attemptNumber: previousAttemptNumber,
  },
  {
    taskId: task.id,
    eventType: 'task.retry_seeded',
    status: 'retrying',
    attemptNumber: nextAttemptNumber,
  },
])
```
Source: `[VERIFIED: codebase read src/features/async-tasks/server/recovery.ts]`

### Pattern 3: Dedupe at the SQLite Boundary
**What:** Compute a dedupe key before execution and let SQLite unique constraints + UPSERT semantics decide whether the command is new or already known. `[CITED: https://www.sqlite.org/lang_upsert.html]`

**When to use:** All side-effect-sensitive plugin governance commands listed in D-07. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`

**Recommendation:** Put the dedupe key on the command row, not the attempt row, because retry appends attempts to the same business command identity. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`

**Example:**
```typescript
// Source: official Drizzle insert docs
await db.insert(users)
  .values({ id: 1, name: 'Dan' })
  .onConflictDoUpdate({ target: users.id, set: { name: 'John' } })
```
Source: `[CITED: https://orm.drizzle.team/docs/insert#on-conflict-do-update]`

### Pattern 4: Invalidation Intent, Not Cache API in the Bus
**What:** Bus handlers return a normalized invalidation intent, and only the producer adapter decides whether to call `updateTag()` or some non-action fallback. `[CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag][CITED: https://nextjs.org/docs/app/api-reference/functions/revalidateTag]`

**When to use:** Every command handler that changes cache-tagged plugin or theme state. `[VERIFIED: codebase read src/actions/plugin-actions.ts][VERIFIED: codebase read src/lib/cache-policy.ts]`

**Anti-Patterns to Avoid**
- **Generic transition command as primary surface:** This hides business intent and violates D-01/D-03. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`
- **Queue-owned idempotency:** BullMQ job IDs can help dispatch, but they cannot serve as sync+async cross-producer dedupe truth. `[VERIFIED: codebase read src/features/async-tasks/shared/idempotency.ts][VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`
- **Bus directly importing `next/cache`:** `updateTag()` is Server Actions-only, so this would make worker/host producers second-class citizens. `[CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]`
- **Handler bypassing DAL:** This would break the repo's locked DAL-only discipline and duplicate authorization/business rules. `[VERIFIED: codebase read AGENTS.md][VERIFIED: codebase read src/lib/dal/plugins.ts]`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry semantics | A fresh business command for every retry | Same command + new attempt rows | This is the already-validated repo pattern in async tasks and is explicitly locked for `plugin.retry`. `[VERIFIED: codebase read src/features/async-tasks/server/recovery.ts][VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]` |
| Dedupe | In-memory mutexes or queue-only dedupe | SQLite unique key + UPSERT / conflict handling | Only DB-backed uniqueness can unify sync Server Actions and async producers. `[CITED: https://www.sqlite.org/lang_upsert.html][CITED: https://orm.drizzle.team/docs/insert#on-conflict-do-update]` |
| Authorization surface | Ad-hoc permission checks scattered per adapter | One authorize stage in bus + existing DAL scope helpers | Repo already centralizes scope and plugin governance checks in server code. `[VERIFIED: codebase read src/features/runtime-platform/host-actions/guards.ts][VERIFIED: codebase read src/lib/dal/plugins.ts]` |
| Plugin action execution | Dynamic runtime code loading | Existing static implementation catalog in `src/server/plugins/registry.ts` | Project security rules forbid arbitrary plugin code execution. `[VERIFIED: codebase read src/server/plugins/registry.ts][VERIFIED: codebase read AGENTS.md]` |
| Cache refresh inside core | Custom cache hooks in the bus | Adapter-level `updateTag()` / later `revalidateTag()` | Official Next.js behavior is context-specific, and the repo already keeps cache invalidation at entrypoints. `[CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag][CITED: https://nextjs.org/docs/app/api-reference/functions/revalidateTag][VERIFIED: codebase read src/actions/plugin-actions.ts]` |

**Key insight:** The repo already solved the hard part twice in adjacent domains: plugin DAL solved domain mutation/audit transactions, and async tasks solved same-record retry history. Phase 51 should compose those patterns, not invent a third durability model. `[VERIFIED: codebase read src/lib/dal/plugins.ts][VERIFIED: codebase read src/features/async-tasks/server/recovery.ts]`

## Common Pitfalls

### Pitfall 1: Dual Authority Survives the Migration
**What goes wrong:** `Command Bus` exists, but `plugin-actions.ts`, host actions, or worker paths still directly call old DAL helpers for “just one more case.” `[VERIFIED: codebase read src/actions/plugin-actions.ts][VERIFIED: codebase read src/features/runtime-platform/host-actions/plugin-host.ts]`

**Why it happens:** The current repo already has functioning direct seams, so planner may under-scope real producer migration. `[VERIFIED: codebase read src/actions/plugin-actions.ts][VERIFIED: codebase read src/lib/dal/plugins.ts]`

**How to avoid:** Make producer migration part of done-criteria, not a follow-up polish item. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`

**Warning signs:** New code imports `transitionPluginLifecycle`, `setPluginEnabled`, or `uninstallPlugin` directly from non-bus entrypoints after Phase 51. `[VERIFIED: codebase read src/actions/plugin-actions.ts][VERIFIED: codebase read src/lib/dal/plugins.ts]`

### Pitfall 2: `plugin.retry` Becomes a New Business Command
**What goes wrong:** Retries create multiple command identities for the same operator intent, which breaks audit reads, dedupe analysis, and future replay/observability. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`

**Why it happens:** “New dispatch = new command row” feels natural unless retry semantics are designed first. `[VERIFIED: codebase read src/features/async-tasks/server/recovery.ts]`

**How to avoid:** Reserve stable command identity for business intent and append new attempt rows on retry. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md][VERIFIED: codebase read src/features/async-tasks/server/recovery.ts]`

**Warning signs:** Retry APIs require a full new payload instead of referencing an existing failed command and seeding a new attempt. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`

### Pitfall 3: Dedupe Key Lives at the Wrong Layer
**What goes wrong:** Deduplication is delegated to queue job IDs, transient memory, or producer-local heuristics, so sync and async producers behave differently. `[VERIFIED: codebase read src/features/async-tasks/shared/idempotency.ts][VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`

**Why it happens:** Async task code already has job IDs, so it is tempting to reuse them as command identity. `[VERIFIED: codebase read src/features/async-tasks/shared/idempotency.ts]`

**How to avoid:** Persist dedupe key on the command row with a SQLite uniqueness boundary and fallback-key derivation shared by all producers. `[CITED: https://www.sqlite.org/lang_upsert.html][CITED: https://orm.drizzle.team/docs/insert#on-conflict-do-update][VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`

**Warning signs:** A sync Server Action and an async producer can submit semantically identical `plugin.enable` requests and get different duplicate behavior. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`

### Pitfall 4: Bus Transactions Grow Too Large for SQLite
**What goes wrong:** Authorization, catalog lookup, cache work, and retries are all performed inside one long SQLite write transaction, increasing `SQLITE_BUSY` risk. `[CITED: https://www.sqlite.org/lang_transaction.html]`

**Why it happens:** Planner tries to keep “everything in one place” and confuses “single authoritative transaction” with “do every piece of work while the DB write lock is open.” `[CITED: https://www.sqlite.org/lang_transaction.html]`

**How to avoid:** Resolve actor, validate payload, and compute dedupe key before opening the shortest possible write transaction that updates domain rows + command/attempt rows together. `[CITED: https://www.sqlite.org/lang_transaction.html][VERIFIED: codebase read src/lib/dal/plugins.ts]`

**Warning signs:** Frequent `SQLITE_BUSY`, retries around simple writes, or handlers that call external queue/runtime APIs from inside the DB transaction callback. `[CITED: https://www.sqlite.org/lang_transaction.html][VERIFIED: codebase read src/features/async-tasks/server/enqueue.ts]`

## Code Examples

Verified patterns from official sources and the codebase:

### Server Action keeps cache invalidation at the edge
```typescript
'use server'

import { updateTag } from 'next/cache'

export async function createPost(formData: FormData) {
  const post = await db.post.create({
    data: {
      title: formData.get('title'),
      content: formData.get('content'),
    },
  })

  updateTag('posts')
  updateTag(`post-${post.id}`)
}
```
Source: `[CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]`

### Drizzle UPSERT for DB-backed dedupe
```typescript
await db.insert(users)
  .values({ id: 1, name: 'Dan' })
  .onConflictDoUpdate({ target: users.id, set: { name: 'John' } })
```
Source: `[CITED: https://orm.drizzle.team/docs/insert#on-conflict-do-update]`

### Existing repo pattern for same-record retry with new attempt
```typescript
const previousAttemptNumber = task.latestAttemptNumber
const nextAttemptNumber = previousAttemptNumber + 1

await tx.update(asyncTasks).set({
  status: 'retrying',
  latestAttemptNumber: nextAttemptNumber,
})

await tx.insert(asyncTaskEvents).values({
  taskId: task.id,
  eventType: 'task.retry_seeded',
  status: 'retrying',
  attemptNumber: nextAttemptNumber,
})
```
Source: `[VERIFIED: codebase read src/features/async-tasks/server/recovery.ts]`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Server Action -> plugin DAL` | `Server Action -> Command Bus producer adapter -> explicit handler -> plugin DAL` | Phase 51 target defined 2026-05-21. `[VERIFIED: codebase read .planning/ROADMAP.md][VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]` | Centralizes audit, retry, dedupe, and future producer unification. `[VERIFIED: codebase read .planning/REQUIREMENTS.md]` |
| Lifecycle transition row + audits only | Command row + attempt row + existing domain audits | Phase 51 target defined 2026-05-21. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]` | Separates business intent from execution history and matches async-task recovery semantics. `[VERIFIED: codebase read src/features/async-tasks/server/recovery.ts]` |
| Queue/job transport identity | Command-boundary dedupe identity | Vocabulary locked in Phase 50 and Phase 51. `[VERIFIED: codebase read .planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md][VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]` | Makes sync and async producers obey the same duplicate rules. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]` |

**Deprecated/outdated:**
- `plugin.transition` as the primary public mutation contract is outdated for v1 and may survive only as an internal adapter/helper seam. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`
- `runtimeEventOutbox` or BullMQ as command truth is explicitly out of date for this phase boundary. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md][VERIFIED: codebase read .planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md]`

## Assumptions Log

All substantive claims in this research were verified against repository files, official docs, or npm registry data in this session. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md][VERIFIED: npm registry][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]`

## Open Questions (RESOLVED)

1. **Resolved: `plugin.install` stays one public command and may branch internally to reuse `installOrReconcilePlugin()` semantics.**
   - What we know: Existing DAL already uses `installOrReconcilePlugin()` and `registerPluginManifest()` as the current persistence seam. `[VERIFIED: codebase read src/lib/dal/plugins.ts]`
   - Resolution: Keep one public `plugin.install` command and allow internal helper branching for manual install vs reconcile behavior, because D-01/D-02 only lock the external command family and explicitly allow planner discretion on helper split. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`
   - Planning impact: `51-02-PLAN.md` anchors `plugin.install` to the existing DAL seam through tx-aware helpers instead of inventing a second public install/reconcile contract. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-02-PLAN.md]`

2. **Resolved: command-row status stays minimal: `pending | running | succeeded | failed`.**
   - What we know: Async tasks already separate record summary from history and use a narrow summary status plus append-only events. `[VERIFIED: codebase read src/db/schema.ts][VERIFIED: codebase read src/features/async-tasks/server/recovery.ts]`
   - Resolution: Keep the command row summary intentionally small and push detailed transitions into attempt records; `51-01-PLAN.md` now hard-codes this as the schema baseline. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-01-PLAN.md]`
   - Planning impact: bus/result APIs can expose one stable summary state without coupling all producers to attempt-internal transition vocabulary. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-01-PLAN.md]`

3. **Resolved: Phase 51 extends existing plugin audits with `commandId` immediately.**
   - What we know: `pluginActionAudits` and `governanceAudits` already persist `correlationId` but not `commandId`. `[VERIFIED: codebase read src/db/schema.ts]`
   - Resolution: `51-01-PLAN.md` adds nullable `commandId` linkage columns, and `51-02-PLAN.md` requires tx-aware DAL helpers to populate them whenever command context exists. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-01-PLAN.md][VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-02-PLAN.md]`
   - Planning impact: command ledger, plugin audits, and governance audits stay attributable within the same Phase 51 rollout instead of leaving an untracked split-brain period. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-02-PLAN.md]`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Producers derive authenticated actors from existing Auth.js-backed user/session helpers before dispatch. `[VERIFIED: codebase read src/actions/plugin-actions.ts][VERIFIED: codebase read src/features/runtime-platform/host-actions/guards.ts][VERIFIED: codebase read package.json]` |
| V3 Session Management | yes | Session semantics remain outside the bus and continue to be enforced by existing Auth.js/session entrypoints. `[VERIFIED: codebase read src/actions/plugin-actions.ts][VERIFIED: codebase read src/features/runtime-platform/host-actions/guards.ts]` |
| V4 Access Control | yes | Bus must standardize `authorize` before `execute`, and plugin DAL already contains school-scope / lifecycle / permission checks that should be reused. `[VERIFIED: codebase read src/lib/dal/plugins.ts][VERIFIED: codebase read .planning/REQUIREMENTS.md]` |
| V5 Input Validation | yes | Zod is the existing contract-validation boundary for actions, host inputs, and task registry metadata. `[VERIFIED: codebase read src/actions/plugin-actions.ts][VERIFIED: codebase read src/features/runtime-platform/host-actions/plugin-host.ts][VERIFIED: codebase read src/features/async-tasks/server/registry.ts]` |
| V6 Cryptography | no | This phase does not require custom cryptographic policy; do not hand-roll signing/encryption as part of command dedupe or retry. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]` |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Legacy adapter bypasses bus and mutates plugin state directly | Elevation of Privilege / Tampering | Require all durable plugin governance writes to dispatch through explicit command handlers, with old seams reduced to thin adapters only. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]` |
| Duplicate side effects from repeated `plugin.enable` / `plugin.uninstall` requests | Tampering / Repudiation | Use DB-backed dedupe keys and stable command identity with appended attempts. `[CITED: https://www.sqlite.org/lang_upsert.html][VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]` |
| Partial auditability because business write succeeds but command record fails | Repudiation | Persist domain mutation and command bookkeeping inside one SQLite transaction. `[CITED: https://www.sqlite.org/lang_transaction.html][VERIFIED: codebase read src/lib/dal/plugins.ts]` |
| Cross-school command spoofing | Spoofing / Elevation of Privilege | Reuse school-scoped actor checks from existing action/host guards and plugin DAL scope assertions. `[VERIFIED: codebase read src/features/runtime-platform/host-actions/guards.ts][VERIFIED: codebase read src/lib/dal/plugins.ts]` |
| Plugin execution surface drifts into arbitrary code execution | Elevation of Privilege | Keep static implementation catalog and declarative permissions; do not allow dynamic code loading. `[VERIFIED: codebase read src/server/plugins/registry.ts][VERIFIED: codebase read AGENTS.md]` |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/51-command-bus-foundation/51-CONTEXT.md` — locked Phase 51 boundary, command family, dual ledger, retry semantics, dedupe scope, producer migration. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`
- `.planning/ROADMAP.md` — Phase 51 goal, requirements, success criteria, dependency chain. `[VERIFIED: codebase read .planning/ROADMAP.md]`
- `.planning/REQUIREMENTS.md` — CMD-01..CMD-05 requirement truth. `[VERIFIED: codebase read .planning/REQUIREMENTS.md]`
- `AGENTS.md` and `.planning/PROJECT.md` — non-negotiable project constraints and SQLite/DAL/security posture. `[VERIFIED: codebase read AGENTS.md][VERIFIED: codebase read .planning/PROJECT.md]`
- `src/actions/plugin-actions.ts` — current Server Action seam and cache invalidation posture. `[VERIFIED: codebase read src/actions/plugin-actions.ts]`
- `src/lib/dal/plugins.ts` — current plugin domain mutation, audit, lifecycle, uninstall, hook execution helpers. `[VERIFIED: codebase read src/lib/dal/plugins.ts]`
- `src/features/runtime-platform/host-actions/plugin-host.ts` and `guards.ts` — current host mutation/governance seam. `[VERIFIED: codebase read src/features/runtime-platform/host-actions/plugin-host.ts][VERIFIED: codebase read src/features/runtime-platform/host-actions/guards.ts]`
- `src/features/async-tasks/server/recovery.ts`, `registry.ts`, `enqueue.ts`, `src/db/schema.ts` — same-record retry pattern, attempt history pattern, and queue-not-truth posture. `[VERIFIED: codebase read src/features/async-tasks/server/recovery.ts][VERIFIED: codebase read src/features/async-tasks/server/registry.ts][VERIFIED: codebase read src/features/async-tasks/server/enqueue.ts][VERIFIED: codebase read src/db/schema.ts]`
- Next.js official docs for `updateTag` and `revalidateTag`. `[CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag][CITED: https://nextjs.org/docs/app/api-reference/functions/revalidateTag]`
- SQLite official docs for transactions and UPSERT. `[CITED: https://www.sqlite.org/lang_transaction.html][CITED: https://www.sqlite.org/lang_upsert.html]`
- Drizzle official docs for transactions, insert conflict handling, and constraints. `[CITED: https://orm.drizzle.team/docs/transactions][CITED: https://orm.drizzle.team/docs/insert#on-conflict-do-update][CITED: https://orm.drizzle.team/docs/indexes-constraints]`
- npm registry lookups for active package versions and publish dates. `[VERIFIED: npm registry]`

### Secondary (MEDIUM confidence)
- Context7 CLI output for Next.js and Drizzle doc excerpts mirrored from official sources. `[VERIFIED: bash npx ctx7 CLI output]`

### Tertiary (LOW confidence)
- None. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md]`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Phase 51 reuses already-installed repo packages and official docs/npx/npm outputs confirmed current versions and semantics. `[VERIFIED: npm registry][VERIFIED: codebase read package.json][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag][CITED: https://orm.drizzle.team/docs/transactions]`
- Architecture: HIGH - The repo already exposes all critical seams, and Phase 51 context locks the major decisions that the plan must implement. `[VERIFIED: codebase read .planning/phases/51-command-bus-foundation/51-CONTEXT.md][VERIFIED: codebase read src/actions/plugin-actions.ts][VERIFIED: codebase read src/lib/dal/plugins.ts]`
- Pitfalls: HIGH - The biggest risks are directly observable in current seams and reinforced by the locked boundary docs plus official transaction/cache semantics. `[VERIFIED: codebase read src/actions/plugin-actions.ts][VERIFIED: codebase read src/features/runtime-platform/host-actions/plugin-host.ts][CITED: https://www.sqlite.org/lang_transaction.html][CITED: https://nextjs.org/docs/app/api-reference/functions/updateTag]`

**Research date:** 2026-05-21
**Valid until:** 2026-06-20 for repo-internal patterns; 2026-05-28 for fast-moving framework/package version checks. `[VERIFIED: npm registry][VERIFIED: codebase read src/lib/dal/plugins.ts]`
