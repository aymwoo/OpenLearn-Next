---
reviewers: [gemini, opencode]
reviewed_at: 2026-05-10T15:30:00+08:00
scope: Theme & Plugin Architecture
files_reviewed:
  - src/server/themes/registry.ts
  - src/server/themes/tokens.ts
  - src/server/plugins/registry.ts
  - src/lib/dal/themes.ts
  - src/lib/dal/plugins.ts
  - src/lib/dto/resource-ai.ts
  - src/lib/theme-layout/route-surface-registry.ts
  - src/components/shell/aurora-shell.tsx
  - src/components/shell/student-shell.tsx
  - src/components/shell/teacher-sidebar-shell.tsx
  - src/components/shell/glass-nav.tsx
  - src/components/theme/theme-injector.tsx
  - src/actions/theme-actions.ts
  - src/actions/plugin-actions.ts
---

# Cross-AI Architecture Review — Theme & Plugin System

## Gemini Review

### Summary
The Theme and Plugin architecture is a robust, type-safe, and well-layered system that successfully separates raw token registration from runtime layout orchestration. Zod validation at every entry point, combined with a multi-gate permission pipeline for plugins, provides high technical integrity.

### Strengths
- Deep Zod integration ensures malformed data is caught at boundaries; discriminated unions make dispatch logic clean
- Decoupled layout orchestration: UI shells consume resolved region visibility and module lists without knowing token logic
- `runPluginHook` multi-gate pipeline is excellent defense-in-depth: enabled → kill switch → school membership → anchor/action allowlist → permission match
- Structured audit logs in both systems provide clear trails for admin actions and automated processes
- RSC-based CSS variable injection avoids FOUC without expensive client-side runtime generation

### Concerns
- **MEDIUM**: `toSafeCss` in ThemeInjector uses simple regex sanitization; a more sophisticated CSS sanitizer would be safer against obscure injection attacks (e.g., `url()`-based exploits)
- **MEDIUM**: `setPluginEnabled` registers theme tokens but has no cleanup logic on disable/delete — orphaned themes remain
- **LOW**: StudentShell doesn't consume layoutRuntime regions, unlike TeacherSidebarShell
- **LOW**: Theme deletion leaves stale cookie (graceful fallback, but no proactive invalidation)
- **LOW**: `ThemeTokenRegistrySchema` layout union (contract vs legacy) increases maintenance surface

### Suggestions
- Replace `toSafeCss` with a dedicated CSS property validator
- Refactor StudentShell to use region-based resolution like TeacherSidebarShell
- Add cleanup hooks in `deletePluginForSchool` for associated theme tokens
- Add theme version/hash for explicit re-render triggers
- Move `PLUGIN_ACTION_PERMISSION_REQUIREMENTS` to DB/config for dynamic adjustments

### Risk Assessment: **LOW**
Risks are primarily lifecycle housekeeping and edge-case sanitization, not fundamental design flaws.

---

## OpenCode Review

### Summary
The overall direction is correct: Theme → Server Registry → DAL → RSC injection, Plugin → Manifest → DAL Gate → Dispatcher. Layers are clear, converging toward declarative, security-allowlisted, school-level isolation. However, several critical boundaries aren't fully sealed yet — especially plugin permission model, plugin-theme transactional consistency, and layout scope/migration story. The architecture is "mostly right" but key gaps need closing before further extension.

### Strengths
- Themes and plugins both go through Zod DTOs — not raw JSON
- Clean theme resolution chain: registry → actor-scoped DAL → injection
- Region-level fallback in `compileThemeLayoutRuntime` prevents bad config from crashing the shell
- `runPluginHook` gate order is sensible, audit trail is complete
- Built-in teaching steps use typed definitions, stable foundation for marketplace/recommendations
- Theme system unifies visual tokens and teacher shell layout into one runtime
- Invalid layouts degrade to default rather than throwing, appropriate for SaaS-like control panels

### Concerns
- **HIGH**: Plugin permission boundary is "manifest self-declared permissions," not "actor actual capability." `runPluginHook` checks school membership but not whether the actor has `lesson:write:suggestion`. Combined with `runPluginHookAction` only requiring login, any active school member with a pluginId can invoke teacher-oriented hooks.
- **HIGH**: `setPluginEnabled` lacks transactional consistency with theme registration. Theme written before plugin update — if plugin update fails, orphan theme. No cleanup on disable/delete. No `sourcePluginId` on theme table.
- **HIGH**: `defaultEnabled` plugins don't trigger theme registration on initial `registerPluginManifest`. Plugin enters enabled=true but theme-not-registered state until manual toggle.
- **MEDIUM**: `registerThemeTokens` upsert has no DB unique constraint on `(schoolId, name)` — concurrent requests create duplicate themes.
- **MEDIUM**: `setActiveThemeAction` doesn't verify theme belongs to actor's accessible schools. Falls back safely at read time but creates persistent dirty cookies.
- **MEDIUM**: Layout is teacher-only but named/typed as if global. Route registry only has teacher/settings/resources keys. StudentShell doesn't consume layout runtime.
- **MEDIUM**: Layout dual-type (contract vs legacy) uses structural guessing (`"shell" in layout`) rather than explicit discriminator — fragile for long-term migration.
- **MEDIUM**: Theme token schema too wide (`record<string, string>` for colors/surfaces/radius/typography). Real constraints only in validation function, not in schema.
- **MEDIUM**: `ThemeInjector` uses `dangerouslySetInnerHTML` with string sanitization rather than token-type-aware whitelist serialization.
- **MEDIUM**: Theme runtime resolved twice per request (ThemeInjector + TeacherSidebarShell) — request-scoped memoization opportunity.
- **LOW**: `/teacher/reports` in sidebar but not in route surface registry → falls back to `/teacher` surface.
- **LOW**: Stale cookie after theme deletion, no self-healing.
- **LOW**: Existing tests are source-string assertions, not behavioral.

### Suggestions
- Dual-validate plugin permissions: manifest declares needs; actor capability resolved from membership/role/capability layer
- Add stronger server-side authz to `runPluginHookAction` — at minimum distinguish teacher-only vs general hooks
- Wrap `setPluginEnabled` and plugin registration in a single transaction: validate → write plugin → write theme → audit
- Add `sourcePluginId` or `managedByPlugin` to theme table; handle cleanup on plugin disable/delete
- Execute theme registration at `registerPluginManifest` time when `defaultEnabled=true && manifest.theme`
- Add `(schoolId, name)` unique constraint to `themeTokenRegistries`; add stable unique key for plugins
- Validate theme ownership in `setActiveThemeAction` before cookie write
- Add explicit `kind` discriminator to layout field (e.g., `{kind: "contract", ...}` vs `{kind: "legacy-tokens", ...}`)
- Tighten token schema: enumerate key names for colors/surfaces/radius/typography; validate values by type
- Replace `dangerouslySetInnerHTML` with server-generated validated CSS text or JSON data injection
- Request-scoped memoization for `getCurrentActorThemeRuntimeState()`
- Rename to `teacherLayout` if layout is deliberately teacher-only
- Add behavioral tests covering: unauthorized plugin hook calls, plugin enable theme-registration rollback, `defaultEnabled + theme` initial registration, stale cookie handling, legacy/new layout format compatibility

### Risk Assessment: **MEDIUM-HIGH**
The main architectural layers are sound, but two issues cannot be ignored:
1. Plugin authz hasn't reached "actor capability" yet
2. Plugin-theme state consistency isn't modeled as transactional and recoverable

These will escalate from "design debt" to "production incidents" once plugins carry real writes, theme marketplace, or more role entries.

---

## Consensus Summary

### Agreed Strengths (both reviewers)
- **Clean layered architecture**: Registry → DAL → RSC injection flow is well-separated
- **Strong Zod validation**: Type-safe boundaries at every entry point
- **Defense-in-depth plugin pipeline**: Multi-gate checking (enabled, kill switch, school, membership, allowlist, permission)
- **Auditability**: Both systems have structured audit trails
- **Graceful degradation**: Invalid configs fall back to defaults rather than crashing
- **Built-in teaching steps**: Well-typed, stable foundation for extension

### Agreed Concerns (both reviewers — HIGHEST PRIORITY)

1. **Plugin↔Theme lifecycle coupling is incomplete** (Gemini: MEDIUM, OpenCode: HIGH)
   - No cleanup on plugin disable/delete → orphan themes
   - No transactional consistency between theme registration and plugin state update
   - `defaultEnabled` plugins skip initial theme registration
   - Action: Add `sourcePluginId`, wrap in transaction, handle cleanup

2. **Plugin permission model needs hardening** (OpenCode: HIGH, Gemini: implicit via suggestion)
   - Currently validates manifest permissions only, not actor capabilities
   - Action: Dual-validate: manifest permissions + actor capability

3. **Layout dual-type migration is fragile** (both: MEDIUM)
   - Structural guessing (`"shell" in layout`) instead of explicit discriminator
   - Action: Add `kind` field for explicit versioning

4. **CSS injection surface could be tighter** (both: MEDIUM)
   - `toSafeCss` regex + `dangerouslySetInnerHTML` is string sanitization, not whitelist serialization
   - Action: Token-type-aware CSS generation, prefer data injection over innerHTML

5. **Teacher-only layout scope is implicit** (both noted)
   - Route registry, DTOs named as if global, but only teacher paths exist
   - Action: Explicitly name as `teacherLayout` or add student routes

### Distinct Gemini-only Observations
- StudentShell should consume layoutRuntime for architectural coherence
- Theme version/hash for explicit re-render triggers
- Move permission mappings to DB/config for dynamic adjustment

### Distinct OpenCode-only Observations
- `registerThemeTokens` upsert lacks DB unique constraint → concurrent duplicates
- `setActiveThemeAction` should validate theme ownership before cookie write
- `/teacher/reports` missing from route surface registry → ghost route
- Tests are string assertions, need behavioral coverage
- Request-scoped memoization to avoid double runtime resolution
- Token schema should enumerate key names, not `record<string, string>`

### Divergent Risk Assessment
- **Gemini: LOW** — sees issues as housekeeping/edge-case, not fundamental
- **OpenCode: MEDIUM-HIGH** — sees plugin authz and plugin-theme lifecycle as architecturally incomplete

The divergence is primarily about severity: both reviewers identify the same gaps but weight them differently. OpenCode's higher risk comes from evaluating the system through the lens of "what happens when plugins carry real writes and more roles enter," which is the correct forward-looking frame given the project roadmap.

### Recommended Action Order
1. **Critical**: Fix plugin permission model — dual validate manifest + actor capability
2. **Critical**: Add transactional consistency to plugin↔theme lifecycle, including cleanup
3. **Important**: Add `(schoolId, name)` unique constraint to theme table
4. **Important**: Validate theme ownership in `setActiveThemeAction` before cookie write
5. **Important**: Add `kind` discriminator to layout field for clean migration path
6. **Nice-to-have**: Tighten CSS injection, request-scoped memoization, behavioral tests
7. **Nice-to-have**: Explicitly scope layout as teacher-only or add student routes
