---
phase: quick
plan: 260510-pun
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/surfaces/lesson-editor-surface.tsx
  - src/components/surfaces/lesson-editor-surface.test.tsx
autonomous: true
requirements:
  - QUICK-260510-PUN
must_haves:
  truths:
    - "教师打开 /teacher/editor 时，左侧底部不再看到额外的竖条/占位组件。"
    - "左侧 rail 仍保留课时列表与步骤编排内容。"
    - "中间编排区与右侧设置、预览、发布能力保持不变。"
  artifacts:
    - path: "src/components/surfaces/lesson-editor-surface.tsx"
      provides: "移除左侧底部占位组件后的 teacher editor surface"
    - path: "src/components/surfaces/lesson-editor-surface.test.tsx"
      provides: "左侧底部占位组件移除回归测试"
  key_links:
    - from: "src/app/(teacher)/teacher/editor/page.tsx"
      to: "src/components/surfaces/lesson-editor-surface.tsx"
      via: "TeacherEditorPage 渲染 LessonEditorSurface"
      pattern: "LessonEditorSurface"
    - from: "src/components/surfaces/lesson-editor-surface.test.tsx"
      to: "src/components/surfaces/lesson-editor-surface.tsx"
      via: "render 后断言左侧底部占位卡已消失"
      pattern: "将新的课堂步骤放在这里"
---

<objective>
移除 /teacher/editor 左侧 rail 最底部的占位卡（当前为“将新的课堂步骤放在这里”），其余编辑器结构不动。

Purpose: 满足本次 quick UI 收敛需求，避免误伤 Phase 17 已在 editor 中落地的步骤编排、预览与发布路径。

Output: 去掉左侧底部占位组件的 editor surface，以及覆盖该变化的 focused regression test。
</objective>

<execution_context>
@/home/wuxf/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/wuxf/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@AGENTS.md
@src/app/(teacher)/teacher/editor/page.tsx
@src/components/surfaces/lesson-editor-surface.tsx

<interfaces>
```ts
type LessonEditorSurfaceProps = {
  overview: TeacherAuthoringOverviewDTO;
  lesson: LessonEditorDTO | null;
  builtInTemplates: BuiltInTeachingStepTemplatePayload[];
};
```

当前左侧 rail 由 `课时列表`、`步骤编排` 和底部占位卡组成；本次 quick 只移除最底部占位卡，不调整前两块和中右列的数据链路。
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 为左侧底部占位卡移除补充 focused regression</name>
  <files>src/components/surfaces/lesson-editor-surface.test.tsx</files>
  <action>新增或更新 jsdom surface 测试，直接渲染 `LessonEditorSurface` 的最小真实 fixture，明确断言左侧底部文案 `将新的课堂步骤放在这里` 不再出现，同时 `课时列表`、`步骤编排`、`当前编排焦点`、`设置面板`、`打开课堂预览` 仍存在。不要使用 snapshot，也不要依赖 className；用可见文案和 role 锁定“只删左下占位卡”。</action>
  <verify>
    <automated>pnpm test --run "src/components/surfaces/lesson-editor-surface.test.tsx"</automated>
  </verify>
  <done>测试能稳定证明左侧底部占位卡已被移除，且 editor 主体能力未被误删。</done>
</task>

<task type="auto">
  <name>Task 2: 从 lesson editor 左侧 rail 删除最底部占位组件</name>
  <files>src/components/surfaces/lesson-editor-surface.tsx</files>
  <action>在 `LessonEditorSurface` 中删除左侧 `<aside>` 最底部用于占位的 `Card` 组件及其仅服务该卡片的 import/样式，保留 `课时列表`、`步骤编排`、中间 `LessonAuthoringWorkspace`、右侧设置/发布/预览面板不变。若删除后间距失衡，只复用现有 `teacherSurfaceRhythm` 与 `radius-card` 语义做最小收敛，不新增局部视觉规则，也不要借机改动步骤按钮、预览入口或发布状态面板。</action>
  <verify>
    <automated>pnpm test --run "src/components/surfaces/lesson-editor-surface.test.tsx"</automated>
  </verify>
  <done>左侧 rail 底部不再渲染占位卡，页面仍保留课时列表、步骤编排、主编辑区与右侧控制面板。</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Teacher authoring DTO -> editor surface | 服务端 DTO 被渲染到教师编排界面。 |
| Surface test -> UI contract | 测试约束本次 quick 只删除目标占位组件，不误伤其它 editor 能力。 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260510-pun-01 | Tampering | `src/components/surfaces/lesson-editor-surface.tsx` | mitigate | 只删除左侧底部占位卡，不改动 `LessonAuthoringWorkspace`、预览链接、发布面板和 DTO 消费路径。 |
| T-260510-pun-02 | Denial of service | `src/components/surfaces/lesson-editor-surface.test.tsx` | mitigate | 用 focused regression 锁定关键保留元素，避免 UI 精简时误删整个左 rail 或中右列。 |
</threat_model>

<verification>
运行 `pnpm test --run "src/components/surfaces/lesson-editor-surface.test.tsx"`。如需人工 spot check，打开 `/teacher/editor?courseId=...&lessonId=...`，确认左侧最底部占位卡消失，其余区域保持可见。
</verification>

<success_criteria>
- 左侧最底部额外占位组件不再渲染。
- `课时列表`、`步骤编排`、主编排区、设置/预览/发布区继续存在。
- 变更不引入新的局部样式分叉。
- focused test 通过并可拦截该占位卡回归。
</success_criteria>

<output>
完成后创建 `.planning/quick/260510-pun-teacher-editor/260510-pun-SUMMARY.md`。
</output>
