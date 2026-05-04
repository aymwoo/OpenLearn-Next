# Phase 01: Application foundation and design shell - Pattern Map

**Mapped:** 2026-05-04
**Files analyzed:** 33 planned new files / file families
**Analogs found:** 0 / 33

## Greenfield finding

No application source files exist yet. Searches for `src/**/*`, `app/**/*`,
`components/**/*`, and `lib/**/*` returned no files. Pattern assignments below
therefore use the binding planning artifacts instead of existing source analogs:

- `.planning/phases/01-application-foundation-and-design-shell/01-CONTEXT.md`
- `.planning/phases/01-application-foundation-and-design-shell/01-RESEARCH.md`
- `.planning/phases/01-application-foundation-and-design-shell/01-UI-SPEC.md`
- `.planning/PROJECT.md`
- `DESIGN.md`
- `AGENTS.md`

Planner must treat these as first implementation patterns for the repository.
Do not invent legacy code conventions.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `package.json` | config | request-response | none; use `01-RESEARCH.md` stack lines 133-156 | no-analog |
| `next.config.ts` | config | request-response | none; use `01-RESEARCH.md` lines 272-291 | no-analog |
| `tsconfig.json` | config | transform | none; use Next scaffold defaults from `01-RESEARCH.md` lines 167-177 | no-analog |
| `postcss.config.mjs` | config | transform | none; use Tailwind v4 guidance from `01-RESEARCH.md` lines 143-144 | no-analog |
| `eslint.config.mjs` | config | transform | none; use Next scaffold defaults from `01-RESEARCH.md` lines 167-177 | no-analog |
| `src/app/layout.tsx` | component | request-response | none; use `01-RESEARCH.md` lines 311-334 | no-analog |
| `src/app/globals.css` | config | transform | none; use `01-RESEARCH.md` lines 336-363 and `DESIGN.md` lines 16-27 | no-analog |
| `src/app/(public)/page.tsx` | component | request-response | none; use UI-SPEC public home contract lines 117-120 | no-analog |
| `src/app/(teacher)/teacher/layout.tsx` | component | request-response | none; use route group pattern `01-RESEARCH.md` lines 293-309 | no-analog |
| `src/app/(teacher)/teacher/page.tsx` | component | request-response | none; use UI-SPEC teacher dashboard contract lines 117-121 | no-analog |
| `src/app/(teacher)/teacher/editor/page.tsx` | component | request-response | none; use UI-SPEC editor contract lines 122-123 | no-analog |
| `src/app/(student)/student/layout.tsx` | component | request-response | none; use route group pattern `01-RESEARCH.md` lines 293-309 | no-analog |
| `src/app/(student)/student/page.tsx` | component | request-response | none; use UI-SPEC student dashboard contract lines 121-123 | no-analog |
| `src/app/(student)/student/player/page.tsx` | component | request-response | none; use UI-SPEC player contract lines 123-124 | no-analog |
| `src/app/(classroom)/classroom/layout.tsx` | component | request-response | none; use route group pattern `01-RESEARCH.md` lines 293-309 | no-analog |
| `src/app/(classroom)/classroom/page.tsx` | component | request-response | none; use UI-SPEC classroom contract lines 124-125 | no-analog |
| `src/app/(library)/courses/page.tsx` | component | request-response | none; use UI-SPEC resource/course contract lines 125-126 | no-analog |
| `src/app/(library)/resources/page.tsx` | component | request-response | none; use UI-SPEC resource/course contract lines 125-126 | no-analog |
| `src/app/(admin)/admin/layout.tsx` | component | request-response | none; use route group pattern `01-RESEARCH.md` lines 293-309 | no-analog |
| `src/app/(admin)/admin/page.tsx` | component | request-response | none; use UI-SPEC admin contract line 126 | no-analog |
| `src/components/shell/route-shell.tsx` | component | request-response | none; use UI-SPEC interaction contracts lines 130-139 | no-analog |
| `src/components/shell/glass-nav.tsx` | component | event-driven | none; use `DESIGN.md` glass rule lines 25-27 | no-analog |
| `src/components/shell/role-preview.tsx` | component | event-driven | none; use `01-CONTEXT.md` lines 23-28 and `01-RESEARCH.md` lines 648-661 | no-analog |
| `src/components/shell/sidebar.tsx` | component | request-response | none; use `DESIGN.md` no-line surface rules lines 16-23 | no-analog |
| `src/components/surfaces/home-surface.tsx` | component | request-response | none; use UI-SPEC line 119 | no-analog |
| `src/components/surfaces/teacher-dashboard-surface.tsx` | component | request-response | none; use UI-SPEC line 120 | no-analog |
| `src/components/surfaces/lesson-editor-surface.tsx` | component | event-driven | none; use UI-SPEC line 122 | no-analog |
| `src/components/surfaces/student-dashboard-surface.tsx` | component | request-response | none; use UI-SPEC line 121 | no-analog |
| `src/components/surfaces/player-surface.tsx` | component | request-response | none; use UI-SPEC line 123 | no-analog |
| `src/components/surfaces/classroom-console-surface.tsx` | component | event-driven | none; use UI-SPEC line 124 | no-analog |
| `src/components/surfaces/library-surface.tsx` | component | request-response | none; use UI-SPEC line 125 | no-analog |
| `src/components/surfaces/admin-surface.tsx` | component | request-response | none; use UI-SPEC line 126 | no-analog |
| `src/components/ui/button.tsx` | component | event-driven | none; use `01-RESEARCH.md` lines 506-527 and `DESIGN.md` lines 64-68 | no-analog |
| `src/components/ui/card.tsx` | component | request-response | none; use `DESIGN.md` lines 69-72 | no-analog |
| `src/components/ui/badge.tsx` | component | request-response | none; use UI-SPEC color/copy lines 77-83 | no-analog |
| `src/components/ui/skeleton.tsx` | component | request-response | none; use `01-RESEARCH.md` lines 529-552 and UI-SPEC line 137 | no-analog |
| `src/lib/demo-data.ts` | utility | transform | none; use `01-CONTEXT.md` lines 30-35 and `01-RESEARCH.md` lines 474-484 | no-analog |
| `src/lib/navigation.ts` | utility | transform | none; use UI-SPEC copy line 102 and `01-RESEARCH.md` lines 251-254 | no-analog |
| `src/lib/cache-policy.ts` | utility | transform | none; use `01-RESEARCH.md` lines 554-567 | no-analog |
| `src/lib/utils.ts` | utility | transform | none; use `01-RESEARCH.md` lines 494-504 | no-analog |

## Pattern Assignments

### `package.json` (config, request-response)

**Analog:** No existing source analog. Use official Next.js scaffold and phase
research constraints.

**Stack pattern** (`01-RESEARCH.md` lines 133-156):

```text
next 16.2.4, react 19.2.5, react-dom 19.2.5, typescript 6.0.3,
tailwindcss 4.2.4, @tailwindcss/postcss 4.2.4, lucide-react,
@radix-ui/react-slot, clsx, tailwind-merge.
```

**Install command pattern** (`01-RESEARCH.md` lines 167-173):

```bash
pnpm create next-app@latest . --typescript --eslint --app --src-dir --import-alias "@/*"
pnpm add lucide-react @radix-ui/react-slot clsx tailwind-merge
pnpm add -D vitest @testing-library/react playwright
```

**Constraint:** If scaffolding in place risks overwriting `.planning`,
`DESIGN.md`, or `AGENTS.md`, use a temporary scaffold and copy files in
(`01-RESEARCH.md` lines 175-177).

---

### `next.config.ts` (config, request-response)

**Analog:** No existing source analog. Use Next.js 16 Cache Components contract.

**Core config pattern** (`01-RESEARCH.md` lines 272-291):

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
}

export default nextConfig
```

**Error-prevention pattern** (`01-RESEARCH.md` lines 421-437): keep Phase 1
data deterministic and avoid `cookies()`, `headers()`, `Date.now()`, random IDs,
or uncached fetches in layouts unless isolated behind localized Suspense.

---

### `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs` (config, transform)

**Analog:** No existing source analog. Use create-next-app defaults.

**Scaffold pattern** (`01-RESEARCH.md` lines 167-177): start from App Router,
TypeScript, ESLint, Tailwind, `src/`, and `@/*` alias defaults. Preserve
planning files during scaffold.

**Tailwind v4 pattern** (`01-RESEARCH.md` lines 439-455): do not plan around a
Tailwind v3 JavaScript-first config. Use CSS-first `@import` and `@theme`.

---

### `src/app/layout.tsx` (component, request-response)

**Analog:** No existing source analog. Use root App Router layout and Lexend
pattern.

**Imports and font pattern** (`01-RESEARCH.md` lines 311-334):

```tsx
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

**Auth/data pattern:** Do not add auth gates in Phase 1. Public demo navigation
into teacher, student, classroom, and admin shells is required
(`01-CONTEXT.md` lines 23-28).

---

### `src/app/globals.css` and optional `src/styles/tokens.css` (config, transform)

**Analog:** No existing source analog. Use Tailwind v4 CSS-first tokens.

**Imports and token pattern** (`01-RESEARCH.md` lines 336-363):

```css
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

**No-line visual rule** (`DESIGN.md` lines 16-23): use tonal surface shifts for
separation; do not use 1px borders for sectioning.

---

### App route pages and route group layouts (component, request-response)

Applies to:

- `src/app/(public)/page.tsx`
- `src/app/(teacher)/teacher/layout.tsx`
- `src/app/(teacher)/teacher/page.tsx`
- `src/app/(teacher)/teacher/editor/page.tsx`
- `src/app/(student)/student/layout.tsx`
- `src/app/(student)/student/page.tsx`
- `src/app/(student)/student/player/page.tsx`
- `src/app/(classroom)/classroom/layout.tsx`
- `src/app/(classroom)/classroom/page.tsx`
- `src/app/(library)/courses/page.tsx`
- `src/app/(library)/resources/page.tsx`
- `src/app/(admin)/admin/layout.tsx`
- `src/app/(admin)/admin/page.tsx`

**Analog:** No existing source analog. Use App Router route groups.

**Route group pattern** (`01-RESEARCH.md` lines 293-309):

```text
src/app/(teacher)/teacher/layout.tsx
src/app/(teacher)/teacher/page.tsx
src/app/(teacher)/teacher/editor/page.tsx
```

**URL rule** (`01-RESEARCH.md` lines 251-254): route groups organize files and
do not appear in URLs. Expected URLs include `/teacher`, `/student`,
`/classroom`, `/courses`, `/resources`, and `/admin`.

**Surface contracts** (`01-UI-SPEC.md` lines 117-126):

```text
Public home: one-screen refined landing shell with glass top navigation and CTA.
Teacher dashboard: desktop-first workspace with tonal sidebar and action cards.
Editor shell: three-zone lesson outline, central canvas, and right settings.
Student player: step navigation, content focus, progress/status region.
Classroom console: current step, lock/unlock visual, participants, recovery zone.
Resource/course areas: card-based tonal libraries with filters/search shells.
Admin shell: minimal low-emphasis route proof point and safe empty state.
```

---

### `src/components/shell/*` (component, request-response / event-driven)

Applies to:

- `src/components/shell/route-shell.tsx`
- `src/components/shell/glass-nav.tsx`
- `src/components/shell/role-preview.tsx`
- `src/components/shell/sidebar.tsx`

**Analog:** No existing source analog. Use UI-SPEC interaction contracts.

**Navigation and responsive pattern** (`01-UI-SPEC.md` lines 130-139):

```text
Active route uses a rounded-full tonal pill with primary accent text or gradient
highlight. Mobile uses top glass navigation plus overflow behavior while keeping
44px touch targets. Loading and future PPR regions use localized tonal skeletons.
```

**Glass pattern** (`DESIGN.md` lines 25-27):

```text
Floating navigation uses surface colors at 80% opacity with backdrop-blur of
12px-20px. Primary CTAs and hero elements use a 135-degree gradient.
```

**Role preview security pattern** (`01-CONTEXT.md` lines 23-28;
`01-RESEARCH.md` lines 648-661): role preview changes static presentation only;
it must not imply real session/auth behavior.

---

### `src/components/surfaces/*` (component, request-response / event-driven)

Applies to:

- `src/components/surfaces/home-surface.tsx`
- `src/components/surfaces/teacher-dashboard-surface.tsx`
- `src/components/surfaces/lesson-editor-surface.tsx`
- `src/components/surfaces/student-dashboard-surface.tsx`
- `src/components/surfaces/player-surface.tsx`
- `src/components/surfaces/classroom-console-surface.tsx`
- `src/components/surfaces/library-surface.tsx`
- `src/components/surfaces/admin-surface.tsx`

**Analog:** No existing source analog. Use UI-SPEC surface contracts and static
DTO-like demo data.

**Static data boundary pattern** (`01-RESEARCH.md` lines 474-484): keep demo
lesson, route navigation, cards, steps, resources, and participants in typed
constants under `src/lib/demo-data.ts`; avoid scattering repeated Chinese labels
inside JSX.

**Demo content pattern** (`01-CONTEXT.md` lines 30-35): use 信息科技 as the main
context, programming basics for middle school students, and a lesson flow with
导入, 讲授, 练习, and 总结.

**Mobile complexity pattern** (`01-CONTEXT.md` lines 37-42): prioritize homepage
and dashboard quality on mobile; editor and classroom console should remain
readable and state that desktop is recommended for editing/control.

---

### `src/components/ui/*` (component, request-response / event-driven)

Applies to:

- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/skeleton.tsx`

**Analog:** No existing source analog. Use DESIGN.md component rules and
research examples.

**Button imports and primary CTA pattern** (`01-RESEARCH.md` lines 506-527):

```tsx
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

**Card/list pattern** (`DESIGN.md` lines 69-72): cards use
`surface-container-lowest` on top of tonal backgrounds; lists avoid divider
lines and rely on whitespace or tonal hover.

**Skeleton pattern** (`01-RESEARCH.md` lines 529-552): use localized tonal
skeletons inside Suspense, not full-page spinner-only waits.

---

### `src/lib/utils.ts` (utility, transform)

**Analog:** No existing source analog. Use `clsx` + `tailwind-merge` helper.

**Imports and core pattern** (`01-RESEARCH.md` lines 494-504):

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

### `src/lib/demo-data.ts` (utility, transform)

**Analog:** No existing source analog. Use typed static constants shaped like
future DTOs.

**Core pattern** (`01-CONTEXT.md` lines 30-35; `01-RESEARCH.md` lines 474-484):

```text
Define typed constants for teacher dashboard cards, lesson outline, lesson
steps, resource cards, course cards, classroom participants, and student
progress. Main scenario: 初中信息科技 / 编程基础 with 导入, 讲授, 练习, 总结.
```

**Validation pattern:** No Zod or persistence is required in Phase 1; keep
TypeScript types close to the constants so later DAL DTO replacement is local.

---

### `src/lib/navigation.ts` (utility, transform)

**Analog:** No existing source analog. Use route-shell labels from UI-SPEC.

**Navigation labels** (`01-UI-SPEC.md` line 102):

```text
首页, 教师工作台, 学生空间, 课堂运行, 课程中心, 资源中心, 管理后台
```

**Route group URL pattern** (`01-RESEARCH.md` lines 251-254):

```text
/, /teacher, /student, /classroom, /courses, /resources, /admin
```

---

### `src/lib/cache-policy.ts` (utility, transform)

**Analog:** No existing source analog. Use explicit cache taxonomy from research.

**Core pattern** (`01-RESEARCH.md` lines 554-567):

```ts
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

**PPR rule** (`.planning/PROJECT.md` lines 50-52): static navigation, layout,
and public course frames can be cached; learning progress and classroom state
belong in future `<Suspense>` boundaries.

## Shared Patterns

### Authentication and authorization

**Source:** `01-CONTEXT.md` lines 23-28; `01-RESEARCH.md` lines 648-661  
**Apply to:** All route shells and role preview UI

```text
Phase 1 routes stay publicly reachable. Do not add fake auth gates. The role
preview switcher is presentational only and must not imply real session state.
```

### Data access boundary

**Source:** `.planning/PROJECT.md` lines 62-71; `01-RESEARCH.md` lines 381-382  
**Apply to:** All `src/app/**`, `src/components/**`, and `src/lib/demo-data.ts`

```text
Do not import database clients, DAL modules, or Server Actions in Phase 1 UI.
Static data is local and deterministic; future reads/writes must go through DAL
and Server Actions.
```

### Cache and PPR boundary

**Source:** `01-RESEARCH.md` lines 90-95, 272-291, 421-437  
**Apply to:** `next.config.ts`, layouts, shell components, `src/lib/cache-policy.ts`

```text
Enable cacheComponents immediately. Keep stable shell data static/cached and
document future user/live areas as localized Suspense islands. Avoid runtime APIs
in layouts without Suspense.
```

### Visual system

**Source:** `DESIGN.md` lines 16-27, 31-39, 43-58; `01-UI-SPEC.md` lines 17-30  
**Apply to:** All components and pages

```text
Use Lexend exclusively, Simplified Chinese UI, tonal surface layering, no 1px
section dividers, glass floating surfaces, primary blue gradient CTAs, and soft
ambient shadows. Use Growth Green only for success or achievement.
```

### Copywriting

**Source:** `01-UI-SPEC.md` lines 88-103; `01-CONTEXT.md` lines 18-35  
**Apply to:** All user-visible UI

```text
Use Simplified Chinese. Primary CTA is 开始备课. Avoid user-facing words such as
mock, seed, database, or placeholder. Demo copy should feel like realistic
teacher preparation around 初中信息科技 / 编程基础.
```

### Component composition

**Source:** `01-RESEARCH.md` lines 384-399; `01-UI-SPEC.md` lines 21-24  
**Apply to:** `src/components/ui/**`, `src/components/shell/**`

```text
Hand-author visual components. Use lucide-react for sparse semantic icons and
Radix primitives only when accessibility behavior is needed. Do not initialize
shadcn or import third-party registry UI blocks.
```

## No Analog Found

Every planned application file lacks an existing source analog because this is a
greenfield repository.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `package.json` and framework configs | config | request-response / transform | No Next.js app scaffold exists yet |
| `src/app/**` | component | request-response | No App Router files exist yet |
| `src/components/**` | component | request-response / event-driven | No shared component layer exists yet |
| `src/lib/**` | utility | transform | No utility or static data modules exist yet |

## Metadata

**Analog search scope:** `src/**/*`, `app/**/*`, `components/**/*`, `lib/**/*`,
root `*.{ts,tsx,js,jsx,json,css}`  
**Source files scanned:** 0 application source files  
**Planning artifacts read:** `AGENTS.md`, `01-CONTEXT.md`, `01-RESEARCH.md`,
`01-UI-SPEC.md`, `.planning/PROJECT.md`, `DESIGN.md`  
**Project-local skills:** none found under `.claude/skills/` or `.agents/skills/`  
**Pattern extraction date:** 2026-05-04
