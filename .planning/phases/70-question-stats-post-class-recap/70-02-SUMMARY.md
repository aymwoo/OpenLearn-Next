---
phase: 70-question-stats-post-class-recap
plan: 02
subsystem: classroom
tags: [quiz-sample, recap, cache-invalidation, server-actions, no-writeback]
requires:
  - phase: 70-01
    provides: quiz sample stats recap DTO section and DAL aggregate seam
provides:
  - ended-session recap DTO integration for quiz sample stats
  - submit-side cache invalidation for quiz stats freshness
  - explicit no-summary-writeback posture for quiz stats
affects: [phase-70-03, classroom-actions, classroom-recap]
tech-stack:
  added: []
  patterns: [ended-session recap integration, submit-side tag refresh, no durable analytics writeback]
key-files:
  created: [.planning/phases/70-question-stats-post-class-recap/70-02-SUMMARY.md]
  modified:
    - src/lib/dal/classroom.ts
    - src/lib/dto/classroom.ts
    - src/actions/classroom-actions.ts
    - src/actions/classroom-actions.test.ts
    - src/lib/dal/classroom.test.ts
key-decisions:
  - "getClassroomSessionRecapDTO owns quiz sample stats integration; no parallel recap endpoint or analytics route is introduced"
  - "submitQuizSampleAnswerAction refreshes quizStats(sessionId) alongside existing classroom freshness tags"
patterns-established:
  - "new recap-only metrics must plug into ended-session DTO seams instead of expanding classroomSessionSummary durability"
requirements-completed: [STATS-01]
completed: 2026-06-03
---

# Phase 70 Plan 02: Recap integration and cache refresh summary

**Quiz sample stats now flow through the ended-session recap DTO and refresh immediately after student submissions, without becoming a second durable analytics source.**

## Accomplishments
- Integrated `quizSampleStats` into `getClassroomSessionRecapDTO` so ended-session recap consumers receive question-level stats from the Phase 70 aggregate seam.
- Added `updateTag(cacheTags.quizStats(parsed.data.sessionId))` to `submitQuizSampleAnswerAction` on the successful submit path.
- Kept `ClassroomSessionSummaryArtifactSchema` and related summary persistence free of `quizSampleStats` payloads.

## Verification
- `pnpm vitest run src/actions/classroom-actions.test.ts src/lib/cache-policy.test.ts` ✅
- `pnpm vitest run src/lib/dal/classroom.test.ts -t "quiz sample recap dto|quiz sample stats"` ✅

## Deviations from Plan
- None.

## Self-Check: PASSED
