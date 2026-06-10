---
status: complete
phase: 75-second-external-plugin-marketplace-generalization
source: 75-01-SUMMARY.md, 75-02-SUMMARY.md, 75-03-SUMMARY.md, 75-04-SUMMARY.md
started: 2026-06-10T08:45:00Z
updated: 2026-06-10T08:50:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: 清理临时状态（临时 DB、缓存、锁文件）。`pnpm dev` 启动本地开发环境。服务器无错误启动，迁移/种子数据完成，首页正常加载并返回实时数据。
result: pass

### 2. 教师创建 homework 步骤
expected: 进入 lesson editor → 添加步骤时选择 homework 类型 → 编辑区显示标题/描述/附件链接输入框 → 填写内容后点击「保存作业」→ 步骤保存成功，可拖拽排序
result: issue
reported: "没有看到homework类型"
severity: major

### 3. 学生查看并提交作业
expected: 学生进入 classroom → 当前步骤为 homework 时显示 HomeworkAssignmentCard 组件 → 卡片显示作业标题、描述、附件链接（如有）→ 状态初始为"未开始" → 在文本框中输入内容后点击提交 → 状态变为"已提交" → 刷新/重新进入后仍显示已提交状态
result: skipped
reason: 依赖 Test 2（无 homework 步骤可测试）

### 4. 教师批改面板 - 作业提交 tab
expected: 教师进入 /classroom 页面 → 控制面板 TabsList 中出现「作业提交」tab（ClipboardList 图标）→ 点击后切换到作业提交流程 → 左侧显示学生提交列表，右侧显示批改面板
result: skipped
reason: 依赖 Test 2（无 homework 步骤可测试）

### 5. 学生提交列表与自动刷新
expected: 左侧提交列表按学生分组显示 → 每条显示学生信息 + 提交状态 badge（待批改/已批改及分数）→ 点击可选中某学生 → 列表约 10s 自动刷新 → 空态时显示提示文案
result: skipped
reason: 依赖 Test 2（无 homework 步骤可测试）

### 6. 教师打分与评语
expected: 在提交列表中选中学生 → 右侧批改面板显示该学生提交内容 → 顶部显示系统建议分 badge → 教师可输入分数（0-100）→ 可填写评语 → 点击保存 CTA（primary gradient 按钮）→ 保存成功后列表状态更新为"已批改"并显示分数 → 错误时显示错误提示
result: skipped
reason: 依赖 Test 2（无 homework 步骤可测试）

### 7. 自动化测试通过（pnpm verify:phase75）
expected: 运行 `pnpm verify:phase75` → quiz 测试全部通过（3/3）→ homework lifecycle 测试全部通过（10/10）→ homework 跨插件回归测试全部通过（6 检查点）→ 命令以零退出码结束
result: issue
reported: "No test files found, exiting with code 1 — filter: src/plugins/quiz-sample/；homework tests: PASS(17) FAIL(1) — 检查点E homework upgrade 后 quiz 数据完整，expected vi.fn() to be called 1 times, but got 3 times"
severity: major

## Summary

total: 7
passed: 1
issues: 2
pending: 0
skipped: 4
blocked: 0

## Gaps

- truth: "进入 lesson editor → 添加步骤时选择 homework 类型 → 编辑区显示标题/描述/附件链接输入框"
  status: failed
  reason: "User reported: 没有看到homework类型"
  severity: major
  test: 2
  root_cause: "BUILT_IN_TEACHING_STEP_DEFINITIONS（resource-ai.ts:500）中缺少 homework 内置模板条目。isHomeworkStep() 已实现、homework 编辑 UI 已实现、buildPayload 已处理 homework 分支，但缺少 builtInKey='homework' 的模板定义导致教师无法创建 homework 步骤。"
  artifacts:
    - path: "src/lib/dto/resource-ai.ts"
      issue: "BUILT_IN_TEACHING_STEP_DEFINITIONS 数组中缺少 homework 条目"
  missing:
    - "在 BUILT_IN_TEACHING_STEP_DEFINITIONS 中添加 homework 内置模板定义（builtInKey='homework', stepType='task', pluginKey='builtin-teaching-step-homework'）"

- truth: "运行 pnpm verify:phase75 → quiz 3/3 + homework lifecycle 10/10 + cross-plugin regression 6/6 → 零退出码"
  status: failed
  reason: "User reported: verify:phase75 第一阶段 No test files found (src/plugins/quiz-sample/ 目录不存在)；第二阶段 homework tests PASS(17) FAIL(1) — 检查点E expected vi.fn() to be called 1 times, but got 3 times"
  severity: major
  test: 7
  root_cause: "双问题：(a) verify:phase75 script 引用 src/plugins/quiz-sample/ 但该目录不存在，quiz 测试文件实际在 src/components/learning/quiz-sample-step-card.test.tsx；(b) cross-plugin-regression.test.ts:183 检查点E mock 断言不准确——upgrade 流程中 read-verbs mock 被调用了 3 次而非预期的 1 次"
  artifacts:
    - path: "package.json"
      issue: "verify:phase75 第一阶段命令 pnpm vitest run src/plugins/quiz-sample/ 目标目录不存在"
    - path: "src/plugins/homework/__tests__/cross-plugin-regression.test.ts"
      issue: "Line 183: 检查点E 断言 expect(mock).toHaveBeenCalledTimes(1) 实际调用 3 次"
  missing:
    - "修正 verify:phase75 的 quiz 测试路径为实际存在的测试文件路径"
    - "修正 cross-plugin-regression.test.ts 检查点E 的断言（调整为 toHaveBeenCalledTimes(3) 或调查为何 upgrade 产生额外调用）"
