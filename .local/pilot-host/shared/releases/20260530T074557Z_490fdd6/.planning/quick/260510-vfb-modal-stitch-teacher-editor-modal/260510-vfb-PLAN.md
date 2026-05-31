---
phase: quick
plan: 260510-vfb
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/authoring/lesson-authoring-workspace.tsx
  - src/components/authoring/lesson-step-editor.tsx
  - src/components/authoring/lesson-step-editor.test.tsx
  - src/components/authoring/lesson-authoring-workspace.test.tsx
autonomous: true
requirements:
  - QUICK-260510-VFB
---

<objective>
参照提供的 Stitch modal 代码继续收敛 /teacher/editor 的步骤编辑 modal：将标题说明放回左栏，整体版式调整为容器内双栏结构。

Purpose: 让当前实现从“外层 modal 头部 + 内部编辑器双栏”回到更接近 Stitch 的单容器双栏结构，减少层级割裂感。

Output: 收敛后的 modal 容器结构、左栏编辑布局、右栏预览布局，以及对应测试更新。
</objective>

<context>
@.planning/STATE.md
@AGENTS.md
@src/components/authoring/lesson-authoring-workspace.tsx
@src/components/authoring/lesson-step-editor.tsx
@src/components/authoring/lesson-step-editor.test.tsx
@src/components/authoring/lesson-authoring-workspace.test.tsx
@/tmp/opencode/stitch-10d53f9d594349469326899863fd10b9.html
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 对齐 Stitch modal 容器层级并锁定回归</name>
  <files>src/components/authoring/lesson-authoring-workspace.tsx, src/components/authoring/lesson-step-editor.tsx, src/components/authoring/lesson-step-editor.test.tsx, src/components/authoring/lesson-authoring-workspace.test.tsx</files>
  <behavior>
    - modal 标题和说明回到左栏顶部，而不是独立悬在外层。
    - `LessonStepEditor` 自身承担左右双栏布局，右栏继续展示实时预览。
    - 现有 autosave、builtInSource 和测试回归保持成立。
  </behavior>
  <action>移除 `lesson-authoring-workspace.tsx` 里独立的 modal 头部文案，把这些内容移回 `lesson-step-editor.tsx` 左栏顶端；同时微调左右栏宽度和间距，使整体结构贴近 Stitch 参考代码。更新测试，确保 modal 标题仍可访问、预览仍存在、保存链路不变。</action>
  <verify>
    <automated>pnpm test --run "src/components/authoring/lesson-step-editor.test.tsx" "src/components/authoring/lesson-authoring-workspace.test.tsx"</automated>
  </verify>
  <done>modal 容器层级更贴近 Stitch 参考，左栏承载标题说明，右栏承载预览，测试通过。</done>
</task>

</tasks>
