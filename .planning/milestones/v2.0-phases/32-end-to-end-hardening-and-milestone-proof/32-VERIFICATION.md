---
phase: 32-end-to-end-hardening-and-milestone-proof
verified: 2026-05-17T10:57:55Z
status: passed
score: 12/12 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 12/12 must-haves verified
  gaps_closed:
    - human_verification.canonical_proof_live_browser_walkthrough
    - human_verification.classroom_first_feedback_before_inspector_drill_down
    - human_verification.reconnect_and_same_surface_recovery_posture
    - human_verification.runtime_startup_after_sandbox_fix
  gaps_remaining: []
  regressions: []
human_verification: []
---

# Phase 32: End-to-end hardening and milestone proof verification report

本报告从 Phase 32 的目标倒推验证实际代码，而不是采信
`SUMMARY.md` 叙述。结论是：代码层面的 must-have 已全部找到且已接线，
但初次 close 时仍有少量必须人工跑通的 live browser 验证项，因此当时状态为
`human_needed`。在后续两轮真实浏览器 UAT 与 gap closure（`32-05`、`32-06`、`32-07`）
完成后，这些人工验证项已全部收口，当前状态更新为 `passed`。

**Phase Goal:** Harden the full runtime-platform path, close milestone
integration gaps, and prove the end-to-end HTML runtime lesson flow as a
shippable V2 foundation.
**Verified:** 2026-05-17T10:57:55Z
**Status:** passed
**Re-verification:** Yes — final closure re-check

## Goal achievement

以下表格按 roadmap success criteria 与 plan must-haves 合并后的 observable
truths 进行核验。这里的“VERIFIED”表示代码中存在真实实现、真实接线与可追踪
的数据流，不表示已经完成真人 UI 验收。

### Observable truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | 端到端 runtime-hosted HTML proof 链路覆盖 editor/publish、launch/player、interaction、submit、classroom feedback、inspector review | ✓ VERIFIED | `scripts/bootstrap-dev-db.ts` 固定 canonical proof step；`src/app/(student)/student/player/page.tsx` → `src/components/learning/classroom-runtime-client.tsx` 渲染 runtime host；`src/features/runtime-platform/classroom/runtime-session.ts` 落 submit truth；`src/components/classroom/classroom-control-panel.tsx` 与 `src/app/settings/labs/runtime-inspector/page.tsx` 暴露 review 路径 |
| 2 | 既有 classroom-critical baseline 仍被统一 gate 重确认 | ✓ VERIFIED | 用户已给定 `npm run build`、`npm test`、`npm run verify:phase32` 为通过事实；`scripts/verify-phase32-end-to-end.ts` 串联 `verify:phase27`~`verify:phase31` |
| 3 | 里程碑 hardening 明确覆盖 cache freshness、session durability、capability denial、rollback-safe transport | ✓ VERIFIED | `src/actions/classroom-actions.ts` 在 runtime 写路径执行 `updateTag(...)`；`scripts/verify-phase32-end-to-end.ts` 把上游 Phase 27-31 verifier 作为 prerequisite 重确认 |
| 4 | 本里程碑证明 Runtime Platform foundation，但未执行 PostgreSQL/Redis/WebSocket cutover | ✓ VERIFIED | `ROADMAP.md` Phase 32 SC4 与 `32-DEMO-HANDOFF.md` Out of scope 明确保留 no-cutover posture |
| 5 | canonical proof 使用可重复 seeded lesson/class/runtime step，且 publish snapshot 冻结 runtime descriptor | ✓ VERIFIED | `scripts/bootstrap-dev-db.ts` 定义 `getCanonicalRuntimeProofStepDefinition()`、`getCanonicalRuntimeProofSnapshotStep()` 与 `CANONICAL_RUNTIME_PROOF_STEP_RANK`；发布链仍写入 `publishedLessonVersions.snapshotJson` |
| 6 | runtime submit truth 显式携带 `runtimeSessionId` 与结构化 `proofSummary`，供 classroom/inspector 消费 | ✓ VERIFIED | `src/features/runtime-platform/classroom/runtime-session-contracts.ts` 定义 `RuntimeSubmitProofResultSchema`；`runtime-session.ts` 返回 `runtimeSessionId`、`proofSummary` 并写入 classroom evidence |
| 7 | submit 成功后学生看到 terminal state、结构化摘要，且 save/resubmit 被禁用 | ✓ VERIFIED | `src/features/runtime-platform/host/runtime-host-client.tsx` 进入 `submit-success`；`src/app/runtime/html-courseware/pilot/page.tsx` 使用 `isTerminalSubmitState` 锁定 textarea/select/buttons 并展示“本次提交摘要” |
| 8 | save/submit 失败时学生保留当前 surface、保留草稿并可重试刚才动作 | ✓ VERIFIED | `runtime-host-client.tsx` 区分 `save-failed` / `submit-failed`；`src/components/learning/classroom-runtime-client.tsx` 提供“重试刚才的操作”且保留 `snapshot_fallback` / reconnect posture |
| 9 | 仓库存在单一 `verify:phase32` 外部 gate | ✓ VERIFIED | `package.json` 注册 `"verify:phase32": "tsx scripts/verify-phase32-end-to-end.ts"` |
| 10 | Phase 32 proof 有自己的 drift guards 与 focused regression suites，不只是复用旧 verifier | ✓ VERIFIED | `scripts/verify-phase32-end-to-end.ts` 含 8 类 guards，并运行 lesson authoring / launch / host / player / classroom / inspector focused suites |
| 11 | 教师先在 `/classroom` 看到 proof first-feedback，再决定是否 drill-down inspector | ✓ VERIFIED | `src/lib/dal/classroom.ts` 组装 `runtimeProof`；`src/components/classroom/classroom-control-panel.tsx` 渲染 `proof first-feedback` 和 `查看运行轨迹` CTA |
| 12 | demo handoff 明确、repo-local，依赖既有 surface affordance，而不是新 dashboard | ✓ VERIFIED | `.planning/phases/32-end-to-end-hardening-and-milestone-proof/32-DEMO-HANDOFF.md` 明确 bootstrap、账号、proof chain、`runtimeSessionId` second-step drill-down、Out of scope |

**Score:** 12/12 truths verified

### Required artifacts

以下 artifacts 都不是只看“文件存在”，而是核对了其是否承担了计划中宣称的职责。

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `scripts/bootstrap-dev-db.ts` | deterministic runtime proof seed lesson/class/published snapshot | ✓ VERIFIED | 复用 built-in `htmlCourseware`，固定 proof step，且保留 published snapshot freeze 入口 |
| `src/features/runtime-platform/classroom/runtime-session-contracts.ts` | submit contract carries `runtimeSessionId` and proof summary | ✓ VERIFIED | `RuntimeSubmitProofResultSchema` 包含 `runtimeSessionId`、`classroomSessionId`、`lessonId`、`actorId`、`submittedAt`、`proofSummary` |
| `src/features/runtime-platform/classroom/runtime-session.ts` | durable runtime submit truth and inspector anchor | ✓ VERIFIED | `submitRuntimeState()` 返回 proof result，并同时写 classroom evidence / task submission / quiz attempt / outbox / governance / transport |
| `src/lib/dal/classroom.ts` | classroom first-feedback read model | ✓ VERIFIED | 从 `classroomEvidence.payloadJson` 提取 `runtimeProof`，挂到 `ClassroomParticipantMonitoringDTO.runtimeProof` |
| `src/actions/classroom-actions.ts` | host-facing runtime submit forwarding and cache invalidation | ✓ VERIFIED | `submitRuntimeStateAction()` 解析 `RuntimeSubmitResultSchema` 并刷新 classroom/progress/submission/teacherReview tags |
| `src/features/runtime-platform/host/runtime-host-client.tsx` | shared host state machine for terminal/retry flows | ✓ VERIFIED | 区分 `submit-success`、`save-failed`、`submit-failed`，并把 result envelope 回发给 iframe |
| `src/app/runtime/html-courseware/pilot/page.tsx` | local HTML runtime UI with terminal lock and retry posture | ✓ VERIFIED | 接收 `host-action-result`，成功后锁定输入并展示摘要，失败时保留当前内容 |
| `src/components/learning/classroom-runtime-client.tsx` | player-shell-safe recovery and reconnect posture | ✓ VERIFIED | 保持 `snapshot_fallback` banner、same-surface retry 与 `RuntimeFailureRecoveryCard` |
| `src/components/surfaces/classroom-launch-surface.tsx` | launch discoverability for seeded proof | ✓ VERIFIED | 添加次级 seeded proof affordance，不替换主 CTA “开启新课堂” |
| `src/components/classroom/classroom-control-panel.tsx` | teacher-first proof cue and inspector CTA | ✓ VERIFIED | 通过 `runtimeInspectorHref` 指向 `runtimeSessionId` deep link |
| `src/lib/dal/runtime-inspector.ts` | runtime-session anchored unified timeline read model | ✓ VERIFIED | 以 `selectedRuntimeSessionId` 聚焦，聚合 runtime/classroom/governance/transport/consumer lanes |
| `src/components/surfaces/runtime-inspector-surface.tsx` | proof-session-oriented inspector UI | ✓ VERIFIED | 首页即“当前 proof 会话与统一运行轨迹”，不是 tabbed dashboard |
| `src/app/settings/labs/runtime-inspector/page.tsx` | `runtimeSessionId` query entry | ✓ VERIFIED | page 直接把 query `runtimeSessionId` 传入 `getRuntimeInspectorDTO()` |
| `.planning/phases/32-end-to-end-hardening-and-milestone-proof/32-DEMO-HANDOFF.md` | explicit seeded demo handoff | ✓ VERIFIED | 包含 bootstrap 命令、teacher/student 账号、canonical proof chain、inspector second-step、Out of scope |

### Key link verification

以下关键连接已核对存在，且不是孤立 stub。

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `scripts/bootstrap-dev-db.ts` | `src/lib/dto/resource-ai.ts` | seeded HTML runtime uses existing `htmlCourseware` contract | ✓ WIRED | `getHtmlCoursewareBuiltInDefinition()` 查找 `builtInKey === "htmlCourseware"` |
| `src/features/runtime-platform/classroom/runtime-session.ts` | inspector route | `runtimeSessionId` deep-link anchor | ✓ WIRED | `buildRuntimeInspectorHref()` 生成 `/settings/labs/runtime-inspector?runtimeSessionId=...` |
| `src/features/runtime-platform/host/runtime-host-client.tsx` | `src/app/runtime/html-courseware/pilot/page.tsx` | typed result envelopes and terminal sync | ✓ WIRED | host 通过 `postMessage` 回发 `TeachingBridgeResultEnvelope`；pilot 消费 `host-action-result` |
| `src/components/learning/classroom-runtime-client.tsx` | `RuntimeHostClient` | same-surface runtime recovery | ✓ WIRED | 通过 `retryCurrentActionRequest`、`onActionFailure`、`onActionRecovered` 驱动重试与恢复 |
| `scripts/verify-phase32-end-to-end.ts` | `package.json` | single gate registration | ✓ WIRED | `package.json` 注册 `verify:phase32` |
| `scripts/verify-phase32-end-to-end.ts` | `verify:phase27`~`verify:phase31` | milestone prerequisite chain | ✓ WIRED | verifier 显式 `run(["verify:phase27"])` 到 `run(["verify:phase31"])` |
| `scripts/verify-phase32-end-to-end.ts` | focused suites | phase-specific proof regression coverage | ✓ WIRED | 末尾运行 8 个 focused suites |
| `src/components/classroom/classroom-control-panel.tsx` | `src/app/settings/labs/runtime-inspector/page.tsx` | `runtimeSessionId` deep link | ✓ WIRED | `runtimeInspectorHref` 使用 `runtimeSessionId` 拼接 query |
| `src/lib/dal/classroom.ts` | `src/components/classroom/classroom-control-panel.tsx` | teacher-first proof feedback data | ✓ WIRED | DAL 产出 `participant.runtimeProof`，control panel 消费 `submittedRuntimeParticipants` / `runtimeAttentionParticipants` |
| `src/lib/dal/runtime-inspector.ts` | `src/components/surfaces/runtime-inspector-surface.tsx` | runtime-session anchored unified timeline | ✓ WIRED | page 调 DAL，surface 渲染 `inspector.timeline.map` |
| `32-DEMO-HANDOFF.md` | `scripts/bootstrap-dev-db.ts` | deterministic demo setup instructions | ✓ WIRED | 文档要求 `pnpm db:bootstrap:dev`，与脚本真实入口一致 |

### Data-flow trace (level 4)

以下动态 artifacts 不仅已接线，还能追溯到真实数据来源，而不是空壳渲染。

| Artifact | Data variable | Source | Produces real data | Status |
| --- | --- | --- | --- | --- |
| `runtime-session.ts` | `proofSummary`, `runtimeSessionId` | persisted runtime session + appended runtime state + classroom evidence writes | Yes | ✓ FLOWING |
| `classroom.ts` | `participant.runtimeProof` | `classroomEvidence.payloadJson.runtimeSessionId/proofSummary` | Yes | ✓ FLOWING |
| `classroom-control-panel.tsx` | `submittedRuntimeParticipants`, `runtimeInspectorHref` | `ClassroomSnapshotDTO.participants[].runtimeProof` | Yes | ✓ FLOWING |
| `runtime-host-client.tsx` | host action result state | `submitRuntimeStateAction()` / `saveRuntimeStateAction()` server action results | Yes | ✓ FLOWING |
| `pilot/page.tsx` | `terminalSubmitState` | `host-action-result` envelope from shared host | Yes | ✓ FLOWING |
| `runtime-inspector.ts` | `timeline`, `health` | `runtimeStepSessions` + lifecycle + governance + transport + consumer persisted rows | Yes | ✓ FLOWING |
| `runtime-inspector-surface.tsx` | `inspector.timeline` | `getRuntimeInspectorDTO()` | Yes | ✓ FLOWING |

### Behavioral spot-checks

本阶段存在用户已明确给定的门禁事实，因此这里直接按已知事实记录，不重复执行。

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| 项目可构建 | `npm run build` | 用户提供：已通过 | ✓ PASS |
| 测试集可通过 | `npm test` | 用户提供：已通过 | ✓ PASS |
| 单一 Phase 32 gate 可通过 | `npm run verify:phase32` | 用户提供：已通过 | ✓ PASS |

### Requirements coverage

本 phase 的计划 requirement 只有 `RHOST-04`。代码证据支持该 requirement 已落地。

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `RHOST-04` | `32-01`~`32-04` | Student can open the built-in HTML runtime step in the existing learning flow, complete one real interaction, and submit a structured result successfully. | ✓ SATISFIED | student player route 挂 `ClassroomRuntimeClient`；`RuntimeHostClient` 发送/接收 typed bridge requests；`pilot/page.tsx` 执行 interaction/save/submit；`runtime-session.ts` durable submit；classroom/inspector 消费 proof truth |

### Anti-patterns found

本次针对关键 Phase 32 文件检查了 `TODO`、`FIXME`、`HACK`、placeholder、空壳
实现等 stub 信号。未发现会阻断 Phase 32 goal 的 blocker anti-pattern。

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/app/runtime/html-courseware/pilot/page.tsx` | 366 | normal textarea placeholder copy | ℹ️ Info | 普通输入框占位文案，不是未实现证据 |

## Human verification closure

2026-05-17 已完成两轮真实浏览器 UAT，并在关闭剩余 sandbox/origin 启动问题后完成
最终复测，结果记录在 `32-HUMAN-UAT.md` 与 `32-UAT.md`：

1. `/teacher/launch` 能直接看到 canonical seeded proof 的次级入口，同时主动作仍保持“开启新课堂”。
2. seeded runtime proof 在真实浏览器链路中可以正常启动，不再卡在“等待 iframe ready”，控制台不再出现同源 sandbox/403 启动阻断。
3. `/classroom` 会先显示教师侧 proof feedback，再通过相同 `runtimeSessionId` 进入 inspector，在线人数也会跟随 live session 更新。
4. save 或 submit 失败时，学生仍停留在 `/student/player` 当前 surface，可直接“重试刚才的操作”，不会跳离当前运行界面。

## Gaps summary

没有发现代码级 blocker gap。Phase 32 的 must-haves 在代码层面均已找到真实实现、
真实接线和真实数据流，且与 roadmap success criteria、`RHOST-04`、四个 plan 的
must-haves 一致。

当前人工验证项已经全部收口：真实浏览器链路证明 canonical proof runtime 能正常启动、
classroom-first feedback 与 inspector drill-down 姿态成立、same-surface recovery 也符合
Phase 32 合同。剩余风险不再是 Phase 32 blocker，状态收口为 `passed`。

---

_Verified: 2026-05-17T10:57:55Z_
_Verifier: the agent (gsd-verifier)_
