# Phase 57: Classroom Runtime Sample Chain - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只负责把“课堂投票插件”从 launch 跑到学生完成，并把运行结果稳定写回 canonical progress / submission / evidence truth，
同时让教师在课堂运行台看到可信的投票结果、未完成名单与运行期异常后果。

Phase 57 建立在 Phase 56 已完成的 authoring / publish freeze / voting executable contract 之上。
本阶段不再重做 authoring shell、publish preflight、plugin contract freeze，也不进入 operator recovery 面板、deploy/release、backup/restore 或 load rehearsal。

本阶段的正式职责是：
- launch 必须绑定正确的 published snapshot 与 runtime execution context；
- teacher 必须能触发课堂投票并控制该轮投票的开始/结束；
- student 必须能在真实课堂中完成投票，并把结果写回 canonical truth；
- reconnect、重复提交、截止后提交等运行期边界必须有明确语义；
- teacher 必须在课堂端看到实时汇总、未完成名单和按需展开的实名结果证据。

</domain>

<decisions>
## Implementation Decisions

### Launch readiness and session lifecycle
- **D-57-01:** classroom launch 只拦 `blockingIssues`；`attentionIssues` 和 `advisoryIssues` 继续展示，但不阻止开课。
- **D-57-02:** launch blocker 必须定位到具体课时步骤，并附带原因与插件上下文；不能只给课堂级泛化摘要。
- **D-57-03:** 当课堂没有 blocker 但存在 attention issue 时，不增加二次确认弹层；teacher 继续一键开课，并在 launch surface 上看到显式警示。
- **D-57-04:** 一旦 classroom session 已创建，后续若出现 plugin disabled、transport degraded 或运行期 posture 变差，不自动终止课堂；必须转为课堂内告警，并交给 teacher/operator 在既有课堂链路内处理。

### Voting interaction model
- **D-57-05:** 课堂投票的核心交互模型是“teacher 触发后，全班同步进入投票态”，而不是把它退化成普通 quiz step 的各自完成。
- **D-57-06:** teacher 触发当前投票后，student 端必须被强制聚焦到当前投票 step；这次投票触发是课堂控制动作，不依赖 student 自行跳转。
- **D-57-07:** 投票结束信号以 teacher 显式结束为准；不能只依赖时间窗自动截止来收口本轮课堂投票。
- **D-57-08:** student 提交成功后，应显示“已提交、等待老师结束”状态，并停留在当前课堂态，而不是立刻跳下一步或立即切到结果页。

### Duplicate, cutoff, and reconnect semantics
- **D-57-09:** 在同一轮投票尚未被 teacher 显式结束前，student 允许覆盖最后一次提交；canonical truth 认最后一次有效提交。
- **D-57-10:** 同一轮投票、同一 student、同一 payload 的重复提交必须按幂等去重处理，不应被记成新的有效提交。
- **D-57-11:** student 断线重连后，若该轮投票仍未结束，必须恢复到当前投票态，并带回该 student 的已提交/未提交状态；不能把已提交状态丢失。
- **D-57-12:** teacher 显式结束投票后，新的 student 提交必须被拒绝，并明确提示“本轮投票已结束”；不得静默丢弃，也不得继续晚到补写。

### Teacher result evidence
- **D-57-13:** teacher 课堂结果面板首屏优先显示实时汇总与未完成人数，而不是实名明细优先。
- **D-57-14:** 未响应 student 必须以单独的“未完成名单”区块展示，便于 teacher 在课堂中即时干预。
- **D-57-15:** 实名结果明细在 Phase 57 首版中默认折叠，按需展开查看；不抢占主视图。
- **D-57-16:** 结果面板在投票进行中实时更新；当 teacher 结束该轮投票后，冻结这一轮结果视图。

### the agent's Discretion
- teacher 触发投票的具体 command 名称、DTO 字段名、socket envelope 与 fallback action 入口，可在现有 classroom control / runtime command 命名风格下做最小正确收敛。
- “实时汇总”的具体表现形态可由 planner 在现有 classroom console / roster / recap surface 之间收敛为最小可用实现，但必须满足“首屏先看全局，再看个体”。
- 幂等去重采用 payload hash、request token、或等价 replay-safe 机制均可，只要最终语义满足同 payload 不重复记为新有效提交。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth and locked requirements
- `.planning/ROADMAP.md` — Phase 57 的正式 goal、requirements、success criteria。
- `.planning/REQUIREMENTS.md` — `CHAIN-03`、`CHAIN-04`、`CHAIN-05`、`PLUG-03`、`SAFE-01`、`SAFE-02` 的 requirement truth。
- `.planning/PROJECT.md` — `v3.1` 的 scope fence、sample chain、baseline truths 与 out-of-scope。
- `.planning/STATE.md` — 当前 milestone posture 与 Phase 57 queued focus。

### Locked upstream pilot contract
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-PILOT-CONTRACT.md` — 固定 `teacher design -> publish -> launch -> student completion -> teacher/operator verification` 样板链路与 baseline truth。
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md` — Phase 57 必须交付的 runtime sample-chain、canonical write proof、teacher-visible result proof。
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md` — `launch readiness failed`、`transport degraded or reconnect issue`、`student submit timeout or duplicate` 等 failure taxonomy 与 recovery posture。

### Phase 56 handoff that remains locked
- `.planning/phases/56-voting-plugin-contract-and-authoring-integration/56-CONTEXT.md` — voting plugin 在 lesson/editor/publish 中的边界与 Phase 57 不应重开的决策来源。
- `.planning/phases/56-voting-plugin-contract-and-authoring-integration/56-VERIFICATION.md` — 已验证：runtime 必须读取 published snapshot 冻结的 voting executable config，而不是回读 draft extension。
- `.planning/phases/56-voting-plugin-contract-and-authoring-integration/56-REVIEW.md` — Phase 56 closeout 后的 residual risk 和已关闭问题背景。
- `.planning/phases/56-voting-plugin-contract-and-authoring-integration/56-UI-SPEC.md` — 已锁定的 voting sample 交互语言、状态 copy 与 readiness / freshness 基线。

### Existing code anchors and contracts
- `src/lib/dto/classroom.ts` — classroom launch readiness、console snapshot、runtime proof、student detail 等 DTO contract。
- `src/lib/dto/learning.ts` — student player、submission input、teacher review 的 DTO contract。
- `src/actions/classroom-actions.ts` — launch、teacher control、runtime command fallback、classroom evidence 写入口。
- `src/actions/learning-actions.ts` — progress / task / quiz submit 写入口与 cache invalidation posture。
- `src/lib/dal/classroom.ts` — published snapshot binding、classroom snapshot aggregation、participant monitoring、runtime proof/evidence 汇总。
- `src/lib/dal/learning.ts` — progress completion、append-only submissions / quiz attempts、student player shell read path。
- `src/lib/dal/lesson-authoring.ts` — launch readiness 分层、publish snapshot freeze、voting executable contract resolution。
- `src/components/classroom/classroom-launch-panel.tsx` — launch surface 的 blocker / attention / advisory 分层与当前开课入口。
- `src/components/classroom/classroom-control-panel.tsx` — teacher 课堂运行台、socket-first control、runtime command fallback、名册/注意力/运行证明入口。
- `src/components/learning/classroom-runtime-client.tsx` — student runtime host、current step rendering、player runtime state 与 socket subscription。
- `src/components/surfaces/classroom-console-surface.tsx` — classroom console / runtime management 的现有信息架构主壳。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/classroom/classroom-launch-panel.tsx`：已经有 `blocking / attention / advisory` 三层 readiness UI，可以直接承接 Phase 57 的 launch gate 决策。
- `src/lib/dto/classroom.ts` 的 `ClassroomLaunchReadinessDTOSchema`、`ClassroomSnapshotDTOSchema`：现成承接 launch gating、课堂快照、participant/runtimeProof 聚合。
- `src/components/classroom/classroom-control-panel.tsx`：已有 teacher socket-first 控课、version conflict fallback、runtime command fallback，可作为“teacher 触发投票/结束投票”的主入口。
- `src/components/learning/classroom-runtime-client.tsx`：student 端已有 classroom socket 订阅、runtime host 集成和当前 step 渲染壳，是接入同步投票态的直接落点。
- `src/lib/dal/learning.ts`：已有 `recordRuntimeProgressCompletion()`、append-only `recordRuntimeTaskSubmission()`、`recordRuntimeQuizAttempt()` 模式，可复用到 voting result durable write。
- `src/lib/dal/classroom.ts`：已有 published snapshot 解析、participant monitoring summary、runtimeProof/evidence 聚合，是 teacher 结果面板的 authoritative read seam。

### Established Patterns
- 运行期读路径必须绑定 `publishedLessonVersions.snapshotJson`，不能回读 lesson draft truth。
- teacher 控课优先走 WebSocket / socket push；失败时再落 Server Action fallback，并保持 version conflict 语义。
- canonical write 必须落 SQLite + DAL；WebSocket、Redis、BullMQ 只能辅助交付和编排。
- 现有 task / quiz 尝试采用 append-only + `isLatest` 模型；Phase 57 的 voting submit 也应沿用“保留历史 + latest truth”或等价 replay-safe 语义。
- UI 层已有“主舞台 + tonal 次级面板”的 classroom console 组织方式；teacher 结果视图应复用这一层级，而不是另起新页面。

### Integration Points
- teacher trigger / close voting：优先接在 `src/components/classroom/classroom-control-panel.tsx` + `src/actions/classroom-actions.ts` + `src/lib/dal/classroom.ts` 现有 classroom control 链路上。
- student voting runtime state：优先接在 `src/components/learning/classroom-runtime-client.tsx` 与 `src/lib/dto/learning.ts` / `src/lib/dto/classroom.ts` 的 runtime DTO seam 上。
- canonical result writes：优先落在 `src/lib/dal/learning.ts`（progress/submission）与 `src/lib/dal/classroom.ts`（evidence/runtime proof）之间的真实写链，而不是只记录 transport event。
- teacher result surface：优先扩展 `ClassroomSnapshotDTO` 驱动的 `classroom-control-panel` / roster / student detail 现有面板，而不是另造独立 result page。

</code_context>

<specifics>
## Specific Ideas

- teacher 触发课堂投票是一个课堂控制动作，应与“切 step / 锁定模式 / runtime command”放在同一条控课链路里看待。
- classroom voting 首版优先服务课堂控场：先看全班分布和未完成名单，再按需展开实名明细。
- reconnect 与 duplicate 语义必须被视为 Phase 57 的主线，而不是边角异常；proof / tests 要直接覆盖。
- launch readiness 和 runtime degraded 必须采用“开课前拦 blocker，开课后诚实告警”的双阶段 posture，不能混成单一 hard stop。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 57-Classroom Runtime Sample Chain*
*Context gathered: 2026-05-25*
