---
phase: quick
plan: 260513-pd8
status: complete
---

# Quick summary

已完成：为 `/teacher/schedule` 课程卡的 hover / focus 明细浮层更换配色，让它与默认课程卡、选中快捷操作面板形成更明确的层次区分，同时保持现代、轻盈的无边框视觉风格。

## What changed

1. 调整 `src/components/surfaces/teacher-schedule-week-grid.tsx` 中 tooltip 浮层的底色，从普通 surface tonal 面改为冷色渐变面。
2. 在浮层顶部增加轻微的渐变高光层，提升现代感和识别度。
3. 同步调整浮层内文案、图标和 action pills 的颜色，保证浅色/深色下都具备足够可读性。
4. 保持现有交互、结构、测试语义不变，只做视觉样式收敛。

## Verification

- `pnpm vitest run "src/components/surfaces/teacher-schedule-surface.test.tsx"`

## Key decisions

- 浮层继续保持无边框，只用渐变、阴影和轻微 blur 做区分。
- 颜色选用偏冷的蓝紫 tonal 组合，和课程卡/快捷面板拉开层次，但不脱离当前项目主色语言。
