---
phase: 27-compatibility-baseline-and-v2-boundary-scaffolding
plan: 03
subsystem: architecture
tags: [runtime-platform, contracts, zod, bridge, permissions, descriptors]
requires:
  - phase: 27-compatibility-baseline-and-v2-boundary-scaffolding
    provides: runtime-platform single-root boundary and route consumer migration posture
provides:
  - versioned runtime contracts root for bridge events permissions and descriptors
  - pure in-repo contract boundary equivalent to future packages/contracts
  - focused purity and export coverage for runtime contracts
affects: [phase-27, phase-28, runtime-bridge, plugin-lifecycle, host-boundaries]
tech-stack:
  added: []
  patterns: [single contracts root, zod schema plus inferred type, purity guard tests]
key-files:
  created:
    - src/features/runtime-platform/contracts/version.ts
    - src/features/runtime-platform/contracts/bridge.ts
    - src/features/runtime-platform/contracts/events.ts
    - src/features/runtime-platform/contracts/permissions.ts
    - src/features/runtime-platform/contracts/descriptors.ts
    - src/features/runtime-platform/contracts/index.ts
    - src/features/runtime-platform/contracts/contracts.test.ts
  modified:
    - .planning/phases/27-compatibility-baseline-and-v2-boundary-scaffolding/deferred-items.md
key-decisions:
  - "contracts root 保持在 runtime-platform 单根内部，先提供 packages/contracts 的等价边界，而不提前切正式 monorepo。"
  - "bridge events permissions descriptors 全部采用 Zod schema + inferred type 双导出，保持与现有 DTO 风格一致。"
  - "contracts 纯度通过 focused test 直接读取源码守卫，而不是只依赖人工约定。"
patterns-established:
  - "Pattern: runtime contracts modules export both Schema and inferred type from the same file."
  - "Pattern: pure contract roots use static token guards to block DB cache or server-action leakage."
requirements-completed: [ARCH-02]
duration: 10min
completed: 2026-05-15
---

# Phase 27 Plan 03: Runtime contracts root summary

**已在 `runtime-platform` 单根内建立 versioned bridge、events、permissions、descriptors contracts root，并用 focused tests 锁定纯度与导出面。**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-15T14:18:30Z
- **Completed:** 2026-05-15T14:28:22Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 建立 `src/features/runtime-platform/contracts/*` 纯 contracts 子域，覆盖 bridge、events、permissions、descriptors 与 version。
- 用根 barrel 同时暴露 contract-level public exports 和子模块命名空间，满足 host-side 直接消费姿态。
- 新增 focused test，对最小合法样例 parse、exports 完整性与 purity guard 做自动化保护。

## Task Commits

Each task was committed atomically:

1. **Task 1: 建立 versioned bridge、event、permission、descriptor contracts** - `80c9547` (feat)
2. **Task 2: 用 focused tests 锁定 contracts root 的纯度与导出面** - `258c287` (test)

**Plan metadata:** pending

## Files Created/Modified

- `src/features/runtime-platform/contracts/version.ts` - 定义统一 `RUNTIME_CONTRACT_VERSION` 与版本 schema。
- `src/features/runtime-platform/contracts/bridge.ts` - 定义 TeachingBridge message/request/result envelopes 与 capability context contract。
- `src/features/runtime-platform/contracts/events.ts` - 定义 canonical runtime event envelope、actor 与 delivery metadata contract。
- `src/features/runtime-platform/contracts/permissions.ts` - 定义 runtime capability、host action permission 与 school-scoped actor constraints。
- `src/features/runtime-platform/contracts/descriptors.ts` - 定义 runtime descriptor、manifest v2 placeholder 与 plugin lifecycle ownership contract。
- `src/features/runtime-platform/contracts/index.ts` - 暴露统一 contracts root barrel 与子模块命名空间。
- `src/features/runtime-platform/contracts/contracts.test.ts` - 用 focused regression coverage 守住 exports 完整性、最小 parse 样例与 purity guards。
- `.planning/phases/27-compatibility-baseline-and-v2-boundary-scaffolding/deferred-items.md` - 记录本计划验证期间遇到的仓库级 typecheck 阻塞。

## Decisions Made

- contracts root 物理路径落在 `src/features/runtime-platform/contracts`，保持与 `runtime-platform` 单根边界一致。
- bridge、events、permissions、descriptors 先只承载 schema、type、常量和版本化 public API，不引入 DAL、Server Actions 或 adapter implementation。
- focused test 直接以源码 token guard 守住 `db.`、`updateTag(`、`"use server"`、`server-only`，确保后续 phase 改动会立即 fail loudly。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 使用等价验证路径绕开 `pnpm typecheck` 门禁**
- **Found during:** Task 1 verification
- **Issue:** `pnpm typecheck` 在执行前被仓库当前 `pnpm approve-builds` gate 中断，无法进入真实 `tsc --noEmit`。
- **Fix:** 先用 focused acceptance checks 和 `vitest` 验证本计划变更，再运行本地 `./node_modules/.bin/tsc --noEmit` 确认剩余错误来自未修改的既有测试文件，并把阻塞记录到 deferred items。
- **Files modified:** `.planning/phases/27-compatibility-baseline-and-v2-boundary-scaffolding/deferred-items.md`
- **Verification:** `./node_modules/.bin/vitest run src/features/runtime-platform/contracts/contracts.test.ts` 通过；`./node_modules/.bin/tsc --noEmit` 的失败仅落在未修改的既有测试文件。
- **Committed in:** pending (metadata commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 只调整了验证执行路径，没有扩大 contracts 实现范围；计划目标已完成。

## Issues Encountered

- `pnpm typecheck` 仍被仓库级 build approval gate 阻塞，无法直接作为本计划验证入口。
- 全仓 `tsc --noEmit` 仍有与本计划无关的既有测试类型错误，已按 phase deferred list 记录。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- runtime bridge、runtime session persistence、capability enforcement 与 plugin lifecycle 后续可以直接复用这套 contracts root，不必再从 `src/lib/dto/classroom.ts` 临时挖协议。
- 若后续计划要求统一 repo 级 `pnpm typecheck` 通过，需要先处理当前 `pnpm approve-builds` 门禁和 deferred items 中的既有测试类型错误。

## Self-Check: PASSED

- FOUND: `.planning/phases/27-compatibility-baseline-and-v2-boundary-scaffolding/27-03-SUMMARY.md`
- FOUND: `80c9547`
- FOUND: `258c287`
