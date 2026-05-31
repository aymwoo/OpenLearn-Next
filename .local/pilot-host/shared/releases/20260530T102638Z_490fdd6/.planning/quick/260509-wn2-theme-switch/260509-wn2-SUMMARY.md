---
phase: quick
plan: 260509-wn2
status: complete
---

# Quick summary

已完成：开发环境主题系统现在有默认主题之外的第二主题来源，设置页也能明确显示当前使用中的主题，并继续沿用 `activeThemeId` 与 `ThemeInjector` 的既有切换链路。

## What changed

1. `scripts/bootstrap-dev-db.ts` 引入 `DEV_THEME_PLUGIN_DEFINITIONS`，开发 bootstrap 会注册多套 `manifest.theme` 主题，并保持按学校和主题名幂等 upsert。
2. `src/components/surfaces/settings-surface.tsx` 接入 `getActiveThemeId()`，默认主题和有效主题都能显示 `当前使用中` 状态，并继续通过 `setActiveThemeAction` 提交。
3. 后续 theme work 在当前实现上继续扩展，但这个 quick 的“第二主题 + 设置页切换可见性”目标已经落地。

## Verification

- `./node_modules/.bin/vitest run scripts/bootstrap-dev-db.test.ts src/components/surfaces/settings-surface.test.tsx src/actions/theme-actions.test.ts`
