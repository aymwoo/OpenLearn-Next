# Phase 10: Global Visual Polish - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

## Phase Boundary

Phase 10 delivers release-level visual convergence for the existing application.
It tightens the shared visual system and reconciles page-level drift so the app
consistently follows `DESIGN.md` across surfaces, actions, emphasis, and
responsive behavior.

This phase does **not** add new routes, features, or product capabilities. It
polishes and standardizes the pages already delivered in earlier phases.

## Implementation Decisions

### System-level visual convergence
- **D-01:** Phase 10 prioritizes system-wide visual convergence before per-page
  patching.
- **D-02:** Downstream work should standardize both shared primitives and
  high-frequency page container patterns in the same phase.
- **D-03:** Prefer tightening existing tokens, shared components, and existing
  APIs over adding many new visual variants or new component names.
- **D-04:** Remove local visual exceptions wherever possible. Shared rules win
  unless Stitch alignment clearly requires an exception.
- **D-05:** Only a small exception whitelist is acceptable, limited to
  semantically special surfaces such as hero blocks, live-state modules, and
  semantic warning or error panels.

### Teacher-side density and hierarchy
- **D-06:** Teacher-facing pages should move toward a compact command-center
  feel rather than an airy showcase layout.
- **D-07:** Fix the teacher dashboard density issue by expanding the primary
  information region, not by shortening the content until it fits.
- **D-08:** Teacher dashboard should treat live classroom state and today's
  operating rhythm as co-primary concerns, with explicit hierarchy between
  them.
- **D-09:** The teacher-side density language should apply across teacher
  surfaces, not only `/teacher`. This includes `/teacher/editor`, `/classroom`,
  `/teacher/students`, and `/teacher/review`.
- **D-10:** Keep whitespace, but make it more disciplined. Reduce the number of
  visual card styles and favor shorter, higher-information teacher copy.
- **D-11:** Teacher dashboard should read as a dual-focus workspace: schedule
  rhythm and live classroom status both matter, and neither should feel cramped
  by the current column allocation.

### Gradient, glass, and emphasis
- **D-12:** Use gradient and glass treatments sparingly. A page should have at
  most one true gradient hero or main stage.
- **D-13:** Glassmorphism belongs mainly to navigation and floating layers, not
  as a generic section treatment.
- **D-14:** Primary CTAs should consistently use a clearly visible brand
  gradient.
- **D-15:** Error, warning, and other semantic states should keep semantic
  colors first instead of being absorbed into the brand-blue system.
- **D-16:** Brightness can vary by page type. Teacher high-frequency pages may
  carry a brighter, more energized visual atmosphere than settings or list-like
  management pages.
- **D-17:** Secondary and tertiary actions may remain refined and premium, but
  they must stay visually behind primary actions.
- **D-18:** Pages without a natural hero do not need one. Whether a hero exists
  depends on page type, not on a blanket consistency rule.

### Responsive polish priorities
- **D-19:** Desktop release quality is the priority for Phase 10. Mobile and
  tablet must remain coherent and usable, but they do not need equal visual
  polish depth.
- **D-20:** Mobile layouts may use collapses, simplified module visibility, or
  reduced simultaneous information density to preserve clarity.
- **D-21:** On high-frequency pages, mobile should preserve primary actions,
  active status, and current context before secondary stats or decorative
  modules.
- **D-22:** Responsive acceptance is stability-first: no overflow, no broken
  hierarchy, no unreadable density collapse, and no obviously broken visual
  rhythm.

### the agent's discretion
- Planners and executors may choose the exact extraction boundary for shared
  section or container patterns, as long as they reinforce the decisions above.
- Planners and executors may choose specific breakpoint tactics per page, as
  long as desktop remains the visual quality bar and mobile preserves key
  actions and context.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and phase scope
- `.planning/PROJECT.md` — milestone scope, fixed constraints, and the v1.1 UI
  polish goal.
- `.planning/REQUIREMENTS.md` — `UI-04` and release-level visual consistency
  requirement.
- `.planning/ROADMAP.md` — Phase 10 boundary, dependency on Phase 9, and phase
  success criteria.
- `.planning/STATE.md` — current planning state snapshot. Note that it is stale
  relative to artifact reality and should not override roadmap/phase artifacts.

### Prior visual decisions
- `.planning/phases/08-stitch-mcp-integration/08-CONTEXT.md` — clarifies that
  Stitch is a design reference for agent-led refactoring, not an app feature.
- `.planning/phases/09-core-page-alignment/09-CONTEXT.md` — locked route-to-
  Stitch mappings and no-line/tonal-layering carry-forward rules.

### Design authority
- `DESIGN.md` — authoritative visual rules: no 1px borders, tonal layering,
  Lexend, glass floating elements, gradient primary actions, and ambient shadow
  philosophy.

### Known issue input
- `.planning/debug/teacher-dashboard-layout.md` — active debug note confirming
  the teacher dashboard title and main content region are currently too narrow.

## Existing Code Insights

### Reusable Assets
- `src/components/ui/button.tsx` — already encodes primary, secondary, and
  tertiary action hierarchy with rounded-full and gradient primary styling; it
  should be tightened, not bypassed.
- `src/components/ui/card.tsx` — existing white action-layer primitive for
  `surface-container-lowest`; good base for standardizing content and action
  card treatment.
- `src/components/ui/badge.tsx` — shared chip/tag primitive, though many pages
  still override badge styling inline.
- `src/components/shell/glass-nav.tsx` — established floating navigation
  pattern for glass treatment and top-level emphasis.
- `src/components/shell/route-shell.tsx` — common route framing pattern that
  already centers surfaces and keeps a tonal outer canvas.

### Established Patterns
- `src/app/globals.css` defines the design tokens for surface colors, ambient
  shadow, shell radius, and primary colors. These tokens should remain the
  canonical styling source.
- Many surfaces already align broadly with the Stitch-mapped layout direction,
  so this phase should converge and tighten them rather than redesigning routes.
- Multiple surfaces still use inline `shadow-[...]`, local rounded values, ad
  hoc semantic panels, and page-specific button/card styling. This is the main
  source of visual drift that Phase 10 should reduce.
- The current app already prefers tonal layering over borders in many places,
  so the planner should favor systematic cleanup and consolidation rather than a
  greenfield design rewrite.

### Integration Points
- `src/app/globals.css` — design tokens and cross-app visual constants.
- `src/components/shell/glass-nav.tsx`, `src/components/shell/sidebar.tsx`,
  `src/components/shell/route-shell.tsx` — shell and navigation consistency.
- `src/components/surfaces/teacher-dashboard-surface.tsx` — highest-priority
  teacher density issue and active debug input.
- `src/components/surfaces/lesson-editor-surface.tsx`,
  `src/components/classroom/classroom-control-panel.tsx`,
  `src/components/learning/teacher-review-surface.tsx`,
  `src/components/surfaces/students-management-surface.tsx` — teacher-side
  pages that should converge toward the same density language.
- `src/components/surfaces/home-surface.tsx`,
  `src/components/surfaces/student-dashboard-surface.tsx`,
  `src/components/surfaces/player-surface.tsx`,
  `src/components/surfaces/library-surface.tsx`,
  `src/components/surfaces/settings-surface.tsx` — page-type-specific emphasis,
  hero, and responsive cleanup targets.

## Specific Ideas

- One true gradient hero per page is the default rule, but hero usage depends
  on page type and does not need to be forced onto settings or list-heavy
  pages.
- Teacher-facing high-frequency pages can be visually brighter and more
  energized than calmer management pages, as long as semantic states keep their
  own colors.
- The teacher dashboard should become a compact dual-focus workspace where live
  classroom operation and daily teaching rhythm coexist without the headline or
  main content region feeling squeezed.
- Phase 10 is desktop-first, while mobile may use collapses or reduced visible
  module density to preserve clarity and prevent broken layouts.

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 10-Global Visual Polish*
*Context gathered: 2026-05-06*
