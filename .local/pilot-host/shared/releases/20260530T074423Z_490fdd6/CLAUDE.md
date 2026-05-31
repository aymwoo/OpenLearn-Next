# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Next dev server with Turbopack
pnpm build            # Production build with Turbopack
pnpm typecheck        # tsc --noEmit
pnpm lint             # ESLint
pnpm test             # vitest (watch mode)
pnpm test run         # vitest single run (no watch)
npx vitest path/to/file.test.ts  # run a single test file
pnpm db:migrate       # apply migrations (bridges old pre-migration local.db)
pnpm db:bootstrap:dev # migrate + seed dev data
```

## Architecture Overview

Next.js 16 App Router, SQLite/libSQL + Drizzle ORM, Auth.js v5, React 19.2, Zod 4, Tailwind CSS 4.

**Data access is strictly layered — UI components never touch the database directly:**
```
UI (RSC/Client) → Server Actions (src/actions/) → DAL (src/lib/dal/) → Drizzle (src/db/)
```

All foreign keys use `onDelete: cascade`. Schema: `src/db/schema.ts`. Drizzle config: `drizzle.config.ts`.

Vitest config uses `@` path alias → `src/`. Tests match `src/**/*.{test,spec}.{ts,tsx}`. Coverage targets `src/actions/`.

## DTO + Zod Validation Pattern

DAL functions accept `unknown` inputs and validate with Zod schemas defined in `src/lib/dto/`. Never trust raw input in the DAL — always parse first:

```ts
// src/lib/dal/example.ts
export async function someOperation(rawInput: unknown) {
  const input = SomeInputSchema.parse(rawInput);
  // ... use typed input
}
```

DTO schemas combine validation and type inference: `export type Foo = z.infer<typeof FooSchema>`. Schemas used across layers (actions, API routes, DAL) live in `src/lib/dto/`.

## Auth Split Pattern

Auth.js is split into two files to keep the Proxy (edge-like) layer DB-free:

- `src/lib/auth/auth.config.ts` — providers, pages, `authorized` callback. Import-safe for `proxy.ts`. No Drizzle imports.
- `src/lib/auth/auth.ts` — full instance with `DrizzleAdapter`, `CredentialsProvider`, JWT strategy. Used by route handlers and Server Actions.
- `src/proxy.ts` — imports only `authConfig`, wraps it with `NextAuth(authConfig).auth`. Protects `/teacher`, `/student`, `/classroom`, `/admin`.

Login: teachers use email, students use studentNumber. The `authorizeCredentials` function uses a `roleIntent` parameter (`"teacher"` | `"student"`) to resolve the identity.

## Route Groups

Each top-level section uses a Next.js route group with its own layout:
- `(public)` — `/` landing
- `(teacher)` — `/teacher`, `/teacher/editor`, `/teacher/review`, `/teacher/students`, `/teacher/schedule`
- `(student)` — `/student`, `/student/player`
- `(classroom)` — `/classroom`
- `(library)` — `/courses`, `/resources`
- `(admin)` — `/admin`
- `(auth)` — `/login`, `/unauthorized`

## Caching (Next.js 16 Explicit)

`cacheComponents: true` in `next.config.ts`. Use `"use cache"` only on public/static content. Dynamic per-user data (progress, classroom state, submissions) must be under `<Suspense>` and must NOT use `"use cache"`.

Cache tags are centralized in `src/lib/cache-policy.ts`. After writes in Server Actions, call `updateTag()` or `revalidateTag()` so the writer sees their own changes.

## Features / Domain Modules

Domain logic that spans multiple layers lives in `src/features/`:

- **runtime-platform** — Plugin lifecycle, capability gating, governance audits, runtime sessions (bootstrap → ready → save → submit), host actions with permission checks. Contracts in `contracts/` define bridges (interaction envelopes), events, permissions, and runtime descriptors. Host-actions (`host-actions/`) enforce capability + permission + lifecycle guards. Seams (`seams/`) provide database, event-bus, and transport abstractions.
- **schedule** — Bell slots, week patterns, term calendars, teaching assignments, recurring entries, overrides, holiday calendars, import batches, reminder rules/dispatches. Has its own cache layer and DTOs under `shared/`.

## Plugin System & Governance

Plugins have a lifecycle state machine: `installed → enabled → mounted → ready` (and reversal states: `suspended`, `disabled`, `failed`). Each state transition is audited in `pluginLifecycleTransitions`.

Runtime and plugin actions are governed through capability + permission checks recorded in `governanceAudit`. Actions may be denied for: `not_allowlisted`, `capability_missing`, `permission_denied`, `lifecycle_blocked`, `school_mismatch`, `kill_switch`. Kill switches can disable plugins per-school.

MCP servers run alongside plugins with their own credential management and capability allowlisting.

## LexoRank Step Ordering

Steps in a lesson use LexoRank rank strings (`lessonSteps.rank`), not integer positions. Drag reorder must go through `src/lib/ranking/lexorank.ts`. Never use integer position columns for ordering — it causes cascade updates on every other row.

## Append-Only Submissions

`taskSubmissions` and `quizAttempts` are append-only. Each write: (1) clears `isLatest` on previous rows in a transaction, (2) inserts a new row with `isLatest: true`. `runtimeStepStates` and `runtimeStepSessions` also use this pattern. Preserves full attempt/state history.

## Classroom SSE

Real-time classroom broadcast at `src/app/api/classroom/[sessionId]/events/route.ts`. Uses a polling SSE pattern (fetch snapshot every 2s, emit `event: snapshot` on version change, `: keepalive` otherwise). Runs on Edge Runtime. Supports two modes: `locked` (teacher controls step) and `unlocked` (students navigate freely). Closes stream when session `status === "ended"`.

## Theme Layout

`src/lib/theme-layout/` resolves shell surfaces against a registry (`route-surface-registry.ts`). Theme tokens are stored in `themeTokenRegistries` per school, validated server-side, and resolved at layout render time. Use `src/lib/theme-cookie.ts` for SSR theme persistence.

## DB Migrations

```bash
npx drizzle-kit generate   # generate migration from schema changes
npx drizzle-kit migrate    # apply migrations
pnpm db:migrate            # repo default: bridge old local.db if needed, then apply migrations
pnpm db:bootstrap:dev      # run db:migrate first, then seed dev data
```

Use migration-first. `drizzle-kit push` is not part of the normal dev bootstrap flow.

For an older `local.db` created before migration tracking, `pnpm db:migrate` detects existing schema without `__drizzle_migrations`, writes the latest migration metadata once, then continues with normal `migrate` runs.

## Design System

See `DESIGN.md` for full spec. Key rules:
- Lexend font exclusively, Simplified Chinese UI
- No 1px solid borders for sectioning — use tonal surface layering instead (`surface`, `surface-container-low`, `surface-container-lowest`)
- Primary CTAs use gradient fill (`primary` → `primary_container`) at 135°
- Floating elements (nav, tooltips): glassmorphism with `backdrop-blur`
- Use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge) for all class composition
- Color tokens reference is Stitch project `5322129002350954765`

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **OpenLearn-Next** (10223 symbols, 18332 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/OpenLearn-Next/context` | Codebase overview, check index freshness |
| `gitnexus://repo/OpenLearn-Next/clusters` | All functional areas |
| `gitnexus://repo/OpenLearn-Next/processes` | All execution flows |
| `gitnexus://repo/OpenLearn-Next/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
