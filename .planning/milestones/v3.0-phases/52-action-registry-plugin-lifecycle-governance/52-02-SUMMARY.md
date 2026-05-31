---
phase: 52-action-registry-plugin-lifecycle-governance
plan: "02"
subsystem: plugin-lifecycle
tags: [plugin-lifecycle, governance-projection, dependency-graph, uninstall, vitest]
requires:
  - phase: 52-01
    provides: typed action descriptor contract and split executable-vs-diagnostic posture
  - phase: 48-lifecycle-and-uninstall-semantics
    provides: uninstall preflight and retain-vs-cleanup baseline
provides:
  - external five-state lifecycle contract
  - dependency ordering and cycle diagnostics
  - executable gating and failure attribution projection
  - retain-vs-cleanup uninstall governance projection
affects: [phase-52-plan-03, plugin-host, operator-governance-surface, action-catalog-gating]
tech-stack:
  added: []
  patterns: [external lifecycle projection, explicit recovery action contract, dependency-chain-only blocking, uninstall governance snapshot]
key-files:
  created:
    - src/features/platform-core/plugins/lifecycle-contracts.ts
    - src/features/platform-core/plugins/dependency-graph.ts
    - src/features/platform-core/plugins/governance-projection.ts
    - src/features/platform-core/plugins/governance-projection.test.ts
  modified:
    - src/features/runtime-platform/contracts/permissions.ts
    - src/features/runtime-platform/contracts/descriptors.ts
    - src/features/runtime-platform/contracts/contracts.test.ts
    - src/lib/dal/plugins.ts
    - src/lib/dal/plugins.test.ts
key-decisions:
  - "External lifecycle contract fixes the public vocabulary at installed, enabled, active, suspended, and uninstalled; mounted/ready/failed remain diagnostic-only internals."
  - "Dependency failure handling blocks only the affected plugin chain and recommends explicit reconcile or retry actions instead of any implicit recovery."
  - "Uninstall governance defaults to retain posture; cleanup stays blocked until preflight counts exist and an explicit confirmation token is supplied."
patterns-established:
  - "Lifecycle projection pattern: map durable DAL lifecycle truth into a stable external governance state plus internalSubstate, reasonCode, and recommendedRecoveryAction."
  - "Dependency governance pattern: derive ordering and cycle diagnostics from manifest-declared dependencies without introducing a new runtime truth source."
requirements-completed: [ACTN-03, LIFE-01, LIFE-02, LIFE-03, LIFE-04, LIFE-05, LIFE-06]
duration: 15 min
completed: 2026-05-21
---

# Phase 52 Plan 02: Plugin lifecycle governance projection summary

**固定 external five-state lifecycle vocabulary，并交付 dependency ordering、failure attribution 与 retain/cleanup uninstall governance projection。**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-21T14:40:10Z
- **Completed:** 2026-05-21T14:55:12Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- 新增 `lifecycle-contracts.ts`，冻结 external lifecycle、stable reason code 与 explicit recovery action contract。
- 新增 dependency graph 与 governance projection，把依赖顺序、循环依赖、激活失败和链路级阻断统一投影为 machine-readable diagnostics。
- 扩展 runtime governance snapshot 与 plugin manifest governance schema，让后续 host/server/operator surface 可以直接消费统一治理 truth。
- 为 DAL 补齐 governance snapshot read helper，统一输出 dependency、activation、uninstall preflight 输入，不引入新的 durable truth 源。

## Task Commits

Each task was committed atomically:

1. **Task 1: 定义 external lifecycle、reason code 与 recovery action contract** - `03350ba` (test), `344ecde` (feat)
2. **Task 2: 实现 dependency ordering、failure attribution 与 uninstall governance projection** - `4cfe076` (test), `7d8a778` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/features/platform-core/plugins/lifecycle-contracts.ts` - 定义 external lifecycle、reason code 与 recovery action contract。
- `src/features/platform-core/plugins/dependency-graph.ts` - 提供 dependency ordering 与 cycle detection helper。
- `src/features/platform-core/plugins/governance-projection.ts` - 生成 executable gating、failure attribution 与 uninstall posture projection。
- `src/features/platform-core/plugins/governance-projection.test.ts` - 覆盖 lifecycle contract、dependency graph、projection 和 uninstall semantics。
- `src/features/runtime-platform/contracts/permissions.ts` - 扩展 governance snapshot 为 external lifecycle + diagnostics 字段。
- `src/features/runtime-platform/contracts/descriptors.ts` - 为 governance manifest 增加 dependency declaration。
- `src/features/runtime-platform/contracts/contracts.test.ts` - 更新 runtime governance contract 回归测试。
- `src/lib/dal/plugins.ts` - 新增 governance snapshot read helper，复用现有 preflight truth。
- `src/lib/dal/plugins.test.ts` - 覆盖 DAL governance snapshot 读面。

## Decisions Made

- 对外 contract 不再把 `mounted`、`ready`、`failed` 暴露成长期 lifecycle vocabulary，而是通过 `internalSubstate` 和 `reasonCode` 暴露内部诊断信息。
- dependency 失败与 activation 失败统一产出推荐恢复动作，但恢复仍然必须回到显式 `enable`、`retry`、`resume`、`reconcile` 命令面执行。
- cleanup uninstall 只有在调用方显式请求且带确认 token 时才可继续，默认 posture 保持 retain。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 去重同一循环依赖的多起点重复报告**
- **Found during:** Task 2（实现 dependency ordering、failure attribution 与 uninstall governance projection）
- **Issue:** 初版 cycle detection 会因为不同起点重复返回同一条 dependency cycle，导致 operator diagnostics 重复。
- **Fix:** 为 cycle path 增加 canonical rotation normalization，只保留稳定指纹后的唯一 cycle。
- **Files modified:** `src/features/platform-core/plugins/dependency-graph.ts`
- **Verification:** `pnpm exec vitest run src/features/platform-core/plugins/governance-projection.test.ts`
- **Committed in:** `7d8a778` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** 修复属于计划内 dependency diagnostics 正确性加固，无额外 scope creep。

## Issues Encountered

None.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 可以直接把 governance projection 接入 host/server/UI surfaces，而不需要再次解释 lifecycle 语义。
- executable action catalog 与 operator diagnostics 已具备统一 projection 输入，后续只需完成接线与 `verify:phase52` close gate。

## Self-Check: PASSED

- Found file: `src/features/platform-core/plugins/lifecycle-contracts.ts`
- Found file: `src/features/platform-core/plugins/dependency-graph.ts`
- Found file: `src/features/platform-core/plugins/governance-projection.ts`
- Found file: `src/features/platform-core/plugins/governance-projection.test.ts`
- Found commit: `03350ba`
- Found commit: `344ecde`
- Found commit: `4cfe076`
- Found commit: `7d8a778`

---
*Phase: 52-action-registry-plugin-lifecycle-governance*
*Completed: 2026-05-21*
