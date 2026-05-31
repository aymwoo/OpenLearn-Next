# Phase 16: Theme plugins and layout orchestration - Patterns

**Created:** 2026-05-10  
**Status:** Complete

## Pattern map

| Target area | Existing analog | Why it matters |
|---|---|---|
| Theme manifest schema | `src/lib/dto/resource-ai.ts` | 现有 plugin/theme schema 边界已经在这里 |
| Theme validation + compile | `src/server/themes/tokens.ts` | 现有 Lexend / surface / layout token guard 在这里 |
| School-scoped theme runtime | `src/lib/dal/themes.ts` | 现有 actor + school scope 校验路径在这里 |
| Theme switching action | `src/actions/theme-actions.ts` | 现有 `activeThemeId` + `revalidatePath` 路径要保留 |
| Plugin-driven theme registration | `src/lib/dal/plugins.ts` | `manifest.theme` 已经从这里注册 |
| Runtime injection | `src/components/theme/theme-injector.tsx` | 现有 `:root` CSS variable 注入入口 |
| Teacher shell fallback | `src/components/shell/teacher-sidebar-shell.tsx` | 已有 layout CSS variable fallback 模式 |
| Teacher shell hardcoded structure | `src/app/(teacher)/teacher/layout.tsx` | Phase 16 的主要替换点 |
| Settings theme controls | `src/components/surfaces/settings-surface.tsx` | 现有主题选择 UI 与摘要逻辑在这里 |

## Reusable excerpts

### Theme switch contract

From `src/actions/theme-actions.ts`:

```ts
export async function setActiveThemeAction(input: FormData | Record<string, unknown>)
```

Pattern: action validates input, updates cookie, then runs `revalidatePath("/", "layout")`.

### Theme runtime guard

From `src/lib/dal/themes.ts`:

```ts
export async function getActiveThemeForCurrentActor(themeId: string): Promise<ThemeRegistryDTO | null>
```

Pattern: active theme must remain actor-scoped and school-scoped.

### Plugin theme registration path

From `src/lib/dal/plugins.ts`:

```ts
if (manifest.theme) {
  const themeRecord = await registerThemeTokens(
    plugin.schoolId,
    `${plugin.name} theme`,
    manifest.theme,
    input.actorId,
  );
}
```

Pattern: richer theme must keep `manifest.theme` as the single registration source.

### Shell fallback token usage

From `src/components/shell/teacher-sidebar-shell.tsx`:

```tsx
style={{ gap: "var(--layout-shell-gap, 0rem)" }}
style={{ width: "var(--layout-sidebar-width, 16rem)" }}
style={{ borderRadius: "var(--layout-content-radius, 2rem)" }}
```

Pattern: keep current shell as fallback through CSS variable defaults.

## Files likely to change

- `src/lib/dto/resource-ai.ts`
- `src/server/themes/tokens.ts`
- `src/server/themes/registry.ts`
- `src/lib/dal/themes.ts`
- `src/actions/theme-actions.ts`
- `src/components/theme/theme-injector.tsx`
- `src/components/shell/sidebar.tsx`
- `src/components/shell/glass-nav.tsx`
- `src/components/shell/teacher-sidebar-shell.tsx`
- `src/app/(teacher)/teacher/layout.tsx`
- `src/app/settings/layout.tsx`
- `src/app/(library)/resources/layout.tsx`
- `src/components/surfaces/settings-surface.tsx`

## Testing patterns to reuse

- Source-contract tests using `readFileSync(...).toContain(...)` for theme/runtime wiring.
- Focused Vitest suites like `src/actions/theme-actions.test.ts` and
  `src/lib/dal/themes.test.ts` for contract-level regressions.
- Surface tests like `src/components/surfaces/settings-surface.test.tsx` for user-visible
  settings copy and action wiring.
