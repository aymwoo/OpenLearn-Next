---
quick_id: 260511-bbe
title: /teacher 页面主导航与主内容区去圆角并拉满宽度
status: planned
created_at: 2026-05-11
---

# Quick Task 260511-bbe Plan

## Goal

让 `/teacher` 页面左侧导航、右侧 `main` 容器，以及主内容顶部“教师工作台”区块都取消圆角，
并确保主内容区域按 100% 宽度展开，不再保留局部窄版心或圆角壳层。

## Tasks

1. **收敛 teacher shell 外层容器样式**
   - **Files:** `src/components/shell/teacher-sidebar-shell.tsx`
   - **Action:** 调整 `TeacherSidebarShellFrame` 中左侧导航容器、右侧 `main` 容器与 `data-region="main-content"` 的圆角与宽度约束；`/teacher` 默认壳层改为直角主舞台，不保留 `borderRadius` 或内层 rounded 内容壳，同时保持现有 theme-aware shell 结构不被破坏。
   - **Verify:** `pnpm test -- --run src/components/shell/teacher-sidebar-shell.test.tsx`
   - **Done:** 左导航与右侧 `main` 在默认教师壳层下都不再显示圆角，主内容区保持全宽可扩展。

2. **移除教师工作台页面局部圆角壳层**
   - **Files:** `src/app/(teacher)/teacher/page.tsx`, `src/components/surfaces/teacher-dashboard-surface.tsx`
   - **Action:** 去掉 `/teacher` 页面额外挂载的 plugin section 外壳圆角，以及教师工作台顶部首屏容器中造成“顶部 div”圆角观感的 rounded shell；同时检查是否仍存在 `max-w-*`、`mx-auto` 或窄版心限制，确保主工作台内容横向 100% 铺开。
   - **Verify:** `pnpm test -- --run src/components/shell/teacher-sidebar-shell.test.tsx src/components/surfaces/teacher-dashboard-surface.test.tsx`
   - **Done:** “教师工作台”顶部区块与页面附加区块都不再带圆角，首页主内容宽度不再被局部容器压窄。

3. **补齐定向回归检查**
   - **Files:** `src/components/shell/teacher-sidebar-shell.test.tsx`, `src/components/surfaces/teacher-dashboard-surface.test.tsx`
   - **Action:** 增加/更新针对 `/teacher` 壳层样式的源码断言，锁定“无 rounded shell、无局部 max-width 回归、主内容保持全宽”的约束，避免后续主题或 surface 节奏改动把圆角和窄版心带回来。
   - **Verify:** `pnpm test -- --run src/components/shell/teacher-sidebar-shell.test.tsx src/components/surfaces/teacher-dashboard-surface.test.tsx`
   - **Done:** 有自动化测试覆盖本次样式约束，后续回归会被定向测试拦截。
