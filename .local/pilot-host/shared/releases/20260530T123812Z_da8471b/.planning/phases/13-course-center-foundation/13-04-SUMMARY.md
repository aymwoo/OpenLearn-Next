---
phase: 13-course-center-foundation
plan: 04
subsystem: auth
tags: [courses, dal, dto, vitest, authorization, school-scope]

# Dependency graph
requires:
  - phase: 13-course-center-foundation
    provides: course center read model, course detail and lessons entry routes, course create flow shell
provides:
  - teacher-owned course reads for course center, detail, and lessons entry
  - server-driven school scope metadata for course creation flows
  - regressions preventing same-school foreign course leakage
affects: [phase-13 plan-05, course-create-drawer, teacher authorization]

# Tech tracking
tech-stack:
  added: []
  patterns: [teacher-owned DAL filtering, server-driven school scope DTO metadata, TDD regressions for authorization boundaries]

key-files:
  created: []
  modified:
    - src/lib/dal/course-authoring.ts
    - src/lib/dal/course-authoring.test.ts
    - src/lib/dto/course-authoring.ts

key-decisions:
  - "课程中心所有 teacher read path 必须同时校验 school scope 与 ownerId，same-school foreign course 一律按 COURSE_NOT_FOUND 处理。"
  - "课程中心 DTO 由服务端返回 defaultSchoolId 与 availableSchools，建课 UI 不再自行硬编码 school scope。"

patterns-established:
  - "Pattern 1: teacher-scoped course reads 先取 scoped owned rows，再派生 detail 与 lessons entry DTO。"
  - "Pattern 2: create flow 的 school scope 元数据由 DAL 查询 schools 表后注入 TeacherCourseCenterDTO。"

requirements-completed: [COURSE-01, COURSE-02]

# Metrics
duration: 2 min
completed: 2026-05-09
---

# Phase 13 Plan 04: Teacher-owned scope gap closure summary

**课程中心现在按教师本人 ownership 收紧读取边界，并由服务端 DTO 输出真实 defaultSchoolId 与 availableSchools 供建课流程复用。**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-09T13:12:30Z
- **Completed:** 2026-05-09T13:14:28Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 用 TDD 回归测试锁定同校他人课程不可出现在课程中心、详情页和 lessons entry。
- 将 `getScopedCourses()` 收紧为同时校验 `schoolId` 与 `ownerId`，关闭 same-school foreign course 泄露缺陷。
- 为 `TeacherCourseCenterDTO` 增加 `defaultSchoolId` 与 `availableSchools`，让后续建课 UI 可以直接消费真实 teacher school scope。

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: 修正课程中心/详情/课时入口的 teacher-owned 读取边界** - `4aa9677` (test)
2. **Task 1 GREEN: 修正课程中心/详情/课时入口的 teacher-owned 读取边界** - `a12337a` (feat)
3. **Task 2 RED: 为建课流程补齐真实 school scope DTO contract** - `dbc513a` (test)
4. **Task 2 GREEN: 为建课流程补齐真实 school scope DTO contract** - `3a7d5b5` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/lib/dal/course-authoring.ts` - 将 teacher read path 收紧到 owned rows，并查询 scoped schools 生成 `availableSchools`。
- `src/lib/dal/course-authoring.test.ts` - 新增 same-school foreign course 越权回归和单/多学校 DTO contract 测试。
- `src/lib/dto/course-authoring.ts` - 扩展 `TeacherCourseCenterDTOSchema`，新增 `TeacherCourseScopeSchoolDTOSchema`、`defaultSchoolId` 和 `availableSchools`。

## Decisions Made

- same-school 但 `ownerId !== actorId` 的课程不再被视为可读资源，详情与 lessons entry 统一返回 `COURSE_NOT_FOUND`，避免向 UI 泄露存在性。
- school scope 元数据统一由服务端 DAL 查询 `schools` 表生成，客户端只消费 DTO，不再猜测或写死 `school-1`。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 13-05 可以直接复用 `defaultSchoolId` 与 `availableSchools` 修复建课抽屉的真实 school scope 输入。
- 课程中心 teacher-owned 读取边界已有回归保护，后续 UI 调整不会再把 school-only 可见性误当成 teacher-scoped contract。
- 无阻塞项。

## Self-Check: PASSED

- Found `src/lib/dal/course-authoring.ts`
- Found `src/lib/dal/course-authoring.test.ts`
- Found `src/lib/dto/course-authoring.ts`
- Found commits `4aa9677`, `a12337a`, `dbc513a`, `3a7d5b5`
