---
phase: quick
plan: 260511-tca
status: complete
---

# Quick summary

已完成：将教师首页 `/teacher` 的课表 CTA 从“查看完整日历”改为“查看课表”，并接线到 `/teacher/schedule`。

## What changed

1. 更新 `src/components/surfaces/teacher-dashboard-surface.tsx`。
2. 将 CTA 的 `href` 从 `#` 改为 `/teacher/schedule`。
3. 将 CTA 文案从“查看完整日历”改为“查看课表”。
4. 更新 `src/components/surfaces/teacher-dashboard-surface.test.tsx`，增加 CTA 链接与文案回归断言。

## Verification

- `pnpm vitest run "src/components/surfaces/teacher-dashboard-surface.test.tsx"`

## Key decisions

- 继续复用现有 `/teacher/schedule` 作为教师课表主入口，不新增中间跳转页。
- 改动只收敛在教师首页 CTA 与对应测试，不扩展到其它 dashboard 区块。
