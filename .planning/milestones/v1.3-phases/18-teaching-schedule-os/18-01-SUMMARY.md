---
phase: 18-teaching-schedule-os
plan: 01
subsystem: foundation
tags: [schedule-contracts, drizzle-schema, cache-tags, architecture-boundary]
requires:
  - phase: 18-teaching-schedule-os
    provides: phase context, research baseline, schedule architecture decisions
provides:
  - shared schedule DTO and input contracts
  - SQLite schedule schema for import, normalized runtime, and audit layers
  - explicit cache tags for import, agenda, calendar, reminder, and assistant reads
affects: [schedule-dto, schedule-schema, cache-policy, phase-18-foundation]
tech-stack:
  added: []
  patterns: [three-layer schedule architecture, DTO-first contracts, explicit cache invalidation]
key-files:
  created:
    [.planning/phases/18-teaching-schedule-os/18-01-SUMMARY.md, src/lib/dto/schedule.ts]
  modified:
    [src/db/schema.ts, src/lib/cache-policy.ts]
key-decisions:
  - "课表系统固定采用 Import Layer -> Normalized Schedule Model -> Runtime Daily Agenda Engine 三层架构。"
  - "teacher-facing runtime DTO 不暴露 raw import payload，只暴露 review summary 与 runtime agenda 数据。"
  - "schedule cache 从第一天起就显式命名并通过 updateTag 失效，不依赖隐式缓存。"
patterns-established:
  - "Schedule DTO source of truth: all import, runtime, override, reminder, and assistant flows share src/lib/dto/schedule.ts."
  - "Schedule schema layering: import batch/row, normalized schedule, mutation audit, and proposal tables stay physically separated."
requirements-completed: [SCHEDULE-02, SCHEDULE-09]
duration: unknown
completed: 2026-05-10
---

# Phase 18 Plan 01: Foundation summary

**Phase 18 先把课表系统的基础边界锁死了：共享 DTO、Drizzle schema 和 cache tags 已经落地，后续导入、运行时日程、调课、提醒和 AI 建议都围绕同一套三层架构实现。**

## Performance

- **Duration:** unknown
- **Completed:** 2026-05-10
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- 新增 `src/lib/dto/schedule.ts`，统一导出 import row status、override action、reminder type/status、assistant proposal status、daily agenda DTO 和所有 server action 输入 schema。
- 扩展 `src/db/schema.ts`，新增 import batch/row、term、week pattern、bell slot、teaching assignment、recurring entry、override、holiday、reminder、mutation audit、assistant proposal 等完整课表表结构。
- 扩展 `src/lib/cache-policy.ts`，把 `scheduleImportBatch`、`scheduleImportSchool`、`teacherScheduleAgenda`、`classScheduleAgenda`、`scheduleCalendar`、`scheduleReminder`、`scheduleAssistantProposal` 全部纳入显式 tag contract。
- 按计划执行了 `npx drizzle-kit push`，让本地 SQLite schema 与代码保持一致，而不是只停留在 TypeScript 合同层。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `src/lib/dto/schedule.ts` - Phase 18 的单一 schedule contract 文件。
- `src/db/schema.ts` - 新增 import layer、normalized model、runtime support、audit 和 proposal 表。
- `src/lib/cache-policy.ts` - 新增 schedule 相关 cache tags。

## Decisions Made

- raw import rows 只能停留在 staging/import review 路径，teacher runtime surface 不直接消费 `scheduleImportRow`。
- override action 首发固定为 `substitute`、`cancel`、`move`，避免后续子计划再扩散动作集合。
- assistant 与 reminder 相关状态枚举在 foundation 阶段就固定下来，减少后续 action/DAL/UI 漂移。

## Deviations from Plan

- 无实质偏离。计划要求的 shared contract、schema 和 cache tag 已全部落地。

## Issues Encountered

- 无阻断问题；本轮主要风险在于 schema push 若遗漏会让后续计划只验证到静态类型，已通过执行 `npx drizzle-kit push` 规避。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `18-02` 可以直接基于 row status、approval state、source lineage 和 schedule tables 实现 staging review 流程。
- `18-03` 之后的 runtime agenda、override、reminder、assistant 都已经有统一 cache tag 和表结构可复用。

## Self-Check: PASSED

- Verified `pnpm typecheck`
- Verified `npx drizzle-kit push`

---

*Phase: 18-teaching-schedule-os*
*Completed: 2026-05-10*
