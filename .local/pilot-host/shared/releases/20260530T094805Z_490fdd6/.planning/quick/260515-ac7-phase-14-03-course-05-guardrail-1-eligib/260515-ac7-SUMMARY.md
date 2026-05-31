---
phase: quick
plan: 260515-ac7
status: complete
---

# Quick summary

已完成：为课程详情页补齐删除 guardrail，包括删除资格判断、结构化 blocked reasons、显式课程名确认和页内失败反馈。

## What changed

1. 在 `src/lib/dto/course-authoring.ts` 增加 `CourseDeleteInputSchema`、`CourseDeleteBlockedReasonDTOSchema`、`CourseDeleteEligibilityDTOSchema`。
2. 在 `src/lib/dal/course-authoring.ts` 将 `deleteEligibility` 并入 `TeacherCourseDetailDTO`，并新增 `deleteCourseForTeacherScoped()`。
3. 在 `src/actions/course-authoring-actions.ts` 新增 `deleteCourseAction()`，对 `COURSE_DELETE_BLOCKED` 返回结构化 `DELETE_BLOCKED`。
4. 在 `src/components/courses/course-detail-form.tsx` 增加危险操作区，要求输入完整课程名称后才允许删除，并把 blocked reasons 显示在当前页。
5. 在 `src/components/surfaces/teacher-course-detail-surface.tsx` 接入 delete action。
6. 在 `src/actions/course-authoring-actions.test.ts`、`src/lib/dal/course-authoring.test.ts`、`src/components/courses/course-detail-form.test.tsx` 增加删除相关回归测试。

## Verification

- `./node_modules/.bin/vitest run src/components/courses/course-detail-form.test.tsx src/actions/course-authoring-actions.test.ts src/lib/dal/course-authoring.test.ts`
- `./node_modules/.bin/next build`

## Key decisions

- 删除 guardrail 当前阻断维度只限 lessons、class associations、course enrollments。
- 删除成功后直接返回 `/teacher/courses`，不保留当前详情页。
- blocked feedback 固定留在当前页，不依赖 toast 或瞬时跳转。
