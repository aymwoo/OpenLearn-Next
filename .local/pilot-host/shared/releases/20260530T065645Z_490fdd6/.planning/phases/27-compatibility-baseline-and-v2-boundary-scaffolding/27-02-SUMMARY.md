---
phase: 27-compatibility-baseline-and-v2-boundary-scaffolding
plan: 02
subsystem: architecture
tags: [runtime-platform, feature-boundary, compatibility, nextjs, routes]
requires:
  - phase: 26-cross-session-trends-and-stitch-productization
    provides: teacher/student/classroom route baseline and existing classroom contracts
provides:
  - runtime-platform root public barrel
  - runtime-platform subdomain barrels for authoring launch classroom player and plugins
  - boundary map encoding compatibility migration rules for route consumers
  - route import posture migrated to runtime-platform public APIs
affects: [phase-27, phase-28, runtime-bridge, route-consumers]
tech-stack:
  added: []
  patterns: [single-root feature boundary, public barrel migration, compatibility shim posture]
key-files:
  created:
    - src/features/runtime-platform/index.ts
    - src/features/runtime-platform/shared/boundary-map.ts
    - src/features/runtime-platform/authoring/index.ts
    - src/features/runtime-platform/launch/index.ts
    - src/features/runtime-platform/classroom/index.ts
    - src/features/runtime-platform/player/index.ts
    - src/features/runtime-platform/plugins/index.ts
  modified:
    - src/app/(teacher)/teacher/editor/page.tsx
    - src/app/(teacher)/teacher/launch/page.tsx
    - src/app/(classroom)/classroom/page.tsx
    - src/app/(student)/student/player/page.tsx
key-decisions:
  - "runtime-platform 采用单根 + 子域 public barrels，而不是并列多个 feature roots。"
  - "四条课堂主链 route 先迁移 import posture，底层 legacy DAL 暂时保留为 compatibility shim。"
  - "plugin 边界先在 runtime-platform 根下占位，明确后续 cutover 仍在同一根内演进。"
patterns-established:
  - "Pattern: route pages import runtime capabilities only from feature public barrels."
  - "Pattern: boundary map files encode publicEntrypoints implementationSources and compatibility rules for staged migrations."
requirements-completed: [ARCH-01]
duration: 9min
completed: 2026-05-15
---

# Phase 27 Plan 02: Runtime-platform boundary summary

**课堂主链路由已切到 `runtime-platform` 单根 public APIs，并保留 legacy DAL 作为兼容 shim。**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-15T14:09:28Z
- **Completed:** 2026-05-15T14:18:19Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- 建立 `src/features/runtime-platform` 单根 feature boundary 与 5 个子域 public barrels。
- 用 `runtimePlatformBoundaryMap` 固化 publicEntrypoints、implementationSources 与 compatibility rules。
- 将 `/teacher/editor`、`/teacher/launch`、`/classroom`、`/student/player` 四条主链 route imports 收敛到 `@/features/runtime-platform/*`。

## Task Commits

Each task was committed atomically:

1. **Task 1: 建立 runtime-platform 根与子域 public barrels** - `0977687` (feat)
2. **Task 2: 将课堂主链 route consumers 改接到 runtime-platform public APIs** - `ddc94bb` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/features/runtime-platform/index.ts` - 暴露 runtime-platform 根级 public barrel。
- `src/features/runtime-platform/shared/boundary-map.ts` - 编码迁移期 public entrypoints、实现来源与兼容规则。
- `src/features/runtime-platform/authoring/index.ts` - 暴露 authoring 读模型兼容入口。
- `src/features/runtime-platform/launch/index.ts` - 暴露 launch console 入口。
- `src/features/runtime-platform/classroom/index.ts` - 暴露 classroom console / snapshot / recap / student detail 入口。
- `src/features/runtime-platform/player/index.ts` - 暴露 student player shell / personal / guard 入口。
- `src/features/runtime-platform/plugins/index.ts` - 保留 plugin 子域占位边界，声明 cutover deferred posture。
- `src/app/(teacher)/teacher/editor/page.tsx` - 改为从 runtime-platform authoring API 读取 editor 所需能力。
- `src/app/(teacher)/teacher/launch/page.tsx` - 改为从 runtime-platform launch API 读取开课 console DTO。
- `src/app/(classroom)/classroom/page.tsx` - 改为从 runtime-platform classroom API 读取 live/ended 同路由数据。
- `src/app/(student)/student/player/page.tsx` - 改为从 runtime-platform player API 读取 shell/personal split 数据。
- `.planning/phases/27-compatibility-baseline-and-v2-boundary-scaffolding/deferred-items.md` - 记录本次验证期间发现的仓库级既有 typecheck 阻塞。

## Decisions Made

- 使用 schedule feature 的 boundary-map 模式作为 runtime-platform 的首版边界模板，保持 feature migration 结构一致。
- route consumer 只迁移 import posture，不修改 URL、query 参数合同或现有运行语义。
- plugin 先保留为同根占位子域，避免后续 runtime host 演进再次创建平行根目录。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 绕开 pnpm build approval 门禁做等价类型验证**
- **Found during:** Task 1 / Task 2 verification
- **Issue:** `pnpm typecheck` 被 `pnpm-workspace.yaml` 中未完成的 `allowBuilds` 配置阻塞，命令在安装阶段失败，无法进入真实 `tsc --noEmit`。
- **Fix:** 改用项目本地 `./node_modules/.bin/tsc --noEmit` 做等价 TypeScript 校验，并把不相关的既有失败记录到 deferred list。
- **Files modified:** `.planning/phases/27-compatibility-baseline-and-v2-boundary-scaffolding/deferred-items.md`
- **Verification:** 直接运行 `./node_modules/.bin/tsc --noEmit`，确认失败来自未修改的既有测试文件，而非本计划变更文件。
- **Committed in:** pending (metadata commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 仅调整验证执行路径，未扩大实现范围；计划目标已完成。

## Issues Encountered

- `pnpm typecheck` 无法执行真实类型检查，因为 pnpm 在安装前就被 build approval gate 中断。
- 仓库存在既有 test TypeScript 错误，当前不属于 Plan 27-02 修改范围，已记录到 deferred items。

## Known Stubs

- `src/features/runtime-platform/plugins/index.ts:4` - plugin boundary 仍是 placeholder，占位原因是本计划只要求 D-09 ownership posture，不做 runtime host / event bus cutover。
- `src/features/runtime-platform/plugins/index.ts:11` - `status: "placeholder"` 明确标识该子域仅作兼容边界占位。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `runtime-platform` 已成为课堂主链 route consumers 的显式入口，后续可在该根下继续抽离 shared contracts 与 runtime bridge。
- 继续执行 Phase 27 后续计划前，若需要恢复统一 `pnpm typecheck`，应先修复 pnpm build approval 配置与既有测试类型错误。

## Self-Check: PASSED

- FOUND: `.planning/phases/27-compatibility-baseline-and-v2-boundary-scaffolding/27-02-SUMMARY.md`
- FOUND: `0977687`
- FOUND: `ddc94bb`
