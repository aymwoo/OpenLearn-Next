---
phase: 75-second-external-plugin-marketplace-generalization
plan: 02
subsystem: homework
tags: [homework, dal, server-actions, dispatchPluginDataAccess, classroom, authoring, student-runtime]

requires:
  - phase: 75-01
    provides: homework data-model + compile chain + catalog registration
provides:
  - homework DAL 层：insertHomeworkAssignment / getHomeworkAssignments / submitHomework / getLatestSubmission / getHomeworkGrades
  - homework Server Actions：createHomeworkAssignmentAction（教师鉴权）+ submitHomeworkAction（学生鉴权）
  - lesson-step-editor.tsx 新增 homework 步骤编辑区（复用 task type + builtInKey='homework'）
  - HomeworkAssignmentCard 学生端作业卡片（5 状态提交流程）
  - classroom-runtime-client 对 homework 步骤渲染 HomeworkAssignmentCard
affects: [75-03, homework-grading]

tech-stack:
  added: []
  patterns:
    - "dispatchPluginDataAccess facade 五动词 DAL 模式：insert/upsert(getByIndex/count/aggregate)"
    - "append-only/isLatest 提交通过 upsert 动词的 Command Bus 事务完成"

key-files:
  created:
    - src/lib/dal/homework.ts
    - src/actions/homework-actions.ts
    - src/components/learning/homework-assignment-card.tsx
  modified:
    - src/lib/cache-policy.ts
    - src/components/authoring/lesson-step-editor.tsx
    - src/components/learning/classroom-runtime-client.tsx

key-decisions:
  - "homework 步骤复用 task type + builtInKey='homework'，避免扩展 GuardrailStepType"
  - "submitHomework 走 upsert 动词，Command Bus 自动处理 UPDATE isLatest=false → INSERT isLatest=true 的 append-only 事务"
  - "homework 编辑字段（标题/描述/附件）映射到现有 task 负载字段：prompt=描述、materialRefs=附件"

requirements-completed: [MKT-EXT-03]

duration: 15min
completed: 2026-06-10
---

# Phase 75 Plan 02: Homework Authoring + Student Runtime 层 Summary

**通过 dispatchPluginDataAccess facade 构建 homework DAL + Server Actions，教师 lesson-step-editor 新增作业编辑，学生 classroom player 中查看并提交作业**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-10T07:24:00Z
- **Completed:** 2026-06-10T07:39:00Z
- **Tasks:** 4
- **Files modified:** 6

## Accomplishments

- homework DAL 层全部走 dispatchPluginDataAccess facade（insert/getByIndex/upsert 五动词），Zod schema.parse() 校验 raw input
- submitHomework 走 upsert 动词，Command Bus 内置 append-only/isLatest 事务（UPDATE isLatest=false → INSERT isLatest=true）
- Server Actions 经 auth split 鉴权：createHomeworkAssignmentAction 需教师角色，submitHomeworkAction 需学生角色
- lesson-step-editor 新增 homework 编辑区（标题/描述/附件链接），保存按钮「保存作业」
- HomeworkAssignmentCard 学生端作业卡片支持 5 种状态：not_started/submitting/submitted/graded/error
- classroom-runtime-client CurrentStepRenderer 对 builtInKey='homework' 的 task 步骤渲染 HomeworkAssignmentCard
- 本地 SQLite 三表（plugin_owned_homework_assignments/submissions/grades）经 drizzle-kit push 就位

## Task Commits

1. **Task 1: homework DAL 层 + Server Actions** - `ff19a41` (feat)
2. **Task 2: lesson step editor 新增 homework 步骤类型** - `aae4e37` (feat)
3. **Task 3: 学生端 homework 步骤卡片 + classroom runtime 集成** - `5d10e5b` (feat)
4. **Task 4: Schema Push** - (drizzle-kit push, 无代码变更)

## Files Created/Modified

- `src/lib/dal/homework.ts` - homework DAL：insertHomeworkAssignment/getHomeworkAssignments/submitHomework/getLatestSubmission/getHomeworkGrades
- `src/actions/homework-actions.ts` - Server Actions：createHomeworkAssignmentAction/submitHomeworkAction + auth split
- `src/lib/cache-policy.ts` - 新增 homeworkAssignments/homeworkSubmissions cache tags
- `src/components/authoring/lesson-step-editor.tsx` - 新增 isHomeworkStep() + homework 编辑 UI
- `src/components/learning/homework-assignment-card.tsx` - 学生端作业卡片组件（5 状态 + 提交流程）
- `src/components/learning/classroom-runtime-client.tsx` - CurrentStepRenderer 新增 homework 分支

## Decisions Made

- homework 步骤复用 task type + builtInKey='homework'，不扩展 GuardrailStepType（与 quiz 的 task type 复用策略一致）
- submitHomework 走 upsert 动词，Command Bus 内置 append-only/isLatest 事务处理
- 编辑字段映射：prompt=描述、materialRefs[0]=附件，避免扩展 LessonStepPayload schema
- Server Action 使用 updateTag（非 revalidateTag）与既有 actions 保持一致

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Subagent 模型兼容性问题（"thinking options type cannot be disabled"），改为内联执行模式
- Safe Resume Gate 检测到残留的 75-02 Task 1 提交（无 SUMMARY.md），revert 后重新执行
- drizzle-kit push 补充建立本地 SQLite 三表（迁移文件虽存在但未完全应用）

## Next Phase Readiness

- homework DAL + Server Actions 就位，Plan 03 的教师批改面板可调用 submitHomework/getHomeworkGrades
- 教师可创建 homework 步骤并发布 lesson，学生可在课堂中提交作业
- 准备进入 Plan 03：教师批改界面 + 泛化修复

---
*Phase: 75-second-external-plugin-marketplace-generalization*
*Completed: 2026-06-10*
