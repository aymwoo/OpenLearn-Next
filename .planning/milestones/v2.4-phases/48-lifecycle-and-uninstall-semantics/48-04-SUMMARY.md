---
phase: 48-lifecycle-and-uninstall-semantics
plan: 04
subsystem: plugin-lifecycle
tags: [plugin, lifecycle, suspend, uninstall, verify, gap-closure]
requires:
  - phase: 48-03
    provides: behavior-first close gate verification
provides:
  - robust lifecycle recovery for suspended state
  - UI action distinction and routing updates
  - JSON-parsed package.json verification script
affects: [plugin-lifecycle, verify-script, settings-ui]
tech-stack:
  added: []
  patterns: [history-based recovery, JSON-parsed validation]
key-files:
  created:
    - .planning/phases/48-lifecycle-and-uninstall-semantics/48-04-SUMMARY.md
  modified:
    - src/lib/dal/plugins.ts
    - src/components/surfaces/plugin-lifecycle-operator-surface.tsx
    - scripts/verify-phase48-lifecycle-and-uninstall.ts
    - src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx
key-decisions:
  - "关闭 kill switch 且插件处于 suspended 状态时，通过数据库中历史记录恢复原 runnable Posture 状态（mounted/ready/enabled），计算 enabled 时使用 isRunnablePluginState(targetState)。"
  - "挂起态卡片提供独立动作的『解除挂起』与『保持停用』按钮，避免由于 kill switch 重置误启用。"
  - "重构 verifyPackageScript 使用 JSON 语义解析 package.json，避免 exact string 匹配的脆性问题。"
requirements-completed: [LIFE-01, LIFE-02, LIFE-03, LIFE-04]
duration: 10 min
completed: 2026-05-21
---

# Phase 48 Plan 04: Lifecycle & Uninstall Semantics Summary (Gap-Closure)

**针对 Phase 48 关闭所有遗留验证缺口，实现了逻辑精准恢复、UI 语义分流与验证脚本健壮解析。**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-21T07:27:00Z
- **Completed:** 2026-05-21T07:30:00Z
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments

- **精确挂起恢复**：重构了 `setPluginKillSwitch()` 逻辑，在关闭 kill switch 且状态处于 `suspended` 时，从 `pluginLifecycleTransitions` 查询该插件最后一次 toState = 'suspended' 的记录，以精准恢复其挂起前的 runnable posture（如 `mounted` 或 `ready` 或 `enabled`），并通过 `isRunnablePluginState` 决定 `enabled` 状态。
- **UI 区分与界面同步**：在 `plugin-lifecycle-operator-surface.tsx` 中把挂起状态的单一动作拆解为独立的 “解除挂起” 和 “保持停用” 两个符合安全语义的动作；并且在 lifecycle / uninstall 操作成功后加入 `router.refresh()`，实时同步界面展示。
- **验证脚本语义化**：改写 `verify-phase48-lifecycle-and-uninstall.ts`，使用 `JSON.parse` 对 `package.json` 进行语义解析以检验 package 脚本，从而终结了原先对 `package.json` 文件全文字符串比对导致的脆弱硬失败。
- **自动化测试通过**：补全了 JSDOM 环境下 Next.js `next/navigation` `useRouter` 模拟，确保所有 Vitest 单元与集成测试顺利全绿通过。

## Task Commits

Each task was committed atomically:

1. **Task 1: 重构 setPluginKillSwitch 恢复逻辑和 transition 矩阵** - `3dfa2be` (fix)
2. **Task 2: 在 UI 区分恢复与停用，并增加 router.refresh() 界面同步** - `7a2df2c` (fix)
3. **Task 3: 优化 verify:phase48 脚本以健壮地解析 package.json** - `e5d2bc1` (fix)

## Files Created/Modified

- `src/lib/dal/plugins.ts` - 增加 `desc` 引入，更新 `suspended` 转换矩阵，持久化挂起前 runnable posture。
- `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` - 语义动作分流为“解除挂起”与“保持停用”，新增 `router.refresh()` 路由同步。
- `src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` - 增加 `next/navigation` Mock。
- `scripts/verify-phase48-lifecycle-and-uninstall.ts` - 重构 `verifyPackageScript`，使用 `JSON.parse` 进行 JSON 级别语义匹配。
- `.planning/phases/48-lifecycle-and-uninstall-semantics/48-04-SUMMARY.md` - 记录缺口关闭的计划执行汇总。

## Decisions Made

- 使用 `pluginLifecycleTransitions` 数据表关联历史，通过降序排列，取最后一次 toState='suspended' 的转换记录作为其被挂起前的 runnable 状态，完美且持久地恢复状态机。
- 对 React 19 App Router 视图同步采用官方推荐的 `router.refresh()` 原理。

## Deviations from Plan

None.

## Issues Encountered

None.

## Known Stubs

None.

## User Setup Required

None.
