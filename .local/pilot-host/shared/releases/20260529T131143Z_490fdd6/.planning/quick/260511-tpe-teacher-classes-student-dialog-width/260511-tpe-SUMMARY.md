---
phase: quick
plan: 260511-tpe
status: complete
---

# Quick Task 260511-tpe Summary

- 修复 `/teacher/classes` 学生列表 dialog 宽度异常，将原生 `<dialog>` 宽度从
  `w-full + max-w-*` 收口为 `w-[min(...)]` 的 viewport-clamped 表达式。
- 同步检查并修正了另一个同类原生 dialog（`EditorSettingsModal`）的同源宽度写法，避免重复触发。
- 新增定向回归测试，锁定原生 dialog 不再回退到旧的宽度组合。

## Changed files

- `src/components/surfaces/class-management-surface.tsx`
- `src/components/authoring/editor-settings-modal.tsx`
- `src/components/surfaces/class-management-surface.test.tsx`

## Tests

- `pnpm exec vitest --run src/components/surfaces/class-management-surface.test.tsx src/components/authoring/editor-settings-modal.test.tsx`

## Notes

- `DESIGN.md` 与 `src/app/globals.css` 未发现会导致该问题反复出现的全局错误定义；根因在组件局部宽度写法。
