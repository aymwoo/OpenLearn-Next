---
phase: quick
plan: 260510-pcj
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/surfaces/lesson-editor-surface.tsx
  - src/components/surfaces/lesson-editor-surface.test.tsx
autonomous: true
requirements:
  - QUICK-260510-PCJ
must_haves:
  truths:
    - "教师打开 /teacher/editor 时，左侧不再看到课程 / 班级摘要卡。"
    - "左侧仍保留课时列表、步骤编排摘要与新增步骤占位。"
    - "中间编排区与右侧设置/发布/预览区继续可用。"
  artifacts:
    - path: "src/components/surfaces/lesson-editor-surface.tsx"
      provides: "移除左侧课程/班级摘要卡后的 teacher editor shell"
    - path: "src/components/surfaces/lesson-editor-surface.test.tsx"
      provides: "左侧摘要卡移除回归测试"
  key_links:
    - from: "src/app/(teacher)/teacher/editor/page.tsx"
      to: "src/components/surfaces/lesson-editor-surface.tsx"
      via: "Teacher editor 页面渲染 LessonEditorSurface"
      pattern: "LessonEditorSurface"
    - from: "src/components/surfaces/lesson-editor-surface.test.tsx"
      to: "src/components/surfaces/lesson-editor-surface.tsx"
      via: "render 后的 DOM 断言"
      pattern: "课时列表|当前编排焦点|设置面板"
---

<objective>
只移除 teacher editor 左侧的课程/班级摘要卡，保留其余编排区、设置区和预览/发布能力不变。

Purpose: 满足当前 quick 需求，同时避免误删 Phase 17 已落地的步骤编排、预览摘要与发布准备能力。

Output: editor surface 精简后的左侧 rail，以及覆盖该 UI 变更的 focused regression test。
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
@src/components/authoring/lesson-step-editor.tsx

<interfaces>
```ts
type LessonEditorSurfaceProps = {
  overview: TeacherAuthoringOverviewDTO;
  lesson: LessonEditorDTO | null;
  builtInTemplates: BuiltInTeachingStepTemplatePayload[];
};
```

当前左侧 rail 由三部分组成：顶部课程/班级摘要块、课时列表块、步骤编排块；本 quick 任务只删除第一块，后两块和中右列保持原职责。
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 为左侧摘要卡移除补充 focused surface regression</name>
  <files>src/components/surfaces/lesson-editor-surface.test.tsx</files>
  <action>新增 jsdom surface 测试，直接渲染 `LessonEditorSurface`，提供最小但真实的 `overview`、`lesson` 与 `builtInTemplates` fixture。断言左侧不再出现 `课程 / 班级` 标题及其课程/班级摘要文案，同时继续保留 `课时列表`、`当前编排焦点`、`设置面板`、预览入口等仍应存在的 UI。不要写 snapshot，也不要用脆弱的 className 断言；用可见文案和 role 约束“只删摘要卡，不删编排区”。</action>
  <verify>
    <automated>pnpm test --run "src/components/surfaces/lesson-editor-surface.test.tsx"</automated>
  </verify>
  <done>新增的 surface 测试能在摘要卡存在时失败，并能在目标 UI 收敛后稳定证明其余编排区仍保留。</done>
</task>

<task type="auto">
  <name>Task 2: 收敛 lesson editor 左侧 rail，仅移除课程/班级摘要卡</name>
  <files>src/components/surfaces/lesson-editor-surface.tsx</files>
  <action>在 `LessonEditorSurface` 中删除左侧 `<aside>` 顶部的课程/班级摘要块及其仅服务该摘要块的视觉元素，保留后续 `课时列表`、`步骤编排`、步骤占位卡、中间 `LessonAuthoringWorkspace` 和右侧设置/发布/预览面板。若删除后顶部留白或层级失衡，优先复用现有 `teacherSurfaceRhythm` / `radius-card` 语义收紧间距，不新增一套局部样式规则。不要改动 course/lesson 派生数据在 hero metrics、settings panel、preview link 中的既有使用路径。</action>
  <verify>
    <automated>pnpm test --run "src/components/surfaces/lesson-editor-surface.test.tsx"</automated>
  </verify>
  <done>teacher editor 左侧不再渲染课程/班级摘要卡，但用户仍能看到课时列表、步骤编排摘要、主编排区与右侧设置区。</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Teacher authoring DTO -> editor surface | 服务端 DTO 被渲染到教师端编排界面。 |
| Surface test -> UI contract | 测试约束本次 quick 只删除指定摘要块，不误伤其他编排能力。 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260510-pcj-01 | Tampering | `src/components/surfaces/lesson-editor-surface.tsx` | mitigate | 只删除左侧课程/班级摘要块，不改动 `LessonAuthoringWorkspace`、预览链接和发布检查的数据链路。 |
| T-260510-pcj-02 | Denial of service | `src/components/surfaces/lesson-editor-surface.test.tsx` | mitigate | 用 focused surface regression 锁定关键文案和入口，避免后续精简 UI 时误删整个左 rail 或中右列。 |
</threat_model>

<verification>
运行 `pnpm test --run "src/components/surfaces/lesson-editor-surface.test.tsx"`。如需人工 spot check，打开 `/teacher/editor?courseId=...&lessonId=...`，确认左侧只少了课程/班级摘要卡，其余编排区仍完整。
</verification>

<success_criteria>
- 左侧 `课程 / 班级` 摘要卡不再渲染。
- `课时列表`、`步骤编排`、主编排区、设置/发布/预览区继续存在。
- 变更复用现有 teacher surface rhythm/radius 语义，不引入新的局部视觉分叉。
- focused test 通过并能拦截摘要卡回归。
</success_criteria>

<output>
完成后创建 `.planning/quick/260510-pcj-teacher-editor/260510-pcj-SUMMARY.md`。
</output>
