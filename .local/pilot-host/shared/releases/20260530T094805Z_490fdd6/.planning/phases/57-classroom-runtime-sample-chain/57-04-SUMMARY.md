---
phase: 57-classroom-runtime-sample-chain
plan: "04"
subsystem: ui
tags: [teacher-aggregate, incomplete-roster, frozen-results, recovery-actions, classroom-shell]
requires:
  - phase: 57-classroom-runtime-sample-chain
    plan: "02"
    provides: durable round truth and teacher control chain
  - phase: 57-classroom-runtime-sample-chain
    plan: "03"
    provides: latest valid voting submission semantics and reconnect-safe read seam
provides:
  - authoritative voting aggregate on classroom snapshot
  - incomplete roster with minimal status tokens
  - folded named results and frozen result view after teacher end
  - current-round recovery actions inside the existing classroom shell
affects: [phase-57-05, teacher-control, classroom-roster, classroom-runtime]
tech-stack:
  added: []
  patterns: [snapshot-owned voting aggregate, folded named detail, recovery-action via runtime teacher control envelope]
key-files:
  created:
    - .planning/phases/57-classroom-runtime-sample-chain/57-04-SUMMARY.md
  modified:
    - src/lib/dto/classroom.ts
    - src/lib/dal/classroom.ts
    - src/actions/classroom-actions.ts
    - src/components/classroom/classroom-control-panel.tsx
    - src/components/classroom/classroom-roster-panel.tsx
    - src/lib/dal/classroom.test.ts
    - src/actions/classroom-actions.test.ts
    - src/components/classroom/classroom-control-panel.test.tsx
    - src/components/classroom/classroom-roster-panel.test.tsx
key-decisions:
  - "teacher result surface 继续只消费 snapshot read-model，不在浏览器端重放 raw classroom events。"
  - "最小 recovery actions 复用 runtime teacher control envelope，不新造独立 operator route 或页面。"
patterns-established:
  - "Pattern 1: currentVotingRound 承担 aggregate、incompleteStudents、namedResults、failureCopy、recoveryActions 的 teacher-first 结果合同。"
  - "Pattern 2: roster panel 与 control panel 共享同一 incomplete roster truth，避免双份聚合逻辑。"
requirements-completed: [CHAIN-05, PLUG-03, D-57-13, D-57-14, D-57-15, D-57-16]
duration: 38min
completed: 2026-05-25
---

# Phase 57 Plan 04: Teacher aggregate and recovery surface Summary

**Teacher classroom shell now shows authoritative voting aggregates, incomplete roster, folded named results, frozen end-of-round view, and current-round recovery actions without leaving the existing control surface**

## Performance

- **Duration:** 38 min
- **Started:** 2026-05-25T10:35:00Z
- **Completed:** 2026-05-25T11:13:17Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- 扩展 `ClassroomVotingRoundDTOSchema`，让 snapshot 直接承载 option aggregates、incomplete roster、folded named results、failure consequence copy 和 recovery actions。
- 在 `buildClassroomSnapshotDTOForActor()` 中从 published voting step + system round artifact + latest student submissions 聚合 teacher-first result view，并在 round 关闭后冻结结果。
- 在 `ClassroomControlPanel` 内按 `实时汇总 -> 未完成名单 -> 实名结果 -> 恢复动作` 的顺序展示结果区，实名结果默认折叠。
- 在 `ClassroomRosterPanel` 复用同一 read-model 展示未完成名单和“全班已提交”空状态。
- 新增 `runCurrentVotingRecoveryAction()`，把 retry / reconcile / suspend / fallback 收敛到既有 runtime teacher control action 主链。
- focused suite 通过：`pnpm vitest run src/lib/dal/classroom.test.ts src/actions/classroom-actions.test.ts src/components/classroom/classroom-control-panel.test.tsx src/components/classroom/classroom-roster-panel.test.tsx`

## Task Commits

No git commits were created during this execution batch.

## Files Created/Modified

- `src/lib/dto/classroom.ts` - 为 current voting round 增加 aggregate、incomplete、named result 与 recovery action 字段。
- `src/lib/dal/classroom.ts` - 从 authoritative classroom truth 聚合 current voting round result surface，并识别 failed runtime proof。
- `src/actions/classroom-actions.ts` - 新增 current-round recovery action server action，复用 runtime teacher control envelope。
- `src/components/classroom/classroom-control-panel.tsx` - 渲染 teacher aggregate、未完成名单、折叠实名结果和恢复动作。
- `src/components/classroom/classroom-roster-panel.tsx` - 渲染当前 voting round 的未完成名单或全班已提交空状态。
- `src/lib/dal/classroom.test.ts` - 覆盖 aggregate/incomplete/frozen/failure/recovery DTO 断言。
- `src/actions/classroom-actions.test.ts` - 覆盖 recovery action dispatch / invalidation。
- `src/components/classroom/classroom-control-panel.test.tsx` - 覆盖结果顺序、折叠实名结果和 recovery action dispatch。
- `src/components/classroom/classroom-roster-panel.test.tsx` - 覆盖未完成名单状态 token 与已全部提交空状态。

## Decisions Made

- option 聚合继续依赖 published quiz payload 中冻结的 options 顺序，不回读草稿 authoring truth。
- failure consequence 先使用已有 runtime proof/status truth 诚实暴露到 teacher 面板，不在本阶段扩成更重的 operator taxonomy surface。
- recovery actions 只保证进入现有 classroom action / cache invalidation 主链；更完整的 operator surface 留到 Phase 58。

## Deviations from Plan

None - plan goal completed with the intended minimal classroom-shell implementation.

## Issues Encountered

- 结果区新增后，测试初版因同文案在多个面板复用而出现重复匹配；已调整断言方式，产品结构未变。
- `recordRuntimeTeacherControl()` 需要完整 runtime teacher control envelope；`runCurrentVotingRecoveryAction()` 已补齐 version/sentAt/capabilityContext 后复用现有主链。

## User Setup Required

None - no external setup required.

## Next Phase Readiness

- `57-05` 现在可以在已有 aggregate / recovery / submit semantics 基线上补 `verify:phase57` 和 `proof:phase57` 硬门。
- browser/UAT gate 已有可验证的 teacher-first result surface，不再缺 aggregate/incomplete/failure/recovery 基线。

---
*Phase: 57-classroom-runtime-sample-chain*
*Completed: 2026-05-25*
