---
phase: quick
plan: 260511-tsm
status: complete
---

# Quick summary

已完成：在 `/teacher/editor` 复用现有 `EditorSettingsModal`，补上主题设置、
结构预览，以及 `预览 / 保存 / 生效` 三段式操作，不新增第二条主题 runtime。

## What changed

1. 在 `src/app/(teacher)/teacher/editor/page.tsx` 的 server 侧读取
   `getValidThemesForSchool()` 和 `getActiveThemeId()`，并把主题数据注入 editor。
2. 在 `LessonEditorSurface -> LessonEditorHeaderActions -> EditorSettingsModal`
   这条链路透传 `themes` 和 `activeThemeId`，不让 client 组件直接读取 DAL 或
   cookies。
3. 扩展 `src/components/authoring/editor-settings-modal.tsx`：
   - 增加默认主题与学校有效主题选择区
   - 增加基于 `layoutSummary.description` / `fallbackLabel` 的预览卡
   - 增加 `预览`、`保存`、`生效` 三个按钮
4. 保持按钮语义最小化：
   - `预览` 只更新 modal 内预览内容
   - `保存` 只保存待生效选择到 modal 本地状态
   - `生效` 继续调用 `setActiveThemeAction()`，沿用
     `activeThemeId -> ThemeInjector` 的现有生效链路
5. 新增 `src/components/authoring/editor-settings-modal.test.tsx`，并同步更新
   editor page、header actions、surface 的相关测试。

## Verification

- `pnpm typecheck`
- `pnpm vitest run "src/components/authoring/editor-settings-modal.test.tsx" "src/components/authoring/lesson-editor-header-actions.test.tsx" "src/app/(teacher)/teacher/editor/page.test.tsx" "src/components/surfaces/lesson-editor-surface.test.tsx"`

## Key decisions

- 编辑器主题入口继续复用现有 `EditorSettingsModal`，不新增第二套 editor modal。
- 主题候选继续沿用“默认主题 + 学校有效主题”的现有模式。
- 主题真实生效继续只走 `setActiveThemeAction -> activeThemeId cookie -> ThemeInjector`。
- 本次 quick 不引入 preview cookie、draft persistence 或局部 theme sandbox。
