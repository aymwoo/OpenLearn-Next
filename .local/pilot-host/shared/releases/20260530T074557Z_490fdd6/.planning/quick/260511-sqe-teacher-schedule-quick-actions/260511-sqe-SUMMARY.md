---
phase: quick
plan: 260511-sqe
status: complete
---

# Quick summary

已完成：为 `/teacher/schedule` 主页面补上 4 个快捷操作入口卡片，让教师可以从日程总览直接进入课表维护相关子页面。

## What changed

1. 在 `src/components/surfaces/teacher-schedule-surface.tsx` 的 hero 下方新增“快捷操作”区。
2. 增加 4 张快捷操作卡片，分别跳转到：
   - `/teacher/schedule/import`
   - `/teacher/schedule/changes`
   - `/teacher/schedule/assistant`
   - `/teacher/schedule/reminders`
3. 将节假日管理与单次变更合并为同一个入口，标题统一为“单次变更与节假日”。
4. 卡片样式按既有 teacher surface 节奏实现：
   - 外层使用 `teacherSurfaceRhythm.section`
   - 卡片使用 `teacherSurfaceRhythm.cardInset`
   - 图标圆形底托使用 `bg-surface-container-low`
   - 卡片 hover 增加 `hover:shadow-md`
   - 箭头使用 `group-hover:translate-x-0.5`
   - 网格使用 `sm:grid-cols-2 xl:grid-cols-4`
5. 更新 `src/components/surfaces/teacher-schedule-surface.test.tsx`，补足 4 个快捷入口链接断言。

## Verification

- `pnpm typecheck`
- `pnpm vitest run "src/components/surfaces/teacher-schedule-surface.test.tsx"`

## Key decisions

- 快捷操作区直接放在主页面 hero 下方，保持“总览先、行动后”的信息层级。
- 不为 schedule 主页面新增单独导航组件，继续沿用现有 surface 节奏与卡片语义。
- `changes` 页面继续承载“单次变更 + 节假日管理”的合并入口，不拆成两个并列卡片。
