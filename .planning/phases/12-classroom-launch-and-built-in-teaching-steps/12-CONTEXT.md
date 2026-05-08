# Phase 12: Classroom Launch and Built-in Teaching Steps - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 delivers a dedicated teacher launch flow for starting classrooms,
completes the lesson orchestration preview needed before launch, and turns the
existing safe plugin foundation into a usable first-party built-in teaching-step
system that is visible in authoring and plugin management by default.

This phase should reuse the existing classroom runtime, snapshot, and plugin
execution boundaries from Phase 11. It should not introduce arbitrary plugin
JavaScript execution, a third-party plugin marketplace, advanced branching
lesson graphs, or a separate classroom runtime architecture.

</domain>

<decisions>
## Implementation Decisions

### Classroom launch entry and recovery
- **D-01:** The dedicated classroom launch page uses new classroom creation as
  the primary path. Resume for an in-progress classroom is secondary guidance,
  not the default state.
- **D-02:** Existing "开启新课堂" entry points in the teacher shell and current
  classroom console should route into the dedicated launch surface instead of
  keeping launch embedded as the primary experience inside `/classroom`.
- **D-03:** If a live classroom already exists, the launch surface should show a
  clear but lower-emphasis recovery affordance so teachers can resume without
  displacing the new-launch flow.

### Launch-page preview depth
- **D-04:** The launch page should include an inline detailed preview rather
  than a separate preview route or a minimal summary only.
- **D-05:** The inline preview must show step order, per-step summary, estimated
  duration, and material cues so teachers can verify classroom flow before
  launch.
- **D-06:** Preview information should be presented in-context on the launch
  page, using the existing tonal surface language, so teachers do not lose class
  and lesson selection context before they start the session.

### Built-in teaching steps in authoring
- **D-07:** Built-in teaching steps should appear as first-level choices inside
  the existing "新增步骤" entry flow rather than being hidden behind an extra
  selection layer.
- **D-08:** The authoring surface should place these first-party step types in a
  dedicated "内置教学环节" group, separate from the existing base step types,
  so teachers can distinguish core schema types from built-in instructional
  templates.
- **D-09:** The initial first-party built-in steps are 教师讲授、问卷调查、学生探究、课堂测验、评价. They must be available from the authoring flow by
  default once the plugin manifests are seeded and enabled.

### Built-in plugins in marketplace and registry
- **D-10:** Built-in teaching-step plugins are enabled by default, may be turned
  off, and may not be deleted.
- **D-11:** The plugin management and marketplace surfaces must explicitly label
  built-in plugins as system-provided and default-enabled so they are not
  confused with removable third-party extensions.
- **D-12:** Built-in plugin records should still flow through the existing safe
  plugin registry and enable/disable mechanisms so runtime behavior remains
  declarative, auditable, and consistent with current plugin constraints.

### Scope control
- **D-13:** Reuse existing classroom launch, snapshot, and runtime data flows
  where possible; Phase 12 is a product-surface completion phase, not a runtime
  rewrite.
- **D-14:** Reuse the current safe plugin model and extend it only enough to
  support built-in teaching-step payload registration, authoring UI exposure,
  and classroom/runtime behavior.
- **D-15:** Preserve the current design constraints from `DESIGN.md` and Phase
  10: one main stage per page, no divider-line UI structure, and reuse of the
  shared ghost-focus field/select contract.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product scope and requirements
- `.planning/ROADMAP.md` — Phase 12 goal, plan breakdown, dependency on Phase
  11, and success criteria.
- `.planning/REQUIREMENTS.md` — Requirement IDs tied to this phase, especially
  `CLASS-01`, `CLASS-02`, `CLASS-03`, `CLASS-04`, `CLASS-06`, `CLASS-07`,
  `LESSON-03`, `PLUGIN-04`, and `PLUGIN-05`.
- `.planning/PROJECT.md` — project-wide constraints: Next.js 16, DAL + Server
  Actions only, SQLite-first, explicit cache invalidation, safe plugin model,
  and Stitch / `DESIGN.md` design authority.
- `.planning/STATE.md` — latest state snapshot and carry-forward UI decisions
  relevant to classroom launch styling and shell entry points.

### Prior phase decisions that carry forward
- `.planning/phases/11-plugin-theme-classroom-readiness/11-CONTEXT.md` — locked
  plugin safety, school isolation, classroom reliability, and teacher classroom
  loop decisions that Phase 12 must build on.
- `.planning/phases/10-global-visual-polish/10-CONTEXT.md` — locked visual
  rules for teacher density, single-stage emphasis, restrained gradient/glass,
  and shared focus-field behavior.
- `.planning/phases/09-core-page-alignment/09-CONTEXT.md` — route-to-Stitch
  mapping, including `/classroom` as the existing classroom runtime surface.

### Existing reviews and implementation notes
- `docs/teacher-classroom-flow-review.md` — current teacher authoring,
  classroom launch/control, SSE, player, and classroom readiness gaps.
- `docs/plugin-system-review.md` — plugin lifecycle, registry, enable/disable,
  rendering, permissions, and audit constraints.
- `docs/plugin-theme-implementation-plan.md` — current plugin implementation
  sequence and file-level integration notes relevant to extending first-party
  plugin behavior.

### Design authority
- `DESIGN.md` — authoritative UI rules for Lexend, no-line surfaces, tonal
  layering, gradient CTA usage, and glass treatment.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/classroom/classroom-launch-panel.tsx` — existing new-session
  launch form with lesson/class selection and `launchClassroomSessionAction`
  wiring; likely base extraction point for the new dedicated launch page.
- `src/components/surfaces/classroom-console-surface.tsx` — current combined
  launch/runtime surface; useful for separating launch preparation from active
  classroom control while preserving visual language.
- `src/actions/classroom-actions.ts` — existing launch, step-change, mode-change,
  snapshot refresh, and session end Server Actions that the new launch flow
  should reuse.
- `src/components/surfaces/lesson-editor-surface.tsx` — existing authoring shell
  with "预览课堂" affordance and current integration point for built-in step
  entry exposure.
- `src/components/authoring/lesson-authoring-workspace.tsx` — current step add
  buttons, flow-step cards, per-step summary, durations, and lesson materials
  context; strongest starting point for both built-in step grouping and preview
  data reuse.
- `src/components/plugins/plugin-renderer.tsx` — current safe anchor-based plugin
  rendering boundary for enabled plugins.
- `src/actions/plugin-actions.ts` — existing register/list/get/delete,
  enable/disable, kill-switch, and hook-run actions for plugin registry flows.
- `src/components/shell/sidebar.tsx` and
  `src/app/(teacher)/teacher/layout.tsx` — current teacher-shell "开启新课堂"
  entry points that need to route to the dedicated launch page.

### Established Patterns
- Classroom launching already uses a Server Action + DAL path and should stay in
  that boundary rather than introducing client-only session logic.
- Current classroom runtime treats `/classroom` as the active control surface;
  the dedicated launch page should feed into it instead of replacing it.
- Authoring currently exposes three base step types (`content`, `task`,
  `quiz`) through direct first-level buttons; built-in teaching steps should fit
  this mental model rather than add a hidden chooser.
- Plugin execution is already declarative and anchor-driven, so built-in steps
  should extend the manifest/action contract instead of bypassing it with custom
  unsafe code paths.
- Teacher-side pages already follow the denser command-center language from
  Phase 10 and should preserve a single dominant stage with tonal nested panels.

### Integration Points
- `src/app/(classroom)/classroom/page.tsx` — current route assembly for launch
  versus active classroom runtime state.
- `src/lib/dal/classroom` and `src/lib/dto/classroom` — classroom launch data,
  live session lookup, snapshot DTOs, and any resume affordance data required by
  the dedicated launch page.
- `src/lib/dal/lesson-authoring` and `src/lib/dto/lesson-authoring.ts` — lesson
  step, summary, duration, and materials data needed for inline launch preview.
- `src/lib/dal/plugins` plus `src/lib/dto/resource-ai` — manifest schema,
  enable-state rules, action contracts, and built-in plugin metadata.
- Teacher shell routes and navigation components — current CTA buttons must be
  wired into the new launch route without changing broader shell behavior.

</code_context>

<specifics>
## Specific Ideas

- The dedicated launch page should feel like a preparation surface, but still
  keep "新开课堂" as the dominant action even when a resumable classroom exists.
- Recovery UI should be discoverable and fast, but visually secondary to the
  new launch form.
- The inline preview should let teachers inspect the exact classroom step order
  before launch, including summary text, time expectations, and material cues.
- Built-in teaching steps should be immediately visible in authoring as a
  dedicated first-party group rather than treated as hidden plugin plumbing.
- Built-in plugin cards in the marketplace/manager should clearly communicate
  `系统内置` and `默认开启`, while still letting teachers or admins disable them
  when needed.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-classroom-launch-and-built-in-teaching-steps*
*Context gathered: 2026-05-08*
