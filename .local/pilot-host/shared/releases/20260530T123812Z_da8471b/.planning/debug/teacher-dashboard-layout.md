---
status: resolved
trigger: "教师工作台顶部主标题区域宽度不足，导致布局混乱；需定位根因并确认是否已由后续改动解决。"
created: 2026-05-07T00:00:00Z
updated: 2026-05-14T16:30:00Z
---

## Current Focus

hypothesis: 已关闭。该布局问题已被既有修复收口，不再是 milestone close blocker。
test: 对照当前 debug 结论与 `TeacherDashboardSurface` 既有修复记录，确认标题区宽度问题已按主列扩容方向处理。
expecting: debug 条目从历史 root-cause 记录收口为 resolved。
next_action: none

## Symptoms

- expected: 教师工作台顶部主标题区在桌面宽屏下保持稳定、可读，不因右侧摘要卡或 `max-width` 约束而拥挤。
- actual: 用户反馈标题 "今天把'编程基础：让角色动起来'编排成可运行课堂" 区域宽度不够，视觉上显得布局混乱。
- errors: none reported
- reproduction: 打开教师工作台首屏，在顶部 hero/summary 组合区观察标题换行与占位。

## Evidence

- timestamp: 2026-05-07T00:00:00Z
  checked: `src/components/surfaces/teacher-dashboard-surface.tsx`
  found: 标题区同时受 `xl` 两列布局与标题自身 `max-width` 约束影响，可用宽度偏窄。
  implication: 问题属于 surface layout contract，而不是数据或文案内容本身。

- timestamp: 2026-05-14T16:30:00Z
  checked: 既有 debug resolution 与 quick task 历史
  found: 该问题已按“扩大主列占比 + 移除标题固定 `max-width`”方向处理，并已有 lint/typecheck 检查记录。
  implication: 当前应把 debug 条目标记为 resolved，而不是继续作为未关闭问题保留。

## Resolution

root_cause:
  顶部教师指挥台标题区在 `xl` 布局下同时受到右侧摘要卡片占位和标题 `max-width` 约束，导致主标题可用宽度偏窄，出现视觉拥挤。
fix:
  将顶部区域改为更明确的两列 grid，扩大主内容列占比，并移除标题固定 `max-width`，让标题直接使用主列宽度。
verification:
  既有修复记录已执行 `pnpm exec eslint src/components/surfaces/teacher-dashboard-surface.tsx` 与 `pnpm typecheck`；当前 planning 只做状态收口，不重复改代码。
files_changed:
  - `src/components/surfaces/teacher-dashboard-surface.tsx`
