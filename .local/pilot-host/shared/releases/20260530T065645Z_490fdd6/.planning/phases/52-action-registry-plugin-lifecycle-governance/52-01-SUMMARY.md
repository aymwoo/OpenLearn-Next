---
phase: 52-action-registry-plugin-lifecycle-governance
plan: "01"
subsystem: api
tags: [action-registry, zod, plugin-governance, vitest]
requires:
  - phase: 50-boundary-freeze-and-platform-vocabulary
    provides: frozen ownership map and static-registry guardrails
  - phase: 51-command-bus-foundation
    provides: plugin governance command boundary
provides:
  - typed action descriptor contract
  - executable action catalog DTO and blocked diagnostic DTO split
  - static implementation descriptor source with duplicate-key rejection
affects: [phase-52-plan-02, phase-52-plan-03, plugin-host, governance-diagnostics]
tech-stack:
  added: []
  patterns: [static descriptor projection, split executable-vs-diagnostic catalog contracts]
key-files:
  created:
    - src/features/platform-core/actions/contracts.ts
    - src/features/platform-core/actions/static-catalog.ts
  modified:
    - src/features/platform-core/actions/static-catalog.test.ts
    - src/lib/dto/resource-ai.ts
key-decisions:
  - "Action catalog keeps executable rows separate from blocked diagnostic rows so default consumers only see machine-readable runnable metadata."
  - "Static action descriptors are projected from code-owned registry inputs and reject duplicate action keys instead of silently overriding them."
patterns-established:
  - "Action descriptor pattern: define shared descriptor truth, then derive executable catalog and blocked diagnostic schemas from it."
  - "Static registry pattern: use main-repo allowlist and permission metadata as projection inputs, not as dynamic action authority."
requirements-completed: [ACTN-01, ACTN-02, ACTN-04, ACTN-05]
duration: 18 min
completed: 2026-05-21
---

# Phase 52 Plan 01: Action descriptor contracts and static catalog summary

**统一 action descriptor contract、可执行 catalog / blocked diagnostic DTO 分视图，以及基于主仓库静态实现输入的 descriptor source 与 duplicate-key 拒绝规则。**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-21T13:51:30Z
- **Completed:** 2026-05-21T14:09:37Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- 固定了 Phase 52 后续计划可复用的 typed action descriptor、executable catalog row、blocked diagnostic row 与稳定 reason-code enum。
- 在 `resource-ai` DTO 层补齐 machine-readable action catalog / diagnostic exports，避免后续 surface 暴露 `any`。
- 新增 static action catalog projection，把主仓库静态实现输入映射为 descriptor source，并用自动化测试锁定 duplicate key rejection 与 metadata continuity。

## Task Commits

Each task was committed atomically:

1. **Task 1: 定义 action descriptor contract 与双视图 DTO** - `a99106d` (test), `f50dc49` (feat)
2. **Task 2: 从 static implementation catalog 生成 descriptor source 并拒绝冲突** - `a96743b` (test), `309cb6f` (feat)

**Plan metadata:** pending

## Files created/modified

- `src/features/platform-core/actions/contracts.ts` - 定义 descriptor、executable catalog row、blocked diagnostic row 与 reason code schema。
- `src/lib/dto/resource-ai.ts` - 导出 action catalog / blocked diagnostic DTO schema。
- `src/features/platform-core/actions/static-catalog.ts` - 从静态 registry allowlist 与 permission metadata 投影 executable descriptor source，并拒绝 duplicate key。
- `src/features/platform-core/actions/static-catalog.test.ts` - 覆盖 contract split、DTO export、static metadata continuity 与 duplicate-key rejection。

## Decisions made

- 将 executable catalog 与 blocked diagnostic contract 明确拆分，满足 D-52-01 / D-52-02 / D-52-03 / D-52-04，避免把 blocked diagnostics 混入普通 action 列表。
- 将 `implementationSource` 固定为 `main-repo-static-implementation`，保持 `src/server/plugins/registry.ts` 仅作为 code-owned static implementation catalog。
- 用显式 descriptor projection 表达 built-in、default-plugin、external-plugin 三类 owner，而不是让调用方直接依赖 registry 内部常量形状。

## Deviations from plan

None - plan executed exactly as written.

## Issues encountered

None.

## User setup required

None - no external service configuration required.

## Next phase readiness

- Plan 02 可以直接复用 action descriptor contract 与 static catalog source，继续接 lifecycle governance projection。
- Plan 03 可以在不触碰动态 authority 的前提下，把 executable catalog 与 governance diagnostics 接入 host/server/UI surfaces。

## Self-Check: PASSED

- Found file: `src/features/platform-core/actions/contracts.ts`
- Found file: `src/features/platform-core/actions/static-catalog.ts`
- Found file: `src/features/platform-core/actions/static-catalog.test.ts`
- Found commit: `a99106d`
- Found commit: `f50dc49`
- Found commit: `a96743b`
- Found commit: `309cb6f`

---
*Phase: 52-action-registry-plugin-lifecycle-governance*
*Completed: 2026-05-21*
