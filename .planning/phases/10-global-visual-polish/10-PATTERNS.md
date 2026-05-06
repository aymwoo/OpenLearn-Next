# PATTERNS: Phase 10 - Global Visual Polish

## Shared primitives to tighten

- `src/app/globals.css` — canonical token source for color, radius, spacing, and focus behavior.
- `src/components/ui/button.tsx` — shared CTA hierarchy; prefer expanding this instead of adding route-local button classes.
- `src/components/ui/card.tsx` — shared white action-layer card with ambient shadow.
- `src/components/ui/badge.tsx` — shared chip pattern for status and accent labels.

## Floating navigation and shell patterns

- `src/components/shell/glass-nav.tsx` — reference for glass navigation treatment.
- `src/components/shell/route-shell.tsx` — reference for tonal outer canvas + centered content width.
- `src/components/shell/sidebar.tsx` — reference for teacher-side navigation density and active-state hierarchy.
- `src/app/(teacher)/teacher/layout.tsx` — existing teacher workspace shell that needs token-driven convergence.

## Teacher density analogs

- `src/components/surfaces/teacher-dashboard-surface.tsx` — dual-focus dashboard and current density issue hotspot.
- `src/components/surfaces/lesson-editor-surface.tsx` — teacher editor with multi-panel command-center structure.
- `src/components/classroom/classroom-control-panel.tsx` — high-frequency live-classroom stage with one hero and dense operational modules.
- `src/components/learning/teacher-review-surface.tsx` — review surface with teacher-side hero + metrics + detail panes.
- `src/components/surfaces/students-management-surface.tsx` — list-heavy teacher management surface.

## Calm management and learning surfaces

- `src/components/surfaces/home-surface.tsx` — public route with one justified hero stage.
- `src/components/surfaces/student-dashboard-surface.tsx` — student dashboard with softer progress-forward hierarchy.
- `src/components/surfaces/player-surface.tsx` — immersive student player hero pattern.
- `src/components/surfaces/library-surface.tsx` — card-dense catalog surface.
- `src/components/surfaces/settings-surface.tsx` — calm management surface where hero usage should stay restrained.

## Known drift to remove

- Route-local `shadow-[...]` values that duplicate ambient shadow.
- Inline white cards and local rounded sizes that bypass shared primitives.
- Login and input surfaces that still rely on border-driven emphasis.
- Brand-blue restyling of semantic warning and destructive states.
