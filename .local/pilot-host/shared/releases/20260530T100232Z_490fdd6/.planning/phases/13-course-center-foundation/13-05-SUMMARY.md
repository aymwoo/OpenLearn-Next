---
phase: 13-course-center-foundation
plan: 05
subsystem: ui
tags: [courses, create-flow, school-scope, vitest, dto, teacher-workflow]

# Dependency graph
requires:
  - phase: 13-course-center-foundation
    provides: teacher-owned course reads and server-driven school scope metadata
provides:
  - dto-driven course create drawer without hardcoded schoolId fallback
  - single-school and multi-school teacher create flow coverage
  - empty-scope guardrail for course creation entry
affects: [phase-14, course-lifecycle, teacher-course-center]

# Tech tracking
tech-stack:
  added: []
  patterns: [dto-driven school scope selection, surface-level create flow regression tests, client guard for unavailable teacher school scope]

key-files:
  created:
    - src/components/surfaces/teacher-course-center-surface.test.tsx
  modified:
    - src/components/courses/course-create-drawer.tsx
    - src/components/surfaces/teacher-course-center-surface.tsx

key-decisions:
  - "建课抽屉只消费服务端 DTO 提供的 defaultSchoolId 与 availableSchools，不再保留任何 school-1 客户端默认值。"
  - "多学校教师在抽屉内显式选择学校，单学校教师显示只读学校摘要，无学校 scope 时直接禁用创建。"

patterns-established:
  - "Pattern 1: create drawer 的受控 school scope 状态由 DTO 初始化，并在 submit 时作为唯一 schoolId 来源。"
  - "Pattern 2: 课程中心 surface 必须显式向建课抽屉透传 defaultSchoolId 与 availableSchools。"

requirements-completed: [COURSE-02]

# Metrics
duration: 3 min
completed: 2026-05-09
---

# Phase 13 Plan 05: Course create scope gap closure summary

**课程创建抽屉现在完全跟随教师真实 school scope：单学校教师使用服务端默认学校，多学校教师可切换目标学校，且不再硬编码 `school-1`。**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-09T13:21:41Z
- **Completed:** 2026-05-09T13:25:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 为课程中心建课流程补上 surface-level 回归测试，覆盖 `school-9` 单学校场景与 `school-2` 多学校切换场景。
- 将 `CourseCreateDrawer` 改为消费 `defaultSchoolId` 与 `availableSchools`，提交 payload 时只发送当前受控选择的真实 `schoolId`。
- 为无可用学校的教师身份增加禁用与错误提示，避免错误 scope 继续进入 create action。

## Task Commits

Each task was committed atomically:

1. **Task 1: 为课程中心建课流程写集成回归测试** - `b3ab637` (test)
2. **Task 2: 将建课抽屉改为消费真实 teacher school scope** - `cf1b3e1` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/components/surfaces/teacher-course-center-surface.test.tsx` - 新增课程中心建课流程回归测试。
- `src/components/courses/course-create-drawer.tsx` - 删除硬编码学校默认值，新增学校选择/只读摘要/无 scope 阻断逻辑。
- `src/components/surfaces/teacher-course-center-surface.tsx` - 两处建课抽屉调用显式透传 `defaultSchoolId` 与 `availableSchools`。

## Decisions Made

- 建课 school scope 只能来自服务端 DTO，客户端不再猜测或回退到固定学校常量。
- 无学校 scope 不继续放行 create 提交，而是在抽屉内直接给出阻断提示，保持 teacher scope contract 清晰。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 测试初版因页面内存在多个“新建课程”按钮而命中歧义查询；通过在测试中显式选取首个触发按钮并在 `beforeEach` 中执行 `cleanup()` 解决。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 13 的 create flow school scope gap 已关闭，课程中心可作为后续生命周期与关联管理的稳定入口。
- Phase 14 可以直接基于当前 DTO-driven create contract 继续扩展 publish/archive/association 流程。
- 无阻塞项。

## Self-Check: PASSED

- Found `src/components/courses/course-create-drawer.tsx`
- Found `src/components/surfaces/teacher-course-center-surface.tsx`
- Found `src/components/surfaces/teacher-course-center-surface.test.tsx`
- Found commits `b3ab637`, `cf1b3e1`
