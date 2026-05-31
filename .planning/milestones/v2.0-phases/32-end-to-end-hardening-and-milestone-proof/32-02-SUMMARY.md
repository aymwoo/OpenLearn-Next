---
phase: 32-end-to-end-hardening-and-milestone-proof
plan: 02
subsystem: runtime-platform
tags: [runtime-platform, runtime-host, html-courseware, player, recovery]
requires:
  - phase: 32-01-deterministic-proof-foundation
    provides: canonical runtime proof seed, runtimeSessionId truth, classroom proof summary fields
provides:
  - terminal submit posture for shared runtime host and local html runtime pilot
  - same-surface save and submit failure recovery with retry current action
  - player-shell-safe recovery posture that preserves reconnect and snapshot fallback banners
affects: [32-03-verify-phase32, 32-04-demo-handoff, student-player, runtime-host]
tech-stack:
  added: []
  patterns:
    - shared host distinguishes submit-success from save-failed and submit-failed states
    - local runtime pilot consumes host result envelopes to lock UI after submit success
    - player shell owns failure recovery CTA while reconnect and snapshot fallback stay in shell scope
key-files:
  created: []
  modified:
    - src/features/runtime-platform/host/runtime-host-client.tsx
    - src/features/runtime-platform/host/runtime-host-frame.tsx
    - src/app/runtime/html-courseware/pilot/page.tsx
    - src/components/learning/classroom-runtime-client.tsx
    - src/lib/dto/learning.ts
    - src/features/runtime-platform/host/runtime-host.test.tsx
    - src/components/surfaces/student-player-surfaces.test.ts
key-decisions:
  - "submit success 固定进入 terminal locked state，并通过 proof summary 在 runtime 内显示完成确认。"
  - "save 或 submit 失败保持在当前 runtime surface，并把主恢复动作固定为重试刚才的操作。"
  - "reconnect 与 snapshot fallback banner 继续由 player shell 承载，不把失败恢复跳转到 inspector。"
patterns-established:
  - "Terminal posture pattern: host result envelope -> pilot terminal state -> disable save and submit"
  - "Recovery posture pattern: player shell failure CTA -> retry current action -> keep same-surface context"
requirements-completed: [RHOST-04]
duration: 4min
completed: 2026-05-16
---

# Phase 32 Plan 02: Terminal posture and recovery summary

**HTML runtime submit terminal state with locked student UI, structured proof summary, and same-surface failure recovery.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-16T14:57:02Z
- **Completed:** 2026-05-16T15:01:29Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- shared Runtime Host 现在明确区分 `submit-success`、`save-failed` 与 `submit-failed`，不再把所有失败塌成通用 error。
- 本地 HTML runtime pilot 在 submit 成功后进入明确完成态，展示结构化摘要，并彻底禁用保存与再次提交。
- 学生播放器在 save 或 submit 失败时保留当前学习上下文，显示失败说明与“重试刚才的操作” CTA，同时保留现有 reconnect / snapshot fallback banner。

## Task commits

Each task was committed atomically:

1. **Task 1: 在 shared host 与 pilot runtime 中实现 terminal submit posture**
   - `9d3baad` (`test`) RED: add failing tests for terminal runtime submit posture
   - `252219b` (`feat`) GREEN: lock runtime UI after successful submit
2. **Task 2: 在 player shell 中实现显式失败恢复与重试当前动作**
   - `8eecd73` (`test`) RED: add failing tests for same-surface runtime recovery
   - `4e977e9` (`feat`) GREEN: keep runtime recovery inside player surface

**Plan metadata:** synchronized through the final docs commit that records `SUMMARY.md`, `STATE.md`, and roadmap progress.

## Files created/modified

- `src/features/runtime-platform/host/runtime-host-client.tsx` - 扩展 shared host 状态机，区分 terminal success 与 retryable failure。
- `src/features/runtime-platform/host/runtime-host-frame.tsx` - 增加 `save-failed` / `submit-failed` frame status 语义。
- `src/app/runtime/html-courseware/pilot/page.tsx` - 消费 host result envelope，在 submit 成功后锁定编辑区并展示本次提交摘要。
- `src/components/learning/classroom-runtime-client.tsx` - 在 player shell 中渲染失败恢复卡片，并把重试当前动作留在同一学习 surface。
- `src/lib/dto/learning.ts` - 为学生 runtime state 增加 `lastFailedAction` 本地恢复状态字段。
- `src/features/runtime-platform/host/runtime-host.test.tsx` - 锁定 terminal submit posture 与 pilot locked UI。
- `src/components/surfaces/student-player-surfaces.test.ts` - 锁定 failure copy、retry CTA 与 same-surface recovery posture。

## Decisions made

- submit 成功后的完成态必须留在 runtime 页面内显式呈现，而不是只依赖瞬时 toast。
- failure recovery 只记录在 host/client local state，不新增服务端 truth path，符合计划限定。
- player shell 继续作为 reconnect 与 snapshot fallback 的单一承载面，避免 proof 失败时 route bounce。

## Deviations from plan

None - plan executed exactly as written.

## Issues encountered

- None.

## User setup required

None - no external service configuration required.

## Known stubs

None.

## Self-Check: PASSED

- Found `32-02-SUMMARY.md` and the key implementation files referenced in this summary.
- Verified task commits `9d3baad`, `252219b`, `8eecd73`, and `4e977e9` exist in git history.
- Confirmed `STATE.md` recorded Phase 32 Plan 02 metrics and session-tracking fields.

## Next phase readiness

- `verify:phase32` 现在可以直接断言 terminal submit posture、save-after-submit 禁止、failure copy 和 retry CTA。
- demo handoff 已具备稳定 student runtime 完成态与恢复态语义，后续可继续补 classroom / inspector 的产品化 affordance。
