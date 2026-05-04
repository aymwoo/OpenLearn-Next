# Architecture Research

**Domain:** AI-native K-12 classroom workflow engine, teacher AI multi-agent
platform, RAG ecosystem, and safe extension system  
**Researched:** 2026-05-04  
**Confidence:** HIGH for Next.js/Auth.js/Drizzle/MCP/PPR/SSE primitives;
MEDIUM for product-specific classroom and plugin boundaries because they are
greenfield design recommendations.

## Standard Architecture

OpenLearn Next must be a modular monolith first, not a microservice system. The
core value is a reliable classroom workflow loop: teachers author lessons as
ordered steps, students play those steps with progress tracking, and classroom
runtime broadcasts teacher-controlled state. The architecture must keep this
loop inside one Next.js 16 App Router application with strict boundaries around
data access, authorization, AI tools, and extensions.

### System overview

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                         Next.js 16 App Router UI                           │
│                                                                            │
│  Public Home     Teacher Studio     Student Player     Classroom Console   │
│  /               /teacher/*        /learn/*           /classroom/*         │
│  Stitch: Home    Stitch: Teacher   Stitch: Student    Stitch: Runtime      │
└──────────────┬───────────────┬───────────────┬───────────────┬────────────┘
               │               │               │               │
               ▼               ▼               ▼               ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    Server Actions and Route Handlers                       │
│                                                                            │
│  Mutations       Draft autosave       SSE Edge route       AI/MCP routes    │
│  use server      updateTag()          ReadableStream       node runtime     │
└───────────────────────────────┬────────────────────────────────────────────┘
                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                 DAL: authorization, DTOs, cache tags, Zod                  │
│                                                                            │
│  authz.ts   lessons.dal.ts   progress.dal.ts   submissions.dal.ts          │
│  agents.dal.ts   rag.dal.ts   plugins.dal.ts   classroom.dal.ts            │
└───────────────────────────────┬────────────────────────────────────────────┘
                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         Domain service layer                               │
│                                                                            │
│ Lesson workflow │ LexoRank │ Classroom runtime │ Submission ledger          │
│ AI orchestration │ RAG indexing/query │ Plugin hook/action executor        │
└───────────────┬──────────────┬───────────────┬───────────────┬────────────┘
                ▼              ▼               ▼               ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         Persistence and external IO                        │
│                                                                            │
│ SQLite + Drizzle        Qdrant vector DB        MCP servers                │
│ Auth.js tables          object/document store   Moodle/GitHub/Notion/etc.  │
└────────────────────────────────────────────────────────────────────────────┘
```

The arrows are intentionally one-way. UI code can call Server Actions and safe
read functions, but it must never import Drizzle tables or database clients.
Extensions can react to events and request actions, but they must never call the
database or private DAL functions directly.

### Component responsibilities

| Component | Responsibility | Typical implementation |
|-----------|----------------|------------------------|
| `app/` routes | Own route composition, layouts, PPR boundaries, and Stitch-aligned UI areas. | Next.js App Router route groups such as `(public)`, `(teacher)`, `(student)`, `(classroom)`, and `(admin)`. |
| `proxy.ts` | Do cheap route protection only. It checks whether a session exists and redirects unauthenticated users. | Next.js 16 proxy matcher for protected route prefixes. Do not put resource-level authorization here. |
| Auth module | Own Auth.js config, role persistence, session shaping, and user identity. | `src/auth.ts`, `src/server/auth/roles.ts`, Auth.js Drizzle adapter tables. |
| DAL | Own database access, authorization checks, DTO shaping, Zod validation, and cache tags. | `src/server/dal/*.ts`; every function accepts an actor context or derives it through `auth()`. |
| Domain services | Own business invariants that span tables, such as LexoRank moves, append-only submissions, and classroom mode transitions. | `src/server/services/*` called only by DAL or Server Actions. |
| Drizzle schema | Own relational structure and constraints. | `src/server/db/schema/*.ts`, with all foreign keys using cascade delete where supported. |
| Lesson authoring | Own course, lesson, step, draft autosave, versioning, and drag ordering. | Server Actions plus `lessons.dal.ts`, `steps.dal.ts`, and LexoRank utility module. |
| Student player | Own read-only lesson shell, per-student progress, resume state, and submission creation. | PPR page with static shell and Suspense for progress, runtime state, and latest submission. |
| Classroom runtime | Own live session state and teacher broadcast. | Edge runtime SSE route for fan-out; Node runtime actions for durable state writes. |
| Submission ledger | Own append-only task attempts and latest-read optimization. | `task_submissions` with immutable rows and an `isLatest` marker updated transactionally. |
| AI agent gateway | Own agent contracts, tool registry, model-provider isolation, and audit logs. | `src/server/ai/agents/*`; each agent calls DAL/RAG/MCP tools through typed capabilities. |
| RAG subsystem | Own document ingestion, chunk metadata, embeddings, and retrieval filters. | SQLite metadata plus Qdrant collections and payload indexes. |
| MCP integration | Own external-tool connectivity and capability mapping. | MCP client manager with one client/session per server; tools/resources/prompts mapped into internal capabilities. |
| Plugin engine | Own declarative plugin registration, permissions, hooks, and safe action dispatch. | JSON manifests, Zod schemas, event bus, action allow-list, optional SES compartment later. |
| Theme engine | Own visual tokens and theme application. | JSON theme registry mapped to CSS variables and Tailwind tokens. |

## Recommended project structure

The project should use feature-oriented server modules with a strict `server/`
boundary. This keeps App Router routes thin while making authorization and data
shape rules testable outside React components.

```text
src/
├── app/
│   ├── (public)/
│   │   └── page.tsx
│   ├── (teacher)/teacher/
│   │   ├── page.tsx
│   │   └── lessons/[lessonId]/editor/page.tsx
│   ├── (student)/learn/[lessonId]/page.tsx
│   ├── (classroom)/classroom/[sessionId]/page.tsx
│   ├── api/
│   │   ├── classroom/[sessionId]/events/route.ts
│   │   ├── ai/[agent]/route.ts
│   │   └── mcp/[serverId]/route.ts
│   └── actions/
│       ├── lesson-actions.ts
│       ├── classroom-actions.ts
│       └── submission-actions.ts
├── auth.ts
├── proxy.ts
├── components/
│   ├── stitch/
│   ├── teacher/
│   ├── student/
│   └── classroom/
├── server/
│   ├── auth/
│   │   ├── roles.ts
│   │   ├── permissions.ts
│   │   └── actor.ts
│   ├── db/
│   │   ├── index.ts
│   │   └── schema/
│   │       ├── auth.ts
│   │       ├── learning.ts
│   │       ├── classroom.ts
│   │       ├── ai.ts
│   │       └── plugins.ts
│   ├── dal/
│   │   ├── lessons.dal.ts
│   │   ├── steps.dal.ts
│   │   ├── progress.dal.ts
│   │   ├── submissions.dal.ts
│   │   ├── classroom.dal.ts
│   │   ├── rag.dal.ts
│   │   └── plugins.dal.ts
│   ├── services/
│   │   ├── lexorank.ts
│   │   ├── classroom-runtime.ts
│   │   ├── submission-ledger.ts
│   │   └── cache-tags.ts
│   ├── ai/
│   │   ├── agents/
│   │   ├── tools/
│   │   ├── rag/
│   │   └── evals/
│   ├── mcp/
│   │   ├── client-manager.ts
│   │   └── capability-registry.ts
│   └── plugins/
│       ├── manifest.schema.ts
│       ├── hook-runner.ts
│       ├── action-registry.ts
│       └── sandbox.ts
├── stores/
│   ├── editor-store.ts
│   └── player-store.ts
└── lib/
    ├── zod.ts
    ├── ids.ts
    └── time.ts
```

### Structure rationale

- **`app/`:** Owns routing and rendering only. It can compose Server
  Components, Client Components, Server Actions, and Route Handlers, but it
  cannot own business rules.
- **`server/dal/`:** Is the mandatory gate for reads and writes. It centralizes
  `userId`, `role`, resource permission checks, DTO cleanup, and cache tagging.
- **`server/services/`:** Holds pure or mostly pure domain logic that the DAL
  orchestrates. This prevents ordering, ledger, and runtime rules from leaking
  into React components.
- **`server/db/schema/`:** Splits schema by domain while keeping one SQLite
  database. This supports a modular monolith and avoids early service splits.
- **`server/ai/` and `server/mcp/`:** Keep AI capabilities behind an internal
  tool interface. Agents receive capabilities, not raw database clients.
- **`server/plugins/`:** Keeps extension code below a permission gateway. Plugin
  execution must be event-driven and action-limited.
- **`components/stitch/`:** Preserves design-source mapping from Stitch screens
  into implementation areas without mixing generated layout decisions into
  server rules.

## Architectural patterns

These patterns define the core implementation discipline. They are more
important than individual library choices because they protect the classroom
runtime from stale data, permission leaks, and unsafe extension behavior.

### Pattern 1: DAL as the only database boundary

**What:** All database reads and writes go through DAL functions. Each DAL
function either derives the actor with `auth()` or receives a trusted `Actor`
object from a Server Action. It validates permissions, calls Drizzle, and
returns DTOs that contain only safe fields.

**When to use:** Use this for every route, Server Action, AI tool, MCP tool, and
plugin action that needs project data.

**Trade-offs:** This adds boilerplate, but it prevents UI components, agents,
and plugins from bypassing authorization. It also gives the future PostgreSQL
path one migration seam.

**Example:**

```typescript
export async function getEditableLesson(actor: Actor, lessonId: string) {
  await requirePermission(actor, 'lesson:update', { lessonId })

  const lesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: { steps: { orderBy: asc(lessonSteps.rank) } },
  })

  if (!lesson) return null
  return toLessonEditorDto(lesson)
}
```

### Pattern 2: Lightweight proxy, deep authorization in DAL

**What:** `proxy.ts` protects route families with session existence checks and
redirects. It does not determine whether a teacher can edit a specific lesson
or whether a parent can view a specific student.

**When to use:** Use proxy for `/teacher`, `/learn`, `/classroom`, `/admin`, and
API route families that must never be anonymous.

**Trade-offs:** Users can reach a page shell before a DAL call denies a specific
resource. That is acceptable because resource-level denial happens before data
is returned.

**Example:**

```typescript
export const config = {
  matcher: ['/teacher/:path*', '/learn/:path*', '/classroom/:path*'],
}

export async function proxy(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}
```

### Pattern 3: Explicit cache tags after every mutation

**What:** Server Actions update data through the DAL, then immediately expire
the relevant cache tags with `updateTag()` for read-your-writes behavior. Route
Handlers use `revalidateTag()` because `updateTag()` is only valid in Server
Actions.

**When to use:** Use this for lesson editing, autosave, step reorder, progress
update, classroom state changes, and submission creation.

**Trade-offs:** Cache tagging requires discipline. The payoff is predictable
freshness in the editor and player while still using PPR and cached shells.

**Example:**

```typescript
'use server'

export async function saveStep(input: SaveStepInput) {
  const actor = await requireActor()
  const result = await updateStepDraft(actor, input)

  updateTag(`lesson:${input.lessonId}`)
  updateTag(`lesson:${input.lessonId}:steps`)
  updateTag(`step:${input.stepId}`)

  return result
}
```

### Pattern 4: LexoRank for lesson step ordering

**What:** Each lesson step stores a string rank. Dragging a step computes a new
rank between its neighbors, so most reorders update one row instead of rewriting
every sibling.

**When to use:** Use this for `lesson_steps.rank`, resource ordering, classroom
activity queues, and plugin hook ordering if needed.

**Trade-offs:** LexoRank needs occasional rebalance when ranks become too dense.
Implement rebalance as a teacher-only maintenance operation inside a
transaction.

**Example:**

```typescript
export async function moveStep(actor: Actor, input: MoveStepInput) {
  await requirePermission(actor, 'lesson:update', { lessonId: input.lessonId })

  return db.transaction(async tx => {
    const neighbors = await getStepNeighbors(tx, input)
    const nextRank = rankBetween(neighbors.before?.rank, neighbors.after?.rank)

    await tx.update(lessonSteps)
      .set({ rank: nextRank, updatedAt: now() })
      .where(eq(lessonSteps.id, input.stepId))

    return { stepId: input.stepId, rank: nextRank }
  })
}
```

### Pattern 5: PPR static shell with dynamic student state

**What:** The student player renders a stable lesson frame as a static shell and
streams user-specific state through Suspense. The shell can include navigation,
lesson title, step list skeletons, and design surfaces. Progress, locked mode,
current classroom step, and latest submission are dynamic.

**When to use:** Use this for `/learn/[lessonId]`, public course pages, and
dashboard pages with personalized panels.

**Trade-offs:** PPR requires clean separation between cached lesson content and
per-user data. Mixing them in one component makes the whole page dynamic.

**Example:**

```tsx
export default async function StudentLessonPage({ params }) {
  const lessonShell = await getLessonShell(params.lessonId) // cached DTO

  return (
    <StudentPlayerShell lesson={lessonShell}>
      <Suspense fallback={<ProgressSkeleton />}>
        <StudentRuntimeState lessonId={params.lessonId} />
      </Suspense>
    </StudentPlayerShell>
  )
}
```

### Pattern 6: Edge SSE for broadcast, Node actions for durability

**What:** The SSE route runs at the Edge and streams classroom events. Durable
state changes, such as locking the class or advancing the current step, run in
Node Server Actions/DAL first, then publish a broadcast event.

**When to use:** Use this for classroom session state, live step changes,
teacher announcements, and lightweight presence updates.

**Trade-offs:** Edge routes must stay simple. Do not put SQLite writes, complex
permission checks, or AI calls inside the Edge SSE handler.

**Example:**

```typescript
export const runtime = 'edge'

export async function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribeToClassroom(request, event => {
        controller.enqueue(encodeSse(event))
      })
      request.signal.addEventListener('abort', unsubscribe)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
    },
  })
}
```

### Pattern 7: Append-only submissions with latest marker

**What:** Student task attempts are immutable rows. The latest attempt is found
through `isLatest = true`; when a new attempt is created, the previous latest
attempt for the same `(studentId, stepId)` is marked false in the same
transaction.

**When to use:** Use this for homework, classroom tasks, quiz attempts, rubric
reviews, and AI feedback snapshots.

**Trade-offs:** Reads are fast, and history is preserved. Writes need a
transaction and a unique or logical invariant to prevent two latest rows.

**Example:**

```typescript
await db.transaction(async tx => {
  await tx.update(taskSubmissions)
    .set({ isLatest: false })
    .where(and(
      eq(taskSubmissions.studentId, actor.userId),
      eq(taskSubmissions.stepId, input.stepId),
      eq(taskSubmissions.isLatest, true),
    ))

  await tx.insert(taskSubmissions).values({
    id: createId(),
    studentId: actor.userId,
    stepId: input.stepId,
    payload: validatedPayload,
    isLatest: true,
    createdAt: now(),
  })
})
```

### Pattern 8: Capability-based AI agents and MCP tools

**What:** Agents receive a scoped capability object, not global access. A
LessonAgent can read and draft lesson content; a DataAgent can query permitted
analytics; a ParentAgent can access only parent-visible summaries. MCP tools are
imported into the same capability registry after permission checks.

**When to use:** Use this for LessonAgent, HomeworkAgent, DataAgent,
TutorAgent, and ParentAgent.

**Trade-offs:** Capability wrappers add design work, but they prevent prompt
injection from becoming database or external-tool injection.

**Example:**

```typescript
const lessonAgent = createAgent({
  name: 'LessonAgent',
  capabilities: {
    readCurriculum: ragTools.searchCurriculum.scope(actor),
    draftSteps: lessonTools.proposeSteps.scope(actor),
    saveDraft: coreActions.saveLessonDraft.scope(actor),
  },
})
```

### Pattern 9: Event -> Hook -> Action -> Core API plugin model

**What:** Plugins declare metadata, permissions, hooks, and allowed actions in
JSON. Core code emits domain events. The hook runner checks whether a plugin can
observe the event and then dispatches only approved Core API actions.

**When to use:** Use this for theme extensions, custom step templates, exports,
notifications, analytics sinks, and LMS sync.

**Trade-offs:** This is less flexible than arbitrary JavaScript execution. That
is intentional for v1 because the project explicitly forbids arbitrary
third-party plugin code execution.

**Example:**

```json
{
  "id": "openlearn.moodle-sync",
  "permissions": ["lesson:read", "submission:read", "mcp:moodle:write"],
  "hooks": {
    "submission.created": [
      { "action": "mcp.moodle.syncSubmission", "when": "course.linked" }
    ]
  }
}
```

## Data flow

Data must move from user intent to Server Action to DAL to domain service to
database, then back as a sanitized DTO. Runtime notifications and AI tools are
secondary flows around that core path; they must not bypass it.

### Request flow

```text
[User action in App Router UI]
    ↓
[Server Action or Route Handler]
    ↓
[Actor resolution through Auth.js]
    ↓
[DAL permission check: RBAC + ABAC]
    ↓
[Domain service: ordering, runtime, ledger, AI, or plugin rule]
    ↓
[Drizzle SQLite / Qdrant / MCP external service]
    ↓
[DTO shaping + cache tag update/revalidation]
    ↓
[RSC stream, client state update, or SSE event]
```

### State management

```text
[SQLite durable state]
    ↓ cached DTOs through DAL
[Server Components + Suspense]
    ↓ hydrate interactive islands
[Zustand local UI state]
    ↓ server mutation
[Server Actions]
    ↓ updateTag/revalidateTag + optional SSE publish
[Fresh Server Component render or runtime event]
```

Zustand is only for local interaction state, such as unsaved editor UI state,
drag state, optimistic player controls, and transient classroom panels. It must
not become a shadow database.

### Key data flows

1. **Teacher lesson authoring:** Teacher UI calls `saveLessonDraft` or
   `moveStep`; Server Action resolves actor; DAL validates `lesson:update`;
   service writes Drizzle rows; Server Action calls `updateTag()` for lesson and
   step tags; UI refreshes cached step DTOs.
2. **LexoRank reorder:** Client sends dragged step and neighbor IDs; DAL loads
   authoritative neighbors; service computes a new rank; one row updates in a
   transaction; rebalance runs only when rank density crosses a threshold.
3. **Student player resume:** PPR shell loads cached lesson structure; Suspense
   loads `StepProgress`, classroom lock state, and latest submission; player
   resumes to the first incomplete or teacher-forced step.
4. **Classroom broadcast:** Teacher action writes durable session state in Node;
   runtime service publishes event; Edge SSE route streams event to students;
   clients reconcile event with next DAL-backed refresh.
5. **Task submission:** Student action validates payload with Zod; DAL checks
   `step:submit`; ledger transaction clears old latest marker and inserts a new
   immutable row; cache tags for progress, latest submission, and teacher review
   update.
6. **AI lesson drafting:** Teacher invokes LessonAgent; agent queries RAG through
   scoped retrieval filters; agent proposes steps as structured JSON; teacher
   accepts; accepted output goes through normal lesson Server Actions.
7. **RAG ingestion:** Teacher uploads resource; Node route stores metadata in
   SQLite; ingestion worker parses and chunks content; embeddings are written to
   Qdrant with payload fields for school, course, subject, grade, visibility,
   and source IDs.
8. **MCP tool call:** Agent asks capability registry for a tool; MCP client
   manager calls the proper MCP server using JSON-RPC; results are normalized,
   audited, and returned to the agent. External writes still require explicit
   capability permission.
9. **Plugin hook execution:** Core emits event after commit; hook runner loads
   enabled plugin manifests; permission gate filters hooks; action registry runs
   allowed Core API actions; all outputs are audited.

## Domain model and Drizzle boundaries

The first schema must be deliberately small but complete enough for the core
loop. Prefer explicit tables and JSON columns only for polymorphic step payloads
and agent/plugin configuration that is validated with Zod.

### Recommended table groups

| Group | Tables | Notes |
|-------|--------|-------|
| Auth | `users`, `accounts`, `sessions`, `verificationTokens`, `roles`, `memberships` | Auth.js adapter tables plus project roles and school membership. Role must be exposed in the session but rechecked in DAL. |
| Learning | `schools`, `courses`, `lessons`, `lesson_steps`, `step_assets` | `lesson_steps.type` starts with `content`, `task`, and `quiz`; `lesson_steps.rank` stores LexoRank. |
| Progress | `step_progress`, `lesson_progress` | Unique by `(studentId, lessonId, stepId)` for step progress. Keep progress separate from submissions. |
| Submissions | `task_submissions`, `quiz_attempts`, `submission_feedback` | Append-only attempts; `isLatest` optimizes latest reads. |
| Classroom | `classroom_sessions`, `classroom_participants`, `classroom_events` | Durable state lives in SQLite; SSE is a transport, not the source of truth. |
| AI/RAG | `agent_runs`, `agent_messages`, `rag_sources`, `rag_chunks`, `rag_embeddings` | Store Qdrant point IDs and retrieval metadata in SQLite. |
| MCP | `mcp_servers`, `mcp_credentials`, `mcp_tool_audit_logs` | Encrypt credentials outside plain JSON; audit every tool call. |
| Plugins | `plugins`, `plugin_permissions`, `plugin_hook_runs`, `themes` | Manifests are JSON plus validated permission rows. |

### Relationship rules

- Every child table that belongs to a parent domain object must use cascade
  delete where supported: lesson deletion removes steps, progress, and draft
  metadata; school deletion removes scoped memberships and courses.
- Auth.js tables should follow adapter expectations; project-specific roles and
  memberships should be separate instead of overloading provider account data.
- SQLite unique constraints are implemented as unique indexes in Drizzle. Use
  named unique indexes for natural invariants such as latest progress identity,
  plugin IDs, and MCP server slugs.
- JSON payloads must have a matching Zod schema in the owning module. Never
  accept arbitrary `content` or `submission` JSON from UI, AI, MCP, or plugins.

## Route architecture

Routes should reflect product ownership, not database tables. The public,
teacher, student, and classroom areas must have separate layouts because they
have different navigation, permission expectations, and PPR behavior.

| Route area | Purpose | Runtime/rendering | Primary DAL modules |
|------------|---------|-------------------|---------------------|
| `/` | Public landing and product entry. | Static or cached with `use cache`. | Public course/resource reads only if needed. |
| `/teacher` | Teacher dashboard and daily workflow. | PPR dashboard shell with dynamic workload panels. | `lessons.dal.ts`, `classroom.dal.ts`, `rag.dal.ts`. |
| `/teacher/lessons/[lessonId]/editor` | Lesson/step authoring. | Mostly dynamic Server Components plus client editor islands. | `lessons.dal.ts`, `steps.dal.ts`. |
| `/learn/[lessonId]` | Student lesson player. | PPR shell with Suspense for progress and runtime state. | `progress.dal.ts`, `submissions.dal.ts`, `classroom.dal.ts`. |
| `/classroom/[sessionId]` | Teacher live classroom console. | Dynamic control plane plus SSE client. | `classroom.dal.ts`, `progress.dal.ts`. |
| `/admin` | School and system administration. | Dynamic and permission-heavy. | `authz`, `memberships`, `plugins`. |
| `/api/classroom/[sessionId]/events` | SSE broadcast stream. | Edge runtime, no complex DB writes. | Reads minimal signed/session context only. |
| `/api/ai/[agent]` | Agent invocation endpoint. | Node runtime. | `agents`, `rag`, `mcp`, normal DAL capabilities. |
| `/api/mcp/[serverId]` | MCP callback/proxy if needed. | Node runtime. | `mcp`, `plugins`, audit logs. |

## Security and permission boundaries

Security must be designed as a series of gates. No single layer is enough for a
school product that includes children, parent access, AI agents, external tools,
and plugins.

| Boundary | What it protects | Enforcement |
|----------|------------------|-------------|
| Route boundary | Anonymous access to protected areas. | `proxy.ts` session existence checks and redirects. |
| Actor boundary | Identity, role, school, and memberships. | `requireActor()` and Auth.js session callbacks. |
| Resource boundary | Ownership and classroom/course membership. | DAL `requirePermission(actor, action, resource)` on every operation. |
| DTO boundary | Sensitive fields, credentials, prompts, and internal IDs. | DAL mappers that return explicit DTOs. |
| Mutation boundary | Invalid writes and stale UI. | Server Actions, Zod validation, transactions, and `updateTag()`. |
| Runtime boundary | Live classroom state. | Node writes as source of truth; Edge SSE only transports events. |
| AI boundary | Prompt injection and overbroad tools. | Capability-scoped agent tools, retrieval filters, and audit logs. |
| MCP boundary | External system misuse. | Per-server credentials, tool allow-lists, OAuth/bearer-token handling, and audit logs. |
| Plugin boundary | Unsafe extension behavior. | JSON manifests, declared permissions, hook filtering, action allow-list, no direct DB access. |
| Theme boundary | UI customization without script execution. | JSON tokens mapped to CSS variables; no arbitrary CSS or JS in v1. |

### RBAC and ABAC model

Use RBAC for coarse actions and ABAC for resource checks. Roles include
`super_admin`, `school_admin`, `teacher`, `student`, `parent`, `developer`, and
`agent`. ABAC checks include school membership, course enrollment, lesson owner,
classroom participant, parent-child relation, plugin permission grant, and agent
delegation scope.

The role in the Auth.js session is an optimization for UI branching, not the
source of final authorization. Server Actions and DAL functions must re-check
resources because session claims can be stale or insufficient for ABAC.

## UI design source mapping

Implementation must preserve the Stitch project mapping in `.planning/PROJECT.md`
and the local `DESIGN.md` constraints. Treat Stitch screens as information
architecture and visual-composition sources, then implement them as reusable
components that follow The Luminous Academy design system.

| Stitch/design source | App area | Implementation notes |
|----------------------|----------|----------------------|
| `首页 - OpenLear-Next (一屏精简版)` | `/` public home | Use a sunlit hero, Primary Blue gradient CTA, glass navigation, and no 1px dividers. |
| `教师工作台 - 简体中文版` | `/teacher` | Dashboard cards must be pure white action surfaces on tonal background layers. |
| `课堂教学流程编排 - 优化布局版` | `/teacher/lessons/[lessonId]/editor` | Step list, canvas, and inspector use tonal islands instead of bordered panels. |
| `学生仪表盘 - OpenLear-Next (新亮色版)` | Student dashboard | Preserve Lexend typography, simplified Chinese labels, and airy whitespace. |
| `学生学习页面 - OpenLear-Next` | `/learn/[lessonId]` | PPR shell should feel stable and calm; dynamic progress loads inside soft Suspense skeletons. |
| `全屏沉浸学习模式 - OpenLear-Next` | Fullscreen player mode | Use focus-first layout with minimal chrome and glass floating controls. |
| `课堂教学流程运行管理` and `课堂教学运行管理 - 优化版` | `/classroom/[sessionId]` | Teacher control surface must clearly distinguish locked and unlocked states without harsh borders. |
| `教学资源中心` and `课程中心` | Resource/course management | Use card grids and subject chips with tonal layering and no divider lines. |

### Design constraints that affect architecture

- Components must support simplified Chinese as the primary interface language.
- Shared cards, panels, inputs, buttons, and chips belong in a design-system
  component layer to prevent each route from recreating visual rules.
- Layout components must avoid border-dependent separation. Route shells should
  expose surface tiers such as `surface`, `surface-container-low`, and
  `surface-container-lowest`.
- Plugin themes can change tokens only through the theme engine. They must not
  inject arbitrary CSS that breaks the no-line, tonal-layering, and accessibility
  rules.

## Suggested build order and dependencies

The roadmap should build the system from trust boundaries outward. Do not start
with AI agents or plugins before the DAL, permissions, and core classroom data
loop exist.

1. **Application foundation and design shell**
   - Build Next.js 16, React 19.2, Turbopack, Lexend font setup, route groups,
     base layouts, and design tokens from `DESIGN.md`.
   - Dependency: none.
   - Unlocks: all UI work and Stitch screen implementation.
2. **Auth, roles, Drizzle schema, and DAL skeleton**
   - Build Auth.js v5 with Drizzle adapter, users/accounts/sessions, roles,
     memberships, `proxy.ts`, `Actor`, and `requirePermission()`.
   - Dependency: foundation.
   - Unlocks: any protected feature.
3. **Course, lesson, step model, and authoring CRUD**
   - Build courses, lessons, `lesson_steps`, step payload schemas, and teacher
     editor reads/writes through DAL.
   - Dependency: auth and DAL.
   - Unlocks: LexoRank, student player, AI lesson drafting.
4. **LexoRank ordering and draft autosave**
   - Build rank utilities, reorder Server Action, transaction rules, autosave,
     and cache tags.
   - Dependency: lesson steps.
   - Unlocks: usable teacher workflow.
5. **Student PPR player and progress tracking**
   - Build cached lesson shell, Suspense progress panels, `step_progress`, and
     resume behavior.
   - Dependency: stable lesson/step model.
   - Unlocks: student learning loop and classroom runtime.
6. **Append-only submissions and feedback surfaces**
   - Build task submission ledger, latest marker transaction, teacher review,
     and student latest/history views.
   - Dependency: student player and step payloads.
   - Unlocks: learning evidence and AI feedback.
7. **Classroom runtime and Edge SSE**
   - Build classroom sessions, participants, lock mode, current step state,
     Node mutation actions, and Edge SSE route.
   - Dependency: player, progress, and permissions.
   - Unlocks: live classroom orchestration.
8. **RAG foundation and agent capability interfaces**
   - Build resource metadata, ingestion pipeline, Qdrant collection contract,
     retrieval filters, and typed agent capability wrappers.
   - Dependency: DAL, lessons, submissions.
   - Unlocks: LessonAgent, HomeworkAgent, TutorAgent, DataAgent, ParentAgent.
9. **MCP integration**
   - Build MCP client manager, server registry, tool/resource/prompt discovery,
     credential handling, and audit logs.
   - Dependency: agent capability registry and permissions.
   - Unlocks: Moodle/GitHub/Notion/WeCom/DingTalk integrations.
10. **Plugin and theme extension system**
    - Build JSON manifests, permission grants, hook runner, action registry,
      theme token registry, and plugin audit logs.
    - Dependency: mature Core API actions, permission system, and events.
    - Unlocks: external developer ecosystem without unsafe code execution.

## Scaling considerations

The v1 target should optimize for correctness and deployment simplicity. SQLite
is acceptable for the first validation milestone if writes are disciplined,
submission history is indexed, and the classroom runtime is not treated as a
durable event bus.

| Scale | Architecture adjustments |
|-------|--------------------------|
| 0-1k users | Keep one Next.js app and SQLite database. Use DAL tags, indexes, and append-only submissions. Run Qdrant locally or managed only if RAG is enabled. |
| 1k-100k users | Move SQLite to a server-grade deployment path or introduce PostgreSQL in a later milestone. Add background workers for ingestion, embeddings, and AI runs. Use Redis or managed pub/sub for classroom SSE fan-out. |
| 100k+ users | Split runtime-heavy concerns: classroom event service, ingestion workers, vector search, and analytics warehouse. Keep Core API contracts stable so the modular monolith can be carved along existing boundaries. |

### Scaling priorities

1. **First bottleneck: classroom fan-out and concurrent SSE connections.** Add a
   pub/sub backplane before changing product code. Keep SSE as the client
   protocol until bidirectional communication is truly needed.
2. **Second bottleneck: AI/RAG ingestion and embedding latency.** Move parsing,
   chunking, and embedding to background jobs. Keep retrieval metadata in SQLite
   and vectors in Qdrant.
3. **Third bottleneck: submission volume.** Partition or archive submission
   history later. The append-only model makes this easier than overwriting rows.
4. **Fourth bottleneck: relational write concurrency.** The DAL boundary is the
   migration seam for PostgreSQL when SQLite becomes limiting.

## Anti-patterns

These mistakes would cause rewrites or security issues. The roadmap should flag
phases that risk introducing them.

### Anti-pattern 1: UI imports Drizzle directly

**What people do:** Import `db` or schema tables inside React components,
Server Components, or Client Components.

**Why it's wrong:** It bypasses authorization, leaks internal fields, scatters
cache invalidation, and makes future database migration harder.

**Do this instead:** Use DAL read functions and Server Actions. Treat DTOs as
the only shape UI can receive.

### Anti-pattern 2: Resource authorization in `proxy.ts`

**What people do:** Put lesson ownership, classroom participant checks, or
parent-child checks in proxy.

**Why it's wrong:** Proxy is too coarse and runs before full domain context is
available. It also tempts developers to skip DAL checks.

**Do this instead:** Use proxy only for route family access. Put all
resource-level checks in DAL functions.

### Anti-pattern 3: Treating SSE as source of truth

**What people do:** Let Edge SSE handlers mutate classroom state or rely on
in-memory events as the only classroom state.

**Why it's wrong:** Edge runtime is not the durable authority, and reconnecting
students need state from storage.

**Do this instead:** Persist classroom state through Node Server Actions and DAL,
then broadcast events as a cache of the durable state.

### Anti-pattern 4: Overwriting student submissions

**What people do:** Update one submission row every time a student retries.

**Why it's wrong:** It destroys learning history, blocks auditability, and makes
AI feedback hard to trace.

**Do this instead:** Insert immutable attempts and update only the latest marker
inside a transaction.

### Anti-pattern 5: Giving AI agents raw tools

**What people do:** Let agents call arbitrary DAL functions, database queries,
MCP tools, or plugin actions.

**Why it's wrong:** Prompt injection can cross from text generation into data
exfiltration or external writes.

**Do this instead:** Give agents scoped capabilities with explicit permissions,
retrieval filters, structured outputs, and audit logs.

### Anti-pattern 6: Executing arbitrary plugin JavaScript in v1

**What people do:** Accept uploaded JavaScript and run it in Node, Edge,
`eval()`, or a broad sandbox.

**Why it's wrong:** The project explicitly forbids arbitrary third-party plugin
code execution. Even SES and ShadowRealm-style isolation require careful
endowments and are not a substitute for a small permission model.

**Do this instead:** Use JSON manifests, declared hooks, and allow-listed Core
API actions. Consider SES compartments only in a later phase after a security
review.

### Anti-pattern 7: One JSON blob for the whole lesson

**What people do:** Store lesson content, steps, ordering, progress, and
submissions in one JSON document.

**Why it's wrong:** It makes ordering, permissions, analytics, autosave, and
student progress fragile.

**Do this instead:** Store lessons and steps relationally. Use JSON only for
typed step payloads validated by Zod.

## Integration points

OpenLearn Next integrates with AI and school ecosystems through explicit
adapters. Each adapter must terminate at the capability registry or Core API,
not at the database.

### External services

| Service | Integration pattern | Notes |
|---------|---------------------|-------|
| Qdrant | Vector DB for RAG collections. | Store point IDs and metadata in SQLite; use payload filters for school, grade, subject, course, and visibility. |
| MCP servers | MCP client manager with one client/session per server. | MCP uses JSON-RPC primitives for tools, resources, prompts, and notifications. Treat remote servers as untrusted external IO. |
| Moodle | MCP server or plugin action. | Start with sync/export, not full LMS replacement. |
| GitHub | MCP server for developer/plugin workflows. | Scope to repository operations needed by developers; audit writes. |
| Notion | MCP server for teacher resource import/export. | Normalize imported content into resource metadata before RAG ingestion. |
| WeCom/DingTalk | MCP or plugin action for notifications. | Do not expose student-sensitive data without school and parent permission checks. |
| AI model providers | Agent gateway adapter. | Keep model SDKs behind `server/ai`; log prompts, tools, and outputs according to privacy policy. |

### Internal boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ Server Actions | Function call from App Router forms/client actions. | Mutations only; actions call DAL and then update cache tags. |
| Server Components ↔ DAL | Async read functions. | Return DTOs, not Drizzle rows. |
| DAL ↔ Domain services | Direct typed calls. | Services do business logic; DAL enforces actor permissions. |
| Node actions ↔ Edge SSE | Publish event after durable write. | Edge route streams only; Node route owns writes. |
| AI agents ↔ Core data | Capability registry. | Agents never receive `db`. |
| MCP ↔ AI agents | Normalized tools/resources/prompts. | Tool calls must be audited and permission-scoped. |
| Plugins ↔ Core API | Event -> Hook -> Action. | Plugins never import DAL or call private APIs. |
| Themes ↔ UI | Token registry to CSS variables. | Themes cannot execute code. |

## Sources

- `.planning/PROJECT.md` (local project context and hard constraints), read on
  2026-05-04. Confidence: HIGH.
- `DESIGN.md` (The Luminous Academy UI constraints), read on 2026-05-04.
  Confidence: HIGH.
- Next.js 16.1.6 Context7 docs for `updateTag()`, `revalidateTag()`, PPR,
  Suspense static shell, `proxy.ts`, Route Handlers, `ReadableStream`, and route
  `runtime`. Confidence: HIGH.
- Auth.js official Context7 docs for Drizzle adapter setup and role-based access
  control callbacks. Confidence: HIGH.
- Drizzle ORM official Context7 docs for SQLite schema declaration, unique
  indexes, and constraints. Confidence: HIGH.
- Qdrant JS Context7 docs for TypeScript upsert, query, filters, payloads, and
  payload indexes. Confidence: HIGH.
- Model Context Protocol official documentation for architecture, JSON-RPC data
  layer, tools/resources/prompts, notifications, stdio transport, and Streamable
  HTTP transport. Confidence: HIGH.
- TC39 ShadowRealm Stage 2.7 draft, February 10, 2025, and Endo SES README for
  plugin sandboxing context. Confidence: MEDIUM for future plugin-code
  execution because v1 intentionally avoids arbitrary code execution.

---
*Architecture research for: OpenLearn Next*  
*Researched: 2026-05-04*
