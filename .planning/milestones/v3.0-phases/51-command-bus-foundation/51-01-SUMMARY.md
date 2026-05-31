---
phase: 51-command-bus-foundation
plan: "01"
subsystem: platform-core
tags: [command-bus, drizzle, sqlite, zod, platform-core, plugin-governance]
requires:
  - phase: 50-boundary-freeze-and-platform-vocabulary
    provides: frozen platform vocabulary, authoritative ownership map, adapter-only legacy seam posture
provides:
  - explicit PlatformCommand envelope and plugin governance command family contracts
  - durable SQLite command ledger with stable command rows plus append-only attempt rows
  - validate-authorize-execute-record pipeline shell with dedupe intent and normalized result summaries
affects: [Phase 51, Phase 52, plugin-actions, plugin-host, async producers, platform-core]
tech-stack:
  added: []
  patterns: [dual command ledger, command-boundary dedupe, cache-invalidation intent return, typed command registry]
key-files:
  created:
    - drizzle/0013_phase51_command_bus_foundation.sql
    - drizzle/meta/0013_snapshot.json
    - scripts/prepare-dev-db.test.ts
    - src/features/platform-core/commands/contracts.ts
    - src/features/platform-core/commands/registry.ts
    - src/features/platform-core/commands/bus.ts
    - src/features/platform-core/commands/bus.test.ts
  modified:
    - src/db/schema.ts
    - scripts/prepare-dev-db.ts
    - src/features/platform-core/index.ts
key-decisions:
  - "Keep command-row summary status minimal (pending/running/succeeded/failed) and push execution history into attempt rows."
  - "Deduplicate side-effect-sensitive commands at the command row via dedupeKey, not at attempt or queue level."
  - "Return invalidation intent from the bus and keep next/cache APIs out of platform-core."
patterns-established:
  - "Platform command contract pattern: explicit discriminated union per governance command instead of generic transition bags."
  - "Retry/dedupe pattern: one stable business command identity with incrementing attemptNumber history."
requirements-completed: [CMD-01, CMD-02, CMD-04, CMD-05]
duration: 21 min
completed: 2026-05-21
---

# Phase 51 Plan 01: Command Bus Foundation Summary

**显式插件治理命令合同、SQLite 双层 command ledger、以及 validate→authorize→execute→record 的 Command Bus shell 已落地。**

## Performance

- **Duration:** 21 min
- **Started:** 2026-05-21T06:23:00Z
- **Completed:** 2026-05-21T06:44:25Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- 在 `src/db/schema.ts` 与 Phase 51 migration 中建立 `platformCommands` / `platformCommandAttempts` durable ledger，并把 `commandId` 归因链路接到现有 plugin/governance audits。
- 在 `src/features/platform-core/commands/*` 下新增显式 plugin governance command union、registry metadata 与 pipeline shell。
- 用 focused bus tests 证明 validation 前置、dedupe 复用稳定 command row、以及 attempt/result summary 记录行为。

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Phase 51 command ledger schema and migration bridge** - `7e05891` (test)
2. **Task 1: Add Phase 51 command ledger schema and migration bridge** - `e8ed241` (feat)
3. **Task 2: Build explicit command contracts, registry, and pipeline shell** - `4aaf2e0` (test)
4. **Task 2: Build explicit command contracts, registry, and pipeline shell** - `ee78bd9` (feat)

**Plan metadata:** To be recorded in the concluding `docs(51-01)` commit.

## Files Created/Modified
- `src/db/schema.ts` - 新增 command/attempt ledger 表与 plugin/governance audit `commandId` 外键。
- `drizzle/0013_phase51_command_bus_foundation.sql` - Phase 51 SQLite migration。
- `drizzle/meta/0013_snapshot.json` - Drizzle schema snapshot for Phase 51.
- `scripts/prepare-dev-db.ts` - 开发库 bridge 识别 Phase 51 schema tag。
- `scripts/prepare-dev-db.test.ts` - Task 1 focused RED/GREEN checks。
- `src/features/platform-core/commands/contracts.ts` - 显式 `PlatformCommand` discriminated union 与 payload schemas。
- `src/features/platform-core/commands/registry.ts` - registry metadata 与 dedupe posture。
- `src/features/platform-core/commands/bus.ts` - validate/authorize/execute/record pipeline shell。
- `src/features/platform-core/commands/bus.test.ts` - bus-focused behavior tests。
- `src/features/platform-core/index.ts` - 暴露新的 commands module surface。

## Decisions Made
- 保持 command summary status 极简，避免 future producers 直接依赖 attempt 内部细粒度状态词汇。
- 对 `plugin.uninstall.preflight` 使用 optional dedupe，其余 D-07 敏感命令统一 required dedupe。
- 用 in-memory injectable store 接口驱动 bus tests，先验证 contract/pipeline 行为，不提前绑定真实 handler/DAL 实现。

## Deviations from Plan

### Auto-fixed / Execution Adjustments

**1. [Rule 3 - Blocking] Switched Task 2 verification to focused Vitest execution**
- **Found during:** Task 2 verification
- **Issue:** Plan-specified `pnpm test -- --run src/features/platform-core/commands/bus.test.ts` still triggered an unrelated pre-existing failure in `src/lib/dal/plugin-data.test.ts`, so the package script was not a reliable task-local gate in this repo state.
- **Fix:** Used equivalent focused command `pnpm exec vitest run src/features/platform-core/commands/bus.test.ts` to verify the new bus contract in isolation, while preserving the plan's intended behavior coverage.
- **Files modified:** `.planning/phases/51-command-bus-foundation/deferred-items.md`
- **Verification:** Focused Vitest run passed; unrelated failure was documented as deferred/out-of-scope.
- **Committed in:** Included in final docs commit

---

**Total deviations:** 1 execution adjustment (blocking verification environment)
**Impact on plan:** No scope creep. The adjustment only isolated the intended verification target from an unrelated existing test failure.

## Issues Encountered
- GitNexus CLI was available for impact analysis, but its `impact` command could not precisely disambiguate some schema const exports like `platformCommands` by uid; edits were therefore kept tightly scoped to plan-owned files and symbols.
- Context7 MCP key was unavailable in this executor runtime, so Drizzle lookup used the documented `ctx7` CLI fallback instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 51-02 can now bind real plugin governance handlers and tx-aware DAL helpers onto the explicit command types without redesigning ledger semantics.
- Existing producer seams can start migrating onto a single bus contract while preserving entrypoint-owned cache invalidation.
- `commandId` attribution is now available for plugin/governance audit correlation in downstream plans.

## Self-Check: PASSED

- FOUND: `.planning/phases/51-command-bus-foundation/51-01-SUMMARY.md`
- FOUND: `src/features/platform-core/commands/bus.ts`
- FOUND: `drizzle/0013_phase51_command_bus_foundation.sql`
- FOUND commits: `7e05891`, `e8ed241`, `4aaf2e0`, `ee78bd9`

---
*Phase: 51-command-bus-foundation*
*Completed: 2026-05-21*
