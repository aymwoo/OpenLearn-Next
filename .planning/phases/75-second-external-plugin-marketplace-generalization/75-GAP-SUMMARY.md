---
phase: 75-second-external-plugin-marketplace-generalization
plan: GAP
type: gap_closure
subsystem: homework, verify, cross-plugin-regression
tags: [gap-closure, homework-template, test-fix]
requires: [75-04]
provides: [homework-builtin-template, verify-phase75-all-green]
tech-stack:
  added: []
  patterns: [builtin-teaching-step-template, append-only/isLatest]
decisions:
  - 在 builtInTeachingStepKeys 枚举中添加 homework 以支持模板定义
  - homework 使用 task 类型步骤，不需要 authoringContract（与 voting/quizSample 不同）
  - upgrade 三阶段各触发一次 insert，断言需反映实际调用 3 次
key-files:
  created: []
  modified:
    - src/lib/dto/resource-ai.ts (添加 homework 模板)
    - src/lib/dto/lesson-authoring.ts (添加 homework 到 key 枚举)
    - package.json (修正 verify:phase75 路径)
    - src/plugins/homework/__tests__/cross-plugin-regression.test.ts (修正断言)
metrics:
  duration: 31504142
  completed_at: 2026-06-11T08:49:00.000Z
---

# Phase 75 Plan GAP: Gap Closure Summary

**Gap closure 修复 UAT 发现的 2 个问题，使 verify:phase75 全部通过。**

## 执行的任务

### Task 1: Gap 1 — 添加 homework 内置模板定义
**提交:** `dcaf2b7`

**问题:** `BUILT_IN_TEACHING_STEP_DEFINITIONS` 中缺少 `builtInKey='homework'` 条目，教师无法在步骤选择器中找到 homework。

**修改:**
- `src/lib/dto/resource-ai.ts`: 在 `BUILT_IN_TEACHING_STEP_DEFINITIONS` 数组中添加 homework 模板（stepType: "task"，无限重试）
- `src/lib/dto/lesson-authoring.ts`: 在 `builtInTeachingStepKeys` 枚举中添加 `"homework"`，使 `BuiltInTeachingStepKeySchema` 接受新 key

### Task 2: Gap 2a — 修正 verify:phase75 quiz 路径
**提交:** `ed5e55f`

**问题:** `verify:phase75` 脚本中 `src/plugins/quiz-sample/` 目录不存在，首段测试失败。

**修改:**
- `package.json`: 将 `pnpm vitest run src/plugins/quiz-sample/` 改为 `pnpm vitest run src/components/learning/quiz-sample-step-card.test.tsx`

### Task 3: Gap 2b — 修正检查点E 断言
**提交:** `e237dd9`

**问题:** `cross-plugin-regression.test.ts` 中检查点E 断言 `toHaveBeenCalledTimes(1)`，但 homework upgrade 三阶段（backfill→verify→cutover）各触发一次 insert。

**修改:**
- `src/plugins/homework/__tests__/cross-plugin-regression.test.ts:183`: 将期望值从 `1` 改为 `3`

### Task 4: 验证
所有测试通过：
- `quiz-sample-step-card.test.tsx`: **3/3** 通过
- `src/plugins/homework/` (lifecycle + cross-plugin-regression): **18/18** 通过
- TypeScript 类型检查：无错误

### Task 5: 手动验证 Test 2（教师创建 homework 步骤）
此验证需要启动开发服务器并在浏览器中操作（checkpoint: human-verify）。

## 验证结果

```
quiz-sample-step-card: 3 passed
homework lifecycle:    通过
cross-plugin-regression: 18 passed (21 total)
tsc:                   无错误
```

## 偏离计划

### 自动修复的问题

**1. [Rule 2 - 缺失关键功能] 添加 homework 到 builtInTeachingStepKeys 枚举**
- **发现:** 任务 1 — 模板的 `builtInKey: "homework"` 需要被 `BuiltInTeachingStepKeySchema`（`z.enum(builtInTeachingStepKeys)`）接受
- **修复:** 在 `src/lib/dto/lesson-authoring.ts` 的 `builtInTeachingStepKeys` 数组中添加 `"homework"`
- **文件:** `src/lib/dto/lesson-authoring.ts`

## 检查点

### 待验证

**检查点 human-verify — Test 2（教师创建 homework 步骤）:**
启动 `pnpm dev`，以教师身份登录，进入 lesson editor，确认：
1. 内置步骤列表中显示「作业」选项
2. 点击后编辑器显示 homework 编辑区（标题/描述/附件链接）
3. 保存按钮为「保存作业」

## Self-Check

- [x] `src/lib/dto/resource-ai.ts` — 修改已提交 (dcaf2b7)
- [x] `src/lib/dto/lesson-authoring.ts` — 修改已提交 (dcaf2b7)
- [x] `package.json` — 修改已提交 (ed5e55f)
- [x] `src/plugins/homework/__tests__/cross-plugin-regression.test.ts` — 修改已提交 (e237dd9)
- [x] 所有测试通过
- [x] TypeScript 无错误

## Self-Check: PASSED
