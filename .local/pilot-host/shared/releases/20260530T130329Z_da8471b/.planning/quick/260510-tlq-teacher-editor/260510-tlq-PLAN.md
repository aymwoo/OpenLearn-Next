---
phase: quick
plan: 260510-tlq
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/authoring/lesson-authoring-workspace.tsx
  - src/components/authoring/lesson-authoring-workspace.test.tsx
  - src/components/authoring/lesson-step-editor.tsx
  - src/components/authoring/lesson-step-editor.test.tsx
autonomous: true
requirements:
  - QUICK-260510-TLQ
must_haves:
  truths:
    - "教师在 /teacher/editor 的流程主线里能看到明确的组件编辑按钮，而不是只能点整张卡片进入编辑。"
    - "点击任一步骤的编辑按钮后，步骤编辑器以右侧抽屉展开，不再固定出现在主线底部。"
    - "抽屉中的步骤编辑仍保留原有 autosave、builtInSource 展示与 schema 校验能力。"
  artifacts:
    - path: "src/components/authoring/lesson-authoring-workspace.tsx"
      provides: "流程主线中的显式编辑入口与抽屉开关状态"
    - path: "src/components/authoring/lesson-step-editor.tsx"
      provides: "可嵌入抽屉的步骤编辑器容器"
    - path: "src/components/authoring/lesson-authoring-workspace.test.tsx"
      provides: "主线编辑按钮与抽屉交互回归测试"
    - path: "src/components/authoring/lesson-step-editor.test.tsx"
      provides: "抽屉态编辑器保留保存链路的回归测试"
  key_links:
    - from: "src/components/authoring/lesson-authoring-workspace.tsx"
      to: "src/components/authoring/lesson-step-editor.tsx"
      via: "selectedStep + drawer open state"
      pattern: "LessonStepEditor"
    - from: "src/components/authoring/lesson-authoring-workspace.test.tsx"
      to: "src/components/authoring/lesson-authoring-workspace.tsx"
      via: "render 后断言编辑按钮与抽屉 DOM"
      pattern: "编辑|抽屉|lesson-step-editor"
---

<objective>
把 /teacher/editor 的步骤属性编辑从页面底部 inline 区块改成由流程主线组件卡片显式触发的右侧抽屉。

Purpose: 满足本次 quick 需求，统一教师在流程主线中的“查看步骤 + 点按钮编辑”心智，避免底部长编辑区持续占据页面高度。

Output: 带编辑按钮的流程主线卡片、可开合的步骤编辑抽屉，以及覆盖交互与保存链路的 focused tests。
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
@src/components/authoring/lesson-authoring-workspace.tsx
@src/components/authoring/lesson-step-editor.tsx

<interfaces>
```ts
type LessonAuthoringWorkspaceProps = {
  overview: TeacherAuthoringOverviewDTO;
  lesson: LessonEditorDTO | null;
  builtInTemplates: BuiltInTemplateForAuthoring[];
};

type LessonStepEditorProps = {
  step: LessonStepDTO | null;
};
```

当前 `LessonAuthoringWorkspace` 在文件尾部直接渲染：

```tsx
<LessonStepEditor key={selectedStep?.id ?? "empty-step"} step={selectedStep} />
```

当前 `FlowStepCard` 只暴露 `复制 / 上移 / 下移 / 归档`，没有显式“编辑”入口；本 quick 任务要把编辑入口前移到卡片动作区，并把 `LessonStepEditor` 迁入抽屉容器，而不是继续挂在页面底部。
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 先锁定流程主线编辑按钮与抽屉交互回归</name>
  <files>src/components/authoring/lesson-authoring-workspace.test.tsx, src/components/authoring/lesson-step-editor.test.tsx</files>
  <behavior>
    - Test 1: 已有步骤卡片显示“编辑”按钮，点击后出现抽屉态步骤编辑器。
    - Test 2: 未打开抽屉时，页面底部不再常驻独立步骤编辑器占位。
    - Test 3: 抽屉中的步骤编辑器仍可提交 autosave，并保留 builtInSource 展示与 payload 透传。
  </behavior>
  <action>扩展 `lesson-authoring-workspace.test.tsx`，不要继续只 mock 成静态 `data-testid`；改为能断言“编辑”按钮、抽屉打开/关闭文案、以及不再出现页面底部常驻编辑区。必要时给 mock editor 增加最小可识别 props 显示。同步在 `lesson-step-editor.test.tsx` 增加一个抽屉承载场景的回归点：验证编辑器在新增抽屉外壳 props 后仍能保存步骤且不丢 `builtInSource`（对应 STATE 中 Phase 17 的 provenance 决策）。不要写 snapshot，也不要用 className 作为唯一断言。</action>
  <verify>
    <automated>pnpm test --run "src/components/authoring/lesson-authoring-workspace.test.tsx" "src/components/authoring/lesson-step-editor.test.tsx"</automated>
  </verify>
  <done>测试能明确证明：编辑入口在流程主线卡片上、步骤编辑器改为抽屉触发、保存链路与 builtInSource 保持不变。</done>
</task>

<task type="auto">
  <name>Task 2: 将流程主线步骤编辑改为显式按钮触发的右侧抽屉</name>
  <files>src/components/authoring/lesson-authoring-workspace.tsx, src/components/authoring/lesson-step-editor.tsx</files>
  <action>在 `lesson-authoring-workspace.tsx` 的 `FlowStepCard` 动作区新增明确的“编辑组件”按钮，并让它与当前选中步骤同步：点击按钮时设置 `selectedStepId` 并打开右侧抽屉；点击遮罩、关闭按钮或无步骤时关闭抽屉。移除文件底部常驻的 `LessonStepEditor` 渲染，改成固定定位的右侧 drawer 容器，视觉上参考现有 `course-create-drawer.tsx` 的交互结构（遮罩 + 右侧面板 + 顶部关闭按钮），但继续沿用 teacher/editor 的 tonal surface、Lexend、无 1px 分割线约束。与此同时，把 `LessonStepEditor` 调整为可嵌入抽屉的内容组件：支持可选的 drawer header/close affordance 或由外层提供标题区，但不要改动 `autosaveLessonStepAction`、`lessonStepPayloadSchema`、`builtInSource` 保留逻辑，也不要让 UI 组件直接接触 DAL/DB。</action>
  <verify>
    <automated>pnpm test --run "src/components/authoring/lesson-authoring-workspace.test.tsx" "src/components/authoring/lesson-step-editor.test.tsx"</automated>
  </verify>
  <done>流程主线每个步骤都提供显式编辑按钮；点击后右侧抽屉展开步骤编辑器；页面底部不再存在常驻步骤编辑区；保存、来源徽标和 schema 校验行为保持可用。</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Teacher interaction -> client editor state | 教师点击流程卡片按钮会改变当前选中步骤与抽屉打开状态。 |
| Client editor form -> autosave Server Action | 抽屉中的表单输入会进入 `autosaveLessonStepAction` 与 schema 校验。 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260510-tlq-01 | Tampering | `src/components/authoring/lesson-step-editor.tsx` | mitigate | 保持 `lessonStepPayloadSchema.safeParse` 与现有 `buildPayload` 路径不变，避免抽屉化时绕过结构化校验。 |
| T-260510-tlq-02 | Spoofing | `src/components/authoring/lesson-authoring-workspace.tsx` | mitigate | 编辑入口只作用于当前 `selectedStepId`/`step.id`，不新增任意 stepId 拼装或跨步骤隐藏写入路径。 |
| T-260510-tlq-03 | Denial of service | `src/components/authoring/lesson-authoring-workspace.test.tsx` | mitigate | 用 focused interaction test 锁定“按钮打开抽屉、关闭抽屉、底部编辑器移除”合同，防止后续 UI 调整把编辑器重复渲染或永久占屏。 |
</threat_model>

<verification>
运行 `pnpm test --run "src/components/authoring/lesson-authoring-workspace.test.tsx" "src/components/authoring/lesson-step-editor.test.tsx"`。如需人工 spot check，打开 `/teacher/editor?courseId=...&lessonId=...`，确认流程卡片上出现“编辑组件”按钮，点击后右侧抽屉展开，底部不再显示独立步骤编辑器。
</verification>

<success_criteria>
- `/teacher/editor` 流程主线中的每个步骤卡片都能看到清晰的编辑按钮。
- 步骤编辑器只在点击编辑按钮后以抽屉展开，不再常驻页面底部。
- 抽屉中的编辑仍保持 autosave、schema 校验、builtInSource 展示与 payload 保留。
- focused tests 通过，并能拦截编辑入口或抽屉行为回归。
</success_criteria>

<output>
完成后创建 `.planning/quick/260510-tlq-teacher-editor/260510-tlq-SUMMARY.md`。
</output>
