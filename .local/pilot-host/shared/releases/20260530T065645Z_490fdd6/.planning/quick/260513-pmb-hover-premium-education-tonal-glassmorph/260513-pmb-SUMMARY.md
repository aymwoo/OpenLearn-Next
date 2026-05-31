---
phase: quick
plan: 260513-pmb
status: complete
---

# Quick summary

已完成：将 `/teacher/schedule` 课程 hover / focus 明细浮层从偏 glassmorphism 的表现收回到更符合 `DESIGN.md` 的 premium education tonal 风格，弱化强透明与高光，回到更柔和、更有教育产品质感的 surface 层次。

## What changed

1. 调整 `src/components/surfaces/teacher-schedule-week-grid.tsx` 中 tooltip 浮层底色，改为更稳的 tonal 渐变 surface。
2. 去掉更明显的玻璃光斑和强 ring 表现，保留轻量的悬浮阴影和顶部 tonal 高光。
3. 将浮层内 action pills 回调到更贴近 `surface-container-lowest` 的按钮语言，减少过强的玻璃感。
4. 保持 hover / focus 交互逻辑、布局结构和测试语义不变。

## Verification

- `pnpm vitest run "src/components/surfaces/teacher-schedule-surface.test.tsx"`

## Key decisions

- 继续保留轻微浮层感，但不再强调强透明、强高光、强 blur。
- 优先遵循 `DESIGN.md` 中“surface hierarchy + tonal depth”的表达，而不是把 tooltip 做成科技感玻璃卡。
