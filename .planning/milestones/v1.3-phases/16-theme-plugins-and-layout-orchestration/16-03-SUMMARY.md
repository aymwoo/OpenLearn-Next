---
phase: 16-theme-plugins-and-layout-orchestration
plan: 03
subsystem: ui
tags: [themes, shell, teacher, settings, resources, navigation]

# Dependency graph
requires:
  - phase: 16-theme-plugins-and-layout-orchestration
    provides: compiled theme runtime path and allowlisted route surface registry
provides:
  - theme-aware teacher shell with three shell modes
  - shared shell path for /teacher, /settings, and /resources
  - runtime-driven primary-nav, secondary-nav, page-header, and main-content regions
affects: [phase-16-plan-04, teacher-layout, settings-layout, resources-layout]

# Tech tracking
tech-stack:
  added: []
  patterns: [runtime-driven teacher shell, shared teacher-facing shell path, fixed region rendering contract]

key-files:
  created: []
  modified:
    - src/components/shell/sidebar.tsx
    - src/components/shell/glass-nav.tsx
    - src/components/shell/teacher-sidebar-shell.tsx
    - src/components/shell/teacher-sidebar-shell.test.tsx
    - src/app/(teacher)/teacher/layout.tsx
    - src/app/settings/layout.tsx
    - src/app/(library)/resources/layout.tsx

key-decisions:
  - "Teacher shell 只渲染三种 allowlisted shell mode，不接受任意 region slot 注入。"
  - "`/teacher`、`/settings`、`/resources` 统一走 `TeacherSidebarShell`，不再各自冻结左侧栏布局。"
  - "page-header 与 main-content 继续保持稳定主结构，theme 只改变导航位置和 allowlisted 辅助区域显隐。"

patterns-established:
  - "Pattern 1: route layout 先解析 route surface key，再由 `TeacherSidebarShell` 读取 active theme runtime。"
  - "Pattern 2: `Sidebar` 和 `GlassNav` 作为 primary-nav renderer，被同一个 shell mode contract 调度。"

requirements-completed: [PLUGIN-05, PLUGIN-06]

# Metrics
duration: "not tracked"
completed: 2026-05-09
---

# Phase 16 Plan 03: Theme-aware shell rollout summary

**教师端壳层现在已经能在 `left-nav`、`top-nav` 和 `top-nav-secondary-rail` 三种模式之间切换，且 `/teacher`、`/settings`、`/resources` 走的是同一条 runtime-driven shell path。**

## Performance

- **Duration:** not tracked
- **Completed:** 2026-05-09
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `TeacherSidebarShell` 扩展为 async theme-aware shell，根据 active theme runtime 解析 route surface、shell mode、secondary-nav/context-panel/page-footer 显隐，并保持 `page-header` 与 `main-content` 稳定存在。
- `Sidebar` 和 `GlassNav` 被统一纳入 allowlisted 壳层 contract，分别承担 `left-nav` 与 `top-nav` 的 primary navigation 渲染职责。
- `src/app/(teacher)/teacher/layout.tsx`、`src/app/settings/layout.tsx`、`src/app/(library)/resources/layout.tsx` 都改为通过 `TeacherSidebarShell` 走统一 theme path。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `src/components/shell/sidebar.tsx` - 增加 `region`、`className` 与 compact secondary-nav 变体。
- `src/components/shell/glass-nav.tsx` - 支持 brand、items、activePath 注入，作为 top-nav primary-nav renderer。
- `src/components/shell/teacher-sidebar-shell.tsx` - 实现 runtime-driven shell mode 选择与 region 渲染。
- `src/components/shell/teacher-sidebar-shell.test.tsx` - 覆盖 shell mode 字符串、fallback 变量和 default runtime。
- `src/app/(teacher)/teacher/layout.tsx` - 通过 request headers 解析当前 route surface，并把 teacher layout 接到 theme-aware shell。
- `src/app/settings/layout.tsx` - 通过 `TeacherSidebarShell` 渲染 `/settings`。
- `src/app/(library)/resources/layout.tsx` - 通过 `TeacherSidebarShell` 渲染 `/resources`。

## Decisions Made

- `/teacher` layout 通过 `resolveTeacherThemeRouteSurface()` 将请求路径映射到 allowlisted route key，而不是直接把原始 pathname 交给 theme manifest。
- `context-panel` 与 `page-footer` 继续由 shell 内部固定模板承载，不开放任意 React node 注入接口。
- 顶部导航模式仍复用现有 teacher nav 信息架构，只改变导航位置和壳层节奏。

## Deviations from Plan

- `TeacherSidebarShell` 自身承担了 active theme runtime 解析，而不是让上层 layout 单独传入 runtime props，这样能让 `/settings` 与 `/resources` 继续复用同一个入口组件。

## Issues Encountered

- 无阻塞问题。`/teacher` layout 需要通过 headers 取当前路径，以便在 App Router layout 里解析 route surface key。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04 可以直接从 `layoutSummary` 输出中文 `结构摘要`，不再依赖主题名 heuristics。
- teacher-facing routes 已经统一走 theme-aware shell，后续回归验证可以集中到同一 runtime path。

## Self-Check: PASSED

- Found `left-nav`, `top-nav`, and `top-nav-secondary-rail` in `src/components/shell/teacher-sidebar-shell.tsx`
- Found `TeacherSidebarShell` in `src/app/settings/layout.tsx`
- Found `TeacherSidebarShell` in `src/app/(library)/resources/layout.tsx`
- Verified `pnpm test --run src/components/shell/teacher-sidebar-shell.test.tsx`

---
*Phase: 16-theme-plugins-and-layout-orchestration*
*Completed: 2026-05-09*
