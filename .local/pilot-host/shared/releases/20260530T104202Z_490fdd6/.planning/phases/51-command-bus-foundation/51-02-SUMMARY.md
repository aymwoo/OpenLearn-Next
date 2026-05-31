---
phase: 51-command-bus-foundation
plan: "02"
subsystem: platform-core
tags: [command-bus, plugins, drizzle, vitest, governance]
requires:
  - phase: 51-command-bus-foundation
    provides: command contracts, dual-ledger bus shell, and platform command registry scaffold
provides:
  - tx-aware plugin DAL helpers with command-linked audits
  - explicit plugin governance handlers for all Phase 51 command keys
  - registry wiring and retry regression coverage for same-command append-attempt semantics
affects: [runtime-platform, plugin-actions, bootstrap-dev-db, phase-51-03]
tech-stack:
  added: []
  patterns: [tx-aware DAL helper seam, explicit command handler family, same-command retry append-attempt]
key-files:
  created: [src/features/platform-core/commands/handlers/plugins.ts, src/features/platform-core/commands/handlers/plugins.test.ts, .planning/phases/51-command-bus-foundation/51-02-SUMMARY.md]
  modified: [src/lib/dal/plugins.ts, src/lib/dal/plugins.test.ts, src/features/platform-core/commands/registry.ts]
key-decisions:
  - "保留 legacy plugin DAL wrapper，只新增 *WithTx helper，避免在 Phase 51-02 打破现有 producer seam。"
  - "plugin.retry 复用既有 failed command row，并在同一 commandId 下追加新 attempt，而不是生成新业务命令。"
  - "handler 只返回 invalidation intent tags，不在 platform-core 内直接调用缓存 API。"
patterns-established:
  - "Pattern 1: command handler 负责 orchestration 与 normalized summary，DAL 继续独占 plugin persistence 与审计事务。"
  - "Pattern 2: 显式 plugin command family 替代 generic transition surface，保留 enable/disable/suspend/resume 业务意图。"
requirements-completed: [CMD-02, CMD-03, CMD-04, CMD-05]
duration: 27min
completed: 2026-05-21
---

# Phase 51 Plan 02: Plugin Governance Command Wiring Summary

**Plugin governance 通过显式 command handler family 接入 dual-ledger bus，并把 retry 固化为同一 commandId 的新 attempt。**

## Performance

- **Duration:** 27 min
- **Started:** 2026-05-21T14:43:00Z
- **Completed:** 2026-05-21T15:10:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- 为 plugin DAL 增加了 tx-aware helper seam，并把 `commandId` / `correlationId` 写入治理审计链路。
- 新增显式 plugin governance handlers，覆盖 `plugin.install` 到 `plugin.kill_switch.set` 全部九个命令。
- 通过 handler-level 测试锁定 `plugin.retry` 的 same-command append-attempt 语义，以及 `plugin.uninstall.preflight` 的只读语义。

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tx-aware plugin DAL helpers that preserve current domain rules** - `31719f6` (test)
2. **Task 1: Add tx-aware plugin DAL helpers that preserve current domain rules** - `4bb04bf` (feat)
3. **Task 2: Implement explicit plugin governance handlers and register all Phase 51 commands** - `8cda4e5` (test)
4. **Task 2: Implement explicit plugin governance handlers and register all Phase 51 commands** - `6b47730` (feat)

**Plan metadata:** pending

## Files Created/Modified
- `src/lib/dal/plugins.ts` - 增加 `*WithTx` helper 家族与 command-aware 审计回链。
- `src/lib/dal/plugins.test.ts` - 覆盖 tx-aware helper seam、legacy wrapper delegation、audit linkage。
- `src/features/platform-core/commands/handlers/plugins.ts` - 显式 plugin governance command handlers 与 retry orchestration。
- `src/features/platform-core/commands/handlers/plugins.test.ts` - registry/handler 层回归测试。
- `src/features/platform-core/commands/registry.ts` - 将九个 plugin command key 接到真实 authorize/execute handler。

## Decisions Made
- 保持 `src/lib/dal/plugins.ts` 为唯一 plugin persistence authority，handler 不直接散落 Drizzle 写入。
- `plugin.enable` 在 handler 层返回 theme invalidation intent，仅在确实注册 theme 时附带 theme tags。
- 由于 GitNexus 对 `platformCommandRegistry` / helper symbol 解析有限，实际风险评估以 `plugins.ts` 的 high blast radius 检查和 staged detect-changes 为主。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 修复 handler 测试的 Next/Auth 模块链依赖问题**
- **Found during:** Task 2 (handler regression tests)
- **Issue:** 直接导入主题 DAL 时触发 `next-auth` → `next/server` 测试环境模块解析失败，导致测试套件无法启动。
- **Fix:** 在 `plugins.test.ts` 中 mock `@/lib/dal/themes`，把测试聚焦回 handler orchestration 本身。
- **Files modified:** `src/features/platform-core/commands/handlers/plugins.test.ts`
- **Verification:** `pnpm exec vitest run src/features/platform-core/commands/handlers/plugins.test.ts`
- **Committed in:** `8cda4e5`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 仅修复测试基础设施噪音，不改变业务范围；所有计划目标仍按原意完成。

## Issues Encountered
- `gsd-sdk query` 子命令在当前环境不可用，因此未使用其 state/init handler；本计划执行改为直接读取计划与代码上下文。
- GitNexus 对部分新 symbol 无法做精确 impact lookup，但 `plugins.ts` 的 high-risk detect-changes 已在修改前后执行并审视影响面。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 51-03 现在可以把 Server Actions / host producer seam 迁移到共享 command producer path。
- 当前 handlers 已输出 invalidation intent tags，后续 producer edge 只需消费这些 tags，不必回改 bus 内核。

## Self-Check: PASSED
- Found file: `.planning/phases/51-command-bus-foundation/51-02-SUMMARY.md`
- Found commits: `31719f6`, `4bb04bf`, `8cda4e5`, `6b47730`

---
*Phase: 51-command-bus-foundation*
*Completed: 2026-05-21*
