---
phase: 54-ai-native-contract-exposure
reviewed: 2026-05-22T15:04:41Z
depth: deep
files_reviewed: 15
files_reviewed_list:
  - package.json
  - scripts/verify-phase54-ai-contracts.ts
  - src/components/surfaces/settings-surface.test.tsx
  - src/components/surfaces/settings-surface.tsx
  - src/features/platform-core/ai-contracts/contracts.test.ts
  - src/features/platform-core/ai-contracts/contracts.ts
  - src/features/platform-core/ai-contracts/delegation.test.ts
  - src/features/platform-core/ai-contracts/delegation.ts
  - src/features/platform-core/ai-contracts/read-model.test.ts
  - src/features/platform-core/ai-contracts/read-model.ts
  - src/features/platform-core/ai-contracts/registry.test.ts
  - src/features/platform-core/ai-contracts/registry.ts
  - src/features/platform-core/commands/contracts.ts
  - src/features/platform-core/events/contracts.ts
  - src/lib/dto/resource-ai.ts
findings:
  critical: 2
  warning: 2
  info: 0
  total: 4
status: issues_found
---

# Phase 54: Code Review Report

**Reviewed:** 2026-05-22T15:04:41Z
**Depth:** deep
**Files Reviewed:** 15
**Status:** issues_found

## Summary

本次审查覆盖了 Phase 54 的全部变更文件，并额外沿着 command/event
执行链追踪了运行时行为。结论：这批改动的 contract 设计方向基本清晰，但当前实现
仍有两个会影响实际安全语义或审计正确性的 **BLOCKER**，另外回归门和测试覆盖也
存在明显缺口。

## Critical Issues

### CR-01: BLOCKER — delegated actor 可以伪装成高权限 scope

**File:** `src/features/platform-core/ai-contracts/delegation.ts:8-13`

**Issue:** `delegatedAgentScope` 直接复用了 `RuntimeActorScopeSchema`，这意味着
`audit.delegatedActor` 可以被声明成 `system`、`host`、`teacher` 等高权限 scope。
当前只靠 `authorityPosture: "delegated-no-elevation"` 这个字面量约束，实际上并没有
任何校验去阻止“无升权”元数据携带更高权限身份。这会污染审计语义，甚至让下游把
委托执行误读成高权限代理执行。

**Fix:** 收紧 delegated actor 的可选 scope，并在命令/事件边界做显式校验。例如：

```ts
const DelegatedAgentScopeSchema = z.enum(["plugin"])

export const PlatformDelegatedActorMetadataSchema = z.object({
  delegatedAgentId: z.string().min(1),
  delegatedAgentScope: DelegatedAgentScopeSchema,
  delegationReason: z.string().min(1),
  authorityPosture: z.literal("delegated-no-elevation"),
}).strict()
```

如果后续确实需要多种 delegated scope，也要在 `PlatformCommandSchema` /
`PlatformEventSchema` 上追加 `superRefine`，明确拒绝比原始 actor 更高的 scope。

### CR-02: BLOCKER — command 上的 audit metadata 在事件链路中被静默丢弃

**File:** `src/features/platform-core/events/contracts.ts:70-128`, `src/features/platform-core/commands/handlers/plugins.ts:92-108`, `src/features/platform-core/commands/handlers/plugins.ts:126-139`, `src/features/platform-core/commands/bus.ts:203-216`

**Issue:** Phase 54 给 command/event contract 新增了 `audit` seam，但实际发出的
success/domain/failure event 都没有把 `command.audit` 带下去。`PlatformSuccessEventSchema`
和其他 event schema 用默认值把 `audit` 补成 `{ delegatedActor: null, approval: null }`，
因此运行时不会报错，但委托执行与 approval 信息会在持久化事件里全部丢失。结果是：
schema 看起来支持审计，实际 ledger/timeline 里却看不到 Phase 54 声称新增的核心元数据。

**Fix:** 在事件构造时显式透传 `command.audit`，并补一条 command-bus 级回归测试。

```ts
function buildSuccessEvent(input: {
  aggregateId: string
  commandType: PlatformCommandType
  invalidationTags: string[]
  resultSummary: Record<string, unknown> | null
  audit: PlatformAuditMetadata
}): PlatformSuccessOrDomainEvent {
  return {
    eventType: "platform.command.succeeded",
    category: "outcome",
    aggregateType: "plugin",
    aggregateId: input.aggregateId,
    payload: {
      commandType: input.commandType,
      invalidationTags: input.invalidationTags,
      resultSummary: input.resultSummary,
    },
    audit: input.audit,
  }
}
```

并且 domain event / synthesized failure event 也要同样携带 `command.audit`。

## Warnings

### WR-01: WARNING — `verify:phase54` 的 scope creep 检查会被无关文件误伤

**File:** `scripts/verify-phase54-ai-contracts.ts:92-103`, `scripts/verify-phase54-ai-contracts.ts:147-153`

**Issue:** `readPhase54Sources()` 会把 `src/components/surfaces` 整个目录的所有非测试文件都扫进来，
然后用全文字符串匹配去判断是否出现 `Agent Runtime` / `Workflow Engine` 等关键字。只要
其他无关 surface 文件未来出现这些词，`verify:phase54` 就会误报失败，导致 close gate
变成脆弱的全局文本扫描，而不是针对 Phase 54 交付面的精确校验。

**Fix:** 把静态检查范围收敛到本 phase 的目标文件，至少限定为
`settings-surface.tsx` 与 `src/features/platform-core/ai-contracts/*.ts`；更稳妥的做法是直接
导入目标模块，校验结构化输出而不是扫全文字符串。

### WR-02: WARNING — 当前测试主要锁字符串和 schema parse，没覆盖真实行为回归

**File:** `src/components/surfaces/settings-surface.test.tsx:189-208`, `src/features/platform-core/ai-contracts/delegation.test.ts:19-129`

**Issue:** Phase 54 的新增测试大多在检查源码里是否包含某些字符串，或者只验证 schema
能否 parse 一个手写对象；它们没有覆盖真正的运行路径，比如：

- `/settings/labs` 是否真的渲染出 discoverability panel
- dispatch 一个带 `audit` 的 command 后，持久化 event 是否保留 `audit`
- delegated metadata 是否拒绝高权限 scope

这也是为什么上面的审计丢失问题可以直接漏过现有测试。

**Fix:** 增加行为级测试，而不是继续堆文本断言。例如：

```ts
it("persists delegated audit metadata into emitted events", async () => {
  const result = await dispatchPlatformCommand(commandWithAudit, deps)
  expect(persistedEvents[0].audit.delegatedActor?.delegatedAgentId).toBe("agent_1")
})
```

同时给 Labs surface 加真实 render 断言，校验 DOM 中的 descriptor 数量和 posture badge。

---

_Reviewed: 2026-05-22T15:04:41Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
