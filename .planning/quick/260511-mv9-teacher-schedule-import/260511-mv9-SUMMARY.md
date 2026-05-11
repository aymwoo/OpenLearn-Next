---
type: quick
slug: 260511-mv9-teacher-schedule-import
status: completed
started_at: 2026-05-11T08:41:00Z
completed_at: 2026-05-11T08:42:30Z
tasks_completed: 3
files_modified: 5
commit: aa94f76
---

# Quick Task 260511-mv9: 教师课表导入模板中文字段名

## Objective

将 `/teacher/schedule/import` 的 CSV 导入模板表头从英文字段名改为中文字段名，同时让导入 action 能识别中文字段并映射回英文字段供 schema 校验。

## Summary

成功实现中文列名 CSV 模板下载，模板表头使用中文，导入时可正确解析中文字段并映射到英文字段供校验。

### Changes

| File | Change |
|------|--------|
| `src/features/schedule/import/template.ts` | 新增 `scheduleImportTemplateChineseHeaders` 与 `SCHEDULE_IMPORT_COLUMN_MAP`，更新 CSV 生成使用中文表头 |
| `src/features/schedule/import/template.test.ts` | 添加中文列名合同、映射表与 CSV 中文输出验证 |
| `src/features/schedule/import/index.ts` | 导出新增常量供外部使用 |
| `src/features/schedule/import/actions.ts` | 新增 `transformChineseKeys()` 在校验前将中文字段映射回英文字段 |
| `src/app/(teacher)/teacher/schedule/import/template/route.test.ts` | 更新 mock 与断言匹配中文表头输出 |

### 中文列名映射

| 中文列名 | 英文字段 |
|---------|---------|
| 源记录标识 | sourceRowKey |
| 学期名称 | termName |
| 星期(0-6) | weekday |
| 节次标签 | bellSlotLabel |
| 班级名称 | className |
| 课程名称 | courseTitle |
| 教师姓名 | teacherName |
| 教室标签 | roomLabel |

### Verification

- `pnpm vitest run src/features/schedule/import/template.test.ts` ✅
- `pnpm vitest run "src/app/(teacher)/teacher/schedule/import/template/route.test.ts"` ✅
- `pnpm vitest run src/features/schedule/import/` ✅

### Constraints Met

- [x] 模板 CSV 表头为中文列名
- [x] 中文字段通过映射表正确解析为英文字段
- [x] ScheduleImportDraftRowInputSchema 校验路径不变
- [x] weekday 仍为 0-6 数值
- [x] 所有相关测试通过

## Deviation from Plan

None - plan executed exactly as written.