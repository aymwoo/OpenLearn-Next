---
phase: quick
plan: 260515-course-06-class-association
status: complete
---

# Summary

- 在 `course-authoring` DTO、DAL、Server Actions 中增加 teacher school-scoped 的课程-班级关联 add/remove，保持返回统一 `TeacherCourseDetailDTO`。
- 在课程详情页 `CourseDetailForm` 内增加班级关联管理区，支持添加本校未关联班级和移除已关联班级，不触及 student enrollment。
- 新增并更新 focused tests：`course-authoring` DAL、`course-authoring-actions`、`course-detail-form`。

# Verification

- `./node_modules/.bin/vitest --run src/lib/dal/course-authoring.test.ts src/actions/course-authoring-actions.test.ts src/components/courses/course-detail-form.test.tsx`
- `./node_modules/.bin/next build`
