# Phase 11: Plugin, Theme, and Classroom Readiness - Research

**Researched:** 2026-05-07  
**Domain:** Safe declarative plugin execution, per-school theme runtime application, teacher-led classroom reliability  
**Confidence:** HIGH for codebase/docs-derived implementation guidance; MEDIUM for UI/e2e test exactness because no Playwright specs currently exist in the repo. [VERIFIED: .planning/config.json, package.json, codebase reads]

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### the agent's Discretion

## Specific Ideas

- Use a Server Component `PluginRenderer` with anchor values such as `dashboard.widget` and `lesson.sidebar`; render typed widgets for `stepSuggestion`, `lessonAnnotation`, and `notificationStub` proposals.
- Add `theme-actions.ts`, `theme-cookie.ts`, `ThemeInjector`, and settings/labs UI integration only after the DAL and token compiler path are correct.
- Treat school isolation as a blocking security requirement for plugin hook execution and classroom snapshots.
- Keep theme persistence cookie-based for this phase; do not introduce a new user preference table unless implementation proves cookie is insufficient.
- Keep plugin actions allowlisted and deterministic; do not implement external registries, sandboxes, or plugin marketplaces.

### Deferred Ideas (OUT OF SCOPE)

## Deferred Ideas

- External plugin marketplace or registry integration.
- Arbitrary plugin JavaScript, WASM sandboxing, or remote dynamic imports.
- Plugin-to-plugin communication.
- Shared central theme marketplace/discovery.
- Light/dark variant expansion beyond the current single flat theme token registry.
- Full gradebook, advanced branching classroom flows, production pub/sub infrastructure, or SIS/export workflows.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLUGIN-01 | Register plugins through validated declarative JSON manifests. | Move `PluginManifestSchema` validation to Server Actions and keep DAL parse as canonical persistence guard. [VERIFIED: .planning/REQUIREMENTS.md, src/actions/plugin-actions.ts, src/lib/dto/resource-ai.ts] |
| PLUGIN-02 | Plugin execution follows `Event -> Hook -> Action -> Core API` without unsafe execution/direct access. | Keep `dispatchPluginAction()` deterministic/allowlisted and render only local safe widgets. [VERIFIED: docs/plugin-system-review.md, src/server/plugins/registry.ts] |
| PLUGIN-03 | Plugin permissions checked before injecting safe context parameters. | Add permission/school checks before `dispatchPluginAction()` in `runPluginHook()`. [VERIFIED: docs/plugin-system-review.md, src/lib/dal/plugins.ts] |
| PLUGIN-04 | Limited action allowlist exposed. | Reuse current action enum and dispatcher, do not add arbitrary action strings. [VERIFIED: src/lib/dto/resource-ai.ts, docs/plugin-system-review.md] |
| PLUGIN-05 | UI hook anchors registered without arbitrary script execution. | Add RSC `PluginRenderer` for `dashboard.widget` and `lesson.sidebar` anchors. [VERIFIED: 11-CONTEXT.md, docs/plugin-theme-implementation-plan.md] |
| PLUGIN-06 | Declarative theme tokens respect design constraints. | Extend manifest with optional `theme`, validate via `ThemeTokenRegistrySchema` + `validateThemeTokens()`, fix CSS variable compilation. [VERIFIED: docs/theme-system-design.md, src/server/themes/tokens.ts] |
| PLUGIN-07 | Hook runs, denied actions, permission failures, kill-switch state recorded. | Existing audit tables/functions should be extended to denied `school_mismatch` / `permission_denied`. [VERIFIED: src/db/schema.ts, src/lib/dal/plugins.ts] |
| CLASS-01 | Teacher can launch published lesson as session with roster. | Existing launch path exists; phase should keep it and add late-join/snapshot hardening. [VERIFIED: src/lib/dal/classroom.ts] |
| CLASS-02 | Teacher can see/change active step. | Existing control action uses optimistic versioning; phase should preserve conflict handling and update cache tags. [VERIFIED: src/actions/classroom-actions.ts, src/lib/dal/classroom.ts] |
| CLASS-03 | Teacher can switch locked/unlocked mode. | Existing `changeClassroomMode()` updates DB; phase must enforce lock in server-side student DTO. [VERIFIED: src/lib/dal/classroom.ts, src/lib/dal/learning.ts] |
| CLASS-04 | Student player reflects changes through SSE. | Existing SSE route polls snapshot every 2000ms; add connection-state writes and reliable fallback. [VERIFIED: src/app/api/classroom/[sessionId]/events/route.ts] |
| CLASS-05 | Classroom state durable in SQLite. | Existing classroom sessions, participants, events tables persist state; avoid in-memory-only changes. [VERIFIED: src/db/schema.ts] |
| CLASS-06 | Reconnecting/late-joining students receive consistent snapshot. | Add participant ensure/upsert for authorized class members before snapshot returns. [VERIFIED: docs/teacher-classroom-flow-review.md, src/lib/dal/classroom.ts] |
| CLASS-07 | Teacher recovers from stale UI/conflicts. | Existing action DTO carries conflict snapshot; phase should verify UI feedback and refresh commands. [VERIFIED: src/actions/classroom-actions.ts, src/components/classroom/classroom-control-panel.tsx] |
| LESSON-05 | Teacher can autosave draft lesson and step changes. | Existing Server Action and DAL update exist, but editor fields do not call them; convert editor to save-enabled client/form flow. [VERIFIED: src/actions/lesson-authoring-actions.ts, src/components/authoring/lesson-step-editor.tsx] |
| AUTH-05 | Server Actions and DAL verify actor, role, school membership, ownership, enrollment, scope. | Reuse `assertActiveTeacher`/`assertActiveStudent` patterns and add plugin/theme school-scope checks. [VERIFIED: src/lib/dal/lesson-authoring.ts, src/lib/dal/learning.ts, src/lib/dal/plugins.ts] |
| DATA-04 | Validate all plugin/theme/step/classroom inputs with Zod before persistence. | Use current Zod DTO schemas and add missing action-level manifest/theme validation. [VERIFIED: src/lib/dto/resource-ai.ts, src/lib/dto/classroom.ts, src/lib/dto/lesson-authoring.ts; CITED: https://zod.dev/v4/changelog] |

</phase_requirements>

## Summary

Phase 11 is not a greenfield build; it is a convergence phase that turns existing skeletons into usable vertical flows. The codebase already has plugin tables, theme tables, classroom tables, Server Actions, DTO schemas, and UI shells, but the reviews identify missing runtime glue: plugins cannot be enabled, plugin permissions/school scope are not enforced, theme tokens are not injected into the DOM, lesson step inputs are decorative, roster connection state never changes, and classroom lock mode is enforced only in client UI. [VERIFIED: docs/plugin-system-review.md, docs/theme-system-design.md, docs/teacher-classroom-flow-review.md, src/lib/dal/plugins.ts, src/server/themes/tokens.ts, src/components/authoring/lesson-step-editor.tsx, src/lib/dal/classroom.ts, src/lib/dal/learning.ts]

The planning priority should be dependency-ordered: first harden schemas/DAL/security boundaries, then wire Server Actions and cache invalidation, then introduce RSC renderers/injectors and client form/autosave behavior, then run integration/e2e checks across teacher settings, plugin rendering, theme application, and classroom runtime. This avoids building UI that can only exercise unsafe or incomplete data paths. [VERIFIED: AGENTS.md, 11-CONTEXT.md, docs/plugin-theme-implementation-plan.md]

**Primary recommendation:** Plan six executable slices: (1) plugin DAL/action/security, (2) theme token + cookie runtime, (3) plugin/theme UI surfaces, (4) lesson-step autosave, (5) classroom snapshot/connection/lock enforcement, (6) cross-flow tests and verification. [VERIFIED: ROADMAP.md, 11-CONTEXT.md]

## Project Constraints (from AGENTS.md)

- Use Next.js 16 App Router, React 19.2, Turbopack, Auth.js v5, Drizzle ORM, and SQLite-first architecture. [VERIFIED: AGENTS.md]
- UI components must not access the database directly; all reads/writes go through DAL and Server Actions. [VERIFIED: AGENTS.md]
- Node.js 20.9+ is the primary runtime; Edge Runtime is limited to SSE realtime sync. [VERIFIED: AGENTS.md]
- Next.js caching must be explicit and writes must update or invalidate relevant tags. [VERIFIED: AGENTS.md]
- SQLite is the first database target and parent-owned relationships must cascade delete. [VERIFIED: AGENTS.md]
- Classroom broadcast uses SSE and must support locked/unlocked classroom modes. [VERIFIED: AGENTS.md]
- Plugins must not use `eval()`, dynamic third-party code execution, direct DB access, or direct core API/provider-key access. [VERIFIED: AGENTS.md]
- UI must follow Stitch project `5322129002350954765` and `DESIGN.md`: Lexend, Simplified Chinese, no 1px section dividers, tonal surfaces, glass/gradient CTAs, premium K-12 language. [VERIFIED: AGENTS.md, DESIGN.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Plugin manifest registration/CRUD | API / Backend | Database / Storage | Server Actions validate input; DAL persists school-scoped records and audits. [VERIFIED: AGENTS.md, src/actions/plugin-actions.ts, src/lib/dal/plugins.ts] |
| Plugin hook execution | API / Backend | Frontend Server (SSR) | Hook permission checks and dispatch belong in DAL/server; `PluginRenderer` can invoke safe hooks during RSC render and output local widgets. [VERIFIED: 11-CONTEXT.md, docs/plugin-theme-implementation-plan.md] |
| Plugin widget rendering | Frontend Server (SSR) | Browser / Client | Widgets are local declarative React components; no plugin-supplied JS runs in browser. [VERIFIED: 11-CONTEXT.md, AGENTS.md] |
| Theme token validation and registration | API / Backend | Database / Storage | Theme JSON must be Zod-validated and stored per school before use. [VERIFIED: src/lib/dal/themes.ts, src/lib/dto/resource-ai.ts] |
| Active theme preference | Frontend Server (SSR) | Browser / Client | Cookie is read by `ThemeInjector` during server render; Server Action writes/deletes cookie. [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/03-file-conventions/route.mdx; VERIFIED: 11-CONTEXT.md] |
| CSS variable injection | Frontend Server (SSR) | Browser / Client | Root layout can emit a style tag after reading the cookie and valid theme DTO. [VERIFIED: docs/plugin-theme-implementation-plan.md, src/app/layout.tsx] |
| Lesson-step autosave | Browser / Client | API / Backend | Field changes originate in client/form UI; persistence must go through `autosaveLessonStepAction()` and DAL. [VERIFIED: src/components/authoring/lesson-step-editor.tsx, src/actions/lesson-authoring-actions.ts] |
| Classroom lock enforcement | API / Backend | Browser / Client | Server-side student DTO must choose/force active step even if URL requests another step; client still displays disabled navigation. [VERIFIED: src/lib/dal/learning.ts, docs/teacher-classroom-flow-review.md] |
| Classroom snapshots/SSE | API / Backend | Edge / Route Handler | Durable state remains SQLite-backed; SSE route streams/polls snapshot and should not own authoritative state. [VERIFIED: src/app/api/classroom/[sessionId]/events/route.ts, src/db/schema.ts] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | installed `16.2.4`; npm latest `16.2.5` published/modified 2026-05-07 | App Router, Server Actions, cookies, cache tags, route handlers/SSE | Project baseline; Context7 docs confirm `updateTag` is for immediate read-your-writes in Server Actions and `revalidateTag`/`revalidatePath` handle route/tag invalidation. [VERIFIED: package.json, npm registry; CITED: /vercel/next.js/v16.2.2] |
| React / React DOM | installed `19.2.5`; npm latest `19.2.6` modified 2026-05-06 | RSC/client components and classroom runtime UI | Project baseline and installed dependency. [VERIFIED: package.json, npm registry, AGENTS.md] |
| Drizzle ORM | `0.45.2` | SQLite-first typed DAL operations | Current installed/latest package; docs show SQLite schema definitions, cascade references, insert/update/delete, transactions, and returning patterns. [VERIFIED: package.json, npm registry; CITED: /drizzle-team/drizzle-orm-docs] |
| Zod | `4.4.3` | Manifest, theme, classroom, step payload validation | Installed/latest package; docs note Zod 4 behavior for records and `safeParse`/schema validation should remain the input boundary. [VERIFIED: package.json, npm registry; CITED: https://zod.dev/v4/changelog] |
| Tailwind CSS | `4.2.4` | Token-driven no-line tonal UI | Installed package and project design baseline; theme injection must output variables consumed by existing Tailwind/global CSS names. [VERIFIED: package.json, DESIGN.md, src/app/globals.css via docs/theme-system-design.md] |
| Vitest | `4.1.5` | Unit/integration tests for DAL, DTO, actions, components | Existing test script uses Vitest and repo already contains `.test.ts(x)` files. [VERIFIED: package.json, glob **/*.test.*] |
| Playwright | `1.59.1` | Browser e2e for teacher/student classroom loop and theme application | Installed dev dependency; no Playwright spec files were found, so initial e2e scaffolding is a phase task if e2e is required. [VERIFIED: package.json, glob **/*.{test,spec}.*] |

### Supporting

| Library / Facility | Version | Purpose | When to Use |
|--------------------|---------|---------|-------------|
| Next `cookies()` | Next 16 async API | Read/write `activeThemeId` cookie in Server Components/Actions | Theme preference persistence; must `await cookies()`. [CITED: /vercel/next.js/v16.2.2] |
| Next `updateTag()` | Next 16 API | Immediate cache expiry after Server Actions | Plugin/theme/classroom/lesson mutations where user expects read-your-writes. [CITED: /vercel/next.js/v16.2.2; VERIFIED: src/actions/*] |
| Drizzle Kit | `0.31.10` | SQLite schema push/migration tooling | Use if schema/index changes are introduced; current docs describe `drizzle-kit push` for development sync. [VERIFIED: package.json, npm registry; CITED: /drizzle-team/drizzle-orm-docs] |
| Existing local UI primitives | repo-local | Buttons, cards, badges, ghost fields | Use instead of adding UI kits; preserves no-line tonal language. [VERIFIED: src/components/ui/*, DESIGN.md] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cookie-backed active theme | User preference DB table | Cookie is locked by D-09 and avoids schema work; DB table may be needed later for multi-device persistence. [VERIFIED: 11-CONTEXT.md; ASSUMED] |
| SSE polling snapshot | WebSocket/Redis pub-sub | SSE is project baseline and sufficient for this phase; WebSocket/pub-sub is deferred production infrastructure. [VERIFIED: AGENTS.md, 11-CONTEXT.md] |
| Declarative local widget renderer | Remote plugin JS/WASM sandbox | Remote execution is explicitly out of scope and violates plugin safety requirements. [VERIFIED: AGENTS.md, 11-CONTEXT.md] |

**Installation:** No new runtime package is required for the core phase. Use installed Next.js/React/Drizzle/Zod/Tailwind/Vitest/Playwright unless planner elects to add Playwright config/spec scaffolding. [VERIFIED: package.json]

**Version verification:** `npm view` on 2026-05-07 returned Next `16.2.5`, React `19.2.6`, Drizzle ORM `0.45.2`, Drizzle Kit `0.31.10`, Zod `4.4.3`, Vitest `4.1.5`, Playwright `1.59.1`. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Plugin manifest form / seed / admin UI
  -> Server Action validation (Zod)
  -> Plugin DAL (school scope, enabled, kill switch, permissions)
  -> SQLite pluginRegistration + hookRun + actionAudit
  -> RSC PluginRenderer(anchor, schoolId, context)
  -> allowlisted dispatchPluginAction()
  -> local safe Widget components

Theme plugin manifest.theme / theme settings selector
  -> ThemeTokenRegistrySchema + validateThemeTokens()
  -> themeTokenRegistry + themeAuditLog
  -> setActiveThemeAction writes activeThemeId cookie
  -> ThemeInjector in root layout reads cookie
  -> compileThemeTokensToCssVariables()
  -> :root CSS variables override default globals.css tokens

Teacher editor / classroom loop
  -> Client/form autosave fields
  -> lesson-authoring Server Actions
  -> DAL updateLessonStep + cache tag updates
  -> publish/launch classroom snapshot
  -> classroom actions mutate activeStep/locked/version
  -> snapshot route reads durable SQLite state
  -> SSE route streams snapshot events
  -> student player personal DTO enforces locked step server-side
```

### Recommended Project Structure

```text
src/
├── actions/
│   ├── plugin-actions.ts          # Extend with enable/list/get/delete and action-level manifest validation
│   ├── theme-actions.ts           # New cookie/theme registration actions
│   ├── lesson-authoring-actions.ts# Existing autosave action; wire UI to it
│   └── classroom-actions.ts       # Existing actions; add heartbeat/connection if action-based
├── lib/
│   ├── dal/
│   │   ├── plugins.ts             # Enable/CRUD/school/permission checks
│   │   ├── themes.ts              # list/get valid themes by school
│   │   ├── classroom.ts           # participant ensure/heartbeat/snapshot hardening
│   │   └── learning.ts            # server lock enforcement for selectedStepId
│   ├── dto/
│   │   ├── resource-ai.ts         # plugin manifest theme extension and permission enum/policy
│   │   └── classroom.ts           # connection/event DTO additions if needed
│   ├── theme-cookie.ts            # New server-only cookie helpers
│   └── cache-policy.ts            # Add/verify plugin/theme/classroom tag coverage
├── server/
│   ├── plugins/registry.ts        # Keep allowlisted deterministic action dispatch
│   └── themes/tokens.ts           # Fix --color-surface variable emission and guards
├── components/
│   ├── plugins/                  # New PluginRenderer + local widgets
│   ├── theme/                    # New ThemeInjector
│   ├── authoring/                # Convert step editor to persistence-aware UI
│   ├── learning/                 # ClassroomRuntimeClient heartbeat/fallback behavior
│   └── surfaces/settings-surface.tsx # Theme selector + plugin manager
└── app/
    ├── layout.tsx                # Inject ThemeInjector
    ├── api/classroom/[sessionId]/events/route.ts   # SSE remains no-store
    └── api/classroom/[sessionId]/snapshot/route.ts # Snapshot/participant behavior
```

### Pattern 1: DAL-first permission gate

**What:** Every plugin/theme/classroom mutation must call a DAL function that asserts actor identity, role, school membership, ownership/enrollment, and resource scope before DB mutation or DTO return. [VERIFIED: AGENTS.md, AUTH-05, src/lib/dal/lesson-authoring.ts, src/lib/dal/learning.ts]  
**When to use:** All plugin CRUD, hook execution, theme listing/registration, active classroom snapshot/heartbeat, autosave persistence. [VERIFIED: 11-CONTEXT.md]  
**Implementation guidance:** Follow existing `assertActiveTeacher()` / `assertActiveStudent()` style instead of trusting client-passed `schoolId` or `actorId`. [VERIFIED: src/lib/dal/lesson-authoring.ts, src/lib/dal/learning.ts]

### Pattern 2: Action-level Zod validation before DAL

**What:** Server Actions should `safeParse()` action inputs with the same DTO schemas that DAL will parse before persistence. [VERIFIED: src/actions/classroom-actions.ts, src/actions/lesson-authoring-actions.ts; CITED: https://zod.dev/v4/changelog]  
**When to use:** `registerPluginManifestAction`, `setPluginEnabledAction`, `setActiveThemeAction`, `registerThemeTokensAction`, classroom heartbeat action/route, autosave step forms. [VERIFIED: 11-CONTEXT.md]  
**Pitfall:** `manifestJson: z.any()` currently delays manifest errors to DAL; planning must replace this with `PluginManifestSchema`. [VERIFIED: src/actions/plugin-actions.ts]

### Pattern 3: Server-rendered runtime theme injection

**What:** Read `activeThemeId` via async `cookies()`, load a valid theme DTO via DAL, compile tokens to CSS variables, and render a root-level `<style>` after children. [VERIFIED: docs/plugin-theme-implementation-plan.md; CITED: /vercel/next.js/v16.2.2]  
**When to use:** Theme application for selected per-user/per-school theme without client-only flash or DB schema change. [VERIFIED: 11-CONTEXT.md]

### Pattern 4: Durable snapshot over transient realtime state

**What:** Classroom client/SSE can reconnect or poll, but authoritative state is always `classroomSessions`, `classroomParticipants`, and `classroomEvents` in SQLite. [VERIFIED: src/db/schema.ts, src/app/api/classroom/[sessionId]/events/route.ts]  
**When to use:** Late join, reconnect, teacher roster status, lock mode, conflict recovery. [VERIFIED: CLASS-05, CLASS-06]

### Anti-Patterns to Avoid

- **Client-only plugin execution:** It violates the no arbitrary plugin JS/direct access rule; use RSC local widgets. [VERIFIED: AGENTS.md]
- **Trusting client `schoolId`:** Client-passed school IDs must be cross-checked with actor membership in DAL. [VERIFIED: AUTH-05, docs/plugin-system-review.md]
- **Theme variable drift:** Do not emit `--surface-*`; components/globals expect `--color-surface...`. [VERIFIED: docs/theme-system-design.md, src/server/themes/tokens.ts]
- **Only disabling locked steps in UI:** Direct URL access can bypass client links; server DTO must force active step. [VERIFIED: docs/teacher-classroom-flow-review.md, src/lib/dal/learning.ts]
- **Adding schema changes without Drizzle planning:** If connection events or session IDs are added to submissions, plan Drizzle schema + migration/push and tests; do not mutate SQLite manually. [VERIFIED: package.json, src/db/schema.ts; CITED: /drizzle-team/drizzle-orm-docs]

## Existing Code Patterns and Likely Files

| Area | Existing Pattern / Gap | Likely Files |
|------|------------------------|--------------|
| Plugin registration | DAL validates manifest and inserts disabled plugin; Server Action currently allows `manifestJson: z.any()`. [VERIFIED: src/lib/dal/plugins.ts, src/actions/plugin-actions.ts] | `src/lib/dal/plugins.ts`, `src/actions/plugin-actions.ts`, `src/lib/dto/resource-ai.ts` |
| Plugin enable/CRUD | `enabled` column exists, but no enable/list/get/delete API exists. [VERIFIED: src/db/schema.ts, docs/plugin-system-review.md] | `src/lib/dal/plugins.ts`, `src/actions/plugin-actions.ts`, `src/components/surfaces/settings-surface.tsx` |
| Hook execution | `runPluginHook()` checks enabled/kill-switch/anchor/action but not school scope or manifest permissions. [VERIFIED: src/lib/dal/plugins.ts] | `src/lib/dal/plugins.ts`, `src/server/plugins/registry.ts`, tests under `src/lib/dal/` |
| Theme tokens | Theme tables, schema, DAL, compiler exist; compiler emits wrong surface prefix and is not invoked at runtime. [VERIFIED: src/lib/dal/themes.ts, src/server/themes/tokens.ts, docs/theme-system-design.md] | `src/server/themes/tokens.ts`, `src/lib/dal/themes.ts`, `src/actions/theme-actions.ts`, `src/lib/theme-cookie.ts`, `src/components/theme/theme-injector.tsx`, `src/app/layout.tsx` |
| Settings UI | General/labs settings use static cards and hard-coded lab layout. [VERIFIED: src/components/surfaces/settings-surface.tsx] | `src/components/surfaces/settings-surface.tsx`, `src/app/settings/page.tsx`, `src/app/settings/labs/page.tsx` |
| Lesson autosave | DAL/action update path exists; editor fields are uncontrolled `defaultValue` fields with no save call. [VERIFIED: src/lib/dal/lesson-authoring.ts, src/actions/lesson-authoring-actions.ts, src/components/authoring/lesson-step-editor.tsx] | `src/components/authoring/lesson-step-editor.tsx`, `src/components/authoring/lesson-authoring-workspace.tsx`, `src/actions/lesson-authoring-actions.ts` |
| Classroom connection | Participant rows start offline and no code updates DB connection state. [VERIFIED: src/lib/dal/classroom.ts, src/db/schema.ts, docs/teacher-classroom-flow-review.md] | `src/lib/dal/classroom.ts`, `src/actions/classroom-actions.ts` or `src/app/api/classroom/[sessionId]/presence/route.ts`, `src/components/learning/classroom-runtime-client.tsx` |
| Classroom lock | `getStudentPlayerPersonalDTO()` forces runtime active step when locked, but must verify selected URL step cannot override; client still computes disabled state visually. [VERIFIED: src/lib/dal/learning.ts, src/components/learning/classroom-runtime-client.tsx] | `src/lib/dal/learning.ts`, `src/app/(student)/student/player/page.tsx`, tests under `src/lib/dal/learning.test.ts` |
| SSE/snapshot | Events route polls snapshot every 2000ms and closes on 401/403/404; snapshot route maps errors. [VERIFIED: src/app/api/classroom/[sessionId]/events/route.ts, src/app/api/classroom/[sessionId]/snapshot/route.ts] | `src/app/api/classroom/[sessionId]/events/route.ts`, `src/app/api/classroom/[sessionId]/snapshot/route.ts` |

## Dependency and Order Constraints

1. **Schema/DTO before DAL:** Extend `PluginManifestSchema` with optional `theme` and define any permission/action policy before `setPluginEnabled()` or `PluginRenderer` depends on it. [VERIFIED: src/lib/dto/resource-ai.ts, 11-CONTEXT.md]
2. **DAL before UI:** Plugin list/enable/delete, theme list/get, and classroom participant ensure/heartbeat must exist before settings/plugin renderer/classroom client UI can be reliable. [VERIFIED: AGENTS.md, docs/plugin-theme-implementation-plan.md]
3. **Cache tags after mutations:** Plugin enable/delete/register should update `pluginRegistry` and `plugin(id)`; theme register/select should update theme tags and revalidate layout/path as needed; lesson autosave updates lesson/steps; classroom actions update classroom tag. [VERIFIED: src/lib/cache-policy.ts, src/actions/plugin-actions.ts, src/actions/lesson-authoring-actions.ts, src/actions/classroom-actions.ts; CITED: /vercel/next.js/v16.2.2]
4. **Theme compiler before ThemeInjector:** Fix `--color-surface...` output first; otherwise runtime injection will silently not affect most surface utilities. [VERIFIED: docs/theme-system-design.md, src/server/themes/tokens.ts]
5. **Server lock before client polish:** `getStudentPlayerPersonalDTO()` and snapshot/personal DTO tests must prove direct URL step selection is overridden in locked mode before UI validation. [VERIFIED: docs/teacher-classroom-flow-review.md]
6. **Connection state requires participant existence:** Late-join logic must ensure authorized class members have a participant row before heartbeat/snapshot can mark them connected. [VERIFIED: src/lib/dal/classroom.ts, docs/teacher-classroom-flow-review.md]
7. **SQLite migration/push only if schema changes:** Current phase can avoid schema changes for plugin/theme if using existing tables/cookie; adding submission `sessionId` or new event types would require Drizzle schema changes and `pnpm db:bootstrap:dev` or migration plan. [VERIFIED: src/db/schema.ts, package.json]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Input validation | Ad-hoc `typeof` checks | Zod schemas in `src/lib/dto/*` | Existing project uses Zod DTO boundaries and DATA-04 requires it. [VERIFIED: .planning/REQUIREMENTS.md, src/lib/dto/*] |
| Plugin execution | `eval`, remote import, sandbox-lite | Allowlisted `dispatchPluginAction()` + local widgets | K-12 safety model forbids arbitrary code and direct DB/API access. [VERIFIED: AGENTS.md, src/server/plugins/registry.ts] |
| Realtime source of truth | In-memory participant/session state | SQLite `classroomSessions`, `classroomParticipants`, `classroomEvents` | CLASS-05 requires durable classroom state. [VERIFIED: .planning/REQUIREMENTS.md, src/db/schema.ts] |
| Theme CSS naming | New variable naming convention | Existing `--color-*` / `--radius-*` convention | Current globals/Tailwind utilities use `--color-surface...`; mismatch breaks runtime theme effects. [VERIFIED: docs/theme-system-design.md] |
| Step ordering/autosave | Integer position cascade updates | Existing LexoRank + `autosaveLessonStepAction()` | Project already has LexoRank and autosave action path. [VERIFIED: src/lib/ranking/lexorank.ts, src/actions/lesson-authoring-actions.ts] |
| Cache freshness | Manual browser refresh only | `updateTag()` in Server Actions, `revalidatePath()` where layout/theme changes | Next docs differentiate immediate read-your-writes vs route invalidation. [CITED: /vercel/next.js/v16.2.2] |

**Key insight:** The hard parts are not libraries; they are boundary correctness: actor/school checks, declarative-only plugin execution, valid theme-to-CSS mapping, and durable classroom state. [VERIFIED: 11-CONTEXT.md, AGENTS.md]

## Common Pitfalls

### Pitfall 1: Plugin school isolation bypass
**What goes wrong:** A user triggers a plugin registered to another school if `pluginId` alone is trusted. [VERIFIED: docs/plugin-system-review.md, src/lib/dal/plugins.ts]  
**Why it happens:** Current `runPluginHook()` loads by plugin ID and does not compare actor school membership with `plugin.schoolId`. [VERIFIED: src/lib/dal/plugins.ts]  
**How to avoid:** Add `schoolId`/actor scope resolution in DAL and deny/audit `school_mismatch` before action dispatch. [VERIFIED: 11-CONTEXT.md]  
**Warning signs:** Tests can call school A plugin from school B user and still get a proposal. [VERIFIED: docs/plugin-system-review.md]

### Pitfall 2: Manifest permissions remain decorative
**What goes wrong:** `permissions` are stored but never enforced, so manifest declarations do not constrain action dispatch. [VERIFIED: src/lib/dto/resource-ai.ts, src/lib/dal/plugins.ts]  
**How to avoid:** Define a small permission policy tied to allowlisted actions/anchors and check it before dispatch; denied results must be audited. [VERIFIED: PLUGIN-03, PLUGIN-07]

### Pitfall 3: Theme appears selectable but does not apply
**What goes wrong:** Theme selection writes a cookie but injected variables do not affect UI because surface tokens compile to `--surface-*`. [VERIFIED: src/server/themes/tokens.ts, docs/theme-system-design.md]  
**How to avoid:** Fix compiler before UI and test `surfaces.surface-container-low` compiles to `--color-surface-container-low`. [VERIFIED: docs/theme-system-design.md]

### Pitfall 4: Autosave UI validates but does not persist real payload shape
**What goes wrong:** Form fields submit incomplete payloads that fail `lessonStepPayloadSchema` or overwrite optional fields unintentionally. [VERIFIED: src/lib/dto/lesson-authoring.ts, src/components/authoring/lesson-step-editor.tsx]  
**How to avoid:** Build payload per discriminated union type and include existing optional/default fields (`materialRefs`, retry policy, quiz indexes) when saving. [VERIFIED: src/lib/dto/lesson-authoring.ts]

### Pitfall 5: Locked mode only works for honest navigation
**What goes wrong:** Student changes `?stepId=` manually and sees non-active step during locked mode. [VERIFIED: docs/teacher-classroom-flow-review.md]  
**How to avoid:** Unit-test `getStudentPlayerPersonalDTO()` with locked classroom + selected non-active step and require `resumeStepId/forcedStepId` to be active step. [VERIFIED: src/lib/dal/learning.ts]

### Pitfall 6: Late join creates duplicate participant rows
**What goes wrong:** Snapshot/heartbeat auto-creation races and violates `classroomParticipants_session_student_unique`. [VERIFIED: src/db/schema.ts]  
**How to avoid:** Ensure participant creation is idempotent using prior lookup/transaction or conflict-safe insert pattern. [CITED: /drizzle-team/drizzle-orm-docs; VERIFIED: src/db/schema.ts]

### Pitfall 7: Route Handler uses `updateTag()`
**What goes wrong:** `updateTag()` is used outside Server Actions. [CITED: /vercel/next.js/v16.2.2]  
**How to avoid:** Use `updateTag()` only in Server Actions; route handlers can use `revalidateTag()`/no-store responses or rely on direct DB reads. [CITED: /vercel/next.js/v16.2.2]

## Proposed Plan Breakdown and Verification Commands

| Plan | Scope | Key Files | Must Verify |
|------|-------|-----------|-------------|
| 11-01 Plugin DAL + Action Security | Add enable/list/get/delete; action-level `PluginManifestSchema`; school isolation; permission enforcement; denied audits. | `src/lib/dal/plugins.ts`, `src/actions/plugin-actions.ts`, `src/lib/dto/resource-ai.ts`, `src/server/plugins/registry.ts` | `pnpm test -- src/lib/dal/plugins.test.ts src/actions/plugin-actions.test.ts`; `pnpm typecheck`; `pnpm lint` [VERIFIED: package.json] |
| 11-02 Theme Runtime Foundation | Add manifest `theme`, valid theme list, compiler prefix fix, cookie helper, theme actions, `ThemeInjector` in layout. | `resource-ai.ts`, `themes.ts`, `tokens.ts`, `theme-actions.ts`, `theme-cookie.ts`, `theme-injector.tsx`, `app/layout.tsx` | `pnpm test -- src/server/themes/tokens.test.ts src/lib/dal/themes.test.ts src/actions/theme-actions.test.ts`; `pnpm typecheck` [VERIFIED: package.json] |
| 11-03 Plugin/Theme UI Integration | Add `PluginRenderer`, safe widgets, dashboard/editor anchors, settings theme selector, labs plugin manager. | `components/plugins/**`, `teacher/page.tsx`, `student/page.tsx`, `teacher/editor/page.tsx`, `settings-surface.tsx` | `pnpm test -- src/components/plugins/*.test.tsx src/components/surfaces/settings-surface.test.tsx`; `pnpm lint`; visual/manual check against DESIGN.md [VERIFIED: DESIGN.md] |
| 11-04 Lesson Step Autosave | Convert step editor from decorative default inputs to persistence-aware save/autosave forms while preserving payload schemas and revision/cache tags. | `lesson-step-editor.tsx`, `lesson-authoring-workspace.tsx`, `lesson-authoring-actions.ts`, existing DAL tests | `pnpm test -- src/lib/dal/lesson-authoring.test.ts src/components/authoring/lesson-step-editor.test.tsx`; manual edit-refresh-publish check [VERIFIED: src/actions/lesson-authoring-actions.ts] |
| 11-05 Classroom Snapshot, Presence, Lock Enforcement | Add idempotent participant ensure/heartbeat, update connection state, server-enforce locked active step, improve snapshot/SSE reliability. | `dal/classroom.ts`, `dal/learning.ts`, `classroom-actions.ts` or presence route, snapshot/events routes, `classroom-runtime-client.tsx` | `pnpm test -- src/lib/dal/classroom.test.ts src/lib/dal/learning.test.ts src/actions/classroom-actions.test.ts`; manual two-browser classroom flow [VERIFIED: src/lib/dal/classroom.ts] |
| 11-06 Cross-Flow Release Verification | Seed data, run plugin/theme/classroom e2e smoke, regression tests, design/security checklist. | `scripts/verify-phase11-*.ts` or Playwright specs if added | `pnpm test`; `pnpm typecheck`; `pnpm lint`; `pnpm build`; optional `pnpm exec playwright test` if specs exist [VERIFIED: package.json] |

## Phase Verification Matrix

| Behavior | Test Type | Exact Check |
|----------|-----------|-------------|
| Invalid plugin manifest rejected before DAL persistence | Action/unit | Call `registerPluginManifestAction()` with missing `anchors/actions`; expect structured failure and no DB insert. [VERIFIED: src/actions/plugin-actions.ts] |
| Plugin enable toggles and theme registration | DAL/integration | Register plugin with valid `manifest.theme`, enable it, assert plugin `enabled=true` and valid theme row exists. [VERIFIED: 11-CONTEXT.md, src/lib/dal/themes.ts] |
| School mismatch denied/audited | DAL/integration | User from school B invokes school A plugin; expect null/denied result plus `pluginActionAudit` reason. [VERIFIED: docs/plugin-system-review.md] |
| Permission mismatch denied/audited | DAL/integration | Manifest lacks required permission for action; expect denied audit and no widget proposal. [VERIFIED: PLUGIN-03, PLUGIN-07] |
| Kill-switch blocks hook | DAL/integration | Enable plugin, set kill switch, run hook; expect denied reason `kill_switch`. [VERIFIED: src/lib/dal/plugins.ts] |
| PluginRenderer renders only safe widgets | Component/RSC | Enabled plugin for `dashboard.widget` renders local widget; disabled/kill-switched plugin renders nothing; no raw HTML/script path. [VERIFIED: 11-CONTEXT.md, AGENTS.md] |
| Theme compiler emits correct variables | Unit | `surfaces.surface-container-low` compiles to `--color-surface-container-low`, not `--surface-surface-container-low`. [VERIFIED: src/server/themes/tokens.ts, docs/theme-system-design.md] |
| Theme cookie reset | Action/unit | `setActiveThemeAction` with theme ID sets `activeThemeId`; default reset deletes it; layout revalidation/path refresh occurs. [CITED: /vercel/next.js/v16.2.2] |
| ThemeInjector applies only valid school theme | RSC/integration | Invalid theme or cross-school theme returns no style; valid active theme emits `:root` CSS variables. [VERIFIED: src/lib/dal/themes.ts, 11-CONTEXT.md] |
| Step editor persists content/task/quiz edits | Component + DAL | Edit each step type, submit/autosave, refetch `getLessonEditorDTO()`, assert payload changed and revision/cache tags updated. [VERIFIED: src/lib/dal/lesson-authoring.ts, src/actions/lesson-authoring-actions.ts] |
| Locked mode server enforcement | DAL/integration | With live locked session active on step A, call `getStudentPlayerPersonalDTO({selectedStepId: stepB})`; expect forced/resume step A and disabled step B. [VERIFIED: src/lib/dal/learning.ts] |
| Late join snapshot | DAL/integration | Authorized class member without participant row requests snapshot/runtime; participant row is created or snapshot succeeds consistently. [VERIFIED: CLASS-06, docs/teacher-classroom-flow-review.md] |
| Connection state updates | Integration/e2e | Student connects to classroom runtime; teacher snapshot/roster changes from `offline` to `connected`, then stale/offline path works if implemented. [VERIFIED: src/db/schema.ts, docs/teacher-classroom-flow-review.md] |
| Conflict recovery | Component/action | Submit classroom action with stale `expectedVersion`; expect latest snapshot and user-facing conflict copy. [VERIFIED: src/actions/classroom-actions.ts] |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` for Next request boundary | `proxy.ts` in Next 16 project baseline | Next 16 baseline in project stack | Do not introduce middleware patterns while touching auth/runtime boundaries. [VERIFIED: AGENTS.md] |
| Implicit caching | Explicit Cache Components/tags and `updateTag()` | Next 16 baseline | Every mutation in this phase needs tag/path freshness planning. [VERIFIED: AGENTS.md; CITED: /vercel/next.js/v16.2.2] |
| Arbitrary plugin code | Declarative JSON + hooks + allowlisted actions + local widgets | Project security decision | Phase must not add remote execution to “make plugins work.” [VERIFIED: AGENTS.md, 11-CONTEXT.md] |
| Theme tokens stored but unused | Cookie + server-injected CSS variables | Phase 11 target | Runtime application is the missing piece. [VERIFIED: docs/theme-system-design.md] |
| Client-only lock UI | Server DTO-enforced active step plus client disabled UI | Phase 11 target | Direct URL bypass must be closed. [VERIFIED: docs/teacher-classroom-flow-review.md] |

**Deprecated/outdated:**
- Treating `permissions` as documentation only is unsafe; enforce or remove it, and D-02 requires enforcement. [VERIFIED: 11-CONTEXT.md, docs/plugin-system-review.md]
- Treating `AuthoringStatusPanel` autosave text as actual persistence is misleading; editable fields must call existing autosave action. [VERIFIED: docs/teacher-classroom-flow-review.md, src/components/authoring/lesson-step-editor.tsx]

## Runtime State Inventory

> Phase includes runtime behavior migration/readiness, not a pure rename. Runtime state that can remain stale after code edits must be accounted for. [VERIFIED: 11-CONTEXT.md]

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Existing SQLite tables store plugin registrations, hook runs, action audits, theme token registries, classroom sessions/participants/events, lesson steps/payloads. [VERIFIED: src/db/schema.ts] | If tests use existing dev DB, run `pnpm db:bootstrap:dev` or seed fixtures; if schema changes occur, plan Drizzle push/migration. [VERIFIED: package.json] |
| Live service config | None found in phase scope; plugin/theme/classroom state is code + SQLite, not external service config. [VERIFIED: docs/* reviews, src/db/schema.ts] | None for this phase unless planner adds external registry/pub-sub, which is out of scope. [VERIFIED: 11-CONTEXT.md] |
| OS-registered state | None found. [VERIFIED: phase docs and AGENTS.md] | None. |
| Secrets/env vars | No new secrets required for cookie theme selection or local plugin widgets. [VERIFIED: docs/plugin-theme-implementation-plan.md] | Do not add provider/API keys to plugin manifests. [VERIFIED: AGENTS.md] |
| Build artifacts | Existing Next/Drizzle/Vitest build artifacts only; no package rename/install artifact implied. [VERIFIED: package.json] | Run normal verify/build commands after implementation. [VERIFIED: package.json] |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next/Vitest/Drizzle scripts | ✓ | local `v24.1.0`; project minimum Node 20.9+ | Use current local Node; ensure deployment remains >=20.9. [VERIFIED: bash node --version, AGENTS.md] |
| pnpm | Project scripts | ✓ | `10.33.0` | npm scripts may work but project uses pnpm in planning commands. [VERIFIED: bash pnpm --version, package.json] |
| npm | Registry/version checks | ✓ | `11.6.2` | pnpm can run package scripts. [VERIFIED: bash npm --version] |
| Vitest | Unit/integration tests | ✓ | `4.1.5` | None; installed. [VERIFIED: package.json, bash npx vitest --version] |
| Playwright | Optional e2e smoke | ✓ | `1.59.1` | If no specs, use manual two-browser smoke plus add specs in plan 11-06. [VERIFIED: package.json, bash npx playwright --version, glob tests] |
| Drizzle Kit | SQLite schema push/migration | ✓ | `0.31.10` | If no schema changes, no migration needed. [VERIFIED: package.json, bash npx drizzle-kit --version] |

**Missing dependencies with no fallback:** None identified. [VERIFIED: package.json and version probes]  
**Missing dependencies with fallback:** Playwright specs/config are not present in current test glob; fallback is Vitest + manual browser smoke unless planner adds e2e scaffolding. [VERIFIED: glob **/*.{test,spec}.*]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | Yes | Reuse Auth.js-backed `getCurrentUserDTO()`/DAL assertion paths; do not trust client actor IDs. [VERIFIED: AGENTS.md, src/lib/dal/auth.ts, src/lib/dal/classroom.ts] |
| V3 Session Management | Yes | Cookie read/write only for non-sensitive `activeThemeId`; auth session remains Auth.js-managed. [VERIFIED: 11-CONTEXT.md, AGENTS.md] |
| V4 Access Control | Yes | School membership/role checks in DAL for plugin/theme/classroom operations. [VERIFIED: AUTH-05, docs/plugin-system-review.md] |
| V5 Input Validation | Yes | Zod schemas for plugin manifests, actions, theme tokens, classroom inputs, lesson step payloads. [VERIFIED: src/lib/dto/resource-ai.ts, src/lib/dto/classroom.ts, src/lib/dto/lesson-authoring.ts] |
| V6 Cryptography | No new crypto | Do not add cryptography; rely on framework/session primitives. [ASSUMED] |
| V8 Data Protection | Yes | Do not expose raw DB rows/private plugin data; return DTOs and safe widget payloads only. [VERIFIED: AUTH-06, AGENTS.md] |
| V10 Malicious Code | Yes | Explicitly forbid plugin arbitrary JS, `eval`, remote dynamic imports, direct DB/API/provider-key access. [VERIFIED: AGENTS.md, 11-CONTEXT.md] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-school plugin invocation | Elevation of Privilege / Information Disclosure | DAL checks actor membership against `plugin.schoolId` before dispatch. [VERIFIED: docs/plugin-system-review.md] |
| Permission bypass via broad manifest | Elevation of Privilege | Action/permission allowlist and audit denied calls. [VERIFIED: PLUGIN-03, PLUGIN-07] |
| Unsafe plugin payload rendered as script/HTML | Tampering / XSS | Render only local typed widgets; no `dangerouslySetInnerHTML` for plugin content. [VERIFIED: AGENTS.md; ASSUMED for exact widget implementation] |
| Theme CSS injection via arbitrary values | Tampering / UX degradation | Validate token keys/values, restrict surface roles and Lexend; consider color/radius allowlist tests. [VERIFIED: src/server/themes/tokens.ts, DESIGN.md] |
| Classroom lock bypass by URL | Elevation of Privilege | Server-side forced active step in personal DTO. [VERIFIED: src/lib/dal/learning.ts] |
| Stale classroom control writes | Tampering / Reliability | Optimistic version checks and conflict snapshots. [VERIFIED: src/lib/dal/classroom.ts, src/actions/classroom-actions.ts] |

## Open Questions (RESOLVED)

1. **Exact plugin permission vocabulary**
   - What we know: `permissions` is currently `string[]`, and actions are `addStepSuggestion`, `annotateLesson`, `createNotificationStub`. [VERIFIED: src/lib/dto/resource-ai.ts]
   - What's unclear: Whether permissions should mirror actions, anchors, or a new scoped vocabulary such as `lesson:annotate` / `notification:create`. [ASSUMED]
   - Recommendation: For this phase, define a minimal permission-to-action map in `registry.ts`/DTO tests and do not expand actions beyond current enum. [VERIFIED: 11-CONTEXT.md]
   - RESOLVED: Use the minimal permission-to-action map planned in 11-01 exactly: `addStepSuggestion -> lesson:write:suggestion`, `annotateLesson -> lesson:write:annotation`, and `createNotificationStub -> notification:create:stub`. Do not introduce broader permission vocabulary in this phase.
2. **Theme school selection when user belongs to multiple schools**
   - What we know: Cookie-only active theme is locked for this phase. [VERIFIED: 11-CONTEXT.md]
   - What's unclear: How UI chooses school context in settings for multi-school users. [ASSUMED]
   - Recommendation: Use the actor’s current/first active school consistent with existing DAL patterns, and document multi-school switching as a future issue. [VERIFIED: docs/plugin-theme-implementation-plan.md]
   - RESOLVED: The cookie stores only `activeThemeId`; `ThemeInjector` must load the active theme through current actor/current-school scoped DAL and return null for cross-school, no-auth, invalid, or non-valid theme IDs. Settings may list themes for the current actor school only.
3. **Presence stale/offline timeout**
   - What we know: Schema supports `connected`, `reconnecting`, `offline` and `lastSeenAt`; no updater exists. [VERIFIED: src/db/schema.ts, src/lib/dal/classroom.ts]
   - What's unclear: Desired timeout threshold for marking stale students offline. [ASSUMED]
   - Recommendation: Implement connection update on snapshot/SSE/manual refresh first; add a conservative stale threshold only if needed for teacher roster accuracy. [ASSUMED]
   - RESOLVED: This phase writes `connected` and `reconnecting` from classroom runtime activity. Offline timeout is deferred unless the current codebase already contains static stale/offline logic that can be reused without adding a new policy decision.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | User preference DB table may be needed later for multi-device theme persistence. | Alternatives Considered | Low; phase locks cookie persistence. |
| A2 | No new cryptography is needed. | Security Domain | Low; if signed theme cookies are required later, plan changes. |
| A3 | Exact plugin widget implementation should avoid `dangerouslySetInnerHTML`. | Threat Patterns | Medium; if rich markup widgets are desired, sanitization policy must be planned. |
| A4 | Permission vocabulary can be a minimal permission-to-action map for this phase. | Open Questions | Medium; planner may need user confirmation if product semantics differ. |
| A5 | Multi-school theme choice should use current/first active school consistent with existing DAL patterns. | Open Questions | Medium; wrong default may confuse multi-school users. |
| A6 | Presence timeout can be conservative or deferred after connection writes. | Open Questions | Medium; teacher roster accuracy expectations may require a defined SLA. |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/11-plugin-theme-classroom-readiness/11-CONTEXT.md` — locked implementation decisions, boundaries, deferred scope. [VERIFIED]
- `docs/plugin-system-review.md` — plugin current lifecycle and gaps. [VERIFIED]
- `docs/plugin-theme-implementation-plan.md` — proposed implementation sequence and file list. [VERIFIED]
- `docs/theme-system-design.md` — theme schema/compiler/runtime gaps. [VERIFIED]
- `docs/teacher-classroom-flow-review.md` — classroom/editor/player gaps. [VERIFIED]
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md` — requirement IDs, phase success criteria, project state. [VERIFIED]
- `AGENTS.md`, `DESIGN.md` — project constraints and visual design rules. [VERIFIED]
- Codebase reads under `src/lib/dal`, `src/actions`, `src/components`, `src/app/api`, `src/db/schema.ts`, `package.json`. [VERIFIED]
- Context7 `/vercel/next.js/v16.2.2` — `cookies()`, `updateTag`, `revalidateTag`, `revalidatePath`. [CITED]
- Context7 `/drizzle-team/drizzle-orm-docs` — SQLite CRUD, cascade references, insert returning, Drizzle Kit push. [CITED]
- Context7 `/websites/zod_dev_v4` — Zod 4 record behavior and validation semantics. [CITED]
- npm registry checks on 2026-05-07 — current package versions. [VERIFIED]

### Secondary (MEDIUM confidence)
- No external web search was required; canonical local docs and Context7 were sufficient. [VERIFIED]

### Tertiary (LOW confidence)
- Assumptions listed in the Assumptions Log. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — installed package versions, npm registry, and Context7 docs verified. [VERIFIED]
- Architecture: HIGH — existing code and phase docs directly define target architecture. [VERIFIED]
- Pitfalls: HIGH for documented gaps; MEDIUM for future UI/e2e mechanics because exact tests/specs are not implemented yet. [VERIFIED]
- Security: HIGH for plugin/classroom boundary risks from docs/code; MEDIUM for exact permission vocabulary. [VERIFIED]

**Graph context:** `graphify` is disabled, so no project knowledge graph relationships were injected. [VERIFIED: graphify status]

**Research date:** 2026-05-07  
**Valid until:** 2026-06-06 for codebase architecture; re-check npm/Next docs within 7 days if upgrading package versions. [ASSUMED]
