<!-- GSD:project-start source:PROJECT.md -->
## Project

**OpenLearn Next**

OpenLearn Next 是一个面向未来教育的 AI 原生开源操作系统，核心是基于步骤的课堂流程引擎、AI 多 Agent 协作平台和开放插件生态。它让教师把课堂拆成导入、讲授、互动、练习、总结等可编排原子步骤，并为教师配备可协同产出教学包的 AI 团队。

系统面向学校、教师、学生、家长、开发者和 AI Agent，首发聚焦可运行的课堂编排与学习闭环，而不是一次性铺满完整教育 SaaS。

**Core Value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。

### Constraints

- **Tech stack**: 必须使用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite 首发 — 这是项目指定的基础技术路线。
- **Data access**: UI 组件禁止直连数据库，所有读写必须通过 DAL 和 Server Actions — 确保权限、DTO 清洗和未来扩展一致。
- **Runtime**: Node.js 20.9+ 为主，Edge Runtime 仅用于 SSE 实时同步 — 避免把复杂数据库鉴权放到边缘层。
- **Caching**: Next.js 16 必须显式缓存，写入后必须更新或失效 tag — 防止课堂进度和编辑器出现陈旧数据。
- **Database**: 首发只针对 SQLite，所有关联必须 cascade delete — 先降低部署复杂度，同时保证数据清理正确。
- **Realtime**: 课堂广播使用 SSE，支持 locked/unlocked — 满足教师强制跟随和学生自由浏览两种课堂模式。
- **Security**: 插件禁止 `eval()`、动态执行第三方代码、直接访问 DB 或核心 API — 插件只能走声明式权限与受限动作。
- **Design**: 页面实现必须参考 Stitch 项目 `5322129002350954765` 与 `DESIGN.md` — 避免通用模板化 UI，保持既定教育产品视觉语言。
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Non-Negotiable Project Constraints
| Constraint | Decision | Implementation Baseline |
|------------|----------|-------------------------|
| Framework | Next.js 16 App Router + React 19.2 + Turbopack | Use `next@16.2.x`, `react@19.2.x`, `react-dom@19.2.x`; enable `cacheComponents: true`; keep App Router-only architecture. |
| Auth | Auth.js v5 + `@auth/drizzle-adapter` | Install `next-auth@beta` for v5, not stable v4; split edge-safe `auth.config.ts` from DB-backed `auth.ts`. |
| ORM/DB | Drizzle ORM + SQLite-first | Use Drizzle SQLite schema + migrations; start with local/libSQL-compatible SQLite; all relation FKs must include `onDelete: cascade`. |
| Data Access | DAL + Server Actions only | UI/RSC components never import DB client directly; DAL enforces authz, DTO shaping, cache tags. |
| Runtime | Node.js 20.9+ primary; Edge Runtime only for SSE | Keep DB/Auth adapter logic in Node runtime; Edge route handlers only broadcast/read short-lived classroom event streams. |
| Caching | Next.js 16 explicit caching | Use `"use cache"`, `cacheLife()`, `cacheTag()`, `updateTag()`/`revalidateTag()` deliberately; no implicit stale UI. |
| PPR | Static shell + streamed user/classroom state | Layouts, navigation, public course frames are cached/static; progress, auth, classroom state are Suspense-streamed. |
| Plugin System | Declarative JSON + Hook + Action + Core API | No `eval`, no remote arbitrary JS, no plugin DB/API direct access. |
| Design | Stitch project `5322129002350954765` + `DESIGN.md` | Lexend, Simplified Chinese, no 1px divider lines, tonal surfaces, glass/gradient CTA, premium K-12 aesthetic. |
## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Next.js | `16.2.x` | Full-stack App Router framework | Current docs show Next.js 16.2.4 with `proxy.ts`, Cache Components, PPR-by-default when `cacheComponents` is enabled. It directly matches project constraints and provides Server Actions, Route Handlers, streaming RSC, Turbopack. | HIGH |
| React / React DOM | `19.2.x` | UI/runtime primitives | Required by project. React 19.2 aligns with Next.js 16 and enables Suspense-based streaming/PPR patterns used by the classroom player. | HIGH |
| Turbopack | Bundled with Next 16 | Dev/build bundler | Use as default with Next.js 16. Avoid webpack customizations unless a dependency forces it; roadmap should treat Turbopack compatibility as a dependency acceptance criterion. | HIGH |
| TypeScript | `~5.9` or latest supported by Next 16 | Type safety | Needed for Drizzle schema inference, Zod DTOs, AI agent tools, plugin manifest validation. Pin to Next-supported range during phase setup. | HIGH |
| Node.js | `>=20.9`, prefer active LTS line available in deployment | Server runtime | Project requires Node 20.9+. Keep DB access, Auth.js adapter, PDF parsing, RAG ingestion, and agent orchestration on Node, not Edge. | HIGH |
| Auth.js / NextAuth | `next-auth@beta` v5 family | Authentication | Official Auth.js v5 docs still install via `next-auth@beta`; npm stable `next-auth` is v4.24.14, so stable package must be avoided for this project. | HIGH |
| `@auth/drizzle-adapter` | `1.11.x` | Auth.js DB adapter | Official adapter exists for Drizzle and supports SQLite schema integration. Use for `users`, `accounts`, `sessions`, `verificationTokens`, then extend with project roles/profile tables. | HIGH |
| Drizzle ORM | `0.45.x` now; evaluate Drizzle v1.0 when stable | Type-safe SQL ORM | Official docs show native SQLite support via `libsql` and `better-sqlite3`; Drizzle keeps SQL visible and makes future Postgres migration plausible without Prisma lock-in. | HIGH |
| Drizzle Kit | `0.31.x` | Migration generation/apply | Required for generated migrations and schema drift checks. Prefer `generate` + `migrate`; use `push` only for local experiments. | HIGH |
| SQLite/libSQL | `@libsql/client@0.17.x` | SQLite-first DB driver | Drizzle docs recommend libSQL for SQLite getting-started and Turso-compatible future deployment. Keeps v1 simple while retaining a cloud SQLite path. | HIGH |
| Qdrant | Server `1.14+`/Cloud; `@qdrant/js-client-rest@1.17.x` | Vector DB for RAG | Qdrant JS client supports collections, payload filtering, named vectors, payload indexes. Good fit for textbook/resource retrieval with school/course/role filters. | HIGH |
| AI SDK | npm `ai@6.0.x`; verify v7 before AI phase | LLM, agents, streaming, structured output | Official docs list AI SDK 6 as latest; Context7 exposes v7 docs with Agent API. For 2026 planning, design an adapter layer so agent code can move from v6 primitives to v7 Agent if v7 is stable. | MEDIUM |
| MCP TypeScript SDK | `@modelcontextprotocol/sdk@1.29.x` | External tool/context protocol | MCP 2025-11-25 spec defines OAuth-style authorization and tools/resources model. Use only from trusted server-side connectors, never expose raw MCP tools to plugins. | HIGH |
### Supporting Libraries
| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| Zod | `4.4.x` | Runtime validation and typed schemas | Validate Server Action inputs, plugin manifests, step payloads, submissions, AI structured outputs, MCP tool arguments. Use Zod as the canonical boundary validator. | HIGH |
| nuqs | `2.8.x` | Type-safe URL search params | Use for teacher editor filters, resource search, dashboards. In RSC, use `createSearchParamsCache` from `nuqs/server` and parse once at page root. | HIGH |
| Zustand | `5.0.x` | Client-only local UI state | Use only for ephemeral client state: editor panel state, drag hover, player UI mode. Do not store authoritative progress/submissions there. | MEDIUM |
| Tailwind CSS | `4.2.x` + `@tailwindcss/postcss@4.2.x` | Styling system | Best fit for implementing `DESIGN.md` tokens quickly. Use CSS theme variables for surface tiers, Lexend, gradients, glass blur; avoid default border-heavy component presets. | HIGH |
| `next/font/google` Lexend | Next built-in | Font loading | `DESIGN.md` requires Lexend exclusively. Use `next/font` to avoid runtime font layout issues. | HIGH |
| Radix UI primitives | latest per package | Accessible headless UI | Use for Dialog, Popover, Tabs, Select, Tooltip where needed. Style manually to respect no-line tonal design; avoid importing heavy styled UI kits. | MEDIUM |
| lucide-react | latest | Icons | Lightweight consistent icons for education dashboard/actions. Keep icon usage sparse and semantic. | MEDIUM |
| motion | `12.38.x` | Micro-interactions | Use for polished but restrained UI transitions in dashboard/player; avoid large animation orchestration in core classroom flows. | MEDIUM |
| `@dnd-kit/*` | `@dnd-kit/core@6.3.x` family | Drag-and-drop lesson step ordering | Use for teacher step editor. Pair with LexoRank so reordering does not cascade-update every row. | HIGH |
| `@dalet-oss/lexorank` | `1.1.x` | Rank string generation | npm search shows current maintained `@dalet-oss/lexorank` published 2026. Prefer it over stale `lexorank@1.0.5`; wrap it behind `lib/ranking` to allow replacement. | MEDIUM |
| pdf-parse or PDF.js server pipeline | verify during RAG phase | PDF textbook parsing | Needed for教材/资源中心 ingestion. Choose after testing Chinese textbook PDFs; keep parsing in async Node worker/server action, not Edge. | LOW |
| `@opentelemetry/*` + Sentry/OTel exporter | verify during observability phase | Tracing LLM, SSE, DAL operations | AI SDK docs mention telemetry; add once core flows exist to trace agent/tool latency and cache behavior. | MEDIUM |
| Vitest + Testing Library + Playwright | latest compatible | Test stack | Unit-test DAL/Zod/ranking; component-test editor/player; Playwright-test teacher-to-student classroom flow and SSE. | HIGH |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm | Package manager | Recommended for deterministic monorepo-friendly installs. If repository already uses npm, do not switch mid-phase without explicit decision. |
| ESLint + `eslint-config-next` | Linting | Enforce no DB imports in `app/**` UI components via custom ESLint rule or `no-restricted-imports`. |
| Prettier | Formatting | Keep code style uncontroversial. |
| Drizzle Studio | DB inspection | Use locally for auth/course/step schema debugging; never as production admin UI. |
| `tsx` | Running TS scripts | Use for seed/migration helper scripts. |
| Docker Compose | Local infra | Run Qdrant and optionally a local MCP mock service; SQLite remains file/libSQL. |
| Playwright | End-to-end testing | Required for verifying teacher editor → SSE classroom control → student PPR player. |
| Next experimental proxy testing utilities | Proxy matcher tests | Next docs expose `next/experimental/testing/server` utilities for `proxy.ts`; use to ensure protected paths are covered. |
## Installation
# Core app baseline
# Auth + database
# UI/state
# AI/RAG/MCP
# Testing/quality
## Baseline Configuration Patterns
### Next.js 16 Cache Components + PPR
- Use `"use cache"` only for public/course-frame/static-ish data: subject lists, published lesson shells, navigation, theme/plugin manifests after validation.
- Use `cacheTag('course:${id}')`, `cacheTag('lesson:${id}')`, `cacheTag('steps:${lessonId}')`, `cacheTag('progress:${lessonId}:${userId}')` in DAL read functions.
- In Server Actions, use `updateTag()` for read-your-writes after teacher edits, step reorder, student progress/submission writes. Use `revalidateTag()` from Route Handlers/background jobs where immediate same-request read is not required.
- Any component reading `cookies()`, `headers()`, request-specific auth/session, classroom lock state, or student progress must be under `<Suspense>` and should not be marked `"use cache"` unless runtime values are passed explicitly into a cached function.
- PPR target: static shell includes layout/sidebar/course outline; streamed regions include authenticated toolbar, `StepProgress`, live classroom state, submissions, AI generation status.
### `proxy.ts` Boundary
- `auth.config.ts`: providers/callbacks safe for Proxy/edge-like request boundary; no Drizzle adapter import.
- `auth.ts`: full Auth.js instance with `DrizzleAdapter(db)` for Node route handlers/server actions.
- `auth.edge.ts`: lazy Auth.js initialization using edge-safe config only for `proxy.ts`.
### DAL + Server Actions
### SQLite + Drizzle
- `drizzle.config.ts` with `dialect: 'sqlite'` and `dbCredentials.url = process.env.DB_FILE_NAME`.
- Local `.env`: `DB_FILE_NAME=file:local.db` for libSQL compatibility.
- Development bootstrap is migration-first: run `pnpm db:migrate` before seed scripts; do not rely on `drizzle-kit push` as the default path.
- Existing `local.db` files created before migration tracking must be bridged once by writing `__drizzle_migrations` metadata, then continue with normal migrations.
- Auth tables: `users`, `accounts`, `sessions`, `verificationTokens` matching Auth.js adapter expectations.
- Role extension: separate `userProfiles`/`memberships`/`schoolUsers` table rather than overloading Auth.js core tables too much.
- All foreign keys: `.references(() => parent.id, { onDelete: 'cascade' })`.
- Append-only submissions: `taskSubmissions(id, taskId, studentId, attemptNo, payloadJson, isLatest, createdAt)` with transaction that clears previous `isLatest` and inserts new latest.
- Step ordering: `lessonSteps.rank` string indexed with `(lessonId, rank)`; never use integer `position` that forces cascade updates.
### Edge SSE Classroom Broadcast
### AI Agents + RAG
- `server/ai/providers`: AI SDK provider abstraction, model registry, rate limits.
- `server/ai/agents`: `LessonAgent`, `HomeworkAgent`, `DataAgent`, `TutorAgent`, `ParentAgent` as typed orchestration modules, not magical autonomous code runners.
- `server/ai/tools`: Zod-validated tool definitions that call DAL/Core API only.
- `server/rag`: ingestion, chunking, embedding, Qdrant upsert/search.
- Qdrant payload filters must include `schoolId`, `courseId`, `resourceId`, `visibility`, `grade`, `subject`, and permission metadata.
### Safe Plugin + Theme System
- Plugin manifest JSON validated by Zod: `id`, `version`, `permissions`, `hooks`, `actions`, `themeTokens`, `uiSlots`.
- Hook execution: `Event -> Hook Registry -> Permission Check -> Action Dispatcher -> Core API/DAL`.
- Plugin actions are predefined verbs (`createResource`, `annotateLesson`, `sendNotification`, `addStepSuggestion`) with typed payloads.
- Theme extension is JSON tokens only: colors, typography mapping, radius, surface roles. It must be compiled into CSS variables and checked against `DESIGN.md` rules.
- No arbitrary JS, `eval`, dynamic import from remote URLs, direct DB access, direct MCP access, or provider API keys in plugin manifests.
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 16 App Router | Remix / TanStack Start / SvelteKit | Not for this project; Next.js 16 is fixed and uniquely aligned with requested Cache Components/PPR/proxy baseline. |
| Auth.js v5 | Clerk / Better Auth / custom auth | Clerk is faster for SaaS but reduces open-source/self-host data ownership. Better Auth is notable because Auth.js project joined it, but project explicitly requires Auth.js v5. Revisit only in a future auth rewrite. |
| Drizzle + SQLite | Prisma + PostgreSQL | Prisma/Postgres is mature but violates SQLite-first and adds heavier runtime/migration assumptions. Use Postgres only in later multi-database milestone. |
| libSQL-compatible SQLite | `better-sqlite3` only | `better-sqlite3` is excellent for single-node local/server deployments; libSQL keeps future Turso/remote SQLite path open. Keep adapter boundary so either driver can be selected. |
| SSE | WebSockets / Socket.IO | WebSockets are better for bidirectional high-frequency collaboration. For v1 classroom broadcast and locked/unlocked playback, SSE is simpler, HTTP-native, and matches constraint. |
| Qdrant | pgvector / Chroma / Pinecone | pgvector conflicts with SQLite-first for v1; Chroma is fine for prototypes but less ideal for production filtering; Pinecone is managed-only and less open/self-host friendly. |
| AI SDK | LangChain.js / direct provider SDKs | LangChain has broad integrations but adds complexity. Direct SDKs couple agents to providers. AI SDK fits Next.js streaming and multi-provider baseline. |
| JSON declarative plugins | Sandboxed JS/WASM plugins | Sandboxing may be future work, but v1 must prioritize school safety and predictable permissions. |
| Tailwind v4 | shadcn/ui default components | shadcn can be used selectively as copied Radix patterns, but default border-heavy cards/tables conflict with `DESIGN.md` no-line tonal design. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `next-auth` stable v4 | npm stable is v4.24.14; project requires Auth.js v5 behavior and APIs. | `next-auth@beta` and Auth.js v5 docs. |
| `middleware.ts` | Next.js 16 docs mark Middleware renamed/deprecated as Proxy. | `proxy.ts` with minimal matcher logic. |
| Relying on Proxy for authorization | Next docs warn Server Functions can skip Proxy coverage due to matcher/refactor changes. | Validate authz in every Server Action and DAL method. |
| Implicit/accidental caching | Next.js 16 Cache Components requires explicit cache handling; stale classroom progress is product-breaking. | `cacheComponents: true`, `"use cache"`, `cacheTag`, `updateTag`, Suspense for request data. |
| DB access in UI components | Breaks permission centralization and future DB portability. | DAL + Server Actions returning DTOs. |
| Edge DB/Auth adapter access | SQLite drivers and Drizzle adapter logic are Node-oriented; Edge should stay lightweight. | Node route/actions for DB; Edge only for SSE fanout/token checks. |
| Integer step positions | Drag reorder causes cascade updates and conflict risk. | LexoRank rank strings. |
| Mutable overwrite submissions | Loses student attempt history and auditability. | Append-only `TaskSubmissions` with `isLatest`. |
| Arbitrary plugin JS / `eval()` / remote dynamic import | Unsafe for K-12, impossible to permission-audit reliably. | Declarative JSON manifest + whitelisted Core API actions. |
| Plugin direct DB/MCP/provider key access | Bypasses ABAC/RBAC and leaks sensitive integrations. | `Event -> Hook -> Action -> Core API` with scoped permissions. |
| Border-heavy UI kits | Violates `DESIGN.md` no-line, premium tonal surface language. | Tailwind v4 tokens + Radix primitives styled with tonal layering. |
| Full LMS clone in v1 | Violates project scope and delays classroom workflow validation. | MCP/plugin integrations to Moodle/Notion/GitHub later. |
## Stack Patterns by Variant
- Use cached Server Components with `"use cache"`, `cacheLife('hours')`, `cacheTag('public-courses')`.
- Because this content benefits from static shells and does not require per-user freshness.
- Use Server Actions for writes, DAL for reads, `@dnd-kit` + LexoRank for ordering, `updateTag('lesson:${id}')` and `updateTag('steps:${lessonId}')` after mutations.
- Because teacher edits require read-your-writes and reorder stability.
- Use cached lesson shell + Suspense-streamed progress/submission/classroom state; persist progress through Server Actions; subscribe to SSE for live teacher control.
- Because the player needs instant navigation but fresh per-student state.
- Use AI SDK streaming and structured outputs; all tools call Core API/DAL; long ingestion/embedding jobs run in Node background route/action or future queue.
- Because provider portability and auditability matter more than raw agent autonomy.
- Use Zod-validated JSON manifests and permission-scoped action dispatch; compile theme JSON into CSS variables that respect `DESIGN.md`.
- Because K-12 plugin safety is a product requirement, not an implementation detail.
## Version Compatibility
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `next@16.2.x` | `react@19.2.x`, `react-dom@19.2.x` | Use App Router and Cache Components. Verify any UI library supports React 19 before adoption. |
| `next@16` Proxy | `proxy.ts` | `middleware.ts` is deprecated/renamed. Proxy defaults to Node runtime in current docs; do not set runtime in Proxy file. |
| Auth.js v5 (`next-auth@beta`) | `@auth/drizzle-adapter@1.11.x` | Split config to avoid importing non-edge DB adapter in proxy/edge path. |
| Drizzle ORM `0.45.x` | Drizzle Kit `0.31.x` | Drizzle docs advertise v1.0 beta/RC work; do not jump to v1.0 until phase planning verifies migration impact. |
| Drizzle SQLite | `@libsql/client@0.17.x` or `better-sqlite3@12.x` | Prefer libSQL for baseline; keep DB client factory isolated. |
| AI SDK `6.0.x` | `@ai-sdk/openai@3.0.x` | Context7 v7 agent docs are useful for design but npm latest is v6; phase must verify before using v7-only Agent API. |
| Qdrant JS `1.17.x` | Qdrant server/cloud current | Use payload indexes for school/course filters before production-scale RAG. |
| Tailwind `4.2.x` | `@tailwindcss/postcss@4.2.x` | Tailwind v4 Next install uses PostCSS plugin and `@import "tailwindcss"`; design tokens should live in CSS variables. |
| Zustand `5.0.x` | React 19 | Use for client state only; avoid RSC/server store leakage. |
| nuqs `2.8.x` | Next App Router async `searchParams` | Use `nuqs/server` in RSC; parse at route root before nested access. |
## Sources
- `.planning/PROJECT.md` — project constraints, active requirements, out-of-scope, fixed decisions. Confidence: HIGH.
- `DESIGN.md` — Lexend, no-line rule, surface hierarchy, glass/gradient UI requirements. Confidence: HIGH.
- Context7 `/vercel/next.js` — `cacheTag`, `updateTag`, `revalidateTag`, Server Actions cache invalidation. Confidence: HIGH.
- Official Next.js docs `https://nextjs.org/docs/app/getting-started/caching` — Cache Components, `cacheComponents: true`, `"use cache"`, Suspense streaming, PPR default with Cache Components; version 16.2.4, last updated 2026-04-10. Confidence: HIGH.
- Official Next.js docs `https://nextjs.org/docs/app/api-reference/file-conventions/proxy` — `proxy.ts`, middleware rename/deprecation, matcher, runtime, Server Function auth warning; version 16.2.4, last updated 2026-04-10. Confidence: HIGH.
- Context7 `/websites/authjs_dev` and official `https://authjs.dev/reference/nextjs` — Auth.js v5 install via `next-auth@beta`, universal `auth`, session strategy, edge-compatible split guidance. Confidence: HIGH.
- Context7 `/drizzle-team/drizzle-orm-docs` and official `https://orm.drizzle.team/docs/get-started/sqlite-new` — Drizzle SQLite support, libSQL/better-sqlite3 drivers, `drizzle.config.ts`, migrations. Confidence: HIGH.
- Context7 `/websites/ai-sdk_dev_v7` and official `https://sdk.vercel.ai/docs` — AI SDK agents/streaming/RAG examples; note npm latest is v6, so v7-specific APIs require re-verification. Confidence: MEDIUM.
- Context7 `/qdrant/qdrant-js` — upsert, search, filters, payload indexes, named vectors. Confidence: HIGH.
- Context7 `/websites/modelcontextprotocol_io_specification_2025-11-25` — MCP authorization and protected resource metadata patterns. Confidence: HIGH.
- Context7 `/47ng/nuqs` — `createSearchParamsCache` for Next App Router RSC. Confidence: HIGH.
- Official Tailwind docs `https://tailwindcss.com/docs/installation/framework-guides/nextjs` — Tailwind v4.2 Next.js install with `@tailwindcss/postcss`. Confidence: HIGH.
- npm registry checks on 2026-05-04 — current package versions listed above. Confidence: HIGH for observed package versions, LOW for future phase pinning without re-check.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **OpenLearn-Next** (7713 symbols, 14208 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
