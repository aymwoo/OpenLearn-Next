---
phase: quick
plan: 260510-oml
status: complete
---

# Quick summary

已完成：修复 `/teacher/editor` 因教师端主题 cookie 读取落在 Suspense fallback 内导致的 Blocking Route。

- 在 `teacher-sidebar-shell.tsx` 中抽出同步 `TeacherSidebarShellFrame`，让默认壳层直接基于 `DEFAULT_THEME_LAYOUT_RUNTIME` 渲染，不再读取 `cookies()`。
- `TeacherSidebarShell` 继续保留异步主题运行时路径，仍通过 `getCurrentActorThemeRuntimeState()` 决定 `themeSource`、shell mode 和 route surface。
- `TeacherLayout` 的 `TeacherShellFallback` 已改为使用静态 `TeacherSidebarShellFrame`，避免 fallback 本身变成 request-time data 读取点。
- 扩展 `teacher-sidebar-shell.test.tsx`，锁定 fallback-safe frame 与 theme-aware async shell 的分层关系，防止后续回归。

验证：

- `pnpm test --run "src/components/shell/teacher-sidebar-shell.test.tsx"`
- `pnpm typecheck`
