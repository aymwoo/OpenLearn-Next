---
phase: 70-question-stats-post-class-recap
plan: 01
subsystem: classroom
tags: [quiz-sample, recap, dto, cache, dal]
requires:
  - phase: 69-interactive-single-choice-quiz-sample-plugin
    provides: plugin-owned quiz question and response truth tables
provides:
  - dedicated quiz stats cache tag for session-scoped recap freshness
  - typed recap DTO section for quiz question stats
  - latest-only DAL aggregate seam over plugin-owned quiz tables
affects: [phase-70-02, phase-70-03, classroom, recap]
tech-stack:
  added: []
  patterns: [latest-only stats aggregate, recap-only typed read model, dedicated cache tag]
key-files:
  created: [.planning/phases/70-question-stats-post-class-recap/70-01-SUMMARY.md]
  modified:
    - src/lib/cache-policy.ts
    - src/lib/cache-policy.test.ts
    - src/lib/dto/classroom.ts
    - src/lib/dal/classroom.ts
    - src/lib/dal/classroom.test.ts
key-decisions:
  - "quiz sample stats truth is frozen to plugin_owned_quiz_questions plus plugin_owned_quiz_responses(isLatest), never lesson/plugin extension payloads"
  - "quiz sample stats live only in ClassroomSessionRecapDTO, not in durable classroom summary artifacts"
patterns-established:
  - "Phase 70 stats are a recap-only read model with dedicated cache invalidation instead of a new analytics table"
requirements-completed: [STATS-01]
completed: 2026-06-03
---

# Phase 70 Plan 01: Quiz stats DAL and recap DTO summary

**Phase 70 now has a single latest-only quiz stats seam: cache tag, recap DTO contract, and DAL aggregate helper are all anchored to plugin-owned truth.**

## Accomplishments
- Added `cacheTags.quizStats(sessionId)` as the single cache-tag source for question recap freshness.
- Added typed `quizSampleStats` recap DTO schemas for per-question cards, option distribution, and denominator copy.
- Added a latest-only aggregate helper in `src/lib/dal/classroom.ts` that reads `plugin_owned_quiz_questions` plus `plugin_owned_quiz_responses(isLatest)` and computes answered/unanswered and correct-rate stats without touching summary artifacts.

## Verification
- `pnpm vitest run src/lib/cache-policy.test.ts src/lib/dal/classroom.test.ts -t "quiz sample stats|recap contracts"` ✅

## Deviations from Plan
- None.

## Self-Check: PASSED
