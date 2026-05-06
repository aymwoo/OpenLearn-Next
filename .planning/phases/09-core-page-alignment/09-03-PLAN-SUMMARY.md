---
phase: 09-core-page-alignment
plan: 03
subsystem: ui
tags: [stitch, students, settings, labs, routes]
requires: [09-core-page-alignment]
provides: [teacher-students-route, settings-route, labs-route]
affects: [src/app/(teacher)/teacher/students/page.tsx, src/app/settings/page.tsx, src/app/settings/labs/page.tsx]
tech-stack:
  added: []
  patterns: [route-shell-surface, management-dashboard, settings-split-view]
key-files:
  created: [src/components/surfaces/students-management-surface.tsx, src/components/surfaces/settings-surface.tsx, src/app/(teacher)/teacher/students/page.tsx, src/app/settings/page.tsx, src/app/settings/labs/page.tsx]
  modified: []
decisions:
  - "Created dedicated surface components for students management and settings so new mapped routes stay isolated from existing teacher and student shells."
  - "Used one shared `SettingsSurface` with `general` and `labs` modes to keep the two settings routes visually related without duplicating structure."
metrics:
  duration: "18m"
  completed_date: "2026-05-06"
---

# Phase 09 Plan 03: Core page alignment summary

Added the missing management and settings routes required by the Stitch mapping,
including a dedicated students management page and the new `/settings/labs`
destination.

## Key Changes
- Added `src/app/(teacher)/teacher/students/page.tsx` and
  `students-management-surface.tsx` for the teacher student roster view.
- Added `src/app/settings/page.tsx` for the main settings center.
- Added `src/app/settings/labs/page.tsx` for the lab layout management route.
- Reused a shared `SettingsSurface` to keep `/settings` and `/settings/labs`
  visually connected.

## Deviations from Plan
None.

## Known Stubs
These routes are currently UI-first surfaces. They do not yet connect to live
settings persistence or lab device orchestration.
