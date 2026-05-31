# Phase 30: Capability enforcement and plugin lifecycle - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定在 Phase 29 已完成的 shared Runtime Host、本地 HTML courseware
pilot 和通过的 `verify:phase29` 事实之上，把当前 runtime / plugin 治理从
“已存在 trusted host boundary”升级为“capability-checked、lifecycle-driven、
allowed-or-denied 可审计”的平台治理层。

交付范围固定为四件事：

1. 让 runtime 或 plugin 请求只能通过 allowlisted、capability-checked 的 host
   adapters 调用宿主操作，而不是信任浏览器或 manifest 自报权限。
2. 把当前 plugin manifest 升级到 v2，使其能声明 runtime type、requested
   capabilities、permissions 和 lifecycle metadata，同时继续禁止任意远程执行。
3. 为 built-in runtime 或 plugin package 建立持久 lifecycle state 与 transition
   记录，覆盖 `installed -> enabled -> mounted -> ready` 以及 `suspended /
   disabled / failed` 分支。
4. 为 runtime 和 plugin 的 allowed / denied host action 结果建立统一审计语义，
   为后续 Phase 31 inspector 提供 durable truth。

本阶段不交付 operator inspector UI、transport gateway、WebSocket cutover、远程
第三方 runtime 包、任意脚本执行入口，也不把 HTML runtime pilot 扩成多 runtime
type marketplace。

</domain>

<decisions>
## Implementation Decisions

### Capability-gated host actions
- **D-01:** 当前 `createGuardedHostAction` 继续作为 runtime / plugin host action 的唯一
  server-side 入口形态；Phase 30 在其之上补 capability 与 audit 语义，而不是再起第二条
  host dispatch 通道。
- **D-02:** host operation 授权固定采用双重校验：`descriptor/manifest` 中声明的
  `requestedCapabilities` 只表示“请求什么”，真正是否允许执行仍必须由服务端根据
  actor scope、school scope、host permissions 和 allowlist 重新判定。
- **D-03:** 运行时只允许调用 typed、allowlisted host action 名称；不引入 generic
  `execute`、字符串拼接 action、remote procedure passthrough 或任意 plugin-defined
  host verb。
- **D-04:** capability check 必须绑定到 server-owned truth：published snapshot 中冻结的
  runtime descriptor、school-scoped plugin registration、当前 actor membership 和
  lifecycle state；不能信任 iframe 或客户端 payload 自报的 capability。
- **D-05:** 对 runtime 与 plugin 的 denied 结果要返回明确、可机读的 refusal semantics，
  至少区分 `not_allowlisted`、`capability_missing`、`permission_denied`、
  `lifecycle_blocked`、`school_mismatch`、`kill_switch` 和 `unsupported_action`，
  不能只抛通用异常后静默结束。

### Plugin manifest v2
- **D-06:** plugin manifest v2 在当前 school-scoped `manifestJson` 路径上演进，不新增
  平行 package registry 或 remote marketplace source of truth。
- **D-07:** manifest v2 必须显式承载四类治理信息：runtime declaration、requested
  capabilities、permission contract、lifecycle metadata；其中 runtime declaration 继续复用
  Phase 28/29 已有 `RuntimeDescriptorSchema`，而不是再造第二套 runtime config。
- **D-08:** manifest v2 首发只支持本地 built-in 或受控本地资源入口；`entry.bootstrap`
  仍然只能指向本地 route / asset，不接受 remote URL、第三方 iframe source、动态脚本
  或任意下载执行。
- **D-09:** built-in HTML courseware pilot 必须能以兼容方式迁移到 manifest v2，保持当前
  editor template 注入、published snapshot freeze 与 `payload.runtime` contract 不变，
  不为了治理升级改 lesson step family。
- **D-10:** planner 可以调整 manifest v2 的字段组织，但必须保证老的 built-in/plugin
  registration 路径可最小迁移，并且默认缺失 v2 字段时不会隐式放宽执行权限。

### Lifecycle state model
- **D-11:** 生命周期固定采用单一 canonical vocabulary：`installed`、`enabled`、
  `mounted`、`ready`、`suspended`、`disabled`、`failed`；当前 contracts placeholder 中缺少
  `failed`，Phase 30 需要把它升级为正式状态，而不是只用 audit reason 侧写失败。
- **D-12:** `installed / enabled / disabled` 代表 package registration 级治理状态；
  `mounted / ready / suspended / failed` 代表运行中 host/runtime lifecycle 状态。二者需要
  共用同一 lifecycle 语言，但不能继续只靠 `enabled` 布尔值推断全部状态。
- **D-13:** lifecycle truth 必须持久化，并以 transition log 追加记录状态变化，而不是只在
  hook run 或 bootstrap 结果里临时推断当前状态。
- **D-14:** 只有处于允许态的 package/runtime 才能进入 host action dispatch；`disabled`、
  `suspended`、`failed` 和 kill-switch 态都必须成为 capability gate 的硬阻断条件，而不是
  仅做 UI 提示。
- **D-15:** lifecycle governance 首发围绕 built-in runtime 与当前 school-scoped plugin
  packages；远程安装、版本升级策略、跨学校共享包治理仍留给后续 phase。

### Allowed / denied audit semantics
- **D-16:** runtime 与 plugin 的 host action 治理审计必须统一记录 allowed 与 denied 两种结果，
  不能继续只有 plugin denied path 记审计、runtime path 只记成功事件。
- **D-17:** 每条治理审计至少要能关联：`action`、decision（allowed/denied）、reason code、
  actorId、actorScope、schoolId、pluginId 或 runtimeId、runtimeInstanceId、sessionId（如有）、
  lifecycle snapshot、requested capabilities / required permission 摘要、correlationId、timestamp。
- **D-18:** 审计持久层可以复用并扩展当前 `pluginActionAudits` / `pluginHookRuns` 与
  runtime event durability，也可以新增 shared governance audit 表；但最终必须提供一条统一的
  downstream query model，供 Phase 31 inspector 直接消费。
- **D-19:** 本阶段只要求持久化与 contract-level 暴露 allowed / denied 审计，不要求建设教师/管理员
  inspector 界面；任何 timeline、filter、health 面板都属于 Phase 31。

### Claude's Discretion
- capability gating 的精确执行层级可以由 planner 收敛为“guard wrapper 扩展”或“guard +
  governance dispatcher”两层，只要保持唯一 host action entry 与 server-owned truth 判定。
- manifest v2、lifecycle record、governance audit 的精确表结构与 DTO 命名可由 planner 细化，
  但必须兼容当前 school-scoped plugin registration 与 runtime descriptor freeze posture。
- shared governance audit 是复用现有 plugin audit 表还是引入统一 runtime-platform audit root，
  可由 planner 结合 schema 成本决定；但 runtime 与 plugin 不能继续各说各话。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` — 锁定 v2.0 runtime platform foundations 的总体 posture：单体内
  平台化、无 remote execution、无 infra cutover。
- `.planning/ROADMAP.md` — Phase 30 的正式 goal、success criteria 与四个计划槽位。
- `.planning/REQUIREMENTS.md` — `GOVR-01`、`GOVR-02`、`GOVR-03` 的 requirement truth，
  以及 `GOVR-04` inspector 仍在 Phase 31。
- `.planning/STATE.md` — 当前 milestone 状态，明确 Phase 29 已完成 shared Runtime Host、
  local HTML pilot 与 `verify:phase29`。

### Locked upstream runtime decisions
- `.planning/phases/27-compatibility-baseline-and-v2-boundary-scaffolding/27-CONTEXT.md` —
  锁定 `runtime-platform` 单根边界、`createGuardedHostAction` posture、seams 只做 future
  adapter、不改变 truth ownership。
- `.planning/phases/28-runtime-bridge-contracts-and-session-persistence/28-CONTEXT.md` —
  锁定 runtime descriptor freeze、bootstrap 最小 capability context、save vs submit
  语义和 durable runtime session/event path。
- `.planning/phases/29-runtime-host-and-html-courseware-pilot/29-CONTEXT.md` — 锁定 shared
  Runtime Host、本地 HTML courseware pilot、typed browser bridge 和“治理深化留给 Phase 30”。
- `.planning/phases/29-runtime-host-and-html-courseware-pilot/29-VERIFICATION.md` — 证明
  shared Runtime Host、surface wiring 与 `verify:phase29` 已完成。
- `.planning/phases/29-runtime-host-and-html-courseware-pilot/29-REVIEW.md` — 明确指出当前
  runtime host action 路径仍需升级为 capability-gated governance。

### Existing runtime governance contracts
- `src/features/runtime-platform/contracts/descriptors.ts` — 当前 `RuntimeDescriptorSchema`、
  `RuntimeManifestV2Schema` placeholder 和 lifecycle ownership placeholder；Phase 30 需在此
  基础上升级，而不是另起 schema。
- `src/features/runtime-platform/contracts/permissions.ts` — 当前 `RuntimeCapability`、
  `HostActionPermission`、`RuntimeActorScope` contract。
- `src/features/runtime-platform/host-actions/guards.ts` — 当前 actor scope / school scope /
  permission guard 实现，是 capability governance 的主扩展点。
- `src/features/runtime-platform/host-actions/runtime-host.ts` — 当前 runtime-bootstrap / ready /
  interaction / save / submit / teacher-control dispatch gateway。
- `src/features/runtime-platform/classroom/runtime-session.ts` — 当前 runtime session、event、
  save/submit durable path。

### Existing plugin registry and audit boundary
- `src/lib/dal/plugins.ts` — 当前 plugin registration、enable / kill switch、denied reason、
  hook run 和 action audit 写入路径。
- `src/server/plugins/registry.ts` — 当前 hook anchor、action allowlist 与 permission requirement
  truth。
- `src/db/schema.ts` — 当前 `pluginRegistrations`、`pluginHookRuns`、`pluginActionAudits` 以及
  runtime/classroom durable schema；Phase 30 的 lifecycle 与 governance audit 需要接在这条持久化边界上。
- `src/lib/help/help-center-content.ts` §插件开发 — 当前对 denied path reason、school-scoped
  plugin enable chain 与 allowlist posture 的产品级说明。

### Existing authoring and built-in runtime anchors
- `src/lib/dto/lesson-authoring.ts` — 当前 `payload.runtime` 与 step payload contract。
- `src/lib/dto/resource-ai.ts` — 当前 built-in teaching step 定义、plugin manifest schema、
  built-in runtime template 输入。
- `src/lib/dal/plugins.builtins.test.ts` — 当前 built-in HTML courseware 定义已带本地 runtime
  descriptor 的事实锁定。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createGuardedHostAction()` 已经把 actor scope、school scope、host permission 统一收进一个
  wrapper，是加 capability gate 的最小侵入入口。
- `invokeRuntimeHostAction()` 已经集中承载六类 runtime host verbs，说明 capability dispatch
  适合在 shared gateway 收口，而不是分散到各 surface。
- `runPluginHook()` 已经具备 `disabled`、`kill_switch`、`school_mismatch`、`not_allowed`、
  `permission_denied` 的 denied reason 与审计写入，是 runtime governance audit 的最近邻先例。
- `pluginRegistrations.enabled + killSwitchEnabled` 已提供 package 级治理基线，可扩展为正式
  lifecycle state，而不是从零重建 plugin registration。
- `pluginHookRuns` / `pluginActionAudits` 与 runtime session/event durability 已证明当前仓库接受
  “append-only audit + latest state”并存的治理模式。

### Established Patterns
- 当前平台边界固定是 `runtime-platform/contracts -> host-actions -> classroom/runtime session ->
  seams`，治理升级必须沿这条 server-owned 链路推进，不能回流到 iframe 或客户端组件层。
- 当前 plugin 系统是 school-scoped manifest registration + allowlisted registry dispatch，不存在
  arbitrary code execution；manifest v2 必须继承这一 posture。
- 当前 Phase 29 HTML pilot 把 runtime descriptor 冻结进 published snapshot，说明 capability
  request 的真实来源应是 snapshot/registration truth，而不是浏览器临时报文。
- 当前 verifier 模式是 static guard + focused test suites；Phase 30 也应维持 phase-specific
  governance verifier，而不是只靠帮助文档或手工检查。

### Integration Points
- `src/features/runtime-platform/host-actions/guards.ts` 与 `runtime-host.ts` 是 capability gate 与
  runtime denial semantics 的首要接点。
- `src/lib/dal/plugins.ts` 是 plugin lifecycle、kill switch、allow/deny audit 最直接的迁移点。
- `src/features/runtime-platform/contracts/descriptors.ts` 与 `permissions.ts` 是 manifest v2 与
  lifecycle vocabulary 的 contract truth。
- `src/db/schema.ts` 需要承接 lifecycle state 与 governance audit 的 durable persistence。
- `scripts/verify-phase29-runtime-host.ts` 已验证当前 trusted host boundary 仍存在；Phase 30 需要在
 此基础上追加 capability/lifecycle/audit 守卫，而不是推翻 Phase 29 结构。

</code_context>

<specifics>
## Specific Ideas

- capability governance 更像是对现有 trusted host path 的“收口与显式化”，而不是引入另一条
  runtime execution architecture。
- manifest v2 的关键不是加更多字段，而是把 runtime declaration、capability request、permission
  contract、lifecycle metadata 变成 planner/executor 都必须显式消费的治理输入。
- lifecycle state 不应继续停留在 `enabled` 布尔值或 hook run 成败的隐式推断；必须有 durable
  current state + append-only transition log。
- allowed / denied audit 的重点是给 Phase 31 inspector 准备统一 truth，而不是先做一个漂亮页面。

</specifics>

<deferred>
## Deferred Ideas

- runtime / plugin inspector timeline、health panel、operator filtering UI — 留给 Phase 31。
- transport gateway、SSE/WebSocket adapter boundary 与 delivery tracing — 留给 Phase 31。
- 远程第三方 runtime 包、marketplace 安装、任意脚本执行、dynamic remote bootstrap — 留给未来
  runtime platform expansion。
- 第二种 runtime type、AI runtime、自主执行型 plugin 能力 — 留给后续 phase，在 capability 与
  audit framework 被验证后再讨论。

</deferred>

---

*Phase: 30-capability-enforcement-and-plugin-lifecycle*
*Context gathered: 2026-05-16*
