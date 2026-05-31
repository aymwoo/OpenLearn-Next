---
phase: 28-runtime-bridge-contracts-and-session-persistence
reviewed: 2026-05-16T14:36:30Z
depth: focused
files_reviewed: 18
files_reviewed_list:
  - package.json
  - scripts/verify-phase28-runtime-bridge.ts
  - src/db/schema.ts
  - src/lib/dto/lesson-authoring.ts
  - src/lib/dto/classroom.ts
  - src/lib/dal/lesson-authoring.ts
  - src/lib/dal/lesson-authoring.test.ts
  - src/lib/dal/classroom.ts
  - src/lib/dal/classroom.test.ts
  - src/lib/dal/learning.ts
  - src/lib/dal/learning.test.ts
  - src/actions/classroom-actions.ts
  - src/actions/classroom-actions.test.ts
  - src/features/runtime-platform/contracts/bridge.ts
  - src/features/runtime-platform/contracts/contracts.test.ts
  - src/features/runtime-platform/classroom/runtime-session-contracts.ts
  - src/features/runtime-platform/classroom/runtime-session.ts
  - src/features/runtime-platform/host-actions/runtime-host.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 28: Code review report

**Reviewed:** 2026-05-16T14:36:30Z  
**Depth:** focused  
**Files Reviewed:** 18  
**Status:** clean

## Summary

本次 review 聚焦 Phase 28 的四条主线：runtime descriptor 与 bridge
contract、runtime session/state/outbox durability、host-side guarded write
path，以及 teacher/student downstream freshness。

结论：当前实现满足本阶段既定边界，没有发现新的 blocker、warning 或需要
立刻回滚的 contract drift。Phase 28 的 canonical verifier 也已能稳定覆盖
contract drift、durability drift、cache drift 三类收尾风险。

## Findings

本次 focused review 未发现需要记录的 critical 或 warning 级问题。

## What was checked

| Area | Status | Evidence |
| --- | --- | --- |
| Runtime descriptor remains on existing step payload instead of a parallel step model | ✓ PASS | `src/lib/dto/lesson-authoring.ts` keeps `payload.runtime` as an optional block on existing `content` / `task` / `quiz` payload schemas, and `src/lib/dal/lesson-authoring.ts` freezes the full descriptor into `publishedLessonVersions.snapshotJson`. |
| Runtime bootstrap and host-result contracts are typed and versioned | ✓ PASS | `src/features/runtime-platform/contracts/bridge.ts` defines typed bootstrap, save, submit, and teacher-control request/result schemas; `src/features/runtime-platform/contracts/contracts.test.ts` exercises minimal parse coverage. |
| Runtime durability uses append-only session/state/outbox tables with explicit latest semantics | ✓ PASS | `src/db/schema.ts` defines `runtimeStepSessions`, `runtimeStepStates`, and `runtimeEventOutbox`, with latest identity uniqueness and cascade delete foreign keys. |
| Host-side runtime writes stay behind guarded server boundaries | ✓ PASS | `src/features/runtime-platform/host-actions/runtime-host.ts` routes all runtime actions through `createGuardedHostAction`, and `src/actions/classroom-actions.ts` exposes the server action entrypoints for bootstrap, interaction, save, submit, and teacher control. |
| Save and submit semantics stay separated | ✓ PASS | `src/features/runtime-platform/classroom/runtime-session.ts` keeps `saveRuntimeState()` limited to runtime state/outbox writes, while `submitRuntimeState()` bridges to classroom evidence, task or quiz truth, and progress completion. |
| Teacher/student freshness is tied to explicit cache invalidation plus truth updates | ✓ PASS | `src/actions/classroom-actions.ts` updates `classroom`, `progress`, `submission`, and `teacherReview` tags after runtime submit, and `src/lib/dal/learning.ts` reads `latestRuntime`, `latestRuntimeStateSummary`, and `runtimeRecoveryStatus` back into the player personal DTO. |

## Residual risks

本次 review 没有发现 Phase 28 内部阻断项。后续 residual risk 主要属于下一阶段
范围，而不是当前实现缺陷：

- Phase 29 仍需把当前 host-side contract 真正接到 iframe Runtime Host UI。
- Phase 30 仍需把 capability enforcement 与 plugin lifecycle audit 补到治理面。
- 当前 verifier 是 focused gate，不替代未来跨 phase end-to-end runtime demo。

---

_Reviewed: 2026-05-16T14:36:30Z_  
_Reviewer: the agent (focused Phase 28 close review)_
