# Phase 20 Research — Help center and developer guides

**Date:** 2026-05-11
**Phase:** 20
**Status:** Complete

## Research question

What does the planner need to know to design `/help` as a product-native,
teacher-shell-compatible help center that stays accurate to the current plugin,
theme, and schedule-extension implementation?

## Key findings

### 1. `/help` exists as a product entry, but no route or shell integration exists yet

- `src/components/shell/sidebar.tsx` already renders a first-class sidebar link to
  `/help`, so this phase is not adding a speculative entry point.
- There is no `src/app/help/**` route today, so the current sidebar link points to a
  missing product page.
- Teacher-facing shell integration currently happens through `TeacherSidebarShell`
  in `src/app/(teacher)/teacher/layout.tsx`, `src/app/settings/layout.tsx`, and
  `src/app/(library)/resources/layout.tsx`.
- Phase 19 moved shell behavior into route metadata and the centralized shell
  resolver. `src/lib/theme-layout/route-surface-registry.ts` currently does not
  define `/help`, so Phase 20 must extend the allowlisted route registry instead of
  hardcoding a shell exception.

### 2. The first implementation decision must be route/shell wiring, not page copy

- The UI contract explicitly requires `/help` and `/help/*` to render inside
  `TeacherSidebarShell` and forbids a docs-only layout or a root page detached from
  the shell.
- Because the shell now depends on `TeacherThemeRouteKey`, the implementation needs
  an allowlisted route identity for `/help`, `/help/plugins`, `/help/themes`, and
  `/help/actions-interfaces` before any surface work starts.
- The active sidebar state already supports prefix matching in
  `src/components/shell/sidebar.tsx` (`currentPath.startsWith(item.href)` for
  non-`/teacher` items), so one `/help` nav item can cover the child pages once the
  route renders through the shell.

### 3. The current visual system already has reusable content-page patterns

- `src/components/surfaces/settings-surface.tsx` shows the repo's existing
  teacher-facing pattern for overview pages: shell header, layered tonal cards,
  bilingual-free Chinese product copy, and CTA cards.
- `src/components/surfaces/plugin-marketplace-surface.tsx` shows the repo's existing
  pattern for denser content pages: hero, main narrative column, and a right-side
  summary aside using tonal cards instead of docs-style rails.
- These two surfaces provide the right analogs for `/help` home and developer detail
  pages. A separate markdown docs layout would fight both the repository's current
  visual language and the phase's locked decisions.

### 4. Plugin documentation must describe the real manifest, allowlist, and school scope

- `src/lib/dto/resource-ai.ts` is the single source of truth for the current plugin
  contract:
  - hook anchors: `dashboard.widget`, `lesson.sidebar`, `schedule.assistant`
  - actions: `addStepSuggestion`, `annotateLesson`, `createNotificationStub`,
    `suggestBuiltInTeachingStep`, `insertBuiltInTeachingStepTemplate`,
    `createScheduleOverrideProposal`, `createScheduleReminderDraft`,
    `annotateScheduleConflict`
  - manifest fields: `id`, `version`, `permissions`, `anchors`, `actions`,
    `builtIn`, `defaultEnabled`, `nonDeletable`, optional `theme`
- `src/server/plugins/registry.ts` is the real allowlist and permission map. The
  developer guide must quote its real action names and the current permission
  requirements rather than inventing a broader plugin API.
- `src/lib/dal/plugins.ts` and `src/actions/plugin-actions.ts` confirm the current
  activation path: registration and management are school-scoped, guarded through
  teacher-owned DAL / Server Actions, and plugin enablement can register theme
  tokens.

### 5. Theme documentation must describe runtime flow, not just token fields

- `src/lib/dto/resource-ai.ts` defines `ThemeTokenRegistrySchema`, including an
  optional `layout` contract, so the theme guide must cover both token and layout
  runtime concerns.
- `src/actions/theme-actions.ts` confirms the current write boundary:
  `registerThemeTokensAction()` and `setActiveThemeAction()` are the user-facing
  mutation entry points.
- `src/lib/dal/themes.ts` confirms the current runtime path:
  active theme cookie -> actor-scoped theme lookup -> compiled layout runtime and CSS
  variables.
- `src/server/themes/tokens.ts` compiles shell config and page-level runtime from the
  allowlisted route registry. The theme guide therefore needs to explain
  `manifest.theme -> registerThemeTokensAction -> setActiveThemeAction ->
  compileThemeLayoutRuntime -> TeacherSidebarShell/ThemeInjector`, not just show a
  token JSON blob.

### 6. Schedule extension docs must be explicitly proposal-only

- `src/lib/dto/resource-ai.ts` defines only three schedule proposal payloads:
  `scheduleOverrideProposal`, `scheduleReminderDraft`, and
  `scheduleConflictAnnotation`.
- `src/server/plugins/registry.ts` only dispatches schedule proposal/draft actions.
  There is no direct runtime schedule write action in the current allowlist.
- This aligns with Phase 18 decisions: the `/help/actions-interfaces` page must frame
  the schedule extension surface as proposal-only, centered on
  `schedule.assistant`, and must not suggest direct writes to runtime schedule tables.

### 7. There is already a pattern for phase-specific verification commands

- `package.json` already exposes `verify:phase16`, `verify:phase17`,
  `verify:phase18`, and `verify:phase19`.
- `scripts/verify-phase19-shell-route-metadata.ts` shows the preferred pattern:
  lightweight static checks plus a targeted `pnpm test --run ...` regression suite.
- Phase 20 should follow the same model with a dedicated verification command that
  checks:
  - `/help` routes exist
  - `/help` route keys are allowlisted in route metadata
  - teacher help content contains no code blocks
  - developer detail pages contain the required state labels and critical contract
    strings
  - schedule guide clearly says proposal-only

## Planning implications

1. Plan 20-01 must land first and own the route metadata + shell-compatible route
   layout + shared help surfaces + IA scaffolding.
2. Plan 20-02 should focus on plugin and theme guide content because both depend on
   the shared detail-page template from 20-01 and the current runtime contracts.
3. Plan 20-03 should cover the actions/interfaces guide plus verification/guardrails,
   because it depends on the route structure and should ship the dedicated
   `verify:phase20` safety path.

## Risks and landmines

- The biggest regression risk is implementing `/help` as an isolated root page and
  bypassing Phase 19 route metadata. That would satisfy copy requirements but violate
  the current shell architecture.
- A second risk is writing idealized docs that promise more plugin/theme/schedule
  capability than the code currently supports. The guides must be grounded in
  `resource-ai.ts`, `registry.ts`, DAL, and Server Actions.
- A third risk is mixing teacher help and developer docs into one long page. The UI
  contract requires role split on `/help` and exactly three developer detail pages.

## Recommended execution order

1. Extend route metadata and build a shared `/help` shell path.
2. Create the overview surface and shared developer detail-page template.
3. Author plugin and theme guides against current contracts.
4. Author actions/interfaces guide with proposal-only framing.
5. Add a dedicated verification script and targeted tests/static checks to catch drift.

## Conclusion

Phase 20 is best treated as a teacher-shell product surface plus codebase-grounded
content work, not as a separate docs system. The planner should force shell/route
integration first, then implement shared surfaces, then fill the three developer
guides and the lightweight teacher overview, and finally lock the result with a
phase-specific verifier.
