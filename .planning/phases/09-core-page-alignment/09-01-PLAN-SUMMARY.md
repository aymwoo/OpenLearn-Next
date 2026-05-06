---
phase: 09-core-page-alignment
plan: 01
subsystem: ui
tags: [stitch, home-page, teacher, classroom, editor]
requires: [08-stitch-mcp-integration]
provides: [home-route-alignment, classroom-runtime-hero, editor-hero]
affects: [src/app/page.tsx, src/components/classroom/classroom-control-panel.tsx, src/components/surfaces/lesson-editor-surface.tsx]
tech-stack:
  added: []
  patterns: [tonal-layering, gradient-hero, stitch-route-alignment]
key-files:
  created: []
  modified: [src/app/page.tsx, src/components/classroom/classroom-control-panel.tsx, src/components/surfaces/lesson-editor-surface.tsx]
decisions:
  - "Switched `/` to the existing `HomeSurface` so the home route fully reuses the Stitch-aligned hero and glass navigation shell."
  - "Kept classroom and editor data flow unchanged, and only tightened their visual hierarchy with gradient hero surfaces and denser status cards."
metrics:
  duration: "12m"
  completed_date: "2026-05-06"
---

# Phase 09 Plan 01: Core page alignment summary

Aligned the home route, classroom runtime hero, and teacher editor hero
structure to the mapped Stitch visual language without changing classroom or
authoring behavior.

## Key Changes
- Switched `src/app/page.tsx` to render the existing `HomeSurface` directly.
- Updated `src/components/classroom/classroom-control-panel.tsx` with a
  Stitch-like gradient hero block, compact metrics, and richer step metadata.
- Updated `src/components/surfaces/lesson-editor-surface.tsx` with stronger
  editorial hierarchy and a visual focus card for the current lesson plan.

## Deviations from Plan
None. Existing teacher dashboard and route shell already matched the intended
direction closely enough, so the plan completed with smaller visual-only edits.

## Known Stubs
None.
