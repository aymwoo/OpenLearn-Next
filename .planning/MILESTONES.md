# Milestones

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
