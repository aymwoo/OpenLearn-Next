---
phase: 13-course-center-foundation
verified: 2026-05-14T15:02:01Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 5/5
  gaps_closed:
    - human_verification.course_scope_and_school_selector
    - human_verification.create_and_edit_read_your_writes
    - human_verification.course_to_lesson_handoff
  gaps_remaining: []
  regressions: []
human_verification: []
---

# Phase 13: Course center foundation Verification Report

**Phase Goal:** Teachers can open a usable course center, create and edit
courses, and move from a course into lesson or teaching-plan management.
**Verified:** 2026-05-14T15:02:01Z
**Status:** passed
**Re-verification:** Yes — final closure re-check

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Teacher can open `/teacher/courses` and see only teacher-scoped courses with required metadata. | ✓ VERIFIED | `src/lib/dal/course-authoring.ts:91-100,163-201` still filters to `course.ownerId === actorId` inside active teacher school scope and emits metadata-rich DTOs; ownership regressions still pass in `src/lib/dal/course-authoring.test.ts:191-295`. |
| 2 | Course overview hides archived by default, orders by `draft -> published -> archived` then `updatedAt desc`, and enters a dedicated detail page. | ✓ VERIFIED | Ordering/filter logic remains in `src/lib/dal/course-authoring.ts:22-26,78-89,177-200`; detail handoff still goes through `/teacher/courses/[courseId]` from `src/components/surfaces/teacher-course-center-surface.tsx`. |
| 3 | Teacher can create a course through a validated workflow and immediately see it in the course center. | ✓ VERIFIED | DTO-driven school scope wiring remains in `src/components/courses/course-create-drawer.tsx` and `src/components/surfaces/teacher-course-center-surface.tsx`; create/update invalidation path remains in `src/actions/course-authoring-actions.ts:44-77`; related regressions still pass. |
| 4 | Teacher can edit course base information and receive clear read-your-writes feedback after save. | ✓ VERIFIED | `src/components/courses/course-detail-form.tsx:24-41,43-69` still snapshots server props, uses `resetForm()` to restore the current lesson-detail snapshot, clears stale success/error state, and refreshes after save/reset; `src/actions/course-authoring-actions.ts:44-77` still invalidates both `teacherCourses` and `course` tags for read-your-writes. |
| 5 | Teacher can move from course detail into lesson or teaching-plan management through a dedicated course-aware flow, and lesson authoring remains teacher-owned. | ✓ VERIFIED | Detail CTA still targets `/teacher/courses/[courseId]/lessons`; `src/app/(teacher)/teacher/courses/[courseId]/page.tsx:15-29` and `src/app/(teacher)/teacher/courses/[courseId]/lessons/page.tsx:15-29` only convert `COURSE_NOT_FOUND` to `notFound()` and rethrow other failures; `src/components/surfaces/course-lessons-entry-surface.tsx:131-145` redirects only with explicit `courseId` + created `lessonId`; `src/app/(teacher)/teacher/editor/page.tsx:25-65` refuses missing params instead of defaulting to the first lesson; `src/lib/dal/lesson-authoring.ts:84-146,183-209` keeps lesson authoring owner-scoped; `src/actions/lesson-authoring-actions.ts:83-88,119-289` now invalidates `teacherCourses` + `course` + `lesson` + `steps` tags on lesson mutations; `src/components/authoring/lesson-authoring-workspace.tsx:107-117` now computes down-move anchors from sibling ranks only, and the runtime regression in `src/components/authoring/lesson-authoring-workspace.test.tsx:103-155` passes. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/lib/dal/course-authoring.ts` | teacher-owned course center/detail/lessons read model | ✓ VERIFIED | Read paths still enforce teacher ownership, school scope, DTO shaping, and lesson-entry aggregation. |
| `src/lib/dto/course-authoring.ts` | `defaultSchoolId` / `availableSchools` DTO contract | ✓ VERIFIED | DTO contract still backs create flow with server-owned school scope metadata. |
| `src/app/(teacher)/teacher/courses/page.tsx` | teacher course center route | ✓ VERIFIED | Route still loads the center DTO and renders the teacher course center surface. |
| `src/components/surfaces/teacher-course-center-surface.tsx` | course center surface with scoped create wiring | ✓ VERIFIED | Surface still passes `defaultSchoolId` and `availableSchools` into both create entry points. |
| `src/components/courses/course-create-drawer.tsx` | scoped create drawer without hardcoded school id | ✓ VERIFIED | Submit payload still uses controlled scoped school selection only. |
| `src/components/surfaces/teacher-course-center-surface.test.tsx` | non-`school-1` and multi-school create regressions | ✓ VERIFIED | Tests still cover single-school and multi-school submit payloads. |
| `src/actions/course-authoring-actions.ts` | create/update course server actions | ✓ VERIFIED | Validation, auth error mapping, and cache invalidation remain intact. |
| `src/components/courses/course-detail-form.tsx` | inline detail edit form with local reset + success region | ✓ VERIFIED | Reset button still restores local snapshot before refresh; save path still shows persistent success evidence. |
| `src/app/(teacher)/teacher/courses/[courseId]/lessons/page.tsx` | course-aware lesson entry route | ✓ VERIFIED | Route only converts `COURSE_NOT_FOUND` to `notFound()` and rethrows other runtime failures. |
| `src/app/(teacher)/teacher/courses/[courseId]/page.tsx` | guarded course detail route | ✓ VERIFIED | Route only converts `COURSE_NOT_FOUND` to `notFound()` and preserves other errors. |
| `src/app/(teacher)/teacher/editor/page.tsx` | explicit course-aware editor entry behavior | ✓ VERIFIED | Empty-course and missing-lesson branches return guidance only; editor no longer opens from implicit first-lesson fallback. |
| `src/app/(teacher)/teacher/editor/page.test.tsx` | runtime regression for explicit lessonId requirement | ✓ VERIFIED | Behavioral tests assert guidance is rendered for missing `courseId`/`lessonId` and `getLessonEditorDTO()` is not called without explicit lesson selection. |
| `src/lib/dal/lesson-authoring.ts` | teacher-owned lesson authoring DAL boundary | ✓ VERIFIED | `assertActiveTeacher()`, `getScopedCourse()`, and `getScopedLesson()` still enforce active teacher school scope plus `ownerId === scope.userId` before lesson reads/writes. |
| `src/actions/lesson-authoring-actions.ts` | lesson mutation cache invalidation boundary | ✓ VERIFIED | `invalidateLessonAuthoringTags()` now invalidates `teacherCourses`, `course`, `lesson`, and `steps` tags across lesson create/edit/reorder/publish/archive flows. |
| `src/components/authoring/lesson-authoring-workspace.tsx` | step reorder anchor calculation | ✓ VERIFIED | Downward move now uses sibling anchors (`steps[index + 1]` / `steps[index + 2]`) instead of including the moving step's old rank. |
| `src/components/authoring/lesson-authoring-workspace.test.tsx` | runtime regression for reorder anchor fix | ✓ VERIFIED | Test asserts moving middle step down sends `{ beforeRank: "c0", afterRank: null }`, proving the old self-anchor bug is closed. |
| `src/lib/dal/lesson-authoring.test.ts` | lesson authoring ownership regressions | ✓ VERIFIED | Tests still assert owner filtering in overview and source-level ownership guards in DAL. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `courses/page.tsx` | `course-authoring.ts` | `getTeacherCourseCenterDTO` | ✓ WIRED | Route awaits DAL DTO directly. |
| `course-authoring.ts` | `TeacherCourseCenterDTOSchema` | `defaultSchoolId/availableSchools` | ✓ WIRED | DAL still queries `schools` and parses the center DTO. |
| `teacher-course-center-surface.tsx` | `CourseCreateDrawer` | `defaultSchoolId/availableSchools` props | ✓ WIRED | Both create entry points explicitly pass scoped school props. |
| `CourseCreateDrawer` | `createCourseAction` | `selectedSchoolId` submit payload | ✓ WIRED | Submit payload remains derived from controlled school state. |
| `teacher-course-detail-surface.tsx` | `/teacher/courses/[courseId]/lessons` | primary CTA | ✓ WIRED | Primary lesson-management CTAs still use the dedicated lessons-entry href. |
| `course-lessons-entry-surface.tsx` | lesson creation / editor | `createLessonDraftAction` + explicit redirect query | ✓ WIRED | Empty-state create still redirects with both `courseId` and `lessonId`. |
| `editor/page.tsx` | explicit route params | `searchParams.courseId/lessonId` | ✓ WIRED | Editor branch selection remains fully driven by explicit route params. |
| `lesson-authoring.ts` | scoped course / lesson resources | `getScopedCourse()` + `getScopedLesson()` | ✓ WIRED | Lesson editor load and draft creation still run through owner-checked scope gates before data access. |
| `lesson-authoring-actions.ts` | course center freshness | `invalidateLessonAuthoringTags()` | ✓ WIRED | Lesson mutations now propagate cache invalidation back to `teacherCourses` and `course` readers, not only lesson-local tags. |
| `lesson-authoring-workspace.tsx` | step reorder action | sibling-only `beforeRank/afterRank` | ✓ WIRED | UI now sends anchors that actually move a step down one slot instead of keeping it between its old position and next sibling. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/lib/dal/course-authoring.ts` | `scopedCourses` | `db.query.courses.findMany()` + owner filter | Yes | ✓ FLOWING |
| `src/lib/dal/course-authoring.ts` | `availableSchools` | `db.query.schools.findMany()` | Yes | ✓ FLOWING |
| `src/components/courses/course-create-drawer.tsx` | `selectedSchoolId` | `defaultSchoolId` / `availableSchools` props | Yes | ✓ FLOWING |
| `src/components/courses/course-detail-form.tsx` | `form` save/reset state | server `course` props + `updateCourseAction` result | Yes | ✓ FLOWING |
| `src/components/surfaces/course-lessons-entry-surface.tsx` | `lessons` / redirect target | `getTeacherCourseLessonsEntryDTO` + `createLessonDraftAction` | Yes | ✓ FLOWING |
| `src/lib/dal/lesson-authoring.ts` | `scope.userId` / scoped course+lesson | `getCurrentUserDTO()` + `getUserMembershipsDTO()` + owner checks | Yes | ✓ FLOWING |
| `src/actions/lesson-authoring-actions.ts` | `actorId + courseId + lessonId` invalidation tuple | `assertActiveTeacher()` + DAL autosave results | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase 13 focused regression suite | `pnpm vitest run src/lib/dal/course-authoring.test.ts src/lib/dal/lesson-authoring.test.ts src/actions/course-authoring-actions.test.ts src/actions/lesson-authoring-actions.test.ts "src/app/(teacher)/teacher/editor/page.test.tsx" src/components/authoring/lesson-authoring-workspace.test.tsx src/components/surfaces/teacher-course-center-surface.test.tsx` | 7 files, 32 tests passed | ✓ PASS |
| Editor explicit lessonId branch | `pnpm vitest run "src/app/(teacher)/teacher/editor/page.test.tsx"` | 1 file, 3 tests passed | ✓ PASS |
| Lesson authoring teacher-owned boundary | `pnpm vitest run src/lib/dal/lesson-authoring.test.ts` | 1 file, 6 tests passed | ✓ PASS |
| Lesson cache invalidation path | `pnpm vitest run src/actions/lesson-authoring-actions.test.ts` | 1 file, 2 tests passed | ✓ PASS |
| Step reorder anchor regression | `pnpm vitest run src/components/authoring/lesson-authoring-workspace.test.tsx` | 1 file, 2 tests passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `COURSE-01` | `13-01-PLAN`, `13-04-PLAN` | Teacher-scoped course center with course metadata | ✓ SATISFIED | Owner filtering, DTO metadata, and center regressions remain intact. |
| `COURSE-02` | `13-02-PLAN`, `13-05-PLAN` | Manual course creation through teacher workflow | ✓ SATISFIED | Create drawer still consumes DTO-driven school scope and create-flow tests still pass. |
| `COURSE-03` | `13-02-PLAN` | Edit course base info with read-your-writes feedback | ✓ SATISFIED | Save path still invalidates tags, shows in-page success evidence, and reset semantics still restore local form snapshot. |
| `COURSE-10` | `13-03-PLAN` | Dedicated entry from course into lesson/teaching-plan management | ✓ SATISFIED | Detail → lessons entry → editor path remains course-aware; lesson authoring DAL still enforces teacher-owned course/lesson boundaries. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| — | — | No new blocker or warning anti-pattern found in the latest-worktree re-verification scope. | ℹ️ Info | Remaining uncertainty is limited to unchanged human UAT items. |

### Human verification closure

2026-05-14 已完成真实浏览器验证，结果记录在
`13-HUMAN-UAT.md`：

1. `teacher@example.com/password` 多学校场景下，课程中心只显示本人课程，建课抽屉显示两个真实学校选项且默认 `OpenLearn 测试学校`。
2. `other-teacher@example.com/password` 单学校场景下，课程中心只显示 `非本人课程-作用域校验`，建课抽屉改为只读学校摘要 `OpenLearn 第二测试学校`。
3. 新建课程后课程卡片立即出现；详情页保存后显示持久成功反馈，刷新后仍保留最新字段。
4. 空课程通过“新建第一个课时”进入带 `courseId`/`lessonId` 的 editor；已有课时课程通过“继续编辑”进入同样保持课程上下文的 editor。

### Gaps Summary

本次按最终收口工作树重点复核了 8 个点：

1. `lesson-authoring` 读写边界仍通过 `getScopedCourse()` / `getScopedLesson()` 收紧到 teacher-owned course/lesson。
2. `/teacher/editor` 仍必须带显式 `courseId` 与 `lessonId`；缺参时只返回 guidance，不再默认打开第一条课时。
3. 课程详情页 `resetForm()` 仍会还原当前 server snapshot，并在 save/reset 后清理局部状态，未回退成仅 `router.refresh()` 的粗暴刷新。
4. 课程详情页与课程内课时入口页的 `notFound` 处理仍只吞掉 `COURSE_NOT_FOUND`，不会把真实运行时错误误判成 404。
5. lesson authoring 写操作已把 `teacherCourses` / `course` 缓存失效纳入统一 helper，课程中心与课程详情不会继续稳定读旧 lesson 元数据。
6. step reorder 的“下移”锚点已修正为 sibling-only 计算，并有运行时测试证明不再把当前步骤自己的旧 rank 作为下界。
7. 聚焦回归套件已再次运行，`7 files, 32 tests passed`，覆盖 course center / create / edit / course-aware editor handoff / lesson ownership / cache invalidation / reorder regression。
8. 关键静态回退模式已再次确认不存在：`course-create-drawer.tsx` 不含 `schoolId = "school-1"`，`/teacher/editor` 入口不含 `overview.lessons[0]` 默认回退。

因此，Phase 13 保持 **5/5 must-haves verified**，且真实登录态、浏览器交互与
端到端 handoff 已完成 closure。当前没有新增自动化 gap，也没有 blocker /
warning 级 residual risk；状态收口为 `passed`。

---

_Verified: 2026-05-14T15:02:01Z_
_Verifier: the agent (gsd-verifier)_
