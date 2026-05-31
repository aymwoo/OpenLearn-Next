---
phase: 19-teacher-shell-route-metadata-system
plan: 02
subsystem: shell-renderer
tags: [teacher-shell, resolver, layouts, shared-shell-path]
requires:
  - phase: 19-teacher-shell-route-metadata-system
    provides: shell metadata contract and resolver output
provides:
  - resolver-driven teacher shell renderer
  - shared shell fallback path wired through resolver
affects: [teacher-layout, settings-layout, resources-layout]
tech-stack:
  added: []
  patterns: [resolver-driven shell rendering, shared shell entry path]
key-files:
  created:
    - .planning/phases/19-teacher-shell-route-metadata-system/19-02-SUMMARY.md
  modified:
    - src/components/shell/teacher-sidebar-shell.tsx
    - src/app/(teacher)/teacher/layout.tsx
key-decisions:
  - "`TeacherSidebarShellFrame` 只接受 shellVariant、shellConfig、surfaceMetadata，不再自己解析 route 规则。"
  - "teacher fallback path 也通过 resolver 获取默认合同，避免 fallback 与真实路径漂移。"
  - "`/settings` 和 `/resources` 继续走原有共享 `TeacherSidebarShell` 路径。"
patterns-established:
  - "Pattern 3: async shell wrapper 读取 theme runtime，然后立刻解析为 resolver DTO 再传给 frame。"
requirements-completed: [Extension phase — teacher shell architecture hardening and future layout-variant expansion.]
duration: unknown
completed: 2026-05-11
---

# Phase 19 Plan 02: Shell render migration summary

**教师端壳层的 render path 已经改成 resolver 驱动，`TeacherSidebarShell` 不再依赖 `routeKey === "/teacher"` 之类的业务分支。**

## Performance

- **Duration:** unknown
- **Completed:** 2026-05-11
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- 重构 `src/components/shell/teacher-sidebar-shell.tsx`，让 square shell、full-width main-content 和 immersive chrome 都从 `shellConfig` 派生，而不是从 route 字符串派生。
- 删除本地 `resolveSurfaceLabel()` 路由文案 switch，改由 `surfaceMetadata.label` 和 `surfaceMetadata.summary` 驱动 header、footer、context-panel 文案。
- 保持 `/teacher` 现有 square/full-width 行为不变，同时让 `/settings`、`/resources` 继续共享原来的 shell entry path。
- 更新 `src/app/(teacher)/teacher/layout.tsx` fallback，让加载态也通过 resolver 使用同一套默认 shell 合同。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `src/components/shell/teacher-sidebar-shell.tsx` - 改为 resolver-only shell frame。
- `src/app/(teacher)/teacher/layout.tsx` - fallback 也改用 resolver 输出。

## Decisions Made

- region visibility 不再从 runtime page surface 二次读取，而是并入 `surfaceMetadata.regions`，确保 frame 只消费 resolver DTO。
- `shellConfig.chrome` 先作为 semantic signal 进入 DOM data 属性和逻辑分支，不在本阶段引入新的 presentation/focus/fullscreen UI。

## Deviations from Plan

- `src/app/settings/layout.tsx` 与 `src/app/(library)/resources/layout.tsx` 不需要额外修改；它们已经通过 `TeacherSidebarShell` 走共享路径，且新合同对它们保持兼容。

## Issues Encountered

- 无功能阻塞；主要是确保 fallback path 与主路径在新合同下保持一致，避免测试只覆盖主路径。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `19-03` 可以直接锁定 resolver contract、shell source guard 和 verify 命令。

## Self-Check: PASSED

- Verified `pnpm typecheck`
- Verified `pnpm test --run src/components/shell/teacher-sidebar-shell.test.tsx`

---

*Phase: 19-teacher-shell-route-metadata-system*
*Completed: 2026-05-11*
