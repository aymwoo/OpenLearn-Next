---
phase: quick-260511-mdi
plan: 260511-mdi
subsystem: schedule-import
tags: [schedule, import, csv, template, route, react, vitest]
requires:
  - phase: quick-260511-ewp
    provides: schedule feature root, shared DTO contract, import review surface boundary
provides:
  - 基于现有导入 DTO 的单一 CSV 模板 contract
  - /teacher/schedule/import/template 下载 route
  - 导入审核页内联模板下载入口
affects: [teacher-schedule, schedule-import-review, csv-import]
tech-stack:
  added: []
  patterns: [feature-level template helper, route-only response wrapper, hero secondary CTA]
key-files:
  created:
    - src/features/schedule/import/template.ts
    - src/features/schedule/import/template.test.ts
    - src/app/(teacher)/teacher/schedule/import/template/route.ts
    - src/app/(teacher)/teacher/schedule/import/template/route.test.ts
  modified:
    - src/features/schedule/import/index.ts
    - src/components/surfaces/schedule-import-review-surface.tsx
    - src/components/surfaces/schedule-import-review-surface.test.tsx
key-decisions:
  - 模板列顺序直接固定映射到现有 ScheduleImportDraftRowInputSchema，避免 route 和 UI 重复手写字段。
  - 下载能力只交付 UTF-8 CSV route，不新增 xlsx、Server Action 或 DB 读取。
  - 模板入口放在现有导入审核 hero 的次级 CTA 中，保持教师端当前节奏与主审批动作不变。
patterns-established:
  - "Schedule import template pattern: columns + sampleRows + buildCsv() 由 feature helper 单点生成。"
  - "Template download route pattern: app route 只封装 headers/body，不内嵌业务常量。"
requirements-completed: []
duration: 2min
completed: 2026-05-11
---

# Quick Task 260511-mdi Summary

**教师课表导入页现在可直接下载与现有 DTO 严格一致的 CSV 模板，并附带合法中文示例行。**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-11T08:12:06Z
- **Completed:** 2026-05-11T08:14:14Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- 新增 feature 级模板 helper，统一输出列顺序、示例行与 CSV 文本。
- 新增 `/teacher/schedule/import/template` 下载 route，返回 UTF-8 CSV 附件。
- 在导入审核页 hero 增加“下载导入模板”入口，并保留原审批阻断逻辑回归覆盖。

## Task Commits

Each task was committed atomically:

1. **Task 1: 依据现有导入 contract 生成模板列与示例内容** - `03415f6` (feat)
2. **Task 2: 提供 /teacher/schedule/import/template 下载 route** - `13b15f1` (feat)
3. **Task 3: 在导入审核页接入最小模板下载入口并补回归** - `8600eb8` (feat)

## Files Created/Modified

- `src/features/schedule/import/template.ts` - 定义模板列、示例行与 CSV 生成函数。
- `src/features/schedule/import/template.test.ts` - 校验列顺序、示例合法性与 CSV 输出。
- `src/app/(teacher)/teacher/schedule/import/template/route.ts` - 返回模板下载响应。
- `src/app/(teacher)/teacher/schedule/import/template/route.test.ts` - 校验 route body 与 headers。
- `src/features/schedule/import/index.ts` - 暴露模板 helper 给 route 复用。
- `src/components/surfaces/schedule-import-review-surface.tsx` - 增加模板下载 CTA。
- `src/components/surfaces/schedule-import-review-surface.test.tsx` - 覆盖新链接和原审批禁用逻辑。

## Decisions Made

- 模板示例继续使用通用教学中文样例，不写入真实教师、班级或敏感数据。
- `weekday` 示例保持数值 `1`，明确与导入解析逻辑一致，而不是输出中文星期。
- `roomLabel` 保持可空列，但示例行提供非空值，便于教师理解填写方式。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 路由测试初次失败是 mock 调用次数累积导致；通过在测试中清理 mocks 修复。
- surface 测试初次失败是多次 render 未 cleanup 导致；补充 cleanup 后回归通过。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 教师现在可直接拿到与当前导入 contract 对齐的模板，适合继续做上传入口或手动导入验证。
- 模板 contract 已集中到 feature helper，后续 DTO 字段变更会先在定向测试中暴露。

## Self-Check

PASSED

- Found `src/features/schedule/import/template.ts`
- Found `src/features/schedule/import/template.test.ts`
- Found `src/app/(teacher)/teacher/schedule/import/template/route.ts`
- Found `src/app/(teacher)/teacher/schedule/import/template/route.test.ts`
- Found commit `03415f6`
- Found commit `13b15f1`
- Found commit `8600eb8`
