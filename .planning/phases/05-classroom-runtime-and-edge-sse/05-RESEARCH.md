# Phase 05: Classroom runtime and Edge SSE - Research

**Researched:** 2026-05-05
**Domain:** Next.js 16 classroom runtime, durable SQLite state, and Edge Runtime SSE
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Launch and roster

- **D-01:** The primary classroom launch entry point is the existing teacher classroom console at `/classroom`.
- **D-02:** Starting a classroom requires the teacher to select one class roster for the published lesson because one course can run across multiple classes.
- **D-03:** Each classroom session binds to one class roster. Do not implement multi-class merged sessions in Phase 05.
- **D-04:** If the lesson is not published, or the selected class roster has no students, block classroom launch and explain the required fix. Do not create an empty or draft classroom session.

#### Locked and unlocked classroom semantics

- **D-05:** Locked-follow mode limits independent navigation only. Students can still submit or complete the current teacher-selected step.
- **D-06:** In locked-follow mode, non-current steps remain visible but disabled with explanatory copy. Students cannot open non-current steps while locked.
- **D-07:** In unlocked mode, the teacher active step appears as a soft recommendation. Students can use the existing Phase 04 permitted navigation behavior.
- **D-08:** Teacher-forced active steps take precedence over student personal resume state. If the teacher switches to a step whose prerequisites are not complete for a student, the student still follows the teacher step and their personal progress remains unchanged.

#### Teacher conflict recovery

- **D-09:** On classroom state version conflict, preserve the teacher's attempted action in the UI but do not replay it automatically.
- **D-10:** When the control panel is stale or conflicted, block additional active-step and lock-mode control actions until the teacher refreshes the durable classroom snapshot.
- **D-11:** Only one teacher control action may be pending at a time. Do not queue multiple step or mode changes, and do not apply a last-click-wins policy.
- **D-12:** After the teacher refreshes the classroom snapshot, show the preserved attempted action and ask the teacher to confirm before executing it against the fresh version.

#### Student reconnect and snapshot behavior

- **D-13:** When SSE disconnects, keep the student's current content and any draft input visible. Show reconnecting copy and use the latest known classroom state as a temporary view.
- **D-14:** After reconnect, fetch or confirm the durable SQLite classroom snapshot before jumping to a new locked active step. Do not jump solely because a single SSE event arrived.
- **D-15:** Late-joining students enter the current teacher step when the session is locked, with clear restored-state copy.
- **D-16:** If SSE remains unavailable but the SQLite snapshot is readable, fall back to manual or periodic classroom snapshot refresh. Do not exit classroom mode solely because the live stream is down.

### the agent's Discretion

- The agent may choose exact table names, DTO names, route handler naming, polling interval, and component split when the behavior above is preserved.
- The agent may decide whether preserved teacher attempts live in client state, action return payloads, or a lightweight pending-control DTO, as long as they are not auto-replayed after a conflict.
- The agent may choose the exact SSE event names and payload shape, but every event must be reconcilable with a durable session version or snapshot.

### Deferred Ideas (OUT OF SCOPE)

- Multi-class merged classroom sessions are deferred beyond Phase 05.
- Class roster management, search, invitation flows, and ad hoc student adding are deferred unless a later phase scopes them.
- Full notifications, AI classroom control, gradebook behavior, WebSocket collaboration, and offline/mobile-native classroom mode remain out of scope.
</user_constraints>

## Summary

Phase 05 must make SQLite the classroom source of truth and treat SSE as a live delivery channel only. [VERIFIED: 05-CONTEXT.md] Teacher control writes belong in Node-side Server Actions and DAL methods, where Auth.js, Drizzle, Zod, cache tags, roster validation, and optimistic version checks can run safely. [VERIFIED: AGENTS.md; VERIFIED: src/actions/learning-actions.ts; VERIFIED: src/lib/dal/learning.ts]

The safest architecture is an Edge SSE poll-and-push bridge: the Edge Route Handler owns the streaming `ReadableStream`, but it fetches a Node snapshot endpoint or emits only versioned snapshots derived from durable SQLite state. [CITED: Context7 /vercel/next.js; VERIFIED: AGENTS.md] This avoids relying on memory inside SSE workers, which would fail late-join and reconnect requirements. [VERIFIED: 05-CONTEXT.md]

**Primary recommendation:** implement `classroomSessions`, `classroomParticipants`, and `classroomEvents` as durable Drizzle SQLite tables; mutate them through Server Actions with `expectedVersion`; stream versioned snapshots through an Edge `text/event-stream` route; reconcile the student UI against durable snapshots before step jumps. [VERIFIED: 05-CONTEXT.md; CITED: Context7 /vercel/next.js; CITED: Context7 /drizzle-team/drizzle-orm-docs]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Launch classroom session | API / Backend | Database / Storage | Launch requires teacher authz, published lesson checks, roster checks, participant creation, and durable writes. [VERIFIED: AGENTS.md; VERIFIED: 05-CONTEXT.md] |
| Active step control | API / Backend | Database / Storage | Control writes must validate step membership and update a versioned durable row. [VERIFIED: 05-CONTEXT.md] |
| Locked/unlocked mode | API / Backend | Browser / Client | The backend owns mode state; the browser only renders navigation gating from DTOs. [VERIFIED: AGENTS.md; VERIFIED: 05-CONTEXT.md] |
| Edge SSE stream | CDN / Edge | API / Backend | Edge owns the `ReadableStream`; Node snapshot APIs own SQLite reads and authz. [VERIFIED: AGENTS.md; CITED: Context7 /vercel/next.js] |
| Late join and reconnect snapshot | API / Backend | Database / Storage | Consistency comes from SQLite snapshots, not stream memory. [VERIFIED: 05-CONTEXT.md] |
| Teacher conflict recovery | API / Backend | Browser / Client | Server detects version conflicts; client preserves attempted action and blocks more controls. [VERIFIED: 05-CONTEXT.md] |
| Student draft preservation | Browser / Client | API / Backend | Draft task and quiz input must remain visible during reconnect; durable classroom state only controls navigation. [VERIFIED: 05-CONTEXT.md; VERIFIED: 05-UI-SPEC.md] |

<phase_requirements>
## Phase Requirements

This phase covers the classroom runtime requirements from `.planning/REQUIREMENTS.md`. [VERIFIED: .planning/REQUIREMENTS.md]

| ID | Description | Research Support |
|----|-------------|------------------|
| CLASS-01 | Teacher can launch a published lesson as a classroom session with a roster of participants. | Use Node-side Server Action plus DAL to validate published lesson, selected class roster, and non-empty student participants. [VERIFIED: 05-CONTEXT.md; VERIFIED: src/db/schema.ts] |
| CLASS-02 | Teacher can see and change the active step of a live classroom session. | Store `activeStepId` and increment a durable `version` on each successful control update. [VERIFIED: 05-CONTEXT.md; CITED: Context7 /drizzle-team/drizzle-orm-docs] |
| CLASS-03 | Teacher can switch a classroom session between locked mode and unlocked mode. | Store `locked` as durable session state and keep locked mode limited to navigation gating. [VERIFIED: 05-CONTEXT.md] |
| CLASS-04 | Student player reflects active step and lock mode changes through an Edge Runtime SSE stream. | Implement an Edge Route Handler with `ReadableStream` and `text/event-stream` events. [CITED: Context7 /vercel/next.js; CITED: MDN SSE] |
| CLASS-05 | Classroom state, current step, lock mode, participants, and events are durable in SQLite. | Add session, participant, and append-only event tables with cascade FKs and version indexes. [VERIFIED: AGENTS.md; VERIFIED: src/db/schema.ts] |
| CLASS-06 | Reconnecting or late-joining students receive a consistent snapshot. | Load a durable snapshot first, then reconcile SSE events by `version`; never trust an isolated event as source of truth. [VERIFIED: 05-CONTEXT.md] |
| CLASS-07 | Teacher can recover from control conflicts or stale UI with clear state feedback. | Use optimistic concurrency by `expectedVersion`; return conflict DTO with latest snapshot and preserved attempted action. [VERIFIED: 05-CONTEXT.md; CITED: Context7 /drizzle-team/drizzle-orm-docs] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

These constraints must shape the plan. [VERIFIED: AGENTS.md]

- Use Next.js 16 App Router, React 19.2, Turbopack, Auth.js v5, Drizzle ORM, and SQLite-first implementation. [VERIFIED: AGENTS.md]
- UI components must not access the database directly; all reads and writes go through DAL and Server Actions. [VERIFIED: AGENTS.md]
- Node.js 20.9+ is the primary runtime; Edge Runtime is only for SSE real-time synchronization. [VERIFIED: AGENTS.md]
- Next.js 16 caching must be explicit; writes must update or invalidate cache tags. [VERIFIED: AGENTS.md]
- SQLite is the first database target, and parent-owned relations must cascade delete. [VERIFIED: AGENTS.md]
- Classroom broadcast uses SSE and supports locked and unlocked modes. [VERIFIED: AGENTS.md]
- Plugin code cannot use `eval()`, dynamic third-party execution, direct DB access, or direct core API access. [VERIFIED: AGENTS.md]
- UI must follow Stitch project `5322129002350954765`, `DESIGN.md`, Lexend, Simplified Chinese copy, tonal surfaces, no 1px divider lines, glass/gradient emphasis, and the Phase 05 UI spec. [VERIFIED: AGENTS.md; VERIFIED: DESIGN.md; VERIFIED: 05-UI-SPEC.md]

No project-local `.claude/skills` or `.agents/skills` were found. [VERIFIED: Glob .claude/skills and .agents/skills]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.4, modified 2026-05-04 | App Router, Server Actions, Route Handlers, Edge runtime, cache tags | Already installed and required by project; Route Handlers support streaming with Web Streams APIs. [VERIFIED: npm registry; VERIFIED: package.json; CITED: Context7 /vercel/next.js] |
| `react` / `react-dom` | 19.2.5, modified 2026-05-04 | Client UI, Suspense regions, Effect cleanup for EventSource | Already installed and required by project; React docs require cleanup when subscribing to external systems. [VERIFIED: npm registry; VERIFIED: package.json; CITED: Context7 /reactjs/react.dev] |
| `drizzle-orm` | 0.45.2, modified 2026-05-05 | SQLite schema, DAL queries, conditional updates, transactions | Already installed; Drizzle docs show SQLite-compatible `update().returning()` and conflict/update patterns. [VERIFIED: npm registry; VERIFIED: package.json; CITED: Context7 /drizzle-team/drizzle-orm-docs] |
| `@libsql/client` | 0.17.3, modified 2026-04-23 | SQLite/libSQL database driver | Already installed and matches SQLite-first project baseline. [VERIFIED: npm registry; VERIFIED: package.json; VERIFIED: AGENTS.md] |
| `zod` | 4.4.3, modified 2026-05-04 | Runtime validation for Server Action inputs, DTOs, SSE payloads | Already installed; current actions and DTOs use Zod validation. [VERIFIED: npm registry; VERIFIED: package.json; VERIFIED: src/lib/dto/learning.ts] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | 4.1.5, modified 2026-04-23 | Unit tests for schema, DTO, DAL, Server Actions, cache policy | Use for classroom schema/DTO/action/polling helper tests. [VERIFIED: npm registry; VERIFIED: package.json] |
| `playwright` | 1.59.1, modified 2026-05-05 | Browser-level teacher-to-student SSE smoke tests | Use only if Phase 05 adds E2E coverage; no `playwright.config.*` exists yet. [VERIFIED: npm registry; VERIFIED: package.json; VERIFIED: Glob playwright.config.*] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Edge SSE poll-and-push bridge | WebSocket or Socket.IO | WebSocket collaboration is explicitly out of scope, and project constraints require SSE. [VERIFIED: 05-CONTEXT.md; VERIFIED: REQUIREMENTS.md; VERIFIED: AGENTS.md] |
| Durable SQLite snapshots | SSE in-memory session store | In-memory-only state violates late-join and reconnect requirements. [VERIFIED: 05-CONTEXT.md] |
| Server Action writes with `expectedVersion` | Last-click-wins writes | Last-click-wins is explicitly forbidden for teacher conflicts. [VERIFIED: 05-CONTEXT.md] |
| Existing React state plus EventSource | Zustand store | No new global client state library is needed for the narrow SSE reconciliation flow. [VERIFIED: package.json; CITED: Context7 /reactjs/react.dev] |

**Installation:** no new runtime package is required for Phase 05. [VERIFIED: package.json]

```bash
pnpm install
```

**Version verification:** package versions were verified with `npm view` on 2026-05-05. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Teacher /classroom UI
  -> Server Action: launch/change step/change mode/end
  -> Classroom DAL: authz + roster + published lesson checks
  -> SQLite: classroomSessions(version), classroomParticipants, classroomEvents
  -> updateTag(classroom:${sessionId})
  -> Teacher DTO: success or VERSION_CONFLICT + latest snapshot

Student /student/player UI
  -> cached lesson shell + streamed personal/classroom region
  -> Node snapshot endpoint reads SQLite durable state
  -> Edge SSE route opens text/event-stream
      -> periodically asks Node snapshot endpoint for version
      -> emits snapshot / state.changed / keepalive comments
  -> Browser EventSource reconciles by version
      -> if locked: navigate to durable active step after snapshot confirmation
      -> if unlocked: keep Phase 04 navigation, show teacher step as suggestion
```

This flow keeps all DB and authz decisions in Node-side DAL and Server Actions, while the Edge route only streams low-risk classroom state updates. [VERIFIED: AGENTS.md; CITED: Context7 /vercel/next.js]

### Recommended Project Structure

```text
src/
├── app/api/classroom/[sessionId]/events/route.ts      # Edge SSE stream
├── app/api/classroom/[sessionId]/snapshot/route.ts    # Node snapshot read
├── actions/classroom-actions.ts                       # Server Action mutations
├── lib/dal/classroom.ts                               # Authz, roster, durable state
├── lib/dto/classroom.ts                               # Zod DTOs and SSE schemas
├── components/classroom/                              # Teacher controls
├── components/learning/classroom-runtime-client.tsx   # Student EventSource client
└── db/schema.ts                                       # Classroom tables
```

This structure mirrors existing Phase 04 boundaries for DTOs, DAL, and Server Actions. [VERIFIED: src/lib/dal/learning.ts; VERIFIED: src/actions/learning-actions.ts]

### Pattern 1: Durable classroom state with append-only events

**What:** store the current session snapshot in `classroomSessions`, participant read models in `classroomParticipants`, and control/event history in `classroomEvents`. [VERIFIED: REQUIREMENTS.md]

**When to use:** use this for every launch, active-step change, lock-mode change, participant snapshot, and recovery event. [VERIFIED: 05-CONTEXT.md]

**Example:**

```typescript
// Source: project schema pattern + Phase 05 context
export const classroomSessions = sqliteTable("classroomSession", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  lessonId: text("lessonId").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  publishedVersionId: text("publishedVersionId").notNull().references(() => publishedLessonVersions.id, { onDelete: "cascade" }),
  classId: text("classId").notNull().references(() => classes.id, { onDelete: "cascade" }),
  teacherId: text("teacherId").notNull().references(() => users.id, { onDelete: "cascade" }),
  activeStepId: text("activeStepId").notNull(),
  locked: integer("locked", { mode: "boolean" }).notNull().default(true),
  status: text("status", { enum: ["live", "ended"] }).notNull().default("live"),
  version: integer("version").notNull().default(1),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});
```

The planner must ensure all classroom child rows cascade from the session or its parent lesson/class rows. [VERIFIED: AGENTS.md]

### Pattern 2: Optimistic concurrency for teacher controls

**What:** require every teacher control action to send `expectedVersion`, update only when `version === expectedVersion`, increment `version`, and return the fresh snapshot. [VERIFIED: 05-CONTEXT.md]

**When to use:** use for active step, lock mode, and ending a live classroom. [VERIFIED: 05-CONTEXT.md]

**Example:**

```typescript
// Source: Context7 /drizzle-team/drizzle-orm-docs update().returning()
const [updated] = await db
  .update(classroomSessions)
  .set({ activeStepId: nextStepId, version: expectedVersion + 1, updatedAt: new Date() })
  .where(and(eq(classroomSessions.id, sessionId), eq(classroomSessions.version, expectedVersion)))
  .returning();

if (!updated) {
  return { ok: false, error: "VERSION_CONFLICT", latest: await getClassroomSnapshot(sessionId) };
}
```

Drizzle docs show `update().returning()` is supported for SQLite. [CITED: Context7 /drizzle-team/drizzle-orm-docs]

### Pattern 3: Edge SSE emits versioned snapshots, not authority

**What:** implement the Edge route with Web Streams and SSE framing. [CITED: Context7 /vercel/next.js; CITED: MDN SSE]

**When to use:** use for low-frequency active-step, lock-mode, and roster state updates. [VERIFIED: 05-CONTEXT.md]

**Example:**

```typescript
// Source: Context7 /vercel/next.js streaming Route Handler + MDN SSE format
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastVersion = 0;
      const abort = request.signal;

      while (!abort.aborted) {
        const snapshot = await fetchSnapshotThroughNode(request, lastVersion);
        if (snapshot.version > lastVersion) {
          lastVersion = snapshot.version;
          controller.enqueue(encoder.encode(`event: snapshot\nid: ${snapshot.version}\ndata: ${JSON.stringify(snapshot)}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
```

Next.js Route Handlers support raw streaming with Web Streams APIs, and MDN documents `text/event-stream`, named events, `id`, comments for keepalive, and client reconnection behavior. [CITED: Context7 /vercel/next.js; CITED: MDN SSE]

### Pattern 4: Client EventSource reconciliation with cleanup

**What:** use a small client component to subscribe to the Edge SSE route and close the `EventSource` during cleanup. [CITED: Context7 /reactjs/react.dev; CITED: MDN SSE]

**When to use:** use in the student live player region only; do not move authoritative progress or submissions into client-only state. [VERIFIED: AGENTS.md; VERIFIED: 05-CONTEXT.md]

**Example:**

```typescript
// Source: React useEffect cleanup docs + MDN EventSource docs
useEffect(() => {
  const source = new EventSource(`/api/classroom/${sessionId}/events`);

  source.addEventListener("snapshot", (event) => {
    const snapshot = ClassroomSnapshotDTOSchema.parse(JSON.parse(event.data));
    reconcileOnlyIfNewer(snapshot);
  });

  source.onerror = () => setConnectionState("reconnecting");

  return () => source.close();
}, [sessionId]);
```

React docs require cleanup for external subscriptions, and MDN documents `EventSource.close()`. [CITED: Context7 /reactjs/react.dev; CITED: MDN SSE]

### Anti-Patterns to Avoid

- **SSE memory as source of truth:** violates durable snapshot, late join, and reconnect requirements. [VERIFIED: 05-CONTEXT.md]
- **DB access from Edge route:** contradicts the project runtime constraint that Edge is only for SSE and DB/Auth adapter logic stays in Node. [VERIFIED: AGENTS.md]
- **Auto-replaying a teacher action after conflict:** violates D-09 through D-12. [VERIFIED: 05-CONTEXT.md]
- **Hiding locked steps:** locked mode must disable non-current navigation with explanatory copy, not hide the rail. [VERIFIED: 05-CONTEXT.md; VERIFIED: 05-UI-SPEC.md]
- **Using `updateTag()` in Route Handlers:** Next.js docs state `updateTag()` is Server Actions-only; use it in classroom actions, not snapshot/SSE routes. [CITED: Context7 /vercel/next.js]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stream parsing | Custom newline parser in React | Browser `EventSource` | MDN documents built-in named event, reconnect, `id`, and close behavior. [CITED: MDN SSE] |
| Runtime validation | Manual `typeof` checks for action and SSE payloads | Zod schemas in `src/lib/dto/classroom.ts` | Existing project DTOs already use Zod, and Server Actions validate inputs. [VERIFIED: src/lib/dto/learning.ts; VERIFIED: src/actions/learning-actions.ts] |
| Conflict resolution | Last-click-wins queue | `expectedVersion` optimistic concurrency | Phase decisions forbid queuing and last-click-wins behavior. [VERIFIED: 05-CONTEXT.md] |
| Live state storage | In-memory Maps in SSE route | SQLite session snapshot plus append-only events | Phase requirements require durable SQLite state. [VERIFIED: REQUIREMENTS.md] |
| Step availability logic | Separate classroom-only navigation rules | Extend Phase 04 `RuntimeStepStateDTO` semantics | Existing player already prioritizes `forcedStepId` over resume state. [VERIFIED: src/components/surfaces/player-surface.tsx; VERIFIED: src/lib/dal/learning.ts] |

**Key insight:** SSE is transport, not storage; every event must be derivable from a durable classroom version or snapshot. [VERIFIED: 05-CONTEXT.md]

## Common Pitfalls

### Pitfall 1: Edge stream cannot safely own DB-backed authorization

**What goes wrong:** the SSE route imports Drizzle/Auth.js adapter code and breaks the project runtime boundary. [VERIFIED: AGENTS.md]

**Why it happens:** Route Handlers can run on Edge, but project DB/Auth adapter logic is Node-oriented. [VERIFIED: AGENTS.md; CITED: Context7 /vercel/next.js]

**How to avoid:** keep authz and SQLite reads in Node DAL/snapshot routes, and let the Edge stream fetch or relay sanitized snapshots. [VERIFIED: AGENTS.md]

**Warning signs:** `@/db`, `drizzle-orm`, or `auth.ts` imports appear in the Edge SSE route. [VERIFIED: AGENTS.md]

### Pitfall 2: One SSE event causes an unsafe student step jump

**What goes wrong:** reconnecting students jump to a step based on one event before durable state is confirmed. [VERIFIED: 05-CONTEXT.md]

**Why it happens:** Event delivery and reconnection timing can differ from durable state visibility. [CITED: MDN SSE; VERIFIED: 05-CONTEXT.md]

**How to avoid:** after reconnect, fetch or confirm the snapshot before changing the locked active step. [VERIFIED: 05-CONTEXT.md]

**Warning signs:** client code changes `selectedStepId` directly inside an SSE handler without snapshot validation. [VERIFIED: 05-CONTEXT.md]

### Pitfall 3: Caching classroom runtime as static shell data

**What goes wrong:** teacher and student UIs show stale active step or mode. [VERIFIED: AGENTS.md]

**Why it happens:** request-specific classroom state is accidentally included in cached lesson shell data. [VERIFIED: src/lib/cache-policy.ts]

**How to avoid:** cache only lesson shell and steps; stream classroom runtime under Suspense and tag classroom reads with `classroom:${sessionId}`. [VERIFIED: src/lib/cache-policy.ts; CITED: Context7 /vercel/next.js]

**Warning signs:** classroom runtime reads appear inside a `use cache` function. [VERIFIED: src/lib/dal/learning.ts]

## Code Examples

Verified patterns from official sources:

### SSE event format

```text
# Source: MDN Server-sent events guide
event: snapshot
id: 12
data: {"sessionId":"abc","version":12,"locked":true,"activeStepId":"step-1"}

: keepalive
```

SSE messages use UTF-8 text, a `text/event-stream` response, optional named `event` fields, optional `id`, and blank lines between messages. [CITED: MDN SSE]

### Server Action cache update

```typescript
// Source: Context7 /vercel/next.js updateTag docs
"use server";
import { updateTag } from "next/cache";

export async function changeClassroomStepAction(input: unknown) {
  const result = await changeClassroomStep(input);
  if (result.ok) updateTag(cacheTags.classroom(result.data.sessionId));
  return result;
}
```

Next.js docs say `updateTag()` provides read-your-writes behavior and is Server Actions-only. [CITED: Context7 /vercel/next.js]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WebSocket for every real-time classroom feature | SSE for one-way teacher broadcast | Project decision for v1 | Simpler transport and lower scope; no bidirectional collaboration. [VERIFIED: AGENTS.md; VERIFIED: REQUIREMENTS.md] |
| In-memory live session state | Durable SQLite snapshot plus stream delivery | Phase 05 requirement | Reconnect and late join are consistent. [VERIFIED: REQUIREMENTS.md] |
| `middleware.ts` auth boundary | `proxy.ts` plus Server Action/DAL authz | Existing project stack | Planner must not rely on route middleware for Server Action authorization. [VERIFIED: AGENTS.md] |
| Implicit Next caching | Explicit `cacheTag()` and `updateTag()` | Next.js 16 project baseline | Classroom runtime must be dynamic or explicitly invalidated. [VERIFIED: AGENTS.md; CITED: Context7 /vercel/next.js] |

**Deprecated/outdated:**
- `middleware.ts`: project stack says use `proxy.ts` instead. [VERIFIED: AGENTS.md]
- `updateTag()` inside Route Handlers: Next.js docs say it throws outside Server Actions. [CITED: Context7 /vercel/next.js]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The Edge SSE route can call an internal Node snapshot endpoint in the target deployment without unacceptable latency. [ASSUMED] | Architecture Patterns | Planner may need a Node-only SSE fallback or deployment-specific design. |
| A2 | A 1.5 to 3 second polling interval is acceptable for v1 classroom step/mode updates. [ASSUMED] | Environment Availability / Architecture | User may require lower latency, which affects SQLite load and deployment limits. |
| A3 | Existing class roster data from Phase 3 is sufficient for launch selection and no new roster management UI is needed. [ASSUMED] | Standard Stack / Architecture | Planner may need extra roster seed or selection tasks if data is incomplete. |

## Open Questions (RESOLVED)

1. **RESOLVED: What polling interval is acceptable for live classroom control?**
   - What we know: Phase 05 permits the agent to choose the interval. [VERIFIED: 05-CONTEXT.md]
   - Resolution: use a conservative 2000 ms named constant, `CLASSROOM_SSE_POLL_INTERVAL_MS`, inside the Edge SSE route. This stays within the researched 1500-3000 ms range and avoids a tighter SQLite polling loop for v1.
   - Plan binding: `05-04-PLAN.md` Task 2 and `05-06-PLAN.md` verification require this exact constant and value.

2. **RESOLVED: Should SSE auth use same-origin cookies or a signed classroom token?**
   - What we know: DAL/Server Actions must enforce actor identity and scope. [VERIFIED: AGENTS.md]
   - Resolution: use same-origin `EventSource` cookies, but do not rely on implicit cookie propagation from the Edge route to the Node snapshot endpoint. The Edge SSE route must read `request.headers.get("cookie")` and explicitly forward that value as the `Cookie` header when fetching `/api/classroom/${sessionId}/snapshot`; the Node snapshot endpoint remains the authz boundary.
   - Plan binding: `05-04-PLAN.md` Task 2 requires explicit `Cookie` header forwarding and the final verifier scans for it.

3. **RESOLVED: How many concurrent classroom sessions are expected in the pilot?**
   - What we know: SQLite burst behavior is already a Phase 5 concern in `STATE.md`. [VERIFIED: .planning/STATE.md]
   - Resolution: Phase 05 targets v1 pilot load with compact versioned snapshots, indexed `(sessionId, version)` reads, and no per-student writes in the SSE polling loop. Exact production concurrency limits remain an operations concern outside Phase 05 implementation scope.
   - Plan binding: `05-01-PLAN.md` requires event indexes, `05-04-PLAN.md` emits only when `snapshot.version > lastVersion`, and `05-06-PLAN.md` verifies bounded polling and no authoritative in-memory stream state.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next.js dev/build and Server Actions | ✓ | v24.1.0 | Project minimum is Node 20.9+, so current runtime exceeds minimum. [VERIFIED: command `node --version`; VERIFIED: AGENTS.md] |
| pnpm | Existing project scripts | ✓ | 10.33.0 | npm can inspect packages, but project scripts are pnpm-oriented. [VERIFIED: command `pnpm --version`; VERIFIED: package.json] |
| npm | Registry verification | ✓ | 11.7.0 | pnpm registry commands can substitute. [VERIFIED: command `npm --version`] |
| sqlite3 CLI | SQLite inspection/debugging | ✓ | 3.53.0 | Drizzle/libSQL can run without the CLI, but CLI helps manual verification. [VERIFIED: command `sqlite3 --version`] |
| Playwright config | Browser SSE tests | ✗ | — | Add `playwright.config.*` only if E2E tests are planned. [VERIFIED: Glob playwright.config.*] |

**Missing dependencies with no fallback:** none found. [VERIFIED: environment audit]

**Missing dependencies with fallback:** Playwright config is absent; use Vitest for unit coverage and add minimal Playwright config only if the plan includes browser SSE smoke tests. [VERIFIED: package.json; VERIFIED: Glob playwright.config.*]

## Security Domain

Security enforcement is enabled because `.planning/config.json` does not explicitly set it to `false`. [VERIFIED: .planning/config.json]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Use existing Auth.js-backed user identity in Node DAL/Server Actions; do not trust client-supplied teacher or student IDs. [VERIFIED: AGENTS.md; VERIFIED: src/lib/dal/learning.ts] |
| V3 Session Management | yes | Use same-origin session cookies for protected routes and route-level auth checks; keep SSE output sanitized. [VERIFIED: AGENTS.md] |
| V4 Access Control | yes | DAL checks teacher school scope, lesson ownership/school membership, selected class roster, and student participant membership. [VERIFIED: AGENTS.md; VERIFIED: src/lib/dal/learning.ts] |
| V5 Input Validation | yes | Zod schemas for launch, step change, lock mode, snapshot, and SSE payload DTOs. [VERIFIED: src/lib/dto/learning.ts] |
| V6 Cryptography | no | No new cryptography is required unless a signed SSE token is chosen. [ASSUMED] |

### Known Threat Patterns for Next.js SSE classroom runtime

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Student subscribes to another classroom stream | Information Disclosure | Node snapshot authz must verify the student is in the session participant roster before returning state. [VERIFIED: AGENTS.md; VERIFIED: 05-CONTEXT.md] |
| Teacher controls a class outside their school scope | Elevation of Privilege | DAL must check active teacher membership and course/class school scope before each mutation. [VERIFIED: AGENTS.md; VERIFIED: src/lib/dal/learning.ts] |
| Stale teacher UI overwrites newer state | Tampering | Require `expectedVersion` and return `VERSION_CONFLICT` with latest snapshot. [VERIFIED: 05-CONTEXT.md] |
| SSE response leaks raw DB rows | Information Disclosure | Route emits sanitized DTOs only; never raw session, account, or membership rows. [VERIFIED: AGENTS.md] |
| Excess polling overloads SQLite | Denial of Service | Poll by `version`, use compact snapshots, avoid per-student high-frequency writes in SSE loop. [ASSUMED] |

## Validation Architecture

Skipped because `.planning/config.json` has `workflow.nyquist_validation` explicitly set to `false`. [VERIFIED: .planning/config.json]

## Sources

### Primary (HIGH confidence)

- `.planning/phases/05-classroom-runtime-and-edge-sse/05-CONTEXT.md` — locked decisions for launch, lock semantics, conflict recovery, reconnect behavior, and boundaries.
- `.planning/REQUIREMENTS.md` — CLASS-01 through CLASS-07 and v1 out-of-scope constraints.
- `.planning/STATE.md` — Phase 5 concern about SSE deployment limits and SQLite burst behavior.
- `AGENTS.md` — project stack, DAL, runtime, caching, SQLite cascade, realtime, security, and design constraints.
- `DESIGN.md` and `05-UI-SPEC.md` — visual and interaction contract for live classroom UI.
- `src/db/schema.ts`, `src/lib/dal/learning.ts`, `src/lib/dto/learning.ts`, `src/actions/learning-actions.ts`, `src/lib/cache-policy.ts` — existing schema, DAL, DTO, Server Action, and cache patterns.
- Context7 `/vercel/next.js` — Route Handler streaming, Edge runtime segment config, `updateTag()`, `revalidateTag()`, `cacheTag()`, and Server Action cache behavior.
- Context7 `/drizzle-team/drizzle-orm-docs` — SQLite-compatible `update().returning()`, upsert, and conditional update examples.
- Context7 `/reactjs/react.dev` — `useEffect` subscription cleanup patterns.
- npm registry checks on 2026-05-05 — versions for Next.js, React, Drizzle, libSQL, Zod, Vitest, and Playwright.

### Secondary (MEDIUM confidence)

- MDN `https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events` — EventSource, SSE format, reconnection, keepalive comments, and browser connection caveat. Last modified 2025-05-15.

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages are installed and versions were checked against npm registry.
- Architecture: HIGH — core boundaries come from project constraints and Phase 05 locked decisions; only deployment latency for Edge-to-Node polling is assumed.
- Pitfalls: HIGH — pitfalls are grounded in project constraints, official docs, and Phase 05 decisions.

**Research date:** 2026-05-05
**Valid until:** 2026-06-04 for stack and architecture; re-check npm versions and Next.js SSE/cache docs before implementation if planning is delayed.
