---
phase: 16-theme-plugins-and-layout-orchestration
plan: 01
subsystem: themes
tags: [themes, plugins, layout, schema, runtime, vitest]

# Dependency graph
requires:
  - phase: 16-theme-plugins-and-layout-orchestration
    provides: planning context, UI spec, teacher-facing layout decisions
provides:
  - typed region-based theme layout contract
  - allowlisted teacher route surface registry
  - theme layout runtime compiler with region-level fallback
affects: [phase-16-plan-02, phase-16-plan-03, phase-16-plan-04, settings-theme-runtime]

# Tech tracking
tech-stack:
  added: []
  patterns: [typed theme manifest contract, allowlisted route surface registry, region-level fallback compiler]

key-files:
  created:
    - src/lib/theme-layout/route-surface-registry.ts
  modified:
    - src/lib/dto/resource-ai.ts
    - src/server/themes/tokens.ts
    - src/server/themes/tokens.test.ts

key-decisions:
  - "`manifest.theme.layout` 不再接受自由 record，改为显式 shell/pages/tokens contract。"
  - "教师端可覆写页面范围被锁定在 allowlisted route surface registry，而不是原始 pathname 匹配。"
  - "非法 region/module/split 只触发 region 级 fallback，不放弃整个页面运行时。"

patterns-established:
  - "Pattern 1: theme layout 通过 `ThemeShellModeSchema`、`ThemePageSurfaceOverrideSchema` 和 `ThemeLayoutContractSchema` 锁定输入边界。"
  - "Pattern 2: `compileThemeLayoutRuntime()` 统一生成 default surface、page runtime 和结构摘要。"

requirements-completed: [PLUGIN-05, PLUGIN-06]

# Metrics
duration: "not tracked"
completed: 2026-05-09
---

# Phase 16 Plan 01: Theme layout contract and compiler boundary summary

**主题插件的 `manifest.theme` 现在已经从宽松 token record 升级为 typed、allowlisted 的 region-based contract，并由统一 compiler 生成默认壳层、按页覆写和结构摘要运行时。**

## Performance

- **Duration:** not tracked
- **Completed:** 2026-05-09
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- 在 `src/lib/dto/resource-ai.ts` 中新增 `ThemeShellModeSchema`、`ThemeLayoutRegionSchema`、`ThemeLayoutSplitSchema`、`ThemePageSurfaceOverrideSchema`、`ThemeLayoutRuntimeSchema` 等完整 contract，并移除旧的 `layout: z.record(z.string(), z.string())`。
- 新建 `src/lib/theme-layout/route-surface-registry.ts`，把 `/teacher`、`/settings`、`/resources` 等 teacher-facing routes 固定到同一 allowlisted registry，并限制各页面可用模块与默认 split。
- 在 `src/server/themes/tokens.ts` 中实现 `compileThemeLayoutRuntime()`、required region 守卫、module allowlist 校验和 region 级 fallback；`src/server/themes/tokens.test.ts` 同步覆盖 shell mode、非法 split 和 fallback 行为。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `src/lib/dto/resource-ai.ts` - 定义 theme layout schema、runtime DTO 和 summary DTO。
- `src/lib/theme-layout/route-surface-registry.ts` - 新增教师端 route surface registry、region/module key allowlist 和 route resolver。
- `src/server/themes/tokens.ts` - 扩展 theme validator/compiler，加入 `compileThemeLayoutRuntime()` 和默认 runtime。
- `src/server/themes/tokens.test.ts` - 覆盖 shell mode、required region、invalid split 和 region-level fallback。

## Decisions Made

- richer theme 继续保持 JSON-only contract，不引入 `className`、`script`、原始 `style` 映射或任意 HTML 注入能力。
- `primary-nav`、`page-header`、`main-content` 被提升为 required regions，任何隐藏尝试都只会回退到默认配置。
- 页面布局差异统一建模为 route surface，而不是让下游 UI 组件自行猜测 theme 行为。

## Deviations from Plan

- `layout` contract 兼容了 legacy layout token 形式，避免已存在的 `--layout-*` 变量链路在引入 richer contract 时被打断。

## Issues Encountered

- 无阻塞问题。原有 `--layout-*` token 编译链路需要与新 contract 并存，因此 compiler 做了 legacy token 与 richer contract 的双入口兼容。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 可以直接沿用 `compileThemeLayoutRuntime()` 把 layout runtime 注入 DAL 和 `ThemeInjector`。
- route surface、region key 和 summary DTO 已稳定，可供 shell 与 settings surface 直接消费。

## Self-Check: PASSED

- Found `src/lib/theme-layout/route-surface-registry.ts`
- Found `ThemeShellModeSchema` in `src/lib/dto/resource-ai.ts`
- Found `compileThemeLayoutRuntime` in `src/server/themes/tokens.ts`
- Verified `pnpm test --run src/server/themes/tokens.test.ts`

---
*Phase: 16-theme-plugins-and-layout-orchestration*
*Completed: 2026-05-09*
