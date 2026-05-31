---
phase: 58-operator-recovery-and-production-surfaces
plan: "06"
subsystem: ui
tags: [operator-honesty, runtime-inspector, async-operator, plugin-governance, vitest]

# Dependency graph
requires:
  - phase: 58-02
    provides: classroom shell honesty wording baseline and fixed three-part degraded posture
provides:
  - shared operator honesty DTO contract
  - runtime inspector honesty rendering aligned to the shared three-part template
  - async operator honesty rendering aligned to the shared three-part template
  - plugin governance honesty rendering aligned to the shared three-part template
affects: [operator-recovery, runtime-inspector, async-operator, plugin-governance]

# Tech tracking
tech-stack:
  added: []
  patterns: ["degraded operator surfaces render a shared honesty card contract instead of ad-hoc copy", "operator honesty labels live in a shared DTO helper while each surface keeps its own fact source"]

key-files:
  created:
    - src/lib/dto/operator-honesty.ts
  modified:
    - src/lib/dto/runtime-inspector.ts
    - src/lib/dto/async-task-operator.ts
    - src/components/surfaces/runtime-inspector-surface.tsx
    - src/components/surfaces/async-task-operator-surface.tsx
    - src/components/surfaces/plugin-lifecycle-operator-surface.tsx
    - src/components/surfaces/runtime-inspector-surface.test.tsx
    - src/components/surfaces/async-task-operator-surface.test.tsx
    - src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx

key-decisions:
  - "固定三段 honesty 标签收口到 shared DTO helper，surface 只负责渲染各自 truth source。"
  - "plugin governance 保留 reason-gated recovery copy，同时补一层 shared honesty card，不把原有恢复动作信息抹掉。"

patterns-established:
  - "Shared honesty contract: 所有 degraded operator surface 统一输出 trustBoundary -> impactScope -> nextStep 三段。"
  - "Surface-specific truths: runtime/async/plugin 继续保留各自事实来源，只通过 DTO 层归一表达。"

requirements-completed: [OPS-02, PLUG-03]

# Metrics
duration: 8 min
completed: 2026-05-26
---

# Phase 58 Plan 06: degraded honesty alignment Summary

**runtime inspector、async operator 与 plugin governance 现已共享同一固定三段 degraded honesty 模板，并与 58-02 classroom shell 口径对齐。**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-26T04:06:58Z
- **Completed:** 2026-05-26T04:15:13Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- 新增 `operator-honesty` shared DTO contract，把 trust boundary / impact scope / next step 固化为统一三段模板。
- runtime inspector 与 async operator 不再各自手写 degraded 文案，而是通过 shared helper 渲染固定 honesty card。
- plugin governance 在保留 reason-gated recovery 与高风险确认流的前提下，也补上与 classroom shell 一致的 honesty card。

## Task Commits

Each task was committed atomically:

1. **Task 1: 固化 shared honesty contract 并先写跨 surface 回归** - `0900d4a` (feat)
2. **Task 2: 改造 runtime / async / plugin surfaces 使其共享固定三段模板** - `c35d490` (feat)

## Files Created/Modified
- `src/lib/dto/operator-honesty.ts` - shared honesty card contract 与 plugin governance 映射 helper。
- `src/lib/dto/runtime-inspector.ts` - runtime degraded posture → shared honesty card 映射。
- `src/lib/dto/async-task-operator.ts` - async backlog posture → shared honesty card 映射。
- `src/components/surfaces/runtime-inspector-surface.tsx` - 通过 shared honesty helper 渲染 runtime honesty card。
- `src/components/surfaces/async-task-operator-surface.tsx` - 通过 shared honesty helper 渲染 async degraded card。
- `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` - 为 plugin governance diagnostics 增加 shared honesty card，同时保留 reason-gated recovery UI。
- `src/components/surfaces/runtime-inspector-surface.test.tsx` - 锁定 runtime helper 接入与固定三段顺序。
- `src/components/surfaces/async-task-operator-surface.test.tsx` - 锁定 async helper 接入与固定三段顺序。
- `src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` - 锁定 plugin helper 接入与 shared honesty contract。

## Decisions Made
- shared honesty 的固定标签只维护在 DTO helper 中，避免三个 surface 再次各自漂移。
- plugin governance 仍保留 `reason code + recovery action` 行，因为它承载 reason-gated 恢复语义；shared honesty card 负责补 trust-boundary 与 impact scope，不替代治理细节。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Task 2 的首轮静态断言把“surface 接入 shared helper”误写成“surface 源码必须直接包含中文标签字面量”；修正为检查 helper 接入与 section 渲染后通过。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 58 的跨 surface degraded honesty 已真正落到实现，可继续供 verifier 与后续 operator surface 复用。
- 当前无 blocker。

## Self-Check: PASSED

- Found created files: `src/lib/dto/operator-honesty.ts`
- Found modified files: `src/components/surfaces/runtime-inspector-surface.tsx`, `src/components/surfaces/async-task-operator-surface.tsx`, `src/components/surfaces/plugin-lifecycle-operator-surface.tsx`
- Found commits: `0900d4a`, `c35d490`
- Verification passed: `pnpm exec vitest --run src/components/surfaces/runtime-inspector-surface.test.tsx src/components/surfaces/async-task-operator-surface.test.tsx src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx`
- Static check passed: shared helper contains all fixed honesty labels and all three target surfaces explicitly consume their helper entrypoints
