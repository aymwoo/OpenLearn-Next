---
phase: 13-course-center-foundation
verified: 2026-05-09T15:10:06Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 5/5
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "以真实教师账号打开 `/teacher/courses`，核对课程列表与建课学校范围"
    expected: "只能看到当前教师本人拥有的课程；单学校教师默认学校正确，多学校教师可见且可切换真实学校选项。"
    why_human: "需要真实登录态、页面交互与视觉核对；自动化只验证了代码路径与测试桩。"
  - test: "在课程中心新建课程，再进入详情页编辑标题/学科/年级/状态"
    expected: "新课程立即出现在课程卡片网格；详情页出现持久成功反馈，且刷新后仍显示最新字段。"
    why_human: "需要浏览器里验证 read-your-writes 体验、文案可见性与交互完整性。"
  - test: "从课程详情进入课时管理，分别验证空课程与已有课时课程的 handoff"
    expected: "空课程通过“新建第一个课时”进入 editor；已有课时课程可继续编辑，不出现脱离课程上下文的跳转。"
    why_human: "需要端到端导航确认支持路径无误，并检查空态/已有态的实际可用性。"
---

# Phase 13: Course center foundation Verification Report

**Phase Goal:** Teachers can open a usable course center, create and edit
courses, and move from a course into lesson or teaching-plan management.
**Verified:** 2026-05-09T15:10:06Z
**Status:** human_needed
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

### Human Verification Required

### 1. Course center scope and school selector

**Test:** 使用真实教师账号打开 `/teacher/courses`，分别验证单学校教师与多学校教师页面。  
**Expected:** 列表中只出现当前教师本人拥有的课程；建课抽屉显示正确默认学校，多学校场景可切换真实学校。  
**Why human:** 需要真实登录态、页面渲染与可视交互确认。

### 2. Create and edit read-your-writes

**Test:** 在课程中心抽屉创建课程，然后进入详情页修改标题、学科、年级与状态。  
**Expected:** 新课程立即出现在总览；详情页出现持久成功反馈，且页面字段显示最新值。  
**Why human:** 需要浏览器里确认刷新体验、交互反馈和文案可见性。

### 3. Course-to-lesson handoff

**Test:** 从课程详情进入课时管理；对空课程执行“新建第一个课时”，对已有课时课程执行“继续编辑已有课时”。  
**Expected:** 两条路径都保持课程上下文，不会把教师错误带到脱离课程语境的入口。  
**Why human:** 需要端到端导航与实际 UI 行为验证。

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

因此，Phase 13 继续保持 **5/5 must-haves verified**。当前没有新增自动化
gap，也没有 blocker / warning 级 residual risk；状态继续为 `human_needed`，仅因真实登录态、浏览器交互与端到端 handoff 仍需人工确认。

---

_Verified: 2026-05-09T15:10:06Z_
_Verifier: the agent (gsd-verifier)_
