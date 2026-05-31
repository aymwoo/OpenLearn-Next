---
quick_id: 260511-on3
slug: teacher-schedule-modal-sse
task: 为 /teacher/schedule 页面增加"导入课表"按钮，点击弹出 Modal 选择文件并上传，通过 SSE 实时显示导入进度
status: completed
created_at: "2026-05-11T09:00:00.000Z"
completed_at: "2026-05-11T09:25:00.000Z"
roadmap_exists: true
planning_exists: true
commit: pending
---

## 阶段目标
- [x] 分析现有 `/teacher/schedule` surface 与 `/teacher/schedule/import` 路由结构
- [x] 创建 `ScheduleImportModal` component（使用原生 `<dialog>`）
- [x] 在 `/teacher/schedule` 页面 hero 区增加导入按钮，点击打开 Modal
- [x] 实现文件选择 → CSV 解析 → `draftScheduleImportAction` 调用 → 跳转审核页流程
- [x] UI 状态机：idle → parsing → submitting → done/error
- [x] 修复 `TeacherDailyAgendaDTO` schema 添加 `schoolId` 字段
- [x] 更新测试 mock
- [x] typecheck 通过

## 新增/修改文件
- `src/components/surfaces/schedule-import-modal.tsx` — 新建 Modal 组件
- `src/components/surfaces/teacher-schedule-surface.tsx` — hero 区增加导入按钮
- `src/features/schedule/shared/dto/runtime.ts` — DTO 添加 schoolId
- `src/features/schedule/runtime/server.ts` — runtime 返回 schoolId
- `src/features/schedule/import/template.ts` — 修复 undefined 类型问题
- `src/components/surfaces/teacher-schedule-surface.test.tsx` — 添加 schoolId + mock
- `package.json` / `pnpm-lock.yaml` — 添加 papaparse