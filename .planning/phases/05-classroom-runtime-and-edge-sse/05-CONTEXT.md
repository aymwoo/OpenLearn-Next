# Phase 05: Classroom runtime and Edge SSE - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 05 turns published lessons into durable live classroom sessions. Teachers
launch one session for one selected class roster, control the active lesson
step, switch between locked-follow and free-browse modes, and recover safely
from stale classroom control state. Students receive classroom runtime state
through an Edge Runtime SSE stream, but SQLite remains the source of truth for
session state, active step, lock mode, participants, and recovery snapshots.

This phase does not implement multi-class merged sessions, class roster
management, full notification systems, AI classroom control, gradebook features,
or WebSocket/CRDT collaboration.

</domain>

<decisions>
## Implementation Decisions

### Launch and roster

- **D-01:** The primary classroom launch entry point is the existing teacher
  classroom console at `/classroom`.
- **D-02:** Starting a classroom requires the teacher to select one class roster
  for the published lesson because one course can run across multiple classes.
- **D-03:** Each classroom session binds to one class roster. Do not implement
  multi-class merged sessions in Phase 05.
- **D-04:** If the lesson is not published, or the selected class roster has no
  students, block classroom launch and explain the required fix. Do not create
  an empty or draft classroom session.

### Locked and unlocked classroom semantics

- **D-05:** Locked-follow mode limits independent navigation only. Students can
  still submit or complete the current teacher-selected step.
- **D-06:** In locked-follow mode, non-current steps remain visible but disabled
  with explanatory copy. Students cannot open non-current steps while locked.
- **D-07:** In unlocked mode, the teacher active step appears as a soft
  recommendation. Students can use the existing Phase 04 permitted navigation
  behavior.
- **D-08:** Teacher-forced active steps take precedence over student personal
  resume state. If the teacher switches to a step whose prerequisites are not
  complete for a student, the student still follows the teacher step and their
  personal progress remains unchanged.

### Teacher conflict recovery

- **D-09:** On classroom state version conflict, preserve the teacher's attempted
  action in the UI but do not replay it automatically.
- **D-10:** When the control panel is stale or conflicted, block additional
  active-step and lock-mode control actions until the teacher refreshes the
  durable classroom snapshot.
- **D-11:** Only one teacher control action may be pending at a time. Do not queue
  multiple step or mode changes, and do not apply a last-click-wins policy.
- **D-12:** After the teacher refreshes the classroom snapshot, show the preserved
  attempted action and ask the teacher to confirm before executing it against
  the fresh version.

### Student reconnect and snapshot behavior

- **D-13:** When SSE disconnects, keep the student's current content and any
  draft input visible. Show reconnecting copy and use the latest known classroom
  state as a temporary view.
- **D-14:** After reconnect, fetch or confirm the durable SQLite classroom
  snapshot before jumping to a new locked active step. Do not jump solely because
  a single SSE event arrived.
- **D-15:** Late-joining students enter the current teacher step when the session
  is locked, with clear restored-state copy.
- **D-16:** If SSE remains unavailable but the SQLite snapshot is readable, fall
  back to manual or periodic classroom snapshot refresh. Do not exit classroom
  mode solely because the live stream is down.

### the agent's Discretion

- The agent may choose exact table names, DTO names, route handler naming,
  polling interval, and component split when the behavior above is preserved.
- The agent may decide whether preserved teacher attempts live in client state,
  action return payloads, or a lightweight pending-control DTO, as long as they
  are not auto-replayed after a conflict.
- The agent may choose the exact SSE event names and payload shape, but every
  event must be reconcilable with a durable session version or snapshot.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and requirements

- `.planning/PROJECT.md` — fixed project scope, stack, DAL, cache, runtime,
  database, realtime, and design constraints.
- `.planning/ROADMAP.md` — Phase 05 goal, dependencies, requirements, and
  success criteria.
- `.planning/REQUIREMENTS.md` — CLASS-01 through CLASS-07 requirement text and
  v1 out-of-scope boundaries.
- `AGENTS.md` — repository-specific implementation and GSD workflow rules.
- `DESIGN.md` — Lexend, Simplified Chinese, no-line surfaces, tonal layering,
  glass, gradient, and accessibility constraints.

### Phase context and design

- `.planning/phases/05-classroom-runtime-and-edge-sse/05-UI-SPEC.md` — approved
  UI design contract for teacher live control, student live player, locking,
  reconnection, conflict recovery, copy, color, typography, and spacing.
- `.planning/phases/04-student-player-progress-submissions-and-feedback/04-CONTEXT.md`
  — Phase 04 decisions for teacher-forced step priority, personal progress,
  submission preservation, and lightweight teacher review boundaries.
- `.planning/phases/03-courses-lessons-steps-and-teacher-authoring/03-CONTEXT.md`
  — published lesson snapshot and authoring decisions consumed by classroom
  sessions.
- `.planning/phases/02-auth-roles-schema-and-dal-boundary/02-CONTEXT.md` —
  RBAC/ABAC, route protection, DAL, DTO, and server-only boundary decisions.

### Existing implementation

- `src/components/surfaces/classroom-console-surface.tsx` — current static
  classroom console surface to convert into a DTO-backed teacher control UI.
- `src/app/(classroom)/classroom/page.tsx` — current classroom route entry point.
- `src/app/(classroom)/classroom/layout.tsx` — classroom route shell integration.
- `src/components/surfaces/player-surface.tsx` — existing student player shell,
  step rail, teacher-forced placeholder, and draft-preserving learning cards.
- `src/lib/dto/learning.ts` — existing `RuntimeStepStateDTO` placeholder with
  `forcedStepId` and `locked` fields, plus player DTO shape.
- `src/lib/dal/learning.ts` — current student player DAL, cached shell,
  streamed personal region, and teacher-forced resume precedence.
- `src/actions/learning-actions.ts` — Server Action validation and explicit
  `updateTag()` pattern for learning mutations.
- `src/lib/cache-policy.ts` — existing `classroom:${sessionId}` cache tag and
  route cache boundary vocabulary for `/student/player` and `/classroom`.
- `src/db/schema.ts` — current published lesson, progress, submission, quiz, and
  feedback schema baseline that Phase 05 extends with classroom tables.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `ClassroomConsoleSurface` already has the teacher-facing visual structure from
  the approved design language: lesson context, current step, lock mode, roster,
  and status cards. Phase 05 should replace demo data with classroom DTOs and
  Server Actions rather than rebuilding the page from scratch.
- `PlayerSurface` already resolves `runtime.forcedStepId` before personal resume
  state and renders the existing Phase 04 task, quiz, and content cards. Phase
  05 should extend this runtime field with durable classroom state and SSE
  reconciliation.
- `Button`, `Card`, `Badge`, and existing learning cards match the no-line
  tonal design system and should be reused for classroom controls and status
  panels.

### Established Patterns

- UI components receive sanitized DTOs only. Business reads and writes must go
  through DAL and Server Actions.
- Cached lesson shell data uses `use cache`, `cacheLife`, and `cacheTag` for
  published lesson structure. Request-specific progress and classroom state must
  stay streamed or dynamic.
- Server Actions validate inputs with Zod, call DAL methods, and explicitly
  update cache tags after successful mutations.
- Phase 04 already treats teacher-forced runtime as higher priority than
  personal resume state.

### Integration Points

- Teacher route: `/classroom` should become the live classroom console for
  selecting a published lesson, selecting one class roster, launching a session,
  changing active step, and switching lock mode.
- Student route: `/student/player` should keep its cached shell and streamed
  personal region, then add classroom runtime state and SSE reconciliation.
- Data layer: `src/db/schema.ts`, `src/lib/dal/*`, `src/lib/dto/*`, and
  `src/actions/*` are the natural places for classroom schema, DAL, DTOs, and
  mutations.
- Realtime: a new Edge Runtime route handler should stream classroom events, but
  durable state reads and writes remain in Node-side DAL and Server Actions.

</code_context>

<specifics>
## Specific Ideas

- The launch UI should make the class choice explicit because one course can
  have multiple simultaneous class sessions.
- Locked mode means "teacher controls navigation," not "student cannot work."
- Conflict recovery prioritizes safe teacher confirmation over automatic replay.
- Reconnect behavior prioritizes preserving current content and drafts, then
  reconciling against a durable snapshot before navigation changes.

</specifics>

<deferred>
## Deferred Ideas

- Multi-class merged classroom sessions are deferred beyond Phase 05.
- Class roster management, search, invitation flows, and ad hoc student adding
  are deferred unless a later phase scopes them.
- Full notifications, AI classroom control, gradebook behavior, WebSocket
  collaboration, and offline/mobile-native classroom mode remain out of scope.

</deferred>

---

*Phase: 05-classroom-runtime-and-edge-sse*
*Context gathered: 2026-05-05*
