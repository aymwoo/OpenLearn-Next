---
phase: 14-course-lifecycle-and-associations
plan: 01
subsystem: courses
tags: [courses, lifecycle, dal, server-actions, vitest, nextjs]

# Dependency graph
requires:
  - phase: 13-course-center-foundation
    provides: teacher-scoped course center/detail and course-aware lessons entry workflow
provides:
  - publish/unpublish/archive teacher-scoped course lifecycle actions
  - archived-course guard for the lessons entry teacher flow
  - lifecycle controls inside the course detail form
affects: [phase-14 plan-02, phase-14 plan-03, teacher course workflow]

# Tech tracking
tech-stack:
  added: []
  patterns: [teacher-scoped lifecycle mutations, status-safe adjacent teacher flow guards]

key-files:
  created:
    - src/components/courses/course-detail-form.test.tsx
  modified:
    - src/lib/dto/course-authoring.ts
    - src/lib/dal/course-authoring.ts
    - src/lib/dal/course-authoring.test.ts
    - src/actions/course-authoring-actions.ts
    - src/actions/course-authoring-actions.test.ts
    - src/components/courses/course-detail-form.tsx
    - src/components/surfaces/teacher-course-detail-surface.tsx

key-decisions:
  - "课程生命周期动作继续复用 `course-authoring` action + DAL 边界，不新增 route 或并行 contract。"
  - "archived 课程详情仍可查看，但不能再进入 `/teacher/courses/[courseId]/lessons`。"
  - "生命周期主入口收敛在课程详情表单区，基础信息保存与显式 lifecycle 按钮分离。"

patterns-established:
  - "Pattern 1: 课程状态切换通过独立 publish/unpublish/archive actions 处理，并继续失效 teacherCourses/course tags。"
  - "Pattern 2: archived 课程在相邻教师入口按 `COURSE_NOT_FOUND` 处理，避免泄露 active-only flow。"

requirements-completed: [COURSE-04]

# Metrics
duration: 30min
completed: 2026-05-15
---

# Phase 14 Plan 01: Course lifecycle and status visibility summary

**教师现在可以在课程详情页直接 publish、unpublish、archive 课程，且 archived 课程不会再误入课时入口教师流程。**

## Performance

- **Duration:** 30 min
- **Completed:** 2026-05-15
- **Tasks:** 2
- **Files modified:** 7
- **Files created:** 1

## Accomplishments

- 新增 `publishCourseAction`、`unpublishCourseAction`、`archiveCourseAction`，并复用 teacher-scoped DAL 与现有 cache tag 失效逻辑。
- 在 `course-authoring` DAL 中补齐对应生命周期 mutation，并把 archived 课程从 `getTeacherCourseLessonsEntryDTO()` 中收紧。
- 将课程详情表单拆成“基础信息保存”与“生命周期动作”两层交互，避免状态下拉与显式生命周期语义混用。
- 为详情页表单、lifecycle actions、DAL 可见性规则补齐 focused tests。

## Task Commits

当前未创建 commit；本轮变更仍在工作树中，待用户决定是否提交。

## Files created or modified

- `src/lib/dto/course-authoring.ts` - 保留 lifecycle 输入 schema，供 actions 和 DAL 复用。
- `src/lib/dal/course-authoring.ts` - 新增 publish/unpublish/archive teacher-scoped mutation，并拒绝 archived 课程进入 lessons entry。
- `src/lib/dal/course-authoring.test.ts` - 增加 archived lessons-entry guard 与相邻 CTA copy 回归覆盖。
- `src/actions/course-authoring-actions.ts` - 新增三类 lifecycle server actions，统一走 validation、auth 和 cache invalidation。
- `src/actions/course-authoring-actions.test.ts` - 覆盖 lifecycle validation、成功结果与 tag 失效。
- `src/components/courses/course-detail-form.tsx` - 新增显式 lifecycle controls，保留基础信息保存并同步当前状态。
- `src/components/courses/course-detail-form.test.tsx` - 覆盖发布、归档、恢复草稿三条详情页交互链路。
- `src/components/surfaces/teacher-course-detail-surface.tsx` - 接入 lifecycle actions，并在 archived 状态下禁用进入课时管理 CTA。

## Decisions made

- `unpublish` 继续最小映射为恢复 `draft`，不引入新的中间状态。
- archived 课程详情页继续可读，方便教师确认历史信息，但相邻课时入口按不可见处理。
- 课程中心本轮只保留状态展示与 archived toggle 一致性，不额外新增独立 lifecycle 管理面板。

## Verification

- `./node_modules/.bin/vitest run src/components/courses/course-detail-form.test.tsx src/actions/course-authoring-actions.test.ts src/lib/dal/course-authoring.test.ts`
- `./node_modules/.bin/next build`

## User setup required

None.

## Next phase readiness

- `COURSE-04` 已完成，Phase 14 后续可继续聚焦 `14-03 / COURSE-05` 删除 guardrail 与 `14-02 / COURSE-06` 班级关联。
- 课程详情、课程中心与课时入口现在已有稳定状态语义，后续删除或关联逻辑可以复用同一 teacher-scoped course workflow。

---
*Phase: 14-course-lifecycle-and-associations*
*Completed: 2026-05-15*
