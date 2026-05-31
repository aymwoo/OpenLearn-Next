# Phase 19: Teacher shell route metadata system - Patterns

## Primary analogs

### 1. Route registry and route resolver
- **Source:** `src/lib/theme-layout/route-surface-registry.ts`
- **Why it matters:** already owns allowlisted teacher-facing route keys and route-to-surface resolution.
- **Reusable pattern:** add new metadata to the registry entry instead of creating a second route table.

### 2. Theme runtime compiler
- **Source:** `src/server/themes/tokens.ts`
- **Why it matters:** already compiles per-route runtime surfaces with summaries and fallbacks.
- **Reusable pattern:** new shell behavior fields should be compiled into typed runtime output here, then consumed downstream.

### 3. Shared teacher shell path
- **Source:** `src/components/shell/teacher-sidebar-shell.tsx`
- **Why it matters:** all teacher/settings/resources shell rendering already converges here.
- **Reusable pattern:** keep a sync frame + async wrapper split, so fallback remains static and theme/runtime fetch stays in async path.

### 4. Layout consumer pattern
- **Source:** `src/app/(teacher)/teacher/layout.tsx`
- **Why it matters:** this is the only place resolving pathname to route surface key.
- **Reusable pattern:** route layouts resolve `routeKey`; shell internals should resolve final shell config from that key.

### 5. Phase-specific verification pattern
- **Source:** `scripts/verify-phase16-theme-layout.ts`
- **Why it matters:** already uses static source guards plus focused test execution.
- **Reusable pattern:** Phase 19 should follow the same shape for `verify:phase19`.

## Interface snippets

From `src/lib/theme-layout/route-surface-registry.ts`:

```ts
type TeacherThemeRouteSurface = {
  label: string;
  defaultSplit: ThemeLayoutSplit;
  allowedModules: readonly ThemePageModuleKey[];
};

export function resolveTeacherThemeRouteSurface(pathname: string | null | undefined): TeacherThemeRouteKey
```

From `src/lib/dto/resource-ai.ts`:

```ts
export const ThemePageSurfaceRuntimeSchema = z.object({
  routeKey: ThemeRouteSurfaceKeySchema,
  shellMode: ThemeShellModeSchema,
  regions: z.array(ThemeLayoutRegionRuntimeSchema),
  summary: ThemeLayoutSummarySchema,
});
```

From `src/lib/dal/themes.ts`:

```ts
export type CurrentActorThemeRuntimeState = {
  requestedThemeId: string | null;
  activeThemeId: string | null;
  themeRuntime: ThemeResolvedRuntimeDTO | null;
  layoutRuntime: ThemeLayoutRuntime;
  themeSource: "default" | "active-theme";
};
```

## Planning implications

- Resolver contract should be introduced as a separate module, not embedded deeper into JSX.
- `TeacherSidebarShellFrame` should consume resolved config only; routeKey-specific logic must disappear from its render body.
- Regression work must guard both source shape (`routeKey === "/teacher"` removed) and behavior (`/teacher` still square/full-width).
