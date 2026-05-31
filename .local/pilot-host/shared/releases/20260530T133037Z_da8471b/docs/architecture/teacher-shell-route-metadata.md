# Teacher shell route metadata

This document explains the Phase 19 shell architecture update. It moves
teacher-facing shell behavior from JSX route checks into typed route metadata,
compiled theme runtime data, and a centralized shell resolver. The visible
behavior for `/teacher`, `/settings`, and `/resources` stays the same.

## Architecture flow

The shell pipeline now follows one path. Route identity, runtime defaults, and
render-time structure no longer compete with each other.

```text
route registry -> theme runtime -> shell resolver -> TeacherSidebarShell

src/lib/theme-layout/route-surface-registry.ts
  -> declares route label, modules, and shell defaults

src/server/themes/tokens.ts
  -> compiles per-route runtime surfaces and preserves shell metadata

src/lib/theme-layout/shell-surface-resolver.ts
  -> returns shellVariant, shellConfig, and surfaceMetadata

src/components/shell/teacher-sidebar-shell.tsx
  -> renders only from resolved shell data
```

## Route metadata schema

Every allowlisted teacher-facing route must define shell metadata. This keeps
future route additions from reintroducing ad hoc route checks.

| Field | Meaning | Current examples |
|-------|---------|------------------|
| `label` | Route-level semantic title | `教师工作台`, `系统设置` |
| `defaultSplit` | Main content split baseline | `60/40`, `50/50` |
| `allowedModules` | Allowlisted page modules for the route | `dashboard-overview`, `settings-general` |
| `shell.mode` | Navigation structure | `left-nav`, `top-nav`, `top-nav-secondary-rail` |
| `shell.radius` | Shell corner behavior | `rounded`, `square` |
| `shell.width` | Content width behavior | `default`, `full-width` |
| `shell.chrome` | Chrome density and immersion semantic | `default`, `immersive`, `minimal`, `presentation`, `fullscreen`, `focus` |

The `/teacher` route is expressed as metadata instead of JSX knowledge:

```ts
shell: {
  mode: "left-nav",
  radius: "square",
  width: "full-width",
  chrome: "immersive",
}
```

## Resolver contract

The shell resolver merges route metadata with compiled runtime output and gives
the shell one typed payload to render.

| Output | Ownership | Used by |
|--------|-----------|---------|
| `shellVariant` | Structural shell mode | `TeacherSidebarShell` layout branches |
| `shellConfig` | Radius, width, and chrome semantics | shell radius, width, and immersive behavior checks |
| `surfaceMetadata` | Route label, summary, and route identity | page header, footer, and context panel copy |

This split keeps compile, resolve, and render responsibilities separate.

## Impact scope

The Phase 19 migration touches a narrow but important dependency graph.

| Area | Impact |
|------|--------|
| Shell rendering | `TeacherSidebarShell` removes route-specific business logic and consumes only resolver output |
| Layout entrypoints | `/teacher`, `/settings`, and `/resources` continue using the same shared shell path |
| Theme runtime | `compileThemeLayoutRuntime()` preserves shell metadata in compiled page surfaces |
| DTO contracts | Theme runtime DTOs now expose typed shell radius, width, chrome, and resolver result shapes |
| Regression tooling | Phase 19 adds dedicated resolver tests, shell tests, and `verify:phase19` |

## Coupling boundaries

The migration is intentionally layered to prevent route knowledge from leaking
back into the UI.

| Layer | Owns | Must not own |
|------|------|--------------|
| Route registry | Route labels, module allowlists, shell defaults | UI rendering logic |
| Theme runtime compiler | Page runtime compilation and fallback behavior | Route-specific JSX branches |
| Shell resolver | Final shell DTO assembly | Freeform styling maps or arbitrary hooks |
| `TeacherSidebarShell` | Render structure and visual semantics | Business route checks |
| `Sidebar` and `GlassNav` | Navigation rendering | Route metadata decisions |

## Future extension risk

Phase 19 reserves future shell variants without making them visible yet. That
reduces future condition sprawl, but it also creates clear extension rules.

| Future mode | Risk if uncontrolled | Required guard |
|-------------|----------------------|----------------|
| `presentation` | UI adds a new special-case route branch | Add metadata and resolver tests first |
| `focus` | Required regions get suppressed by local heuristics | Keep compile/resolve/render layering |
| `fullscreen` | Shell path forks into a second implementation | Reuse the shared shell path |
| `minimal` | Header and chrome density drift silently | Express through `shell.chrome`, not ad hoc booleans |
| `immersive` | `/teacher` behavior regresses during future reuse | Keep `/teacher` covered by targeted regression checks |

The main architectural risk is regression back to `routeA || routeB || routeC`
logic inside UI components. Phase 19 counters that with resolver-only shell
consumption and a dedicated `verify:phase19` command.

## Next steps

If you extend shell behavior after Phase 19, follow this sequence:

1. Add the new enum or route default in the metadata contract.
2. Update the runtime compiler and resolver output.
3. Extend resolver and shell regression tests.
4. Re-run `pnpm verify:phase19` before changing visible UI behavior.
