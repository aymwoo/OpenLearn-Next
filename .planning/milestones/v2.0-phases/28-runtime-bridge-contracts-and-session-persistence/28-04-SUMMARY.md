---
phase: 28-runtime-bridge-contracts-and-session-persistence
plan: 04
subsystem: testing
tags: [runtime-platform, cache, verifier, player, classroom, typecheck]
requires:
  - phase: 28-02
    provides: durable runtime recovery schema and bootstrap contracts
  - phase: 28-03
    provides: guarded runtime host write path and submit truth bridge
provides:
  - player personal runtime recovery summaries
  - runtime cache invalidation matrix across classroom, progress, submission, and teacher review surfaces
  - canonical verify:phase28 durability and cache gate
affects: [phase-28, phase-29, player-recovery, classroom-freshness, runtime-verifier]
tech-stack:
  added: []
  patterns: [runtime recovery summaries in personal DTO, explicit downstream invalidation matrix, phase-specific verifier gate]
key-files:
  created:
    - scripts/verify-phase28-runtime-bridge.ts
  modified:
    - package.json
    - src/lib/dal/learning.ts
    - src/lib/cache-policy.ts
    - src/actions/classroom-actions.ts
    - src/lib/dal/learning.test.ts
    - src/lib/dal/classroom.test.ts
    - src/features/runtime-platform/classroom/runtime-session.test.ts
key-decisions:
  - "player personal DTO 只返回 latest runtime recovery 摘要，不把 full state JSON 回灌到 shell。"
  - "runtime submit 的 freshness 必须同时依赖权威 progress truth 更新和 classroom/progress/submission/teacherReview tag invalidation。"
patterns-established:
  - "Pattern: runtime-related writes fan out through existing truth tags instead of inventing a parallel freshness system."
  - "Pattern: phase-specific verifier combines static drift guards with focused runtime suites to protect durability and cache semantics."
requirements-completed: [RTSE-04, SAFE-03]
duration: not-recorded
completed: 2026-05-16
---

# Phase 28 Plan 04: Runtime freshness and verifier summary

**Player recovery summaries, explicit runtime invalidation matrix, and canonical `verify:phase28` gate**

## Performance

- **Duration:** 未单独记录
- **Started:** 未单独记录
- **Completed:** 2026-05-16
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 在 `getStudentPlayerPersonalDTO()` 中接入 `latestRuntime`、`latestRuntimeStateSummary`、`runtimeRecoveryStatus`，让学生刷新后仍能恢复当前 runtime 摘要。
- 将 runtime save/submit/teacher-control 的 freshness 明确绑定到 `cacheTags.classroom()` 与 submit downstream 的 `progress`、`submission`、`teacherReview` invalidation。
- 新增 `scripts/verify-phase28-runtime-bridge.ts` 和 `package.json` 中的 `verify:phase28`，集中校验 contract drift、durability drift、cache drift，并运行 focused runtime suites。

## Task Commits

No task commits recorded yet. 本计划产物当前仍在工作树中；若后续需要提交，应只精确提交 Phase 28 相关文件。

**Plan metadata:** pending

## Files Created/Modified

- `src/lib/dal/learning.ts` - 将 latest runtime recovery 摘要接入 player personal DTO。
- `src/lib/cache-policy.ts` - 延续现有 classroom/progress/submission/review truth tags 的 runtime freshness 路径。
- `src/actions/classroom-actions.ts` - 为 runtime save/submit/teacher-control 补齐 classroom 与 downstream tag invalidation。
- `src/lib/dal/learning.test.ts` - 锁住 runtime recovery summary 和 `runtimeRecoveryStatus` 语义。
- `src/lib/dal/classroom.test.ts` - 锁住 runtime submit freshness 与真实 classroom/progress truth 的绑定关系。
- `src/features/runtime-platform/classroom/runtime-session.test.ts` - 持续保护 save/submit 语义分离与 canonical outbox 行为。
- `scripts/verify-phase28-runtime-bridge.ts` - 实现 Phase 28 verifier。
- `package.json` - 注册 `verify:phase28` 脚本入口。

## Decisions Made

- runtime recovery read model 继续挂在既有 player personal DTO 上，而不是新建平行 runtime shell DTO。
- runtime submit 的 downstream freshness 复用现有 `classroom`、`progress`、`submission`、`teacherReview` truth tags，避免再造第二套 runtime cache 体系。
- phase gate 采用静态 drift guard + focused suites 的组合方式，优先快速暴露 contract/durability/cache 三类退化。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 29 可以直接基于 `verify:phase28` 持续守住 runtime durability、save-vs-submit 语义和 downstream freshness。
- player 与 classroom 侧已经具备最小 runtime recovery/read-your-writes 基线，后续只需把 iframe Runtime Host UI 接上这些 contract。

## Self-Check: PASSED

- Found `src/lib/dal/learning.ts`
- Found `src/actions/classroom-actions.ts`
- Found `scripts/verify-phase28-runtime-bridge.ts`
- Found `package.json` script `verify:phase28`

---

*Phase: 28-runtime-bridge-contracts-and-session-persistence*
*Completed: 2026-05-16*
