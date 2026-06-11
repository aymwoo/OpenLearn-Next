# Milestones

## v4.2 Marketplace 泛化验证 (Shipped: 2026-06-11)

**Phases completed:** 4 phases, 19 plans, 49 tasks

**Key accomplishments:**

- Commit:
- Teacher-only live quiz answer streaming now rides the existing classroom websocket transport and renders as a read-only dashboard tab inside `/classroom`.
- Phase 73 proof mapping ledger 与独立 `verify:phase73` smoke verifier 已落地，同时全局 `verify:phase` 继续冻结在 phase72。
- Thin v4.1 authoritative close gate around `verify:phase73` with 7-stage readiness reporting and frozen `verify:phase` alias.
- Phase 73 formal verification now explains the multi-type recap chain and live dashboard chain from real code and smoke verifiers, with an explicit flow-to-gate crosswalk for close-gate auditing.
- 真实 `/classroom` live-answer 与 ended recap 人工签核 payload 已持久化到独立 artifact，并与已观察 session URL 对齐。
- 真人签核账本、phase73 closeout 最终 verdict、以及 `verify:phase` 组合 alias 已在真实 final gate 通过后一起收口。
- homework 三表（assignments/submissions/grades）通过声明式 dataModel → 编译器确定性生成 Drizzle schema + allowlist，已在 external-catalog 注册，DTO 层完备。
- 一句话总结:
- 通过 dispatchPluginDataAccess facade 构建 homework DAL + Server Actions，教师 lesson-step-editor 新增作业编辑，学生 classroom player 中查看并提交作业
- 在 /classroom 控制面板新增「作业提交」sibling tab，左侧学生提交列表 + 右侧批改面板（分数 + 评语），泛化修复逐项确认通过。
- homework 插件全生命周期自动化测试（upgrade + uninstall + 重装）+ 跨插件回归体系 + pnpm verify:phase75 命令就位。
- Gap closure 修复 UAT 发现的 2 个问题，使 verify:phase75 全部通过。
- v4.2 6-stage outer gate skeleton with smoke mode readiness reporting, frozen v4.1 alias posture
- 将 v4.0 gate 回归（Stage 1）和 v4.1 quiz 多题型验证（Stage 2）从占位 skeleton 升级为真实 shell 执行接线，并实现 D-06 阻断策略
- 在 outer gate 中将 Stage 3 从占位 skeleton 升级为真实 shell 执行——消费 pnpm verify:phase75 的 exit code 判定 homework 全链路通过/失败，并在失败时阻断后续所有 stage。
- 独立的 Stage 4 跨插件回归脚本 verify:v42-cross-plugin, 编排 quiz 全量 + homework 全量 + cross-plugin dedicated suite, 并在 outer gate 中接线完成
- 产出 v4.2 formal verification report（7-section + 2 扩展）、proof mapping（8-row sign-off ledger）并在 outer gate Stage 5 中接线 artifact 存在性检查。
- One-liner:

---

## v4.1 Multi-Question Types & Teacher Live Dashboard (Shipped: 2026-06-09)

**Phases completed:** 2 phases (73-74), 7 plans, ~50 commits

**Milestone audit:** `passed`（audited 2026-06-10）；3/3 requirements, 2/2 phases, 4/4 integration seams, 2/2 user flows。

**Close posture:** `pnpm verify:phase` alias = `pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate` — 7-stage authoritative gate (v4.0 5 stages + multi-type + live dashboard), 4-row Manual Surface Sign-Off Ledger all `status: passed`.

**Key accomplishments:**

- 将 v4.0 quiz 样板从单选扩展到 5 种题型（single_choice/multi_choice/true_false/fill_blank/ordering），共用同一套 append-only/isLatest 写入路径与受治理 DAL 动词。
- 新增 `quiz.answer.received` WebSocket 事件，经 v2.2 classroom-ws 传输层推送到教师端，teacher-only 通道过滤，可选 Redis fanout contract test 双分支。
- 在 `/classroom` 控制室新增「作答实时」sibling tab，Zustand 客户端聚合（按题选项分布 + 最近 N 条作答流水），零写 Server Action 守卫，下课自动切 v4.0 recap。
- 课后统计 `buildQuizSampleRecapStats` 扩展为 5 题型 discriminated union（countByOption/countByOptionSet/countByBool/topAnswers/topOrderings），`ClassroomSessionRecapSurface` 按题型分组渲染。
- 复用 v4.0 72.1 authoritative close gate 范式：stage 5→7（多题型 + 实时仪表盘），组合 alias 顺序串联 `verify:phase72 && verify:phase73-v41-close-gate`，先 proof mapping 后 closeout 最后 gate wiring（conclusion never leads evidence）。
- 真人课堂签核落档 + 证据链收口：PROOF-MAPPING / VERIFICATION / CLOSEOUT 三件套齐全，4-row Manual Surface Sign-Off Ledger 全部 `status: passed`（v4.0 2 行 + v4.1 2 行）。

**Known deferred items at close:** 3 stale warnings (verify-phase73-v41-close-gate.test.ts stale expectation / 73-CLOSEOUT.md stale footer / 74-VALIDATION.md stale frontmatter) — non-blocking per audit; plus QUIZ-EXT-03 / MKT-EXT-01..03 / STORE-01 deferred to future milestones.

---

## v4.0 Plugin Marketplace & Plugin-Owned Data (Shipped: 2026-06-07)

**Phases completed:** 7 phases (67-72 + inserted 72.1), 25 plans, 11 executor commits (Phase 72.1) + 2 prep commits + 1 state commit on top of the 67-72 work.

**Milestone audit:** `passed`（re-audited 2026-06-07 after Phase 72.1 closure）；18/18 v1 requirements, 6/6 phases, 6/6 integration, 3/3 flows。2026-06-05 的 8 个 unsatisfied REQ-ID（STATS-01/02 + MKT-01..05 + GATE-01）与 1 个 integration gap 由 Phase 72.1 全部关闭。

**Close posture:** `pnpm verify:phase` 是 v4.0 单一外部闸门，6 stages / 49 checks / 208 vitest tests / 5 ordered upstream pnpm runners，all green。Hard-fail unless `72.1-CLOSEOUT.md` / `72.1-PROOF-MAPPING.md` / `72-VERIFICATION.md` 存在 + Manual Surface Sign-Off Ledger `status: passed`。

**Key accomplishments:**

- 交付声明式 `dataModel` DSL：Zod meta-schema 在边界拒绝非法声明（5 类具名拒因 + IDENTIFIER 正则 + unrecognized_keys），编译器把声明编译为独立 Drizzle 生成片段 + checked-in 迁移；运行时零 DDL，迁移-proof 闸门物理证明（PRAGMA / 级联 / foreign_key_check / 漂移四关）。`compile, don't execute` 范式在 SQLite-first 单体内成立。
- 落地 5 个受治理数据访问动词（`insert` / `upsert` / `getByIndex` / `count` / `aggregate`）：白名单编译期派生单一真相源 `pluginDataAccessAllowlist`、drizzle-zod 同源校验、`dispatchPluginDataAccess` facade 收口、写动词经 Command Bus、读动词走 governed DAL、`schoolId` 由 session 派生禁客户端注入、aggregate 仅投影 `{key, count}`。
- 互动答题样板打穿「老师配置 → 学生作答 → 课后统计复盘」全链：`plugin_owned_quiz_questions` + `plugin_owned_quiz_responses`（append-only / `isLatest`），governed plugin key `quiz` 走与第三方完全相同的受治理路径，零 built-in 后门；单一 SQL GROUP BY 聚合源驱动复盘。
- Marketplace 生命周期：external 插件 install preflight（manifest + `dataModel` + 命名空间唯一）+ semver backfill→verify→cutover 零丢失升级（对真实答题数据生效）+ retain/cleanup 卸载带确认 token 与影响面回显 + active-session 阻断；`/settings/plugins` UI preflight-first / recover / block reason 三段式。
- `pnpm verify:phase` authoritative close gate：6 stages / 49 checks / 208 vitest tests / 5 ordered upstream pnpm runners；强约束下 manual sign-off ledger 必须有 `status: passed` + `executed_by` + `executed_at` + `evidence note`，配 proof mapping + closeout + 72-VERIFICATION.md 形成 archive-ready double entry。
- Phase 72.1 closure phase：14 atomic commits 把 close gate 从"顺序编排器"补强为可直接支撑 audit/archive 的 authoritative close gate，先 proof mapping 后 closeout、最后 gate wiring（conclusion never leads evidence）。

**Deferred to future milestones:** 多题型（QUIZ-EXT-01）、实时大屏 / 游戏化（QUIZ-EXT-02）、AI 出题（QUIZ-EXT-03）、upgrade dry-run（MKT-EXT-01）、跨 pluginKey 完整恢复（MKT-EXT-02）、非答题类插件二次泛化（MKT-EXT-03）、商店运营层（STORE-01）—— 已记录在 `.planning/milestones/v4.0-REQUIREMENTS.md` v2 段。

---

## v3.2 AI LessonAgent 起草闭环 (Shipped: 2026-06-02)

**Phases completed:** 6 phases, 29 plans, 43 tasks

**Milestone audit:** 2026-06-01 的里程碑审计先识别出 7 个端到端生产链路缺口；收尾 Phase 66 逐项补齐 run→persist、teacher trigger、accept/discard command-bus 路径，并在 2026-06-02 完成验证后归档。

**Key accomplishments:**

- 建立了完整的 server-only AI provider 抽象层：统一 `aiGenerateText/aiGenerateObject` 入口、provider 配置收口、typed 错误归一、双层限流与 no-leak 静态边界证明。
- 交付了 LessonAgent typed tool 与命令编排主链：`createDraftLessonStepTool`、`lesson.draft.run` handler、`draftLessonStep` facade、summary-only AI 领域事件，确保工具层只经 DAL / Command Bus 工作。
- 打通了 AI 草稿写入链路：Agent 产出经 `lesson.draft.persist` 写入 `draftLessonVersions`，具备 provenance、幂等与 replay-safe 语义，继续复用既有 publish/version 真相源。
- 交付了教师审校面：编辑器内嵌 `mode=review`、diff 列表、逐项/整体编辑与接受/丢弃动作，对齐 Stitch 与 `DESIGN.md` 的 Lexend、tonal surface、glass/gradient CTA 语言。
- 用 shared corpus、guardrails、`lesson.draft.rejected` 契约与 `verify:phase` 收口质量闸门，并由收尾 Phase 66 真正补齐 teacher trigger、run→persist、accept/discard 经 Command Bus 的生产路径。

---

## v3.1 Single-School Pilot Production Readiness (Plugin-First) (Shipped: 2026-05-30)

**Phases completed:** 8 phases, 34 plans, 50 tasks

**Milestone audit:** passed (`22/22` requirements; Phase 55-60 plus inserted close-gap phases `60.1` and `60.2` closed)

**Key accomplishments:**

- Phase 55 冻结了单校试点 contract：课堂投票样板、teacher design -> publish -> launch -> student completion 主链路、40/5 容量口径、proof inventory 与 failure/recovery matrix 都成为前置约束。
- Phase 56 把课堂投票插件正式接入 lesson editor 与 publish path，补齐 schema validation、compatibility gating、preflight 与 frozen plugin config。
- Phase 57 打通了真实 runtime sample chain：launch readiness、teacher round control、student submit dedupe/cutoff/reconnect、canonical result writes 与 teacher evidence surface。
- Phase 58 交付了 operator-first classroom incident、degraded honesty、plugin/action detail 与 audited recovery actions，不再依赖人工改库排障。
- Phase 59 建立了 pilot deploy baseline：env discipline、health/ready/release honesty、CI hard gate、single-node rollout/rollback、backup/restore 与 restore drill。
- Phase 60 产出了 live smoke/capacity/drill evidence、canonical rollout/rollback rehearsal notes 与 `go` closeout verdict，同时保持 transport fallback 为 manual-only evidence lane。
- Phase 60.1 用真实 rehearsal evidence 替换了 dry-run close artifacts，并清除了 repo-local `local.db` contention 对 sample smoke 的阻断。
- Phase 60.2 把 frozen voting `pluginContract` 真正接入 launch/readiness、teacher result surface 与 quiz-path submit，最终关闭 `PLUG-01` 与 `CHAIN-03`。

---

## v3.0 AI Native Educational OS Upgrade (Shipped: 2026-05-23)

**Phases completed:** 5 phases, 22 plans, 42 tasks

**Known deferred items at close:** 5 quick tasks acknowledged in `STATE.md -> Deferred Items`

**Key accomplishments:**

- 冻结 platform vocabulary、canonical truth posture 与 platform-core authoritative ownership map，供 Phase 51-53 直接引用。
- `platform-core` 现在有最小 contract-only authority anchor，且四个 legacy seams 已被代码级注释冻结为 adapter、DAL、catalog、runtime transport posture。
- Phase 50 现在有点名式 deferred wall 和面向 Phase 51-54 的 handoff guardrails，后续规划不能再用模糊措辞把高风险能力偷带进 v3.0。
- 显式插件治理命令合同、SQLite 双层 command ledger、以及 validate→authorize→execute→record 的 Command Bus shell 已落地。
- Plugin governance 通过显式 command handler family 接入 dual-ledger bus，并把 retry 固化为同一 commandId 的新 attempt。
- 真实 plugin mutation ingress 已迁到共享 command producer seam：Server Actions、host governance path、以及 bootstrap 非 UI producer 都不再直连旧 DAL mutation helper。
- 统一 action descriptor contract、可执行 catalog / blocked diagnostic DTO 分视图，以及基于主仓库静态实现输入的 descriptor source 与 duplicate-key 拒绝规则。
- 固定 external five-state lifecycle vocabulary，并交付 dependency ordering、failure attribution 与 retain/cleanup uninstall governance projection。
- 统一 action registry read model、operator 双视图治理界面与 `verify:phase52`

回归闸门，把插件生命周期治理真正接到 host、server action 与 UI。

- 插件 uninstall retain/cleanup 服务端真闭环、reason-code 恢复门禁与 dependency-aware lifecycle 写路径落地，并由 phase52 verifier 封口验证。
- Settings/operator UI 现已直接消费 governance dashboard bundle，并由 phase52 verifier 持续阻止回退到 raw plugin DTO 本地推断。
- retain uninstall 元数据已接入治理读模型，`uninstalled` 成为真实外部生命周期状态，并在 operator diagnostics 中以纯审计态呈现。
- `plugin.reconcile` 现在是可执行治理命令，并已贯通 command bus、server action、host recovery gate 与 focused regression tests。
- operator diagnostics 现在会按 recommendation 显式触发 enable、retry、resume、reconcile，并由强化后的 `verify:phase52` 持续守住 `uninstalled` 与 `plugin.reconcile` 真相。
- Phase 53 的 platform event truth contract 已立住：typed event envelopes、独立 SQLite ledger/outbox foundation、以及 command summary carrying fields 都已落地并通过 focused tests。
- plugin governance command path 现在会显式产生 typed platform events，并在 `dispatchPlatformCommand()` 内完成 persist-then-notify 接线。
- platform events 现在有真实的 persisted-event subscriber seam：command bus 交出 persisted batch ids，platform event bus 从 SQLite ledger 读取 truth，再通过 in-process adapter 执行订阅分发。
- Phase 53 已收口：真实 producer composition 现在会把 persisted-event publication port 注入 command bus，operator 可以在 `/settings/labs` 先看 command summary，再下钻 event timeline，并且 `verify:phase53` 会自动守住 truth ownership 与 scope boundary。
- Shared command/action/capability descriptor shell with ActionDescriptor-backed action truth and outward DTO export for AI discovery.
- Server-side command/action/capability discovery registry projected from existing platform contracts with unified list APIs for future AI and operator consumers.
- Delegated actor audit metadata and summary-only approval references added to platform command/event contracts without implicit authority elevation.
- 最小 AI contract discoverability panel 与 `verify:phase54` focused regression gate，一起完成 Phase 54 close posture。

---

## v2.3 Async Task Platform (Archived: 2026-05-20)

**Closure scope:** Phase 39-43 only
**Delivered scope:** 5 phases, 16 plans
**Archive status:** Milestone archived with accepted known gaps; async platform shipped, but milestone audit remained `gaps_found`.

### Delivered in scope

- Phase 39: typed task registry、统一 enqueue boundary、SQLite task ledger 与 async task DTO/read model 已落地。
- Phase 40: dedicated worker、QueueEvents durable projection、retry/backoff、idempotency 与 recovery posture 已落地。
- Phase 41: batch import 已成为第一个真实 async product workflow，并具备 teacher/staff-visible status 与 result summary。
- Phase 42: operator health、run detail、attempt history 与 safe retry posture 已落地。
- Phase 43: scheduled reminders、classroom summary derived workload、resource-processing wiring 与 milestone proof artifact 已落地。

### Known gaps kept outside this milestone close

- `ATP-22`: teacher `/resources` 与 `LibrarySurface` 仍缺 knowledge source ingest 产品触发入口。
- `ATP-23`: 第 4 类 workload 因产品触发闭环未完成，只能算 partial proof。
- Phase 39 / 40 / 41 仍缺 `VERIFICATION.md` proof artifacts；Phase 40 还缺 `verify:phase40` npm entry。
- `classroom.session_summary` artifact 已落库，但 `/classroom` 页面仍未消费该 read path。

## v2.2 WebSocket Classroom Transport Cutover (Archived: 2026-05-18)

**Closure scope:** Phase 36-38 only
**Delivered scope:** 3 phases, 9 plans
**Archive status:** Milestone scope closed; websocket baseline, optional Redis fanout, and canonical close artifacts shipped.

### Delivered in scope

- Phase 36: 课堂实时链路已切到 authenticated WebSocket transport baseline，并保留 SSE rollback surface。
- Phase 37: `ioredis` fanout、session transport snapshot、degraded honesty 与 operator transport visibility 已落地。
- Phase 38: `verify:phase38`、parity proof、fallback matrix、demo runbook 与 closeout artifact 已把 v2.2 close posture 收口为单一 gate。

### Known gaps kept outside this milestone close

- close 时不存在 `v2.2` milestone audit 文件；本次归档按用户明确接受风险继续。
- `RTPX-01` PostgreSQL cutover、broader `RTPX-02` async worker/BullMQ slice、`RTPX-04`、`RTPX-05`、`RTPX-06` 继续 deferred。

## v2.1 Safety Closure and Course Membership Loop (Archived: 2026-05-17)

**Closure scope:** Phase 33-35 only
**Delivered scope:** 3 phases, 8 plans
**Archive status:** Milestone scope closed; repository-wide lint backlog remains outside this milestone close.

### Delivered in scope

- Phase 33: 项目级 auth、DAL、DTO、schema posture 与 classroom durability 已收口到单一 safety gate。
- Phase 34: 课程详情内的课程成员查看、添加、移除与约束反馈闭环已落地。
- Phase 35: `verify:phase35` 已把 milestone prerequisites、milestone-scoped lint baseline、full typecheck 与 honest backlog partition 收口到单一 close gate。

### Known gaps kept outside this milestone close

- repo-wide `lint` 仍保留历史 error，主要集中在旧 authoring、markdown、runtime-host 和部分历史测试 surface。
- PostgreSQL、Redis/Event Bus、WebSocket 与多 runtime expansion 继续 deferred，不因本次 close 自动进入执行状态。

## v2.0 Runtime Platform Foundations (Archived: 2026-05-17)

**Closure scope:** Phase 27-32 only
**Delivered scope:** 6 phases, 27 plans
**Archive status:** Milestone scope closed; project-level auth, data, classroom durability, and course membership gaps remain outside this milestone close.

### Delivered in scope

- Phase 27: 兼容性基线、runtime-platform feature roots、shared contracts 与 infra seams 已落地。
- Phase 28: versioned TeachingBridge、runtime session persistence、canonical runtime events 与 cache-safe write semantics 已落地。
- Phase 29: shared Runtime Host、sandboxed iframe、teacher/student/classroom 三处 runtime wiring 与 HTML courseware pilot 已落地。
- Phase 30: capability enforcement、manifest v2、lifecycle persistence 与 governance audit 已落地。
- Phase 31: transport boundary、SSE-first gateway、runtime inspector 与 timeline health 已落地。
- Phase 32: end-to-end hardening、proof handoff、canonical `verify:phase32` 与 milestone demo close 已落地。

### Known gaps kept outside this milestone close

- `AUTH-01` ~ `AUTH-06`: 项目级认证与授权 requirement 仍待整体收口。
- `DATA-01` ~ `DATA-05`: 数据层 requirement 仍待整体收口。
- `CLASS-05`: classroom durability requirement 仍待进一步补证与收口。
- `COURSE-07`: 课程学生成员管理闭环仍待完成。

## v1.3 Teaching Orchestration & Classroom Intelligence (Archived: 2026-05-15)

**Closure scope:** Phase 21-26 only
**Delivered scope:** 6 phases, 24 plans
**Archive status:** Milestone scope closed; this archive does not mark the full project requirement set as complete.

### Delivered in scope

- Phase 21: teaching-design metadata、课堂 evidence、teacher timeline 与步骤时长可见性已经落地。
- Phase 22: `/teacher/launch` 已升级为面向课堂实施的 orchestration workspace，并补齐 lesson preparation summary 与 readiness gating。
- Phase 23: 学生端课堂活动 guidance 与 quick response 证据写链路已经落地。
- Phase 24: `/classroom` 已具备 live roster monitoring、teacher-only formative evaluation 与单学生 detail 聚合证据面板。
- Phase 25: session recap、参与度/提交/反馈工作量聚合与 evidence drill-down 已落地。
- Phase 26: `/teacher/trends` recent-session 趋势与多条教师主路径的 Stitch-aligned productization 已交付。

### Known gaps kept outside this milestone close

- `COURSE-04` ~ `COURSE-09`: 仍属于 v1.2 carry-over backlog，没有因为 v1.3 close 自动完成。
- `AUTH-01` ~ `AUTH-06`: 认证与授权 requirement 仍未整体标记为 complete。
- `DATA-01` ~ `DATA-05`: 数据层 requirement 仍未整体标记为 complete。
- `CLASS-05`: 课堂 session durability requirement 仍需继续对齐与补证。
