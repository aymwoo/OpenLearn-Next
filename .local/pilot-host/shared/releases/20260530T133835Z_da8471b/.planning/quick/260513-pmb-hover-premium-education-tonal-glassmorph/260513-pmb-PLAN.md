---
phase: quick
plan: 260513-pmb
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/surfaces/teacher-schedule-week-grid.tsx
autonomous: true
requirements:
  - QUICK-hover-premium-tonal
---

<objective>
将 `/teacher/schedule` 课程 hover / focus 明细浮层从偏 glassmorphism 的表现拉回到更符合 `DESIGN.md` 的 premium education tonal 方向：弱化透明和高光，强调 surface 层级、柔和明暗与清晰可读性。
</objective>

<verification>
- `pnpm vitest run "src/components/surfaces/teacher-schedule-surface.test.tsx"`
</verification>

<success_criteria>
- [ ] hover 浮层更接近 premium education tonal，而非明显玻璃卡
- [ ] 继续保持现代感和悬浮层级
- [ ] 不引入硬边框或 divider
- [ ] 现有课表测试继续通过
</success_criteria>
