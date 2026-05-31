---
phase: quick
plan: 260511-on3
status: complete
---

# Quick summary

已完成：`/teacher/schedule` 首页新增 `导入课表` modal 入口，支持 CSV 文件选择、客户端解析、导入草稿写入与成功后返回主课表。当前反馈进度由 modal 内本地状态机承担，没有额外引入独立 SSE 事件流。

## What changed

1. 新增 `src/components/surfaces/schedule-import-modal.tsx`，在主课表页 hero 区提供 `导入课表` CTA 和原生 `<dialog>` 弹层。
2. 使用 `Papa.parse` 做客户端 CSV 解析与中文列名映射，调用 `draftScheduleImportAction` / `approveScheduleImportAction` 并在成功后返回 `/teacher/schedule`。
3. `TeacherDailyAgendaDTO` 与相关测试补齐 `schoolId`，保证导入 modal 能继续复用既有教师课表上下文。

## Verification

- `./node_modules/.bin/vitest run src/components/surfaces/teacher-schedule-surface.test.tsx src/components/surfaces/schedule-import-modal.test.tsx`
