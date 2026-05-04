# Project Research Summary

**Project:** OpenLearn Next  
**Domain:** AI-native K-12 classroom workflow engine with teacher AI agents,
RAG, MCP integration, and safe plugin/theme extensions  
**Researched:** 2026-05-04  
**Confidence:** HIGH for the core classroom, Next.js, Auth.js, Drizzle, DAL,
PPR, and SSE baseline; MEDIUM for AI SDK versioning, RAG quality, MCP security,
and future plugin execution details.

## Executive Summary

OpenLearn Next is not a full LMS clone. It is a classroom workflow engine where
teachers author lessons as ordered executable steps, launch or assign those
steps, and students complete them through a guided player with progress,
submissions, feedback, and live classroom control. Experts should build this as
a modular monolith first: one Next.js 16 App Router application, one
SQLite-first Drizzle domain model, strict DAL authorization, and clear seams for
AI, RAG, MCP, and plugins.

The recommended v1 approach is to validate the smallest complete classroom loop:
auth and roles, class/course/enrollment models, step authoring, LexoRank ordering,
draft/publish, student PPR player, `StepProgress`, append-only submissions,
teacher review, and classroom sessions with Edge SSE for teacher-to-student
broadcast. AI/RAG/MCP/plugin capabilities must be staged behind safe interfaces
early, but full agent autonomy, robust PDF RAG, external connector matrices, and
marketplace-style plugins must wait until the core workflow is reliable.

The main risks are stale or leaked cached classroom data, over-trusting
`proxy.ts`, unsafe agent/plugin/MCP boundaries, SQLite write contention during
live class bursts, and a polished UI that fails under classroom pressure. The
mitigation is architectural discipline: explicit Next.js 16 cache tags and PPR
boundaries, DAL and Server Actions as the permission boundary, Node durability
with Edge-only SSE fan-out, versioned submission/runtime invariants, audit logs,
and UI implementation bound to Stitch project `5322129002350954765` plus
`DESIGN.md`.

## Key Findings

### Recommended Stack

The stack is fixed enough to start implementation without re-litigating the
foundation. Use Next.js 16 with React 19.2, `cacheComponents: true`, PPR,
Turbopack, Auth.js v5 through `next-auth@beta`, Drizzle ORM, SQLite/libSQL, Zod,
Tailwind v4, Lexend, and Edge Runtime only for classroom SSE. Keep all durable
data writes in Node runtime and all data access behind `server/dal`.

AI, RAG, MCP, and plugins need adapter layers rather than direct coupling. Qdrant
is the recommended vector store for RAG because it supports payload filtering and
indexes. AI SDK is the recommended LLM abstraction, but phase planning must verify
whether v6 or v7 APIs are stable. MCP must stay server-side and capability-scoped.
Plugins must be declaration-only JSON manifests with allow-listed Core API
actions.

**Core technologies:**

- **Next.js 16.2 + React 19.2:** App Router, Server Actions, Cache Components,
  PPR, Suspense streaming, and Turbopack match the project constraints.
- **Auth.js v5 + `@auth/drizzle-adapter`:** Provides the required authentication
  baseline, with edge-safe config split from DB-backed Node auth.
- **Drizzle + SQLite/libSQL:** Keeps v1 simple and self-hostable while preserving
  a future PostgreSQL migration seam through the DAL.
- **Zod:** Validates Server Action inputs, step payloads, submissions, plugin
  manifests, AI structured outputs, and MCP tool arguments.
- **Tailwind v4 + Lexend + Radix primitives:** Implements `DESIGN.md` without
  border-heavy UI kits.
- **LexoRank:** Supports efficient drag-and-drop step ordering without cascading
  row rewrites.
- **Qdrant:** Enables RAG with mandatory school/course/role payload filters.
- **AI SDK + MCP SDK:** Useful behind internal capability registries, not as raw
  application dependencies exposed to agents or plugins.

### Expected Features

The product must launch with a narrow but deep classroom loop. Table-stakes LMS
features matter only when they reinforce step-based classroom execution. The
competitive advantage is the executable lesson workflow, not breadth across
gradebook, SIS, social feed, mobile apps, and marketplace features.

**Must have for v1:**

- Auth.js sign-in with admin, teacher, and student roles.
- Resource-scoped RBAC/ABAC enforced in DAL and Server Actions.
- Class/course, enrollment, lesson, and step data models.
- Teacher and student dashboards focused on create, resume, publish, and launch.
- Step authoring for `content`, `task`, and `quiz`.
- LexoRank drag-and-drop ordering.
- Draft autosave and publish workflow.
- Student step player with cached shell and streamed runtime state.
- `StepProgress` tracking and resume behavior.
- Append-only `TaskSubmissions` with `isLatest`, attempts, and Zod payloads.
- Basic quiz capture, simple scoring, teacher review, and feedback.
- Classroom run sessions with active step, locked/unlocked modes, and Edge SSE.
- Minimal resource center for links/uploads and future RAG.
- Minimal AI/RAG contracts, feature flags, plugin manifest foundation, and theme
  token boundaries.

**Should have after validation:**

- LessonAgent beta that outputs editable step schemas.
- HomeworkAgent beta for task and quiz drafting.
- Deterministic analytics based on progress and submissions.
- Qdrant-backed RAG ingestion with citations and source inspection.
- One MCP connector prototype behind the capability registry.
- Declarative theme editor and built-in workflow templates.
- Developer plugin admin UI after manifests, permissions, hooks, and audit logs
  exist.

**Defer to v2+:**

- Full LMS replacement, full gradebook, SIS/OneRoster sync, native mobile apps,
  public class streams, collaborative editor, and plugin marketplace.
- Multi-agent teaching package generation, TutorAgent student chat, ParentAgent,
  predictive DataAgent, autonomous classroom control, and branching lesson graphs.
- Production-grade multimodal PDF textbook pipeline until KnowledgeSource,
  permissions, and retrieval evaluation are proven.

### Architecture Approach

Use a modular monolith with one-way dependencies: App Router UI calls Server
Actions and safe reads; Server Actions resolve actors, call DAL functions, update
cache tags, and publish optional events; DAL owns authorization, DTOs, Zod, and
Drizzle; domain services own invariants such as LexoRank, classroom runtime, and
append-only submissions. AI, MCP, RAG, and plugins terminate at capability/Core
API boundaries, never at raw database clients.

**Major components:**

1. **App Router route groups:** Public, teacher, student, classroom, and admin
   areas with separate PPR and layout behavior.
2. **`proxy.ts`:** Lightweight route-family protection only; no resource-level
   authorization.
3. **Auth module:** Auth.js v5 config, Drizzle adapter tables, role/session
   shaping, and scoped memberships.
4. **DAL:** The only database boundary for reads/writes, permissions, DTOs,
   cache tags, and validation.
5. **Domain services:** LexoRank moves, submission ledger, classroom runtime,
   cache tag taxonomy, and event publishing.
6. **Student PPR player:** Cached lesson shell with Suspense-streamed progress,
   lock mode, runtime state, and latest submissions.
7. **Classroom runtime:** SQLite durable state plus Edge SSE transport for active
   step and lock-mode broadcasts.
8. **AI/RAG/MCP gateway:** Capability-scoped tools, Qdrant filters, MCP audit
   logs, and teacher approval for high-impact outputs.
9. **Plugin/theme engine:** JSON manifests, hook registry, action allowlist,
   audit logs, and CSS-variable theme tokens.
10. **Design-system component layer:** Stitch project `5322129002350954765` and
    `DESIGN.md` are binding UI sources, including Lexend, Simplified Chinese,
    tonal surfaces, no 1px divider lines, glass/gradient CTAs, and classroom
    accessibility fallbacks.

### Critical Pitfalls

1. **Caching user/live data in static shells:** Cache only stable shells; stream
   progress, submissions, role controls, classroom state, and AI job status under
   Suspense with scoped cache tags and `updateTag()` after mutations.
2. **Using `proxy.ts` as authorization:** Keep proxy to session/redirect checks;
   every DAL and Server Action must validate actor, role, school, ownership,
   enrollment, delegation, and resource access.
3. **Realtime state without durability:** Persist classroom sessions, events,
   versions, lock mode, and current step in SQLite; Edge SSE sends snapshots and
   deltas only.
4. **Append-only submissions without invariants:** Use transactions, attempt
   numbers, task/step versions, latest-marker constraints, and concurrent submit
   tests.
5. **Unsafe AI/RAG/MCP/plugin boundaries:** Use scoped capabilities, mandatory
   Qdrant filters, MCP scope/SSRF/token controls, JSON plugin manifests, action
   allowlists, audit logs, and teacher approval gates.
6. **SQLite write contention in pilot classes:** Debounce autosave, write semantic
   progress only, add hot indexes, keep transactions short, move AI/plugin side
   effects out of critical paths, and run a 50-student burst test.
7. **Beautiful UI that fails live teaching:** Keep lock mode, current step,
   unsaved state, sync status, recovery actions, keyboard focus, and Chinese copy
   clarity visible in every classroom-critical screen.

## Implications for Roadmap

Based on the research, the roadmap must build from trust boundaries outward. Do
not start with AI agents, RAG depth, MCP connectors, or plugins before the core
classroom data model, DAL, cache policy, and step workflow are stable.

### Phase 1: Application foundation and design shell

**Rationale:** Every later feature depends on Next.js 16 App Router, explicit
caching, PPR boundaries, route groups, and the binding visual system.  
**Delivers:** Next.js 16.2, React 19.2, TypeScript, Turbopack, Tailwind v4,
Lexend, base route groups, design tokens, shared tonal components, and Stitch
screen mapping for project `5322129002350954765`.  
**Addresses:** Simplified Chinese K-12 UI, public home, teacher/student/classroom
shells, and no-line premium design.  
**Avoids:** PPR/cache drift, inconsistent design implementation, inaccessible
no-line UI, and duplicated route-specific components.

### Phase 2: Auth, roles, Drizzle schema, and DAL skeleton

**Rationale:** K-12 safety and every protected feature require identity,
membership, and resource authorization before product breadth.  
**Delivers:** Auth.js v5 with Drizzle adapter, SQLite/libSQL setup, core auth
tables, roles, memberships, `Actor`, `requirePermission()`, `proxy.ts`, DAL
module conventions, DTO mapping, `server-only`, and cache tag taxonomy.  
**Addresses:** Authentication, admin/teacher/student roles, scoped RBAC/ABAC,
safe Server Actions, and route-family protection.  
**Avoids:** Proxy-only authorization, Auth.js role drift, raw DB rows in UI,
unscoped cache tags, and future migration pain.

### Phase 3: Courses, lessons, steps, and teacher authoring

**Rationale:** AI and student execution must target the same validated manual
step schema. Manual authoring comes before generated content.  
**Delivers:** Schools/courses/classes/enrollments, lessons, `lesson_steps`, Zod
payload schemas for `content`, `task`, and `quiz`, teacher dashboard, editor
CRUD, draft autosave, publish workflow, and material attachments.  
**Addresses:** Course/lesson model, teacher dashboard, step-based lesson
authoring, draft/publish, basic materials, and table-stakes classroom workflow.  
**Avoids:** One-blob lesson storage, AI-specific parallel formats, drafts leaking
to students, and autosave write storms.

### Phase 4: LexoRank ordering and editor reliability

**Rationale:** Ordering is core to the workflow engine and must be reliable before
students consume lessons.  
**Delivers:** LexoRank utility, `(lessonId, rank)` indexes, drag-and-drop reorder,
version checks, rebalance plan, editor read-your-writes tests, and conflict
handling.  
**Addresses:** Drag-and-drop step ordering and usable teacher workflow.  
**Avoids:** Cascade row rewrites, ordering collisions, stale editor cache, and
simultaneous tab reorder bugs.

### Phase 5: Student PPR player, progress, submissions, and feedback

**Rationale:** The product is only credible when students can complete the
teacher-authored flow and teachers can review learning evidence.  
**Delivers:** Cached lesson shell, Suspense-streamed `StepProgress`, resume
logic, task submissions, quiz attempts, append-only ledger, latest marker,
teacher review surfaces, basic feedback, and progress/submission cache tags.  
**Addresses:** Student dashboard/player, progress tracking, task submissions,
quiz scoring, review, feedback, and K-12 auditability.  
**Avoids:** User data in cached shells, duplicate latest submissions, overwritten
attempts, task-version ambiguity, and excessive progress writes.

### Phase 6: Classroom runtime and Edge SSE

**Rationale:** Live teacher-led orchestration depends on stable lessons,
permissions, progress, and durable session state.  
**Delivers:** Classroom sessions, participants, current step, locked/unlocked
modes, session events, versioned Node Server Actions, Edge SSE route, reconnect
snapshot/delta behavior, and teacher live console.  
**Addresses:** Classroom run session, active step, lock modes, SSE broadcast,
teacher control console, and live class recovery.  
**Avoids:** Treating SSE as source of truth, late-join divergence, multi-tab
teacher conflicts, browser SSE connection traps, and unclear live-class UI.

### Phase 7: Resource center plus AI/RAG capability interfaces

**Rationale:** AI-native architecture needs safe contracts early, but production
RAG and agents must not block the v1 classroom loop.  
**Delivers:** Resource center, `KnowledgeSource` metadata, ingestion contracts,
Qdrant collection design, mandatory payload filters, agent run/audit tables,
provider abstraction, typed capabilities, feature flags, and optional LessonAgent
draft beta only if the workflow schema is stable.  
**Addresses:** Minimal resource center, AI/RAG interfaces, future LessonAgent,
HomeworkAgent, DataAgent, TutorAgent, and citations.  
**Avoids:** Cross-tenant retrieval, prompt-based filters, excessive AI agency,
ungrounded student tutoring, and provider lock-in.

### Phase 8: MCP integration boundary

**Rationale:** MCP is the integration path for external systems, but it is a high
risk trust boundary and must follow the capability/audit model.  
**Delivers:** MCP server registry, credential storage strategy, client manager,
tool/resource/prompt discovery, tool allowlists, audit logs, SSRF/token/scope
controls, and one stub or internal prototype connector.  
**Addresses:** External integration direction without building a full LMS clone.  
**Avoids:** Token passthrough, broad OAuth scopes, SSRF, local command execution,
and raw MCP tool exposure to agents/plugins.

### Phase 9: Plugin and theme extension system

**Rationale:** Extension boundaries must be safe before ecosystem features exist,
but plugin execution depends on mature Core API actions and domain events.  
**Delivers:** Zod plugin manifest schema, permissions, hook registry, action
allowlist, event broker, plugin audit logs, kill switches, declarative theme
tokens, and CSS variable compilation constrained by `DESIGN.md`.  
**Addresses:** Plugin/theme manifest foundation, safe hooks/actions, declarative
themes, and future step-type/plugin ecosystem.  
**Avoids:** Arbitrary JS, `eval`, remote dynamic imports, SQL snippets, direct
DB/MCP/provider-key access, and themes that break accessibility or no-line UI.

### Phase ordering rationale

- Foundation and design come first because every route must respect Next.js 16
  PPR/cache rules and the binding Stitch/`DESIGN.md` UI source.
- Auth, Drizzle, and DAL precede domain features because page-level protection is
  insufficient for K-12 resource safety.
- Teacher authoring and step schemas precede student player, AI, and plugins
  because all downstream systems must share the same validated step contracts.
- Progress and submissions precede classroom runtime because live sessions need
  meaningful student state and evidence.
- AI/RAG/MCP/plugin work is staged behind interfaces because these areas are
  powerful differentiators but also the highest security and quality risks.

### Research flags

Phases likely needing deeper research during planning:

- **Phase 7:** AI SDK v6 versus v7 stability, Chinese PDF/textbook parsing,
  Qdrant payload-index design, retrieval evaluation, and age-appropriate AI
  safety need phase-specific validation.
- **Phase 8:** MCP OAuth, token audience, SSRF controls, connector trust model,
  and target-system capability mapping need dedicated security research.
- **Phase 9:** Plugin permission UX, signing/trust metadata, action allowlists,
  audit schema, and theme-token constraints need threat modeling.
- **Phase 6:** SSE fan-out and deployment limits need environment-specific
  research before pilot-scale load testing.

Phases with standard patterns that can usually skip a separate research phase:

- **Phase 1:** Next.js 16, React 19.2, Tailwind v4, Lexend, and base route groups
  are well documented.
- **Phase 2:** Auth.js v5, Drizzle adapter, SQLite schema, and DAL conventions
  are clear enough to plan from current research.
- **Phase 3:** Course/lesson/step CRUD and draft/publish workflow are standard
  once the project-specific schema is defined.
- **Phase 4:** LexoRank needs careful tests, but the implementation pattern is
  known.
- **Phase 5:** PPR player, progress, and append-only ledgers are well specified
  by the research; focus planning on invariants and tests rather than more
  external research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js 16, React 19.2, Auth.js v5, Drizzle, SQLite, Tailwind, Qdrant, and MCP are backed by official docs or Context7. AI SDK version choice remains MEDIUM because v7 references may outpace npm latest. |
| Features | MEDIUM-HIGH | Table stakes are supported by LMS/classroom competitors and project constraints. Local teacher/student pilot data is still needed to tune workflow depth and UI pressure points. |
| Architecture | HIGH | DAL, Server Actions, explicit cache tags, PPR, Node durability plus Edge SSE, and modular monolith boundaries are well supported. Plugin and classroom product boundaries are greenfield and require tests. |
| Pitfalls | HIGH | Critical technical risks are backed by Next.js, Auth.js, Drizzle, Qdrant, MCP, SSE, and OWASP guidance. UX risks are MEDIUM because they need real classroom validation. |

**Overall confidence:** HIGH for v1 core implementation direction; MEDIUM for
post-v1 AI/RAG/MCP/plugin scope and quality.

### Gaps to Address

- **AI SDK versioning:** Verify npm/latest docs during Phase 7 before using
  v7-only Agent APIs. Keep provider and agent code behind an internal adapter.
- **Chinese textbook ingestion:** Test real PDF/textbook samples before promising
  production RAG. Start with metadata and KnowledgeSource contracts.
- **SQLite pilot capacity:** Run a 50-student burst test before classroom pilot;
  add indexes and reduce write frequency before changing databases.
- **SSE deployment behavior:** Confirm hosting limits, HTTP/2 behavior,
  connection caps, and pub/sub needs before live classroom launch.
- **Permission matrix:** Build a role/resource/action test matrix early and reuse
  it for AI, MCP, plugins, parent access, and future roles.
- **UI classroom validation:** Run teacher walkthroughs for editor, player, and
  console screens using Simplified Chinese copy, projector-like displays, small
  devices, keyboard navigation, and recovery scenarios.
- **Plugin trust model:** Decide whether v1 plugins are local/admin-installed
  only, signed, tenant-scoped, or registry-backed before third-party sharing.

## Sources

### Primary (HIGH confidence)

- `.planning/PROJECT.md` — fixed project constraints, scope, and decisions.
- `DESIGN.md` — Lexend, Simplified Chinese, no-line tonal UI, glass/gradient CTA,
  and Stitch-derived design system requirements.
- Stitch project `5322129002350954765` — binding UI source for public, teacher,
  student, classroom, resource, and course screens.
- Next.js official docs and Context7 — Cache Components, PPR, `cacheTag`,
  `updateTag`, `revalidateTag`, Server Actions, Route Handlers, and `proxy.ts`.
- Auth.js official docs and Context7 — v5 install via `next-auth@beta`, Drizzle
  adapter, callbacks, and edge-safe config split.
- Drizzle official docs and Context7 — SQLite/libSQL setup, migrations, indexes,
  constraints, and cascade references.
- Qdrant JS docs — collections, payload filters, named vectors, and payload
  indexes for RAG isolation.
- MCP official specification and security guidance — tools/resources/prompts,
  authorization, token, SSRF, and connector trust boundaries.

### Secondary (MEDIUM confidence)

- Google Classroom and Canvas documentation — expected roles, assignments,
  materials, submissions, feedback, analytics, and integration baselines.
- 1EdTech LTI documentation — external learning tool integration patterns and
  scope boundaries.
- OWASP Top 10 for LLM Applications — excessive agency, prompt injection,
  insecure output handling, sensitive disclosure, and insecure plugin design.
- MDN Server-Sent Events guide — SSE reconnection and browser behavior.

### Tertiary (LOW confidence)

- AI SDK v7 Context7 references — useful design direction, but npm latest must be
  rechecked during Phase 7.
- PDF parsing library choice — must be validated with Chinese K-12 textbook
  samples before committing to a production ingestion pipeline.
- Future plugin sandboxing references such as SES or ShadowRealm — relevant only
  after declaration-only plugins prove insufficient.

---
*Research completed: 2026-05-04*  
*Ready for roadmap: yes*
