---
phase: quick
plan: 260513-pjo
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/surfaces/teacher-schedule-week-grid.tsx
autonomous: true
requirements:
  - QUICK-hover-glassmorphism
---

<objective>
把 `/teacher/schedule` 课程 hover / focus 明细浮层进一步收敛成更明显的 glassmorphism 风格：更强的半透明感、柔和高光、轻 ring、足够的 blur 与阴影，同时继续保证高可读性。
</objective>

<verification>
- `pnpm vitest run "src/components/surfaces/teacher-schedule-surface.test.tsx"`
</verification>

<success_criteria>
- [ ] hover 浮层具备明显 glass 质感
- [ ] 仍保持无边框、现代、轻盈视觉语言
- [ ] 文本和 action pills 可读性稳定
- [ ] 现有测试继续通过
</success_criteria>
