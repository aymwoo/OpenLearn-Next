---
phase: 32-end-to-end-hardening-and-milestone-proof
plan: 04
subsystem: ui
tags: [runtime-proof, classroom, inspector, demo-handoff, html-courseware]

# Dependency graph
requires:
  - phase: 29-runtime-host-and-html-courseware-pilot
    provides: canonical HTML runtime proof step and shared host path
  - phase: 31-transport-boundary-and-runtime-inspector
    provides: runtimeSessionId deep link and unified inspector timeline
provides:
  - launch surface proof discoverability for the seeded demo path
  - classroom-first proof confirmation and inspector drill-down CTA
  - explicit canonical runtime proof handoff documentation
affects: [phase-32-verification, runtime-proof, classroom, inspector]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - classroom-first proof feedback before inspector drill-down
    - runtimeSessionId-based second-step operator handoff
    - repo-local seeded demo handoff for milestone proof

key-files:
  created:
    - .planning/phases/32-end-to-end-hardening-and-milestone-proof/32-DEMO-HANDOFF.md
    - src/app/settings/labs/runtime-inspector/page.tsx
    - src/components/surfaces/runtime-inspector-surface.tsx
    - src/lib/dal/runtime-inspector.ts
  modified:
    - src/components/surfaces/classroom-launch-surface.tsx
    - src/components/classroom/classroom-control-panel.tsx
    - src/components/classroom/classroom-launch-panel.test.tsx
    - src/components/surfaces/runtime-inspector-surface.test.tsx
    - src/components/surfaces/classroom-console-surface.test.tsx
    - src/lib/dal/runtime-inspector.test.ts

key-decisions:
  - "把 canonical proof 发现入口收口在 /teacher/launch 的次级 affordance，不新增 dashboard。"
  - "把教师 proof 成功/异常第一反馈固定留在 /classroom，再通过 runtimeSessionId 跳到 inspector。"
  - "把 demo handoff 固定为 repo-local 文档，明确 bootstrap、账号、proof chain 与排障第二步。"

patterns-established:
  - "Pattern: launch surface 只增加次级 seeded proof 提示，不替代主 CTA。"
  - "Pattern: classroom control panel 负责 proof first-feedback，inspector 只做 second-step drill-down。"
  - "Pattern: runtime inspector hero 明确表达当前 proof 会话与统一 timeline。"

requirements-completed: [RHOST-04]

# Metrics
duration: 2 min
completed: 2026-05-16
---

# Phase 32 Plan 04: Productize proof affordances and demo handoff Summary

**Seeded runtime proof discoverability on launch, classroom-first confirmation, and explicit inspector drill-down handoff for the canonical HTML courseware demo.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-16T15:14:43Z
- **Completed:** 2026-05-16T15:17:12Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- 在 `/teacher/launch` 增加了 canonical seeded proof 的次级发现入口，同时保留
  **开启新课堂** 作为唯一主动作。
- 在 `/classroom` 明确了教师 first-feedback posture，可先确认 proof 成功或异常，
  再通过 `runtimeSessionId` 进入 inspector。
- 补齐了 repo-local `32-DEMO-HANDOFF.md`，把 bootstrap、测试账号、proof chain
  和排障第二步写成可直接执行的 handoff 文档。

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: proof affordance tests** - `29d3026` (test)
2. **Task 1 GREEN: launch/classroom/inspector proof affordances** - `904c1ed` (feat)
3. **Task 2: explicit demo handoff doc** - `866d4c6` (docs)

**Plan metadata:** 待本 Summary 与状态文件提交时生成。

## Files Created/Modified

- `src/components/surfaces/classroom-launch-surface.tsx` - 新增 seeded proof 演示提示。
- `src/components/classroom/classroom-control-panel.tsx` - 新增 classroom-first proof
  成功/异常提示与 inspector CTA。
- `src/components/classroom/classroom-launch-panel.test.tsx` - 锁定 launch discoverability。
- `src/components/surfaces/runtime-inspector-surface.tsx` - 强化“当前 proof 会话”与
  reviewable timeline 文案。
- `src/components/surfaces/runtime-inspector-surface.test.tsx` - 锁定 inspector hero 与
  timeline posture。
- `src/components/surfaces/classroom-console-surface.test.tsx` - 锁定 classroom first-feedback
  与 deep-link 姿态。
- `src/lib/dal/runtime-inspector.test.ts` - 补齐 classroom lane timeline 断言。
- `src/lib/dal/runtime-inspector.ts` - 作为 inspector read model 被纳入本计划回归覆盖。
- `src/app/settings/labs/runtime-inspector/page.tsx` - 作为独立 inspector route entry 纳入计划。
- `.planning/phases/32-end-to-end-hardening-and-milestone-proof/32-DEMO-HANDOFF.md` -
  提供 canonical proof handoff。

## Decisions Made

- Proof 发现入口只做在现有 launch surface 的次级信息块，避免形成第二主入口。
- `/classroom` 承担教师 proof 成功/异常的第一反馈，符合 classroom-first posture。
- Inspector 保持独立页面，只通过 `runtimeSessionId` 做第二步 drill-down。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Launch、classroom、inspector 与 handoff 文档已经具备 canonical proof 演示能力。
- Phase 32 仍需保留 `32-03` 的 `verify:phase32` canonical gate，之后再做 phase close。

## Self-Check: PASSED

- FOUND: `.planning/phases/32-end-to-end-hardening-and-milestone-proof/32-04-SUMMARY.md`
- FOUND: `.planning/phases/32-end-to-end-hardening-and-milestone-proof/32-DEMO-HANDOFF.md`
- FOUND: `src/components/surfaces/classroom-launch-surface.tsx`
- FOUND commit: `29d3026`
- FOUND commit: `904c1ed`
- FOUND commit: `866d4c6`

---

*Phase: 32-end-to-end-hardening-and-milestone-proof*
*Completed: 2026-05-16*
