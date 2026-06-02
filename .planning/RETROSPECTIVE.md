# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v3.2 — AI LessonAgent 起草闭环

**Shipped:** 2026-06-02
**Phases:** 6 | **Plans:** 29 | **Sessions:** not tracked in repo artifacts

### What Was Built
- server-only AI provider abstraction with unified facade, typed provider errors, rate limiting, and zero-leak boundaries.
- LessonAgent typed tool layer, `lesson.draft.run` command path, draft persistence into `draftLessonVersions`, and a governed review/apply/discard surface in the teacher editor.
- shared corpus, guardrails, `lesson.draft.rejected`, authoritative `verify:phase`, and closure Phase 66 that wired the real production loop end-to-end.

### What Worked
- 先把 provider/tool/draft/review/eval 各 phase 独立立住，再用 milestone audit 暴露跨 phase seam，最后集中用一个 closure phase 收口，效率很高。
- 坚持 SQLite + DAL + Command Bus 的单真相源 posture，让 AI 起草可以叠加到现有 lesson/version 模型，而不需要引入新的草稿系统。
- 用 mock-provider 自动化证明覆盖真实生成依赖缺失的 sandbox 环境，配合 Playwright 做旗标与 UI 验收，保持了 close honesty。

### What Was Inefficient
- `REQUIREMENTS.md` 和 traceability table 又一次在 close 前滞后，直到收尾 phase 和 milestone archive 才被回写成最终 shipped truth。
- sandbox 没有 provider + Redis，导致一开始错误地把真实失败归因为业务逻辑而不是基础设施缺口，多走了一轮排查。
- 自动 archive CLI 虽然生成了骨架，但输出仍需人工清理，尤其是 accomplishments 列表会混入内部修复/偏差项。

### Patterns Established
- 对 AI feature，milestone audit 必须同时检查 contract-level completion 和 production orchestration seam，单看 phase verifier 不够。
- 当 close 依赖外部基础设施时，要把“真实环境 proof”和“mocked automated proof”明确分层记录，避免以后把两者混为一谈。
- closure phase 适合专门解决 teacher trigger、跨 handler seam、traceability reconciliation 这类跨 phase 系统性断缝。

### Key Lessons
1. 真实产品链路的 blocker 往往不在单个 phase 内，而在 phase 之间的“没人负责的接缝”；milestone audit 的价值就在这里。
2. 对外部依赖型 AI 能力，close gate 必须从一开始就说明需要什么基础设施，否则最后的人类验收会退化成环境取证。

### Cost Observations
- Model mix: not tracked in repo artifacts
- Sessions: not tracked in repo artifacts
- Notable: 单 Agent 强样板策略有效地把 AI 起草这类高不确定性需求压缩成了可验证、可归档的一条链，而没有把系统拖进更大的 Agent runtime 扩张。

## Milestone: v3.0 — AI Native Educational OS Upgrade

**Shipped:** 2026-05-23
**Phases:** 5 | **Plans:** 22 | **Sessions:** not tracked in repo artifacts

### What Was Built
- Platform-core first-stage upgrade: vocabulary freeze, authoritative ownership map, deferred wall, and a unified Command Bus with durable command truth.
- Governed action registry, formal plugin lifecycle semantics, `plugin.reconcile`, persisted platform event ledger, and `/settings/labs` operator execution observability.
- Machine-readable AI-native command/action/capability descriptors, delegated audit metadata, and a minimal governed discoverability surface.

### What Worked
- 把 milestone blocker 压缩成 phase verifiers + milestone audit，让 close gate 最终可以通过可执行证据而不是口头解释完成。
- 持续坚持 SQLite + DAL 为 canonical truth，让 Command Bus、event bus 和 AI discoverability 都能在低 blast radius 下演进。
- 把 plugin governance、operator surface 和 AI discoverability 都接回同一套 governed read model，减少了“局部正确、端到端断裂”的风险。

### What Was Inefficient
- planning artifact 与代码真实状态在 close 前一度漂移，导致 Phase 53/54 verifier 通过后还需要额外补 verification 和 milestone audit 文档。
- `REQUIREMENTS.md` 没有随 phase close 自动更新，close 时还需要一次状态回填。
- `audit-open` 暴露出 5 个遗留 quick task，虽然不阻断本 milestone，但说明轻量工作项的生命周期管理还不够收口。

### Patterns Established
- 先跑 phase verifier，再跑 milestone audit，再刷新 planning artifact，最后执行 milestone close。
- 对跨 phase blocker，优先修真实产品链路，再把 verification / milestone audit artifact 同步到真实状态。
- operator-facing observability 和 AI discoverability 应复用已有 settings/labs surface，而不是另造一个新控制台入口。

### Key Lessons
1. 如果 verification artifact 不和代码同步推进，milestone close 会退化成一次“文档取证”工作，而不是纯归档动作。
2. scope-aware governed read path 一旦成立，就应该尽快收紧 scope-less fallback，避免未来新调用方绕回静态 truth。

### Cost Observations
- Model mix: not tracked in repo artifacts
- Sessions: not tracked in repo artifacts
- Notable: 平台内核升级可以在不重开主产品 blast radius 的前提下完成，只要 authoritative truth 和 adapter posture 始终保持清晰。

## Milestone: v2.3 — Async Task Platform

**Shipped:** 2026-05-20
**Phases:** 5 | **Plans:** 16 | **Sessions:** not tracked in repo artifacts

### What Was Built
- Typed async task registry, unified enqueue boundary, SQLite durable task ledger, BullMQ worker bootstrap, QueueEvents projection, and retry or recovery posture.
- Teacher/staff-visible async UX for batch import plus operator health, run detail, attempt history, and safe retry surfaces.
- Additional real workloads for scheduled reminders, classroom summary derivation, and resource-processing platform wiring.

### What Worked
- Keeping durable truth in SQLite + DAL made BullMQ integration additive instead of a new business-truth migration.
- Forcing multiple real workloads onto one platform contract exposed abstraction quality earlier than another infra-only phase would have.
- Operator surfaces and recovery posture reduced the risk that async execution would become "logs only" infrastructure.

### What Was Inefficient
- Phase 39-41 verification artifacts lagged behind shipped code, so milestone audit had to distinguish proof-chain debt from product gaps after the fact.
- The resource-processing workload reached platform wiring before teacher product trigger wiring, which made the close claim look stronger than the actual product path.
- Expected `gsd-sdk query ...` commands were still unavailable in the installed CLI, so audit and archive steps required manual fallback.

### Patterns Established
- Treat platform wiring and product-trigger proof as separate acceptance gates; one cannot stand in for the other.
- Keep teacher-facing async UX tied to business entities instead of exposing queue internals directly.
- Run milestone audit before writing close prose so code gaps and proof gaps are partitioned honestly.

### Key Lessons
1. A shared platform is not fully proven until every claimed workload has a real user or operator trigger path, not just registry and worker wiring.
2. Verification artifacts need to ship with the phase, or later milestone close work turns into forensic reconstruction.

### Cost Observations
- Model mix: not tracked in repo artifacts
- Sessions: not tracked in repo artifacts
- Notable: multi-workload validation surfaced real product gaps without reopening the underlying platform architecture.

## Milestone: v2.2 — WebSocket Classroom Transport Cutover

**Shipped:** 2026-05-18
**Phases:** 3 | **Plans:** 9 | **Sessions:** not tracked in repo artifacts

### What Was Built
- WebSocket-first classroom transport with authenticated handshake, typed envelopes, and WS-first teacher or student runtime surfaces.
- Optional `ioredis` fanout with session-scoped transport snapshot, local-only default posture, and degraded operator visibility.
- Canonical close chain built from `verify:phase36`, `verify:phase37`, `verify:phase38`, plus fallback matrix, parity proof, demo runbook, and closeout artifact.

### What Worked
- Phase-specific verifiers made the milestone claim executable instead of prose-only.
- Keeping Redis and WebSocket as delivery-only layers prevented the cutover from breaking DAL truth ownership.
- Repo-local demo and fallback docs turned reviewer or operator handoff into a repeatable path.

### What Was Inefficient
- Phase 37 and Phase 38 work reached the working tree before the archive or tag pass, so milestone close had to reconcile implementation state and archive state together.
- The expected `gsd-sdk query ...` workflow commands were not available in the installed CLI, so audit steps required manual fallback and explicit risk acceptance.

### Patterns Established
- Use a layered close chain: implementation verifier -> capability verifier -> milestone verifier.
- Treat transport adapters as delivery layers only; durable truth stays in DAL + canonical write paths.
- Document fallback posture and operator observation points as first-class milestone artifacts, not as handoff folklore.

### Key Lessons
1. Infra cutovers close cleanly only when rollback posture is documented as explicitly as the happy path.
2. Optional distributed delivery must surface degraded truth to operators instead of hiding it behind local success.

### Cost Observations
- Model mix: not tracked in repo artifacts
- Sessions: not tracked in repo artifacts
- Notable: tight phase summaries plus verifier scripts made same-day closeout feasible.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v3.2 | not tracked | 6 | Turned the AI-native platform contracts into a real LessonAgent draft/review/publish loop and established milestone-audit-driven closure for cross-phase seams. |
| v3.0 | not tracked | 5 | Established the first-stage AI-native platform core: command bus, governed action and lifecycle model, persisted platform events, and machine-readable contracts. |
| v2.3 | not tracked | 5 | Established a reusable async task platform and exposed the difference between platform wiring and real product-trigger proof. |
| v2.0 | not tracked | 6 | Established runtime-platform foundations inside the main repo without a big-bang rewrite. |
| v2.1 | not tracked | 3 | Reframed milestone close around safety gates and honest backlog partition. |
| v2.2 | not tracked | 3 | Unified transport cutover, optional Redis fanout, and a single external close gate. |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v3.2 | focused suites + `verify:phase` + closure e2e + Playwright visual proof | not tracked | not tracked |
| v3.0 | focused suites + `verify:phase52/53/54` + milestone audit | not tracked | not tracked |
| v2.3 | focused suites + `42/43-VERIFICATION` + milestone audit | not tracked | not tracked |
| v2.0 | focused suites + phase verifiers | not tracked | not tracked |
| v2.1 | focused suites + `verify:phase35` | not tracked | not tracked |
| v2.2 | focused suites + `verify:phase36/37/38` | not tracked | not tracked |

### Top Lessons (Verified Across Milestones)

1. Keep milestone claims executable through canonical verifiers and milestone audits rather than prose-only close notes.
2. Separate durable truth from delivery transport even during infrastructure migrations and AI feature growth.
3. Distinguish real product-closure gaps from proof-artifact debt before marking a milestone shipped.
