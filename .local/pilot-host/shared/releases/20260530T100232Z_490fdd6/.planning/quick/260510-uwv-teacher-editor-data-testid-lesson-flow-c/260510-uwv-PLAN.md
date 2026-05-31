---
phase: quick
plan: 260510-uwv
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/authoring/lesson-authoring-workspace.tsx
  - src/components/authoring/lesson-authoring-workspace.test.tsx
autonomous: true
requirements:
  - QUICK-260510-UWV
---

<objective>
继续收紧 /teacher/editor 的资源库结构，让 `data-testid="lesson-flow-composer"` 只保留内层 rounded rail。

Purpose: 对齐用户给定的 Stitch 收口要求，移除资源库上方额外的标题说明与筛选按钮外壳。

Output: 裁剪后的资源库区实现，以及对应的 focused test。
</objective>

<context>
@.planning/STATE.md
@AGENTS.md
@src/components/authoring/lesson-authoring-workspace.tsx
@src/components/authoring/lesson-authoring-workspace.test.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 裁剪 lesson-flow-composer 外层壳并锁定回归</name>
  <files>src/components/authoring/lesson-authoring-workspace.tsx, src/components/authoring/lesson-authoring-workspace.test.tsx</files>
  <behavior>
    - `lesson-flow-composer` 区域只保留内层 rounded rail。
    - 不再显示“课堂流程组件”“资源库”标题、说明文案和“筛选资源”按钮外壳。
    - 资源 rail 内的搜索、分类、资源项与流程主线保持可用。
  </behavior>
  <action>以最小改动移除 `lesson-authoring-workspace.tsx` 中 `lesson-flow-composer` 的外层标题说明结构，并在测试中补充断言，确保这些标题/按钮不会重新出现。</action>
  <verify>
    <automated>pnpm test --run "src/components/authoring/lesson-authoring-workspace.test.tsx" "src/components/authoring/lesson-step-editor.test.tsx"</automated>
  </verify>
  <done>资源库区被裁成单一 rounded rail，且搜索、筛选、资源项、modal 编辑链路保持正常。</done>
</task>

</tasks>
