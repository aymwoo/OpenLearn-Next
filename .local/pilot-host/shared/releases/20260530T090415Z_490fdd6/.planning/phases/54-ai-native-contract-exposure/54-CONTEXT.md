# Phase 54: AI-Native Contract Exposure - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只负责把已经稳定下来的 platform command / action / event / capability
语义暴露成 machine-readable discovery surface，并补上 delegated actor / approval metadata
contract，让未来 Agent、Skill、Workflow 或 operator tool 能“看懂平台能做什么、需要什么、由谁授权”，
而不需要直接读源码猜测。

Phase 54 建立在 Phase 50-53 已冻结的 vocabulary、Command Bus、Action Registry、Plugin Lifecycle
和 Platform Event Bus 之上，目标是交付一组稳定的 descriptor、list/read-model 和 contract verifier，
而不是实现完整 Agent Runtime、Skill Runtime、approval workflow engine 或 sandbox。

本阶段不重开 mutation 主链路，不引入新的 truth source，不把 descriptor surface 恢复成动态 authority，
也不把 delegated metadata 误用成“默认代替人类授权执行”的高权限后门。

</domain>

<decisions>
## Implementation Decisions

### AI-native descriptor scope
- **D-54-01:** Phase 54 必须暴露三类 machine-readable descriptor：`command`、`action`、`capability`。
- **D-54-02:** Phase 54 的 descriptor 只表达 discoverability、input contract、required capability、ownership、stability/version、side-effect posture；不承担执行 authority。
- **D-54-03:** command descriptor truth 来自 `src/features/platform-core/commands/*` 的 code-owned contract；action descriptor truth 继续来自 `src/features/platform-core/actions/*` 的 static/code-owned projection；capability descriptor truth 来自 runtime/platform permission contract，而不是从 UI 或文案页面反推。
- **D-54-04:** 首版 descriptor surface 必须保持 repo-owned、server-readable、machine-readable，不允许 remote manifest execution、dynamic JS evaluation 或 runtime-generated schema。

### Delegated actor and approval metadata
- **D-54-05:** delegated actor metadata 只作为 command/event/audit contract 的附加描述，明确区分 human actor、system actor、plugin actor、delegated agent actor；不改变 Phase 51-53 已建立的 execution authority。
- **D-54-06:** delegated metadata 至少需要表达 `delegationMode`、`delegatedByActorId`、`delegatedAgentKey`、`approvalState`、`approvalReference` 这类 summary-level 字段，但仍保持摘要型 payload，不塞入完整 proposal / approval object snapshot。
- **D-54-07:** approval metadata 只声明 posture 和 reference seam，不在 Phase 54 直接实现完整 approval workflow engine。

### Exposure surface and ownership
- **D-54-08:** discovery surface 应通过 server-side read model / DTO 暴露，例如 `listPlatformCommands()`、`listPlatformActions()`、`listPlatformCapabilities()` 或等价命名；UI 不得直连 registry / schema internals。
- **D-54-09:** `/settings/labs` 或等价 operator/developer entrypoint 可以增加最小 discovery/operator panel，但不得扩成完整 Agent console。
- **D-54-10:** `verify:phase54` 必须锁住本阶段边界：descriptor 不得回收 authority、delegated metadata 不得默认高权限、以及不得偷渡 full Agent Runtime / Skill Runtime / Workflow Engine。

### the agent's Discretion
- command/action/capability descriptor 的精确字段名、DTO 名、目录命名可在现有 `contracts.ts` / `dto.ts` / `registry.ts` 风格下做最小正确收敛。
- delegated metadata 具体落在 command/event/audit 哪些 shared contract 中，可由 planner 在“最小 blast radius + 最大 discoverability”之间收敛，但不能破坏现有 Phase 53 verifier guardrail。
- operator/developer discoverability surface 落在 `/settings/labs`、独立 diagnostics panel，还是只先给 server read model + verifier，可由 planner 决定，只要不演变成 full runtime product。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth and locked requirements
- `.planning/ROADMAP.md` — Phase 54 的正式 goal、requirements、success criteria。
- `.planning/REQUIREMENTS.md` — `AINT-01` 到 `AINT-05` 的 requirement truth。
- `.planning/PROJECT.md` — `v3.0` 的 scope fence：只交付 machine-readable contracts 与 delegated metadata，不交付 full runtime。
- `.planning/STATE.md` — 当前 session state，Phase 53 已完成、Phase 54 为 current focus。

### Locked upstream handoff
- `.planning/phases/50-boundary-freeze-and-platform-vocabulary/50-PHASE-HANDOFF.md` — 明确要求 `Phase 54 must expose descriptors and delegated metadata only; it must not imply full Agent Runtime / Skill Runtime.`
- `.planning/phases/52-action-registry-plugin-lifecycle-governance/52-CONTEXT.md` — action descriptor truth 与 machine-readable catalog/diagnostic split 的冻结来源。
- `.planning/phases/53-platform-event-bus-execution-observability/53-CONTEXT.md` — event summary/correlation/invalidation posture，和“Phase 53 不提前吸入 descriptor surface”的边界。
- `.planning/phases/53-platform-event-bus-execution-observability/53-04-SUMMARY.md` — Phase 53 closeout，确认 `verify:phase53` 已在 scope 上对 Phase 54 做前置保护。

### Existing code ownership and integration anchors
- `src/features/platform-core/commands/contracts.ts` — command type、payload schema、actor/correlation metadata 的 authoritative source。
- `src/features/platform-core/actions/contracts.ts` — action descriptor / executable catalog / blocked diagnostic contract。
- `src/features/platform-core/actions/static-catalog.ts` — static action descriptor projection source。
- `src/features/platform-core/actions/registry.ts` — executable / blocked read model，可作为 Phase 54 action discovery input。
- `src/features/platform-core/events/contracts.ts` — platform event families 与 failure attribution schema，可作为 delegated/audit metadata 的扩展锚点。
- `src/features/runtime-platform/contracts/permissions.ts` — capability、actor scope、permission enums 的 authoritative source。
- `src/features/runtime-platform/contracts/descriptors.ts` — runtime descriptor / governance manifest 既有 machine-readable pattern，可作为 Phase 54 descriptor 设计参考。
- `src/lib/dto/resource-ai.ts` — 现有外部 DTO export 汇聚点，已承载 ActionCatalogDTO 等 machine-readable contract。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `actions/contracts.ts` 已有稳定的 action descriptor schema、required permission、side-effect class 与 implementation source，说明 action discoverability 基础已成立。
- `commands/contracts.ts` 已有稳定的 command envelope、payload schema、actor/correlation metadata，但还没有对应的 public descriptor read model。
- `permissions.ts` 已沉淀 runtime capability、host permission、actor scope，适合作为 capability descriptor 的 truth source。
- `runtime-platform/contracts/descriptors.ts` 已证明本仓库接受“contract-first、Zod-first、machine-readable manifest”模式。
- `resource-ai.ts` 已作为跨 feature DTO 导出层，适合承接 Phase 54 的 discoverability DTO。

### Established Patterns
- descriptor truth 必须来自 code-owned static contract，而不是动态 authority 或 remote manifest execution。
- UI 只能消费 DAL/read model DTO，不能直接 import registry internals 拼装 discoverability surface。
- approval / proposal 在仓库里已经存在 summary-level metadata 先行的模式，因此 Phase 54 也应先交付 metadata contract，而不是 full workflow implementation。
- capability 和 actor scope 已在 runtime layer 有稳定 enum，Phase 54 应复用这些 source-of-truth，而不是再发明第二套 capability vocabulary。

### Integration Points
- `src/features/platform-core/ai-contracts/*` 或等价目录：适合作为 Phase 54 新增 discovery contract/read model/DTO 的主落点。
- `src/lib/dto/resource-ai.ts`：适合增加 `PlatformCommandDescriptorDTO`、`PlatformCapabilityDescriptorDTO` 等导出。
- `src/components/surfaces/settings-surface.tsx`：如需最小 operator/developer discoverability surface，应复用该现有入口。
- `package.json` + `scripts/verify-phase54-*.ts`：需要新增 focused verifier，像 Phase 53 一样保护 phase boundary。

</code_context>

<specifics>
## Specific Ideas

- `listPlatformCommands()` 不应枚举“所有未来命令愿景”，而应只列当前 repo 中真实存在、可调用的 command types。
- command descriptor 应该直接引用 payload schema key 或 input schema name，而不是暴露原始 Zod 对象给外部 consumers。
- capability descriptor 既要说明 capability name，也要说明 owner layer、consumer type、是否可 delegated、是否需要 approval。
- delegated actor metadata 更像“execution posture contract”，不是新的 actor truth source。
- Phase 54 的 UI 若存在，应该是 developer/operator discoverability 面板，不是 chat-like AI 操作台。

</specifics>

<deferred>
## Deferred Ideas

- Full Agent Runtime / Skill Runtime implementation。
- Approval workflow engine、审批流状态机、持久化 approval tasks。
- Dynamic remote descriptor ingestion 或 third-party manifest execution。
- Workflow Engine / Temporal integration。
- 让 descriptor surface 直接拥有执行权限或绕过现有 command/action boundary。

</deferred>

---

*Phase: 54-AI Native Contract Exposure*
*Context gathered: 2026-05-22*
