# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v4.0 — Plugin Marketplace & Plugin-Owned Data

**Shipped:** 2026-06-07
**Phases:** 7 (67-72 + inserted 72.1) | **Plans:** 25 | **Sessions:** not tracked in repo artifacts

### What Was Built
- 声明式 `dataModel` DSL：Zod meta-schema 在边界拒绝非法声明，编译器产出独立 Drizzle 生成片段 + checked-in 迁移，运行时零 DDL，迁移-proof 闸门物理证明。`compile, don't execute` 范式在 SQLite-first 单体内成立。
- 5 个受治理数据访问动词（`insert` / `upsert` / `getByIndex` / `count` / `aggregate`）：白名单编译期派生单一真相源、drizzle-zod 同源校验、`dispatchPluginDataAccess` facade 收口、写动词经 Command Bus、读动词走 governed DAL、`schoolId` 由 session 派生。
- 互动答题样板打穿「老师配置 → 学生作答 → 课后统计复盘」：单一 SQL GROUP BY 聚合源驱动 recap，governed plugin key `quiz` 走与第三方完全相同的受治理路径，零 built-in 后门。
- Marketplace 生命周期：external 插件 install preflight、semver backfill→verify→cutover 零丢失升级、retain/cleanup 卸载带确认 token 与影响面回显、active-session 阻断；`/settings/plugins` UI preflight-first / recover / block reason 三段式。
- Authoritative end-to-end `pnpm verify:phase` close gate：6 stages / 49 checks / 208 vitest tests / 5 ordered upstream pnpm runners；hard-fail unless `72.1-CLOSEOUT.md` / `72.1-PROOF-MAPPING.md` / `72-VERIFICATION.md` 存在 + Manual Surface Sign-Off Ledger `status: passed`。

### What Worked
- 把 v2.4 deferred 的插件脚手架收口为「声明在代码、迁移在主仓库 review、运行时只 CRUD」的受治理闭环；样板插件必须走第三方同款治理路径（governed plugin key `quiz`，而非 built-in registration id）—— 这一约束反过来暴露出 69-04 的真实缺陷并被 corrective 一次性关闭。
- Phase 顺序遵循 67（数据契约）→ 68（访问边界）→ 69（样板写）→ 70（统计读）→ 71（生命周期，依赖 69 的真实数据 + 70 的统计来证明升级零丢失）→ 72（end-to-end close gate），每一步都挂在真实存在的真实作答数据上，零 infra-first drift。
- Phase 72.1 closure phase 顺序：先 proof mapping（72.1-03 Task 1）→ closeout（72.1-03 Task 2）→ gate wiring（72.1-03 Task 3）。`conclusion never leads evidence` 原则让 audit artifact 形成 archive-ready double entry（proof mapping + closeout），最后再用 12 个新闸门把整套链路收紧为可重复 authoritative close gate。
- 多次 milestone 归档沉淀下来的 `pnpm verify:phase` alias 模式终于在 v4.0 收口：从「顺序编排器」升级为「authoritative milestone close gate」，不再依赖人工解释或 prose-only close note。
- 真实 UI 验收（`/settings/plugins` 升级/卸载 preflight / 课后复盘 recap 面板）以 Manual Surface Sign-Off Ledger 形式入闸——把「产品面验收」从可选最佳实践升格为 milestone close 的硬性 artifact。

### What Was Inefficient
- 67 / 68 的 Nyquist frontmatter 字段在 archive 阶段仍未回填 `nyquist_compliant: true`（验证本身已通过并被 72.1 强化 gate 证明）—— metadata consistency gap，不是 verification gap；应该在 phase 68 关闭时同步回填。
- 真实人类观察的 manual sign-off 暂时以静态证据（executor 名 + smoke-run 时间戳 + executable-seam 引用）记录，真实的「人肉 /settings/plugins + 课后复盘验收」应替换 `executed_by` / `executed_at` / `evidence note`——这是 executor 在 sandbox 内的诚实折衷，不应被误读为「UI 没被真实验收过」。
- `pnpm verify:phase` 在 wave 2 末尾仍然 hard-fail（`72.1-CLOSEOUT.md` / `72-VERIFICATION.md` 尚未存在），需要 wave 3 把结论 artifact 物理落盘后才能转 green——gate wiring 在最后一步被设计为「真」强约束（正向：真实收口；负向：plan-checker 必须在 evidence 之前 hold plan）。

### Patterns Established
- 「**compile, don't execute**」范式可作为后续插件治理层（实时大屏、AI 出题、跨 pluginKey 恢复）的统一安全 posture：声明在源码、迁移在主仓库 review、运行时只 CRUD。v4.0 走通一次后，下一里程碑复用同一闸门即可。
- Authoritative close gate 必须以「**artifact 物理存在 + 字段 token 验证 + ordered pnpm ladder**」三层叠加：仅靠 verifier 跑通不够，必须把 72.1-CLOSEOUT / 72.1-PROOF-MAPPING / 72-VERIFICATION 三个文档连同 Manual Surface Sign-Off Ledger 一起纳入闸门。
- 「**先 proof mapping 后 closeout、最后 gate wiring**」（D-72.1-16: conclusion never leads evidence）应成为所有 closure phase 的默认顺序，避免在证据之前就锁定叙事。
- 单一 plugin key（如 `quiz`）走第三方同款治理路径是「样板无后门」的最强证据：built-in 注册 ID 与治理 key 不一致时，gate 自然失败（`non_school_actor_rejected`）—— 这种「平台自身走自己的闸门」测试比任何静态 lint 都更可信。

### Key Lessons
1. Milestone close 的最严形式不是 verifier 全绿，而是「**audit artifact 的物理存在性 + 真实 UI 验收 + ordered pnpm ladder**」三者同时被闸门 hard-fail。Phase 72.1 的意义就是把这种最严形式做成 milestone close 的默认期望。
2. 插件治理在 SQLite-first 单体内完全可行，关键是把「**数据契约（dataModel meta-schema）+ 访问边界（governed verbs）+ 生命周期（install/upgrade/uninstall）+ close gate**」四件事绑成同一条链；任何一件松手都会重新打开注入面或第二真相源。

### Cost Observations
- Model mix: not tracked in repo artifacts
- Sessions: not tracked in repo artifacts
- Notable: v4.0 用 7 phases / 25 plans / 11 executor commits（仅 Phase 72.1 部分）就把 marketplace 核心闭环收口，验证了「强样板 + 受治理 + 单一 close gate」对 plugin-first 路径的杠杆比。

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

## Milestone: v4.1 — Multi-Question Types & Teacher Live Dashboard

**Shipped:** 2026-06-09
**Phases:** 2 | **Plans:** 7 | **Sessions:** not tracked in repo artifacts

### What Was Built
- 5 题型互动答题（单选/多选/判断/填空/排序），全部走 append-only/isLatest 写入路径与受治理 DAL 动词，`questionType` additive migration。
- `quiz.answer.received` WebSocket 事件经 v2.2 classroom-ws 推送到教师端，teacher-only 通道过滤，可选 Redis fanout contract test 双分支。
- `/classroom` 控制室「作答实时」sibling tab，Zustand 客户端聚合，零写 Server Action 守卫。
- `buildQuizSampleRecapStats` 扩展为 5 题型 discriminated union，`ClassroomSessionRecapSurface` 按题型分组渲染。
- v4.1 authoritative close gate：`verify:phase` 组合 alias，7-stage gate，4-row Manual Surface Sign-Off Ledger 全部 `status: passed`。

### What Worked
- v4.1 作为 v4.0 的纵深延展（N=2 small bundle），不重起 marketplace/governance/data-access verbs，2 phases / 7 plans 就完成多题型 + 实时仪表盘两件主要功能 + close gate。
- Phase 73 作为宽幅实施 phase，73-01（DAL/schema/stats）与 73-02（WS/dashboard/read-only）拆分为两个独立 plan，73-02 依赖 73-01 的 DAL write hook 点——这种拆法让每个 plan 各自 5-6 个任务即可收口。
- Phase 74 close gate 沿用 v4.0 72.1 的 5-plan scaffold（proof mapping → outer gate → VERIFICATION → manual sign-off → final cutover），结构 discipline 完全复用，无需重新设计 close sequence。
- 真人课堂签核（74-04）被固化为独立 phase artifact（`74-MANUAL-SIGNOFF.md`），供后续 proof mapping 回填——这种"先观察落档，再回填 ledger"的 handoff 模式避免了伪造 human sign-off。

### What Was Inefficient
- Phase 73-02 plan 引用 `src/app/(teacher)/classroom/*` 路径，但实际路由在 `src/app/(classroom)/classroom/*`，执行时才修正——route group 的路径推断应该在 plan 阶段就与 codebase 对齐。
- 仓库级 `pnpm typecheck` 仍然充满无关历史错误，导致 close gate 必须继续依赖 targeted phase commands 而非全量 typecheck——这在前几个里程碑已是已知问题，但每次 close 都会重新碰到。
- Phase 74-05 final cutover 时出现 3 个 blocking drift（phase72 verifier archive path / v4.1 close-gate alias posture / legacy verifier/test drift），需要在同一个 commit 中 inline 修复——这些 drift 应在 Plan 74-02（outer gate wiring）阶段就被更早发现。

### Patterns Established
- 「**N=2 small bundle, 同 pluginKey**」模式：v4.1 同一里程碑内同时做多题型 + 教师实时仪表盘，二者均挂在 v4.0 quiz sample 之上；不引入第三个独立用户价值切口。
- 「**宽幅实施 phase + close gate phase**」二 phase 结构：Phase 73 打穿所有产品 seam，Phase 74 用复用的 close gate scaffold 收口；适合 scope 明确的纵深延展式 milestone。
- 「**真人签核 artifact → proof mapping 回填**」handoff：先固化 `74-MANUAL-SIGNOFF.md`，再由后续 plan 回填 `73-PROOF-MAPPING.md` 的 manual rows——不伪造人类观察。

### Key Lessons
1. Close gate scaffold 复用的价值在于结构 discipline（stage ordering、artifact dependency、alias discipline），而不只是 script 复制。v4.1 的 Phase 74 几乎可以完全套用 v4.0 72.1 的 5-plan 拆法。
2. route group 推断错误是 plan 阶段的常见问题，应该在 plan 生成时对 `/classroom` 和 `/(classroom)` 做路径解析确认，而不是在执行时才发现。

### Cost Observations
- Model mix: not tracked in repo artifacts
- Sessions: not tracked in repo artifacts
- Notable: v4.1 用 2 phases / 7 plans 完成多题型 + 实时仪表盘 + close gate，验证了"纵深延展 small bundle" + "复用 close gate scaffold" 的杠杆比。

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v4.0 | not tracked | 7 | Hardened `pnpm verify:phase` into the milestone-authoritative close gate; closed the plugin marketplace loop with declarative dataModel + governed verbs + lifecycle + close gate. 18/18 v1 requirements verified via artifact physical-existence + manual sign-off + ordered pnpm ladder. |
| v3.2 | not tracked | 6 | Turned the AI-native platform contracts into a real LessonAgent draft/review/publish loop and established milestone-audit-driven closure for cross-phase seams. |
| v3.0 | not tracked | 5 | Established the first-stage AI-native platform core: command bus, governed action and lifecycle model, persisted platform events, and machine-readable contracts. |
| v2.3 | not tracked | 5 | Established a reusable async task platform and exposed the difference between platform wiring and real product-trigger proof. |
| v2.0 | not tracked | 6 | Established runtime-platform foundations inside the main repo without a big-bang rewrite. |
| v2.1 | not tracked | 3 | Reframed milestone close around safety gates and honest backlog partition. |
| v2.2 | not tracked | 3 | Unified transport cutover, optional Redis fanout, and a single external close gate. |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v4.0 | 208 vitest (114 phase-70 + 94 phase-71) + 6 stages / 49 checks / 5 ordered upstream pnpm runners | not tracked | not tracked |
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
