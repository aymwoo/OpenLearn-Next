---
phase: 28-runtime-bridge-contracts-and-session-persistence
plan: 02
subsystem: database
tags: [runtime-platform, drizzle, sqlite, durability, bootstrap, dto]
requires:
  - phase: 28-01
    provides: versioned runtime descriptor and bridge contract baseline
provides:
  - append-only runtime session, state, and outbox tables
  - minimal bootstrap and runtime recovery DTO contracts
  - migration-first runtime durability schema on live SQLite
affects: [phase-28, phase-29, runtime-bootstrap, player-recovery, classroom-runtime]
tech-stack:
  added: []
  patterns: [append-only latest runtime identity, minimal bootstrap DTOs, migration-first runtime durability]
key-files:
  created:
    - src/features/runtime-platform/classroom/runtime-session-contracts.ts
    - src/features/runtime-platform/classroom/runtime-session-contracts.test.ts
    - drizzle/0001_curved_overlord.sql
    - drizzle/meta/0001_snapshot.json
  modified:
    - src/db/schema.ts
    - drizzle/meta/_journal.json
    - src/lib/dto/classroom.ts
    - src/features/runtime-platform/classroom/index.ts
key-decisions:
  - "runtime session identity 固定绑定 classroomSessionId + stepId + actorId + actorScope + runtimeVersion，同 identity 默认恢复 latest。"
  - "bootstrap DTO 只返回 step、lesson、classroom、actor、capability、latestStateSummary 摘要，不暴露 full snapshot、cookies、secret 或 raw rows。"
patterns-established:
  - "Pattern: runtime durability uses append-only session/state tables with explicit isLatest flags and uniqueness indexes."
  - "Pattern: migration-first runtime schema changes land through Drizzle SQL + journal metadata before later host-side logic depends on them."
requirements-completed: [BRDG-03]
duration: not-recorded
completed: 2026-05-16
---

# Phase 28 Plan 02: Runtime session durability summary

**Append-only runtime session, state, and outbox tables plus minimal bootstrap and recovery DTO contracts**

## Performance

- **Duration:** 未单独记录
- **Started:** 未单独记录
- **Completed:** 2026-05-16
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- 在 SQLite schema 中新增 `runtimeStepSessions`、`runtimeStepStates`、`runtimeEventOutbox` 三张运行态 durability 表，并为 latest identity、state history、delivery queue 建立唯一约束和索引。
- 定义 `RuntimeBootstrapDTOSchema`、`RuntimeSessionIdentitySchema`、`RuntimeStateSummarySchema`、`CreateOrResumeRuntimeSessionInputSchema`，把 runtime bootstrap/recovery contract 变成稳定的 typed DTO。
- 通过正式 Drizzle migration 生成 SQL 与 metadata，并保留 migration-first 路径给后续 runtime host 实现直接复用。

## Task Commits

No task commits recorded yet. 本计划产物当前仍在工作树中；若后续需要提交，应只精确提交 Phase 28 相关文件。

**Plan metadata:** pending

## Files Created/Modified

- `src/db/schema.ts` - 新增 runtime session/state/outbox durability schema。
- `drizzle/0001_curved_overlord.sql` - 生成 runtime durability migration SQL。
- `drizzle/meta/0001_snapshot.json` - 记录 migration snapshot。
- `drizzle/meta/_journal.json` - 更新 Drizzle migration journal。
- `src/features/runtime-platform/classroom/runtime-session-contracts.ts` - 定义 bootstrap、session、state、identity 合同。
- `src/features/runtime-platform/classroom/runtime-session-contracts.test.ts` - 锁住最小 bootstrap parse 与 banned field token 检查。
- `src/lib/dto/classroom.ts` - 对外暴露 runtime bootstrap/session 相关 DTO。
- `src/features/runtime-platform/classroom/index.ts` - 导出 runtime session contract 模块。

## Decisions Made

- runtime durability 不回写现有 `classroomSessions` 或 `classroomEvidence` 原表，而是独立使用 append-only runtime tables。
- session identity 以 actor + step + runtime version 为主键语义，保证同 actor 重入恢复与 runtime 升版新建 session 同时成立。
- bootstrap DTO 只保留最小摘要字段，避免后续 iframe/runtime consumer 获得越权上下文。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 可以直接在 append-only runtime truth 上实现 create/resume/bootstrap、canonical event append、save/submit 语义分离。
- runtime host 与 player personal 侧都已经有稳定的 bootstrap 和 recovery contract，可避免后续临时猜字段。

## Self-Check: PASSED

- Found `src/db/schema.ts`
- Found `src/features/runtime-platform/classroom/runtime-session-contracts.ts`
- Found `src/features/runtime-platform/classroom/runtime-session-contracts.test.ts`
- Found `drizzle/0001_curved_overlord.sql`

---

*Phase: 28-runtime-bridge-contracts-and-session-persistence*
*Completed: 2026-05-16*
