---
phase: quick-260511-nuf
plan: 0
subsystem: schedule
tags: [import, csv, schedule, bell-slot, dto, validation]

# Dependency graph
requires: []
provides:
  - 课程表导入模板支持自定义上课时间字段（bellSlotStartTime/bellSlotEndTime）
  - ensureBellSlot 优先使用导入时间，否则自动计算
  - DTO 层新增 HH:mm 格式校验
affects: [schedule, import, bell-slot]

# Tech tracking
tech-stack:
  added: [zod HH:mm regex validation]
  patterns: [optional import field with fallback auto-calculation]

key-files:
  created:
    - src/features/schedule/import/server.test.ts
  modified:
    - src/features/schedule/shared/dto/import.ts
    - src/features/schedule/import/template.ts
    - src/features/schedule/import/template.test.ts
    - src/features/schedule/import/server.ts
    - src/app/(teacher)/teacher/schedule/import/template/route.test.ts

key-decisions:
  - 时间字段为选填，保持与现有 bellSlotLabel 字段的松耦合关系
  - DTO 层统一校验 HH:mm 格式（正则：`/^([01]\d|2[0-3]):([0-5]\d)$/`）
  - ensureBellSlot 接受可选时间参数，有值则直接使用，无值走 sortOrder 自动计算

patterns-established: []

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-05-11
---

# Quick Task 260511-nuf: 课表导入时间字段扩展 Summary

**在课程表导入模板中新增 bellSlotStartTime 和 bellSlotEndTime 字段，支持教师直接指定上课时间，减少课后手动调整 bell slot 的操作。**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-11T09:13:52Z
- **Completed:** 2026-05-11T09:21:xxZ
- **Tasks:** 3
- **Files modified:** 5 created, 1 modified (unrelated surface change)

## Accomplishments

- DTO 新增 `bellSlotStartTime` 和 `bellSlotEndTime` 可选字段，带 HH:mm 格式校验
- 导入模板 CSV 新增"上课开始时间"、"上课结束时间"两列，示例值 08:00 / 08:45
- `ensureBellSlot` 支持使用导入行提供的时间，未提供时保持现有 sortOrder 自动计算逻辑
- 中文字段映射表 SCHEDULE_IMPORT_COLUMN_MAP 同步新增两项
- 新增 server.test.ts 覆盖时间字段验证与解析逻辑
- 所有相关测试通过（14 tests, 3 files）

## Task Commits

Each task was committed atomically:

1. **Task 1: 在 DTO 和模板中新增时间字段** - `b1a320a` (feat)
2. **Task 2: 修改 server 写入逻辑使用导入时间** - `0381457` (feat)
3. **Task 3: 更新 actions 层映射与 route 测试** - `740f867` (test)

**Plan metadata:** `ddf5bdc` (docs: pre-dispatch plan)

## Files Created/Modified

- `src/features/schedule/shared/dto/import.ts` - ScheduleImportDraftRowInputSchema 新增 bellSlotStartTime/bellSlotEndTime 字段（可选，HH:mm 正则校验）
- `src/features/schedule/import/template.ts` - 模板列、中文表头、映射表、示例行新增时间字段
- `src/features/schedule/import/template.test.ts` - 测试覆盖新字段的 CSV 输出与 Schema 解析
- `src/features/schedule/import/server.ts` - ensureBellSlot 接受可选 startTime/endTime 参数；normalizedDraftJson 透传时间字段
- `src/features/schedule/import/server.test.ts` - 时间字段验证与 resolve 逻辑测试（新建）
- `src/app/(teacher)/teacher/schedule/import/template/route.test.ts` - mock 与断言更新以覆盖新列

## Decisions Made

- 时间字段为选填（`.nullable().optional()`），允许教师不指定而走现有自动计算
- HH:mm 格式校验在 DTO 层完成（正则：`/^([01]\d|2[0-3]):([0-5]\d)$/`），时间格式不对时 Zod 抛错
- `ensureBellSlot` 签名扩展为接受可选参数，不破坏现有调用路径

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - 所有任务一次性通过。

## Next Phase Readiness

- 课表导入模块已支持自定义上课时间，可直接供后续 schedule 优化计划使用
- 新增的 server.test.ts 为后续 bell slot 相关测试提供了基础

---
*Phase: quick-260511-nuf*
*Completed: 2026-05-11*