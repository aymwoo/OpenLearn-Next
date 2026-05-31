---
phase: 52-action-registry-plugin-lifecycle-governance
plan: "04"
subsystem: platform-lifecycle
tags: [plugins, governance, lifecycle, drizzle, sqlite, vitest, host-actions]
requires:
  - phase: 52-03
    provides: [registry governance read model, host adapter governance surface, phase52 verifier baseline]
provides:
  - server-enforced retain/cleanup uninstall contract with deterministic cleanup confirmation tokens
  - dependency-aware enable/resume lifecycle transitions with topological activation ordering
  - reason-code-gated host recovery commands and strengthened phase52 close gate verification
affects: [phase52-ui-gap-closure, plugin-operator-surface, runtime-host-governance]
tech-stack:
  added: []
  patterns: [deterministic destructive confirmation token, dependency-chain lifecycle orchestration, reason-code recovery gate]
key-files:
  created: [.planning/phases/52-action-registry-plugin-lifecycle-governance/52-action-registry-plugin-lifecycle-governance-04-SUMMARY.md]
  modified:
    - src/db/schema.ts
    - src/features/platform-core/commands/contracts.ts
    - src/features/platform-core/commands/handlers/plugins.ts
    - src/features/platform-core/plugins/dependency-graph.ts
    - src/features/platform-core/plugins/governance-projection.ts
    - src/features/platform-core/plugins/governance-projection.test.ts
    - src/lib/dal/plugins.ts
    - src/lib/dal/plugins.test.ts
    - src/actions/plugin-actions.ts
    - src/actions/plugin-actions.test.ts
    - src/features/runtime-platform/host-actions/plugin-host.ts
    - src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts
    - scripts/verify-phase52-action-registry-and-lifecycle.ts
key-decisions:
  - "cleanup uninstall 必须重新 preflight 并校验 deterministic confirmationToken，不能只依赖前端本地状态。"
  - "retain uninstall 保留 registration row，并显式写入 uninstalledAt / uninstallRetentionMode 作为服务端真相。"
  - "blocked host write action 按 reasonCode 精确放行恢复命令，dependency 问题继续要求 reconcile gate。"
  - "enable/resume 写路径直接消费 activation chain helper，missing dependency / cycle fail-fast。"
patterns-established:
  - "Destructive confirmation pattern: preflight 输出 deterministic token，mutation 侧必须重算并精确匹配。"
  - "Dependency-first activation pattern: 先求 chain，再按拓扑顺序 transition 依赖与目标插件。"
requirements-completed: [ACTN-03, LIFE-02, LIFE-05]
duration: 11min
completed: 2026-05-22
---

# Phase 52 Plan 04: Action Registry Plugin Lifecycle Governance Summary

**插件 uninstall retain/cleanup 服务端真闭环、reason-code 恢复门禁与 dependency-aware lifecycle 写路径落地，并由 phase52 verifier 封口验证。**

## Performance

- **Duration:** 11 min
- **Started:** 2026-05-22T06:27:12+08:00
- **Completed:** 2026-05-22T06:38:03+08:00
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- 将 cleanup uninstall 从前端意图升级为服务端强制校验：preflight 生成 deterministic confirmation token，cleanup 分支重跑 preflight 并拒绝不匹配 token。
- 将 retain uninstall 变成持久化语义：registration 不再 hard delete，而是写入 `uninstalledAt` / `uninstallRetentionMode="retain"` 并投影为 `uninstalled`。
- 把 dependency ordering 和 host recovery gate 真正接入写路径：enable/resume 先解依赖链，blocked host action 只对匹配 `reasonCode` 的恢复命令放行。
- 扩展 `verify:phase52`，覆盖 cleanup confirmation、retain posture、recovery gate 与 dependency activation close gate。

## Task Commits

Each task was committed atomically:

1. **Task 1: 把 uninstall retain/cleanup contract 变成服务端真相** - `e285ed5` (test), `b0c83fd` (feat)
2. **Task 2: 让 dependency ordering 与 host recovery 真正进入生命周期写路径** - `7c58d46` (feat)
3. **Task 3: [BLOCKING] 推送 Drizzle schema 并重跑 Phase 52 close gate** - `ca92b9b` (feat)

**Plan metadata:** 未提交额外 docs metadata commit（遵循本次执行避免改动 `.planning/STATE.md` / `.planning/ROADMAP.md` 的约束）

## Files Created/Modified
- `src/db/schema.ts` - 为 retain uninstall 增加 `uninstalledAt` 与 `uninstallRetentionMode`
- `src/features/platform-core/commands/contracts.ts` - 扩展 `plugin.uninstall` payload，支持 `confirmationToken`
- `src/lib/dal/plugins.ts` - 实现 uninstall preflight token、cleanup token 校验、retain/cleanup 分支持久化语义
- `src/actions/plugin-actions.ts` - server action 透传 uninstall confirmation token
- `src/actions/plugin-actions.test.ts` - 覆盖 uninstall confirmation token 透传
- `src/lib/dal/plugins.test.ts` - 覆盖 retain/cleanup uninstall 行为与 token 校验
- `src/features/platform-core/plugins/dependency-graph.ts` - 新增 activation chain helper
- `src/features/platform-core/commands/handlers/plugins.ts` - enable/resume 写路径接入 dependency-aware activation ordering
- `src/features/runtime-platform/host-actions/plugin-host.ts` - blocked lifecycle recovery 按 `reasonCode` 精确放行
- `src/features/runtime-platform/host-actions/plugin-host.phase52.test.ts` - 覆盖恢复命令放行/拒绝行为
- `src/features/platform-core/plugins/governance-projection.test.ts` - 覆盖 activation chain / missing dependency 断言
- `scripts/verify-phase52-action-registry-and-lifecycle.ts` - close gate 增强为校验 cleanup confirmation、recovery gate、dependency ordering

## Decisions Made
- cleanup destructive path 不接受“仅传 cleanup 模式”的弱契约，必须附带与最新 preflight 完全匹配的 confirmation token。
- retain uninstall 不复用 cleanup hard delete 路径，防止治理状态与扩展数据被误删。
- dependency_missing / dependency_cycle 在 host 侧保持显式 reconcile gate，不允许直接 resume/retry 越过依赖问题。
- phase52 verifier 采用静态 contract + focused behavior suites 双层关口，而不是只依赖 UI/host 测试。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 修复本地 SQLite 历史 migration 漂移导致的 schema push 阻塞**
- **Found during:** Task 3 ([BLOCKING] 推送 Drizzle schema 并重跑 Phase 52 close gate)
- **Issue:** `local.db` 的历史 schema / index 状态与 drizzle migration metadata 漂移，导致 `npx drizzle-kit push` 反复报 `column missing` 与 `index/table already exists`。
- **Fix:** 先补齐本地缺失 `commandId` 列，再对 `local.db` 做最小化修复：仅删除可重建的命名索引/重复对象，由 `drizzle-kit push` 重新应用目标 schema 与索引。
- **Files modified:** 无 git 跟踪文件；仅本地 `local.db` 开发库结构被最小修复
- **Verification:** `npx drizzle-kit push` 成功；`PRAGMA table_info('pluginRegistration')` 可见 `uninstalledAt` 与 `uninstallRetentionMode`
- **Committed in:** 未形成代码提交（环境修复用于完成 Task 3）

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 该修复仅针对本地开发库漂移，未扩大代码范围；是完成 schema push 所必需的最小修复。

## Issues Encountered
- `drizzle-kit push` 初始被历史 SQLite 漂移阻塞：先后出现缺 `commandId` 列、重复索引/重复表问题；通过只修本地开发库可重建结构收敛。

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- uninstall governance 写路径、host recovery gate 与 dependency-aware activation 已闭环，UI gap closure 可直接依赖新的服务端语义。
- `verify:phase52` 已覆盖本计划新增 contract，可作为后续 phase 52 收尾回归入口。
- 本次未更新 `.planning/STATE.md` / `.planning/ROADMAP.md`，以避免混入仓库中已有的未请求 planning 改动。

## Self-Check: PASSED

- Summary file exists.
- Task commits `e285ed5`, `b0c83fd`, `7c58d46`, `ca92b9b` exist in git history.
- Verified `pluginRegistration` live schema contains `uninstalledAt` and `uninstallRetentionMode`.

---
*Phase: 52-action-registry-plugin-lifecycle-governance*
*Completed: 2026-05-22*
