# Phase 11: Plugin, Theme, and Classroom Readiness - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning
**Source:** Docs-driven plan-phase request

<domain>
## Phase Boundary

This phase turns three currently incomplete subsystems into usable end-to-end flows:

- Plugin system: registration must become operational through enable/disable, school-scoped hook execution, permissions enforcement, CRUD/listing, UI rendering, and auditability.
- Theme plugin system: theme tokens must move from stored/validated JSON into a runtime-applied active theme via cookie-backed selection and a server-rendered CSS variable injector.
- Teacher classroom workflow: the editor/live-classroom/student-player loop must close the gaps documented in the teacher classroom review, prioritizing autosave, connection state, lock-mode enforcement, and reliable snapshots.

The phase should not build a marketplace, arbitrary plugin JavaScript execution, sandboxed remote code, full gradebook, advanced branching classroom flows, or production-grade realtime infrastructure beyond what is needed to make the current classroom loop usable.

</domain>

<decisions>
## Implementation Decisions

### Plugin System

- D-01: Add an explicit `setPluginEnabled(pluginId, enabled)` DAL path and Server Action so registered plugins can be enabled and disabled after manifest validation.
- D-02: `runPluginHook()` must enforce both school isolation and manifest-declared permissions before dispatching any plugin action.
- D-03: Plugin CRUD must include list/get/delete paths for a school scope so admins can inspect and clean up registered plugins.
- D-04: Server Actions must validate plugin manifests with `PluginManifestSchema` before calling DAL; `manifestJson: z.any()` should not remain the first user-facing validation boundary.
- D-05: Hook rendering must use a Server Component `PluginRenderer` that resolves enabled plugins for an anchor, dispatches allowlisted actions, and renders safe widget components only.
- D-06: Plugin UI must remain declarative and safe: no `eval()`, no arbitrary remote JS, no plugin direct DB/API/provider-key access.

### Theme Plugins

- D-07: `PluginManifestSchema` should support an optional `theme` payload using the existing theme token schema; enabling a theme plugin should register its theme tokens.
- D-08: `compileThemeTokensToCssVariables()` must emit surface variables using the existing Tailwind/global convention (`--color-surface...`), not `--surface-*`.
- D-09: Runtime theme selection should use a cookie-backed `activeThemeId` preference and a server-rendered `ThemeInjector` in `src/app/layout.tsx`.
- D-10: Settings UI should expose a functional theme selector with a default reset option and valid per-school theme options.
- D-11: Theme tokens must continue to respect `DESIGN.md`: Lexend, Simplified Chinese product language, no-line tonal surfaces, permitted surface roles, and accessibility-oriented contrast.

### Teacher Classroom Flow

- D-12: Lesson step edits in the authoring workspace must persist through autosave or explicit save actions; current editable payload fields cannot remain decorative default-value inputs.
- D-13: Student connection state must be updated by classroom runtime activity so teacher roster status no longer remains permanently `offline`.
- D-14: Locked classroom mode must be enforced on the server-side player/personal DTO path, not only by disabling UI links in the client.
- D-15: Reconnecting or late-joining students must receive a consistent snapshot and not fail due to missing participant rows when the user is authorized for the class.
- D-16: Teacher classroom control should receive reliable runtime feedback after state changes; SSE/snapshot behavior should be sufficient for the teacher-led flow, even if deeper push infrastructure is deferred.

### Scope Control

- D-17: Keep the implementation SQLite-first, DAL + Server Actions only, and Node runtime for DB/auth logic; Edge remains limited to SSE route handlers.
- D-18: Prefer minimal vertical slices that make the flows usable before expanding optional admin/marketplace polish.
- D-19: Tests must cover permission/school denial paths, theme token compilation/application, autosave persistence, server lock enforcement, and classroom connection/snapshot behavior.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source Reviews And Implementation Notes
- `docs/plugin-system-review.md` — Current plugin lifecycle, missing enable API, school isolation, permission checks, CRUD/listing, UI integration, and audit gaps.
- `docs/plugin-theme-implementation-plan.md` — Proposed end-to-end plugin + theme implementation sequence and file list.
- `docs/theme-system-design.md` — Current theme token schema, DAL, validation behavior, CSS variable mismatch, and runtime application gaps.
- `docs/teacher-classroom-flow-review.md` — Current teacher authoring, classroom launch/control, SSE, student player, review flow, and prioritized classroom gaps.

### Project Contracts
- `.planning/REQUIREMENTS.md` — Requirement IDs covered by this phase, especially PLUGIN, CLASS, LESSON-05, AUTH-05, and DATA-04.
- `AGENTS.md` — Project constraints: Next.js 16 App Router, React 19.2, DAL + Server Actions only, SQLite-first Drizzle, explicit cache invalidation, safe plugin model, and `DESIGN.md` compliance.
- `DESIGN.md` — Visual and interaction language for any plugin/theme/settings/dashboard UI work.

</canonical_refs>

<specifics>
## Specific Ideas

- Use a Server Component `PluginRenderer` with anchor values such as `dashboard.widget` and `lesson.sidebar`; render typed widgets for `stepSuggestion`, `lessonAnnotation`, and `notificationStub` proposals.
- Add `theme-actions.ts`, `theme-cookie.ts`, `ThemeInjector`, and settings/labs UI integration only after the DAL and token compiler path are correct.
- Treat school isolation as a blocking security requirement for plugin hook execution and classroom snapshots.
- Keep theme persistence cookie-based for this phase; do not introduce a new user preference table unless implementation proves cookie is insufficient.
- Keep plugin actions allowlisted and deterministic; do not implement external registries, sandboxes, or plugin marketplaces.

</specifics>

<deferred>
## Deferred Ideas

- External plugin marketplace or registry integration.
- Arbitrary plugin JavaScript, WASM sandboxing, or remote dynamic imports.
- Plugin-to-plugin communication.
- Shared central theme marketplace/discovery.
- Light/dark variant expansion beyond the current single flat theme token registry.
- Full gradebook, advanced branching classroom flows, production pub/sub infrastructure, or SIS/export workflows.

</deferred>

---

*Phase: 11-plugin-theme-classroom-readiness*
*Context gathered: 2026-05-07 via docs-driven plan-phase request*
