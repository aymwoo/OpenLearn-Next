---
phase: 23-student-in-class-activity-flow
plan: 02
subsystem: ui
tags: [quick-response, classroom-evidence, server-action, dal, student-player]
requires:
  - phase: 21-teaching-design-contracts-and-evidence-foundation
    provides: classroomEvidence 与 classroomTimeline 的 durable append-only 基础
  - phase: 23-student-in-class-activity-flow
    provides: 23-01 已建立的 activity shell 与 player personal DTO contract
provides:
  - durable quick-response classroom evidence contract
  - player personal DTO 中独立的 latest/history quick-response read model
  - 学生端 lightweight quick-response runtime card
affects: [ACT-02, student-player, classroom-runtime, classroom-evidence]
tech-stack:
  added: []
  patterns: [classroomEvidence append-only quick response, dedicated server action plus DAL write path, runtime quick-response card]
key-files:
  created:
    - .planning/phases/23-student-in-class-activity-flow/23-02-SUMMARY.md
    - src/components/learning/quick-response-step-card.tsx
  modified:
    - src/lib/dto/classroom.ts
    - src/lib/dto/learning.ts
    - src/lib/dal/classroom.ts
    - src/lib/dal/learning.ts
    - src/actions/classroom-actions.ts
    - src/actions/classroom-actions.test.ts
    - src/lib/dal/learning.test.ts
    - src/components/learning/classroom-runtime-client.tsx
    - src/components/learning/student-step-cards.test.ts
    - src/components/surfaces/student-player-surfaces.test.ts
key-decisions:
  - "quick-response 继续走 classroomEvidence append-only 写链路，不与 task/quiz attempts 真相源混用。"
  - "player personal DTO 单独暴露 latestQuickResponse 与 quickResponseHistory，保持 session + step + student 作用域。"
  - "quick-response UI 仅在 content 步骤声明 student-quick-response evidence path 时启用，task/quiz 卡保持原路径不变。"
patterns-established:
  - "Pattern: 学生课堂快回应使用 StudentQuickResponseInputSchema -> submitStudentQuickResponseAction -> recordStudentQuickResponse。"
  - "Pattern: quick-response latest/history 通过 StudentPlayerPersonalDTO 独立返回，不混入 latestSubmissions/history tasks/quizzes。"
requirements-completed: [ACT-02]
duration: 10 min
completed: 2026-05-13
---

# Phase 23 Plan 02: Durable quick-response evidence capture summary

**学生端现在可以在课堂中提交轻量 quick response，并通过 classroomEvidence append-only 链路持久化后回流为 latest/history 课堂记录。**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-13T21:56:39+08:00
- **Completed:** 2026-05-13T14:07:16Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- 新增 typed quick-response input/result contract，并通过 dedicated Server Action + DAL helper 持久化到 `classroomEvidence` / `classroomTimeline`。
- 在 `StudentPlayerPersonalDTO` 中新增 latest/history quick-response read model，按 `sessionId + stepId + studentId` 独立读取课堂回应历史。
- 为学生 runtime 增加轻量 quick-response card，展示 durability 文案、最新回应和 `第 N 次回应` 历史，同时保留 task/quiz 原有渲染路径。

## Task Commits

Each task was committed atomically:

1. **Task 1: Define a typed quick-response read/write contract on top of classroom evidence** - `90368b6`, `df026dd` (test/feat)
2. **Task 2: Add the lightweight quick-response card to the student runtime** - `4862f11`, `4aae633` (test/feat)

## Files Created/Modified

- `src/lib/dto/classroom.ts` - 新增 `StudentQuickResponseInputSchema`，固化 `student-quick-response` / `response` 语义
- `src/lib/dto/learning.ts` - 新增 quick-response attempt DTO 与 player personal latest/history 字段
- `src/lib/dal/classroom.ts` - 新增 `recordStudentQuickResponse()`，复用 durable classroom evidence 写链路
- `src/lib/dal/learning.ts` - 新增 session-scoped quick-response latest/history 读取与 `evidenceCapturePath`
- `src/actions/classroom-actions.ts` - 新增 `submitStudentQuickResponseAction()` 并显式失效 classroom/progress/submission cache tags
- `src/actions/classroom-actions.test.ts` - 覆盖 quick-response action wiring
- `src/lib/dal/learning.test.ts` - 覆盖 quick-response DTO contract 与 evidence read path
- `src/components/learning/quick-response-step-card.tsx` - 轻量课堂回应输入卡、最新回应与历史展示
- `src/components/learning/classroom-runtime-client.tsx` - 依据 `student-quick-response` evidence path 选择 quick-response card
- `src/components/learning/student-step-cards.test.ts` - 回归 quick-response 文案与 runtime routing
- `src/components/surfaces/student-player-surfaces.test.ts` - 回归 quick-response 仍处于同一 classroom runtime shell

## Decisions Made

- quick-response 输入 contract 不再暴露通用 `RecordClassroomEvidenceInputSchema` 给 runtime client，而是收敛到固定 `sessionId/lessonId/stepId/body` 边界。
- quick-response latest/history 保持在 player personal state 中单独建模，避免把 classroom-session evidence 与 lesson-wide task/quiz attempts 混为同一真相源。
- 轻量 quick-response UI 仅作为 content-step 的 evidence capture 分支接入，保证 task/quiz flow 原有提交卡与重试逻辑不被替换。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Task 1 RED 阶段测试暴露出 quick-response contract、独立 DTO 与 evidence read path 尚未落地，实现后全部通过。
- Task 2 RED 阶段测试暴露缺失 quick-response card 文件与 runtime routing，补齐组件与 wiring 后回归恢复通过。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ACT-02 已完成，后续 23-03 可直接在现有 quick-response write/read contract 之上补强验证与兼容性守卫。
- player 仍保持 cached shell + Suspense personal state、task/quiz flow 与 classroom cache invalidation 边界，可继续推进后续 runtime 回归加固。

## Self-Check: PASSED

- FOUND: `.planning/phases/23-student-in-class-activity-flow/23-02-SUMMARY.md`
- FOUND: `src/components/learning/quick-response-step-card.tsx`
- FOUND commit: `90368b6`
- FOUND commit: `df026dd`
- FOUND commit: `4862f11`
- FOUND commit: `4aae633`
