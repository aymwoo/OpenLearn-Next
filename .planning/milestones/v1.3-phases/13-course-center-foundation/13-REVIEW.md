---
phase: 13-course-center-foundation
reviewed: 2026-05-09T15:11:13Z
depth: deep
files_reviewed: 15
files_reviewed_list:
  - src/lib/dto/lesson-authoring.ts
  - src/lib/dal/lesson-authoring.ts
  - src/lib/dal/lesson-authoring.test.ts
  - src/actions/lesson-authoring-actions.ts
  - src/actions/lesson-authoring-actions.test.ts
  - src/app/(teacher)/teacher/editor/page.tsx
  - src/app/(teacher)/teacher/editor/page.test.tsx
  - src/components/authoring/lesson-authoring-workspace.tsx
  - src/components/authoring/lesson-authoring-workspace.test.tsx
  - src/components/courses/course-detail-form.tsx
  - src/app/(teacher)/teacher/courses/[courseId]/page.tsx
  - src/app/(teacher)/teacher/courses/[courseId]/lessons/page.tsx
  - src/components/surfaces/course-lessons-entry-surface.tsx
  - src/actions/course-authoring-actions.ts
  - src/lib/cache-policy.ts
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-05-09T15:11:13Z  
**Depth:** deep  
**Files Reviewed:** 15  
**Status:** issues_found

## Summary

本轮对 Phase 13 最终收口范围做了 deep review，重点复核了 lesson
authoring DAL / Server Actions、editor 入口、course detail 容器页，以及新补的
authoring 测试。

- 之前两条 warning 已关闭：班级关联已改为按 `classId` 回填，`*_NOT_FOUND`
  也已转换为业务错误。
- 目前 **没有 BLOCKER**。
- 但仍有 **1 条 WARNING + 1 条 INFO**：一条是课程内“新建课时”入口仍会把可恢复失败升级成
  500；另一条是 lesson authoring action 文件里还保留着一个与课程中心实现分叉的重复
  `createCourseAction` 导出。

## Warnings

### WR-01: 课程内“新建课时”入口仍会把业务失败升级成 500

**File:** `src/components/surfaces/course-lessons-entry-surface.tsx:131-145`

**Issue:** `createLessonDraftAction()` 现在已经会把 `COURSE_NOT_FOUND` /
`TEACHER_AUTH_REQUIRED` 等场景转换成 `ok: false` 的业务结果，但
`createLessonDraftFromCourse()` 对所有 `!result.ok` 都直接
`throw new Error("LESSON_DRAFT_CREATE_FAILED")`。这会让 teacher 在课程被删除、权限失效、
或其他可恢复失败场景下，从课程内入口点击“新建课时”时仍然落成未处理的 server error，
而不是收到可提示、可重试的反馈。

**Fix:** 不要在 wrapper 里把 `ok: false` 重新抛成异常；改为把错误状态回传或带回当前页展示。

```tsx
const result = await createLessonDraftAction({
  courseId,
  title: "未命名课时",
  objective: "请补充本课时的教学目标。",
});

if (!result.ok) {
  redirect(
    `/teacher/courses/${courseId}/lessons?error=${encodeURIComponent(result.message)}`,
  );
}

redirect(`/teacher/editor?courseId=${courseId}&lessonId=${result.data.id}`);
```

或者把该入口改成 client action + `useActionState`，直接在当前页渲染错误提示。

## Info

### IN-01: lesson authoring action 文件仍保留重复的课程创建入口

**File:** `src/actions/lesson-authoring-actions.ts:113-123`; `src/actions/course-authoring-actions.ts:44-58`

**Issue:** `src/actions/lesson-authoring-actions.ts` 里仍然导出了一个额外的
`createCourseAction()`，而当前课程中心的正式入口已经是
`src/actions/course-authoring-actions.ts`。两者的缓存失效策略已经分叉：前者只失效
`course:${id}`，后者会同时失效 `teacherCourses(actorId)` 与 `course:${id}`。虽然当前仓库内课程创建
调用走的是 canonical action，但这个重复 public export 继续保留，会让后续导入很容易选错入口，
把已修好的课程中心刷新问题重新带回来。

**Fix:** 删除 `lesson-authoring-actions.ts` 里的重复导出，或直接让它委托到
`course-authoring-actions.ts` / 共用的 invalidation helper，保证只有一条课程创建入口。

---

_Reviewed: 2026-05-09T15:11:13Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: deep_
