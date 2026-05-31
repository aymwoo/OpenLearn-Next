---
phase: quick
plan: 260510-pn1
status: complete
---

# Quick summary

已完成：修复 `RootLayout` 根 `<html>` 节点因浏览器扩展注入属性导致的 hydration mismatch 噪音。

- 在 `src/app/layout.tsx` 的根 `<html>` 上增加 `suppressHydrationWarning`，只忽略外部扩展注入属性造成的根节点差异。
- 保留原有 `lang="zh-CN"`、`Lexend` body class、`Suspense + ThemeInjector` 注入路径，不把 guard 扩散到 `body` 或业务节点。
- 新增 focused regression test，锁定根节点 hydration guard 与现有 layout contract。

验证：

- `pnpm vitest run src/app/layout.test.tsx`
- `pnpm typecheck`
