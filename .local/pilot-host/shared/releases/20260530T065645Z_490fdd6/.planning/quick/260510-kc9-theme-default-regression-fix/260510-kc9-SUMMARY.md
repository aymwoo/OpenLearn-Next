---
phase: quick
plan: 260510-kc9
status: complete
---

# Quick summary

已完成：修复主题插件改动后污染默认主题基线的问题，并把首页、设置、学生相关页面重新收口到共享宽度 contract。

- 新增 `getCurrentActorThemeRuntimeState()`，把 `activeThemeId -> DAL -> ThemeInjector -> shell` 这条 runtime 路径收口成单一 truth source。
- `ThemeInjector`、`TeacherSidebarShell`、`StudentLayout/StudentShell` 现在会明确区分 `default` 与 `active-theme`：默认主题不再强制进入 aurora / glass 外舞台，激活主题时仍沿用现有 layout runtime。
- `StageHero` 补上 `min-w-0 flex-1`，修复 header action 挤压时标题被压成竖排的问题。
- 新增 `surface-widths.ts`，统一首页、设置页、插件市场、学生管理、学生首页插件区的版心宽度，移除业务页面里回归的 `max-w-[1280px]` / `max-w-[1360px]`。
- 新增 `pnpm verify:theme-default-regression`，把默认主题 fallback、共享宽度 contract 和禁止回归的局部宽度写法收进单命令验证入口。

验证：

- `pnpm vitest run src/components/theme/theme-injector.test.tsx src/components/shell/teacher-sidebar-shell.test.tsx src/components/surfaces/settings-surface.test.tsx src/actions/theme-actions.test.ts src/lib/dal/themes.test.ts`
- `pnpm verify:theme-default-regression`
- `pnpm typecheck`
