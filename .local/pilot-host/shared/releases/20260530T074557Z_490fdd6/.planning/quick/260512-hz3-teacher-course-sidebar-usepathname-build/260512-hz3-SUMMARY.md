---
phase: quick
plan: 260512-hz3
status: complete
---

# Quick summary

已完成：修复 `pnpm build` 时 `/teacher/courses/[courseId]` 指向 `src/components/shell/sidebar.tsx:36` 的 `usePathname()` 新阻塞点。

- `Sidebar` 已移除对 `usePathname()` 的依赖，只使用调用方传入的 `activePath` 计算选中态。
- 为 `RouteShell` 与 `classroom` layout 补上 `activePath` 透传，保持现有侧栏和顶栏选中逻辑不变。
- 该修复将路径读取统一收敛在上层 server layout/shell，而不是在共享 sidebar 组件里触发新的 blocking route。

验证：

- `pnpm build` 不再报 `/teacher/courses/[courseId]` 的 `sidebar.tsx:36 usePathname()` 阻塞；构建继续推进到下一个失败点（若有）。
