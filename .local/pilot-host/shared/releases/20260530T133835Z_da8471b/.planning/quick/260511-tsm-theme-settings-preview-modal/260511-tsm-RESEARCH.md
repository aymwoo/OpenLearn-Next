# Quick research: Editor theme settings and preview modal

**Researched:** 2026-05-11  
**Scope:** `/teacher/editor` 主题设置入口、现有主题链路、modal 复用路径、最小可执行按钮语义  
**Confidence:** HIGH（现状判断） / MEDIUM（按钮语义建议）

## Summary

当前仓库已经有完整的主题生效主链路：`activeThemeId` cookie 由
`setActiveThemeAction()` 写入，`ThemeInjector` 通过
`getCurrentActorThemeRuntimeState()` 读取运行时，并把 CSS variables 和
`layoutRuntime` 注入到 root layout。这个链路已经被 settings 页面使用，且不应在
editor 内被绕开。  
[VERIFIED: `src/actions/theme-actions.ts`, `src/lib/theme-cookie.ts`,
`src/lib/dal/themes.ts`, `src/components/theme/theme-injector.tsx`]

编辑器侧目前只有一个现成的 modal 模式，即
`src/components/authoring/editor-settings-modal.tsx` 的 native `<dialog>`。
header 通过 `LessonEditorHeaderActions` 挂载该 modal；因此“增加主题设置和预览的
Modal”的最小路径不是再加第二个 modal，而是扩展现有 `EditorSettingsModal`。  
[VERIFIED: `src/components/authoring/editor-settings-modal.tsx`,
`src/components/authoring/lesson-editor-header-actions.tsx`]

主题候选项现在只在 `/settings` 页面读取：默认主题由 UI 固定提供，额外主题来自
`getValidThemesForSchool(schoolId)`，当前选中态来自 `getActiveThemeId()`。
这个模式适合直接搬到 editor，但数据必须继续由 server 组件注入，不能在 client
modal 里直接读 DAL。  
[VERIFIED: `src/components/surfaces/settings-surface.tsx`]

“预览、保存、生效”三个按钮里，只有“生效”在现有代码中有真实后端语义；因为仓库里
还没有 theme draft、preview runtime override、preview cookie 或 query-based
theme sandbox。如果不新增基础设施，最小可执行定义只能是：`预览` 更新 modal 内
预览区，`保存` 保存 modal 内待应用选择，`生效` 调现有 action。  
[VERIFIED: `src/actions/theme-actions.ts`, `src/components/theme/theme-injector.tsx`]

## Verified findings

### 1. 现有主题生效链路已经完整

- `setActiveThemeAction()` 负责清除或写入 `activeThemeId`，并执行
  `revalidatePath("/", "layout")`。  
  [VERIFIED: `src/actions/theme-actions.ts`]
- `ACTIVE_THEME_COOKIE` 固定为 `activeThemeId`。  
  [VERIFIED: `src/lib/theme-cookie.ts`]
- `getCurrentActorThemeRuntimeState()` 会把无效/无权限主题回退到 default runtime，
  并输出 `themeSource: "default" | "active-theme"`。  
  [VERIFIED: `src/lib/dal/themes.ts`]
- `ThemeInjector` 把 `layoutRuntime` 和 CSS variables 注入 root layout，没有第二条
  editor 专用主题链路。  
  [VERIFIED: `src/components/theme/theme-injector.tsx`, `src/app/layout.tsx` by tests]

### 2. 主题候选列表已有稳定来源

- `/settings` 页面固定渲染“默认主题”卡片。  
  [VERIFIED: `src/components/surfaces/settings-surface.tsx`]
- `/settings` 页面额外主题来自 `getValidThemesForSchool(schoolId)`。  
  [VERIFIED: `src/components/surfaces/settings-surface.tsx`]
- 当前选中态来自 `getActiveThemeId()`。  
  [VERIFIED: `src/components/surfaces/settings-surface.tsx`]
- 主题卡当前已包含 `layoutSummary.description` 和 `fallbackLabel`，适合直接作为
  editor modal 的“结构预览”数据来源。  
  [VERIFIED: `src/components/surfaces/settings-surface.tsx`]

### 3. 编辑器 modal 复用点已经存在

- `LessonEditorSurface` 是 server component，已负责组织 header 和 workspace，适合
  注入主题选项。  
  [VERIFIED: `src/components/surfaces/lesson-editor-surface.tsx`]
- `LessonEditorHeaderActions` 是 client component，当前只把 lesson 元数据传给
  `EditorSettingsModal`。  
  [VERIFIED: `src/components/authoring/lesson-editor-header-actions.tsx`]
- `EditorSettingsModal` 已有 `showModal()/close()`、backdrop click close 和 modal
  section 结构，扩展主题块的成本最低。  
  [VERIFIED: `src/components/authoring/editor-settings-modal.tsx`]

### 4. 当前测试模式偏“轻交互 + 源码守卫”

- `lesson-editor-header-actions.test.tsx` 目前 mock 掉了 `EditorSettingsModal`，只测
  header 的保存/发布交互。  
  [VERIFIED: `src/components/authoring/lesson-editor-header-actions.test.tsx`]
- `settings-surface.test.tsx` 与 `theme-actions.test.ts` 大量使用 `readFileSync`
  做源码级 contract guard，而不是完整 runtime 测试。  
  [VERIFIED: `src/components/surfaces/settings-surface.test.tsx`,
  `src/actions/theme-actions.test.ts`]

## Recommended minimal implementation

### Scope choice

最小可执行方案应复用现有 editor 设置 modal，而不是新增 `ThemePreviewModal` 或新
page。原因：

- 现有 header 已经有“设置”入口。
- 现有 modal 视觉和交互模式已被编辑器接受。
- 当前主题系统只有一条可信生效链路，复用更安全。

### Recommended data flow

1. 在 `LessonEditorSurface` 或 `TeacherEditorPage` 的 server 侧读取：
   - `lesson.course.schoolId`
   - `getValidThemesForSchool(schoolId)`
   - `getActiveThemeId()`
2. 把 `default theme + activeThemeId + themes[]` 作为 props 传到
   `LessonEditorHeaderActions -> EditorSettingsModal`。
3. 在 `EditorSettingsModal` 内维护：
   - `selectedThemeId`
   - `previewThemeId`
   - `savedThemeId`
4. 仅 `生效` 按钮通过 `<form action={setActiveThemeAction}>` 或等价 server action
   提交 `themeId`。

### Recommended button semantics

| 按钮 | 最小语义 | 是否持久化 | 是否触发全局 theme runtime |
|---|---|---|---|
| `预览` | 切换 modal 内主题摘要/示意卡 | 否 | 否 |
| `保存` | 保存当前待应用选择到 modal 本地状态 | 否 | 否 |
| `生效` | 调 `setActiveThemeAction` 写 `activeThemeId` | 是 | 是 |

这不是理想终态，但它是当前仓库在不新建 preview runtime 的前提下最小且自洽的方案。
[ASSUMED]

### Recommended preview content

`预览` 不建议做全页面即时主题切换。最小内容可以是：

- 主题名称
- 是否默认主题 / 当前使用中 / 待生效
- `layoutSummary.description`
- `layoutSummary.fallbackLabel`
- 一块轻量 mock 卡片，展示 shell label、main split 和 tonal surface 标识

这样可以满足“预览”心智，但不碰 `ThemeInjector` 运行时。  
[ASSUMED]

## Key files to inspect before implementation

- `src/components/authoring/editor-settings-modal.tsx`
  现有 editor modal 模式、按钮结构、dialog 生命周期。
- `src/components/authoring/lesson-editor-header-actions.tsx`
  editor header action 入口和反馈文案承载点。
- `src/components/surfaces/lesson-editor-surface.tsx`
  server 侧注入 editor 头部 props 的最佳位置。
- `src/components/surfaces/settings-surface.tsx`
  现有主题卡片、默认主题入口、结构摘要与 `setActiveThemeAction` 用法。
- `src/actions/theme-actions.ts`
  `setActiveThemeAction` 的唯一生效入口。
- `src/lib/dal/themes.ts`
  `getValidThemesForSchool()` 与 `getCurrentActorThemeRuntimeState()` 的可信边界。
- `src/lib/theme-cookie.ts`
  `activeThemeId` cookie contract。
- `src/components/theme/theme-injector.tsx`
  最终生效时的 root runtime 注入方式。
- `src/components/authoring/lesson-editor-header-actions.test.tsx`
  现有 editor header 测试模式与 modal mock 方式。
- `src/components/surfaces/settings-surface.test.tsx`
  现有 theme/settings 回归守卫。

## Existing patterns to preserve

- UI 不直连 DB：theme 数据必须由 server component 读取后下传。  
  [VERIFIED: project constraints + current code]
- 默认主题由 UI 提供，不依赖数据库记录。  
  [VERIFIED: `src/components/surfaces/settings-surface.tsx`]
- 主题生效只走 `setActiveThemeAction -> activeThemeId cookie -> ThemeInjector`。  
  [VERIFIED: `src/actions/theme-actions.ts`, `src/components/theme/theme-injector.tsx`]
- editor modal 当前使用 native `<dialog>`，并通过 `showModal/close` 控制。  
  [VERIFIED: `src/components/authoring/editor-settings-modal.tsx`]
- theme 相关测试优先做 focused guard，不必为 quick 改动搭建重型 e2e。  
  [VERIFIED: `src/actions/theme-actions.test.ts`,
  `src/components/surfaces/settings-surface.test.tsx`]

## Primary risks

### Risk 1: `保存` 与 `生效` 语义混淆

当前没有 theme draft persistence。如果把 `保存` 也做成写 cookie，那么它和 `生效`
就会变成重复按钮。最小方案只能把 `保存` 定义为 modal 内待应用状态保存。  
[VERIFIED current lack of persistence: `src/actions/theme-actions.ts`,
`src/lib/theme-cookie.ts`] [ASSUMED recommendation]

### Risk 2: 为了“预览”引入第二条主题 runtime

如果新增 preview cookie、query override、preview-specific ThemeInjector，就会和
当前单一路径冲突，并提高 hydration 与缓存复杂度。  
[VERIFIED current single path: `src/components/theme/theme-injector.tsx`,
`src/lib/dal/themes.ts`]

### Risk 3: 在 client modal 里直接取 theme 数据

这会违反仓库约束，也会让权限和 school scope 校验分散。  
[VERIFIED: project constraints, current server-side settings pattern]

### Risk 4: 只改 editor，不补 theme 回归守卫

主题系统最近已有默认主题回归修复记录；如果 editor 侧新加入口但不补回归，容易再次
污染默认主题路径。  
[VERIFIED: `.planning/STATE.md`,
`.planning/quick/260510-kc9-theme-default-regression-fix/260510-kc9-PLAN.md`]

## Suggested verification commands

- `pnpm vitest run src/components/authoring/lesson-editor-header-actions.test.tsx src/app/(teacher)/teacher/editor/page.test.tsx`
- `pnpm vitest run src/components/surfaces/settings-surface.test.tsx src/actions/theme-actions.test.ts`
- 如果实现里触及 editor surface 文案守卫，可再跑：
  `pnpm vitest run src/components/surfaces/lesson-editor-surface.test.tsx`

## Assumptions log

| # | Claim | Risk if wrong |
|---|---|---|
| A1 | `保存` 可以被接受为“保存待生效选择”，而不是持久化到服务端。 | 用户可能期待跨关闭 modal 或跨刷新保留。 |
| A2 | modal 内的结构摘要预览足够满足本次“预览”需求。 | 用户可能期待全页面真实即时换肤。 |
| A3 | 复用现有 `EditorSettingsModal` 比拆新组件更合适。 | 如果后续主题 UI 明显膨胀，现有 modal 会变重。 |

## Sources

- `src/components/authoring/editor-settings-modal.tsx` [VERIFIED]
- `src/components/authoring/lesson-editor-header-actions.tsx` [VERIFIED]
- `src/components/surfaces/lesson-editor-surface.tsx` [VERIFIED]
- `src/components/surfaces/settings-surface.tsx` [VERIFIED]
- `src/actions/theme-actions.ts` [VERIFIED]
- `src/lib/dal/themes.ts` [VERIFIED]
- `src/lib/theme-cookie.ts` [VERIFIED]
- `src/components/theme/theme-injector.tsx` [VERIFIED]
- `src/components/authoring/lesson-editor-header-actions.test.tsx` [VERIFIED]
- `src/components/surfaces/settings-surface.test.tsx` [VERIFIED]
- `.planning/STATE.md` [VERIFIED]
- `.planning/quick/260510-kc9-theme-default-regression-fix/260510-kc9-PLAN.md` [VERIFIED]
