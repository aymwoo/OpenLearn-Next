# Domain Pitfalls

**Milestone:** v2.0 Runtime Platform Foundations  
**Researched:** 2026-05-15  
**Confidence:** HIGH for brownfield migration risks in the current codebase; MEDIUM for future stack choices that are still design-stage only.

## Top Pitfalls

| Pitfall | What goes wrong | Severity |
|---|---|---|
| Big-bang V2 rewrite | Existing teacher editor, launch, player, classroom, and evaluation flows regress while the new platform is still incomplete | Critical |
| Swapping PostgreSQL + Redis + WebSocket at the same time | Infra migration, state-model migration, and runtime migration fail together, making root cause impossible to isolate | Critical |
| Turning the Event Bus into the primary write path too early | Core classroom writes lose transactional guarantees, ordering, and read-your-writes behavior | Critical |
| Replacing the current lesson model with an over-generic runtime model | Existing published lesson snapshots, step payloads, launch readiness, and analytics contracts break | Critical |
| Shipping iframe/plugin runtime without a strict capability boundary | Sandbox escape, confused-deputy actions, data exfiltration, or unsafe classroom-side behavior becomes possible | Critical |
| Creating realtime split-brain between DB, Redis, SSE, and WebSocket | Teacher and student see different active step, lock state, presence, or submission counts | Critical |
| Async consumers and new runtimes bypass Next.js cache discipline | UI looks stale or contradictory after writes, especially in editor, launch, player, and classroom routes | High |
| Extracting packages/apps before domain seams are stable | The team spends the milestone moving files and fixing imports instead of delivering runtime capability | High |
| Building a platform with no concrete user win | Milestone ships “architecture” but no teacher- or student-visible value, so product confidence drops | Critical |
| Ignoring current known gaps while adding V2 complexity | Existing AUTH, DATA, and durable classroom-state weaknesses get amplified by new runtimes and integrations | Critical |

## Why They Matter Here

| Pitfall | Why it matters in OpenLearn Next right now |
|---|---|
| Big-bang V2 rewrite | This codebase already has a working step-based lesson editor, published lesson versions, PPR student player, SSE classroom runtime, evaluation flow, and analytics path. Rewriting the center of gravity before preserving these contracts would destroy already-validated product value. |
| Swapping PostgreSQL + Redis + WebSocket at the same time | Current constraints and data paths are SQLite-first, SSE-first, DAL-first, and explicit-cache-first. Doing all three infra moves together means every regression could come from schema differences, transport differences, consistency bugs, or cache bugs. |
| Turning the Event Bus into the primary write path too early | Current product correctness depends on synchronous teacher actions: publish, launch, lock/unlock, step change, progress save, submission write, evaluation capture. If these become “eventually consistent” too early, classroom trust collapses. |
| Replacing the current lesson model with an over-generic runtime model | The current product is intentionally built around linear lesson steps, published snapshots, append-only evidence, LexoRank ordering, and teacher launch preparation. A generic “runtime node” model can easily erase the exact invariants that make the existing product usable. |
| Shipping iframe/plugin runtime without a strict capability boundary | The project already forbids arbitrary plugin JS, direct DB access, direct core API access, and unsafe execution. V2 explicitly introduces iframe runtimes, plugin SDKs, AI runtimes, and tool bridges — that is the highest-risk expansion of the trust boundary so far. |
| Creating realtime split-brain between DB, Redis, SSE, and WebSocket | `CLASS-05` is still a known gap: durable classroom session state is not fully closed. Adding Redis/WebSocket before defining the durable source of truth risks making the current classroom flow less reliable, not more. |
| Async consumers and new runtimes bypass Next.js cache discipline | The current app already relies on explicit `cacheTag`, `updateTag`, `revalidateTag`, PPR, and Suspense discipline. Background consumers, runtime hosts, and cross-process updates will silently break UI freshness unless invalidation is redesigned deliberately. |
| Extracting packages/apps before domain seams are stable | The V2 plan proposes `/apps`, `/packages`, `/features`, `/plugins`, `/runtimes`. That may be right later, but the current repo is still closing product and data contracts. Re-org too early creates migration noise before interfaces are proven. |
| Building a platform with no concrete user win | The V2 doc lists HTML courseware, Reveal.js, Blockly, WASM, AI Agent class, CRDT, replay, marketplace, multi-runtime federation. If the milestone tries to “prepare for all of them,” it will likely ship none of them. |
| Ignoring current known gaps while adding V2 complexity | The project still has deferred `AUTH-01~06`, `DATA-01~05`, `CLASS-05`, and `COURSE-07`. V2 multiplies the number of boundaries that depend on authz, data contracts, auditability, and durable runtime state. |

## Prevention Strategy

| Pitfall | Actionable roadmap guardrail |
|---|---|
| Big-bang V2 rewrite | Make “compatibility mode” a hard milestone rule: V2 must run through the existing lesson → launch → classroom → evidence chain before any route replacement. Add parity tests for the five critical flows: teacher authoring, publish, launch, student runtime, classroom control. |
| Swapping PostgreSQL + Redis + WebSocket at the same time | Separate migrations by failure domain. Do **not** combine DB migration, realtime migration, and runtime-host migration in one phase. Sequence: contracts first, then persistence abstraction, then optional infra adoption behind feature flags. |
| Turning the Event Bus into the primary write path too early | Keep transactional command handling in DAL/Server Actions. Introduce an outbox pattern: write primary state first, emit event after commit, use consumers only for derived work at first (analytics, notifications, replay, audit). Do not put classroom correctness on async consumers in the foundation milestone. |
| Replacing the current lesson model with an over-generic runtime model | Keep the current linear step model as the system of record. Add a new `runtimeKind` / `runtimeManifestVersion` extension point on steps instead of replacing `content/task/quiz` or published snapshots. One runtime-capable step type is enough for the milestone. |
| Shipping iframe/plugin runtime without a strict capability boundary | Freeze a versioned bridge contract before building runtimes: signed handshake, origin checks, session-scoped capability token, allowlisted bridge methods, auditable message schema, no secrets in iframe payload, no `allow-same-origin`, no direct network credentials. Treat the host as an API gateway, not a pass-through. |
| Creating realtime split-brain between DB, Redis, SSE, and WebSocket | Define truth layers explicitly: DB = durable truth, Redis = ephemeral fanout/presence only, SSE/WebSocket = delivery channel only. Keep SSE as the default classroom transport until WebSocket has parity tests and rollback support. Never let Redis become the only truth for active step or lock state. |
| Async consumers and new runtimes bypass Next.js cache discipline | Create a central invalidation matrix before implementation. Every write/event must declare affected tags and downstream read models. Add end-to-end tests for teacher edit → publish → launch → student/player/classroom refresh. If a background worker mutates primary state, it must also own invalidation or enqueue a revalidation action. |
| Extracting packages/apps before domain seams are stable | Use an anti-corruption layer first, file moves second. Extract only packages that already have stable interfaces (`permissions`, `shared-types`, `plugin-manifest-schema`, maybe `runtime-bridge`). Do not split the repo into many apps/runtimes until one runtime pilot is proven. |
| Building a platform with no concrete user win | Define milestone success as one visible, shippable scenario: **a teacher can launch one sandboxed runtime-based lesson step inside the existing classroom flow without breaking current students**. Explicitly defer marketplace, CRDT, multi-runtime federation, plugin store, and generic AI runtime orchestration. |
| Ignoring current known gaps while adding V2 complexity | Add a mandatory safety phase before V2 expansion: close or narrow `AUTH`, `DATA`, and `CLASS-05` gaps enough that V2 has solid identity, DTO, audit, and durability guarantees. If that phase is skipped, the roadmap should not authorize external runtime or plugin execution work. |

### What the roadmap should explicitly NOT overbuild

- 不要在 foundation milestone 同时做 plugin marketplace、multi-runtime federation、CRDT 协作、AI runtime ecosystem、pgvector/MinIO 全量落地。
- 不要把现有 lesson/classroom domain 一次性抽象成“通用 runtime graph”。先证明一个 runtime step 能挂接到当前课堂闭环。
- 不要为了“企业级”提前把每个目录都拆成多 app / 多 package。先把边界跑通，再做结构优化。
- 不要把 WebSocket 视为自动优于 SSE。当前课堂控制是教师单向广播优先，先保正确性，再升 transport。
- 不要让 event bus 承担同步业务真相源角色。它先做派生、审计、通知，不先做核心课堂控制。

## Which Phase Should Address It

| Pitfall | Which phase should address it |
|---|---|
| Big-bang V2 rewrite | **Phase 0: Compatibility Baseline & Regression Harness** — 先冻结现有关键用户流，建立 parity test、feature flag、回滚面。 |
| Swapping PostgreSQL + Redis + WebSocket at the same time | **Phase 1: Contract Boundary & Infrastructure Sequencing** — 先定义哪些能力可以后插拔，禁止同一 phase 同时切三条底座。 |
| Turning the Event Bus into the primary write path too early | **Phase 2: Outbox & Derived Event Pipeline** — 先让事件系统服务于 analytics/notifications/replay，再决定是否扩大职责。 |
| Replacing the current lesson model with an over-generic runtime model | **Phase 1: Step Contract Extension Design** — 在现有 step/published snapshot 上加 runtime extension，而不是重写 lesson domain。 |
| Shipping iframe/plugin runtime without a strict capability boundary | **Phase 3: Runtime Host Security Envelope** — 先完成 bridge versioning、capability token、sandbox/CSP/message audit，再接入真实 runtime。 |
| Creating realtime split-brain between DB, Redis, SSE, and WebSocket | **Phase 4: Realtime Truth Model & Transport Evolution** — 先定义 durable truth + transport role，再决定 WebSocket 是否替换或补充 SSE。 |
| Async consumers and new runtimes bypass Next.js cache discipline | **Phase 2: Cache/Invalidation Matrix** + **Phase 4: Cross-process freshness tests** — 把 cache discipline当成架构项，不是收尾修 bug。 |
| Extracting packages/apps before domain seams are stable | **Phase 1: Anti-corruption Layer First** — 只在接口稳定后做 package extraction；结构重组不能先于契约稳定。 |
| Building a platform with no concrete user win | **Phase 5: Pilot Runtime Deliverable** — 该 phase 必须交付一个真实课堂可运行场景，而不是仅交付底层设施。 |
| Ignoring current known gaps while adding V2 complexity | **Pre-Phase / Safety Gate: Foundation Gap Closure** — 至少收紧 AUTH、DATA、CLASS-05 的最危险部分，否则禁止进入外部 runtime/plugin execution。 |

## Sources

- `.planning/PROJECT.md` — current constraints, validated product scope, known gaps, and non-negotiable architecture rules.
- `.planning/STATE.md` — current working product posture, historical phase decisions, and active blockers.
- `.planning/REQUIREMENTS.md` — unfinished AUTH/DATA/CLASS durability requirements and v2 deferrals.
- `.planning/ROADMAP.md` — existing phase structure and current product reality.
- `OpenLearn-Next-V2-Architecture-Plan.md` — proposed V2 target architecture and migration ambition.
- `AGENTS.md` — stack constraints and current recommended implementation posture.
