# Phase 52: Action Registry & Plugin Lifecycle Governance - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只负责把 built-in、default 与 external plugin actions 收进同一套
action registry 与 plugin lifecycle governance 模型：统一 typed descriptor、
discoverability、lifecycle gating、dependency ordering、failure attribution 和
uninstall governance。

Phase 52 不重新定义 plugin identity，不重做 Command Bus，不提前交付
platform event bus 或 AI-native discovery surface，也不把
`src/server/plugins/registry.ts` 恢复成动态权威 registry。它建立在 Phase 50
冻结的 ownership map、Phase 51 已落地的 command boundary，以及 Phase 44 /
48 已形成的 plugin identity 与 uninstall semantics 之上，目标是让“什么
action 当前可用、插件当前处于什么治理状态、为什么不能激活/卸载”变成同一套
可审计、可诊断、可扩展的正式 contract。

</domain>

<decisions>
## Implementation Decisions

### Action catalog visibility
- **D-52-01:** Phase 52 采用双视图 discoverability posture：主 action catalog 只暴露当前可执行 actions；另有单独的 operator/governance diagnostic 视图列出 blocked actions。
- **D-52-02:** diagnostic 视图中的 blocked actions 必须使用稳定的结构化 reason code 暴露阻塞原因，而不是只返回自由文本。
- **D-52-03:** blocked action diagnostic 视图只对 operator / governance surface 可见；普通调用方与未来默认 agent 只消费可执行 catalog。
- **D-52-04:** 对正常平台调用方而言，未安装、未启用、被挂起、依赖不满足或激活失败的插件 actions 都不得进入可执行 catalog。

### Lifecycle vocabulary and semantics
- **D-52-05:** 对外正式 lifecycle vocabulary 固定为 `installed`、`enabled`、`active`、`suspended`、`uninstalled` 五态。
- **D-52-06:** 现有 `mounted`、`ready`、`failed` 保留为内部 orchestration / diagnostic 子状态，不升格为长期对外 lifecycle contract。
- **D-52-07:** `enabled` 的正式语义锁定为“管理员已允许该插件参与系统”；`active` 的正式语义锁定为“依赖满足且激活成功，其 actions 可进入可执行 catalog”。
- **D-52-08:** 激活失败不得直接映射成新的正式 lifecycle state；失败通过内部子状态与 diagnostic reason code 暴露，而不是让外部 contract 扩成第六态 `failed`。

### Dependency ordering and failure handling
- **D-52-09:** 当插件依赖缺失、循环依赖或激活失败时，系统采用“受影响范围内 fail-fast” posture：只阻止受影响插件及其依赖链下游进入 `active`，不让无关插件一起停机。
- **D-52-10:** operator 至少需要看到插件级别的 failure attribution 与 reason code；本阶段不要求把完整内部错误堆栈暴露到治理 surface。
- **D-52-11:** 依赖恢复或修复后不做隐式自动恢复；恢复路径固定为显式 `enable`、`retry`、`reconcile` 等治理动作，保证生命周期变化可审计。
- **D-52-12:** lifecycle gating 与 dependency resolution 必须直接影响 action registry 可见性；“已 enable 但未 active”的插件不得被视为 action 可执行来源。

### Uninstall and retention posture
- **D-52-13:** `uninstall` 默认采用 retain posture：移除插件运行能力和安装关系时默认保留历史数据；只有调用方显式请求 cleanup，才进入数据清理分支。
- **D-52-14:** 当调用方显式请求 cleanup 时，preflight 必须列出可清理的数据类别 / 受影响资源，并要求显式确认后才允许继续执行 cleanup。
- **D-52-15:** built-in / default plugins 复用同一 lifecycle governance model，但继续保持“不可卸载，仅可 disable / suspend”的治理限制。
- **D-52-16:** `disable` 与 `suspend` 的正式语义继续是“停止运行能力但默认保留数据与历史记录”；`uninstall` 是单独治理语义，不能被简化成 disable 的别名。

### the agent's Discretion
- action descriptor 的精确字段名、schema key 命名、以及 reason code 枚举的具体字符串，可由 planner 在现有 command / DTO / Zod 命名风格下做最小正确收敛，只要保持“结构化、稳定、可机器消费”不变。
- diagnostic 视图最终落在独立 query API、operator surface projection，还是 `listActions()` 的 governance-only 变体，可由 planner 决定，只要不污染面向普通调用方的主 catalog。
- `active` 与内部 `mounted` / `ready` 的映射方式，可由 planner 依据现有 activation orchestration 最小改动实现，但外部 contract 不得直接暴露内部细分状态。
- dependency graph / activation snapshot 的精确表名、projection 名和目录拆分可由 planner 收敛，只要 authoritative ownership 继续留在 `src/features/platform-core/actions` 与 `src/features/platform-core/plugins`。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth and locked boundary
- `.planning/ROADMAP.md` — Phase 52 的正式 goal、requirements、success criteria 与 `UI hint`。
- `.planning/REQUIREMENTS.md` — `ACTN-01` 到 `ACTN-05`、`LIFE-01` 到 `LIFE-06` 的 requirement truth。
- `.planning/PROJECT.md` — `v3.0` 当前 milestone posture、SQLite-first、DAL-only、禁止动态第三方代码执行等硬约束。
- `.planning/STATE.md` — 当前 milestone 会话状态；需注意它对当前 phase 的记录仍滞后于 artifact 实际进度。

### Locked upstream context
- `.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-CONTEXT.md` — `platform-core` ownership、command/action/event vocabulary、adapter-only posture 与 deferred wall。
- `.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-PHASE-HANDOFF.md` — 明确锁定 “Phase 52 must not restore dynamic action authority to src/server/plugins/registry.ts.”
- `.planning/phases/51-command-bus-foundation/51-CONTEXT.md` — plugin governance commands、dual-ledger command bus、producer migration boundary 已经锁定。
- `.planning/phases/44-plugin-identity-and-namespace-contract/44-CONTEXT.md` — `pluginKey`、`dbNamespace`、default plugin reconcile contract 已锁定，Phase 52 必须复用。
- `.planning/phases/48-lifecycle-and-uninstall-semantics/SPEC.md` — 当前 uninstall preflight、default plugin 不可卸载、数据 retention / cleanup 历史约束来源。

### Research and architecture direction
- `.planning/research/SUMMARY.md` — 第一阶段平台内核 build order，明确 Phase 52 应交付 action descriptor schema、conflict detection、enabled-state gating 与 lifecycle governance。
- `.planning/research/ARCHITECTURE.md` — `src/features/platform-core/actions/*`、`src/features/platform-core/plugins/*` 的推荐落点，以及 action registry / lifecycle orchestration 与现有仓库的接线 cautions。
- `openlearn_next_upgrade_plan.md` — v3.x 长线升级背景；仅在不冲突于已锁定边界时作为背景参考。

### Current code ownership and integration anchors
- `src/features/platform-core/commands/registry.ts` — 已落地的显式 plugin governance command family，Phase 52 必须在其上继续治理而不是重开第二套 mutation seam。
- `src/features/platform-core/commands/handlers/plugins.ts` — 现有 install / lifecycle transition / uninstall.preflight / uninstall / retry handler 行为与 invalidation pattern。
- `src/features/platform-core/commands/producers/plugin-governance.ts` — Server Action / host / bootstrap producer seam 与 correlation / commandId / dedupe 约束。
- `src/server/plugins/registry.ts` — 当前 static implementation catalog 与 built-in resolution 逻辑；只能继续作为 code-owned implementation 映射，不是动态 authority。
- `src/lib/dal/plugins.ts` — 现有 lifecycle transition matrix、hook gating、plugin audit / governance audit、uninstall block reason、identity / namespace truth。
- `src/features/runtime-platform/contracts/permissions.ts` — 当前 `PluginLifecycleState`、permission 与 governance envelope schema；Phase 52 需决定如何让外部五态 vocabulary 覆盖内部细分状态。
- `src/features/runtime-platform/host-actions/plugin-host.ts` — host governance request 当前如何读取 lifecycle block 与 dispatch command，说明 host action 也必须消费同一 governance posture。
- `src/db/schema.ts` — `pluginRegistrations`、`pluginLifecycleTransitions`、`pluginActionAudits`、`governanceAudits`、`platformCommands` 等 durable anchors。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/platform-core/commands/registry.ts`：已经有完整的 plugin governance command definitions，可作为 action/lifecycle governance 的 authoritative command surface。
- `src/features/platform-core/commands/handlers/plugins.ts`：现有 install、enable、disable、suspend、resume、uninstall.preflight、uninstall、kill switch handler 已证明 lifecycle mutation 走 command bus 的模式成立。
- `src/features/platform-core/commands/producers/plugin-governance.ts`：已把 server action、host action、bootstrap script 收口到统一 producer seam，适合作为 future lifecycle orchestration / registry refresh 的统一入口。
- `src/lib/dal/plugins.ts`：已有 `pluginKey` / `dbNamespace` durable truth、lifecycle transition append-only audit、uninstall preflight block reason 与 hook denial path，是 Phase 52 最应该复用的领域真相层。
- `src/server/plugins/registry.ts`：已有 built-in action allowlist、permission 映射、built-in teaching step resolution，可继续作为 static implementation catalog 输入。

### Established Patterns
- 主业务 mutation 已锁定为 `entrypoint -> Command Bus -> DAL transaction -> audit/invalidation intent`；Phase 52 不应再发明 direct registry mutation 或 host-only governance path。
- 项目继续坚持 SQLite + DAL 为唯一 durable truth；action catalog、activation snapshot、dependency resolution projection 只能围绕 durable truth 工作，不能把 Redis、WebSocket 或 runtime transport 变成新 authority。
- 现有代码已区分 `pluginActionAudits` 与 `governanceAudits`，并贯通 `commandId` / `correlationId`；这说明 blocked-action diagnostics 与 lifecycle failure attribution 应该沿用结构化审计模式。
- `src/lib/dal/plugins.ts` 目前把 `enabled`、`mounted`、`ready` 都当作 runnable states，说明 Phase 52 需要在不破坏内部实现的前提下，为外部 contract 补一层更稳定的 `active` 聚合语义。
- 现有 uninstall posture 已对 default / nonDeletable plugin 做硬阻断，表明 “built-in/default 复用同一 lifecycle model 但不可卸载” 已有事实基础。

### Integration Points
- `src/features/platform-core/actions/*`：应新增 typed action descriptor schema、catalog projection、conflict detection 与 lifecycle/capability gating 逻辑。
- `src/features/platform-core/plugins/*`：应新增 dependency graph、activation orchestration、failure attribution 与 activation snapshot / projection。
- `src/server/plugins/registry.ts`：需要从“硬编码 allowlist + switch”进一步抽成静态实现来源，供新 action registry 投影消费。
- `src/features/runtime-platform/host-actions/plugin-host.ts`：需要消费新的 lifecycle / diagnostic posture，避免 host action 继续只依赖旧的 `isLifecycleBlocked()` 逻辑。
- operator/governance surfaces：需要一个治理专用 diagnostic 读面，单独呈现 blocked actions、reason code、plugin-level failure attribution 与 preflight cleanup 影响。

</code_context>

<specifics>
## Specific Ideas

- 主 action catalog 与 governance diagnostic view 必须分开，前者只表达“此刻可以调用什么”，后者才表达“为什么某些 action 现在不可用”。
- 对外 lifecycle vocabulary 要比当前内部实现更稳定：`active` 是给外部 contract 的聚合语义，不要求 planner 直接重写现有 `mounted` / `ready` 持久状态。
- 依赖或激活失败后不做隐式自动恢复，必须通过显式治理动作重试，这样 command ledger、governance audit 与 operator 认知都更一致。
- cleanup 是显式风险操作：`uninstall` 默认 retain，只有 preflight 列明可清理项并被确认后才允许物理清理。
- built-in / default plugins 继续共享治理模型，但不能因为“同模型”就被放宽成可卸载对象。

</specifics>

<deferred>
## Deferred Ideas

- 把 blocked action diagnostic 直接暴露给所有普通调用方或 future default agent —— 不在本阶段默认开放。
- 把 `failed` 直接升格为正式对外 lifecycle state —— 暂不做，先保持外部五态 contract 稳定。
- 依赖满足后自动重试激活、隐式自愈恢复 —— 不在本阶段采用。
- built-in/default plugin 可卸载化 —— 超出当前治理边界，会改变既有产品语义。
- platform event outbox、event-driven cache invalidation、AI descriptor discoverability —— 分别属于 Phase 53 / 54。
- 把 `src/server/plugins/registry.ts` 恢复成动态 authority 或让插件上传代码后直接注册执行 —— 明确不做。

</deferred>

---

*Phase: 52-Action Registry & Plugin Lifecycle Governance*
*Context gathered: 2026-05-21*
