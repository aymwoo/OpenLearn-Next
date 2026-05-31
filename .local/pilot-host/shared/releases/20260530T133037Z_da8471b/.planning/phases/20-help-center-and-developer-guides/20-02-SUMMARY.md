---
phase: 20-help-center-and-developer-guides
plan: 02
subsystem: help-center-developer-guides
tags: [help-center, plugin-guide, theme-guide, developer-docs, tests]
requires:
  - phase: 20-help-center-and-developer-guides
    provides: shared help detail template and centralized help content map
provides:
  - codebase-accurate plugin development guide
  - codebase-accurate theme development guide
  - detail surface regression tests for developer help pages
affects: [help-center, plugins, themes]
tech-stack:
  added: []
  patterns: [content-map-driven help guides, repository-grounded developer docs, semantic surface tests]
key-files:
  created:
    - .planning/phases/20-help-center-and-developer-guides/20-02-SUMMARY.md
    - src/components/surfaces/help-guide-detail-surface.test.tsx
  modified:
    - src/lib/help/help-center-content.ts
key-decisions:
  - "插件页明确区分 manifest contract、school-scoped activation path、使用边界和后续扩展，不把 schedule.assistant 写成任意开放入口。"
  - "主题页固定围绕 manifest.theme -> action -> DAL/runtime -> ThemeInjector/TeacherSidebarShell 这条单一路径编写，不引入 docs-only 或 alternate runtime 叙事。"
  - "开发者详细页回归保护使用语义测试，校验状态标签、返回入口、coverage aside 和代码示例渲染。"
patterns-established:
  - "Pattern 6: 帮助中心开发者文案必须直接锚定 schema、DAL、Server Actions 和 runtime 名称，避免理想化接口说明。"
requirements-completed: [Extension phase — product help center and developer-facing implementation guidance.]
duration: unknown
completed: 2026-05-11
---

# Phase 20 Plan 02: Plugin and theme guide summary

**`/help/plugins` 与 `/help/themes` 已补成基于当前代码事实的开发者指南，并为 detail template 增加了回归测试。**

## Performance

- **Duration:** unknown
- **Completed:** 2026-05-11
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- 扩写 `src/lib/help/help-center-content.ts` 中的插件指南，补齐「这页适合什么时候读」「当前可用」「school-scoped 启用与运行链路」「最小示例」「使用边界」「后续扩展」六段结构。
- 插件页正文现在明确引用当前真实 contract：`PluginManifestSchema`、`PLUGIN_ACTION_PERMISSION_REQUIREMENTS`、`registerPluginManifestAction()`、`setPluginEnabledAction()`、`runPluginHookAction()`、`runPluginHook()`，并说明 `schedule.assistant` 已进入 contract 但仍然保持受控分发边界。
- 扩写主题指南，补齐 token/layout contract、runtime chain、layout fallback 规则、最小主题片段与使用边界，明确 `registerThemeTokensAction()`、`setActiveThemeAction()`、`getCurrentActorThemeRuntimeState()`、`compileThemeLayoutRuntime()`、`ThemeInjector`、`TeacherSidebarShell` 的真实链路。
- 新增 `src/components/surfaces/help-guide-detail-surface.test.tsx`，对开发者 detail page 模板增加语义测试，覆盖状态标签、返回帮助中心入口、coverage aside、代码示例渲染，以及教师帮助文案不应泄漏到开发者模板范围内。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `src/lib/help/help-center-content.ts` - 补齐插件与主题指南正文、真实 contract 名称、边界说明和最小代码示例。
- `src/components/surfaces/help-guide-detail-surface.test.tsx` - detail page 模板回归测试。

## Decisions Made

- 插件指南把「当前可用」与「后续扩展」分开，避免把 future marketplace、plugin-to-plugin channel、arbitrary JS 写成现状。
- 主题指南把 layout contract 和 fallback 规则提升为独立章节，而不是只展示 token JSON。
- 测试继续沿用仓库现有的 text-driven / semantic 风格，不引入 snapshot-heavy 回归方式。

## Deviations from Plan

- 无功能性偏离；实现内容与计划要求一致，只是在插件和主题导语中补充了“何时阅读”段，帮助首页进入子页后更快对齐读者心智。

## Issues Encountered

- 新增测试最初使用了 `jest-dom` 风格断言，与当前 Vitest 配置不兼容；已改回仓库现有的原生断言方式并通过验证。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `20-03` 可以继续收口 `/help/actions-interfaces`，并为整个帮助中心补 phase-specific verify guardrails。
- 当前 detail template 已有测试保护，后续只需新增内容与 verify 脚本，无需再回头改模板基础能力。

## Self-Check: PASSED

- Verified `pnpm test --run src/components/surfaces/help-guide-detail-surface.test.tsx`
- Verified `pnpm typecheck`

---

*Phase: 20-help-center-and-developer-guides*
*Completed: 2026-05-11*
