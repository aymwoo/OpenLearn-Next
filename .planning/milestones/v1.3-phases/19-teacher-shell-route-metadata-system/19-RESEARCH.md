# Phase 19: Teacher shell route metadata system - Research

**Created:** 2026-05-11  
**Status:** Complete

## Research question

如何在不改变当前 `/teacher` 视觉结果、不引入平行 shell 系统的前提下，
把教师端壳层从 route string 条件分支重构为 route metadata + centralized shell
resolver 驱动？

## Current baseline

- `src/lib/theme-layout/route-surface-registry.ts` 已有 allowlisted route surface
  registry，但 surface 只表达 `label`、`defaultSplit` 与 `allowedModules`，还不能
  表达 shell 的 `radius`、`width`、`chrome`。
- `src/server/themes/tokens.ts` 已能编译 `shellMode`、regions 与 summary，但编译后的
  runtime 没有显式的 shell behavior metadata contract。
- `src/components/shell/teacher-sidebar-shell.tsx` 仍存在
  `const isTeacherHome = routeKey === "/teacher";`，说明 `/teacher` 的 square /
  full-width / immersive 语义还停留在 UI 层硬编码。
- `/teacher`、`/settings`、`/resources` 已共享 `TeacherSidebarShell` 主路径，这为
  最小风险迁移提供了稳定入口。

## GitNexus findings

> 当前 GitNexus 索引 stale（indexed commit `51efff8`，current `97ec854`），下列结果
> 作为近似 dependency context 使用；执行实现前应重新 analyze。

- `TeacherSidebarShellFrame` upstream risk = **LOW**
  - direct callers: `TeacherSidebarShell`, `TeacherShellFallback`
  - transitive consumers: `TeacherLayout`, `SettingsLayout`, `ResourcesLayout`
- `TeacherSidebarShell` upstream risk = **LOW**
  - direct callers: `TeacherLayoutContent`, `SettingsLayout`, `ResourcesLayout`
- `resolveTeacherThemeRouteSurface` upstream risk = **LOW**
  - direct caller: `TeacherLayoutContent`

## Recommended architecture

### 1. Extend route metadata from “surface registry” to “surface + shell behavior registry”

Keep `route-surface-registry.ts` as the single allowlisted route source, but extend each route
entry with shell defaults:

- `shell.mode`: existing `left-nav` / `top-nav` / `top-nav-secondary-rail`
- `shell.radius`: `rounded` | `square`
- `shell.width`: `default` | `full-width`
- `shell.chrome`: `default` | `immersive` | `minimal` | `presentation` |
  `fullscreen` | `focus`

This keeps route identity and shell behavior in one registry, so future route additions cannot
skip metadata.

### 2. Introduce a dedicated shell surface resolver

Add a new resolver module, for example `src/lib/theme-layout/shell-surface-resolver.ts`, that
exports:

- `resolveShellVariant(surface)`
- `getShellSurfaceConfig({ routeKey, layoutRuntime })`

The resolver should merge:

1. allowlisted route metadata defaults
2. compiled theme runtime page surface
3. current route summary/label

and return:

- `shellVariant`
- `shellConfig`
- `surfaceMetadata`

This keeps compile/resolve/render responsibilities separate.

### 3. Keep teacher shell render path pure

`teacher-sidebar-shell.tsx` should stop branching on route strings and consume only resolver
output:

- `shellVariant` decides structural rendering path
- `shellConfig.radius` replaces `isTeacherHome`
- `shellConfig.width` replaces local full-width checks
- `shellConfig.chrome` replaces immersive-specific local booleans
- `surfaceMetadata` replaces local route label switch logic

### 4. Preserve current `/teacher` behavior as metadata, not JSX knowledge

The current live behavior should become a registry fact:

```ts
{
  routeKey: "/teacher",
  shell: {
    mode: "left-nav",
    radius: "square",
    width: "full-width",
    chrome: "immersive",
  }
}
```

This gives future `presentation` / `focus` / `fullscreen` routes a place to extend safely.

## Architecture patterns to follow

1. **Registry-first, not JSX-first**  
   New shell behavior must start in route metadata, not in component conditionals.

2. **Compile → resolve → render layering**  
   `tokens.ts` compiles runtime, resolver merges route metadata + runtime, shell renders the final
   contract.

3. **Keep one teacher shell path**  
   `/teacher`、`/settings`、`/resources` stay on the existing `TeacherSidebarShell` path.

4. **Extension enums without visible rollout**  
   Add future-safe enums now, but do not expose presentation/focus/fullscreen UI changes in this
   phase.

## Don’t hand-roll

- 不要把 `rounded` / `square` / `immersive` 再次写回 `teacher-sidebar-shell.tsx`
  的 route 条件分支。
- 不要在 `Sidebar` 或 `GlassNav` 中添加 route 业务判断；它们只是 nav renderer。
- 不要把 shell metadata 直接塞进自由 `Record<string, string>`。
- 不要为 `/teacher` 首页额外造一条 “special shell” 渲染路径。

## Common pitfalls

1. **Only moving the string check into another component**  
   如果只是把 `routeKey === "/teacher"` 从 shell 挪到 layout 或 nav 组件，问题没有解决。

2. **Resolver returning too little information**  
   如果 resolver 只返回 `mode`，UI 仍会重新推导 radius/width/chrome，硬编码会回流。

3. **Theme/runtime crossing responsibilities**  
   theme runtime 决定 compiled page surface；route metadata 决定 shell defaults；两者不能互相吞并。

4. **Visual drift on `/teacher`**  
   当前 square/full-width 行为必须被 regression locks 保护，否则重构容易把首页恢复成 rounded shell。

## Security and trust boundaries

| Boundary | Risk | Required mitigation |
|---|---|---|
| route metadata -> resolver | route additions skip shell defaults | require every allowlisted route surface to define shell metadata |
| theme runtime -> resolver | runtime/page data overwrites shell invariants accidentally | merge with explicit precedence and typed enums only |
| resolver -> shell renderer | UI reintroduces local branching | render exclusively from `shellVariant`, `shellConfig`, `surfaceMetadata` |
| shell renderer -> regression suite | future edits restore route string checks | dedicated Phase 19 verify script + source guards |

## Implementation recommendation

按 3 个 plans 拆分最稳妥：

1. 扩展 route metadata schema + resolver contract，并产出架构文档
2. 重构 teacher shell render path 去消费 resolver 输出
3. 增加 targeted regression tests + `verify:phase19`

这样能保持原子迁移：先接口、再消费、最后锁回归。
