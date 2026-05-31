---
phase: quick
plan: 260511-tsm
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(teacher)/teacher/editor/page.tsx
  - src/components/surfaces/lesson-editor-surface.tsx
  - src/components/authoring/lesson-editor-header-actions.tsx
  - src/components/authoring/editor-settings-modal.tsx
  - src/components/authoring/lesson-editor-header-actions.test.tsx
  - src/components/surfaces/settings-surface.test.tsx
  - src/actions/theme-actions.test.ts
autonomous: true
requirements:
  - QUICK-theme-settings-preview-modal
must_haves:
  truths:
    - "编辑器继续复用现有 `activeThemeId -> DAL -> ThemeInjector` 主题生效链路，不新增平行主题系统。"
    - "主题设置与预览入口优先接到现有 `EditorSettingsModal`，避免新增第二套编辑器头部 modal 模式。"
    - "主题可选项继续来自学校范围内的有效主题，加上默认主题入口。"
    - "`预览 / 保存 / 生效` 三个按钮中，只有 `生效` 触发现有 Server Action；`保存` 仅保存 modal 内待应用选择。"
  artifacts:
    - path: "src/components/authoring/editor-settings-modal.tsx"
      provides: "编辑器内主题设置与预览 modal 主体"
    - path: "src/components/surfaces/lesson-editor-surface.tsx"
      provides: "编辑器主题数据注入入口"
    - path: "src/components/authoring/lesson-editor-header-actions.tsx"
      provides: "编辑器头部主题入口与反馈整合"
  key_links:
    - from: "src/components/authoring/editor-settings-modal.tsx"
      to: "src/actions/theme-actions.ts"
      via: "form action={setActiveThemeAction}"
      pattern: "setActiveThemeAction"
    - from: "src/components/surfaces/lesson-editor-surface.tsx"
      to: "src/lib/dal/themes.ts"
      via: "theme option hydration"
      pattern: "getValidThemesForSchool"
    - from: "src/actions/theme-actions.ts"
      to: "src/components/theme/theme-injector.tsx"
      via: "activeThemeId cookie -> runtime revalidation"
      pattern: "revalidatePath|ThemeInjector"
---

<objective>
为 `/teacher/editor` 建立一个最小可执行的主题设置与预览 modal 方案：教师可在当前编辑器里查看默认主题与学校有效主题，先在 modal 内预览结构摘要，再把选中的主题生效到全局运行时。

Purpose: 把主题切换从 `/settings` 扩展到高频编辑场景，但不引入新的主题持久化模型、预览 runtime 或客户端旁路。
Output: 一个复用现有主题链路的编辑器 modal 方案，以及围绕按钮语义、数据来源和测试回归的最小实现计划。
</objective>

<context>
@.planning/STATE.md
@src/app/(teacher)/teacher/editor/page.tsx
@src/components/surfaces/lesson-editor-surface.tsx
@src/components/authoring/lesson-editor-header-actions.tsx
@src/components/authoring/editor-settings-modal.tsx
@src/components/surfaces/settings-surface.tsx
@src/actions/theme-actions.ts
@src/lib/dal/themes.ts
@src/components/theme/theme-injector.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 把编辑器主题数据接到现有设置 modal</name>
  <files>src/app/(teacher)/teacher/editor/page.tsx, src/components/surfaces/lesson-editor-surface.tsx, src/components/authoring/lesson-editor-header-actions.tsx</files>
  <behavior>
    - 编辑器 header 继续只保留一个 `EditorSettingsModal` 入口。
    - modal 可拿到默认主题、当前激活主题和学校有效主题列表。
    - 不在 client 组件里直接读数据库或 cookies。
  </behavior>
  <action>在 server 侧收集编辑器主题上下文：优先基于当前 lesson 的 `schoolId` 读取 `getValidThemesForSchool`，再读取 `getActiveThemeId()`，把结果透传给 `LessonEditorHeaderActions -> EditorSettingsModal`。不要新建独立 editor-theme page，也不要让 client 组件直接 import DAL。</action>
  <verify>
    <automated>pnpm vitest run src/components/authoring/lesson-editor-header-actions.test.tsx src/app/(teacher)/teacher/editor/page.test.tsx</automated>
  </verify>
  <done>编辑器主题上下文由 server 组件注入，header action 层只负责渲染和交互，不新增数据旁路。</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: 在 EditorSettingsModal 内加入主题设置、局部预览与 footer actions</name>
  <files>src/components/authoring/editor-settings-modal.tsx</files>
  <behavior>
    - modal 内新增“默认主题 + 有效主题”选择区。
    - `预览` 只更新 modal 内预览卡与结构摘要，不写 cookie。
    - `保存` 只保存当前 modal 的待生效选择，提示“尚未生效”。
    - `生效` 继续通过 `setActiveThemeAction` 提交，并依赖现有 `revalidatePath("/", "layout")` 让主题运行时更新。
  </behavior>
  <action>扩展现有 `EditorSettingsModal`，复用现有 `<dialog>` 模式，不再新增第二套 modal 组件。主题预览先做成 modal 内的静态/半静态摘要视图，内容来源于 `layoutSummary` 和当前选择态；不要在此 quick 里创建新的 preview cookie、query override、ThemeInjector preview sandbox 或双运行时并存机制。</action>
  <verify>
    <automated>pnpm vitest run src/components/authoring/lesson-editor-header-actions.test.tsx</automated>
  </verify>
  <done>编辑器 modal 具备主题切换、局部预览和明确的 footer CTA，但仍只保留一条真实的全局生效链路。</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: 补足主题链路和设置页回归断言</name>
  <files>src/components/surfaces/settings-surface.test.tsx, src/actions/theme-actions.test.ts</files>
  <behavior>
    - 主题 action 回归继续锁定 cookie contract、root layout revalidate 与 ThemeInjector 路径。
    - 设置相关测试继续覆盖默认主题、有效主题和 `setActiveThemeAction` 绑定。
    - 新增编辑器 modal 相关源码/交互断言时，不破坏现有主题设置页回归。
  </behavior>
  <action>优先扩展现有 theme tests，而不是另起一套完全重复的主题测试基建。对交互行为做局部补充，对 runtime contract 继续沿用 `theme-actions.test.ts` 这类 focused source guard。</action>
  <verify>
    <automated>pnpm vitest run src/components/surfaces/settings-surface.test.tsx src/actions/theme-actions.test.ts src/components/authoring/lesson-editor-header-actions.test.tsx</automated>
  </verify>
  <done>编辑器主题 modal 新增后，现有 settings/theme runtime 约束仍有回归保护。</done>
</task>

</tasks>

<risks>
- 当前仓库没有“主题草稿”或“临时预览 runtime”持久化模型，`保存` 与 `生效` 必须显式区分为 modal 内局部状态 vs 全局生效。
- 现有 `EditorSettingsModal` 是 client 组件，主题候选数据必须由 server 组件提前注入，否则会违反 DAL 边界。
- 如果把“预览”做成全页面即时切换，会和现有 `ThemeInjector` 单一路径冲突，并引入新的 hydration/cookie 复杂度。
- 编辑器 header 测试当前直接 mock 掉 `EditorSettingsModal`，后续若要测主题交互，需要补更细的 modal 级测试而不是只靠 header smoke test。
</risks>

<verification>
- `pnpm vitest run src/components/authoring/lesson-editor-header-actions.test.tsx src/app/(teacher)/teacher/editor/page.test.tsx`
- `pnpm vitest run src/components/surfaces/settings-surface.test.tsx src/actions/theme-actions.test.ts`
- 如需手工验证：启动开发环境后进入 `/teacher/editor?courseId=<id>&lessonId=<id>`，检查 modal 中默认主题、有效主题、预览区和 `生效` 后整体布局刷新。
</verification>

<success_criteria>
- [ ] 编辑器内出现统一的主题设置与预览 modal 入口
- [ ] 默认主题与学校有效主题都能在 modal 内被选择
- [ ] `预览 / 保存 / 生效` 语义明确，且只有 `生效` 触发全局主题更新
- [ ] 不新增平行主题 runtime、draft theme 持久化或 DAL 边界旁路
</success_criteria>

<output>
After completion, create `.planning/quick/260511-tsm-theme-settings-preview-modal/260511-tsm-SUMMARY.md`
</output>
