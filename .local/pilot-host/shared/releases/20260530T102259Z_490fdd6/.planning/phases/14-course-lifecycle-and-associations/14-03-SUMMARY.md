---
phase: 14-course-lifecycle-and-associations
plan: 03
subsystem: courses
tags: [courses, delete-guardrail, dal, server-actions, vitest, nextjs]

# Dependency graph
requires:
  - phase: 13-course-center-foundation
    provides: teacher-scoped course detail workflow and course-aware lessons entry contract
  - phase: 14-course-lifecycle-and-associations
    provides: lifecycle-aware course detail form and state-safe adjacent flows
provides:
  - teacher-scoped course delete eligibility contract
  - explicit delete confirmation action with structured blocked reasons
  - in-page guarded delete feedback on the course detail form
affects: [phase-14 plan-02, teacher course detail workflow]

# Tech tracking
tech-stack:
  added: []
  patterns: [structured blocked delete action result, in-page destructive confirmation]

key-files:
  created:
    - .planning/phases/14-course-lifecycle-and-associations/14-03-SUMMARY.md
  modified:
    - src/lib/dto/course-authoring.ts
    - src/lib/dal/course-authoring.ts
    - src/lib/dal/course-authoring.test.ts
    - src/actions/course-authoring-actions.ts
    - src/actions/course-authoring-actions.test.ts
    - src/components/courses/course-detail-form.tsx
    - src/components/courses/course-detail-form.test.tsx
    - src/components/surfaces/teacher-course-detail-surface.tsx

key-decisions:
  - "课程删除 eligibility 直接并入 `TeacherCourseDetailDTO`，避免客户端自行推断是否可删。"
  - "删除 guardrail 以 lessons、class associations、course enrollments 为当前阻断维度。"
  - "删除必须输入完整课程名称确认；blocked feedback 保留在当前详情页内，不依赖 toast。"

patterns-established:
  - "Pattern 1: destructive course mutations 通过结构化 `DELETE_BLOCKED` action contract 返回 reasons，而不是只返通用 message。"
  - "Pattern 2: 详情页 destructive action 与普通保存分离，成功后跳回列表，失败时保留当前上下文。"

requirements-completed: [COURSE-05]

# Metrics
duration: 35min
completed: 2026-05-15
---

# Phase 14 Plan 03: Course delete guardrail summary

**教师现在只能在满足删除条件时删除课程，并且必须输入完整课程名称确认；若课程仍有课时、班级关联或课程成员记录，详情页会直接显示阻断原因。**

## Performance

- **Duration:** 35 min
- **Completed:** 2026-05-15
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 为课程详情 DTO 增加 `deleteEligibility`，把删除资格和结构化 blocked reasons 一起下发到详情页。
- 在 DAL 中实现 `deleteCourseForTeacherScoped()`，要求 teacher-owned scope、完整标题确认，以及 lessons / class associations / enrollments 三类阻断守卫。
- 在 action 层实现 `deleteCourseAction()`，对 `COURSE_DELETE_BLOCKED` 映射为结构化 `DELETE_BLOCKED` 结果，并在成功后失效课程列表与详情 tag。
- 在课程详情页内实现显式确认删除交互，删除成功跳回 `/teacher/courses`，删除被阻止时在页内显示阻断项。
- 补齐 focused tests，覆盖 delete validation、blocked contract、成功删除与 UI 确认链路。

## Task commits

当前未创建 commit；本轮变更仍在工作树中，待用户决定是否提交。

## Files created or modified

- `src/lib/dto/course-authoring.ts` - 新增课程删除输入、blocked reason 与 delete eligibility contract。
- `src/lib/dal/course-authoring.ts` - 新增 delete eligibility 计算与 `deleteCourseForTeacherScoped()`。
- `src/lib/dal/course-authoring.test.ts` - 覆盖删除资格 reasons 与成功删除路径。
- `src/actions/course-authoring-actions.ts` - 新增 `deleteCourseAction()` 及 `DELETE_BLOCKED` / confirmation mismatch 映射。
- `src/actions/course-authoring-actions.test.ts` - 覆盖 delete validation、blocked result 和 tag invalidation。
- `src/components/courses/course-detail-form.tsx` - 新增危险操作区、完整课程名确认输入与页内 blocked feedback。
- `src/components/courses/course-detail-form.test.tsx` - 覆盖删除确认、blocked feedback 与成功跳转。
- `src/components/surfaces/teacher-course-detail-surface.tsx` - 接入 delete action 到现有详情页工作流。

## Decisions made

- 课程删除 guardrail 当前只检查课程实体本身已有的课时、班级关联与课程成员记录，不扩展到 enrollment reassignment 或 class association management flow。
- 删除与归档保持两条明确路径：归档用于保留课程，删除用于永久移除课程实体。
- 删除成功后直接回到课程列表，而不是留在已删除对象的详情页上刷新。

## Verification

- `./node_modules/.bin/vitest run src/components/courses/course-detail-form.test.tsx src/actions/course-authoring-actions.test.ts src/lib/dal/course-authoring.test.ts`
- `./node_modules/.bin/next build`

## User setup required

None.

## Next phase readiness

- `COURSE-05` 已完成，Phase 14 仅剩 `14-02 / COURSE-06` 班级关联管理待实现。
- 课程详情页现在已经同时具备 lifecycle controls 与 delete guardrail，后续班级关联可以继续沿同一详情页工作流扩展。

---
*Phase: 14-course-lifecycle-and-associations*
*Completed: 2026-05-15*
