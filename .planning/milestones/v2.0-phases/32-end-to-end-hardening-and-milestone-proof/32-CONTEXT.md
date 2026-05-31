# Phase 32: End-to-end hardening and milestone proof - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定建立在 Phase 29-31 已完成的 shared `Runtime Host`、
capability/lifecycle governance、transport gateway 和独立 inspector 之上，
把现有 HTML runtime pilot 收敛成一条可重复演示、可恢复、可验证的
runtime-hosted lesson 主链路。

Phase 32 交付的是一个可 ship 的 milestone proof：教师能沿既有 lesson
authoring / publish / launch / classroom 路径发起课堂，学生能在既有
runtime step 中完成真实互动并提交结构化结果，教师和操作者能在既有
`/classroom` 与 inspector 中证明 submit、event log、transport trace 和
recovery posture 都成立。

本阶段不新增 runtime 类型、不做 PostgreSQL/Redis/WebSocket cutover、不把
inspector 拉回 `/classroom` 内联、不建设独立 milestone dashboard，也不把
proof 扩成任意 lesson 或多条同级 canonical demo path。

</domain>

<decisions>
## Implementation Decisions

### Canonical proof path
- **D-01:** Phase 32 的唯一 canonical proof 固定走教师开课链路：
  `editor/publish -> launch/classroom -> 学生 runtime interaction + submit -> inspector`。
  直达 `/student/player` 不是同级主证明路径。
- **D-02:** canonical proof 固定建立在可重复的 seeded demo 数据之上，而不是任意
  真实 lesson。应优先扩展现有 dev bootstrap / test accounts，而不是新建第二套 demo
  provisioning 系统。
- **D-03:** “proof 完成”固定定义为完整可复演示闭环，而不是单次跑通一次即可。
  后续 planner / executor 必须把 repeatability 当成完成条件。
- **D-04:** proof 成功后，inspector 默认通过 `runtimeSessionId` 直达对应 session，
  不要求操作者先进入 inspector 列表页手动定位。

### Submit terminal posture
- **D-05:** 学生在 HTML runtime 中点击 `submit` 后，界面进入明确的完成态锁定
  terminal state，不再允许继续编辑或再次提交。
- **D-06:** 完成态必须显示本次结构化提交摘要与成功确认，而不是只保留 toast 或短提示。
- **D-07:** 学生 submit 成功后的第一教师反馈固定落在 `/classroom` 当前运行面板，
  教师不需要先切去 inspector 才能确认该学生已完成。
- **D-08:** 一旦进入 submit 完成态，后续 `save` 必须彻底禁用；Phase 32 不保留
  `submit` 之后继续保存或 resubmit 的姿态。

### Failure recovery posture
- **D-09:** runtime `save` 或 `submit` 失败时，学生端必须停留在当前 runtime surface
  并进入显式失败态，不能静默退出回 player，也不能只做后台重试而不暴露失败语义。
- **D-10:** 学生端失败态的主恢复动作固定为“重试当前失败动作”，并保留当前草稿或
  摘要上下文，避免失败即丢失本次 interaction 结果。
- **D-11:** 如果学生 submit 没有成功落到 truth，教师侧的第一感知面固定是
  `/classroom` 运行台的当前步骤/学生监控，而不是 inspector-only 的 operator 视角。
- **D-12:** milestone proof 的标准排障第二步固定为 inspector drill-down：教师或
  操作者先在 `/classroom` 看到异常，再基于对应 `runtimeSessionId` 进入 inspector
  查看 governance、transport 和 consumer trace。失败时不自动强制跳转 inspector。

### Proof artifacts and handoff
- **D-13:** Phase 32 最终 proof 交付固定采用双轨：可重复 demo + 单一
  `verify:phase32` gate，同时满足演示 handoff 与自动回归。
- **D-14:** demo handoff 的主要载体固定为 seeded demo lesson / session / 账号约定
  加明确入口文档；不能只靠代码约定让 downstream agents 自己 reverse-engineer。
- **D-15:** `verify:phase32` 必须是 Phase 级总闸门，统一收口 demo path、compat
  baseline、submit terminal posture、failure recovery 和 inspector drill-down 等
  关键合同；不能只串 `verify:phase29/30/31` 就算完成。
- **D-16:** Phase 32 的产品化重心固定放在现有 surfaces 的 demo affordance 与状态
  提示收口：`editor`、`classroom`、`player`、`runtime host`、`inspector`。不新增
  单独的 milestone dashboard 作为主交付面。

### the agent's Discretion
- planner 可以决定 demo course / lesson / runtime step / session 的精确命名和 seed
  组织方式，只要保持 deterministic、repo-local、可重复 bootstrap 和文档可发现。
- planner 可以决定完成态、失败态、重试 CTA、teacher-side hint 和 inspector deep link
  的精确文案与视觉位置，只要不违背锁定的 terminal / recovery semantics。
- planner 可以决定 `verify:phase32` 的精确实现方式、静态 guards 分类和 focused suites
  组合，只要它仍是单一 canonical gate，并覆盖 proof path、failure recovery 与
  inspector handoff。
- planner 可以决定 demo handoff 文档的具体落点，只要后续 researcher、planner、
  executor 和人类开发者都能直接找到 teacher / student / inspector 的进入方式。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope and locked posture
- `.planning/PROJECT.md` — 锁定 v2.0 Runtime Platform Foundations 的总体 posture：
  单体内平台化、single HTML runtime pilot、无 infra cutover。
- `.planning/ROADMAP.md` — Phase 32 的正式 goal、success criteria 与 32-01 到 32-04
  的 plan 槽位。
- `.planning/REQUIREMENTS.md` — `RHOST-04` 的 requirement truth，以及本 milestone
  对 proof、governance、transport 的总边界。
- `.planning/STATE.md` — 当前 milestone 状态与上游 phase 完成情况。

### Locked upstream runtime decisions
- `.planning/phases/29-runtime-host-and-html-courseware-pilot/29-CONTEXT.md` — 锁定
  shared Runtime Host、三处 surface wiring、built-in HTML runtime step 和 local-only
  pilot posture。
- `.planning/phases/29-runtime-host-and-html-courseware-pilot/29-VERIFICATION.md` —
  证明 Phase 29 已具备 shared host 与 trusted submit boundary；Phase 32 应 harden，
  不是重造。
- `.planning/phases/30-capability-enforcement-and-plugin-lifecycle/30-CONTEXT.md` —
  锁定 capability gate、manifest v2、lifecycle vocabulary 和 allowed/denied audit
  semantics。
- `.planning/phases/31-transport-boundary-and-runtime-inspector/31-CONTEXT.md` — 锁定
  single transport gateway、deterministic inspector health、独立 inspector 页面与
  `runtimeSessionId` 锚点。

### Existing proof path implementation
- `src/features/runtime-platform/host/runtime-host-client.tsx` — shared host client，
  当前统一承载 bootstrap、ready、interaction、save、submit 和 host fallback state。
- `src/features/runtime-platform/host-actions/runtime-host.ts` — host-side governance
  决策与 host result transport publish 逻辑。
- `src/actions/classroom-actions.ts` — runtime bootstrap / save / submit / teacher
  control 的 server action 入口和 cache tag 更新纪律。
- `src/components/learning/classroom-runtime-client.tsx` — 学生 current-step runtime
  embedding、snapshot fallback 和 reconnect 行为。
- `src/components/classroom/classroom-control-panel.tsx` — 教师 live runtime stage、
  monitoring summary 和当前 `/classroom` proof surface。
- `src/app/runtime/html-courseware/pilot/page.tsx` — 本地 HTML runtime pilot，通过
  typed browser bridge 发出 interaction / save / submit。

### Transport and inspector truth
- `src/features/runtime-platform/seams/transport/gateway.ts` — single transport publish
  gateway，定义 `truthPersisted + deliveryAttempted` 语义。
- `src/lib/dto/runtime-inspector.ts` — runtime inspector 的 scope、health、timeline DTO
  contract。
- `src/lib/dal/runtime-inspector.ts` — role-scoped inspector read model，当前以
  `runtimeSessionId` 为默认锚点。
- `src/app/settings/labs/runtime-inspector/page.tsx` — 现有独立 inspector route entry。
- `src/components/surfaces/runtime-inspector-surface.tsx` — single timeline inspector
  surface posture。
- `scripts/verify-phase31-transport-inspector.ts` — Phase 31 的 canonical gate，定义
  transport / inspector drift guard 的现有做法。

### Seed and demo bootstrap
- `scripts/seed-test-accounts.ts` — canonical test actors：`teacher@example.com`、
  `student@example.com` 及其 school memberships。
- `scripts/bootstrap-dev-db.ts` — 当前 dev bootstrap 会创建 school / class / course /
  published lesson，是新增 deterministic runtime proof seed 的最直接入口。
- `package.json` — phase-specific verifier 注册模式，当前已有 `verify:phase29`、
  `verify:phase30`、`verify:phase31`。
- `scripts/verify-phase29-runtime-host.ts` — shared host / surface / submit-path drift
  verifier 模式，可直接作为 `verify:phase32` 的结构参考。

### Architecture direction
- `OpenLearn-Next-V2-Architecture-Plan.md` — Runtime Platform 长线蓝图；可作为背景
  参考，但 Phase 32 仍必须遵守 PROJECT / ROADMAP 已锁定的 no-cutover posture。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RuntimeHostClient`：已经统一了 typed browser bridge、bootstrap、ready/save/submit
  action 调用和宿主状态显示，是 submit terminal state 与 failure posture 的最佳收口点。
- `classroom-runtime-client.tsx`：已经具备学生侧 snapshot fallback、手动重连和当前步骤
  runtime embedding，适合承接 Phase 32 的失败重试与 proof continuity。
- `ClassroomControlPanel`：已经是教师 live runtime 主舞台，并带 monitoring summary，
  适合作为 teacher-side success / failure 第一反馈面。
- `getRuntimeInspectorDTO` + `RuntimeInspectorSurface`：已经具备独立页面、单条 timeline、
  deterministic health 和 `runtimeSessionId` 选择能力，Phase 32 更应 deep-link 而不是
  新建 operator UI。
- `seed-test-accounts.ts` + `bootstrap-dev-db.ts`：已经提供 deterministic teacher / student
  / school / class / course / lesson 基线，说明 Phase 32 可以扩展现有 seed 流，而不是
  建第二条 demo scaffolding。
- `verify:phase29/30/31` 与对应 scripts：仓库已经接受“单一 `verify:phaseNN` 入口 +
  static guards + focused suites”的 canonical proof 模式。

### Established Patterns
- runtime truth 始终由 server-owned path 控制：iframe 只发 typed message，host 调
  server actions，DAL 持久化，transport 只负责 delivery trace。
- student player 继续保持 `cached shell + streamed personal/runtime state` 分层；
  Phase 32 的 hardening 不能把 runtime submit/recovery 重新塞回 cached shell。
- inspector 已固定为独立页面，并以 `runtimeSessionId` 作为默认锚点；proof hardening
  只能 deep-link 进入，不能反向把 inspector 并回 `/classroom`。
- transport gateway 已固定采用 `truth persisted + delivery attempted` 语义，说明
  Phase 32 的 failure recovery 必须把 durable truth failure 与 delivery failure 明确区分。
- 现有 `bootstrap-dev-db.ts` 会 seed 一个 published lesson，但还没有 runtime-capable
  demo step；Phase 32 最自然的方向是扩展这个 baseline，而不是再造新的 demo DB path。

### Integration Points
- `scripts/bootstrap-dev-db.ts` 是固定 demo lesson / runtime step / published snapshot
  的首要 integration point。
- `src/features/runtime-platform/host/runtime-host-client.tsx` 与
  `src/components/learning/classroom-runtime-client.tsx` 是学生 submit terminal state、
  失败态和重试动作的直接落点。
- `src/components/classroom/classroom-control-panel.tsx` 及其 backing classroom DTO / DAL
  是教师端即时 success / failure 反馈与 proof affordance 的直接落点。
- `src/app/settings/labs/runtime-inspector/page.tsx` 与 `src/lib/dal/runtime-inspector.ts`
  是 `runtimeSessionId` 直达 handoff 的直接落点。
- `package.json` 与新的 `scripts/verify-phase32-*.ts`（或等价单文件）将是 Phase 32
  canonical verifier 的落点。

</code_context>

<specifics>
## Specific Ideas

- 复用现有 `teacher@example.com` / `student@example.com` 与 `bootstrap-dev-db.ts` 路径作为
  canonical demo actors 和 seed 入口，但把 seed lesson 升级成包含一个 built-in HTML
  runtime proof step 的 published lesson。
- 把“submit 成功”做成清晰的 proof moment：学生留在 runtime 完成态，看到结构化提交摘要；
  教师在 `/classroom` 当下就看到完成反馈；同时给出对应 inspector deep link。
- 把“submit/save 失败”做成非破坏性失败：学生仍留在当前 runtime，保留草稿与摘要，能明确
  重试当前动作；教师先在 `/classroom` 发现异常，再通过 inspector 深查。
- `verify:phase32` 应在复用 Phase 29-31 既有 guarantees 的基础上，新增真正属于 Phase 32
  的 proof 断言，而不是只串旧 verifier 当作 close 证明。

</specifics>

<deferred>
## Deferred Ideas

- 把 `/student/player` 直达路径提升为与教师开课链路同级的 canonical proof — 当前不做，
  以后如需更强 learner-only proof 可再开 phase。
- 新建独立 milestone dashboard 或 demo hub 页面 — 当前不做，优先收口在现有 surfaces。
- submit 后允许 resubmit、继续 save 或保持可编辑完成态 — 当前不做，Phase 32 固定采用
  terminal submit posture。
- 失败时自动强制跳转 inspector — 当前不做，inspector 是标准第二步，不应打断 live flow。

</deferred>

---

*Phase: 32-End-to-end hardening and milestone proof*
*Context gathered: 2026-05-16*
