---
phase: 14-course-lifecycle-and-associations
plan: 02
subsystem: courses
tags: [courses, class-association, dal, server-actions, vitest, nextjs]

# Dependency graph
requires:
  - phase: 13-course-center-foundation
    provides: teacher-scoped course detail workflow and course-aware lessons entry contract
  - phase: 14-course-lifecycle-and-associations
    provides: lifecycle-aware course detail workflow and guarded destructive actions
provides:
  - teacher school-scoped course-class association add/remove contract
  - in-page class association management inside the course detail form
  - available-class read model that stays separate from student enrollment management
affects: [phase-15, teacher course detail workflow]

# Tech tracking
tech-stack:
  added: []
  patterns: [school-scoped course-class mutation, detail-page class association management]

key-files:
  created:
    - .planning/phases/14-course-lifecycle-and-associations/14-02-SUMMARY.md
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
  - "课程详情 DTO 直接下发 `availableClasses`，避免客户端自行拼接可关联班级列表。"
  - "课程-班级关联 add/remove 继续复用 teacher-owned course scope 与 school-scoped class guard，不引入独立 association 子系统。"
  - "班级关联只改变 `courseClasses` link，不触及 `courseEnrollments` 或学生 enrollment 管理。"

patterns-established:
  - "Pattern 1: 课程详情页内的班级 add/remove 继续复用 `TeacherCourseDetailDTO` 作为 mutation 返回体，保持 read-your-writes 一致。"
  - "Pattern 2: course-class mutation 成功后统一失效 teacherCourses/course tags，并把成功/失败证据保留在当前页。"

requirements-completed: [COURSE-06]

# Metrics
duration: 30min
completed: 2026-05-15
---

# Phase 14 Plan 02: Course-class association summary

**教师现在可以在课程详情页内按 school scope 为课程添加或移除班级，且该流程只管理 `courseClasses` 关联，不触及 student enrollment。**

## Performance

- **Duration:** 30 min
- **Completed:** 2026-05-15
- **Tasks:** 2
- **Files modified:** 8
- **Files created:** 1

## Accomplishments

- 为 `TeacherCourseDetailDTO` 增加 `availableClasses`，由服务端直接提供当前课程仍可关联的本校班级列表。
- 在 `course-authoring` DAL 中实现 `addCourseClassAssociationForTeacherScoped()` 与 `removeCourseClassAssociationForTeacherScoped()`，复用 teacher-owned course scope 与 school-scoped class guard。
- 在 action 层新增 `addCourseClassAssociationAction()` 与 `removeCourseClassAssociationAction()`，成功后继续失效课程列表与详情 tag，并把 `CLASS_NOT_FOUND` 映射为清晰页内反馈。
- 在课程详情页 `CourseDetailForm` 内加入班级关联管理区，支持添加本校未关联班级、移除已关联班级，以及在当前页显示 read-your-writes 结果。
- 补齐 focused tests，覆盖 DTO read model、DAL add/remove、action error mapping 和详情页交互链路。

## Task commits

当前未创建 commit；本轮变更仍在工作树中，待用户决定是否提交。

## Files created or modified

- `src/lib/dto/course-authoring.ts` - 新增课程-班级关联输入 contract 与 `availableClasses` DTO 字段。
- `src/lib/dal/course-authoring.ts` - 新增 teacher school-scoped 的课程-班级关联 add/remove，并在详情 DTO 中输出可关联班级列表。
- `src/lib/dal/course-authoring.test.ts` - 覆盖可关联班级列表、关联新增/移除和跨 school 拒绝路径。
- `src/actions/course-authoring-actions.ts` - 新增班级关联 add/remove server actions，并补 `CLASS_NOT_FOUND` 错误映射。
- `src/actions/course-authoring-actions.test.ts` - 覆盖班级关联 action 成功路径、tag 失效与错误映射。
- `src/components/courses/course-detail-form.tsx` - 新增班级关联管理区，并将成功反馈保留在课程详情页内。
- `src/components/courses/course-detail-form.test.tsx` - 覆盖详情页内添加/移除班级关联的交互回归。
- `src/components/surfaces/teacher-course-detail-surface.tsx` - 接入新增班级关联 actions，并更新右侧课程关联说明文案。

## Decisions made

- 班级关联继续内嵌在课程详情工作流内，不新增独立页面或平行 association 管理壳层。
- 课程详情页只暴露班级关联 add/remove，不把学生 enrollment 管理提前混入 `COURSE-06`。
- 成功提示使用当前选择的班级名，而不是依赖返回列表顺序，避免 UI 反馈与真实操作对象错位。

## Verification

- `./node_modules/.bin/vitest --run src/lib/dal/course-authoring.test.ts src/actions/course-authoring-actions.test.ts src/components/courses/course-detail-form.test.tsx`
- `./node_modules/.bin/next build`

## User setup required

None.

## Next phase readiness

- `COURSE-06` 已完成，Phase 14 的 `COURSE-04`~`COURSE-06` 短 scope 现已全部收口。
- 后续如继续推进课程域 backlog，下一步应单独评估 `COURSE-07` enrollment management 或转向 Phase 15 的批量导入范围。

---
*Phase: 14-course-lifecycle-and-associations*
*Completed: 2026-05-15*
