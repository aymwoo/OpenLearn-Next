# Phase 1: Application foundation and design shell - Research

**Researched:** 2026-05-04  
**Domain:** Next.js 16 App Router foundation, Tailwind v4 design system, and
static product shell implementation  
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

## Implementation Decisions

### Shell depth

- **D-01:** Phase 1 shells must be high-fidelity static UI, not bare wireframes. They should look like the product is usable even though real data is not connected yet.
- **D-02:** Static shells must include working-looking navigation and active states, dashboard cards, and the core editor/player/classroom chrome.
- **D-03:** Use subtle Simplified Chinese demo copy to communicate that content is illustrative. Avoid disruptive demo banners and avoid implementation words such as mock, seed, database, or placeholder in user-facing UI.
- **D-04:** Highest-fidelity priority is public home, teacher dashboard, and lesson editor. Student dashboard, player, classroom console, resource/course areas, and admin shell can be slightly lighter but must still follow the approved UI-SPEC.

### Role entry

- **D-05:** Phase 1 must allow public demo navigation into teacher, student, classroom, and admin route shells. Do not block these behind fake auth in this phase.
- **D-06:** Provide a demo role switcher or equivalent role preview control. It only changes static shell presentation and must not imply real session/auth behavior.
- **D-07:** The teacher path is the primary user journey. Main CTA should route toward the teacher workspace or `开始备课` flow.
- **D-08:** Admin entry should exist but stay low-emphasis. It is a route-shell proof point, not the main product story for Phase 1.

### Demo content

- **D-09:** Static demo content should use 信息科技 as the main classroom context.
- **D-10:** The demo lesson topic is programming basics for middle school students.
- **D-11:** Copy should feel like real teacher preparation, not a marketing showcase. Use realistic class, lesson, step, and resource labels.
- **D-12:** Example lesson flow should cover 导入, 讲授, 练习, and 总结 so the step-based classroom workflow is visible from Phase 1.

### Mobile priority

- **D-13:** Mobile priority is homepage and dashboard quality first. Do not attempt full mobile parity for all complex shells in Phase 1.
- **D-14:** Editor and classroom console on mobile should provide readable preview plus a clear “建议使用桌面端编辑/控课” style message. Do not hide routes, and do not overbuild mobile editing/control interactions.
- **D-15:** Student player should be readable on mobile because students may use phones or tablets. It does not need full immersive parity in Phase 1.
- **D-16:** Mobile navigation should use top glass navigation with overflow behavior, preserving the UI-SPEC glass surface language and 44px touch targets.

### the agent's Discretion

No major areas were delegated fully to the agent. The planner may decide exact component names, file organization, and static data shape as long as the decisions above and UI-SPEC are preserved.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | User can open a Next.js 16 App Router application bootstrapped with React 19.2, TypeScript, Turbopack, and the required project structure. | Use `create-next-app` or manual scaffold with `next@16.2.4`, `react@19.2.5`, `react-dom@19.2.5`, TypeScript, App Router, and Turbopack defaults. [VERIFIED: npm registry] [CITED: https://nextjs.org/docs/app/getting-started/installation] |
| FOUND-02 | User sees public, teacher, student, classroom, and admin route areas with separate layouts and navigation shells. | Use App Router route groups and segment layouts for public, teacher, student, classroom, admin, course, and resource areas. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/route-groups] [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/layout] |
| FOUND-03 | User sees Simplified Chinese UI copy using the Lexend-based design system from `DESIGN.md`. | Apply Lexend globally through `next/font/google` and keep all user-visible shell copy in Simplified Chinese. [CITED: https://nextjs.org/docs/app/getting-started/fonts] [VERIFIED: DESIGN.md] |
| FOUND-04 | User sees homepage, teacher dashboard, student dashboard, editor, player, classroom console, resource, and course surfaces implemented from Stitch project `5322129002350954765` mappings. | Implement the approved UI-SPEC surface contracts and mapped Stitch screens for all listed route surfaces. [VERIFIED: Stitch project 5322129002350954765] [VERIFIED: 01-UI-SPEC.md] |
| FOUND-05 | Developer can use shared design tokens and components that enforce tonal layering, no 1px divider lines, glass surfaces, gradient primary actions, and accessible focus states. | Encode tokens in Tailwind v4 `@theme` variables and shared components; use tonal backgrounds, ghost focus rings, ambient shadows, and gradient buttons. [CITED: https://tailwindcss.com/docs/theme] [VERIFIED: DESIGN.md] |
| FOUND-06 | Developer can identify explicit Next.js cache boundaries, cache tags, and PPR/Suspense rules for all route groups. | Enable `cacheComponents: true`, document cache tags, mark stable shell data with `use cache`, and wrap future runtime/user/live regions in Suspense. [CITED: https://nextjs.org/docs/app/getting-started/caching] [CITED: https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents] |

</phase_requirements>

## Summary

Phase 1 is a greenfield foundation phase: it must scaffold a runnable Next.js 16
App Router app, establish route-shell architecture, and make the visual system
usable before any real auth, database, or business logic exists. [VERIFIED:
01-CONTEXT.md] [VERIFIED: .planning/ROADMAP.md] The planner should split work
into scaffold, tokens/components, route shells, static product surfaces, and
cache/PPR convention tasks rather than trying to implement domain behavior.
[VERIFIED: .planning/REQUIREMENTS.md]

The core implementation path is locked: use Next.js 16.2, React 19.2,
TypeScript, Turbopack, Tailwind v4, Lexend, custom tonal components, and the
approved Stitch/UI-SPEC mapping. [VERIFIED: npm registry] [VERIFIED:
AGENTS.md] [VERIFIED: 01-UI-SPEC.md] Do not initialize shadcn in Phase 1, and
do not import border-heavy UI skins; use Radix primitives only when behavior
requires accessible primitives. [VERIFIED: 01-UI-SPEC.md]

The highest-risk planning mistake is treating the static shell as disposable.
[VERIFIED: 01-CONTEXT.md] It must be structured so later phases can replace
static demo data with DAL-backed DTOs and Server Actions without rewriting the
visual composition. [VERIFIED: 01-CONTEXT.md] Cache/PPR conventions also need
to exist now because later user-specific progress and live classroom data must
not leak into cached shells. [VERIFIED: .planning/PROJECT.md] [CITED:
https://nextjs.org/docs/app/getting-started/caching]

**Primary recommendation:** Plan Phase 1 as a polished static App Router shell
with reusable tokens/components and explicit cache-boundary documentation, not
as an auth/data implementation phase. [VERIFIED: 01-CONTEXT.md]

## Project Constraints (from AGENTS.md)

These directives are mandatory for Phase 1 planning. [VERIFIED: AGENTS.md]

- Use Next.js 16 App Router, React 19.2, Turbopack, Auth.js v5, Drizzle ORM,
  and SQLite as the project baseline. [VERIFIED: AGENTS.md]
- UI components must not directly access the database; all future reads/writes
  must go through DAL and Server Actions. [VERIFIED: AGENTS.md]
- Use Node.js 20.9+ as the primary runtime; reserve Edge Runtime for future SSE
  realtime sync only. [VERIFIED: AGENTS.md]
- Next.js 16 caching must be explicit, and future writes must update or
  invalidate tags. [VERIFIED: AGENTS.md]
- SQLite is the first database target, and future relations must cascade delete.
  [VERIFIED: AGENTS.md]
- Classroom broadcast must use SSE and support locked/unlocked modes in later
  phases. [VERIFIED: AGENTS.md]
- Plugins must not use `eval()`, dynamic third-party code execution, direct DB
  access, or direct core API access. [VERIFIED: AGENTS.md]
- UI must reference Stitch project `5322129002350954765` and `DESIGN.md`.
  [VERIFIED: AGENTS.md] [VERIFIED: Stitch project 5322129002350954765]
- No project-local skills were found under `.claude/skills/` or
  `.agents/skills/`. [VERIFIED: glob search]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Application scaffold | Frontend Server (SSR) | Browser / Client | Next.js App Router owns layouts, pages, metadata, and static shell rendering; browser components are only needed for active nav, role preview, and small interactions. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/layout] |
| Route groups and layouts | Frontend Server (SSR) | Browser / Client | Route groups organize sections without changing URL paths, while active navigation can use client hooks where needed. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/route-groups] [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/layout] |
| Design tokens and shared UI | Browser / Client | Frontend Server (SSR) | Tailwind v4 theme variables generate utility classes and CSS variables consumed by server-rendered and client components. [CITED: https://tailwindcss.com/docs/theme] |
| Static shell content | Frontend Server (SSR) | — | Phase 1 demo content is deterministic static content, so it belongs in server-rendered pages and shared constants rather than runtime services. [VERIFIED: 01-CONTEXT.md] |
| Role preview switcher | Browser / Client | Frontend Server (SSR) | The role switcher only changes presentation and must not imply real session/auth behavior. [VERIFIED: 01-CONTEXT.md] |
| Cache/PPR conventions | Frontend Server (SSR) | API / Backend | `cacheComponents`, `use cache`, `cacheTag`, and Suspense boundaries are Next.js server-rendering conventions; future writes from Server Actions will update tags. [CITED: https://nextjs.org/docs/app/getting-started/caching] |
| Future auth/data boundaries | API / Backend | Database / Storage | Phase 1 must leave seams for DAL and Server Actions but must not implement real auth/database logic. [VERIFIED: 01-CONTEXT.md] [VERIFIED: AGENTS.md] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `16.2.4`, published 2026-04-15 | App Router, Server Components, Cache Components, PPR, Turbopack | Project requires Next.js 16, and official docs list Node 20.9+ plus Turbopack as the default bundler. [VERIFIED: npm registry] [CITED: https://nextjs.org/docs/app/getting-started/installation] |
| `react` | `19.2.5`, published 2026-04-08 | React runtime and Server/Client Component model | Project requires React 19.2; Next App Router depends on React features for RSC and Suspense. [VERIFIED: npm registry] [CITED: https://nextjs.org/docs/app/getting-started/caching] |
| `react-dom` | `19.2.5`, published 2026-04-08 | DOM renderer for React | Must match React version for the Next.js app baseline. [VERIFIED: npm registry] |
| `typescript` | `6.0.3`, published 2026-04-16 | Type checking and typed route/component contracts | Next.js has built-in TypeScript support and requires TypeScript at least 5.1.0. [VERIFIED: npm registry] [CITED: https://nextjs.org/docs/app/getting-started/installation] |
| `tailwindcss` | `4.2.4`, published 2026-04-21 | CSS utility system and design token API | Tailwind v4 `@theme` variables are the right mechanism for encoding `DESIGN.md` tokens. [VERIFIED: npm registry] [CITED: https://tailwindcss.com/docs/theme] |
| `@tailwindcss/postcss` | `4.2.4`, published 2026-04-21 | Tailwind v4 PostCSS integration | Tailwind official Next.js guide installs `@tailwindcss/postcss` and imports `tailwindcss` in global CSS. [VERIFIED: npm registry] [CITED: https://tailwindcss.com/docs/installation/framework-guides/nextjs] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | `1.14.0`, published 2026-04-29 | Semantic icons | Use sparse 20px icons and 24px primary nav/action icons per UI-SPEC. [VERIFIED: npm registry] [VERIFIED: 01-UI-SPEC.md] |
| `@radix-ui/react-slot` | `1.2.4`, published 2025-11-04 | Polymorphic component composition | Use for `asChild`-style buttons/links if needed; keep visuals custom. [VERIFIED: npm registry] [VERIFIED: 01-UI-SPEC.md] |
| `clsx` | `2.1.1`, published 2024-04-23 | Conditional class composition | Use in shared components to keep variant logic readable. [VERIFIED: npm registry] |
| `tailwind-merge` | `3.5.0`, published 2026-02-18 | Merge conflicting Tailwind classes | Use in a `cn()` helper with `clsx` for component variants. [VERIFIED: npm registry] |
| `vitest` | `4.1.5`, published 2026-04-21 | Unit/component test runner | Use after scaffold for static data, component behavior, and token helper tests if the planner adds automated tests. [VERIFIED: npm registry] |
| `@testing-library/react` | `16.3.2`, published 2026-01-19 | React component testing | Use for navigation shell and role preview behavior tests. [VERIFIED: npm registry] |
| `playwright` | `1.59.1`, published 2026-04-01 | Browser smoke/e2e verification | Use for opening home, teacher, student, classroom, admin, resource, and course surfaces after scaffold. [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `create-next-app` defaults | Manual scaffold | Manual scaffold gives more control, but official `create-next-app` defaults already enable TypeScript, Tailwind, ESLint, App Router, Turbopack, and `@/*` alias. [CITED: https://nextjs.org/docs/app/getting-started/installation] |
| Custom Tailwind components | shadcn/ui | shadcn is intentionally not initialized in Phase 1 because default border-heavy presets conflict with the no-line tonal system. [VERIFIED: 01-UI-SPEC.md] |
| Single global layout only | Route groups with segment layouts | Route groups let the app partition route sections and share layouts without adding group names to URL paths. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/route-groups] |
| Dynamic auth gating | Public demo navigation | Phase 1 must allow public demo navigation and must not block shells behind fake auth. [VERIFIED: 01-CONTEXT.md] |

**Installation:**

```bash
pnpm create next-app@latest . --typescript --eslint --app --src-dir --import-alias "@/*"
pnpm add lucide-react @radix-ui/react-slot clsx tailwind-merge
pnpm add -D vitest @testing-library/react playwright
```

The exact create command may need adjustment if the repo already contains
planning files; the planner can use a temporary scaffold and copy app files into
place to avoid overwriting `.planning`, `DESIGN.md`, and `AGENTS.md`.
[VERIFIED: repository file reads] [CITED:
https://nextjs.org/docs/app/getting-started/installation]

## Architecture Patterns

### System Architecture Diagram

```text
Browser request
  |
  v
Next.js App Router root layout (Lexend + global tokens)
  |
  +--> (public) route group --> Home shell + public nav + teacher CTA
  |
  +--> (teacher) route group --> Teacher dashboard + editor shell
  |
  +--> (student) route group --> Student dashboard + player shell
  |
  +--> (classroom) route group --> Classroom console shell
  |
  +--> (library) route group --> Course center + resource center shells
  |
  +--> (admin) route group --> Low-emphasis admin shell
  |
  v
Shared UI layer
  |
  +--> Tailwind v4 @theme tokens from DESIGN.md/Stitch
  +--> Tonal cards, glass nav, gradient CTA, focus rings, skeletons
  +--> Static demo data constants (信息科技 / 编程基础 / 导入-讲授-练习-总结)
  |
  v
Cache/PPR convention layer
  |
  +--> Static/cached shells: stable public and route chrome
  +--> Future Suspense islands: auth, progress, classroom live state
  +--> Future cache tags: nav, course, lesson, steps, progress, classroom
```

This architecture keeps Phase 1 as static UI while reserving clear replacement
points for future DAL-backed data and live classroom state. [VERIFIED:
01-CONTEXT.md] [CITED: https://nextjs.org/docs/app/getting-started/caching]

### Recommended Project Structure

```text
src/
├── app/
│   ├── layout.tsx                  # Root html/body, Lexend, metadata
│   ├── globals.css                 # Tailwind import and @theme tokens
│   ├── (public)/page.tsx           # Homepage at /
│   ├── (teacher)/teacher/page.tsx  # Teacher dashboard
│   ├── (teacher)/teacher/editor/page.tsx
│   ├── (student)/student/page.tsx
│   ├── (student)/student/player/page.tsx
│   ├── (classroom)/classroom/page.tsx
│   ├── (library)/courses/page.tsx
│   ├── (library)/resources/page.tsx
│   └── (admin)/admin/page.tsx
├── components/
│   ├── shell/                      # RouteShell, GlassNav, Sidebar, RolePreview
│   ├── surfaces/                   # Home, dashboard, editor, player sections
│   └── ui/                         # Button, Card, Badge, Focusable primitives
├── lib/
│   ├── demo-data.ts                # Static Chinese demo scenario
│   ├── navigation.ts               # Route labels and nav items
│   ├── cache-policy.ts             # Cache tag taxonomy and PPR notes
│   └── utils.ts                    # cn(clsx + tailwind-merge)
└── styles/
    └── tokens.css                  # Optional split token imports if needed
```

Use route groups for organization and URL paths like `/teacher`, `/student`,
`/classroom`, `/courses`, `/resources`, and `/admin`; group names in
parentheses do not appear in URLs. [CITED:
https://nextjs.org/docs/app/api-reference/file-conventions/route-groups]

### Pattern 1: Bootstrap with Next.js 16 defaults

**What:** Start from the official App Router scaffold with TypeScript, Tailwind,
ESLint, Turbopack, and `@/*` import alias. [CITED:
https://nextjs.org/docs/app/getting-started/installation]

**When to use:** Use for Phase 1 because the repo is greenfield aside from
planning artifacts and `DESIGN.md`. [VERIFIED: 01-CONTEXT.md]

**Example:**

```bash
# Source: https://nextjs.org/docs/app/getting-started/installation
pnpm create next-app@latest openlearn-next --yes
```

### Pattern 2: Enable Cache Components immediately

**What:** Add `cacheComponents: true` to `next.config.ts`. [CITED:
https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents]

**When to use:** Use from Phase 1 so PPR behavior and Suspense requirements are
visible before feature data exists. [VERIFIED: .planning/ROADMAP.md]

**Example:**

```ts
// Source: https://nextjs.org/docs/app/getting-started/caching
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
}

export default nextConfig
```

### Pattern 3: Route groups for section shells

**What:** Use folder names wrapped in parentheses to organize route sections
without adding the group name to URL paths. [CITED:
https://nextjs.org/docs/app/api-reference/file-conventions/route-groups]

**When to use:** Use for public, teacher, student, classroom, library, and admin
areas because each has a distinct navigation shell. [VERIFIED: 01-CONTEXT.md]

**Example:**

```text
# Source: https://nextjs.org/docs/app/api-reference/file-conventions/route-groups
src/app/(teacher)/teacher/layout.tsx
src/app/(teacher)/teacher/page.tsx
src/app/(teacher)/teacher/editor/page.tsx
```

### Pattern 4: Lexend through `next/font/google`

**What:** Load Lexend globally through `next/font/google` to self-host and avoid
layout shift. [CITED: https://nextjs.org/docs/app/getting-started/fonts]

**When to use:** Use in root layout because `DESIGN.md` and UI-SPEC require
Lexend exclusively. [VERIFIED: DESIGN.md] [VERIFIED: 01-UI-SPEC.md]

**Example:**

```tsx
// Source: https://nextjs.org/docs/app/getting-started/fonts
import { Lexend } from 'next/font/google'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={lexend.variable}>
      <body>{children}</body>
    </html>
  )
}
```

### Pattern 5: Tailwind v4 tokens with `@theme`

**What:** Define project tokens as Tailwind v4 theme variables so utilities like
`bg-surface`, `text-on-surface`, and `shadow-ambient` exist. [CITED:
https://tailwindcss.com/docs/theme]

**When to use:** Use for `DESIGN.md` and Stitch tokens because Phase 1 must make
shared design tokens available to developers. [VERIFIED: DESIGN.md]

**Example:**

```css
/* Source: https://tailwindcss.com/docs/theme */
@import "tailwindcss";

@theme {
  --font-sans: var(--font-lexend), sans-serif;
  --color-surface: #f5f6f7;
  --color-surface-container-low: #eff1f2;
  --color-surface-container-lowest: #ffffff;
  --color-primary: #005da7;
  --color-primary-container: #68abff;
  --color-on-surface: #2c2f30;
  --color-on-surface-variant: #595c5d;
  --shadow-ambient: 0 16px 48px rgba(44, 47, 48, 0.06);
  --radius-shell: 2rem;
}
```

### Anti-Patterns to Avoid

- **Fake auth gates:** Do not block teacher, student, classroom, or admin shells
  behind fake sessions in Phase 1. [VERIFIED: 01-CONTEXT.md]
- **User-facing implementation language:** Do not show “mock,” “placeholder,”
  “seed,” or “database” in visible UI copy. [VERIFIED: 01-CONTEXT.md]
- **1px divider-driven layout:** Do not use borders for sectioning; use tonal
  background shifts instead. [VERIFIED: DESIGN.md]
- **Root-wide empty Suspense fallback:** Do not put an empty Suspense boundary
  above the entire body because it removes the immediate static shell. [CITED:
  https://nextjs.org/docs/app/getting-started/caching]
- **Runtime APIs in layouts without Suspense:** Do not add cookies, headers, or
  uncached fetches to layouts without local Suspense boundaries. [CITED:
  https://nextjs.org/docs/app/api-reference/file-conventions/layout]
- **shadcn initialization:** Do not initialize shadcn in Phase 1. [VERIFIED:
  01-UI-SPEC.md]
- **Database imports in UI:** Do not introduce DB clients or DAL calls in Phase
  1 UI shells. [VERIFIED: AGENTS.md] [VERIFIED: 01-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| App scaffold | Custom bundler/build setup | Next.js 16 App Router scaffold | Official scaffold gives TypeScript, Tailwind, ESLint, App Router, Turbopack, and alias defaults. [CITED: https://nextjs.org/docs/app/getting-started/installation] |
| Font loading | Manual Google Fonts `<link>` tags | `next/font/google` Lexend | `next/font` self-hosts fonts and avoids browser requests to Google. [CITED: https://nextjs.org/docs/app/getting-started/fonts] |
| Design-token utility generation | Ad hoc CSS constants only | Tailwind v4 `@theme` | `@theme` variables create utility classes and CSS variables. [CITED: https://tailwindcss.com/docs/theme] |
| Class merging | String concatenation helpers | `clsx` + `tailwind-merge` | These packages keep component variants readable and avoid conflicting Tailwind class output. [VERIFIED: npm registry] |
| Icons | Inline SVG library copied by hand | `lucide-react` | UI-SPEC names lucide-react as the icon library. [VERIFIED: 01-UI-SPEC.md] |
| Dialog/dropdown behavior | Custom keyboard/focus management | Radix primitives where needed | UI-SPEC permits Radix primitives for accessibility behavior while requiring custom visuals. [VERIFIED: 01-UI-SPEC.md] |
| PPR conventions | Informal comments in components only | `lib/cache-policy.ts` plus route docs | FOUND-06 requires developers to identify cache boundaries, tags, and Suspense rules. [VERIFIED: .planning/REQUIREMENTS.md] |

**Key insight:** Phase 1 must hand-author the product visual system, but it
should not hand-roll framework, font, token, icon, or accessibility primitives
that the stack already provides. [VERIFIED: 01-UI-SPEC.md] [CITED:
https://nextjs.org/docs/app/getting-started/installation]

## Common Pitfalls

### Pitfall 1: Route groups misunderstood as URL segments

**What goes wrong:** A planner creates URLs like `/(teacher)/teacher` or expects
the group name to appear in the browser URL. [CITED:
https://nextjs.org/docs/app/api-reference/file-conventions/route-groups]

**Why it happens:** Route groups are file-organization folders, not URL path
segments. [CITED:
https://nextjs.org/docs/app/api-reference/file-conventions/route-groups]

**How to avoid:** Put actual URL segments inside the group, for example
`src/app/(teacher)/teacher/page.tsx` for `/teacher`. [CITED:
https://nextjs.org/docs/app/api-reference/file-conventions/route-groups]

**Warning signs:** Duplicate routes across groups or conflicting paths such as
two `about/page.tsx` files resolving to the same URL. [CITED:
https://nextjs.org/docs/app/api-reference/file-conventions/route-groups]

### Pitfall 2: Cache Components causes build-time Suspense errors

**What goes wrong:** A component reads uncached data or runtime APIs outside
Suspense and Next.js raises “Uncached data was accessed outside of `<Suspense>`.”
[CITED: https://nextjs.org/docs/app/getting-started/caching]

**Why it happens:** With Cache Components, Next.js requires uncached runtime
work to be explicitly streamed or cached. [CITED:
https://nextjs.org/docs/app/getting-started/caching]

**How to avoid:** Keep Phase 1 static data deterministic; document future
runtime regions as Suspense islands with localized skeletons. [VERIFIED:
01-CONTEXT.md] [CITED: https://nextjs.org/docs/app/getting-started/caching]

**Warning signs:** Calling `cookies()`, `headers()`, `Date.now()`, random IDs,
or uncached fetches inside layouts without Suspense. [CITED:
https://nextjs.org/docs/app/getting-started/caching]

### Pitfall 3: Tailwind v4 configured like Tailwind v3

**What goes wrong:** The plan centers a JavaScript `tailwind.config.js` and
misses CSS-first `@theme` variables. [CITED:
https://tailwindcss.com/docs/theme]

**Why it happens:** Tailwind v4 uses CSS directives like `@import` and `@theme`
for core configuration. [CITED:
https://tailwindcss.com/docs/functions-and-directives]

**How to avoid:** Put Phase 1 tokens in `globals.css` or imported token CSS via
`@theme`; use `@source` only if Tailwind misses class sources. [CITED:
https://tailwindcss.com/docs/functions-and-directives]

**Warning signs:** Planner adds legacy `content` arrays or plugin config before
confirming Tailwind v4 needs them. [CITED:
https://tailwindcss.com/docs/functions-and-directives]

### Pitfall 4: Visual drift from Stitch and DESIGN.md

**What goes wrong:** Screens become generic SaaS dashboards with dense grids,
tables, borders, and marketing copy. [VERIFIED: DESIGN.md] [VERIFIED:
01-UI-SPEC.md]

**Why it happens:** Developers use default UI-kit patterns instead of the
approved Luminous Academy / Tactile Horizon rules. [VERIFIED: DESIGN.md]

**How to avoid:** Plan a visual QA pass against UI-SPEC surface contracts and
Stitch project labels for every required surface. [VERIFIED: Stitch project
5322129002350954765] [VERIFIED: 01-UI-SPEC.md]

**Warning signs:** 1px dividers, pure black text, harsh black shadows, feature
grid clutter, or Growth Green used as decoration. [VERIFIED: DESIGN.md]
[VERIFIED: 01-UI-SPEC.md]

### Pitfall 5: Static data shaped unlike future DTOs

**What goes wrong:** Later DAL integration requires rewriting components because
static content is scattered inside JSX. [VERIFIED: 01-CONTEXT.md]

**Why it happens:** Phase 1 treats demo content as throwaway copy instead of a
contract for future DTO shapes. [VERIFIED: 01-CONTEXT.md]

**How to avoid:** Put demo lesson, route navigation, cards, steps, resources,
and participants in typed constants under `lib/demo-data.ts`. [VERIFIED:
01-CONTEXT.md]

**Warning signs:** Repeated hard-coded Chinese labels in multiple page files.
[VERIFIED: repository is greenfield]

## Code Examples

Verified patterns from official sources and project contracts follow. [CITED:
sources listed inline]

### Shared class helper

```ts
// Source: npm registry package verification for clsx and tailwind-merge
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Gradient primary button pattern

```tsx
// Source: DESIGN.md + 01-UI-SPEC.md
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function PrimaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex min-h-12 items-center justify-center rounded-full px-6 text-base font-semibold',
        'bg-linear-135 from-primary to-primary-container text-on-primary shadow-ambient',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40'
      )}
    >
      {children}
    </Link>
  )
}
```

### Suspense island for future request-specific content

```tsx
// Source: https://nextjs.org/docs/app/getting-started/caching
import { Suspense } from 'react'

function UserToolbarSkeleton() {
  return <div className="h-11 w-40 rounded-full bg-surface-container-low" />
}

async function FutureUserToolbar() {
  return <div>访客预览</div>
}

export function ShellHeader() {
  return (
    <header className="sticky top-4 z-50 rounded-full bg-surface/80 backdrop-blur-md">
      <Suspense fallback={<UserToolbarSkeleton />}>
        <FutureUserToolbar />
      </Suspense>
    </header>
  )
}
```

### Cache policy constants for FOUND-06

```ts
// Source: .planning/PROJECT.md + https://nextjs.org/docs/app/getting-started/caching
export const cacheTags = {
  publicShell: 'public:shell',
  navigation: 'navigation:global',
  course: (courseId: string) => `course:${courseId}`,
  lesson: (lessonId: string) => `lesson:${lessonId}`,
  steps: (lessonId: string) => `steps:${lessonId}`,
  progress: (lessonId: string, userId: string) => `progress:${lessonId}:${userId}`,
  classroom: (sessionId: string) => `classroom:${sessionId}`,
} as const
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Webpack as default dev bundler | Turbopack is the default bundler for `next dev` and `next build` unless Webpack is requested | Next.js 16 docs current as of 2026-04-10 | Plan no custom Webpack config in Phase 1. [CITED: https://nextjs.org/docs/app/getting-started/installation] |
| Implicit prerender/caching assumptions | `cacheComponents: true` with explicit `use cache`, Suspense, and cache tags | Next.js 16 introduced `cacheComponents` in 16.0.0 | Plan cache/PPR boundaries now, even without real data. [CITED: https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents] |
| Tailwind v3 JavaScript-first config | Tailwind v4 CSS-first `@import` and `@theme` variables | Tailwind docs v4.2 | Put design tokens in CSS theme variables. [CITED: https://tailwindcss.com/docs/theme] |
| Browser-loaded Google Fonts | `next/font/google` self-hosting | Current Next.js docs | Use Lexend through `next/font` for privacy and performance. [CITED: https://nextjs.org/docs/app/getting-started/fonts] |

**Deprecated/outdated:**

- `next lint` scripts are outdated for Next.js 16; official docs say `next build`
  no longer runs the linter automatically and scripts should call ESLint
  directly. [CITED: https://nextjs.org/docs/app/getting-started/installation]
- `middleware.ts` is not part of Phase 1, but later route protection should use
  `proxy.ts` per project stack decisions. [VERIFIED: AGENTS.md]
- `theme()` in Tailwind CSS is deprecated for new CSS; use CSS theme variables
  instead. [CITED: https://tailwindcss.com/docs/functions-and-directives]

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and
> discuss-phase use this section to identify decisions that need user
> confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|

**If this table is empty:** All claims in this research were verified or cited —
no user confirmation needed.

## Open Questions

1. **Should scaffold happen in place or through a temporary Next app copy-in?**
   - What we know: The repo already contains `.planning`, `DESIGN.md`, and
     `AGENTS.md`. [VERIFIED: repository file reads]
   - What's unclear: The exact execution preference for avoiding scaffold
     overwrite conflicts is not specified. [VERIFIED: 01-CONTEXT.md]
   - Recommendation: Planner should include a safe scaffold step that preserves
     planning docs, either by running `create-next-app` in a temporary directory
     or by using manual package/config creation. [CITED:
     https://nextjs.org/docs/app/getting-started/installation]

2. **How much automated UI testing should Phase 1 include?**
   - What we know: `workflow.nyquist_validation` is explicitly `false`, so the
     Validation Architecture section is skipped. [VERIFIED: .planning/config.json]
   - What's unclear: The user did not require Playwright screenshots in this
     research request. [VERIFIED: user prompt]
   - Recommendation: Planner should at least include `pnpm build`, `pnpm lint`,
     and a manual route walkthrough; Playwright smoke tests are optional if time
     allows. [VERIFIED: npm registry]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next.js 16 runtime and scaffold | ✓ | `v24.1.0` | Node 20.9+ is the official minimum; current environment exceeds it. [VERIFIED: command output] [CITED: https://nextjs.org/docs/app/getting-started/installation] |
| npm | Package/version verification and fallback scripts | ✓ | `11.7.0` | Use pnpm if package manager decision holds. [VERIFIED: command output] |
| pnpm | Recommended package manager | ✓ | `10.33.0` | npm is available if pnpm is unsuitable. [VERIFIED: command output] |
| npx | Context7 CLI and create-next-app fallback | ✓ | `11.7.0` | pnpm dlx can be used. [VERIFIED: command output] |
| Stitch project `5322129002350954765` | Binding visual reference | ✓ | Updated 2026-05-04 | Use `DESIGN.md` and UI-SPEC if Stitch access is temporarily unavailable. [VERIFIED: Stitch project 5322129002350954765] |

**Missing dependencies with no fallback:**

- None found for Phase 1 research and planning. [VERIFIED: command output]

**Missing dependencies with fallback:**

- No missing runtime dependency was identified; npm emitted a warning about an
  unknown user config `public-hoist-pattern`, but version checks still completed.
  [VERIFIED: npm registry command output]

## Security Domain

Security enforcement is enabled because `.planning/config.json` does not set it
to `false`. [VERIFIED: .planning/config.json]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | Real auth is deferred to Phase 2; Phase 1 must not fake protected sessions. [VERIFIED: 01-CONTEXT.md] |
| V3 Session Management | no | Role preview must be presentation-only and must not imply session state. [VERIFIED: 01-CONTEXT.md] |
| V4 Access Control | no | Protected access is deferred; do not add fake authorization logic in UI shells. [VERIFIED: 01-CONTEXT.md] |
| V5 Input Validation | limited | No user input persistence exists; use typed static data and avoid Server Actions in Phase 1. [VERIFIED: 01-CONTEXT.md] |
| V6 Cryptography | no | No secrets, credentials, or token handling belongs in Phase 1. [VERIFIED: 01-CONTEXT.md] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Demo role switcher mistaken for auth | Spoofing | Label it as role preview, keep all routes public in Phase 1, and defer real auth to Phase 2. [VERIFIED: 01-CONTEXT.md] |
| Cached shell leaks future user/live data | Information Disclosure | Keep Phase 1 static; document future user/live regions as Suspense islands with scoped cache tags. [CITED: https://nextjs.org/docs/app/getting-started/caching] |
| Plugin/API surface accidentally introduced early | Elevation of Privilege | Do not add plugin execution, DB access, or core API access in Phase 1. [VERIFIED: AGENTS.md] [VERIFIED: 01-CONTEXT.md] |
| External links/assets added casually | Tampering / Information Disclosure | Use local/static assets or reviewed sources only; do not add third-party registry UI blocks. [VERIFIED: 01-UI-SPEC.md] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/01-application-foundation-and-design-shell/01-CONTEXT.md`
  — locked phase scope and user decisions. [VERIFIED: file read]
- `.planning/phases/01-application-foundation-and-design-shell/01-UI-SPEC.md`
  — approved UI contract and surface mapping. [VERIFIED: file read]
- `.planning/REQUIREMENTS.md` — FOUND-01 through FOUND-06. [VERIFIED: file read]
- `.planning/ROADMAP.md` — Phase 1 goal and success criteria. [VERIFIED: file read]
- `.planning/PROJECT.md` and `AGENTS.md` — project constraints and stack
  decisions. [VERIFIED: file read]
- `DESIGN.md` — Luminous Academy visual rules. [VERIFIED: file read]
- Stitch project `5322129002350954765` — project title, Lexend theme, named
  colors, and screen instance labels. [VERIFIED: Stitch tool]
- npm registry checks on 2026-05-04 — package versions and publish dates.
  [VERIFIED: npm registry]
- Context7 `/vercel/next.js` — Next.js 16 Cache Components/PPR/layout snippets.
  [VERIFIED: Context7 CLI]
- Next.js official docs:
  - `https://nextjs.org/docs/app/getting-started/installation`
  - `https://nextjs.org/docs/app/getting-started/caching`
  - `https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents`
  - `https://nextjs.org/docs/app/api-reference/file-conventions/route-groups`
  - `https://nextjs.org/docs/app/api-reference/file-conventions/layout`
  - `https://nextjs.org/docs/app/getting-started/fonts`
- Tailwind CSS official docs:
  - `https://tailwindcss.com/docs/installation/framework-guides/nextjs`
  - `https://tailwindcss.com/docs/theme`
  - `https://tailwindcss.com/docs/functions-and-directives`

### Secondary (MEDIUM confidence)

- `.planning/research/SUMMARY.md` — project-level synthesis. [VERIFIED: file read]

### Tertiary (LOW confidence)

- None. [VERIFIED: research notes]

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — versions were verified through npm registry and
  official docs. [VERIFIED: npm registry] [CITED:
  https://nextjs.org/docs/app/getting-started/installation]
- Architecture: HIGH — route groups, layouts, Cache Components, and Suspense
  behavior are documented in official Next.js docs, and phase boundaries are
  locked in CONTEXT.md. [CITED:
  https://nextjs.org/docs/app/api-reference/file-conventions/route-groups]
  [VERIFIED: 01-CONTEXT.md]
- Design implementation: HIGH — UI-SPEC, DESIGN.md, and Stitch project all agree
  on Lexend, Simplified Chinese, no-line tonal surfaces, glass navigation, and
  gradient CTAs. [VERIFIED: 01-UI-SPEC.md] [VERIFIED: DESIGN.md] [VERIFIED:
  Stitch project 5322129002350954765]
- Pitfalls: HIGH — risks are derived from official Next.js/Tailwind docs and
  locked project constraints. [CITED: https://nextjs.org/docs/app/getting-started/caching]
  [CITED: https://tailwindcss.com/docs/theme]

**Research date:** 2026-05-04  
**Valid until:** 2026-06-03 for stack versions and scaffold commands; re-check
npm and official docs before execution because Next.js, React, and Tailwind are
fast-moving. [VERIFIED: npm registry]
