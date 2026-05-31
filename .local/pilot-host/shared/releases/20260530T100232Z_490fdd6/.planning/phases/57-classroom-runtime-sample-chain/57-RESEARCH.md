# Phase 57: Classroom Runtime Sample Chain - Research

**Researched:** 2026-05-25
**Domain:** Classroom voting runtime sample chain in Next.js 16 / React 19.2 / Auth.js v5 / Drizzle / SQLite
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAIN-03 | classroom launch 必须验证样板课的 runtime readiness，并绑定正确的 runtime snapshot 与 plugin execution context。 | 复用 `launchClassroomSession()` 的 published lesson / publishedVersion / roster gate；在 launch 前补“step-scoped blocker/attention/advisory -> launch surface”，launch 后仍沿用 `publishedVersionId` 进入 runtime host，不回读 draft。 [VERIFIED: src/lib/dal/classroom.ts:3234-3332] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:27-32] |
| CHAIN-04 | 学生端必须能真实参与课堂投票、提交结果，并把结果写回 canonical progress / submission / evidence truth。 | 复用 `submitRuntimeState()` 的 durable bridge：`recordRuntimeClassroomEvidence()` + `recordRuntimeTaskSubmission()`/`recordRuntimeQuizAttempt()` + `recordRuntimeProgressCompletion()`；Phase 57 只需把 voting step 接到这条链并补 cutoff/reconnect 语义。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:736-907] [VERIFIED: src/lib/dal/learning.ts:543-662] |
| CHAIN-05 | 教师端必须能看到课堂投票结果、完成率、失败情况或未响应名单，而不是只有原始日志。 | 现有 `ClassroomSnapshotDTO` / `getClassroomSnapshotDTO()` / `getClassroomStudentDetailDTO()` 是 teacher authoritative read seam；应在此扩 voting aggregation、未完成名单与按需实名明细。 [VERIFIED: src/lib/dal/classroom.ts:1489-1903] [VERIFIED: src/lib/dal/classroom.ts:1904-2711] |
| PLUG-03 | 插件失败必须有明确 taxonomy，并为 operator 暴露可执行的 retry / reconcile / suspend / fallback 等恢复动作。 | Phase 57 需要先在当前 classroom shell 内交付最小可执行 recovery entrypoints，覆盖当前 voting round 的 retry / reconcile / suspend / fallback；Phase 58 再把它扩成跨课堂 operator surfaces 与 runbook。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md:32-35] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md:71-79] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:12-20] |
| SAFE-01 | SQLite + DAL 必须继续作为唯一 durable truth；Redis、WebSocket、BullMQ 只能作为 delivery 或 orchestration substrate。 | 现有 runtime submit 先写 DAL truth，再发 transport/outbox/governance；Phase 57 必须继续沿这条顺序，不新增只存在于 socket 的结果态。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:776-907] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md] |
| SAFE-02 | 样板链路中的关键写操作必须具备强校验、幂等/去重、补偿或 replay-safe 语义。 | 现有 `stateVersion`、`createOrResumeRuntimeSession()`、version conflict、append-only latest marker 已提供基础；Phase 57 需对 voting submit 增加 same-payload dedupe、teacher-ended cutoff gate、resume-safe status 恢复。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:414-458] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:736-907] [VERIFIED: src/lib/dal/classroom.ts:3335-3489] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 必须使用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite 首发。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- UI 组件禁止直连数据库，所有读写必须通过 DAL 和 Server Actions。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- Node.js 20.9+ 为主，Edge Runtime 仅用于 SSE 实时同步。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- Next.js 16 必须显式缓存，写入后必须更新或失效 tag。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md] [CITED: https://nextjs.org/docs/app/getting-started/revalidating]
- 首发只针对 SQLite，所有关联必须 cascade delete。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 课堂广播使用 SSE，支持 locked/unlocked。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 插件禁止 `eval()`、动态执行第三方代码、直接访问 DB 或核心 API。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 页面实现必须参考 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]

## Summary

Phase 57 不是重写 classroom runtime，而是在已经存在的 launch、teacher control、student runtime host、runtime submit durable bridge 上，把“课堂投票插件”收敛成一条可规划、可验证的样板链。现有代码已经证明：launch 会绑定 `publishedVersionId`；teacher control 已有 version conflict 语义；runtime submit 已经可以把结果桥接回 evidence / submission / progress truth。 [VERIFIED: src/lib/dal/classroom.ts:3234-3332] [VERIFIED: src/lib/dal/classroom.ts:3335-3564] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:736-907]

因此，Phase 57 的正确做法是：不新建第二套 runtime shell，不把投票退化成普通 quiz flow，也不提前进入 Phase 58 的 operator surface；而是沿现有 seam 增加 voting-specific teacher trigger/end、student submitted-waiting 状态、same-round overwrite + same-payload dedupe、teacher-ended cutoff、teacher-visible aggregation / incomplete roster / frozen result view。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:33-55] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md:54-63]

**Primary recommendation:** 以 `classroom-control-panel -> classroom-actions -> classroom DAL -> runtime host -> runtime-session -> learning/classroom DAL read models` 为唯一主链，补齐 voting round control、canonical write policy、teacher aggregation 三个缺口即可。 [VERIFIED: src/components/classroom/classroom-control-panel.tsx] [VERIFIED: src/actions/classroom-actions.ts:107-384] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:736-907]

## Recommended Approach

1. 先在 launch/readiness 侧补“step-scoped voting readiness summary”，但保持 `blockingIssues` 才拦截开课。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:27-32]
2. 把 teacher trigger/end 视为课堂控制动作，落在现有 `recordRuntimeTeacherControlAction()` / `changeClassroom*Action()` 同一控制面，不造独立页面。 [VERIFIED: src/actions/classroom-actions.ts:122-225] [VERIFIED: src/actions/classroom-actions.ts:305-384]
3. 把 student voting 提交统一走 `runtime-submit`，禁止旁路直接写 `quizAttempts` 或临时 transport-only state。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:736-907]
4. 用 append-only latest truth 维持“同轮覆盖最后一次提交”，再在 Phase 57 增加 same-payload dedupe 与 teacher-ended cutoff 校验。现有代码已有 append-only latest marker，但尚未显式实现这两个 voting 规则。 [VERIFIED: src/lib/dal/learning.ts:578-662] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:39-49]
5. teacher 结果面板优先扩现有 classroom snapshot/read model，首屏展示汇总与未完成名单，实名明细折叠。 [VERIFIED: src/lib/dal/classroom.ts:1904-2711] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:45-50]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Launch readiness gating | API / Backend | Frontend Server (SSR) | readiness truth 来自 lesson publish snapshot / roster / plugin posture，launch surface 只负责展示与调用。 [VERIFIED: src/lib/dal/classroom.ts:3234-3332] |
| Published snapshot binding | Database / Storage | API / Backend | 绑定点是 `classroomSessions.publishedVersionId` 与 `publishedLessonVersions.snapshotJson`，运行时不应回读 draft。 [VERIFIED: src/lib/dal/classroom.ts:3274-3287] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:151-182] |
| Teacher trigger/end voting | API / Backend | Browser / Client | teacher 按钮在 client，真正的控制语义、鉴权、version conflict 和 transport publish 在 action/DAL。 [VERIFIED: src/actions/classroom-actions.ts:122-225] [VERIFIED: src/lib/dal/classroom.ts:3335-3564] |
| Forced student focus | API / Backend | Browser / Client | authoritative active step / locked state 在 classroom session；student client 只消费并呈现 forced step。 [VERIFIED: src/lib/dal/learning.ts:720-887] |
| Runtime state save/submit | API / Backend | Database / Storage | save/submit 都在 runtime host server path 解析、校验并写 durable truth。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:647-907] |
| Canonical progress/submission/evidence writes | Database / Storage | API / Backend | 最终真相落在 SQLite 表与 DAL helper，不落在 WebSocket/Redis。 [VERIFIED: src/lib/dal/learning.ts:543-662] [VERIFIED: src/lib/dal/classroom.ts:1356-1488] |
| Teacher result aggregation | API / Backend | Frontend Server (SSR) | 聚合应从 snapshot/read model 计算后供 console 消费，不应在浏览器端拼装 raw log。 [VERIFIED: src/lib/dal/classroom.ts:1739-2711] |
| Reconnect recovery | API / Backend | Browser / Client | server 提供 latest runtime recovery summary 与 classroom runtime state，client 负责恢复 UI。 [VERIFIED: src/lib/dal/learning.ts:775-887] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:935-966] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.6 | Server Actions、App Router、cache tag invalidation | 项目已锁定 Next.js 16；官方文档要求 `cacheComponents: true` 并区分 `updateTag()` / `revalidateTag()`。 [VERIFIED: npm registry next@16.2.6 published 2026-05-07T19:01:54.751Z] [CITED: https://nextjs.org/docs/app/getting-started/caching] [CITED: https://nextjs.org/docs/app/getting-started/revalidating] |
| React | 19.2.6 | Suspense-based streaming 与 client runtime shell | 项目已锁定 React 19.2；student/classroom shell 已基于 Suspense + runtime data split 设计。 [VERIFIED: npm registry react@19.2.6 published 2026-05-06T16:16:47.653Z] [VERIFIED: src/lib/dal/learning.test.ts:134-167] |
| Drizzle ORM | 0.45.2 | SQLite durable writes / transactions | 现有 canonical write、append-only latest marker 与 session/event writes 都基于 Drizzle transaction。 [VERIFIED: npm registry drizzle-orm@0.45.2 published 2026-03-27T17:06:27.140Z] [VERIFIED: src/lib/dal/classroom.ts:3288-3321] [VERIFIED: src/lib/dal/learning.ts:585-659] |
| Zod | 4.4.3 | runtime payload validation | launch/control/runtime submit 均先 parse schema 再写 truth，符合 SAFE-02。 [VERIFIED: npm registry zod@4.4.3 published 2026-05-04T07:06:40.819Z] [VERIFIED: src/actions/classroom-actions.ts:1-105] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:654-655] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.5 | unit/source-anchored tests | 现有 runtime session、action、DAL 测试都用 Vitest；Phase 57 Wave 0 继续沿用。 [VERIFIED: npm registry vitest@4.1.5 published 2026-04-21T11:04:03.117Z] [VERIFIED: vitest.config.mts:7-26] |
| Playwright | 1.59.1 | teacher→student sample chain browser proof | Phase 57 需要一条最小 e2e 证明 launch→trigger→submit→teacher aggregation。 [VERIFIED: npm registry playwright@1.59.1 published 2026-04-01T17:58:48.894Z] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md:26-30] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing classroom control chain | New voting-only control page | 会复制鉴权、version conflict、cache invalidation、transport publish 逻辑；不符合最小变更。 [VERIFIED: src/lib/dal/classroom.ts:3335-3564] |
| `runtime-submit` durable bridge | Direct `submitQuizAttemptAction()` from voting UI | 会绕开 runtime proof / governance / classroom evidence 链，破坏 sample-chain proof。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:736-907] [VERIFIED: src/actions/learning-actions.ts:83-95] |
| Existing snapshot/read model | Browser-side log aggregation | 会把 authoritative truth 下沉到 client，且难以满足 incomplete roster / frozen result view。 [VERIFIED: src/lib/dal/classroom.ts:1904-2711] |

## Architecture Patterns

### System Architecture Diagram

```text
Teacher Launch Surface
  -> readiness summary (blocker/attention/advisory)
  -> launchClassroomSessionAction
  -> classroomSessions + classroomParticipants + classroomEvents
  -> published snapshot bound to session

Teacher Control Panel
  -> trigger/end voting control
  -> recordRuntimeTeacherControlAction / classroom control actions
  -> classroom event + transport publish
  -> student runtime client receives forced step / lock state

Student Runtime Client
  -> bootstrapRuntimeSessionAction
  -> saveRuntimeSessionStateAction (draft/runtime-only)
  -> submitRuntimeSessionStateAction (formal submit)
  -> runtime-session service
  -> classroomEvidence + taskSubmissions/quizAttempts + lessonStepProgress

Teacher Result Surface
  -> getClassroomSnapshotDTO / getClassroomStudentDetailDTO
  -> voting aggregation + incomplete roster + folded named detail
  -> frozen result view after teacher end
```

### Recommended Project Structure

```text
src/
├── actions/                       # Server Actions for teacher/student/runtime entrypoints
├── lib/dal/                       # Authoritative write/read seams over SQLite
├── lib/dto/                       # Request/result contracts for classroom and learning
├── features/runtime-platform/     # Runtime host, transport, governance, submit bridge
└── components/classroom|learning/ # Teacher/student shells consuming DTOs only
```

### Pattern 1: Published Snapshot Binding as Runtime Truth

**What:** launch 与 runtime step context 都从 `publishedVersionId + snapshotJson` 解出 step/runtime descriptor，不回读 draft lesson truth。 [VERIFIED: src/lib/dal/classroom.ts:3274-3287] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:151-182]

**When to use:** 所有 Phase 57 launch、teacher trigger、student submit、teacher aggregation 读写。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:12-20]

**Example:**

```typescript
// Source: src/features/runtime-platform/classroom/runtime-session.ts:151-182
const published = await db.query.publishedLessonVersions.findFirst({
  where: eq(publishedLessonVersions.id, session.publishedVersionId),
});

const snapshot = parseSnapshot(published.snapshotJson);
const snapshotStep = (snapshot.steps ?? []).find((step) => step.id === input.stepId);
const payload = lessonStepPayloadSchema.parse(snapshotStep.payload);

if (!payload.runtime) {
  throw new Error("RUNTIME_DESCRIPTOR_REQUIRED");
}
```

### Pattern 2: Save/Submit Split

**What:** `runtime-save` 只保存 runtime state 与 outbox；`runtime-submit` 才桥接 canonical evidence / submission / progress truth。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:647-734] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:736-907]

**When to use:** voting step 中“作答中”和“正式提交”必须保持不同语义。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:34-44]

**Example:**

```typescript
// Source: src/features/runtime-platform/classroom/runtime-session.ts:776-835
if (bridgeTargets.includes("classroom-evidence")) {
  await recordRuntimeClassroomEvidence(...);
}

if (bridgeTargets.includes("quiz-attempt")) {
  await recordRuntimeQuizAttempt(...);
}

await recordRuntimeProgressCompletion(...);
```

### Pattern 3: Teacher Control is a Classroom Control Action

**What:** voting start/end 应沿 teacher control / classroom session versioning / transport publish 语义实现。 [VERIFIED: src/actions/classroom-actions.ts:122-225] [VERIFIED: src/actions/classroom-actions.ts:305-384] [VERIFIED: src/lib/dal/classroom.ts:3335-3564]

**When to use:** teacher trigger voting、teacher end voting、可能的 reopen/close round state。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:33-49]

### Pattern 4: Teacher Snapshot Read Model Owns Aggregation

**What:** 投票汇总、完成率、未完成名单、折叠实名明细都从 server read model 返回，不在浏览器拼 raw events。 [VERIFIED: src/lib/dal/classroom.ts:1904-2711]

**When to use:** teacher classroom control panel 与 student detail drawer。 [VERIFIED: src/lib/dal/classroom.ts:1489-1903] [VERIFIED: src/components/classroom/classroom-control-panel.tsx]

### Anti-Patterns to Avoid

- **重建第二套 voting runtime 页面：** 会复制 teacher control / snapshot / cache invalidation / transport 逻辑。 [VERIFIED: src/lib/dal/classroom.ts:3335-3564]
- **直接从 student voting UI 调 `submitQuizAttemptAction()`：** 会绕开 runtime proof 与 classroom evidence。 [VERIFIED: src/actions/learning-actions.ts:83-95] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:736-907]
- **把结果汇总仅存在 WebSocket 内存态：** 违反 SAFE-01，刷新或重连后无法恢复。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md:56-60]
- **开课后 posture 变差就自动终止课堂：** 明确违反 D-57-04。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:27-32]
- **teacher 结束前就把学生跳到结果页：** 明确违反 D-57-08。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:34-38]

## Suggested Plan Split

### Plan Slice A — Launch Readiness & Binding
- 扩 launch read model，输出 voting step 级 blocker/attention/advisory。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:27-32]
- 复查 launch surface 文案与 one-click continue posture。 [VERIFIED: src/components/classroom/classroom-launch-panel.tsx]
- 验证 launch 后 session 绑定正确 `publishedVersionId` 与 roster。 [VERIFIED: src/lib/dal/classroom.ts:3234-3332]

### Plan Slice B — Teacher Voting Round Control
- 在现有 teacher control 链补 trigger/end voting command、DTO、action fallback。 [VERIFIED: src/actions/classroom-actions.ts:305-384]
- 保留 version conflict 语义与 `updateTag(cacheTags.classroom(sessionId))`。 [VERIFIED: src/actions/classroom-actions.ts:122-225]
- 让 student runtime client 响应 forced voting state。 [VERIFIED: src/lib/dal/learning.ts:775-887]

### Plan Slice C — Student Submit Policy & Runtime Recovery
- voting submit 走 runtime-submit bridge。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:736-907]
- 增加同轮 same-payload dedupe、teacher-ended cutoff、resume 已提交状态恢复。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:39-49]
- 保持“已提交、等待老师结束”状态。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:34-38]

### Plan Slice D — Teacher Aggregation & Failure Consequences
- 在 classroom snapshot / student detail 中加入 voting aggregation、未完成名单、折叠实名明细。 [VERIFIED: src/lib/dal/classroom.ts:1489-2711]
- 明确本阶段 failure taxonomy 的 teacher-visible consequences，并在当前 classroom shell 内提供最小可执行 recovery entrypoints；不新增 Phase 58 那种独立 operator 面板。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md:32-35] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md:64-79]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Runtime durable submit chain | 新的 voting-only persistence path | `submitRuntimeState()` bridge + DAL helpers | 已有 evidence/submission/progress 串联、outbox、governance、proofSummary。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:736-907] |
| Teacher control transport | 自定义浏览器直发 socket 协议 | `recordRuntimeTeacherControlAction()` + classroom actions fallback | 已有 server validation、message envelope、action fallback。 [VERIFIED: src/actions/classroom-actions.ts:305-384] |
| Result aggregation | client-side event replay reducer | `getClassroomSnapshotDTO()` / `getClassroomStudentDetailDTO()` | server read model更适合 incomplete roster、冻结视图、实名折叠。 [VERIFIED: src/lib/dal/classroom.ts:1489-2711] |
| Student recovery state | localStorage-only resume truth | `getLatestRuntimeRecoverySummary()` + classroom runtime DTO | 本地状态不能代表 canonical latest submit/status。 [VERIFIED: src/lib/dal/learning.ts:831-887] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:935-966] |

**Key insight:** Phase 57 的“新功能”主要是规则收口，不是基础设施重建；已有 seams 足够，错误的地方在于绕开它们。 [VERIFIED: src/lib/dal/classroom.ts:3234-3703] [VERIFIED: src/lib/dal/learning.ts:543-1052] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:647-907]

## Common Pitfalls

### Pitfall 1: 把 voting 当成普通 quiz retry 处理
**What goes wrong:** teacher 同步触发、teacher 结束、submitted-waiting 状态都会丢失。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:33-49]
**Why it happens:** 直接套用 `submitQuizAttempt()` 的个人作答语义。 [VERIFIED: src/lib/dal/learning.ts:989-1052]
**How to avoid:** 把 voting round state 放在 classroom control + runtime submit policy 之上，只借用 append-only latest marker。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:736-907]
**Warning signs:** 代码里只有 `quizAttempts` 更新，没有 teacher control round state。 [VERIFIED: src/lib/dal/learning.ts:620-662]

### Pitfall 2: runtime-save 误写 canonical completion
**What goes wrong:** 学生只是暂存就被算完成，teacher aggregation 被污染。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.test.ts:67-84]
**Why it happens:** 混淆 save 和 submit。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:647-734] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:736-907]
**How to avoid:** 仅 `runtime-submit` 调用 progress/submission/evidence helpers。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:776-835]
**Warning signs:** save path 出现 `recordRuntimeProgressCompletion` / `recordRuntimeQuizAttempt`。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.test.ts:67-84]

### Pitfall 3: 只做 transport success，不做 teacher-visible truth
**What goes wrong:** 日志里看似成功，但 teacher 看不到完成率或未完成名单。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md:40-42]
**Why it happens:** 只发布 event，不扩 snapshot/read model。 [VERIFIED: src/lib/dal/classroom.ts:101-123] [VERIFIED: src/lib/dal/classroom.ts:1904-2711]
**How to avoid:** 把 aggregation 作为 authoritative read model 的一部分实现。 [VERIFIED: src/lib/dal/classroom.ts:1904-2711]
**Warning signs:** teacher UI 需要直接读 raw runtime events 才能显示结果。 [ASSUMED]

### Pitfall 4: 结束后晚到提交被静默接收
**What goes wrong:** canonical latest truth 被晚到包覆盖，teacher frozen result view 不可信。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:39-49]
**Why it happens:** submit path 未检查 teacher-ended round status。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:743-907]
**How to avoid:** submit 前校验 round open/closed，closed 直接返回显式错误。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:43-49]
**Warning signs:** 结束事件之后仍能新增 `stateVersion` 或新 latest submission。 [ASSUMED]

## Code Examples

### Launch binds published snapshot, not draft

```typescript
// Source: src/lib/dal/classroom.ts:3243-3287
const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, payload.lessonId) });
if (!lesson || lesson.status !== "published" || !lesson.publishedVersionId || lesson.publishedVersionId !== payload.publishedVersionId) {
  throw new Error("CLASSROOM_LESSON_NOT_PUBLISHED");
}

const published = await db.query.publishedLessonVersions.findFirst({
  where: eq(publishedLessonVersions.id, lesson.publishedVersionId)
});
const snapshot = parseSnapshot(published.snapshotJson);
const steps = parseSnapshotSteps(snapshot, lesson.id);
```

### Runtime submit bridges to durable truth

```typescript
// Source: src/features/runtime-platform/classroom/runtime-session.ts:798-835
if (bridgeTargets.includes("task-submission")) {
  await recordRuntimeTaskSubmission({
    publishedVersionId: context.published.id,
    lessonId: context.session.lessonId,
    stepId: context.stepRow.id,
    studentId: input.actor.actorId,
    payload: {
      runtimeSessionId: runtimeSession.sessionId,
      submittedAt,
      proofSummary,
      state: payload.state,
      summary: payload.summary,
    },
  });
}

await recordRuntimeProgressCompletion({
  publishedVersionId: context.published.id,
  lessonId: context.session.lessonId,
  stepId: context.stepRow.id,
  studentId: input.actor.actorId,
});
```

### Server Action invalidates classroom cache tag after control mutation

```typescript
// Source: src/actions/classroom-actions.ts:147-166
const result = await changeClassroomMode(parsed.data);
if (result.sessionId) {
  updateTag(cacheTags.classroom(result.sessionId));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Implicit caching / path-only thinking | `cacheComponents: true` + `use cache` + tag-based invalidation | Next.js 16 cache model in current docs | Phase 57 必须在 mutation 后用 `updateTag()` 做 read-your-own-writes。 [CITED: https://nextjs.org/docs/app/getting-started/caching] [CITED: https://nextjs.org/docs/app/getting-started/revalidating] |
| `middleware.ts` naming | `proxy.ts` naming | 项目当前栈研究已锁定 | 对 Phase 57 影响较小，但说明不要新增旧命名风格的 request gate。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md] |
| Personal submit flows as primary classroom model | Classroom control + runtime host + durable bridge | 现有 codebase baseline | Phase 57 应把 voting 作为 classroom-controlled interaction，不回退成个人化 quiz-only flow。 [VERIFIED: src/lib/dal/learning.ts:720-887] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:736-907] |

**Deprecated/outdated:**
- 依赖 `transport-only success` 代表课堂完成，不符合当前 milestone proof 标准。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md:26-30]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 [VERIFIED: vitest.config.mts:7-26] [VERIFIED: npm registry vitest@4.1.5 published 2026-04-21T11:04:03.117Z] |
| Config file | `vitest.config.mts` [VERIFIED: vitest.config.mts:1-27] |
| Quick run command | `pnpm vitest run src/features/runtime-platform/classroom/runtime-session.test.ts src/actions/classroom-actions.test.ts src/actions/learning-actions.test.ts src/lib/dal/learning.test.ts` [VERIFIED: vitest.config.mts:13-26] |
| Full suite command | `pnpm vitest run` [VERIFIED: vitest.config.mts:13-26] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAIN-03 | launch readiness + published snapshot binding | unit/integration | `pnpm vitest run src/actions/classroom-actions.test.ts` | ✅ existing, but Phase 57 needs new readiness-specific cases [VERIFIED: src/actions/classroom-actions.test.ts:302-395] |
| CHAIN-04 | runtime submit writes canonical evidence/submission/progress | unit/source-anchored | `pnpm vitest run src/features/runtime-platform/classroom/runtime-session.test.ts src/lib/dal/learning.test.ts src/components/learning/classroom-runtime-client.test.tsx` | ✅ existing baseline [VERIFIED: src/features/runtime-platform/classroom/runtime-session.test.ts:67-109] [VERIFIED: src/lib/dal/learning.test.ts:185-203] |
| CHAIN-05 | teacher sees aggregation / incomplete roster / frozen results | unit/integration | `pnpm vitest run src/lib/dal/classroom.test.ts src/components/classroom/classroom-control-panel.test.tsx src/components/classroom/classroom-roster-panel.test.tsx` | ❌ Wave 0 add snapshot aggregation tests [VERIFIED: src/actions/classroom-actions.test.ts:302-520] |
| PLUG-03 | plugin failure taxonomy visible consequences plus current-round recovery actions | unit/manual | `pnpm vitest run src/actions/classroom-actions.test.ts src/components/classroom/classroom-control-panel.test.tsx` | ❌ Wave 0 add error mapping and recovery-action tests for voting runtime cases [VERIFIED: src/actions/classroom-actions.test.ts:329-394] |
| SAFE-01 | transport not treated as durable truth | unit/source-anchored | `pnpm vitest run src/features/runtime-platform/classroom/runtime-session.test.ts` | ✅ existing baseline [VERIFIED: src/features/runtime-platform/classroom/runtime-session.test.ts:78-109] |
| SAFE-02 | idempotent/dedupe/replay-safe submit semantics | unit/integration | `pnpm vitest run src/features/runtime-platform/classroom/runtime-session.test.ts src/actions/learning-actions.test.ts src/lib/dal/learning.test.ts src/components/learning/classroom-runtime-client.test.tsx` | ❌ Wave 0 add same-payload dedupe / cutoff / reconnect tests [VERIFIED: src/actions/learning-actions.test.ts:221-276] |

### Sampling Rate

- **Per task commit:** `pnpm vitest run src/features/runtime-platform/classroom/runtime-session.test.ts src/actions/classroom-actions.test.ts src/actions/learning-actions.test.ts src/lib/dal/learning.test.ts src/components/learning/classroom-runtime-client.test.tsx` [VERIFIED: vitest.config.mts:13-26]
- **Per wave merge:** `pnpm vitest run` [VERIFIED: vitest.config.mts:13-26]
- **Phase gate:** `pnpm verify:phase57` 必须串起 focused suites 与 1 条 browser/UAT proof，覆盖 launch -> teacher trigger -> student submit -> teacher sees aggregation。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md:26-30]

### Wave 0 Gaps

- [ ] `src/lib/dal/classroom.test.ts` 或等价测试文件 —— 覆盖 voting aggregation / incomplete roster / frozen results。 [ASSUMED]
- [ ] `src/features/runtime-platform/classroom/runtime-session.test.ts` 新增 same-payload dedupe、teacher-ended cutoff、resume submitted-state 用例。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.test.ts:67-109]
- [ ] `src/actions/classroom-actions.test.ts` 新增 voting teacher control action / conflict / error mapping 用例。 [VERIFIED: src/actions/classroom-actions.test.ts:261-520]
- [ ] `src/components/learning/classroom-runtime-client.test.tsx` 新增 synchronized voting-state / submitted-waiting / reconnect 用例。 [VERIFIED: src/components/learning/classroom-runtime-client.test.tsx:1-302]
- [ ] 一个最小 browser/UAT 脚本或 Playwright 等价 repo-local proof command，作为 Phase 57 proof artifact，并接入 `verify:phase57`。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md:26-30]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | teacher/student mutation 都通过 `assertActiveTeacher()` / student scope 断言进入。 [VERIFIED: src/lib/dal/classroom.ts:3235-3237] [VERIFIED: src/lib/dal/learning.ts:898-1052] |
| V3 Session Management | yes | classroom live/ended、participant connection state、runtime session identity 决定请求是否继续生效。 [VERIFIED: src/lib/dal/classroom.ts:3581-3631] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:414-458] |
| V4 Access Control | yes | teacher control 限定 `session.teacherId`；student submit 限定 lesson/class membership scope。 [VERIFIED: src/lib/dal/classroom.ts:3339-3424] [VERIFIED: src/lib/dal/learning.ts:714-887] |
| V5 Input Validation | yes | Zod schemas for launch/control/runtime submit/action inputs. [VERIFIED: src/actions/classroom-actions.ts:107-384] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:654-655] |
| V6 Cryptography | no | Phase 57 不新增自定义密码学需求；幂等 token/hash 若引入，应使用平台标准库而非手写算法。 [ASSUMED] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Student forged submit for another classroom/step | Tampering | submit path 以 classroomSessionId + stepId + publishedVersion runtime context server-side重建，不信任 client-only state。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:743-759] |
| Teacher control race / stale version overwrite | Tampering | classroom control 已有 optimistic version conflict 返回最新 snapshot。 [VERIFIED: src/lib/dal/classroom.ts:3350-3380] [VERIFIED: src/lib/dal/classroom.ts:3425-3455] |
| Replay submit duplicates | Repudiation/Tampering | Phase 57 必须在现有 `stateVersion` / latest marker 之上补 same-payload dedupe。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:760-767] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:39-44] |
| Transport says success before durable truth | Integrity | 现有 runtime submit 先写 DAL truth，再写 outbox / publish transport。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:776-907] |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js / Vitest / scripts | ✓ | v24.1.0 | — [VERIFIED: local environment check] |
| pnpm | test / workspace scripts | ✓ | 10.33.0 | npm for package inspection only [VERIFIED: local environment check] |
| npm | version verification | ✓ | 11.6.2 | — [VERIFIED: local environment check] |
| sqlite3 CLI | local DB inspection | ✓ | 3.53.1 | not required for code changes [VERIFIED: local environment check] |
| docker | optional browser/runtime support infra | ✓ | 29.5.1 | local single-process mode [VERIFIED: local environment check] |
| redis-cli | degraded posture inspection | ✗ | — | rely on app-level degraded visibility; Phase 57 not blocked [VERIFIED: local environment check] |
| Vitest | phase validation | ✓ | 4.1.5 | — [VERIFIED: local environment check] |

**Missing dependencies with no fallback:**
- None for Phase 57 planning. [VERIFIED: local environment check]

**Missing dependencies with fallback:**
- `redis-cli` 缺失，但 Phase 57 重点是 classroom sample chain，不需要依赖 redis shell 工具完成规划。 [VERIFIED: local environment check]

## Resolved Decisions

1. **Voting round status 的 durable carrier 放在哪里最小正确？**
   - Decision: 以现有 `classroomEvidence` system artifact 作为 Phase 57 的最小 durable carrier，由 teacher start/end control 写入 `voting-round-opened` / `voting-round-closed` truth，并经现有 classroom snapshot/read-model 消费。
   - Why: 这能沿用现有 classroom control、publish snapshot、teacher read model 主链，不为单一样板新造 round state 表，同时满足 D-57-05 / D-57-07 / D-57-16。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:33-55]
   - Planning implication: 57-02 先落 durable round artifact；57-03 与 57-04 以它作为 cutoff / freeze / aggregation 的唯一 authoritative round truth。

2. **same-payload dedupe 的主键策略是什么？**
   - Decision: Phase 57 采用“同一轮 + 同一 student + 同一 step + 稳定 payload 指纹”的 server-side dedupe 语义。技术实现可以是 canonical JSON serialization 后的 hash，或等价 replay token，但必须进入 durable write path，不能只放内存。
   - Why: 这样能把网络重发与真实改票区分开，满足 D-57-09 / D-57-10 / SAFE-02。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:39-55]
   - Planning implication: 57-03 必须把 dedupe carrier 视为正式 schema/write-policy 工作；若现有表字段不足，最小 schema 变更也必须显式纳入计划，而不是隐含假设。

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | teacher UI 目前尚未通过 raw runtime events 直接拼结果，否则不必扩 snapshot read model。 | Common Pitfalls | 若已有成熟 read model，计划会高估聚合改造量。 |
| A2 | `src/lib/dal/classroom.test.ts` 或等价新测试文件需要新增，当前没有现成 aggregation test fixture。 | Validation Architecture | 若已有隐藏测试基线，Wave 0 任务可更小。 |
| A3 | `classroomEvidence` system artifact 足以作为 Phase 57 的 voting round open/closed durable carrier。 | Resolved Decisions | 若实现时 query/read-model 成本超出预期，Phase 58 再考虑专门 operator 索引。 |
| A4 | same-payload dedupe 若缺 carrier 字段，必须在 57-03 里显式补最小 schema/write-policy 支撑。 | Resolved Decisions | 会影响 57-03 的任务拆分，但不再是开放问题。 |
| A5 | 若将来引入 hash/token，应使用标准库而非自实现。 | Security Domain | 风险低，但关系到实现细节。 |

## Sources

### Primary (HIGH confidence)
- `src/lib/dal/classroom.ts` — launch binding、teacher control、snapshot/read model、runtime host entry。 [VERIFIED: src/lib/dal/classroom.ts:3234-3703]
- `src/lib/dal/learning.ts` — canonical progress/submission truth、student runtime recovery seam。 [VERIFIED: src/lib/dal/learning.ts:543-1052]
- `src/features/runtime-platform/classroom/runtime-session.ts` — runtime save/submit、proofSummary、bridgeTargets、resume semantics。 [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:414-458] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:647-966]
- `src/actions/classroom-actions.ts` — Server Action entrypoints and `updateTag()` posture. [VERIFIED: src/actions/classroom-actions.ts:1-384]
- `src/actions/learning-actions.ts` — canonical submit cache invalidation pattern. [VERIFIED: src/actions/learning-actions.ts:1-112]
- `src/features/runtime-platform/classroom/runtime-session.test.ts` — save/submit separation and durable bridge assertions. [VERIFIED: src/features/runtime-platform/classroom/runtime-session.test.ts:67-109]
- `src/lib/dal/learning.test.ts` — cached shell/dynamic personal split and runtime recovery expectations. [VERIFIED: src/lib/dal/learning.test.ts:134-203]
- `vitest.config.mts` — current test framework/config. [VERIFIED: vitest.config.mts:1-27]
- `57-CONTEXT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `config.json` — locked scope and planning requirements. [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:1-141] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md:22-76] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/ROADMAP.md:54-63] [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/config.json:15-31]
- Next.js docs: caching and revalidating for Cache Components / `updateTag()` / `revalidateTag()`. [CITED: https://nextjs.org/docs/app/getting-started/caching] [CITED: https://nextjs.org/docs/app/getting-started/revalidating]
- npm registry version checks: `next@16.2.6`, `react@19.2.6`, `zod@4.4.3`, `drizzle-orm@0.45.2`, `vitest@4.1.5`, `playwright@1.59.1`. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- Phase 55 proof inventory as sample-chain proof target reference. [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md:3-30]

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 项目基础栈已锁定，版本已核对 npm registry，缓存模型已核对官方文档。 [VERIFIED: npm registry] [CITED: https://nextjs.org/docs/app/getting-started/caching]
- Architecture: HIGH - 关键 launch/control/submit/read seams 已在代码中存在且可读。 [VERIFIED: src/lib/dal/classroom.ts:3234-3703] [VERIFIED: src/features/runtime-platform/classroom/runtime-session.ts:647-907]
- Pitfalls: MEDIUM - 大部分来自锁定上下文与现有代码缺口推导，其中少量 warning sign 属假设。 [VERIFIED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md:27-55] [ASSUMED]

**Research date:** 2026-05-25
**Valid until:** 2026-06-24
