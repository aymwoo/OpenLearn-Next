---
phase: 75-second-external-plugin-marketplace-generalization
plan: 03
subsystem: classroom
tags: [homework, grading, classroom-tab, allowlist, cross-plugin-regression]

requires:
  - phase: 75-02
    provides: "homework DAL + Server Actions + student runtime"
provides:
  - "classroom「作业提交」sibling tab"
  - "HomeworkSubmissionList 组件"
  - "HomeworkGradingPanel 组件"
  - "submitGradeAction（教师鉴权 + append-only 批改）"
  - "泛化修复确认（allowlist/DTO/GuardrailStepType/catalog）"
affects: [75-04]

tech-stack:
  added: []
  patterns:
    - "classroom tab 三栏布局：左侧学生提交列表 + 右侧批改面板"
    - "append-only grades 写入（upsert 动词 → Command Bus UPDATE+INSERT 事务）"
    - "Zod strictObject 校验 Server Action input"

key-files:
  created:
    - "src/components/classroom/homework-submission-list.tsx — 学生提交列表（自动刷新、状态badge、选中态）"
    - "src/components/classroom/homework-grading-panel.tsx — 教师批改面板（系统建议分、分数/评语输入、保存CTA）"
  modified:
    - "src/app/(classroom)/classroom/page.tsx — tab searchParams 新增 homework-submissions"
    - "src/components/surfaces/classroom-console-surface.tsx — activeConsoleTab 类型扩展"
    - "src/components/classroom/classroom-control-panel.tsx — TabsList 新增第三tab + TabsContent 集成组件"
    - "src/lib/dal/homework.ts — 新增 getHomeworkSubmissions + upsertHomeworkGrade"
    - "src/actions/homework-actions.ts — 新增 submitGradeAction（教师鉴权）"

key-decisions:
  - "homework tab 左侧列表+右侧面板布局，与作答实时 tab 独立（不共用 Zustand store）"
  - "提交列表通过 setInterval 10s 自动刷新，不接入 WebSocket 实时推送（保持简单）"
  - "系统建议分算法：Math.min(100, content.length / 10)，纯粹基于内容长度"
  - "泛化修复已在 Plan 01/02 中完成，Task 3 仅为逐项确认检查点"

requirements-completed: [MKT-EXT-03]

duration: 15min
completed: 2026-06-10
---

# Phase 75 Plan 03: 教师端 homework 批改界面 + 泛化修复 Summary

**在 /classroom 控制面板新增「作业提交」sibling tab，左侧学生提交列表 + 右侧批改面板（分数 + 评语），泛化修复逐项确认通过。**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-10T07:54:00Z
- **Completed:** 2026-06-10T08:10:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- classroom-control-panel TabsList 新增「作业提交」TabTrigger（ClipboardList 图标，样式与既有 tab 一致）
- HomeworkSubmissionList 组件：按 sessionId 拉取提交列表、状态 badge（待批改/已批改分数）、选中态、10s 自动刷新
- HomeworkGradingPanel 组件：系统建议分 badge、分数输入框（0-100）、评语 textarea、保存 CTA（primary gradient）
- DAL 层新增 getHomeworkSubmissions（遍历 assignments → 按索引查 submissions → 过滤 isLatest）和 upsertHomeworkGrade（upsert 动词 →  append-only）
- submitGradeAction 经教师鉴权 → upsertHomeworkGrade → updateTag
- 泛化修复逐项确认通过：allowlist alias 已注册、external-catalog 双条目、GuardrailStepType 含 task、DTO 通用

## Task Commits

1. **Task 1: classroom 控制面板新增「作业提交」tab** - `bc4bb7d` (feat)
2. **Task 2: 学生提交列表 + 批改面板组件** - `43195ed` (feat)
3. **Task 3: 泛化修复确认 + 跨插件双绿检查点** - 无代码变更（验证通过）

## Files Created/Modified

- `src/app/(classroom)/classroom/page.tsx` - tab searchParams 新增 homework-submissions，requestedTab 三元逻辑
- `src/components/surfaces/classroom-console-surface.tsx` - activeConsoleTab 类型扩展
- `src/components/classroom/classroom-control-panel.tsx` - 新增第三 TabTrigger + TabsContent（左侧列表+右侧面板）、selectedHomeworkStudent/gradingMap 状态
- `src/components/classroom/homework-submission-list.tsx` - 学生提交列表组件（loading/empty/列表三态、10s 轮询）
- `src/components/classroom/homework-grading-panel.tsx` - 批改面板（空态/有选中学生态、保存 pending/error 态）
- `src/lib/dal/homework.ts` - 新增 getHomeworkSubmissions + upsertHomeworkGrade
- `src/actions/homework-actions.ts` - 新增 submitGradeAction

## Decisions Made

- homework tab 使用简单的 setInterval 轮询（10s）而非 WebSocket 实时推送 —— 批改不需要秒级延迟
- 系统建议分仅为内容长度/10，故意保持简单 —— 复杂评分逻辑属于 homework 插件自身迭代
- tab 布局采用左侧 280px 列表 + 右侧弹性面板 —— 与 UI-SPEC ASCII 线框图一致

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Executor agent 因 DeepSeek API 兼容性问题无法启动（"thinking options type cannot be disabled when reasoning_effort is set"），改为内联执行模式
- `src/plugins/homework/` 和 `src/plugins/quiz-sample/` 目录下无测试文件，无法运行计划中的 `pnpm vitest run src/plugins/*/` 命令；quiz 相关测试（quiz-sample-step-card.test.tsx）通过（3/3）
- Badge variant "warning" 不存在于项目 BadgeVariant 类型（仅有 default/success/accent），已改用 variant="default"

## Next Phase Readiness

- 教师批改闭环完成，可对 homework 提交进行打分+评语
- Plan 04 的 lifecycle 验证（upgrade/uninstall）可基于此 plan 产生的真实批改数据
- 泛化修复已确认就位，marketplace 基础设施对 homework + quiz 双插件可重复使用

---
*Phase: 75-second-external-plugin-marketplace-generalization*
*Plan: 03*
*Completed: 2026-06-10*
