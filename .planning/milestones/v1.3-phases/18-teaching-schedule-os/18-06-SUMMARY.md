---
phase: 18-teaching-schedule-os
plan: 06
subsystem: assistant-and-plugins
tags: [schedule-assistant, plugin-allowlist, proposal-only, phase-verifier]
requires:
  - phase: 18-teaching-schedule-os
    provides: import review, runtime agenda, override operations, reminder orchestration
provides:
  - proposal-only schedule assistant flows
  - allowlisted schedule plugin extension points
  - dedicated verify:phase18 command
affects: [schedule-assistant-dal, schedule-assistant-actions, schedule-assistant-surface, plugin-registry, plugin-dal, resource-ai, phase-18-verifier]
tech-stack:
  added: []
  patterns: [proposal-only assistant, allowlisted schedule plugin actions, focused phase verifier]
key-files:
  created:
    [.planning/phases/18-teaching-schedule-os/18-06-SUMMARY.md, src/lib/dal/schedule-assistant.ts, src/lib/dal/schedule-assistant.test.ts, src/actions/schedule-assistant-actions.ts, src/components/surfaces/schedule-assistant-surface.tsx, src/app/(teacher)/teacher/schedule/assistant/page.tsx, scripts/verify-phase18-schedule.ts]
  modified:
    [src/lib/dto/resource-ai.ts, src/server/plugins/registry.ts, src/lib/dal/plugins.ts, package.json]
key-decisions:
  - "AI 助手只能产出 import mapping、conflict explanation、override suggestion 三类 proposal，不直接写 runtime schedule。"
  - "plugin 扩展只允许 createScheduleOverrideProposal、createScheduleReminderDraft、annotateScheduleConflict 等 proposal-only 动作。"
  - "Phase 18 通过 verify:phase18 固定校验 raw-row leakage、direct db import、unsafe pattern 和 proposal-only 边界。"
patterns-established:
  - "Schedule assistant pattern: approval may create draft payloads, but runtime mutations still require the normal human-confirmed schedule action path."
  - "Schedule plugin safety pattern: allowlisted actions dispatch through existing plugin registry and audit chain, returning typed proposal payloads only."
requirements-completed: [SCHEDULE-07, SCHEDULE-08, SCHEDULE-09]
duration: unknown
completed: 2026-05-10
---

# Phase 18 Plan 06: Assistant and plugin summary

**Phase 18 最后一段把 AI 助手和插件扩展收口到了 proposal-only 安全边界：系统现在可以生成课表建议和插件草案，但任何真正的课表变更仍然必须经过人工确认和原有 mutation path。**

## Performance

- **Duration:** unknown
- **Completed:** 2026-05-10
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 新增 `src/lib/dal/schedule-assistant.ts` 和 `src/actions/schedule-assistant-actions.ts`，实现 import mapping、conflict explanation、override suggestion 三类 proposal-only assistant flow。
- 新增 `ScheduleAssistantSurface` 与 `/teacher/schedule/assistant`，把建议呈现为需要人工审阅的 proposal cards，而不是自动执行器。
- 扩展 `src/lib/dto/resource-ai.ts`、`src/server/plugins/registry.ts`、`src/lib/dal/plugins.ts`，加入 schedule-specific proposal payload 和 allowlisted plugin actions。
- 新增 `scripts/verify-phase18-schedule.ts`，并在 `package.json` 注册 `pnpm verify:phase18`，把 schedule 三层架构和安全边界固化为可执行检查。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `src/lib/dal/schedule-assistant.ts` - proposal-only assistant DAL。
- `src/lib/dal/schedule-assistant.test.ts` - 覆盖 proposal types 与 direct-write 禁止。
- `src/actions/schedule-assistant-actions.ts` - assistant create/approve/reject actions 与 `SCHEDULE_ASSISTANT_APPROVAL_BLOCKED`。
- `src/components/surfaces/schedule-assistant-surface.tsx` - assistant proposal UI。
- `src/app/(teacher)/teacher/schedule/assistant/page.tsx` - assistant route。
- `src/lib/dto/resource-ai.ts` - 新增 schedule proposal payload 和 plugin result typing。
- `src/server/plugins/registry.ts` - 新增 schedule proposal allowlist。
- `src/lib/dal/plugins.ts` - 复用现有 plugin safety 链路承接 schedule assistant anchor。
- `scripts/verify-phase18-schedule.ts` - Phase 18 verifier。
- `package.json` - 注册 `verify:phase18`。

## Decisions Made

- assistant approval 最多只创建 draft payload 或变更建议，不直接插入 `scheduleOverride` 或 `scheduleRecurringEntry`。
- plugin action allowlist 继续沿用现有 registry + permission + audit 流程，不新增旁路。
- verify script 继续采用“静态守卫 + focused regression suite”的轻量模式，便于提交前重复执行。

## Deviations from Plan

- 无实质偏离。assistant、plugin allowlist 和 verifier 都已完成。

## Issues Encountered

- 最大风险是 assistant/plugin 很容易滑向直接改课表；当前通过 proposal status、typed payload、allowlist 和 verifier 四层约束把边界锁住了。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 18 已具备独立验证入口，可在提交或 PR 前反复执行 `pnpm verify:phase18`。
- 后续如果扩 schedule assistant 或 plugin，只能沿 proposal-only contract 增量前进，不应绕过当前 verifier。

## Self-Check: PASSED

- Verified `pnpm test --run src/lib/dal/schedule-assistant.test.ts`
- Verified `pnpm verify:phase18`

---

*Phase: 18-teaching-schedule-os*
*Completed: 2026-05-10*
