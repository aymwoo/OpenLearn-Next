---
type: quick
slug: 260512-0bd-teacher-schedule-import-mapping-display-relax
status: complete
started_at: 2026-05-11T16:13:39.446Z
completed_at: 2026-05-12T00:20:30.000Z
tasks_completed: 2
files_modified: 5
commit: pending
---

# Quick Task 260512-0bd: 放宽教师课表导入映射展示阻断

## Objective

当教师课表导入记录的时间字段合法时，即使班级或教师尚未映射，也允许回到 `/teacher/schedule` 并进入主课表展示；同时不放宽自动审批与 runtime 入库边界。

## Summary

这次调整只收口展示层阻断，不动审批写库链路。`ScheduleImportModal` 现在会把仅包含 `CLASS_NOT_FOUND` / `TEACHER_NOT_FOUND`（以及伴随的 `CLASS_PENDING_STUDENT_IMPORT`）的导入批次视为“可继续主课表查看”，直接回到 `/teacher/schedule`，但不会触发自动审批。`TeacherScheduleSurface` 同时放宽主视图批次识别逻辑，并为这类最新 `in_review` 批次构建 teacher-scoped 的导入预览网格，让主课表区域在 runtime 尚未入库时也能真实显示最新导入内容。

### Changes

| File | Change |
|------|--------|
| `src/components/surfaces/schedule-import-modal.tsx` | 区分 display-only mapping review 与真正阻断；仅 class/teacher 未映射时直接回主课表并跳过 approve action |
| `src/components/surfaces/schedule-import-modal.test.tsx` | 新增“仅教师/班级未映射仍返回主课表”回归测试，并更新阻断分组预期 |
| `src/features/schedule/shared/dto/import.ts` | 为导入行 DTO 增加 preview schedule 字段，暴露 weekday 与导入时间，供主课表预览使用 |
| `src/features/schedule/import/server.ts` | 在批次 DTO 加载时回填 preview schedule 信息，不改变审批/入库链路 |
| `src/app/(teacher)/teacher/schedule/page.tsx` | 向课表主 surface 注入当前教师姓名，确保 display-only 预览按 teacher scope 过滤 |
| `src/components/surfaces/teacher-schedule-surface.tsx` | 新增 displayable main schedule batch 判定，并为 display-only 批次构建 teacher-scoped 导入预览网格 |
| `src/components/surfaces/teacher-schedule-surface.test.tsx` | 覆盖 display-only batch 可展示、course blocker 仍不可展示，以及 runtime 为空时仍显示导入预览网格的回归测试 |
| `.planning/STATE.md` | 追加 quick task 完成记录 |

### Verification

- `pnpm vitest run src/components/surfaces/schedule-import-modal.test.tsx` ✅
- `pnpm vitest run src/components/surfaces/teacher-schedule-surface.test.tsx` ✅
- `pnpm exec tsc --noEmit` ✅

### Constraints Met

- [x] 仅放宽班级/教师未映射的展示阻断
- [x] 未放宽课程缺失、时间非法、冲突等硬阻断
- [x] 未改变 `approveScheduleImport()` 的 unresolved blocker 规则
- [x] 未新增 UI 直连 DB 或绕过 normalized runtime 的路径
