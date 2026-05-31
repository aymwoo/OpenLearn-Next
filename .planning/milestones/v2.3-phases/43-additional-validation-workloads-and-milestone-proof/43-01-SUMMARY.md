---
phase: 43-additional-validation-workloads-and-milestone-proof
plan: 01
subsystem: api
tags: [async-tasks, reminders, bullmq, drizzle, sqlite]
requires:
  - phase: 42-operator-visibility-and-recovery
    provides: operator-visible async recovery posture and worker runtime baseline
provides:
  - due-time reminder delivery async task family
  - durable scheduleReminderDispatch claim and task binding fields
  - worker sweep that claims due dispatches once across multi-worker environments
affects: [schedule reminders, async worker, operator recovery, milestone proof]
tech-stack:
  added: []
  patterns: [due-sweep claim then enqueue, business-truth delivery DTO projection, operator-only reminder recovery]
key-files:
  created: [drizzle/0007_phase43_scheduled_reminder_dispatch_claim.sql, drizzle/meta/0007_snapshot.json, src/features/async-tasks/worker/processors/schedule-reminder.ts, src/features/async-tasks/worker/processors/schedule-reminder.test.ts, src/features/schedule/reminders/server.test.ts]
  modified: [src/db/schema.ts, src/features/schedule/shared/dto/reminders.ts, scripts/prepare-dev-db.ts, src/features/async-tasks/server/registry.ts, src/features/async-tasks/server/registry.reliability.test.ts, src/features/async-tasks/worker/registry.ts, src/features/async-tasks/worker/bootstrap.ts, src/features/async-tasks/worker/bootstrap.test.ts, src/features/schedule/reminders/server.ts, src/features/schedule/reminders/actions.ts, src/components/surfaces/schedule-reminder-surface.tsx, src/components/surfaces/schedule-reminder-surface.test.tsx, drizzle/meta/_journal.json]
key-decisions:
  - "Reminder async task identity fixed to one scheduleReminderDispatch row, not rule-level aggregation."
  - "Due dispatch task creation stays in worker bootstrap sweep, not teacher save transaction."
  - "Teacher surface no longer offers reminder retry; failed recovery is operator-only."
patterns-established:
  - "Scheduled workload pattern: durable planned row -> atomic due claim -> enqueueAsyncTask -> worker processor -> business-status projection"
  - "Reminder DTO honest status pattern: planned / dispatching / sent / retry_required"
requirements-completed: [ATP-20]
duration: 20 min
completed: 2026-05-20
---

# Phase 43 Plan 01: Scheduled reminder async delivery summary

**Scheduled reminder dispatches now claim durably at due time, enqueue one `schedule.reminder_delivery` async task each, and project honest delivery status back to reminder business truth.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-05-20T09:40:00+08:00
- **Completed:** 2026-05-20T09:59:52+08:00
- **Tasks:** 1
- **Files modified:** 18

## Accomplishments
- 为 `scheduleReminderDispatch` 增加 claim / binding durable 字段，并生成 phase43 migration。
- 新增 `schedule.reminder_delivery` task family、worker processor、due sweep orchestration 与 focused tests。
- 把 teacher reminder surface 改成诚实展示系统接管/恢复状态，移除 feature-local retry。

## Task Commits

Each task was committed atomically:

1. **Task 1: 为 `scheduleReminderDispatch` 建立 due-time reminder task family 与系统触发边界** - `09646a2` (feat)

**Plan metadata:** 待本 SUMMARY commit

## Files Created/Modified
- `src/db/schema.ts` - 为 reminder dispatch 增加 actor / claim / task binding durable schema。
- `src/features/schedule/shared/dto/reminders.ts` - 扩展 honest reminder delivery status 与 async payload/result schema。
- `src/features/schedule/reminders/server.ts` - 保持 planned truth、实现 due claim/enqueue、投递结果投影。
- `src/features/async-tasks/server/registry.ts` - 注册 `schedule.reminder_delivery` task family。
- `src/features/async-tasks/worker/bootstrap.ts` - 增加 unref due-dispatch sweep loop。
- `src/features/async-tasks/worker/processors/schedule-reminder.ts` - parse payload、写 progress、委托 dispatch helper。
- `src/components/surfaces/schedule-reminder-surface.tsx` - 展示 dispatching / operator-only recovery posture。
- `drizzle/0007_phase43_scheduled_reminder_dispatch_claim.sql` - phase43 reminder dispatch claim migration。

## Decisions Made
- 一条 reminder delivery async task 绑定一条 `scheduleReminderDispatch`，不在 rule 保存时提前建 task。
- 多 worker 防重复采用 SQLite durable claim（状态 + claim 时间 + task binding），不是内存锁。
- provider send 结果通过 server helper 投影到 `scheduleReminderDispatch`，让 teacher/operator 继续消费业务 truth。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] 为历史 reminder dispatch 增加缺失 actor 的防御性兜底**
- **Found during:** Task 1
- **Issue:** 新 due sweep 需要 `actorId` 入队；旧数据或 bridge 失败时若无 actor，会导致 worker 无法合法创建 async task。
- **Fix:** schema 将 `actorId` 迁移为可 bridge 字段；migration 回填 `scheduleReminderRule.createdById`；runtime 遇到缺失 actor 时把 dispatch 诚实标成 `retry_required`。
- **Files modified:** `src/db/schema.ts`, `src/features/schedule/reminders/server.ts`, `drizzle/0007_phase43_scheduled_reminder_dispatch_claim.sql`, `drizzle/meta/0007_snapshot.json`
- **Verification:** `pnpm db:migrate`, `pnpm typecheck`, focused vitest suites
- **Committed in:** `09646a2`

**2. [Rule 3 - Blocking] 修正 drizzle 重复生成 `0008_*` migration 的编号漂移**
- **Found during:** Task 1 verification
- **Issue:** 重新执行 `drizzle-kit generate` 时因 snapshot/journal 与当前 schema 漂移，生成了不符合计划命名的重复 `0008_phase43_scheduled_reminder_dispatch_claim`。
- **Fix:** 对齐 `0007_snapshot.json` 的 actor nullable 元数据，清理 `0008_*` 产物与 journal 项，保留计划要求的 `0007_*` 为唯一有效迁移。
- **Files modified:** `drizzle/meta/0007_snapshot.json`, `drizzle/meta/_journal.json`
- **Verification:** 再次运行 `drizzle-kit generate --name phase43_scheduled_reminder_dispatch_claim` 不再需要保留 `0008_*` 结果；`pnpm db:migrate` 通过
- **Committed in:** `09646a2`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** 都是为保证 migration correctness 与 due-time enqueue correctness 的必要修复，无额外 scope creep。

## Issues Encountered
- Context7 MCP API key 不可用，按执行器要求改用 `ctx7` CLI fallback 查询 BullMQ delayed jobs 文档。
- `gitnexus detect-changes --scope staged` 报 HIGH risk，但 blast radius 实际集中在 reminder save/surface/worker 链路，未扩散到课堂主链路或 auth。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Reminder scheduled workload 已接入统一 async contract，可作为 Phase 43 proof matrix 的 scheduled slice。
- 后续 43-02 / 43-03 可继续复用「durable business row -> enqueue seam -> worker processor -> honest DTO projection」模式。

## Self-Check: PASSED
- FOUND: `.planning/phases/43-additional-validation-workloads-and-milestone-proof/43-01-SUMMARY.md`
- FOUND: task commit `09646a2`

---
*Phase: 43-additional-validation-workloads-and-milestone-proof*
*Completed: 2026-05-20*
