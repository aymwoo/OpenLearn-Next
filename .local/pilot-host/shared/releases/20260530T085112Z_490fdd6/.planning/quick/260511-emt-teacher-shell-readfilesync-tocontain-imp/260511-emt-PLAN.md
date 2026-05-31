---
quick_id: 260511-emt
title: 分阶段迁移 teacher shell 测试到 RTL semantic assertions
status: planned
created_at: 2026-05-11
---

# Quick Task 260511-emt Plan

## Goal

把 `teacher-sidebar-shell` 第一批 implementation-detail 测试从
`renderToStaticMarkup` + `toContain` 迁移到基于 React Testing Library 的
semantic UI testing，保持当前 teacher shell 行为覆盖，并把风险控制在单个
测试文件与必要的最小语义补强范围内。

## Context

- 当前 `src/components/shell/teacher-sidebar-shell.test.tsx` 主要通过
  `renderToStaticMarkup()` 和 class / data attribute 字符串命中验证输出。
- `TeacherSidebarShellFrame` 已把壳层决策收敛到
  `resolveTeacherShellUiState()`，因此第一步迁移应优先覆盖用户可感知结构，
  而不是继续锁定 Tailwind implementation details。
- 本次只做 teacher shell 测试体系的第一阶段迁移；不扩展到其它 shell / page
  文件，也不引入研究或大规模测试重写。

## Tasks

1. **把 teacher shell 集成测试切到 RTL 渲染与语义查询**
   - **Files:** `src/components/shell/teacher-sidebar-shell.test.tsx`
   - **Action:** 用 `@testing-library/react` 重写当前 3 组 `TeacherSidebarShellFrame`
     测试，移除 `renderToStaticMarkup` 与大部分 `toContain`/`not.toContain`
     字符串断言。保留现有 `buildSurfaceMetadata()`/fixture builder 思路，但改为
     `render()` 后通过 `screen`、`within`、可访问名称、可见文本、按钮、heading、
     `main`/`footer` 等语义节点证明默认主题与 active-theme 两条路径都正常工作。
     对 shell contract 必须验证但暂时没有更好用户语义的点，仅允许保留极少量
     `data-region` / `data-theme-*` 属性断言，避免继续检查 Tailwind class 字符串。
   - **Verify:** `pnpm vitest run src/components/shell/teacher-sidebar-shell.test.tsx`
   - **Done:** `teacher-sidebar-shell.test.tsx` 不再依赖 `renderToStaticMarkup`，且默认
     路径、active-theme 路径、region visibility 三类覆盖仍然存在。

2. **按测试需要补最小语义锚点，不改视觉结构**
   - **Files:** `src/components/shell/teacher-sidebar-shell.tsx`
   - **Action:** 如果 Task 1 发现某些关键区域只能靠 class string 才能定位，给
     `TeacherSidebarShellFrame` 增加最小、稳定、面向可访问性的语义锚点，例如为
     `context-panel`、`secondary-nav`、`page-footer` 或 header action 区补充合理的
     accessible name / landmark 语义；不要改动 shell 布局、文案、resolver 合同或
     Phase 19 已锁定的 metadata-first 路径。`src/lib/theme-layout/shell-surface-resolver.ts`
     本步只作为 contract 参考，不主动改逻辑，除非测试迁移暴露真实接线缺口。
   - **Verify:** `pnpm vitest run src/components/shell/teacher-sidebar-shell.test.tsx`
   - **Done:** 测试可以主要通过 semantic queries 表达壳层行为，组件视觉输出与
     resolver 接线保持不变。

3. **锁定第一阶段迁移边界与后续可继续拆分的回归面**
   - **Files:** `src/components/shell/teacher-sidebar-shell.test.tsx`, `.planning/quick/260511-emt-teacher-shell-readfilesync-tocontain-imp/260511-emt-SUMMARY.md`
   - **Action:** 在测试中明确第一阶段只覆盖 `TeacherSidebarShellFrame` 的用户可感知
     shell 行为：标题/说明、header actions、main content、可见 region 的出现与隐藏。
     不在本次继续迁移源码级实现细节检查、`readFileSync` 类源码文本断言脚本，后续若
     还需处理 implementation-detail tests，再按更小批次拆分。完成后在 SUMMARY 里
     记录“已迁移的语义断言面 / 仍保留的非语义断言面 / 下一步候选”。
   - **Verify:** `pnpm vitest run src/components/shell/teacher-sidebar-shell.test.tsx`
   - **Done:** 第一阶段迁移边界清晰，后续继续迁移时可直接沿用本次 RTL fixture 与
     semantic assertion 模式。
