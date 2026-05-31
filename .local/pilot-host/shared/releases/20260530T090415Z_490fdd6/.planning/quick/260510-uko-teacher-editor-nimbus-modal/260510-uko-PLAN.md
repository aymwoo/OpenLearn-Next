---
phase: quick
plan: 260510-uko
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/authoring/lesson-authoring-workspace.tsx
  - src/components/authoring/lesson-authoring-workspace.test.tsx
autonomous: true
requirements:
  - QUICK-260510-UKO
---

<objective>
继续收尾 /teacher/editor 的 Nimbus 资源库实现，移除资源库底部残留的“当前编排概览 / 有效步骤 / 内置环节 / 普通步骤”统计块。

Purpose: 与 Stitch 参考保持一致，避免资源库 rail 内继续混入概览型统计面板。

Output: 删除资源库底部统计块后的 workspace 实现，以及对应的 focused test。
</objective>

<context>
@.planning/STATE.md
@AGENTS.md
@src/components/authoring/lesson-authoring-workspace.tsx
@src/components/authoring/lesson-authoring-workspace.test.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 删除资源库底部统计块并锁定回归</name>
  <files>src/components/authoring/lesson-authoring-workspace.tsx, src/components/authoring/lesson-authoring-workspace.test.tsx</files>
  <behavior>
    - 资源库区域不再显示“当前编排概览”标题。
    - 资源库区域不再显示“有效步骤 / 内置环节 / 普通步骤”三项统计。
    - 其余资源库、流程主线、modal 编辑链路保持不变。
  </behavior>
  <action>以最小改动移除 `lesson-authoring-workspace.tsx` 里资源库底部统计卡片和不再使用的辅助实现，并在测试中补充断言确保该统计块不会重新出现。</action>
  <verify>
    <automated>pnpm test --run "src/components/authoring/lesson-authoring-workspace.test.tsx" "src/components/authoring/lesson-step-editor.test.tsx"</automated>
  </verify>
  <done>资源库只保留资源选择与筛选结构，不再混入概览统计块；相关测试通过。</done>
</task>

</tasks>
