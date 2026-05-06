---
phase: 09-core-page-alignment
plan: 02
subsystem: ui
tags: [stitch, student, player, resources, courses, review]
requires: [09-core-page-alignment]
provides: [student-dashboard-alignment, player-hero-alignment, library-density-refresh, review-hero-refresh]
affects: [src/components/surfaces/student-dashboard-surface.tsx, src/components/surfaces/player-surface.tsx, src/components/surfaces/library-surface.tsx, src/components/learning/teacher-review-surface.tsx]
tech-stack:
  added: []
  patterns: [immersive-player-hero, metric-cards, no-line-library-cards]
key-files:
  created: []
  modified: [src/components/surfaces/student-dashboard-surface.tsx, src/components/surfaces/player-surface.tsx, src/components/surfaces/library-surface.tsx, src/components/learning/teacher-review-surface.tsx]
decisions:
  - "Used compact metric cards and a stronger hero headline on `/student` to better match the mapped learning center screen."
  - "Lifted `/student/player` and `/teacher/review` with full-width gradient hero sections instead of flat header shells."
metrics:
  duration: "15m"
  completed_date: "2026-05-06"
---

# Phase 09 Plan 02: Core page alignment summary

Refreshed the student, player, library, and review surfaces so their density,
hero composition, and card rhythm align more closely with the mapped Stitch
pages.

## Key Changes
- Updated `student-dashboard-surface` with a larger hero, action metrics, and
  clearer lesson continuation cards.
- Updated `player-surface` to use an immersive gradient header with step and
  mode summaries.
- Updated `library-surface` to add higher-density metadata blocks for courses
  and resources.
- Updated `teacher-review-surface` with a premium hero section and compact
  review metrics.

## Deviations from Plan
None. The route pages already delegated to the correct surfaces, so the work
stayed focused on those visual shells.

## Known Stubs
None.
