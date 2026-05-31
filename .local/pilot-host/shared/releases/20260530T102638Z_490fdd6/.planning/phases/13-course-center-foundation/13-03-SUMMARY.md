---
phase: 13-course-center-foundation
plan: 03
subsystem: ui
tags: [courses, lessons, editor, dal, vitest, nextjs]

# Dependency graph
requires:
  - phase: 13-course-center-foundation
    provides: teacher-scoped course read model, course detail route, course create and edit flow
provides:
  - dedicated course-aware lessons entry route for each course
  - empty-state and existing-lesson handoff from course detail into editor
  - explicit query-driven editor entry without global first-lesson fallback
affects: [phase-14 course lifecycle, teacher lesson authoring flow, course-to-editor routing]

# Tech tracking
tech-stack:
  added: []
  patterns: [course-scoped lesson entry DTO, server-action draft creation handoff, explicit editor query contract]

key-files:
  created:
    - src/app/(teacher)/teacher/courses/[courseId]/lessons/page.tsx
    - src/components/surfaces/course-lessons-entry-surface.tsx
    - src/app/(teacher)/teacher/editor/page.test.ts
  modified:
    - src/lib/dto/course-authoring.ts
    - src/lib/dal/course-authoring.ts
    - src/lib/dal/course-authoring.test.ts
    - src/components/surfaces/teacher-course-detail-surface.tsx
    - src/app/(teacher)/teacher/editor/page.tsx

key-decisions:
  - "课程详情主 CTA 固定先进入 /teacher/courses/[courseId]/lessons，再由课程内上下文决定继续编辑或新建课时。"
  - "无课时状态只暴露‘新建第一个课时’动作，并在创建成功后携带 courseId 与 lessonId 重定向到 editor。"
  - "teacher editor 只接受显式 searchParams.courseId 与可选 lessonId，禁止回退到 overview 中的全局第一课时。"

patterns-established:
  - "Pattern 1: course-aware handoff 通过 course detail -> lessons entry -> editor query params 串联，而不是直接跳全局 editor。"
  - "Pattern 2: editor 缺少 courseId 时显示引导面板，缺少 lessonId 且当前课程无课时时引导返回课程内课时入口。"

requirements-completed: [COURSE-10]

# Metrics
duration: 23 min
completed: 2026-05-09
---

# Phase 13 Plan 03: Course-aware lesson handoff summary

**教师现在会先进入课程内课时入口页，再从该课程上下文中新建或继续编辑课时，且 editor 已移除全局第一课时默认回退。**

## Performance

- **Duration:** 23 min
- **Started:** 2026-05-09T12:20:42Z
- **Completed:** 2026-05-09T12:44:04Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 新增 `/teacher/courses/[courseId]/lessons` 课程内课时入口页，展示当前课程课时列表，并在空态提供 `新建第一个课时` 主 CTA。
- 课程详情页的主 CTA 已固定跳到课程内课时入口，不再把教师直接送进脱离课程语境的全局 editor。
- `teacher/editor` 入口改为显式 `courseId` / `lessonId` query contract，缺少参数时显示 course-aware guidance，且不再使用 `overview.lessons[0]`。

## Task Commits

Each task was committed atomically:

1. **Task 1: 建立课程内课时入口页与空态/已有课时态 handoff** - `92a65d0` (feat)
2. **Task 2: 移除 editor 的全局第一课时回退，改为显式 course-aware 入口** - `c467584` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/lib/dto/course-authoring.ts` - 增加课程内课时入口 DTO。
- `src/lib/dal/course-authoring.ts` - 增加 teacher-scoped lessons entry 读取，并按当前课程过滤课时与步骤摘要。
- `src/lib/dal/course-authoring.test.ts` - 锁定 D-09、D-10、D-11 的 course-aware 读取与路由 contract。
- `src/app/(teacher)/teacher/courses/[courseId]/lessons/page.tsx` - 新建课程内课时入口 route。
- `src/components/surfaces/course-lessons-entry-surface.tsx` - 渲染当前课程课时列表、空态、继续编辑与建课时 handoff。
- `src/components/surfaces/teacher-course-detail-surface.tsx` - 将主 CTA 改为进入课程内课时入口页。
- `src/app/(teacher)/teacher/editor/page.tsx` - 改为显式 searchParams 驱动的 course-aware editor entry。
- `src/app/(teacher)/teacher/editor/page.test.ts` - 断言不再存在 `overview.lessons[0]` 回退且保留 D-12 分支。

## Decisions Made

- 将课程详情到 editor 的流程拆成 course detail → lessons entry → editor 两段，确保教师先看到当前课程已有课时或空态承接。
- 用现有 `createLessonDraftAction` 在课程内入口直接创建第一条课时草稿，并用 query params 把新建结果显式带进 editor。
- editor 只在当前课程范围内查找 lesson；没有 `courseId` 时不渲染任何隐式课时，直接展示课程入口引导。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- COURSE-10 的 dedicated entry point 已完成，Phase 14 可以在此基础上继续叠加课程 lifecycle 与关联管理动作。
- 课程详情、课程内课时入口、editor 三处 route contract 已统一为 course-aware 语义。
- 无阻塞项。

## Self-Check: PASSED

- Found `src/app/(teacher)/teacher/courses/[courseId]/lessons/page.tsx`
- Found `src/components/surfaces/course-lessons-entry-surface.tsx`
- Found `src/app/(teacher)/teacher/editor/page.test.ts`
- Found commits `92a65d0`, `c467584`

---
*Phase: 13-course-center-foundation*
*Completed: 2026-05-09*
