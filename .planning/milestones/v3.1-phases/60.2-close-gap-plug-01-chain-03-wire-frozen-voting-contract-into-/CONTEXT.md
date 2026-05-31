# Phase 60.2: Close gap PLUG-01 / CHAIN-03 - Context

**Gathered:** 2026-05-28
**Status:** Ready for implementation

<domain>
## Phase Boundary

本次 closure phase 只修 milestone audit 中已经确认的 frozen voting contract 消费断点：
- publish 冻结后的 `snapshot.steps[].pluginContract` 必须进入 classroom / learning 读模型；
- classroom launch/readiness 必须按 frozen voting contract 做 runtime readiness gate；
- teacher result surface 与 student submit 语义必须遵守 frozen contract，而不是再回看 authoring draft。

本阶段不重做 authoring UI，不把 `classroomVoting` 强行迁成 runtime step，不处理 Phase 60 live rehearsal 证据，也不扩展 operator recovery 边界。
</domain>

<decisions>
## Locked Decisions

- **D-60.2-01:** `classroomVoting` 继续按当前 `QuizStepCard -> submitQuizAttemptAction -> submitQuizAttempt` 主链修复，不切回 `submitRuntimeState()` 主修线。
- **D-60.2-02:** frozen voting truth 只认 published snapshot 中的 `step.pluginContract`；launch/runtime/result surface 不得回读 draft plugin extension。
- **D-60.2-03:** 对 `parseSnapshotSteps()` 仅做增量透传，不改变既有 step 排序、主字段结构和旧 quiz/task/content 语义。
- **D-60.2-04:** teacher 的 `start-voting-round` / `end-voting-round` 必须在 classroom shell 中可用，即使当前 step 没有 runtime descriptor，也要能落 canonical evidence。
- **D-60.2-05:** teacher result surface 必须遵守 frozen contract：
  - `anonymousResults=true` 时不得展示实名结果；
  - `showLiveResults=false` 且轮次仍为 `live` 时不得展示汇总票数；
  - `resultsDisplay` 先至少进入 DTO/copy，确保 surface 不再忽略 contract；
  - `allowMultiple` 决定 student 可提交单选还是多选。
</decisions>

<canonical_refs>
## Canonical References

- `.planning/v3.1-MILESTONE-AUDIT.md` — gap 原因与 close blocker 权威来源。
- `.planning/REQUIREMENTS.md` — `PLUG-01`、`CHAIN-03` requirement truth。
- `.planning/phases/56-voting-plugin-contract-and-authoring-integration/56-VERIFICATION.md` — 已锁定 publish freeze truth。
- `.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md` — 原课堂运行链决策与交接。
- `src/lib/dal/lesson-authoring.ts` — frozen contract 写入点。
- `src/lib/dal/classroom.ts` — launch/readiness、teacher snapshot/result 聚合、teacher control。
- `src/lib/dal/learning.ts` — student runtime read model 与 quiz submit 写链。
- `src/components/classroom/classroom-control-panel.tsx` — teacher result / round control surface。
- `src/components/learning/quiz-step-card.tsx` — 当前 classroom voting 学生提交入口。
</canonical_refs>

<code_context>
## Existing Code Insights

- `lesson-authoring.ts` 已在 publish 时把 `VotingExecutableContract` 冻结到 `snapshot.steps[].pluginContract`。
- `classroom.ts` 与 `learning.ts` 当前各自的 `parseSnapshotSteps()` 都会丢弃 `pluginContract`。
- `launchClassroomSession()` 只校验 lesson/class/roster/publishedVersion，不校验 voting plugin frozen readiness。
- `buildVotingRoundState()` 当前默认总是输出汇总票数与实名结果，没有读取 `anonymousResults` / `showLiveResults` / `resultsDisplay`。
- `submitQuizAttempt()` 目前只接受 `selectedIndex`，没有利用 frozen contract 的稳定 option id，也没有 `allowMultiple` 约束。
- `classroom-control-panel.tsx` 当前只有在 `currentRuntimeDescriptor` 存在时才显示投票轮次按钮，会把 classroom voting 锁死在 runtime-only 通道上。
</code_context>
