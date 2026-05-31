---
phase: 28-runtime-bridge-contracts-and-session-persistence
plan: 03
subsystem: api
tags: [runtime-platform, host-actions, classroom, learning, server-actions, outbox]
requires:
  - phase: 28-01
    provides: typed runtime descriptor and bridge contracts
  - phase: 28-02
    provides: durable runtime session/state/outbox schema and bootstrap DTOs
provides:
  - runtime create/resume/bootstrap and canonical event append service
  - guarded runtime host actions for bootstrap, ready, interaction, save, submit, and teacher control
  - submit bridge into classroom evidence, task or quiz truth, and authoritative progress updates
affects: [phase-28, phase-29, runtime-host, classroom-actions, student-progress]
tech-stack:
  added: []
  patterns: [guarded runtime host entrypoints, semantic interaction filtering, save-vs-submit truth separation]
key-files:
  created:
    - src/features/runtime-platform/classroom/runtime-session.ts
    - src/features/runtime-platform/classroom/runtime-session.test.ts
  modified:
    - src/features/runtime-platform/classroom/index.ts
    - src/features/runtime-platform/host-actions/runtime-host.ts
    - src/lib/dal/classroom.ts
    - src/lib/dal/learning.ts
    - src/actions/classroom-actions.ts
    - src/features/runtime-platform/host-actions/guards.test.ts
    - src/lib/dal/learning.test.ts
key-decisions:
  - "ready、interaction、save、submit、teacher-control 五类 runtime 行为全部进入 runtimeEventOutbox，而不是散落到临时日志或传输层。"
  - "save 只更新 runtime state/outbox；submit 才桥回 classroomEvidence、taskSubmissions、quizAttempts 与 lessonStepProgress。"
patterns-established:
  - "Pattern: runtime-originated writes always enter through createGuardedHostAction and request-kind-specific schema parsing."
  - "Pattern: runtime semantic events are allowlisted business signals, not raw clickstream or DOM telemetry."
requirements-completed: [SAFE-03, BRDG-03, RTSE-01, RTSE-02, RTSE-03]
duration: not-recorded
completed: 2026-05-16
---

# Phase 28 Plan 03: Runtime host write-path summary

**Guarded runtime host actions that create or resume sessions, append canonical events, and bridge submit back to classroom and learning truth**

## Performance

- **Duration:** 未单独记录
- **Started:** 未单独记录
- **Completed:** 2026-05-16
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- 新增 `runtime-session.ts`，实现 create/resume、bootstrap、event append、save、submit、teacher-control 的 host-side service 主链。
- 将 runtime host 升级为六类 guarded action，并统一通过 `createGuardedHostAction` 和 trusted actor context 进入服务端边界。
- 让 runtime submit 精确桥回 `classroomEvidence`、`taskSubmissions`、`quizAttempts` 与 `lessonStepProgress`，同时保持 save 语义为 recoverable-only。

## Task Commits

No task commits recorded yet. 本计划产物当前仍在工作树中；若后续需要提交，应只精确提交 Phase 28 相关文件。

**Plan metadata:** pending

## Files Created/Modified

- `src/features/runtime-platform/classroom/runtime-session.ts` - 实现 runtime bootstrap/save/submit/event orchestration service。
- `src/features/runtime-platform/classroom/runtime-session.test.ts` - 锁住 latest session 恢复、runtime 升版重建、semantic interaction、save/submit 分离等关键行为。
- `src/features/runtime-platform/host-actions/runtime-host.ts` - 暴露六类 runtime host action，并通过 guarded wrapper 执行。
- `src/lib/dal/classroom.ts` - 通过 host-side bridge 包装 runtime bootstrap/save/submit/event 路径。
- `src/lib/dal/learning.ts` - 新增 runtime progress completion、task submission、quiz attempt bridge helper。
- `src/actions/classroom-actions.ts` - 暴露 runtime server actions，并在 trusted server boundary 上做 Zod parse 与 tag invalidation。
- `src/features/runtime-platform/host-actions/guards.test.ts` - 继续覆盖 trusted actor guard 行为。
- `src/lib/dal/learning.test.ts` - 锁住 runtime progress truth 与 player recovery 读路径。

## Decisions Made

- runtime host request 不能直接信任宽松 payload，必须按 request kind 显式 parse，再进入 runtime session service。
- semantic interaction 只接收业务语义事件，例如步骤推进、作答变化、阶段完成；原始 clickstream 和 DOM 级别信号一律拒绝。
- submit 时必须显式更新 `lessonStepProgress` 权威 truth，不能只靠 `updateTag(cacheTags.progress(...))` 假定读取结果自然变新。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 将 runtime session 服务改成按 request kind 显式 parse**
- **Found during:** Task 1 verification
- **Issue:** 初版 runtime session service 仍带有偏宽的 payload 处理路径，容易让不同 runtime request 在服务层共享过宽输入形状。
- **Fix:** 在 `runtime-session.ts` 内按 request kind 分别使用 `RuntimeBootstrapRequestSchema`、`RuntimeInteractionRequestSchema`、`RuntimeSaveRequestSchema`、`RuntimeSubmitRequestSchema`、`RuntimeTeacherControlRequestSchema` 做 parse，并补上 latest state 的 null-safe 返回。
- **Files modified:** `src/features/runtime-platform/classroom/runtime-session.ts`
- **Verification:** `pnpm exec vitest --run src/features/runtime-platform/classroom/runtime-session.test.ts src/features/runtime-platform/host-actions/guards.test.ts`
- **Committed in:** pending (working tree)

**2. [Rule 1 - Bug] 在 host/DAL/action 层收紧 runtime result envelope 的 schema narrowing**
- **Found during:** Task 2 verification
- **Issue:** runtime host 结果在 DAL 与 server action 层如果保持宽泛 envelope，会让后续 cache invalidation 与 bridge target 读取失去类型约束。
- **Fix:** 在 `runtime-host.ts`、`src/lib/dal/classroom.ts`、`src/actions/classroom-actions.ts` 中显式使用 `RuntimeSubmitResultSchema`、`RuntimeSaveResultSchema`、`RuntimeTeacherControlResultSchema` 和 `RuntimeHostActionResultDTOSchema` 收窄结果。
- **Files modified:** `src/features/runtime-platform/host-actions/runtime-host.ts`, `src/lib/dal/classroom.ts`, `src/actions/classroom-actions.ts`
- **Verification:** `pnpm exec vitest --run src/features/runtime-platform/classroom/runtime-session.test.ts src/lib/dal/learning.test.ts src/lib/dal/classroom.test.ts src/actions/classroom-actions.test.ts`
- **Committed in:** pending (working tree)

---

**Total deviations:** 2 auto-fixed (2 bug)
**Impact on plan:** 都是为保证 guarded runtime write path 与 typed envelope 完整成立；未改变既定范围。

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 29 已可直接接 runtime bootstrap/save/submit/teacher-control 的 host-side contract，而不需要再搭临时 server bridge。
- 后续 iframe Runtime Host 只需消费现有 bootstrap DTO 与 typed result envelope，即可进入课堂与学生端流程。

## Self-Check: PASSED

- Found `src/features/runtime-platform/classroom/runtime-session.ts`
- Found `src/features/runtime-platform/host-actions/runtime-host.ts`
- Found `src/lib/dal/classroom.ts`
- Found `src/actions/classroom-actions.ts`

---

*Phase: 28-runtime-bridge-contracts-and-session-persistence*
*Completed: 2026-05-16*
