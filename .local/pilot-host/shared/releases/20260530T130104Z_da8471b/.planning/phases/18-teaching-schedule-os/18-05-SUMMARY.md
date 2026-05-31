---
phase: 18-teaching-schedule-os
plan: 05
subsystem: reminders
tags: [schedule-reminders, notification-boundary, delivery-state, teacher-center]
requires:
  - phase: 18-teaching-schedule-os
    provides: runtime agenda and schedule change events
provides:
  - first-release reminder rule orchestration
  - allowlisted reminder dispatch adapter
  - reminder center at /teacher/schedule/reminders
affects: [schedule-reminders-dal, schedule-reminder-actions, reminder-dispatch, schedule-reminder-surface, teacher-schedule-reminders-route]
tech-stack:
  added: []
  patterns: [allowlisted-dispatch, honest-delivery-state, limited-reminder-scope]
key-files:
  created:
    [.planning/phases/18-teaching-schedule-os/18-05-SUMMARY.md, src/lib/dal/schedule-reminders.ts, src/lib/dal/schedule-reminders.test.ts, src/actions/schedule-reminder-actions.ts, src/server/schedule/reminder-dispatch.ts, src/components/surfaces/schedule-reminder-surface.tsx, src/components/surfaces/schedule-reminder-surface.test.tsx, src/app/(teacher)/teacher/schedule/reminders/page.tsx]
  modified:
    []
key-decisions:
  - "首发 reminder 只覆盖开课前提醒与调课变更提醒。"
  - "delivery state 必须诚实表达为 planned、sent、failed、retry_required，不伪装成全部送达。"
  - "提醒分发继续走 server-only allowlisted adapter，不把 provider secret 或直接网络调用放进 UI 或 action。"
patterns-established:
  - "Reminder center pattern: limited reminder categories plus latest delivery state inside tonal secondary cards."
  - "Dispatch boundary pattern: schedule layer emits allowlisted reminder intents and delivery transitions, not provider-specific implementation details."
requirements-completed: [SCHEDULE-06, SCHEDULE-09]
duration: unknown
completed: 2026-05-10
---

# Phase 18 Plan 05: Reminder summary

**Phase 18 已经把课表提醒从概念字段落成了真实 orchestration：当前版本只支持开课前提醒和调课变更提醒，但已经具备规则保存、发送计划、发送结果和重试状态。**

## Performance

- **Duration:** unknown
- **Completed:** 2026-05-10
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- 新增 `src/lib/dal/schedule-reminders.ts`，实现 reminder rule 保存、latest delivery 汇总、dispatch retry 和 mutation audit。
- 新增 `src/server/schedule/reminder-dispatch.ts`，把 reminder dispatch 收敛到 allowlisted server-only adapter。
- 新增 `src/actions/schedule-reminder-actions.ts`，统一处理首发范围校验与 `scheduleReminder` tag invalidation。
- 新增 `ScheduleReminderSurface` 与 `/teacher/schedule/reminders`，清晰展示 `开课前提醒`、`调课变更提醒` 两类提醒及 `已计划`、`发送成功`、`发送失败`、`需重试` 等状态。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `src/lib/dal/schedule-reminders.ts` - reminder rule、delivery state 和 retry orchestration。
- `src/lib/dal/schedule-reminders.test.ts` - 覆盖 reminder type allowlist 与阻断行为。
- `src/actions/schedule-reminder-actions.ts` - reminder server actions 与结构化阻断返回。
- `src/server/schedule/reminder-dispatch.ts` - allowlisted dispatch adapter。
- `src/components/surfaces/schedule-reminder-surface.tsx` - reminder center UI。
- `src/components/surfaces/schedule-reminder-surface.test.tsx` - 覆盖首发两类提醒和 honest delivery state 展示。
- `src/app/(teacher)/teacher/schedule/reminders/page.tsx` - reminders route。

## Decisions Made

- reminder audience 和 type 继续严格限制在 teacher/class operator 及两类首发提醒，不扩到家长/学生广播。
- 最新执行状态直接回写到 delivery records，UI 不再展示模糊“已发送”假状态。
- reminder center 保持 secondary surface，不与日程主页争夺主舞台。

## Deviations from Plan

- 原计划在 verify 段落里写了 UI coverage 可能缺失，但实际实现已新增 `src/components/surfaces/schedule-reminder-surface.test.tsx`，因此本轮比计划多补了一层 reminder UI 回归覆盖。

## Issues Encountered

- reminder orchestration 需要守住首发边界，避免顺手扩成通用通知中心；当前通过 type/channel allowlist 和单独 dispatch adapter 把范围锁住了。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `18-06` 的 assistant/plugin extension 可以直接生成 `scheduleReminderDraft` proposal，而不是直接改 reminder runtime。
- reminder center 已具备 honest status 展示，后续若接入更多 channel 可以沿同一 delivery model 扩展。

## Self-Check: PASSED

- Verified `pnpm test --run src/lib/dal/schedule-reminders.test.ts`
- Verified `pnpm test --run src/components/surfaces/schedule-reminder-surface.test.tsx`

---

*Phase: 18-teaching-schedule-os*
*Completed: 2026-05-10*
