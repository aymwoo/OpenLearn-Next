---
phase: 24-live-classroom-operations-and-formative-evaluation
plan: 03
subsystem: classroom-runtime
tags: [classroom, detail-panel, formative-evaluation, evidence, vitest]
requires:
  - phase: 24-01
    provides: live classroom monitoring roster surface and session-scoped snapshot summary
  - phase: 24-02
    provides: fixed formative evaluation write/read contracts and teacher-only evaluation form
provides:
  - same-route `/classroom` student detail read contract driven by `studentId` and `detailTab`
  - unified evidence and evaluation detail DTO for one student inside the active session
  - roster-to-detail panel workflow that keeps teachers inside the classroom runtime layout
affects: [24-04, classroom-runtime, teacher-review, formative-evaluation]
tech-stack:
  added: []
  patterns:
    - same-route student detail state via `/classroom` search params instead of a competing review route
    - single student detail DTO that splits `kind=formative-evaluation` history from other classroom evidence
key-files:
  created:
    - src/components/classroom/classroom-student-detail-panel.tsx
    - src/components/classroom/classroom-student-detail-panel.test.tsx
  modified:
    - src/app/(classroom)/classroom/page.tsx
    - src/components/classroom/classroom-control-panel.tsx
    - src/components/classroom/classroom-roster-panel.tsx
    - src/components/surfaces/classroom-console-surface.tsx
    - src/lib/dal/classroom.test.ts
    - src/lib/dal/classroom.ts
    - src/lib/dto/classroom.ts
key-decisions:
  - "`/classroom` 通过 `studentId + detailTab` 维持单学生详情状态，不新增第二条 review 主路径。"
  - "单学生 detail DTO 在 classroom DAL 内直接拆分 evidence 与 `kind=formative-evaluation` 历史，不依赖 learning/review DAL。"
  - "学生详情面板作为 classroom 控制台右侧 tonal detail panel 渲染，并在同一面板内承载课堂证据与过程评价。"
patterns-established:
  - "Same-route detail workflow: roster button -> query params -> server read model -> control panel side detail"
  - "Student detail aggregation: one session-scoped evidence query, then by-payload split into evidenceEntries and evaluationEntries"
requirements-completed: [ACT-03, EVAL-01, EVAL-02]
duration: 6 min
completed: 2026-05-13
---

# Phase 24 Plan 03: Unified classroom student detail summary

**教师现在可以在 `/classroom` 名册内直接打开单学生详情面板，并在同一路由里完成课堂证据查看与过程评价记录。**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-13T16:11:18Z
- **Completed:** 2026-05-13T16:17:58Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- 为 `/classroom` 增加 `studentId` 与 `detailTab` same-route 状态，并在服务端读取单学生 detail DTO。
- 在 classroom DAL 内聚合单学生 session 证据历史，并显式拆分普通 evidence 与 formative evaluation 记录。
- 新增统一 detail panel，让教师从名册进入后直接查看 `课堂证据`、`过程评价` 与已有表单，而不跳去 `/teacher/review`。

## Task Commits

Each task was committed atomically:

1. **Task 1: Add same-route student detail read model and `/classroom` search-param entry**
   - `bb5bba8` (test)
   - `94b7011` (feat)
2. **Task 2: Build the student detail panel and wire roster rows into the unified workflow**
   - `bde8f68` (test)
   - `57e7dec` (feat)

## Files Created/Modified

- `src/app/(classroom)/classroom/page.tsx` - 接收 `studentId/detailTab` 并在同一路由加载单学生详情。
- `src/lib/dto/classroom.ts` - 新增 detail tab、detail DTO 与读取输入 schema。
- `src/lib/dal/classroom.ts` - 新增 `getClassroomStudentDetailDTO`，在 teacher-scoped session 内拆分 evidence/evaluation 历史。
- `src/lib/dal/classroom.test.ts` - 为 same-route detail contract 增加 RED/GREEN 回归覆盖。
- `src/components/surfaces/classroom-console-surface.tsx` - 向 classroom 控制台透传可选学生详情状态。
- `src/components/classroom/classroom-control-panel.tsx` - 在既有运行布局右侧渲染 detail panel。
- `src/components/classroom/classroom-roster-panel.tsx` - 为每个学生增加 `查看证据与评价` 入口按钮，设置 `studentId/detailTab` 查询参数。
- `src/components/classroom/classroom-student-detail-panel.tsx` - 新建统一 detail panel，承载 `课堂证据` 与 `过程评价` 两个标签页。
- `src/components/classroom/classroom-roster-panel.test.tsx` - 覆盖 same-route roster 入口动作。
- `src/components/classroom/classroom-student-detail-panel.test.tsx` - 覆盖 detail panel tab、历史记录与 control panel 集成。

## Decisions Made

- 继续把单学生工作流锁在 `/classroom`，只用查询参数表达详情状态，避免 Phase 24 出现双主路径竞争。
- 读取路径继续留在 classroom domain，让 evidence 与 evaluation 共用同一 session-scoped 事实源。
- detail panel 保持右侧 tonal surface，而不是新 hero 或跳转页，延续 classroom runtime 的既有视觉层级。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- RED 阶段前端测试最初因 detail panel 文件缺失与查询断言重复命中而失败，随后通过实现组件并收敛断言方式解决。

## Auth Gates

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- `24-04` 现在可以围绕 `/classroom -> 名册 -> 单学生详情面板` 主路径补齐更多验证覆盖。
- `/teacher/review` 已保持次级地位，Phase 24 的主交互面已稳定收口到 classroom runtime。

## Self-Check: PASSED

- FOUND: `.planning/phases/24-live-classroom-operations-and-formative-evaluation/24-03-SUMMARY.md`
- FOUND: `bb5bba8`
- FOUND: `94b7011`
- FOUND: `bde8f68`
- FOUND: `57e7dec`
