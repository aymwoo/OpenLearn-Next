---
phase: 13-course-center-foundation
plan: 01
subsystem: ui
tags: [courses, teacher, dal, dto, vitest, nextjs]

# Dependency graph
requires:
  - phase: 12-launch-and-builtins
    provides: teacher-scoped authoring DAL, classroom-aligned teacher shell, cache-tag patterns
provides:
  - teacher-scoped course center read model with DTO contracts
  - /teacher/courses route backed by real DAL data
  - standalone /teacher/courses/[courseId] read-only detail entry
affects: [course authoring actions, course lesson handoff, phase-13 plan-02, phase-13 plan-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [teacher-scoped cached DAL reads, route-to-surface DTO rendering, status-priority course ordering]

key-files:
  created:
    - src/lib/dto/course-authoring.ts
    - src/lib/dal/course-authoring.ts
    - src/lib/dal/course-authoring.test.ts
    - src/app/(teacher)/teacher/courses/page.tsx
    - src/app/(teacher)/teacher/courses/[courseId]/page.tsx
    - src/components/surfaces/teacher-course-center-surface.tsx
    - src/components/surfaces/teacher-course-detail-surface.tsx
  modified:
    - src/lib/cache-policy.ts

key-decisions:
  - "课程中心列表读取单独收敛到 course-authoring DAL，而不是继续膨胀 lesson-authoring.ts。"
  - "课程列表排序在 DAL 内显式固化为 draft -> published -> archived，再按 updatedAt 倒序，避免 UI 漂移。"
  - "教师从课程卡进入独立详情页，再由详情页承接课时管理入口，不再直接跳全局 editor。"

patterns-established:
  - "Pattern 1: teacher-scoped course reads use assertActiveTeacher plus cacheTags.teacherCourses(actorId)."
  - "Pattern 2: teacher route pages consume sanitized DTOs from DAL and render dedicated surfaces instead of demo library data."

requirements-completed: [COURSE-01]

# Metrics
duration: 6 min
completed: 2026-05-09
---

# Phase 13 Plan 01: Course center read model and teacher entry summary

**教师课程中心现在使用 teacher-scoped DTO/DAL 提供真实课程卡片列表，并新增独立课程详情页作为进入课时管理的稳定入口。**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-09T11:53:36Z
- **Completed:** 2026-05-09T12:00:08Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 建立 `course-authoring` DTO 与 DAL，覆盖 teacher/school scope、archived 默认隐藏、状态优先级排序和课程详情聚合字段。
- 用 Vitest 红绿测试锁定 D-13、D-14、D-15、D-16 行为，并确保课程详情返回课时摘要、班级链接和学生数。
- 落地 `/teacher/courses` 与 `/teacher/courses/[courseId]` 两级教师路由，替换 demo 课程库为真实 teacher-scoped surface。

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: 定义课程中心读模型测试** - `4a2a61a` (test)
2. **Task 1 GREEN: 定义课程中心 DTO、缓存标签和 teacher-scoped 读模型** - `e9a4c52` (feat)
3. **Task 2: 建立课程总览页与独立课程详情页只读骨架** - `179b211` (feat)

**Plan metadata:** pending

_Note: Task 1 used TDD with separate RED and GREEN commits._

## Files Created/Modified

- `src/lib/cache-policy.ts` - 新增 `cacheTags.teacherCourses(actorId)` 供课程中心读模型显式失效。
- `src/lib/dto/course-authoring.ts` - 定义课程中心卡片、课程详情、课时摘要与班级链接 DTO schema。
- `src/lib/dal/course-authoring.ts` - 实现 teacher-scoped 课程中心与详情读取、缓存标签、排序与聚合逻辑。
- `src/lib/dal/course-authoring.test.ts` - 锁定 D-13 到 D-16 的范围、排序、归档与详情聚合行为。
- `src/app/(teacher)/teacher/courses/page.tsx` - 新建真实教师课程总览页，读取 `getTeacherCourseCenterDTO()`。
- `src/app/(teacher)/teacher/courses/[courseId]/page.tsx` - 新建独立课程详情页，读取 `getTeacherCourseDetailDTO()`。
- `src/components/surfaces/teacher-course-center-surface.tsx` - 渲染课程卡片网格、状态 badge、archived 切换与详情入口。
- `src/components/surfaces/teacher-course-detail-surface.tsx` - 渲染课程概要、课时摘要、班级链接和“进入课时管理”CTA 区域。

## Decisions Made

- 将课程中心读模型拆到独立 `course-authoring` 模块，避免 `lesson-authoring.ts` 继续承担无关页面聚合职责。
- 将课程状态排序与 archived 默认隐藏写入 DAL，而不是交给页面层做二次处理，确保未来写入与缓存失效都能复用同一 contract。
- 课程卡主入口固定为课程详情页，满足 D-01 与 D-04 的两级结构要求，并为后续 course-aware lesson handoff 留出稳定落点。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| `src/components/surfaces/teacher-course-detail-surface.tsx` | 58 | `后续在这里接入编辑课程信息` | 课程编辑属于 13-02，当前计划只交付只读骨架。 |
| `src/components/surfaces/teacher-course-detail-surface.tsx` | 110 | `后续将从这里直接承接“新建第一个课时”的主入口` | course-aware lesson entry 将在 13-03 完成。 |
| `src/components/surfaces/teacher-course-detail-surface.tsx` | 134 | `后续阶段会补齐班级与学生关联管理` | 课程关联管理属于 Phase 14 范围。 |
| `src/components/surfaces/teacher-course-detail-surface.tsx` | 139-145 | `后续动作预留` / `后续接入课程编辑` | 当前详情页只提供入口骨架，不在 13-01 内实现编辑流。 |
| `src/components/surfaces/teacher-course-center-surface.tsx` | 85 | `尚未关联班级，后续可继续配置。` | 班级关联动作尚未在本计划实现。 |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 课程中心基础读模型已经稳定，可直接在 13-02 上接课程创建与编辑写路径。
- 课程详情页已经成为明确的 handoff 入口，可在 13-03 上继续接 course-aware 课时列表与 lesson management flow。
- 无阻塞项。

## Self-Check: PASSED

- Found `src/lib/dal/course-authoring.ts`
- Found `src/app/(teacher)/teacher/courses/page.tsx`
- Found `src/app/(teacher)/teacher/courses/[courseId]/page.tsx`
- Found commits `4a2a61a`, `e9a4c52`, `179b211`

---
*Phase: 13-course-center-foundation*
*Completed: 2026-05-09*
