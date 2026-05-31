# Phase 30 Research

**Date:** 2026-05-16
**Phase:** 30 - Capability enforcement and plugin lifecycle
**Status:** Complete

## Research question

如何在不改写 Phase 29 已完成的 shared Runtime Host 与本地 HTML pilot
结构的前提下，把 runtime 与 plugin 升级为 capability-checked、
lifecycle-driven、allowed-or-denied 可审计的平台治理层？

## Recommended implementation posture

### 1. Keep one host action entry, then add governance

- 继续以 `createGuardedHostAction()` 为唯一 server-side host action entry。
- 不新增平行 dispatch channel，不引入 generic `execute` 或自由字符串 verb。
- capability gate 应建立在现有 `runtime-host.ts` 与 `plugin-host.ts` 之上，
  而不是回流到 iframe、client surface 或 manifest 自报权限。

### 2. Split requested capability from granted decision

- `requestedCapabilities` 只表达 runtime 或 plugin 想要什么，不表达最终授权。
- 最终决策必须由服务端基于以下 truth 重算：
  - published snapshot 中冻结的 runtime descriptor
  - school-scoped plugin registration
  - actor scope / membership
  - lifecycle state
  - allowlist action definition
- denied 结果必须返回可机读 reason code，而不是只抛通用异常。

推荐的第一批 denied code：

- `not_allowlisted`
- `capability_missing`
- `permission_denied`
- `lifecycle_blocked`
- `school_mismatch`
- `kill_switch`
- `unsupported_action`

### 3. Manifest v2 should evolve the current school-scoped manifest path

- 不引入新的 package registry 或 remote marketplace truth。
- `manifestJson` 继续是 school-scoped source of truth，但 schema 升级到 v2。
- manifest v2 需要显式承载四类治理信息：
  - runtime declaration
  - requested capabilities
  - permission contract
  - lifecycle metadata
- built-in HTML courseware 必须能无痛迁移到 v2，并保持当前
  `payload.runtime` freeze posture 不变。
- 任何旧 manifest 缺失 v2 字段时都必须默认更保守，不能隐式放宽权限。

### 4. Lifecycle needs two truths: latest state plus append-only transitions

- 仅靠 `enabled` 布尔值已经不足以表达运行治理。
- Phase 30 需要同时持久化：
  - current lifecycle state
  - append-only transition log
- canonical lifecycle vocabulary 固定为：
  - `installed`
  - `enabled`
  - `mounted`
  - `ready`
  - `suspended`
  - `disabled`
  - `failed`
- `installed / enabled / disabled` 更接近 package registration 治理。
- `mounted / ready / suspended / failed` 更接近运行中 truth。

### 5. Allowed and denied audit should converge to one downstream query model

- 目前 plugin denied path 已有一部分审计，但 runtime path 还不统一。
- Phase 30 的目标不是先做 inspector UI，而是先把 durable truth 统一好。
- 推荐无论复用现有表还是新增 shared governance audit root，最终都必须
  能提供一条统一 query model 给 Phase 31。

每条治理审计至少要能关联：

- action
- decision (`allowed` / `denied`)
- reason code
- actorId / actorScope
- schoolId
- pluginId 或 runtimeId
- runtimeInstanceId / runtimeSessionId（如有）
- lifecycle snapshot
- requested capabilities / required permission 摘要
- correlationId
- timestamp

### 6. Verification should stay phase-specific and code-anchored

- 延续 Phase 27-29 的模式：静态 guards + focused tests + `verify:phase30`。
- verifier 至少覆盖四类 drift：
  - capability gate drift
  - manifest contract drift
  - lifecycle persistence drift
  - governance audit drift
- 不把完成条件建立在 help 文档或人工 checklist 上。

## Codebase patterns to reuse

### Existing guard wrapper

- `src/features/runtime-platform/host-actions/guards.ts`
- 已统一 actor scope、school scope、permission gate。
- Phase 30 只需要在其上追加 capability 与 lifecycle decision。

### Existing runtime dispatch concentration

- `src/features/runtime-platform/host-actions/runtime-host.ts`
- 已集中承接 runtime host verbs，适合作为 capability gate 收口点。

### Existing plugin denied audit posture

- `src/lib/dal/plugins.ts`
- `runPluginHook()` 已有 `disabled`、`kill_switch`、`school_mismatch`、
  `not_allowed`、`permission_denied` 等 denied reason 与 audit 写入。

### Existing contract anchors

- `src/features/runtime-platform/contracts/descriptors.ts`
- `src/features/runtime-platform/contracts/permissions.ts`
- 已存在 `RuntimeManifestV2Schema` placeholder 与 lifecycle placeholder，
  应在此基础上升级，而不是另起 schema。

### Existing durable append-only pattern

- `src/features/runtime-platform/classroom/runtime-session.ts`
- `src/db/schema.ts`
- 仓库已接受 latest state + append-only history 并存的 durable posture。

## Risks and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| capability decision 继续分散在 runtime 与 plugin 两套逻辑 | 后续 audit 与 inspector 无法收敛 | 在 shared guard / dispatch 层统一 decision semantics |
| manifest v2 变成另一套 registry | school-scoped truth ownership 漂移 | 只演进现有 `manifestJson` 路径 |
| lifecycle 继续隐式推断 | `failed`、`suspended` 无法成为硬阻断条件 | latest state + transition log 双持久化 |
| runtime allowed path 仍无审计 | Phase 31 inspector 只能看到 denied truth | 统一记录 allowed 与 denied |
| verifier 只测 denied path | capability gate 漏洞会在 allowed path 隐藏 | focused tests 同时覆盖 allowed 与 denied |

## Recommended plan structure

1. 先为 runtime 与 plugin host action 加 capability-gated decision semantics。
2. 升级 plugin manifest v2，使 capability、permission、lifecycle metadata
   成为显式治理输入。
3. 持久化 lifecycle current state 与 transition log，并把 lifecycle state
   变成 host action 的硬 gate。
4. 统一 allowed / denied audit 语义，并建立 `verify:phase30`。

## Requirement coverage intent

| Requirement | Planned approach |
|---|---|
| `GOVR-01` | 在 runtime/plugin host action 唯一路径上追加 capability-gated decision |
| `GOVR-02` | 将 school-scoped plugin manifest 升级到 v2 governance schema |
| `GOVR-03` | 持久化 lifecycle state 与 transition，并让 blocked state 成为硬阻断 |
