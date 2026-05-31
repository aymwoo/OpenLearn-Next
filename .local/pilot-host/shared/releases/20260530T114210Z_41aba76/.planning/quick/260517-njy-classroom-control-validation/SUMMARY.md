---
phase: quick
plan: 260517-njy-classroom-control-validation
status: complete
---

# Summary

- 在 `src/actions/classroom-actions.ts` 增加控课 action 的轻量 `FormData` 类型归一化，把 `expectedVersion`、`slideIndex`、`locked` 从字符串恢复为 schema 期望类型。
- 保持现有 `classroom` DTO、DAL、`/classroom` surface 和运行时冲突恢复契约不变，只修复 Server Action 入口的表单边界。
- 在 `src/actions/classroom-actions.test.ts` 补充 `FormData` 回归，覆盖切换环节、锁定跟随与切换 slide 三条控课路径。

# Verification

- `./node_modules/.bin/vitest --run src/actions/classroom-actions.test.ts`
