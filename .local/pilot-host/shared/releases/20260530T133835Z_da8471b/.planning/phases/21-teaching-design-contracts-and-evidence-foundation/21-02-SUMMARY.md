---
phase: 21-teaching-design-contracts-and-evidence-foundation
plan: 02
subsystem: api
tags: [classroom, evidence, timeline, server-actions, drizzle, zod]
requires:
  - phase: 21-teaching-design-contracts-and-evidence-foundation
    provides: teaching-design launch preview contracts and classroom cache boundary
  - phase: 18-teaching-schedule-os
    provides: session-owned persistence, explicit cache invalidation, audit-safe DAL patterns
provides:
  - durable classroom evidence table scoped to session ownership
  - durable classroom timeline entries for presence, evidence, and interventions
  - server actions for evidence/intervention writes with authorization and cache refresh
affects: [classroom-runtime, teacher-evaluation, session-recap, analytics]
tech-stack:
  added: []
  patterns: [session-owned classroom evidence persistence, timeline-first audit trail, action validation plus cache invalidation]
key-files:
  created: [.planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-02-SUMMARY.md]
  modified: [src/db/schema.ts, src/lib/dto/classroom.ts, src/lib/dal/classroom.ts, src/lib/dal/classroom.test.ts, src/actions/classroom-actions.ts, src/actions/classroom-actions.test.ts]
key-decisions:
  - "classroom evidence 与 timeline 继续以 session 为主边界，studentId 和 stepId 只做附属上下文。"
  - "teacher intervention 首发只进 classroomTimeline，并固定为 teacher-only 过程记录，不提前扩成正式评价实体。"
  - "student evidence write 只能由当前登录学生为自己提交，teacher intervention 只能由 session teacher 写入。"
patterns-established:
  - "Classroom evidence write pattern: Server Action validates input, DAL enforces actor scope, then updateTag(cacheTags.classroom(sessionId))."
  - "Presence durability pattern: participant latest state remains on classroomParticipant, while every meaningful change is appended to classroomTimeline."
requirements-completed: [EVAL-03]
duration: 7 min
completed: 2026-05-12
---

# Phase 21 Plan 02: Classroom evidence foundation summary

**课堂 session 现在会持久化 presence、evidence 与 intervention timeline，并通过受鉴权的 Server Actions 提供可复用的课堂证据写入口。**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-12T14:39:00Z
- **Completed:** 2026-05-12T14:46:52Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- 在 `src/db/schema.ts` 新增 `classroomEvidence` 与 `classroomTimeline`，把课堂证据和时间线收敛到 session-owned durable source of truth。
- 在 `src/lib/dto/classroom.ts` 新增 typed evidence/intervention input 与 timeline DTO contract，明确 `targetScope`、`sourceType`、`evidenceType` 等可统计枚举。
- 在 `src/lib/dal/classroom.ts` 新增 evidence/intervention 写路径，并让 presence touch 在状态变化时追加 `presence_changed` timeline entry。
- 在 `src/actions/classroom-actions.ts` 新增 evidence/intervention Server Actions，统一走 Zod 校验、DAL 鉴权和 `updateTag(cacheTags.classroom(sessionId))`。

## Task Commits

Each task was committed atomically:

1. **Task 1: 定义 classroom evidence 与 timeline persistence contract** - `2caef87` (test), `1c628da` (feat)
2. **Task 2: 通过 classroom Server Actions 暴露 evidence 与 intervention 写入口** - `e894cd2` (test), `a96be08` (feat)

## Files Created/Modified

- `src/db/schema.ts` - 新增 classroom evidence / timeline 表及 session-owned cascade 约束。
- `src/lib/dto/classroom.ts` - 新增 evidence/intervention 输入、证据 DTO、timeline DTO 枚举与 schema。
- `src/lib/dal/classroom.ts` - 新增 classroom evidence/intervention 写链路，并把 presence 变化写入 durable timeline。
- `src/lib/dal/classroom.test.ts` - 补充 evidence foundation 合同与 DAL 入口测试。
- `src/actions/classroom-actions.ts` - 新增 evidence/intervention Server Actions、错误映射与 cache invalidation。
- `src/actions/classroom-actions.test.ts` - 补充 action schema gate、cache 刷新与 unauthorized error 回归测试。

## Decisions Made

- classroom evidence 与 timeline 都直接挂在 `classroomSession` 下，确保后续 recap / analytics 不会把跨次课堂数据混在 lesson 级别。
- intervention 首发只记录 `title + body + targetScope + studentId? + stepId?`，并固定 `teacher-only`，保持 D-14 / D-15 边界。
- presence durable truth 采用“双轨”：`classroomParticipant` 保留 latest state，`classroomTimeline` 追加历史变化，避免用 snapshot 反推课堂经过。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `21-03` 可以直接基于新的 teaching-design fallback marker 与 classroom evidence contract 做教师 planning surface 提示与 phase verifier。
- 后续 evaluation / analytics phase 已可直接读取 durable `classroomEvidence` 和 `classroomTimeline`，无需继续依赖 SSE memory 或 UI 推断。

## Self-Check: PASSED

- Verified `.planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-02-SUMMARY.md` exists.
- Verified commits `2caef87`, `1c628da`, `e894cd2`, and `a96be08` exist in git history.

---

*Phase: 21-teaching-design-contracts-and-evidence-foundation*
*Completed: 2026-05-12*
