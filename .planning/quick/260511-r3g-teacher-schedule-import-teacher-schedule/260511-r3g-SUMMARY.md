---
type: quick
slug: 260511-r3g-teacher-schedule-import-teacher-schedule
status: completed
started_at: 2026-05-11T11:30:33.900Z
completed_at: 2026-05-11T11:45:00.000Z
tasks_completed: 3
files_modified: 11
commit: pending
---

# Quick Task 260511-r3g: 主课表页收回导入与完整周课表

## Objective

移除 `/teacher/schedule/import` 作为主用户流落点；导入成功后回到 `/teacher/schedule`；并在主页面最后一个 section 里展示 Stitch 风格的完整周课表。

## Summary

这次调整把导入审核收回到主课表页：CSV 导入成功后会回到 `/teacher/schedule#import-review`，旧 `/teacher/schedule/import` 页面直接重定向回主课表页；同时扩展了 schedule runtime DTO，让主页面底部可以渲染“时间轴 + 工作日列 + 课程卡片矩阵”的完整周课表视图。

### Changes

| File | Change |
|------|--------|
| `src/features/schedule/shared/dto/runtime.ts` | 新增完整周课表 DTO contract：weekdays / rows / cells |
| `src/features/schedule/runtime/server.ts` | 基于现有 runtime records 生成 `weeklySchedule`，不泄漏 raw import rows |
| `src/app/(teacher)/teacher/schedule/page.tsx` | 同时加载 daily agenda 与最新导入 batch，并传给主 surface |
| `src/app/(teacher)/teacher/schedule/import/page.tsx` | 旧导入页改为 server redirect 回 `/teacher/schedule` |
| `src/components/surfaces/schedule-import-modal.tsx` | 导入成功后跳转到 `/teacher/schedule#import-review` |
| `src/components/surfaces/schedule-import-review-surface.tsx` | 复用为主页面内联审核区 |
| `src/components/surfaces/teacher-schedule-surface.tsx` | 新增主页面内联审核 section 与 Stitch 风格完整周课表 section |
| `src/components/surfaces/teacher-schedule-surface.test.tsx` | 补充周课表和新页内锚点回归测试 |
| `src/components/surfaces/schedule-import-modal.test.tsx` | 断言导入成功后的新跳转目标 |
| `src/app/(teacher)/teacher/schedule/import/page.test.tsx` | 覆盖旧路由重定向行为 |
| `src/features/schedule/runtime/server.test.ts` | 覆盖新的 weeklySchedule DTO 合同 |

### Verification

- `pnpm vitest run src/features/schedule/runtime/server.test.ts src/components/surfaces/schedule-import-modal.test.tsx src/components/surfaces/schedule-import-review-surface.test.tsx src/components/surfaces/teacher-schedule-surface.test.tsx src/app/(teacher)/teacher/schedule/import/page.test.tsx` ✅
- `pnpm typecheck` ✅

### Constraints Met

- [x] 导入成功后不再落到独立 `/teacher/schedule/import`
- [x] staging review 仍保留在主课表体验内，不存在上传即入库路径
- [x] 完整周课表继续只消费 schedule runtime DTO
- [x] 没有新增 UI 直连 DB 或 raw import 泄漏

## Deviation from Plan

未额外拆分 compact/embedded 审核组件结构，只通过复用现有 review surface 直接内联到主页面，保持最小改动。
