# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Next dev server with Turbopack
pnpm build            # Production build with Turbopack
pnpm typecheck        # tsc --noEmit
pnpm lint             # ESLint
pnpm test             # vitest
pnpm test run         # vitest single run (no watch)
npx vitest path/to/file.test.ts  # run a single test file
```

## Architecture Overview

Next.js 16 App Router, SQLite/libSQL + Drizzle ORM, Auth.js v5, React 19.2.

**Data access is strictly layered — UI components never touch the database directly:**
```
UI (RSC/Client) → Server Actions (src/actions/) → DAL (src/lib/dal/) → Drizzle (src/db/)
```

All foreign keys use `onDelete: cascade`. The schema is in `src/db/schema.ts`.

## Auth Split Pattern

Auth.js is split into two files to keep the Proxy (edge-like) layer DB-free:

- `src/lib/auth/auth.config.ts` — providers, pages, `authorized` callback. Import-safe for `proxy.ts`. No Drizzle imports.
- `src/lib/auth/auth.ts` — full instance with `DrizzleAdapter`, `CredentialsProvider`, JWT strategy. Used by route handlers and Server Actions.
- `src/proxy.ts` — imports only `authConfig`, wraps it with `NextAuth(authConfig).auth`. Protects `/teacher`, `/student`, `/classroom`, `/admin`.

## Route Groups

Each top-level section uses a Next.js route group with its own layout:
- `(public)` — `/` landing
- `(teacher)` — `/teacher`, `/teacher/editor`, `/teacher/review`, `/teacher/students`
- `(student)` — `/student`, `/student/player`
- `(classroom)` — `/classroom`
- `(library)` — `/courses`, `/resources`
- `(admin)` — `/admin`
- `(auth)` — `/login`, `/unauthorized`

## Caching (Next.js 16 Explicit)

`cacheComponents: true` in `next.config.ts`. Use `"use cache"` only on public/static content. Dynamic per-user data (progress, classroom state, submissions) must be under `<Suspense>` and must NOT use `"use cache"`.

Cache tags are centralized in `src/lib/cache-policy.ts`. After writes in Server Actions, call `updateTag()` or `revalidateTag()` so the writer sees their own changes.

## LexoRank Step Ordering

Steps in a lesson use LexoRank rank strings (`lessonSteps.rank`), not integer positions. Drag reorder must go through `src/lib/ranking/lexorank.ts`. Never use integer position columns for ordering — it causes cascade updates on every other row.

## Append-Only Submissions

`taskSubmissions` and `quizAttempts` are append-only. Each write: (1) clears `isLatest` on previous rows in a transaction, (2) inserts a new row with `isLatest: true`. Preserves full attempt history.

## Classroom SSE

Real-time classroom broadcast at `src/app/api/classroom/[sessionId]/events/route.ts`. Runs on Edge Runtime. Supports two modes: `locked` (teacher controls step) and `unlocked` (students navigate freely).

## Design System

See `DESIGN.md` for full spec. Key rules:
- Lexend font exclusively, Simplified Chinese UI
- No 1px solid borders for sectioning — use tonal surface layering instead (`surface`, `surface-container-low`, `surface-container-lowest`)
- Primary CTAs use gradient fill (`primary` → `primary_container`) at 135°
- Floating elements (nav, tooltips): glassmorphism with `backdrop-blur`
- Use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge) for all class composition
- Color tokens reference is Stitch project `5322129002350954765`

## DB Migrations

```bash
npx drizzle-kit generate   # generate migration from schema changes
npx drizzle-kit migrate    # apply migrations
npx drizzle-kit push       # push schema directly (local dev only, never production)
```

Drizzle config at `drizzle.config.ts`. Schema: `src/db/schema.ts`, migrations: `./drizzle/`.
