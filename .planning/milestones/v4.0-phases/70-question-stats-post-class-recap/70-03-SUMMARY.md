---
phase: 70-question-stats-post-class-recap
plan: 03
subsystem: ui
tags: [quiz-sample, recap-ui, classroom, stitch, design]
requires:
  - phase: 70-01
    provides: typed quiz sample recap DTO section
  - phase: 70-02
    provides: recap seam integration and fresh quiz stats reads
provides:
  - question recap section inside the existing classroom recap surface
  - explicit answered/unanswered and denominator copy for quiz sample stats
affects: [phase-70, classroom-session-recap-surface]
tech-stack:
  added: []
  patterns: [recap section in existing surface, tonal metric cards, calm empty state]
key-files:
  created: [.planning/phases/70-question-stats-post-class-recap/70-03-SUMMARY.md]
  modified:
    - src/components/classroom/classroom-session-recap-surface.tsx
    - src/components/classroom/classroom-session-recap-surface.test.tsx
    - src/components/surfaces/classroom-console-surface.test.tsx
key-decisions:
  - "question recap stays inside the current /classroom recap seam instead of branching to a BI-style analytics page"
  - "UI copy makes denominator semantics explicit rather than leaving answered/unanswered interpretation implicit"
patterns-established:
  - "new post-class analytics for a plugin should present as tonal recap cards, not line-heavy dashboards or separate navigation"
requirements-completed: [STATS-02]
completed: 2026-06-03
---

# Phase 70 Plan 03: Classroom recap UI summary

**Teachers can now review quiz sample question performance directly inside the existing classroom recap surface, with explicit denominator semantics and a DESIGN-aligned visual treatment.**

## Accomplishments
- Added a new “题目复盘” section to `ClassroomSessionRecapSurface` with per-question cards, correct-answer badges, option distribution rows, and metric cards.
- Added a calm empty state for sessions with no quiz sample questions or no recap-ready answers.
- Updated recap-related test fixtures so the new `quizSampleStats` DTO section is covered without opening a new route.

## Verification
- `pnpm vitest run src/components/classroom/classroom-session-recap-surface.test.tsx` ✅
- `pnpm vitest run src/components/surfaces/classroom-console-surface.test.tsx "src/app/(classroom)/classroom/page.test.tsx"` ✅

## Deviations from Plan
- None.

## Self-Check: PASSED
