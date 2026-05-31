---
phase: 60.2-close-gap-plug-01-chain-03-wire-frozen-voting-contract-into-
plan: "01"
subsystem: classroom-voting-frozen-contract
tags: [phase60.2, voting, pluginContract, launch-readiness, classroom, learning]
requirements_completed: [PLUG-01, CHAIN-03]
completed: 2026-05-28
status: verified
---

# Phase 60.2 Plan 01 Summary

## Accomplishments

- 在 `src/lib/dto/lesson-authoring.ts` 新增 frozen voting contract schema，并让 `src/lib/dto/classroom.ts` 与 `src/lib/dto/learning.ts` 的 snapshot DTO 正式透传 `pluginContract`。
- 在 `src/lib/dal/classroom.ts` 把 frozen contract 接入 launch/readiness、teacher voting round 聚合和 fallback 控制链，补上 `VOTING_PLUGIN_DISABLED` / `VOTING_PLUGIN_INCOMPATIBLE` gate。
- 在 `src/lib/dal/learning.ts` 与 `src/components/learning/quiz-step-card.tsx` 把 classroom voting 保持在既有 `quiz` 提交主链上，同时补齐 stable option id、`allowMultiple`、round closed 约束和 canonical evidence 回写。
- 在 `src/components/classroom/classroom-control-panel.tsx` 与 `src/actions/classroom-actions.ts` 中解除对 runtime descriptor 的硬依赖，让 classroom voting round 也能开始/结束并遵守 anonymous/live-results frozen contract。
- 补齐 action / DAL / component 回归测试，覆盖 launch blocker、teacher result surface、student submit 和 evidence write 的关键回归。

## Key Files

- `src/lib/dto/lesson-authoring.ts`
- `src/lib/dto/classroom.ts`
- `src/lib/dto/learning.ts`
- `src/lib/dal/classroom.ts`
- `src/lib/dal/learning.ts`
- `src/actions/classroom-actions.ts`
- `src/components/classroom/classroom-control-panel.tsx`
- `src/components/learning/quiz-step-card.tsx`

## Decisions Made

- `classroomVoting` 继续按 `QuizStepCard -> submitQuizAttemptAction -> submitQuizAttempt` 主链修复，不迁回 `submitRuntimeState()`。
- authoritative frozen truth 只认 published snapshot 中的 `snapshot.steps[].pluginContract`，launch/runtime/result surface 不再回看 draft authoring config。
- 对 `parseSnapshotSteps()` 只做增量透传，不改变既有 step 排序和 quiz/task/content 语义。
- teacher 投票轮次控制允许在没有 runtime descriptor 的 classroom voting 场景下通过 fallback action 落 canonical evidence。

## Verification

- `pnpm vitest run src/actions/classroom-actions.test.ts src/actions/learning-actions.test.ts src/components/classroom/classroom-launch-panel.test.tsx src/components/classroom/classroom-control-panel.test.tsx src/lib/dal/classroom.test.ts src/lib/dal/learning.test.ts` ✅ `147 passed`

## Residual Risks

- `60.2` 已闭合 frozen voting contract 消费缺口，但 milestone 仍不能关闭，因为 `60.1` 对应的 live rehearsal evidence 还未执行。
- 当前仓库工作树仍然很脏；本次 summary 只记录 `60.2` 目标范围内的变更和验证，不代表全仓库已可安全提交。

## Next Step

- 切换到 `60.1`，把 `phase60` 的 dry-run evidence 替换为 live rehearsal proof，然后重新跑 `v3.1` milestone audit。
