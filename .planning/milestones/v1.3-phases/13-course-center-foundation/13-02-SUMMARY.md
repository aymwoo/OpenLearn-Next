---
phase: 13-course-center-foundation
plan: 02
subsystem: ui
tags: [courses, server-actions, dal, zod, vitest, nextjs]

# Dependency graph
requires:
  - phase: 13-course-center-foundation
    provides: teacher-scoped course read model, teacher course center/detail surfaces
provides:
  - teacher-scoped course create and update server actions
  - right-side drawer flow for creating courses from /teacher/courses
  - inline course detail edit form with persistent in-page success feedback
affects: [phase-13 plan-03, teacher course lessons handoff, course lifecycle management]

# Tech tracking
tech-stack:
  added: []
  patterns: [strict zod mutation schemas, teacher-owned DAL writes, in-page success region with read-your-writes cache invalidation]

key-files:
  created:
    - src/actions/course-authoring-actions.ts
    - src/actions/course-authoring-actions.test.ts
    - src/components/courses/course-create-drawer.tsx
    - src/components/courses/course-detail-form.tsx
  modified:
    - src/lib/dto/course-authoring.ts
    - src/lib/dal/course-authoring.ts
    - src/components/surfaces/teacher-course-center-surface.tsx
    - src/components/surfaces/teacher-course-detail-surface.tsx

key-decisions:
  - "课程 create action 只接受 schoolId、title、subject、grade 与可选 draft status，并在 schema 层拒绝未声明字段。"
  - "课程 update 继续收敛到 teacher-owned DAL 写路径，跨教师或跨学校课程一律返回未授权。"
  - "课程保存成功反馈保留在详情页表单区，而不是只依赖瞬时 toast。"

patterns-established:
  - "Pattern 1: 课程写操作通过独立 course-authoring action + DAL 组合处理校验、授权和 cache tag 失效。"
  - "Pattern 2: 教师课程中心的可写 UI 继续使用 tonal surface，并把 create/edit 反馈保留在当前页面上下文中。"

requirements-completed: [COURSE-02, COURSE-03]

# Metrics
duration: 4 min
completed: 2026-05-09
---

# Phase 13 Plan 02: Course create and inline edit summary

**教师现在可以在课程中心右侧抽屉新建课程，并在课程详情页内联编辑标题、学科、年级与状态且立即看到页内成功反馈。**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-09T12:11:00Z
- **Completed:** 2026-05-09T12:15:53Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 为课程中心补齐 `createCourseAction` 与 `updateCourseAction`，覆盖严格 Zod 校验、teacher scope 授权和 list/detail tag 双失效。
- 通过 TDD 锁定 D-08、D-16、D-17：非法输入被拒绝、越权更新被拦截、成功写入后立即 read-your-writes。
- 在 `/teacher/courses` 接入右侧抽屉建课流，在课程详情页接入 inline 编辑区与稳定的页内 success region。

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: 实现课程 create/update mutation contract 与缓存失效** - `403f731` (test)
2. **Task 1 GREEN: 实现课程 create/update mutation contract 与缓存失效** - `ac724b2` (feat)
3. **Task 2: 接入抽屉新建与详情页 inline 编辑，并提供页内成功反馈** - `06ac0cf` (feat)

**Plan metadata:** pending

_Note: Task 1 followed TDD with separate RED and GREEN commits._

## Files Created/Modified

- `src/actions/course-authoring-actions.ts` - 新增课程 create/update Server Actions、错误映射与 tag 失效逻辑。
- `src/actions/course-authoring-actions.test.ts` - 锁定 D-08、D-16、D-17 的 validation、授权和 cache invalidation contract。
- `src/lib/dto/course-authoring.ts` - 补充课程 create/update 输入 schema，并收紧 create 的默认 draft 约束。
- `src/lib/dal/course-authoring.ts` - 新增 teacher-owned 课程 create/update 写路径并返回最新 DTO。
- `src/components/courses/course-create-drawer.tsx` - 新增课程中心右侧抽屉建课表单。
- `src/components/courses/course-detail-form.tsx` - 新增课程详情页内联编辑表单与 success region。
- `src/components/surfaces/teacher-course-center-surface.tsx` - 接入右侧抽屉建课入口。
- `src/components/surfaces/teacher-course-detail-surface.tsx` - 接入详情页内联编辑表单与持久反馈区域。

## Decisions Made

- 课程写入继续沿用独立 `course-authoring` action/DAL 边界，不回退到 `lesson-authoring-actions.ts` 混合处理。
- 课程 update 除 school scope 外再补一层 owner 校验，避免教师修改同校但非本人课程。
- 课程成功反馈固定保留在详情页编辑区顶部，满足 D-07 的可见证据要求。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] 收紧 create schema 只允许 draft 初始状态**
- **Found during:** Task 1 (实现课程 create/update mutation contract 与缓存失效)
- **Issue:** 计划要求抽屉建课默认 `draft`，若允许 create 直接传入任意状态，会让未完成课程绕过初始草稿约束。
- **Fix:** 将 `CourseCreateInputSchema` 的 `status` 收紧为可选 `draft`，并在 DAL 中对缺省值统一落为 `draft`。
- **Files modified:** `src/lib/dto/course-authoring.ts`, `src/lib/dal/course-authoring.ts`
- **Verification:** `pnpm vitest run src/actions/course-authoring-actions.test.ts`
- **Committed in:** `ac724b2` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** 该修正保证建课流程符合 D-05 / D-08 的默认草稿约束，没有额外扩 scope。

## Issues Encountered

None

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| `src/components/surfaces/teacher-course-center-surface.tsx` | 84 | `尚未关联班级，后续可继续配置。` | 班级关联管理属于后续 Phase 14 范围，不阻塞本计划的 create/edit 闭环。 |
| `src/components/surfaces/teacher-course-center-surface.tsx` | 111 | `继续衔接后续的课时与教案管理` | 课程内课时入口与 handoff 在 13-03 继续完成。 |
| `src/components/surfaces/teacher-course-detail-surface.tsx` | 140 | `后续阶段会补齐班级与学生关联管理。` | 班级/学生关联管理不在 13-02 范围内。 |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 课程中心的手动建课与基础信息编辑闭环已可用，可直接在 13-03 上继续承接 course-aware 课时入口。
- 课程读写已经共用同一 teacher-scoped DAL/action contract，后续生命周期动作可在此基础上扩展。
- 无额外阻塞。

## Self-Check: PASSED

- Found `src/actions/course-authoring-actions.ts`
- Found `src/actions/course-authoring-actions.test.ts`
- Found `src/components/courses/course-create-drawer.tsx`
- Found `src/components/courses/course-detail-form.tsx`
- Found commits `403f731`, `ac724b2`, `06ac0cf`

---
*Phase: 13-course-center-foundation*
*Completed: 2026-05-09*
