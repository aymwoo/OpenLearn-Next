---
phase: quick
plan: 260513-o1x
status: complete
---

# Quick summary

已完成：重构 `/teacher/schedule` 主课表视图，把原先服务端内联周课表替换为更紧凑的交互式周视图，默认突出班级名和课程胶囊，详细信息改为 hover / focus 按需浮出，并在选中课程后显示图标化快捷操作面板。

## What changed

1. 在 `src/components/surfaces/teacher-schedule-surface.tsx` 中移除内联周课表网格渲染，只保留现有批次选择、空态、历史学期与 DTO 装配逻辑，并接入新的 `TeacherScheduleWeekGrid`。
2. 新增 `src/components/surfaces/teacher-schedule-week-grid.tsx` client 组件：
   - 单元格默认先显示班级名。
   - 课程名改为下方胶囊按钮。
   - 时间、地点、状态、教师、overrideSummary 收到 hover / focus 浮层里。
   - 点击课程胶囊后显示无边框快捷操作面板，提供 `调课管理`、`提醒配置`、`查看班级` 三个图标按钮。
3. 保留 display-only 导入预览里的缺失映射动作入口，把 `查看班级`、`新建课程`、`核对教师关系` 收到明细浮层里，避免回归前一天刚落地的预览修复能力。
4. 更新 `src/components/surfaces/teacher-schedule-surface.test.tsx`，把回归测试改成验证：
   - 紧凑班级优先视图。
   - hover / focus 才出现明细 tooltip。
   - 点击课程胶囊后出现快捷操作 toolbar。

## Verification

- `pnpm vitest run "src/components/surfaces/teacher-schedule-surface.test.tsx"`
- `pnpm exec eslint "src/components/surfaces/teacher-schedule-surface.tsx" "src/components/surfaces/teacher-schedule-week-grid.tsx" "src/components/surfaces/teacher-schedule-surface.test.tsx"`

## Key decisions

- 保持现有服务端 surface 的数据边界不变，只把主课表本身抽成 client 交互组件。
- hover 明细同时支持 keyboard focus，避免只服务鼠标用户。
- 选中态快捷操作面板锚定在课程卡内部，减少视线跳跃并保持表格密度。
