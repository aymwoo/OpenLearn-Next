---
+phase: quick
+plan: 260515-9yu
+status: complete
+---
+
+# Quick summary
+
+已完成：为课程补上最小范围的 `publish` / `unpublish` / `archive` 生命周期 action，并收紧 archived 课程在 lessons entry 教师流程中的可见性。
+
+## What changed
+
+1. 在 `src/lib/dto/course-authoring.ts` 增加课程生命周期输入 schema。
+2. 在 `src/lib/dal/course-authoring.ts` 新增 teacher-scoped `publishCourseForTeacherScoped`、`unpublishCourseForTeacherScoped`、`archiveCourseForTeacherScoped`。
+3. 在 `src/actions/course-authoring-actions.ts` 新增对应 server actions，并复用既有 `updateTag(cacheTags.teacherCourses/cacheTags.course)` 失效逻辑。
+4. 将 `getTeacherCourseLessonsEntryDTO()` 收紧为拒绝 archived 课程，避免归档课程继续进入课时管理教师流程。
+5. 在 `src/components/surfaces/teacher-course-detail-surface.tsx` 为 archived 课程显示禁用的课时管理 CTA 和恢复提示。
+6. 在 `src/actions/course-authoring-actions.test.ts` 与 `src/lib/dal/course-authoring.test.ts` 增加回归测试。
+
+## Verification
+
+- `./node_modules/.bin/vitest run src/actions/course-authoring-actions.test.ts src/lib/dal/course-authoring.test.ts`
+- `./node_modules/.bin/tsc --noEmit` 未能作为全仓通过标准使用；仓库存在与本次改动无关的既有 typecheck 错误（如 `src/actions/learning-actions.test.ts`、`src/actions/plugin-actions.test.ts`、`src/actions/theme-actions.test.ts`）。
+
+## Key decisions
+
+- 生命周期入口先保持在 server action / DAL 层，不额外新增 route 或并行读写 contract。
+- `unpublish` 先最小映射回 `draft`，与现有课程状态枚举保持一致。
+- archived 课程详情仍可查看，但不再继续进入 course-aware lessons entry，避免错误暴露 active 内容入口。
