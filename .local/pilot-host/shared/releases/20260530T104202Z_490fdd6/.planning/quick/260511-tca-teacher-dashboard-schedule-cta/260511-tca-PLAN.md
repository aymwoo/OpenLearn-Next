---
phase: quick
plan: 260511-tca
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/surfaces/teacher-dashboard-surface.tsx
  - src/components/surfaces/teacher-dashboard-surface.test.tsx
autonomous: true
requirements:
  - QUICK-teacher-dashboard-schedule-cta
---

<objective>
将教师首页 `/teacher` 中“今日课表与运行节奏”模块右上角 CTA 从“查看完整日历”改为“查看课表”，并跳转到 `/teacher/schedule`。

Purpose: 用最小改动把教师首页 CTA 收敛到现有课表主入口，避免继续保留无效占位链接。
Output: 一个已接线的 CTA，以及锁定文案与 href 的最小回归测试。
</objective>

<context>
@.planning/STATE.md
@src/components/surfaces/teacher-dashboard-surface.tsx
@src/components/surfaces/teacher-dashboard-surface.test.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 更新教师首页课表 CTA</name>
  <files>src/components/surfaces/teacher-dashboard-surface.tsx</files>
  <action>将 CTA 的 href 从占位链接改为 `/teacher/schedule`，同时把按钮文案从“查看完整日历”改为“查看课表”，不调整其余布局与样式。</action>
  <done>教师首页 CTA 已正确跳转到课表页面，文案与当前信息架构一致。</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: 补充 CTA 链接回归测试</name>
  <files>src/components/surfaces/teacher-dashboard-surface.test.tsx</files>
  <action>新增最小断言，锁定 CTA 的 href、中文文案，以及旧文案不再存在。</action>
  <verify>
    <automated>pnpm vitest run "src/components/surfaces/teacher-dashboard-surface.test.tsx"</automated>
  </verify>
  <done>教师首页 CTA 的链接与文案合同有 focused test 覆盖。</done>
</task>

</tasks>

<verification>
- `pnpm vitest run "src/components/surfaces/teacher-dashboard-surface.test.tsx"`
</verification>

<success_criteria>
- [x] `/teacher` CTA 文案更新为“查看课表”
- [x] CTA 跳转到 `/teacher/schedule`
- [x] 旧文案“查看完整日历”已移除
- [x] 对应测试通过
</success_criteria>

<output>
After completion, create `.planning/quick/260511-tca-teacher-dashboard-schedule-cta/260511-tca-SUMMARY.md`
</output>
