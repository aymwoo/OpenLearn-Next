# Phase 54: AI-Native Contract Exposure - Research

**Researched:** 2026-05-22  
**Domain:** machine-readable platform descriptors, delegated actor metadata, approval posture  
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AINT-01 | 平台调用方可以列出 commands、actions、capabilities 的 machine-readable descriptors。 | 现有 action catalog 已 machine-readable；command/capability 还缺统一 descriptor read model。[VERIFIED: src/features/platform-core/actions/contracts.ts][VERIFIED: src/features/platform-core/actions/registry.ts][VERIFIED: src/features/platform-core/commands/contracts.ts][VERIFIED: src/features/runtime-platform/contracts/permissions.ts] |
| AINT-02 | 每个 descriptor 都声明 input schema、required capability、side-effect class、stability / version metadata。 | action descriptor 已覆盖部分字段；command 和 capability descriptor 需要补齐 schema key、stability/version、delegation posture 等统一字段。[VERIFIED: src/features/platform-core/actions/contracts.ts][VERIFIED: src/features/runtime-platform/contracts/descriptors.ts] |
| AINT-03 | command、event、audit metadata 支持 human actor、system actor、plugin actor、delegated agent actor。 | command/event 已有 actorScope/correlation；delegated agent actor 尚无统一 metadata contract。[VERIFIED: src/features/platform-core/commands/contracts.ts][VERIFIED: src/features/platform-core/events/contracts.ts] |
| AINT-04 | delegated agent action 可以携带 delegation / approval metadata，而不是默认高权限执行。 | 仓库里已有 approvalState 等 summary metadata 模式，可复用为 contract-level posture，但当前没有统一 delegated contract。[VERIFIED: src/db/schema.ts][VERIFIED: src/lib/dto/resource-ai.ts] |
| AINT-05 | `v3.0` 交付 agent-callable contracts，而不要求完整 Agent Runtime / Skill Runtime 落地。 | Phase 50 handoff 已明确限制只做 descriptors and delegated metadata；Phase 53 verifier 已对 scope leakage 设闸门。[VERIFIED: .planning/phases/50-boundary-freeze-and-platform-vocabulary/50-PHASE-HANDOFF.md][VERIFIED: scripts/verify-phase53-platform-events.ts] |

</phase_requirements>

## Summary

Phase 54 最重要的现实基础已经具备：

1. **Action 侧已经有 machine-readable descriptor truth。** `ActionDescriptorSchema`、static catalog 与 registry read model 已经证明“code-owned descriptor -> DTO/read model -> consumer surface”在仓库里是可行模式。[VERIFIED: src/features/platform-core/actions/contracts.ts][VERIFIED: src/features/platform-core/actions/static-catalog.ts][VERIFIED: src/features/platform-core/actions/registry.ts]
2. **Command 侧已经有稳定 contract，但缺 discoverability projection。** `PlatformCommandSchema`、payload schema map、actor/correlation metadata 都在 `commands/contracts.ts`，所以 Phase 54 不需要重建 command truth，只需要把它投影为 descriptor surface。[VERIFIED: src/features/platform-core/commands/contracts.ts]
3. **Capability vocabulary 已冻结，但还未以 descriptor 形式对外。** runtime/platform permissions 已是 authoritative enum，适合作为 capability descriptor truth source。[VERIFIED: src/features/runtime-platform/contracts/permissions.ts]
4. **Delegation / approval posture 有零散先例，但缺统一平台 contract。** 例如 proposal/approval state、AI proposal DTO、schedule import approval metadata 已存在 summary-level 字段，可以为 Phase 54 提供 contract naming 参考，但不能直接拼成 runtime engine。[VERIFIED: src/lib/dto/resource-ai.ts][VERIFIED: src/db/schema.ts]

**Primary recommendation:** 把 Phase 54 分成“descriptor contract -> registry/read model -> delegated metadata -> verifier/operator panel”四步，严格复用现有 command/action/capability truth，交付 server-readable、machine-readable、agent-callable contracts，同时明确 delegated metadata 只是 posture contract，不是 authority bypass。

## Recommended Approach

1. **先定义统一 descriptor contract。**
   - 新增 platform AI contract schema，覆盖 `command`、`action`、`capability` 三类 descriptor 的 shared fields：`key`、`kind`、`inputSchemaKey`、`requiredCapabilities`、`sideEffectClass`、`stability`、`version`、`implementationSource`、`approvalMode`、`delegationSupport`。
   - 保持 action descriptor 与既有 `ActionDescriptorSchema` 对齐，不重复发明第二套字段名。

2. **再做 command/action/capability discovery projection。**
   - `commands/contracts.ts` 的真实 command types + payload schema map 变成 command descriptor list。
   - `actions/registry.ts` 的 executable / blocked view 变成 action discovery source。
   - `permissions.ts` / `descriptors.ts` 中的 runtime capability 和 runtime descriptor 元信息变成 capability discovery source。
   - 统一由 server read model 暴露 `listPlatformCommands` / `listPlatformActions` / `listPlatformCapabilities`。

3. **补 delegated actor / approval metadata contract。**
   - 为 command/event/audit 增加可选 delegated metadata summary，例如：
     - `delegationMode: "none" | "agent-proposed" | "agent-delegated"`
     - `delegatedAgentKey`
     - `delegatedByActorId`
     - `approvalState`
     - `approvalReference`
   - 这些字段是 summary-only，不能携带完整 snapshot，也不能让 command bus 自动提升 actorScope。

4. **最后补 focused verifier 和最小 surface。**
   - `verify:phase54` 静态阻止三类回退：
     - descriptor reclaim authority
     - delegated metadata implies implicit privilege escalation
     - full Agent Runtime / Skill Runtime / Workflow Engine scope creep
   - 若需要 UI，只做 `/settings/labs` 或等价入口里的最小 discoverability panel。

## Architecture Patterns

### Pattern 1: Code-owned descriptor projection
- **What:** descriptor truth 来自 code-owned contracts，再投影成 machine-readable list/read model。
- **Why:** 既符合 Phase 50/52 的“descriptor 不得回收 authority”，也能避免 future consumer 直接依赖源码内部形状。

### Pattern 2: Shared descriptor shell + kind-specific details
- **What:** 三类 descriptor 共用壳层字段，再附带 `commandDetails` / `actionDetails` / `capabilityDetails`。
- **Why:** 让 future Agent caller 能统一消费，也避免 command/action/capability 各自发明 incompatible schema。

### Pattern 3: Delegation metadata is annotation, not authority
- **What:** delegated metadata 只标注“谁代表谁提出/调用、是否需要 approval、当前 approval posture”，不直接改变实际授权逻辑。
- **Why:** 避免在 contract phase 偷渡 execution policy rewrite。

### Pattern 4: Verifier-first scope fencing
- **What:** 用 `verify:phase54` 静态 guard 锁死不允许的 runtime ambitions。
- **Why:** Phase 54 最容易 scope creep；如果没有 verifier，descriptor surface 很快会滑向 runtime engine。

## Recommended Project Structure

```text
src/features/platform-core/
├── ai-contracts/
│   ├── contracts.ts          # shared + kind-specific descriptor schemas
│   ├── registry.ts           # command/action/capability descriptor projection
│   ├── read-model.ts         # server list/detail functions
│   └── dto.ts                # outward-facing DTOs
├── commands/contracts.ts     # optional delegated metadata extension point
├── events/contracts.ts       # optional delegated/audit metadata extension point
└── actions/contracts.ts      # reused as action descriptor truth
```

## Anti-Patterns to Avoid

- **把 descriptor 做成新的执行 authority。** discovery 不能直接跳过现有 command/action registry。
- **把 delegated metadata 视为默认高权限执行凭证。** 这会绕过 Phase 51-53 的 actor/authorization boundary。
- **把 capability list 做成 UI 文案映射表。** capability truth 必须继续来自 runtime/platform contract enums。
- **在 Phase 54 偷渡 full Agent Runtime / Skill Runtime。** 这直接违反 Phase 50 handoff。
- **把 approval posture 扩成完整审批系统。** Phase 54 只做 contract/reference，不做 workflow engine。

## Suggested Plan Split

1. **54-01**: 定义 shared AI-native descriptor contracts 与 outward DTO。
2. **54-02**: 构建 command/action/capability discovery registry/read model。
3. **54-03**: 扩展 delegated actor / approval metadata 到 command/event/audit contract。
4. **54-04**: 补最小 operator/developer discoverability surface 与 `verify:phase54`。

---

*Phase: 54-AI Native Contract Exposure*
*Research completed: 2026-05-22*
