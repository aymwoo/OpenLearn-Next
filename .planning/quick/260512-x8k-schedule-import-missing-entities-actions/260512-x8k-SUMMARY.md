---
type: quick
slug: 260512-x8k-schedule-import-missing-entities-actions
status: complete
---

# Quick Task 260512-x8k: 课表导入缺失实体展示与动作入口

## Objective

继续在现有 OpenLearn-Next 代码上，把课表导入中班级、教师、课程不存在的记录纳入 display-only 主课表预览，并提供可落到现有页面的动作入口。

## Summary

这个 quick 的目标已被后续课表导入 surface 调整吸收完成。`TeacherScheduleSurface`
现在会在 display-only 主课表预览中展示 `CLASS_NOT_FOUND` /
`COURSE_NOT_FOUND` / `TEACHER_NOT_FOUND` 组合缺失，并在快捷操作中复用现有入口：
`/teacher/classes`、`/teacher/courses` 和 `/teacher/schedule#import-review`。

## Verification

- `./node_modules/.bin/vitest run src/components/surfaces/teacher-schedule-surface.test.tsx src/components/surfaces/schedule-import-modal.test.tsx`
