---
phase: 16-theme-plugins-and-layout-orchestration
plan: 02
subsystem: themes
tags: [themes, dal, injector, runtime, settings, teacher-shell]

# Dependency graph
requires:
  - phase: 16-theme-plugins-and-layout-orchestration
    provides: typed layout contract, runtime compiler, route surface registry
provides:
  - actor-scoped active theme runtime DTO
  - theme CSS variables plus layout runtime on one resolved path
  - summary-ready runtime data for settings theme cards
affects: [phase-16-plan-03, phase-16-plan-04, theme-switching, settings-theme-cards]

# Tech tracking
tech-stack:
  added: []
  patterns: [single active-theme runtime path, actor-scoped theme runtime DTO, safe DOM metadata injection]

key-files:
  created: []
  modified:
    - src/lib/dal/themes.ts
    - src/lib/dal/themes.test.ts
    - src/components/theme/theme-injector.tsx
    - src/actions/theme-actions.test.ts

key-decisions:
  - "继续复用既有 `activeThemeId` cookie，不新增第二条主题选择状态链路。"
  - "主题运行时由 DAL 返回 `theme + cssVariables + layoutRuntime + layoutSummary`，避免 settings 和 shell 自己重复编译。"
  - "`ThemeInjector` 通过固定 `meta#theme-layout-runtime` 输出结构化运行时，不注入任意 layout HTML。"

patterns-established:
  - "Pattern 1: `getActiveThemeRuntimeForCurrentActor()` 负责 actor/school scope 校验和默认 runtime 回退。"
  - "Pattern 2: DOM 只接收 sanitizer 处理后的 CSS variables 与固定形状的 `data-theme-layout-runtime`。"

requirements-completed: [PLUGIN-06]

# Metrics
duration: "not tracked"
completed: 2026-05-09
---

# Phase 16 Plan 02: Active theme runtime wiring summary

**主题切换链路现在会在现有 `activeThemeId -> DAL -> ThemeInjector` 路径上同时产出 CSS variables 与 layout runtime，不再需要主题名猜测或平行运行时。**

## Performance

- **Duration:** not tracked
- **Completed:** 2026-05-09
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `src/lib/dal/themes.ts` 现在会在 `ThemeRegistryDTO` 上返回 `layoutRuntime` 与 `layoutSummary`，并新增 `getActiveThemeRuntimeForCurrentActor()` 作为 actor-scoped runtime 入口。
- `ThemeInjector` 改为读取 compiled runtime，并通过 `meta#theme-layout-runtime` 同时暴露 `data-theme-layout-runtime` 与 `data-theme-layout-source`。
- `src/actions/theme-actions.test.ts` 和 `src/lib/dal/themes.test.ts` 补充了 single-runtime-path 与 default fallback 的断言，确保 theme action 仍沿用原 cookie 与 layout revalidation contract。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `src/lib/dal/themes.ts` - 增加 runtime 编译、layout summary 暴露和 actor-scoped runtime resolver。
- `src/lib/dal/themes.test.ts` - 验证 school scope、valid theme guard 和 compiled runtime fallback。
- `src/components/theme/theme-injector.tsx` - 注入 `theme-layout-runtime` metadata 和安全 CSS variables。
- `src/actions/theme-actions.test.ts` - 确认 action 继续沿用 `activeThemeId` 与 `revalidatePath("/", "layout")`。

## Decisions Made

- `src/actions/theme-actions.ts` 无需改动，现有 action 边界已经满足 single runtime path 要求。
- theme runtime 缺失时统一回落到 `DEFAULT_THEME_LAYOUT_RUNTIME`，避免 teacher shell 因 theme 配置缺失而失效。
- settings card 所需的 summary 信息在 DAL 预编译完成，减少下游 surface 的命名猜测与重复拼装。

## Deviations from Plan

- `src/server/themes/registry.ts` 不需要额外修改；当前 registry 持久化逻辑可直接复用 compiler 与 DAL runtime 解析。

## Issues Encountered

- 无阻塞问题。主要工作是把已有 theme DTO 扩成 runtime DTO，同时不破坏既有 CSS variable 注入链路。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 可以直接从 `ThemeInjector` 与 `TeacherSidebarShell` 消费统一 layout runtime。
- settings page 已具备读取真实 theme runtime summary 的数据来源。

## Self-Check: PASSED

- Found `getActiveThemeRuntimeForCurrentActor` in `src/lib/dal/themes.ts`
- Found `theme-layout-runtime` in `src/components/theme/theme-injector.tsx`
- Verified `src/actions/theme-actions.test.ts`
- Verified `src/lib/dal/themes.test.ts`

---
*Phase: 16-theme-plugins-and-layout-orchestration*
*Completed: 2026-05-09*
