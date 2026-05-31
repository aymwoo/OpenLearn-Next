# Phase 31: transport-boundary-and-runtime-inspector - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定在 Phase 30 已落地的 capability-gated host actions、lifecycle
state 与 governance audit durable truth 之上，交付两条能力：

1. 把 runtime / classroom event 的发送从当前直连 SSE adapter 的方式收口成单一
   transport gateway，使 transport 只承担 delivery channel 职责，而 durable truth 继续
   留在 runtime/classroom session 写路径。
2. 提供一个独立的 operator-grade inspector 页面，用统一 timeline 解释
   `producer -> durable truth -> transport attempt -> consumer-facing trace`，并展示
   runtime/plugin 的 health、allowed/denied 审计与时间线细节。

本阶段不做 WebSocket 正式 cutover，不引入新的 primary truth path，不把 inspector 做成
`/classroom` 内联附属面板，也不建设推测型告警或独立监控系统。

</domain>

<decisions>
## Implementation Decisions

### Transport Gateway
- **D-01:** transport 发送入口固定采用单一统一 gateway；runtime、classroom 和后续 plugin
  相关 delivery 都必须先进入同一个 transport publish 入口，而不是在业务代码中直连
  adapter。
- **D-02:** 统一 gateway 固定按 `channel/kind` 路由，而不是按 producer type 路由；业务侧先
  产出标准化 transport event，再由 gateway 选择当前 adapter 与 delivery 策略。
- **D-03:** gateway 返回语义固定为二段式结果：`truth persisted + delivery attempted`。
  durable truth 是否已落库与 transport 是否已尝试投递必须显式分开，避免把 delivery 成功与否
  误当成系统真相。
- **D-04:** transport adapter 继续只是 delivery concern；SSE 仍是首个 adapter，但 Phase 31
  之后的业务代码不应再直接依赖 `sseRuntimeTransportAdapter.deliver(...)` 这类调用方式。

### Inspector Information Architecture
- **D-05:** inspector 首屏固定采用单条统一 timeline，而不是概览页 + 分 tab 或对象优先详情页。
  timeline 需要能串起 runtime、plugin、transport 与 governance trace，优先服务排障与解释链路。
- **D-06:** 统一 timeline 的默认锚点固定为 `runtime session`，首发先围绕一次 runtime 运行实例
  的完整链路排查问题，而不是先以 `classroom session` 或 `plugin package` 做顶层主对象。
- **D-07:** inspector 首发主入口固定为独立页面，定位为 operator surface，而不是 `/classroom`
  的附属面板或临时调试抽屉。

### Health Semantics
- **D-08:** health 首发固定为纯 deterministic 聚合，只根据已持久化事实汇总状态，不引入
  推测性规则、阈值告警或独立监控真相源。
- **D-09:** health 的输入应来自已有 durable truth，例如 lifecycle state、governance
  decision、runtime/classroom event、transport delivery attempt 结果；planner/executor 不应
  再造一套并行的 health truth。

### Access Scope And Entry
- **D-10:** inspector 的访问范围按角色分层：教师只看自己相关的 classroom/runtime session 与
  相关 plugin traces；管理员看本校范围；开发者看系统级或开发范围。
- **D-11:** 角色分层必须继续沿用现有 actor scope、school scope 与治理边界，不能因为 inspector
  是独立页面就放宽跨学校或跨角色查看权限。

### Claude's Discretion
- 统一 gateway 的精确命名、内部 registry 结构、adapter dispatch API 形状可由 planner 收敛，
  只要保持“单入口 + channel/kind 路由 + 二段式结果”这三个锁定事实。
- inspector 独立页面的精确路由位置、导航归属、筛选器布局与 timeline 视觉组织可由 planner
  细化，但必须保持“独立页面 + 统一 timeline + runtime session 默认锚点”的产品 posture。
- deterministic health 的字段命名、分级标签和摘要卡组织可由 planner 决定，但不能引入推测型
  告警或单独的健康真相源。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` — 锁定 v2.0 runtime platform foundations 的整体 posture：单体内平台化、
  durable truth first、无 infra cutover。
- `.planning/ROADMAP.md` — Phase 31 的正式 goal、success criteria 与四个 plan 槽位。
- `.planning/REQUIREMENTS.md` — `GOVR-04`、`TRNS-01`、`TRNS-02` 的 requirement truth，明确本阶段
  同时覆盖 inspector 与 transport boundary。
- `.planning/STATE.md` — 当前 milestone 状态，说明 Phase 30 已完成治理与 audit durability，可作为
  Phase 31 的上游真相源。

### Locked upstream runtime decisions
- `.planning/phases/28-runtime-bridge-contracts-and-session-persistence/28-CONTEXT.md` — 锁定
  runtime descriptor freeze、session durability、submit/save 语义和 transport 不得成为 truth path。
- `.planning/phases/29-runtime-host-and-html-courseware-pilot/29-CONTEXT.md` — 锁定 shared Runtime
  Host、HTML runtime pilot 与“transport gateway / inspector 留给 Phase 31”的边界。
- `.planning/phases/30-capability-enforcement-and-plugin-lifecycle/30-CONTEXT.md` — 锁定
  governance audit、lifecycle state、allowed/denied semantics 是 Phase 31 inspector 的 durable input。

### Existing transport and host boundary
- `src/features/runtime-platform/seams/transport/contract.ts` — 当前 transport seam contract，已定义
  mode、envelope 与 ownership posture，是 gateway contract 的直接起点。
- `src/features/runtime-platform/seams/transport/sse-adapter.ts` — 当前唯一 transport adapter，说明
  Phase 31 需要从“直接 SSE posture”演进到“通过 gateway 间接使用 SSE adapter”。
- `src/features/runtime-platform/seams/index.ts` — 当前 default adapter exports 与 centralized seam
  posture，是 planner 设计 gateway 挂点的现成边界。
- `src/features/runtime-platform/host-actions/runtime-host.ts` — 当前 runtime host action 在结果 envelope
  生成后直接调用 SSE transport，是本阶段收口发送入口的首要改造点。

### Existing durable truth and audit inputs
- `src/features/runtime-platform/classroom/runtime-session.ts` — 当前 runtime session、canonical event、
  lifecycle transition 和 governance audit 写入路径。
- `src/lib/dal/plugins.ts` — 当前 plugin lifecycle、allow/deny 审计与 governance audit 读取/写入边界。
- `src/db/schema.ts` — 当前 `governanceAudits`、`pluginActionAudits`、`pluginHookRuns` 以及 runtime/classroom
  durable schema，是 inspector read model 的持久层事实基础。
- `src/lib/dal/classroom.ts` — 当前 classroom snapshot、teacher timeline 与 classroom-side durable read model。

### Existing UI and timeline anchors
- `src/components/classroom/classroom-control-panel.tsx` — 当前 classroom teacher timeline UI 锚点，说明仓库
  已有 timeline surface 先例，但 Phase 31 要扩展为独立 inspector 页面。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RuntimeTransportEnvelopeSchema` / `RuntimeTransportOwnershipSchema`：已提供 transport contract 基线，适合
  扩展为统一 gateway 的输入/输出语义。
- `sseRuntimeTransportAdapter`：仍可作为首个 adapter 复用，不需要在 Phase 31 同步切 WebSocket。
- `invokeRuntimeHostAction()`：已经集中承载 runtime host verbs，是把 direct delivery 收口进 gateway 的
  最近邻入口。
- `governanceAudits` + runtime/classroom timeline truth：已经提供 inspector 所需的大部分 durable signal，
  不必重新发明审计数据源。
- `ClassroomTimelinePanel` 与现有 classroom timeline 视图：可作为 timeline 视觉与信息密度的本地 UI 先例。

### Established Patterns
- 平台边界继续沿 `contracts -> host-actions -> runtime/classroom durability -> seams` 推进；Phase 31
  不能把 transport 或 inspector 拉回客户端本地状态系统。
- transport 不是 truth path 的原则已在 Phase 28/30 锁定；新的 gateway 只能包装 delivery，不得成为新的主写入路径。
- governance audit、lifecycle state 与 runtime session 已采用 append-only / durable truth 模式；inspector 应消费
  这些事实，而不是另建只给 UI 用的临时聚合真相。
- 角色/学校范围继续走现有 actor scope + school scope 模型；inspector 是读取面，不是权限例外面。

### Integration Points
- `src/features/runtime-platform/host-actions/runtime-host.ts`：把当前 direct SSE call 改成走统一 transport gateway。
- `src/features/runtime-platform/seams/transport/*`：扩展为 gateway 可消费的 adapter 契约与 routing boundary。
- `src/features/runtime-platform/classroom/runtime-session.ts` 与 `src/lib/dal/plugins.ts`：为 inspector 提供 runtime/plugin
  的时间线、治理结果与 health 输入。
- 独立 inspector 页面将需要一个新的 read model，把 runtime session、governance audit、transport attempt 与角色范围过滤
  统一到同一条 operator timeline 上。

</code_context>

<specifics>
## Specific Ideas

- Phase 31 的核心不是“再做一个 audit 页面”，而是让操作员能看到同一条 runtime session 从 producer、durable truth、
  transport attempt 到 consumer-facing trace 的完整因果链。
- 统一 gateway 的二段式返回语义会直接影响 inspector 的时间线文案与状态模型，planner 应把它当成 Phase 31 的核心 contract。
- 独立 inspector 页面首发就要按角色范围分层读取，避免后续再从 teacher-only 页面硬拆成 admin/developer operator surface。

</specifics>

<deferred>
## Deferred Ideas

- WebSocket adapter 正式 cutover、delivery parity 和 rollback 机制细化 — 留给后续 transport evolution phase。
- 推测型告警、时间窗口阈值、频率驱动的 monitoring/alerting health 系统 — 留给未来 observability 或 operator hardening phase。
- 把 inspector 嵌回 `/classroom` 的近场快捷入口或双入口模式 — 可在后续 UX 优化阶段再讨论。

</deferred>

---

*Phase: 31-transport-boundary-and-runtime-inspector*
*Context gathered: 2026-05-16*
