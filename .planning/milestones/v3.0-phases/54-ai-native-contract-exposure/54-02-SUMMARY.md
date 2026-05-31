---
phase: 54-ai-native-contract-exposure
plan: "02"
subsystem: api
tags: [ai-native, discovery, registry, read-model, zod]
requires:
  - phase: 54-ai-native-contract-exposure
    provides: shared ai-native descriptor shell and outward dto export
provides:
  - server-side command/action/capability descriptor registry projection
  - unified listPlatformCommands/listPlatformActions/listPlatformCapabilities read-model APIs
  - focused tests that lock discovery truth to existing command/action/capability contracts
affects: [phase-54-plan-03, phase-54-plan-04, ai-discovery, operator-surface]
tech-stack:
  added: []
  patterns: [code-owned descriptor projection, server-only ai discovery read model, truth-source-first registry assembly]
key-files:
  created:
    - src/features/platform-core/ai-contracts/registry.ts
    - src/features/platform-core/ai-contracts/read-model.ts
    - src/features/platform-core/ai-contracts/registry.test.ts
    - src/features/platform-core/ai-contracts/read-model.test.ts
  modified: []
key-decisions:
  - "Command descriptors project from PlatformPluginGovernanceCommandTypes instead of importing executable registry handlers, so discovery stays attached to code-owned contract truth."
  - "Plan 02 exposes server-only listPlatformCommands/listPlatformActions/listPlatformCapabilities APIs so downstream UI or operator surfaces consume DTO/read-model seams instead of registry internals."
patterns-established:
  - "Descriptor projection pattern: assemble command, action, and capability discovery rows from existing authoritative enums/catalogs, then validate them through AI contract schemas."
  - "Server-only discovery seam: read-model functions return typed descriptor lists without exposing command bus or action registry execution internals."
requirements-completed: [AINT-01, AINT-02, AINT-05]
duration: 8 min
completed: 2026-05-22
---

# Phase 54 Plan 02: AI-native contract exposure summary

**Server-side command/action/capability discovery registry projected from existing platform contracts with unified list APIs for future AI and operator consumers.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-22T14:20:05Z
- **Completed:** 2026-05-22T14:28:05Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments

- 新增 `ai-contracts/registry.ts`，把 command/action/capability descriptors 投影到统一 machine-readable registry。
- 新增 `ai-contracts/read-model.ts`，提供 `listPlatformCommands()`、`listPlatformActions()`、`listPlatformCapabilities()` 与总 catalog API。
- 新增 focused tests，锁定 command truth、action truth 与 capability truth 都来自现有 repo-owned contracts，而不是愿景列表或执行层 internals。

## Task Commits

Each task was committed atomically:

1. **Task 1: Project real command/action/capability descriptors** - `6a28de6` (feat)

**Plan metadata:** documented in the final docs commit for this plan.

## Files Created/Modified

- `src/features/platform-core/ai-contracts/registry.ts` - 从现有 command/action/capability truth source 组装 AI discovery descriptors。
- `src/features/platform-core/ai-contracts/read-model.ts` - 暴露 server-only list/read-model API。
- `src/features/platform-core/ai-contracts/registry.test.ts` - 验证三类 descriptor 都来自真实 authoritative source。
- `src/features/platform-core/ai-contracts/read-model.test.ts` - 验证 read model 返回统一 machine-readable catalog。

## Decisions Made

- command descriptor truth 直接复用 `PlatformPluginGovernanceCommandTypes`，避免为了 discoverability 导入 `platformCommandRegistry` 及其执行依赖。
- action descriptor 继续复用 `listStaticActionCatalog()`，capability descriptor 继续复用 `RuntimeCapabilityValues`，保证 discovery surface 不引入第二真相源。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched command truth projection from executable registry to contract enum**
- **Found during:** Task 1 (registry/read-model implementation)
- **Issue:** 初版实现若直接依赖 `platformCommandRegistry`，会把 handler/DAL/runtime import 链带进 discovery tests，偏离“只投影 code-owned source truth”的计划目标并阻塞测试。
- **Fix:** 改为从 `PlatformPluginGovernanceCommandTypes` 投影 command descriptors，只保留 contract-owned truth。
- **Files modified:** `src/features/platform-core/ai-contracts/registry.ts`, `src/features/platform-core/ai-contracts/registry.test.ts`
- **Verification:** `node ./node_modules/vitest/vitest.mjs run src/features/platform-core/ai-contracts/registry.test.ts src/features/platform-core/ai-contracts/read-model.test.ts`
- **Committed in:** `6a28de6`

**2. [Rule 3 - Blocking] Accepted local Vitest runner as the reliable verification path in this environment**
- **Found during:** Task 1 acceptance verification
- **Issue:** 计划要求的 `pnpm vitest run ...` 在当前环境会触发 `pnpm install`，随后因 `sharp` postinstall 缺少 `node-gyp` 失败，和本任务代码无关。
- **Fix:** 先用本地已安装的 `node ./node_modules/vitest/vitest.mjs run ...` 完成代码验证；同时保留对 `pnpm vitest run ...` 的失败记录，供后续环境修复参考。
- **Files modified:** None
- **Verification:** 本地 Vitest runner 通过；`pnpm vitest run ...` 仍失败于 `sharp` install，而非测试断言。
- **Committed in:** `6a28de6`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** 两处偏差都用于收紧 truth source 或绕开环境级验证阻塞，没有扩大功能范围。

## Issues Encountered

- `gsd-sdk query state.record-metric` 与 `state.add-decision` 在当前 CLI 形态下仍要求不同参数格式，本次已手工同步 `STATE.md` 里的 metrics 与 decisions。
- `pnpm vitest run ...` 在当前 Node 24.1.0 / pnpm 11.1.2 环境下会触发 `sharp` build 失败；代码层 targeted Vitest suite 本身通过。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 可以在当前 command/action/capability discovery seams 上补 delegated actor 与 approval metadata，而不需要再碰 discoverability truth source。
- Plan 04 可以直接消费 `readPlatformAiDescriptorCatalog()` 或三个 list API，构建最小 operator/developer discoverability surface。

## Self-Check: PASSED

- FOUND: `.planning/phases/54-ai-native-contract-exposure/54-02-SUMMARY.md`
- FOUND: `src/features/platform-core/ai-contracts/registry.ts`
- FOUND: `src/features/platform-core/ai-contracts/read-model.ts`
- FOUND: `src/features/platform-core/ai-contracts/registry.test.ts`
- FOUND: `src/features/platform-core/ai-contracts/read-model.test.ts`
- FOUND commit: `6a28de6`

---
*Phase: 54-ai-native-contract-exposure*
*Completed: 2026-05-22*
