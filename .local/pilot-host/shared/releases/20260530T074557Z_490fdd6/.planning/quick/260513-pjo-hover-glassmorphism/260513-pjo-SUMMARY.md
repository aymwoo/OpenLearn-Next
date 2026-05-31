---
phase: quick
plan: 260513-pjo
status: complete
---

# Quick summary

已完成：将 `/teacher/schedule` 课程 hover / focus 明细浮层进一步收敛为更明显的 glassmorphism 风格，在现有冷色调基础上增强半透明、blur、高光与 ring，保持现代感并提升悬浮层的独立识别度。

## What changed

1. 将 `src/components/surfaces/teacher-schedule-week-grid.tsx` 中 tooltip 浮层底色改为更高透明度的玻璃渐变。
2. 增强了浮层的 `backdrop-blur`、阴影和轻量 `ring`，让其更像悬浮玻璃卡片。
3. 增加顶部高光和角落光斑，强化玻璃质感与空间层次。
4. 同步微调浮层内 action pills 的透明度与 ring，保持视觉统一和文字可读性。

## Verification

- `pnpm vitest run "src/components/surfaces/teacher-schedule-surface.test.tsx"`

## Key decisions

- 继续保持无实体边框，只用半透明材质、ring、阴影和 blur 表达层次。
- 不改交互逻辑、不改结构，只做样式层收敛，降低回归风险。
