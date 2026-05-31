---
phase: quick
plan: 260511-sqe
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/surfaces/teacher-schedule-surface.tsx
  - src/components/surfaces/teacher-schedule-surface.test.tsx
autonomous: true
requirements:
  - QUICK-schedule-quick-actions
must_haves:
  truths:
    - "`/teacher/schedule` 主页面必须直接提供 4 个子功能快捷入口，不再只停留在日程总览。"
    - "快捷操作区继续复用 `teacherSurfaceRhythm.section` 与 `teacherSurfaceRhythm.cardInset`，不新增局部卡片节奏。"
    - "节假日管理与单次变更共用 `/teacher/schedule/changes` 入口，标题统一为“单次变更与节假日”。"
  artifacts:
    - path: "src/components/surfaces/teacher-schedule-surface.tsx"
      provides: "课表首页快捷操作卡片与入口布局"
    - path: "src/components/surfaces/teacher-schedule-surface.test.tsx"
      provides: "4 个快捷操作入口链接回归保护"
  key_links:
    - from: "src/components/surfaces/teacher-schedule-surface.tsx"
      to: "src/app/(teacher)/teacher/schedule/import/page.tsx"
      via: "快捷操作链接"
      pattern: "/teacher/schedule/import"
    - from: "src/components/surfaces/teacher-schedule-surface.tsx"
      to: "src/app/(teacher)/teacher/schedule/changes/page.tsx"
      via: "快捷操作链接"
      pattern: "/teacher/schedule/changes"
    - from: "src/components/surfaces/teacher-schedule-surface.tsx"
      to: "src/app/(teacher)/teacher/schedule/assistant/page.tsx"
      via: "快捷操作链接"
      pattern: "/teacher/schedule/assistant"
    - from: "src/components/surfaces/teacher-schedule-surface.tsx"
      to: "src/app/(teacher)/teacher/schedule/reminders/page.tsx"
      via: "快捷操作链接"
      pattern: "/teacher/schedule/reminders"
---

<objective>
为 `/teacher/schedule` 主页面补上一组快捷操作卡片，让教师在日程总览首屏即可进入导入、单次变更/节假日、AI 助手与提醒配置四个子功能页面。

Purpose: 让课表首页从只读总览升级为可操作导航入口，但仍保持当前 hero 与 agenda cards 的信息层级不变。
Output: 一个符合现有 teacher surface 视觉节奏的快捷入口区，以及对应的链接回归测试。
</objective>

<context>
@.planning/STATE.md
@src/app/(teacher)/teacher/schedule/page.tsx
@src/components/surfaces/teacher-schedule-surface.tsx
@src/components/surfaces/teacher-schedule-surface.test.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 在课表首页 hero 下方补快捷操作入口区</name>
  <files>src/components/surfaces/teacher-schedule-surface.tsx</files>
  <action>新增 4 个快捷操作卡片，分别跳转到导入课程表、单次变更与节假日、AI 助手、提醒配置；卡片布局遵循 `sm:grid-cols-2 xl:grid-cols-4`，并满足 icon 托底、hover 阴影与箭头位移动效约束。</action>
  <verify>
    <automated>pnpm typecheck</automated>
  </verify>
  <done>课表首页在 hero 下方出现可点击的快捷操作区，视觉节奏与现有 teacher surface 保持一致。</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: 为 4 个 schedule 子页面入口补链接回归</name>
  <files>src/components/surfaces/teacher-schedule-surface.test.tsx</files>
  <action>补充测试，锁定 4 张快捷卡片的中文标题与 href，确保 `/teacher/schedule/changes` 入口继续承载单次变更与节假日的合并语义。</action>
  <verify>
    <automated>pnpm vitest run "src/components/surfaces/teacher-schedule-surface.test.tsx"</automated>
  </verify>
  <done>主页面新增快捷入口后，schedule surface 至少有 focused UI 测试覆盖链接契约。</done>
</task>

</tasks>

<verification>
- `pnpm typecheck`
- `pnpm vitest run "src/components/surfaces/teacher-schedule-surface.test.tsx"`
</verification>

<success_criteria>
- [ ] `/teacher/schedule` hero 下方出现 4 张快捷操作卡片
- [ ] 4 张卡片都能跳转到对应子页面
- [ ] 小屏/中屏/大屏网格能从 1 列、2 列到 4 列自适应
- [ ] 单次变更与节假日共用同一入口文案与链接
</success_criteria>

<output>
After completion, create `.planning/quick/260511-sqe-teacher-schedule-quick-actions/260511-sqe-SUMMARY.md`
</output>
