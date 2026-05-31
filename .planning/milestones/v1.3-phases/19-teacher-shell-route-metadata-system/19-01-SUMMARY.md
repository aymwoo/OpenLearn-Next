---
phase: 19-teacher-shell-route-metadata-system
plan: 01
subsystem: shell-contracts
tags: [teacher-shell, route-metadata, resolver, runtime-contract]
requires:
  - phase: 19-teacher-shell-route-metadata-system
    provides: phase context and shell metadata decisions
provides:
  - typed route shell metadata contract
  - centralized shell surface resolver
  - runtime shell metadata compilation
affects: [teacher-shell, theme-runtime, route-registry]
tech-stack:
  added: []
  patterns: [registry-first shell metadata, compile-resolve-render layering]
key-files:
  created:
    - .planning/phases/19-teacher-shell-route-metadata-system/19-01-SUMMARY.md
    - docs/architecture/teacher-shell-route-metadata.md
    - src/lib/theme-layout/shell-surface-resolver.ts
  modified:
    - src/lib/dto/resource-ai.ts
    - src/lib/theme-layout/route-surface-registry.ts
    - src/server/themes/tokens.ts
    - src/server/themes/tokens.test.ts
key-decisions:
  - "所有 allowlisted teacher routes 都必须声明 shell.mode、shell.radius、shell.width、shell.chrome。"
  - "`/teacher` 的 square/full-width/immersive 行为现在是 route metadata，而不是 JSX 特判。"
  - "shell renderer 只能消费 shellVariant、shellConfig 和 surfaceMetadata。"
patterns-established:
  - "Pattern 1: route registry 提供 shell defaults，theme runtime 编译后保留 shellConfig。"
  - "Pattern 2: shell-surface-resolver 作为 render 前的唯一合并层。"
requirements-completed: [Extension phase — teacher shell architecture hardening and future layout-variant expansion.]
duration: unknown
completed: 2026-05-11
---

# Phase 19 Plan 01: Shell metadata foundation summary

**Phase 19 先把教师端壳层的结构知识从 JSX 中抽离出来，落成了 typed route metadata、runtime shell contract 和集中 resolver。**

## Performance

- **Duration:** unknown
- **Completed:** 2026-05-11
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- 扩展 `src/lib/theme-layout/route-surface-registry.ts`，让每个 allowlisted teacher route 都显式声明 `shell.mode`、`shell.radius`、`shell.width` 与 `shell.chrome`。
- 扩展 `src/lib/dto/resource-ai.ts`，新增 shell radius/width/chrome schema，以及 resolver 输出 DTO。
- 新建 `src/lib/theme-layout/shell-surface-resolver.ts`，集中输出 `shellVariant`、`shellConfig` 和 `surfaceMetadata`。
- 更新 `src/server/themes/tokens.ts`，让编译后的 page runtime 保留 `shellConfig`，而不是只保留 `shellMode`。
- 新增 `docs/architecture/teacher-shell-route-metadata.md`，记录 `route registry -> theme runtime -> shell resolver -> TeacherSidebarShell` 的架构图、schema 和扩展风险。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `docs/architecture/teacher-shell-route-metadata.md` - Phase 19 的壳层架构说明。
- `src/lib/theme-layout/shell-surface-resolver.ts` - 中央化 shell resolver。
- `src/lib/dto/resource-ai.ts` - 新增 shell metadata schema 与 resolver DTO。
- `src/lib/theme-layout/route-surface-registry.ts` - route shell defaults。
- `src/server/themes/tokens.ts` - 运行时编译保留 shellConfig。
- `src/server/themes/tokens.test.ts` - 运行时合同回归测试。

## Decisions Made

- `shellVariant` 继续等价于 `shell.mode`，不额外创造第二套 variant 枚举。
- route label 继续留在 registry，runtime summary 继续留在 compiled page surface，由 resolver 合并给 shell。
- future-safe chrome 枚举先进入类型系统和测试，不在本阶段引入新的可见 UI。

## Deviations from Plan

- 无实质偏离。Plan 01 要求的 route metadata、resolver、runtime 编译和架构文档均已完成。

## Issues Encountered

- runtime contract 从 `shellMode` 扩展为 `shellConfig` 后，需要同步修正现有测试 fixture，避免旧 schema 假设导致 typecheck 失败。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `19-02` 可以直接把 `TeacherSidebarShell` 改为只消费 resolver 输出。
- `19-03` 可以围绕 resolver 和 shell source 增加 targeted regression 与 verify 命令。

## Self-Check: PASSED

- Verified `pnpm typecheck`
- Verified `pnpm test --run src/server/themes/tokens.test.ts`

---

*Phase: 19-teacher-shell-route-metadata-system*
*Completed: 2026-05-11*
