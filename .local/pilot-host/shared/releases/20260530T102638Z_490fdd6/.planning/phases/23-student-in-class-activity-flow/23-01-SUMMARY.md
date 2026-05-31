---
phase: 23-student-in-class-activity-flow
plan: 01
subsystem: ui
tags: [student-player, learning, classroom-runtime, dto, vitest]
requires:
  - phase: 21-teaching-design-contracts-and-evidence-foundation
    provides: teachingDesign 与 evidenceExpectation 服务端合同
  - phase: 22-teacher-orchestration-workspace-and-launch-preparation
    provides: 课堂准备文案真相源与运行时姿态
provides:
  - 学生播放器服务端 activity guidance contract
  - 当前步骤统一课堂活动壳
  - task/quiz 历史降级后的课堂化主舞台
affects: [ACT-02, student-player, classroom-runtime]
tech-stack:
  added: []
  patterns: [server-derived activity guidance, unified classroom activity shell, shell-personal split preserved]
key-files:
  created: [.planning/phases/23-student-in-class-activity-flow/23-01-SUMMARY.md]
  modified:
    - src/lib/dto/learning.ts
    - src/lib/dal/learning.ts
    - src/lib/dal/learning.test.ts
    - src/components/learning/classroom-runtime-client.tsx
    - src/components/learning/task-step-card.tsx
    - src/components/learning/quiz-step-card.tsx
    - src/components/learning/student-step-cards.test.ts
    - src/components/surfaces/student-player-surfaces.test.ts
key-decisions:
  - "学生端 activity 文案全部由服务端从 teachingDesign、progress 与 latest attempt 派生，客户端不再猜测。"
  - "当前步骤统一先过一个课堂活动壳，再落到 content/task/quiz 各自动作区，避免多套顶层叙事竞争。"
  - "老师推荐步骤 CTA 保持次级动作，不与当前步骤主提交动作并列抢焦点。"
patterns-established:
  - "Pattern: StudentPlayerPersonalDTO 通过 stepActivities 暴露课堂化 guidance contract。"
  - "Pattern: 任务与测验卡只承载 step-specific action area，latest/history 通过主次层级区分。"
requirements-completed: [ACT-01]
duration: 9 min
completed: 2026-05-13
---

# Phase 23 Plan 01: Student activity guidance and shell summary

**学生播放器现在通过服务端派生的 activity guidance contract 和统一课堂活动壳明确展示当前该做什么、交什么、何时算完成。**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-13T11:27:36Z
- **Completed:** 2026-05-13T11:36:28Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 为学生播放器 personal DTO 增加 `stepActivities`，服务端统一生成活动提示、产出要求、提交说明、完成状态、活动方式和时长文案。
- 将当前步骤渲染收口为单一课堂活动壳，先展示 guidance blocks，再进入 content/task/quiz 的具体动作区。
- 保持 task/quiz append-only latest/history 语义不变，同时把历史记录降级为次级 tonal 层。

## Task Commits

Each task was committed atomically:

1. **Task 1: Add a server-owned student activity guidance contract to player DTOs** - `0781a0a`, `46f30fd` (test/feat)
2. **Task 2: Render the current step through one unified classroom activity shell** - `6298391`, `281750e` (test/feat)

## Files Created/Modified

- `src/lib/dto/learning.ts` - 定义 `StudentStepActivityDTOSchema` 与 `stepActivities` player contract
- `src/lib/dal/learning.ts` - 服务端翻译 `teachingDesign`、progress、latest attempt 为学生课堂 guidance
- `src/lib/dal/learning.test.ts` - 校验 DTO contract、中文 guidance 映射与 shell/personal split
- `src/components/learning/classroom-runtime-client.tsx` - 当前步骤统一课堂活动壳与推荐 CTA 层级
- `src/components/learning/task-step-card.tsx` - 收口为动作区，突出最新一次并将历史降级
- `src/components/learning/quiz-step-card.tsx` - 收口为动作区，突出最新一次并将历史降级
- `src/components/learning/student-step-cards.test.ts` - 增加活动壳与历史层级回归
- `src/components/surfaces/student-player-surfaces.test.ts` - 保持 player personal wiring 回归

## Decisions Made

- 使用 `stepActivities` 挂在 `StudentPlayerPersonalDTO` 上，而不是改动 cached shell，保持 `shell -> Suspense -> personal state` 边界不变。
- `teacher-only` evidence metadata 统一翻译为自然语言提交提示或“无需单独提交”，避免把内部字段或教师术语暴露给学生。
- content/task/quiz 继续沿用现有提交与进度写入边界，只调整主舞台叙事和层级，不新增平行 runtime 协议。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Task 1 RED 阶段测试最初还未命中新 contract，实现后通过。
- Task 2 RED 阶段测试暴露当前步骤仍缺统一活动壳与 latest/history 文案分层，实现后通过。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ACT-01 已具备稳定的服务端 guidance contract，后续可以在此基础上继续接入 durable quick response。
- 运行时主舞台、task/quiz 提交语义、推荐/锁定行为与 Suspense 边界均保持兼容，可继续推进 23-02。

## Self-Check: PASSED
