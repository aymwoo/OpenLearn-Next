---
phase: 57-classroom-runtime-sample-chain
plan: "02"
subsystem: classroom-runtime
tags: [teacher-control, voting-round, runtime, forced-focus, snapshot]
requires:
  - phase: 57-classroom-runtime-sample-chain
    plan: "01"
    provides: shared voting round DTO shell and student runtime waiting-state contract
provides:
  - teacher start/end voting round control inside the existing classroom control chain
  - durable voting round truth persisted as system classroom evidence artifacts
  - student forced-focus via existing classroom snapshot/runtime shell consumption
affects: [phase-57-03, phase-57-04, classroom-runtime, student-player, teacher-control]
tech-stack:
  added: []
  patterns: [system artifact as round truth, snapshot-derived round state, websocket-first with canonical fallback]
key-files:
  created:
    - .planning/phases/57-classroom-runtime-sample-chain/57-02-SUMMARY.md
  modified:
    - src/features/runtime-platform/contracts/bridge.ts
    - src/features/runtime-platform/classroom/runtime-session.ts
    - src/lib/dal/classroom.ts
    - src/lib/dal/learning.ts
    - src/components/classroom/classroom-control-panel.tsx
    - src/components/learning/classroom-runtime-client.tsx
    - src/components/classroom/classroom-control-panel.test.tsx
    - src/components/learning/classroom-runtime-client.test.tsx
key-decisions:
  - "voting round durable truth 继续落在已有 classroomEvidence，以 sourceType: system / evidenceType: artifact 承载，不新建重型 round state 表。"
  - "student forced-focus 继续走既有 snapshot -> runtime shell 链，不新增第二套 runtime 页面或独立 modal。"
  - "teacher round control 继续保持 websocket-first，fallback 仍走 canonical server action。"
patterns-established:
  - "Pattern 1: runtime teacher control 的 durable side effect 先写 artifact，再继续复用 runtime transport event。"
  - "Pattern 2: classroom snapshot 通过 system artifact 派生 currentVotingRound，student personal/runtime client 只消费 DTO。"
requirements-completed: [D-57-05, D-57-06, D-57-07]
duration: 24min
completed: 2026-05-25
---

# Phase 57 Plan 02: Teacher voting round control Summary

**Teacher can now start and end the current voting round from the existing classroom control chain, with durable round truth and student forced-focus staying inside the existing runtime shell**

## Performance

- **Duration:** 24 min
- **Started:** 2026-05-25T09:40:00Z
- **Completed:** 2026-05-25T10:04:26Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- 扩展 `RuntimeTeacherControlRequestSchema.command`，把 `start-voting-round` / `end-voting-round` 正式并入 runtime teacher control 合同。
- 在 `recordTeacherControlEvent()` 中为开始/结束投票写入 `classroomEvidence` system artifact，形成 SQLite durable round truth。
- 在 `buildClassroomSnapshotDTOForActor()` 中从 system artifact 派生 `currentVotingRound`，并给 teacher/student 复用同一 read-model。
- 在 `getStudentPlayerPersonalDTO()` 与 `ClassroomRuntimeClient` 中把 current voting round 映射到既有 forced-focus / waiting-state UI。
- 在 `ClassroomControlPanel` 中加入“开始本轮投票 / 结束本轮投票”按钮，并保持 websocket-first + fallback 行为。
- 目标测试通过：`pnpm vitest run src/actions/classroom-actions.test.ts src/components/classroom/classroom-control-panel.test.tsx src/components/learning/classroom-runtime-client.test.tsx`

## Task Commits

No git commits were created during this execution batch.

## Files Created/Modified

- `src/features/runtime-platform/contracts/bridge.ts` - 新增 voting round teacher control commands。
- `src/features/runtime-platform/classroom/runtime-session.ts` - teacher control 落 durable round artifact。
- `src/lib/dal/classroom.ts` - snapshot 从 system artifact 派生 `currentVotingRound`。
- `src/lib/dal/learning.ts` - student runtime personal DTO 消费 voting round 并收敛到 forced-focus / waiting copy。
- `src/components/classroom/classroom-control-panel.tsx` - teacher control 区加入开始/结束本轮投票按钮。
- `src/components/learning/classroom-runtime-client.tsx` - student runtime 显示 round 状态横幅并沿既有链路聚焦当前 voting step。
- `src/components/classroom/classroom-control-panel.test.tsx` - 覆盖 voting round control fallback。
- `src/components/learning/classroom-runtime-client.test.tsx` - 覆盖 durable snapshot parity 后的 round 状态消费。

## Decisions Made

- round artifact 只记录最小 authoritative fields：`kind`、`stepId`、`stepTitle`、`version`、`openedAt` / `closedAt`、`closedByTeacherId`、`runtimeCommand`。
- current voting round 的 teacher/student UI 都继续依赖 snapshot，而不是消费 transport-only memory state。
- 这一轮只实现 start/end + forced-focus，不提前把 submit cutoff / same-payload dedupe 混入 57-02。

## Deviations from Plan

None - plan goal completed with the intended minimal implementation shape.

## Issues Encountered

- control panel 的 voting buttons 初版因为放在 per-step 区域导致测试出现重复匹配；已通过测试断言收敛并保持现有 UI 位置。
- student runtime 初版只消费 locked/activeStep，未消费 `currentVotingRound`；已在 `applySnapshot()` 内补齐 round-to-runtime 映射。

## User Setup Required

None - no external setup required.

## Next Phase Readiness

- `57-03` 可以基于同一 round truth 继续做 submit overwrite / same-payload dedupe / teacher-ended cutoff。
- `57-04` 可以继续在 teacher 视图聚合 `currentVotingRound` 与 incomplete roster / frozen result。

---
*Phase: 57-classroom-runtime-sample-chain*
*Completed: 2026-05-25*
