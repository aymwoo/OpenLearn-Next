# Phase 12: Classroom Launch and Built-in Teaching Steps - Research

**Researched:** 2026-05-08  
**Domain:** Dedicated teacher classroom launch flow, inline orchestration preview, built-in first-party teaching-step plugins  
**Confidence:** HIGH for codebase-aligned planning and file targeting; MEDIUM for final verification breadth because this phase still needs new verifier coverage and seeded built-in plugin data.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Classroom launch entry and recovery

- D-01: The dedicated classroom launch page uses new classroom creation as the
  primary path. Resume for an in-progress classroom is secondary guidance, not
  the default state.
- D-02: Existing `开启新课堂` entry points in the teacher shell and current
  classroom console should route into the dedicated launch surface instead of
  keeping launch embedded as the primary experience inside `/classroom`.
- D-03: If a live classroom already exists, the launch surface should show a
  clear but lower-emphasis recovery affordance so teachers can resume without
  displacing the new-launch flow.

### Launch-page preview depth

- D-04: The launch page should include an inline detailed preview rather than a
  separate preview route or a minimal summary only.
- D-05: The inline preview must show step order, per-step summary, estimated
  duration, and material cues so teachers can verify classroom flow before
  launch.
- D-06: Preview information should stay in-context on the launch page and reuse
  the existing tonal surface language.

### Built-in teaching steps in authoring

- D-07: Built-in teaching steps should appear as first-level choices inside the
  existing `新增步骤` entry flow rather than behind an extra chooser.
- D-08: The authoring surface should place these first-party step types in a
  dedicated `内置教学环节` group, separate from base step types.
- D-09: The initial built-in steps are `教师讲授`、`问卷调查`、`学生探究`、`课堂测验`、`评价`.

### Built-in plugins in marketplace and registry

- D-10: Built-in teaching-step plugins are enabled by default, may be turned
  off, and may not be deleted.
- D-11: Plugin management and marketplace surfaces must explicitly label
  built-in plugins as system-provided and default-enabled.
- D-12: Built-in plugin records should still flow through the existing safe
  plugin registry and enable/disable mechanisms.

### Scope control

- D-13: Reuse existing classroom launch, snapshot, and runtime flows where
  possible; this is a product-surface completion phase, not a runtime rewrite.
- D-14: Reuse the current safe plugin model and extend it only enough to
  support built-in teaching-step payload registration, authoring exposure, and
  classroom/runtime behavior.
- D-15: Preserve current `DESIGN.md` and Phase 10 constraints: one main stage
  per page, no divider-line structure, and the shared ghost-focus form language.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLASS-01 | Teacher can launch a published lesson as a classroom session with a roster. | Reuse `launchClassroomSessionAction()` and `launchClassroomSession()`; move the launch UI to a dedicated route while preserving DAL + Server Action boundaries. |
| CLASS-02 | Teacher can see and change the active step of a live classroom session. | Resume entry must route teachers back into the existing `/classroom` runtime so active-step control remains the live console responsibility. |
| CLASS-03 | Teacher can switch classroom locked/unlocked mode. | Phase 12 must not fork runtime behavior; dedicated launch page should hand off to the existing session console and status copy. |
| CLASS-04 | Student player reflects active step and lock-mode changes through SSE. | Launch preview must read published lesson structure only; it must not replace the current runtime/SSE snapshot path. |
| CLASS-06 | Reconnecting or late-joining students receive a consistent classroom snapshot. | Resume affordance should use `liveSessions` and existing snapshot DTOs rather than invent a parallel resume model. |
| CLASS-07 | Teacher can recover from classroom control conflicts or stale UI with clear state feedback. | Secondary resume panel should expose current live session metadata and direct teachers back to the existing recovery-capable control console. |
| LESSON-03 | Teacher can add ordered lesson steps of type `content`, `task`, and `quiz` with validated structured payloads. | Built-in teaching steps should layer on top of this foundation rather than replace base step schemas. |
| PLUGIN-04 | Developer can expose a limited action allowlist. | Built-in teaching-step behavior should extend the existing plugin action contract with explicit allowlisted verbs only. |
| PLUGIN-05 | Developer can register UI hook anchors without arbitrary script execution. | Authoring and labs/plugin-management exposure should continue to render through declarative registry data and local UI only. |

</phase_requirements>

## Summary

Phase 12 is a vertical completion phase across three already-existing systems:
the teacher classroom launch flow, the lesson authoring workspace, and the safe
plugin registry. The codebase already has working launch/server-action paths,
published lesson snapshots, lesson-step editing, plugin registry CRUD, and labs
plugin controls. What is missing is product integration: a dedicated launch
surface, inline pre-launch orchestration preview, seeded built-in teaching-step
plugin records, and a safe first-party extension contract that can expose those
plugins in authoring and plugin management without arbitrary JavaScript.

The safest plan order is: (1) split launch preparation from active runtime and
route existing CTAs into it; (2) reuse existing lesson/published snapshot data
to build an inline preview on the launch page; (3) seed built-in plugin records
and add immutable built-in metadata to management surfaces; (4) extend the safe
plugin schema/renderer/authoring integration just enough for first-party step
templates and classroom/runtime affordances.

**Primary recommendation:** keep the roadmap's 4-plan split. It matches current
code ownership boundaries and minimizes risk: route/surface work, preview data
work, registry/seed work, and plugin-integration work.

## Architectural responsibility map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Dedicated launch page and CTA routing | Frontend Server / Client | API / Backend | UI lives in routes and surfaces; actual launch still goes through Server Actions + DAL. |
| Launch preview DTO shaping | API / Backend | Frontend Server | Preview needs stable published lesson data, material refs, and any live-session summary in sanitized DTO form. |
| Resume affordance | API / Backend | Frontend Server | Live classroom lookup belongs in DAL, while rendering remains in the launch page. |
| Built-in plugin seeding/default enablement | Database / Storage | API / Backend | Built-in records must be present in the registry and survive app restarts; seed/bootstrap is the right source. |
| Built-in plugin labels and non-deletable state | API / Backend | Frontend Server | Registry DTOs should expose immutable built-in metadata so UI doesn't guess. |
| Built-in teaching-step exposure in authoring | Frontend Server / Client | API / Backend | Authoring buttons live in client UI, but insertion payloads and runtime behavior must stay schema-validated and server-backed. |
| Built-in runtime proposals | API / Backend | Frontend Server | Safe first-party plugin actions should reuse the plugin dispatcher and local renderers, not ad hoc client code. |

## Existing code patterns and likely files

| Area | Existing pattern / gap | Likely files |
|------|------------------------|--------------|
| Launch UI | `ClassroomConsoleSurface` currently combines launch prep and active runtime in one route. | `src/app/(classroom)/classroom/page.tsx`, `src/components/surfaces/classroom-console-surface.tsx`, `src/components/classroom/classroom-launch-panel.tsx` |
| Teacher shell CTA | `开启新课堂` buttons exist but are not linked to a dedicated route. | `src/components/shell/sidebar.tsx`, `src/app/(teacher)/teacher/layout.tsx` |
| Launch data | `getClassroomConsoleDTO()` returns published lessons and live sessions, but the published lesson records are broad and preview-thin. | `src/lib/dal/classroom.ts`, `src/lib/dto/classroom.ts` |
| Authoring add-step zone | Base step buttons are direct first-level actions in `LessonAuthoringWorkspace`. | `src/components/authoring/lesson-authoring-workspace.tsx`, `src/actions/lesson-authoring-actions.ts`, `src/lib/dto/lesson-authoring.ts` |
| Plugin registry UI | Labs settings already list and toggle plugins by school. | `src/components/surfaces/settings-surface.tsx`, `src/actions/plugin-actions.ts`, `src/lib/dal/plugins.ts` |
| Safe plugin rendering | `PluginRenderer` resolves enabled plugins for `dashboard.widget` and `lesson.sidebar` only. | `src/components/plugins/plugin-renderer.tsx`, `src/server/plugins/registry.ts`, `src/lib/dal/plugins.ts` |
| Dev seed path | `bootstrap-dev-db.ts` creates a published lesson but no built-in plugin rows. | `scripts/bootstrap-dev-db.ts` |

## Dependency and order constraints

1. Launch routing should move first, because preview and resume UX need a stable
   dedicated surface.
2. Preview DTO work must land before UI polish, because step summaries,
   durations, and material cues need a single server-shaped source of truth.
3. Built-in registry metadata must exist before labs/plugin-management UI can
   label plugins as `系统内置` and disable deletion affordances safely.
4. Authoring built-in step buttons should land after seeded manifests and
   registry metadata exist, otherwise the UI will hard-code a plugin set with no
   backing registry state.
5. Any new built-in plugin behavior must reuse allowlisted actions and local UI
   renderers; do not introduce `eval`, remote imports, or plugin-defined code.

## Common pitfalls

### Pitfall 1: Launch page becomes a duplicate runtime console

If the new page reimplements active classroom control instead of preparing and
resuming, it will fork the runtime and duplicate Phase 11 classroom behavior.
Keep launch preparation on the dedicated route and active control in
`/classroom`.

### Pitfall 2: Preview reads mutable draft data instead of launchable snapshot

Teachers launch published versions, not draft-only steps. Preview should be
based on the currently launchable lesson structure and clearly surface material
and duration cues without implying unpublished edits are live.

### Pitfall 3: Built-in plugin state lives only in UI constants

If `教师讲授` and related entries only exist as hard-coded buttons, plugin
management will drift from authoring reality. Seed registry records and expose
`builtIn/defaultEnabled/nonDeletable` metadata through DTOs.

### Pitfall 4: Built-in plugin support bypasses the safe registry

First-party status is not an excuse to skip permissions, anchors, DTO schemas,
or audits. Reuse the existing registry and extend it with explicit built-in-safe
fields and actions only.

### Pitfall 5: Authoring step insertion breaks `lessonStepPayloadSchema`

Built-in teaching-step buttons still need to insert valid `content` / `task` /
`quiz` payloads or an explicitly extended schema. The planner should keep the
smallest viable payload model that works with existing editor and player code.

## Proposed plan breakdown and verification commands

| Plan | Scope | Key Files | Must Verify |
|------|-------|-----------|-------------|
| 12-01 | Dedicated launch route, CTA routing, resume affordance | `src/app/(teacher)/teacher/launch/page.tsx`, `src/components/surfaces/classroom-launch-surface.tsx`, `src/components/shell/sidebar.tsx`, `src/app/(teacher)/teacher/layout.tsx`, `src/app/(classroom)/classroom/page.tsx` | `pnpm typecheck`; scoped eslint on launch route/surface/shell files |
| 12-02 | Inline launch preview DTO + UI completion | `src/lib/dal/classroom.ts`, `src/lib/dto/classroom.ts`, `src/components/classroom/classroom-launch-panel.tsx`, new preview components | `pnpm typecheck`; preview-focused component/DAL tests or verifier checks |
| 12-03 | Built-in plugin seed data, registry metadata, labs/market labels | `scripts/bootstrap-dev-db.ts`, `src/lib/dto/resource-ai.ts`, `src/lib/dal/plugins.ts`, `src/components/surfaces/settings-surface.tsx`, optional marketplace route/surface files | `pnpm run db:bootstrap:dev`; `pnpm typecheck`; scoped eslint |
| 12-04 | Built-in safe plugin actions and authoring/runtime integration | `src/server/plugins/registry.ts`, `src/lib/dal/plugins.ts`, `src/components/authoring/lesson-authoring-workspace.tsx`, `src/components/plugins/plugin-renderer.tsx`, plugin widgets/tests/verifier | `pnpm test -- <targeted files>`; `pnpm typecheck`; `pnpm run verify:phase11` if plugin boundaries are touched |

## Verification matrix

| Behavior | Test Type | Exact Check |
|----------|-----------|-------------|
| Teacher shell routes to dedicated launch surface | UI / static | `Sidebar` and teacher header button both link to the new launch route. |
| Resume is secondary to new launch | Component / manual | Launch page renders a lower-emphasis live-session recovery card when `liveSessions.length > 0`. |
| Preview stays inline | Component / manual | Launch page renders preview below or beside the form without navigating to a separate route or modal. |
| Preview includes order, summary, duration, materials | DTO + component | Preview DTO exposes step order, summary text, estimated duration, and material cues; component renders each field. |
| Built-in plugins are seeded and enabled by default | Seed / DAL | After bootstrap, five built-in plugins exist, are labeled built-in, and start enabled. |
| Built-in plugins cannot be deleted | DAL / action | Delete path rejects built-in plugin IDs with a specific error. |
| Labs/plugin manager labels built-ins clearly | Component / manual | UI shows `系统内置` and `默认开启` before secondary metadata. |
| Authoring shows built-in steps in first-level group | Component | `LessonAuthoringWorkspace` renders a dedicated `内置教学环节` group with five direct actions. |
| Built-in plugin runtime stays declarative | Static / test | `registry.ts` only exposes explicit allowlisted first-party actions; no `eval`, remote import, or arbitrary render path appears. |

## Key insight

The main work is not inventing new runtime infrastructure. The main work is
making already-existing launch, authoring, and plugin systems feel like one
coherent teacher workflow while preserving the project's DAL, cache, and safe
plugin boundaries.
