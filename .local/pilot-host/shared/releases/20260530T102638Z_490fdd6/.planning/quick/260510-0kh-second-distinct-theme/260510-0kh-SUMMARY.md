---
phase: quick
plan: 1
subsystem: "theme-layout"
tags:
  - "theme"
  - "layout"
  - "settings"
  - "teacher-shell"
dependencies:
  requires:
    - "existing manifest.theme registration flow"
    - "ThemeInjector CSS variable injection"
    - "teacher sidebar shell layout"
  provides:
    - "second school theme with layout differences"
    - "theme-driven teacher shell rhythm changes"
  affects:
    - "src/lib/dto/resource-ai.ts"
    - "src/server/themes/tokens.ts"
    - "src/components/shell/teacher-sidebar-shell.tsx"
    - "scripts/bootstrap-dev-db.ts"
    - "src/components/surfaces/settings-surface.tsx"
tech-stack:
  added: []
  patterns:
    - "allowlisted layout theme tokens compiled to root CSS variables"
    - "shell layout parameters with explicit fallback defaults"
    - "multi-theme dev bootstrap seeding"
key-files:
  created:
    - ".planning/quick/260510-0kh-second-distinct-theme/260510-0kh-PLAN.md"
    - ".planning/quick/260510-0kh-second-distinct-theme/260510-0kh-SUMMARY.md"
    - "src/components/shell/teacher-sidebar-shell.test.tsx"
  modified:
    - "src/lib/dto/resource-ai.ts"
    - "src/server/themes/tokens.ts"
    - "src/server/themes/tokens.test.ts"
    - "src/components/shell/teacher-sidebar-shell.tsx"
    - "scripts/bootstrap-dev-db.ts"
    - "scripts/bootstrap-dev-db.test.ts"
    - "src/components/surfaces/settings-surface.tsx"
    - "src/components/surfaces/settings-surface.test.tsx"
key-decisions:
  - "版式差异只开放少量白名单 layout token：shell-gap、shell-inset、content-radius、sidebar-width。"
  - "教师壳层通过 `var(--layout-*, fallback)` 消费主题变量，保证默认主题完全回退到现有布局。"
  - "第二个主题继续走 `manifest.theme -> registerThemeTokens -> ThemeInjector` 现有链路，不新增平行主题系统。"
metrics:
  tasks-completed: 3
  files-modified: 8
  date-completed: "2026-05-09"
status: complete
---

# Phase quick Plan 1: Second distinct theme Summary

新增了第二个明显不同于现有“星夜课堂主题”的学校主题，并让主题系统不再只是换色，而是可以通过受控 layout token 改变教师侧壳层的布局节奏。现在开发环境会同时提供“星夜课堂主题”和“晨光教务台主题”，其中后者会让侧栏更宽、壳层留白更大、主内容圆角更紧凑。

## Completed Tasks

1. **Task 1: 扩展主题合同以支持受控 layout token** (Commit: `d4fce9d`)
   - 为 `ThemeTokenRegistrySchema` 增加了可选 `layout` 字段。
   - 在 `src/server/themes/tokens.ts` 中加入 layout key 白名单和长度值校验。
   - 让编译器输出 `--layout-*` CSS variables，同时拒绝未知 key 和非法值。

2. **Task 2: 让教师侧壳层真实消费版式变量** (Commit: `d4fce9d`)
   - `TeacherSidebarShell` 现在会消费 `--layout-shell-gap`、`--layout-shell-inset`、`--layout-content-radius` 和 `--layout-sidebar-width`。
   - 所有变量都带当前布局 fallback，默认主题下版式保持不变。
   - 新增 `src/components/shell/teacher-sidebar-shell.test.tsx` 锁定这些消费点，避免后续退回成纯色彩主题。

3. **Task 3: 补种第二个开发主题并在设置页展示其专属说明** (Commit: `d4fce9d`)
   - `scripts/bootstrap-dev-db.ts` 现会种入两个 dev theme plugin：`星夜课堂主题` 和 `晨光教务台主题`。
   - `晨光教务台主题` 同时带有颜色与 layout token，形成更明亮、更偏运营台的壳层版式。
   - 设置页新增第二主题的专属说明文案，明确其“更宽侧栏 + 更松留白”的布局特征。

## Verification

1. `pnpm vitest run src/server/themes/tokens.test.ts src/components/shell/teacher-sidebar-shell.test.tsx scripts/bootstrap-dev-db.test.ts src/components/surfaces/settings-surface.test.tsx`
2. `pnpm vitest run scripts/bootstrap-dev-db.test.ts src/components/surfaces/settings-surface.test.tsx src/actions/theme-actions.test.ts src/lib/dal/themes.test.ts src/lib/dal/plugins.test.ts src/server/themes/tokens.test.ts src/components/shell/teacher-sidebar-shell.test.tsx`
3. `pnpm db:bootstrap:dev`
4. `sqlite3 local.db "select name, validationStatus from themeTokenRegistry order by name;"`

## Deviations from Plan

### Resolved during execution

**1. `scripts/bootstrap-dev-db.ts` 初次修改时只替换了一半主题常量结构**
- **Found during:** targeted Vitest run
- **Issue:** 文件底部已经开始按 `DEV_THEME_PLUGIN_DEFINITIONS` 循环注册，但顶部仍保留旧的 `DEV_THEME_PLUGIN_DEFINITION` 单主题定义，导致测试与实现不一致。
- **Fix:** 完整替换为多主题定义数组，并同步让 `upsertDevThemePlugin()` 接受 `definition` 参数。
- **Files modified:** `scripts/bootstrap-dev-db.ts`, `scripts/bootstrap-dev-db.test.ts`

## Known Stubs

None.

## Threat Flags

None.
