---
quick_id: 260511-tpe
title: 修复 /teacher/classes 学生列表 dialog 宽度异常并收口同类原生 dialog 写法
status: planned
created_at: 2026-05-11
---

# Quick Task 260511-tpe Plan

## Goal

修复 `/teacher/classes` 学生列表弹窗的宽度异常，检查是否存在会重复触发同类问题的原生
`<dialog>` 宽度写法，并以最小改动收口到统一的 viewport-clamped 模式。

## Tasks

1. **定位异常宽度来源**
   - **Files:** `src/components/surfaces/class-management-surface.tsx`, `DESIGN.md`, `src/app/globals.css`
   - **Action:** 确认 `/teacher/classes` 学生列表 dialog 的宽度定义与仓库内其它正常 modal 是否一致，并排除 `DESIGN.md` 或全局样式里的通用宽度错误定义。
   - **Done:** 明确根因属于组件内原生 `<dialog>` 的局部宽度表达式，而非全局主题或文档规则。

2. **做最小正确修复**
   - **Files:** `src/components/surfaces/class-management-surface.tsx`, `src/components/authoring/editor-settings-modal.tsx`
   - **Action:** 将命中的 `w-full + max-w-*` 原生 dialog 写法改为 `w-[min(...)]`，保证 modal 宽度同时受目标尺寸和 viewport 约束，避免同类组件重复踩坑。
   - **Done:** `/teacher/classes` 学生列表与同类原生 dialog 都使用统一 viewport-clamped 宽度写法。

3. **补齐回归保护**
   - **Files:** `src/components/surfaces/class-management-surface.test.tsx`
   - **Action:** 新增轻量源码断言测试，锁定原生 dialog 不再回退到 `w-full + max-w-*` 组合。
   - **Verify:** `pnpm exec vitest --run src/components/surfaces/class-management-surface.test.tsx src/components/authoring/editor-settings-modal.test.tsx`
   - **Done:** 同类宽度回归会被定向测试拦截。
