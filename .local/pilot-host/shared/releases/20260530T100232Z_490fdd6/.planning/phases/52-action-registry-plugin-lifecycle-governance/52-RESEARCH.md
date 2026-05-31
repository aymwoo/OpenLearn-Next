# Phase 52 Research — Action Registry & Plugin Lifecycle Governance

**Phase:** 52  
**Date:** 2026-05-21  
**Confidence:** HIGH  
**Discovery level:** Level 0 — 现有代码与已冻结 phase 足够支撑规划，无需新增外部依赖或新框架研究。

## Planning question

本阶段真正要回答的是：如何在 **不恢复动态 registry authority、不引入动态代码执行、不中断 Phase 51 command boundary** 的前提下，把 action discoverability、plugin lifecycle governance、dependency ordering、failure attribution、retain/cleanup uninstall posture 收进一套正式 contract。

## Recommended approach

### 1. Keep registry authority code-owned

- `src/server/plugins/registry.ts` 继续只做 **static implementation catalog**。
- Phase 52 新增的 `src/features/platform-core/actions/*` 只负责：
  - typed descriptor schema
  - catalog projection
  - conflict detection
  - executable catalog vs operator-only diagnostic view
- 这直接承接：
  - `ACTN-01` / `ACTN-02` / `ACTN-04` / `ACTN-05`
  - `D-52-01` ~ `D-52-04`
  - Phase 50 handoff 中 “must not restore dynamic action authority” 的硬约束。

### 2. Separate executable catalog from blocked diagnostics

- 面向普通调用方的主 catalog 只返回 **当前可执行 actions**。
- blocked actions 必须进入独立 operator/governance diagnostic read model。
- blocked diagnostics 需要稳定 machine-readable reason code，并给出恢复动作提示，但不暴露完整错误堆栈。

这意味着 registry 需要两层输出：

1. **Executable action catalog**
2. **Governance diagnostics projection**

二者共享 descriptor truth，但不共享可见性策略。

### 3. Introduce an external five-state lifecycle contract

当前仓库内部真实状态仍是：

- `installed`
- `enabled`
- `mounted`
- `ready`
- `suspended`
- `disabled`
- `failed`

Phase 52 不应该直接重写现有持久状态；更稳的做法是新增一层 **external lifecycle projection**：

- `installed`
- `enabled`
- `active`
- `suspended`
- `uninstalled`

其中：

- `mounted` / `ready` → external `active`
- activation failure 不升格为第六个外部状态；通过 internal substate + reason code 暴露
- `uninstalled` 更适合作为 governance/read model 里的 terminal audit state，而不是要求当前 registration 行长期保留。

这直接承接：

- `LIFE-01`
- `D-52-05` ~ `D-52-08`

### 4. Make lifecycle gating feed registry visibility

当前 `src/lib/dal/plugins.ts` 的 runnable truth 仍是：

- `enabled`
- `mounted`
- `ready`

Phase 52 需要把它提升成正式治理投影：

- lifecycle snapshot
- dependency status
- activation result
- blocked reason code
- recommended recovery action

并让 action registry 以这份投影为输入：

- 非 `active` 插件动作不进入 executable catalog
- 但 operator diagnostics 仍能看到被阻塞动作和原因

这直接承接：

- `ACTN-03`
- `LIFE-02`
- `LIFE-03`
- `LIFE-06`
- `D-52-09` ~ `D-52-12`

### 5. Keep recovery explicit and auditable

研究结论与 CONTEXT 锁定一致：

- 依赖恢复后 **不能自动恢复**
- 恢复动作必须显式走 `plugin.enable` / `plugin.retry` / `plugin.resume` / future reconcile
- host/server/operator surface 都必须复用同一 command surface

这意味着新的 projection/read model 只能帮助 diagnosis，不能偷偷触发 self-heal。

### 6. Preserve uninstall semantics but expand governance honesty

当前 command surface 已有：

- `plugin.uninstall.preflight`
- `plugin.uninstall`

Phase 52 不重做 uninstall 命令，只要把治理语义补全到 operator surface：

- 默认 posture = `retain`
- `cleanup` 必须显式 opt-in
- preflight 必须列出数据类别与数量
- built-in/default plugin 继续同 lifecycle model，但不可卸载

这直接承接：

- `LIFE-04`
- `LIFE-05`
- `D-52-13` ~ `D-52-16`

## Architecture responsibility map

| Area | Authoritative owner | Notes |
|------|---------------------|-------|
| Static implementation source | `src/server/plugins/registry.ts` | 继续是 code-owned implementation catalog，不是动态 authority |
| Action descriptor / catalog projection | `src/features/platform-core/actions/*` | 新增 typed descriptor、catalog、conflict detection |
| Lifecycle / dependency / failure governance projection | `src/features/platform-core/plugins/*` + `src/lib/dal/plugins.ts` | Projection 可以新增，durable truth 仍在 SQLite + DAL |
| Mutation path | `src/features/platform-core/commands/*` | 继续复用 Phase 51 command bus |
| Host/server action adapters | `src/features/runtime-platform/host-actions/plugin-host.ts`, `src/actions/plugin-actions.ts` | 只做 producer / read adapter |
| Operator surface | `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` | 消费 projection，不自产生第二真相源 |
| Durable audits | `pluginActionAudits`, `governanceAudits`, `platformCommands` | reason code / correlation / command linkage 应继续复用 |

## Existing patterns to reuse

### Command producer pattern

- `src/features/platform-core/commands/producers/plugin-governance.ts`
- Producer 负责 `commandId`、`correlationId`、dedupe、invalidationTags
- platform-core 内核不直接调用 `updateTag()`

### DAL truth + projection split

- `src/lib/dal/plugins.ts` 已提供：
  - lifecycle transition matrix
  - uninstall preflight
  - audit append
  - runnable-state helper
- Phase 52 应该在此之上增加 projection，而不是平行复制一套 mutation seam。

### Operator surface honesty

- `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` 已经具备：
  - lifecycle badge
  - preflight summary
  - destructive confirmation
- Phase 52 要升级为 **catalog + governance diagnostics** 双视图，而不是推翻原 surface 语义。

### Verification pattern

- `scripts/verify-phase51-command-bus.ts` 提供了当前 repo 的 phase verifier 模式：
  - 静态 guard
  - focused Vitest
  - 明确禁止 brittle exact-string drift

## Risks and planning implications

1. **Biggest blast radius:** `PluginLifecycleState` 现有内部枚举已经被多处消费。  
   → 规划时应优先选择 “新增 external projection” 而不是直接替换 DB enum。

2. **Biggest integrity risk:** executable catalog 与 governance diagnostic 若混在一个默认列表，会直接违反 `D-52-01` ~ `D-52-04`。  
   → 规划必须把两种 read model 明确拆开。

3. **Biggest security risk:** blocked diagnostics 若被普通调用方默认消费，会泄露治理内部状态。  
   → operator-only gate 必须体现在 plan 中，而不是留给实现时猜测。

4. **Biggest semantic drift risk:** UI 如果继续直接展示 `mounted` / `ready` / `failed` 作为长期对外状态，会破坏外部五态 contract。  
   → 需要明确 lifecycle mapping 与 badge vocabulary。

## Verification recommendations

Phase 52 的完成验证至少要覆盖：

1. duplicate action key 被明确拒绝，不静默覆盖  
2. executable catalog 不泄露 blocked actions  
3. operator diagnostics 能看到稳定 reason code 与恢复动作  
4. dependency/cycle/failure 只阻断受影响插件链路，不拖垮无关插件  
5. recover path 只能通过显式治理动作，不发生 auto-recovery  
6. uninstall retain/cleanup posture 与 preflight 分类数量一致  
7. built-in/default plugin 继续同治理模型但不可卸载  

## Planning recommendation

将 Phase 52 拆成三份执行计划最稳妥：

1. **Action descriptor contract + static catalog source**
2. **Lifecycle governance projection + dependency/failure model**
3. **Registry wiring + operator UI + phase verifier**

这样可以把 Wave 1 的 contract/projection 基础并行完成，再在 Wave 2 统一接线与验证。
