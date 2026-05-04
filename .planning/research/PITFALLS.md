# Pitfalls Research

**Domain:** AI-native K-12 classroom workflow engine, teacher AI multi-agent
platform, RAG ecosystem, and declaration-only plugin/theme system
**Researched:** 2026-05-04
**Confidence:** HIGH for Next.js/Auth.js/Drizzle/Qdrant/MCP/SSE mechanics;
MEDIUM for classroom product pitfalls because they depend on local pilot data.

This file focuses on mistakes that can derail `OpenLearn Next` before roadmap
execution: stale classroom state, authorization leaks across school roles,
unsafe plugin/agent boundaries, brittle SQLite write paths, and classroom UX
that looks polished but fails under live teaching pressure.

## Critical Pitfalls

### Pitfall 1: Mixing cached public shells with user-specific classroom data

**What goes wrong:**
PPR and `"use cache"` speed up route rendering, but student progress, live
locked/unlocked state, draft lesson edits, and role-specific controls can leak
or become stale if they are cached in the same component tree as public course
or navigation data. A teacher may publish a step and still see the old lesson;
a student may see controls meant for a teacher; a locked classroom may remain
unlocked after a broadcast.

**Why it happens:**
Next.js 16 makes caching explicit, which is good, but teams often over-apply
`"use cache"` to server components without separating public, per-resource,
per-user, and live data. The project also requires PPR, so the static shell can
hide that user-specific content must sit behind `<Suspense>` boundaries and
runtime reads.

**How to avoid:**
Define cache ownership before building pages:

- Cache only stable, non-sensitive shells: navigation, marketing copy, public
  course frames, and immutable resource metadata.
- Never cache user-scoped reads unless the cache key and tag include the user,
  school, role, and resource scope.
- Use tag names with resource granularity, for example
  `lesson:{lessonId}`, `classroom:{sessionId}`, `progress:{userId}:{lessonId}`,
  and `submissions:{studentId}:{taskId}`.
- Use `updateTag()` inside Server Actions that must provide read-your-writes,
  such as lesson editor save, step reorder, publish, progress update, and task
  submission.
- Use `revalidateTag(tag, 'max')` from Route Handlers and background jobs where
  `updateTag()` is not allowed.
- Put progress, realtime status, submissions, and AI job status inside runtime
  `<Suspense>` islands. Keep the outer shell static.

**Warning signs:**

- A component uses `"use cache"` and imports `auth()`, `cookies()`, user role
  data, `StepProgress`, `TaskSubmissions`, or classroom session state.
- A Server Action mutates lesson/classroom/progress data without a nearby
  `updateTag()` or a documented invalidation call.
- QA must hard refresh after auto-save or after a teacher changes locked mode.
- Cache tags are broad, such as `lessons` or `user`, rather than scoped.

**Phase to address:**
Phase 1 application infrastructure and DAL conventions must define the cache
tag taxonomy. Phase 3 lesson editor and Phase 4 student PPR player must prove
read-your-writes behavior with tests.

**Severity / confidence:** CRITICAL / HIGH.

---

### Pitfall 2: Treating `proxy.ts` as the authorization layer

**What goes wrong:**
Routes appear protected, but Server Actions and DAL functions can still be
called with forged IDs, stale roles, or direct POSTs. Students can update
another student’s progress, parents can view unrelated children, plugins can
trigger teacher-only actions, or AI agents can read resources outside their
delegated scope.

**Why it happens:**
`proxy.ts` runs before route rendering and is useful for lightweight route
protection, but it is not a substitute for resource authorization. Next.js docs
explicitly warn that Server Functions are POST requests to the route where they
are used and that matcher changes can silently remove Proxy coverage. Server
Actions must re-check authentication and authorization.

**How to avoid:**
Build RBAC + ABAC into every DAL mutation and sensitive read:

- Require `{ userId, role, schoolId, resourceId, delegatedAgentId? }` in DAL
  auth context.
- Perform ownership and membership checks inside the DAL, not in UI components.
- Keep `proxy.ts` limited to session existence, redirects, coarse route groups,
  and simple logging.
- Add `import 'server-only'` to DAL modules.
- Return minimal DTOs; never return raw Drizzle rows to Client Components or
  Server Action responses.
- Unit test every role/resource pair for teacher, student, parent, developer,
  school admin, super admin, and AI agent.

**Warning signs:**

- Authorization checks appear only in page components or `proxy.ts`.
- Server Actions accept `lessonId`, `studentId`, `schoolId`, or `classroomId`
  and call Drizzle directly.
- Client props use raw database row types.
- Tests only check “logged in” and not “allowed for this resource.”

**Phase to address:**
Phase 1 Auth.js + DAL boundary must set the rule. Every later feature phase
must include role/resource authorization tests as a completion gate.

**Severity / confidence:** CRITICAL / HIGH.

---

### Pitfall 3: Role persistence drift between Auth.js sessions and database

**What goes wrong:**
A user’s role in the Auth.js session no longer matches the database, causing
privilege retention after a teacher leaves a class, a parent link changes, or a
developer/plugin permission is revoked. Conversely, legitimate users can lose
access if callbacks do not expose custom role fields consistently.

**Why it happens:**
Auth.js supports role exposure through callbacks and custom adapter schemas,
but role data is often treated as a simple session field. In this project, roles
are not global only; they are school-, class-, resource-, and delegation-scoped.

**How to avoid:**

- Store global role and scoped memberships in first-party Drizzle tables, not
  only in provider profile data.
- Treat `session.user.role` as a hint for UI, not final authorization.
- Resolve effective permissions in the DAL from current database state.
- Version role/membership records with `updatedAt` or permission revision so
  critical changes can invalidate sessions or force permission re-checks.
- Add a central `getEffectiveActor()` helper that supports human users and AI
  agents with delegated permissions.

**Warning signs:**

- Role is assigned only in an OAuth provider `profile()` callback.
- “School admin,” “teacher,” and “parent” are a single enum without scoped
  membership tables.
- Removing a user from a class does not invalidate access in an open tab.

**Phase to address:**
Phase 1 authentication schema and Phase 2 course/classroom data model.

**Severity / confidence:** CRITICAL / HIGH.

---

### Pitfall 4: Realtime classroom state without a durable event model

**What goes wrong:**
Live classroom control works in demos but fails in real classes. Students who
open the page late miss the current step. A reconnect replays stale commands.
Two teacher tabs fight over locked mode. A student in unlocked mode is forced
back unexpectedly. Classroom state diverges between SSE memory, SQLite, and the
rendered PPR player.

**Why it happens:**
SSE is one-way and reconnects automatically. It needs event IDs, keep-alives,
and a canonical state source. Teams often stream ephemeral events without
persisting enough state for late join, reconnect, idempotency, or audit.

**How to avoid:**

- Model classroom runtime as durable state plus append-only events:
  `ClassroomSession`, `ClassroomEvent`, `currentStepId`, `mode`, `version`,
  `teacherActorId`, and timestamps.
- Include monotonic `version` or event ID in every SSE payload and client ack.
- On SSE connect/reconnect, send a snapshot first, then stream deltas after the
  last known event ID.
- Make teacher commands idempotent with optimistic concurrency checks, for
  example `WHERE sessionId = ? AND version = ?`.
- Separate commands from events: students never mutate runtime state directly;
  they submit progress/submissions through Server Actions.
- Send SSE keep-alive comments and close streams when sessions end.
- Plan HTTP/2 or connection budgeting because browsers can cap SSE connections
  per domain when not using HTTP/2.

**Warning signs:**

- SSE route reads state only from in-memory variables.
- Event payloads lack `id`, `version`, `sessionId`, or `mode`.
- Reloading the student page after a teacher command shows a different state
  from the live stream.
- Multiple tabs create multiple active control authorities with no lease.

**Phase to address:**
Phase 4 student player must define state consumption. Phase 5 realtime
classroom console must implement durable state, event IDs, and reconnect tests.

**Severity / confidence:** CRITICAL / HIGH.

---

### Pitfall 5: Append-only submissions without correctness constraints

**What goes wrong:**
Historical submissions are preserved, but “latest” reads become wrong. Two
quick retries can both have `isLatest = true`; grading and AI analysis attach to
the wrong attempt; deletion cascades remove audit data unexpectedly; task edits
make old submissions impossible to interpret.

**Why it happens:**
Append-only is a domain requirement, but it still needs transaction boundaries,
versioned task schemas, and unique constraints. SQLite supports transactions
and unique indexes, but teams often implement `isLatest` as a convenience flag
without enforcing it.

**How to avoid:**

- Wrap submission write in a transaction: mark previous latest false, insert
  new attempt true, and update progress/cache tags atomically.
- Enforce a unique partial-index equivalent if available in the chosen SQLite
  path, or enforce with transaction + test if Drizzle dialect support is not
  sufficient.
- Store `attemptNo`, `taskVersion`, `stepVersion`, validated payload JSON, and
  `submittedAt`.
- Never update old submission payloads; append corrections as new events or
  review records.
- Keep `TaskSubmissions` cascade behavior intentional: deleting a task may be
  acceptable in local MVP, but production needs export/archive before cascade.

**Warning signs:**

- `TaskSubmissions` has `isLatest` but no transaction test under concurrent
  submits.
- The latest submission query uses `ORDER BY createdAt` only.
- Task content changes overwrite context needed to grade old attempts.
- AI feedback stores only a string, with no model/version/rubric reference.

**Phase to address:**
Phase 4 submissions and progress. Revisit before any grading, analytics, or
parent report phase.

**Severity / confidence:** CRITICAL / HIGH.

---

### Pitfall 6: SQLite write contention hidden by local demos

**What goes wrong:**
The first live class causes lock timeouts or slow saves when 30 to 50 students
submit at once while the teacher edits or broadcasts state. The MVP gets blamed
as unreliable even though the model works conceptually.

**Why it happens:**
SQLite is a good v1 choice for deployment simplicity, but high-frequency
classroom writes create bursts: progress pings, submissions, auto-save,
classroom events, AI job status, and plugin hooks. Without write budgeting and
indexes, SQLite becomes the bottleneck.

**How to avoid:**

- Keep progress writes coarse-grained: step completion, checkpoint, and submit,
  not every scroll or second.
- Batch or debounce lesson editor auto-save.
- Index all hot filters: `schoolId`, `classId`, `lessonId`, `sessionId`,
  `studentId`, `taskId`, `isLatest`, `createdAt`, and rank fields.
- Use transactions that are short and predictable.
- Move AI/RAG ingestion and plugin side effects to background jobs rather than
  blocking classroom actions.
- Run a classroom burst test before pilot: one teacher, 50 students, reconnects,
  submissions, and step broadcasts.

**Warning signs:**

- Server Actions perform AI calls or plugin hooks inside DB transactions.
- Auto-save writes every keystroke.
- Progress model has frequent heartbeat rows.
- No load test exists for simultaneous submissions.

**Phase to address:**
Phase 1 database conventions, Phase 3 editor auto-save, Phase 4 submissions,
and Phase 5 realtime.

**Severity / confidence:** CRITICAL / HIGH.

---

### Pitfall 7: RAG retrieval crossing school, class, or age boundaries

**What goes wrong:**
A teacher or AI tutor retrieves content from another school, another class, a
private student submission, copyrighted material, or age-inappropriate content.
The answer looks plausible, so the leak is hard to notice until a parent or
school reports it.

**Why it happens:**
Vector search feels semantic, but access control remains exact. Qdrant supports
payload filtering and payload indexes, yet teams often store all chunks in one
collection and rely on prompt instructions rather than mandatory filters.

**How to avoid:**

- Every vector point must carry payload fields such as `tenantId`, `schoolId`,
  `resourceId`, `visibility`, `gradeBand`, `subject`, `sourceLicense`, and
  `studentDataClass`.
- Every query must include a mandatory filter derived from DAL authorization.
- Create payload indexes for hot filters such as `schoolId`, `visibility`,
  `gradeBand`, `subject`, and `resourceId`.
- Store source citations and chunk IDs in every AI response.
- Keep student-generated data out of default teacher knowledge retrieval unless
  a specific analysis flow requests it and has consent/authorization.

**Warning signs:**

- Retrieval functions accept free-form filters from prompts or client input.
- Qdrant points have only `text` and `embedding` payloads.
- AI responses have no citations or source IDs.
- “Global knowledge base” is used before tenant filtering is implemented.

**Phase to address:**
Phase 6 AI/RAG foundation must define tenant filters before any agent feature
ships. Retrieval evaluation must include cross-tenant negative tests.

**Severity / confidence:** CRITICAL / HIGH.

---

### Pitfall 8: Excessive agency in teacher AI multi-agent workflows

**What goes wrong:**
Agents generate lessons, homework, parent messages, classroom interventions, or
analytics that teachers trust too much. The platform accidentally sends wrong,
biased, private, or age-inappropriate content. Multi-agent chains make it hard
to know which agent made the bad decision.

**Why it happens:**
Agent demos reward autonomy, but K-12 workflows require human accountability.
OWASP LLM guidance highlights prompt injection, insecure output handling,
sensitive information disclosure, excessive agency, insecure plugin design, and
overreliance as major LLM risks.

**How to avoid:**

- Make AI output draft-first by default. Teacher approval is required for
  publishing lesson content, sending parent messages, changing grades, or
  triggering classroom actions.
- Define capability scopes per agent: read lesson, draft quiz, summarize
  submissions, propose intervention, never “full teacher.”
- Store agent trace metadata: input sources, retrieved chunks, model, prompt
  version, tool calls, confidence rubric, and reviewer decision.
- Add red-team fixtures for prompt injection in PDFs, student submissions,
  plugin manifests, and MCP tool responses.
- Use structured output schemas and validate with Zod before showing or acting
  on AI output.

**Warning signs:**

- Agent tools can call the same Core API actions as teachers without a
  delegation token and action allowlist.
- AI-generated content can be published in one click without source review.
- No rejected-output examples exist in evaluation data.
- Parent-facing or student-facing messages lack teacher approval status.

**Phase to address:**
Phase 6 AI Agent foundation. Any later phase that exposes AI output to
students, parents, or classroom state must add evaluation gates.

**Severity / confidence:** CRITICAL / HIGH.

---

### Pitfall 9: Unsafe MCP trust boundaries

**What goes wrong:**
MCP integrations with Moodle, GitHub, Notion, enterprise chat, or development
tools become data exfiltration paths. A malicious or compromised MCP server can
abuse OAuth proxy flows, SSRF metadata discovery, token passthrough, broad
scopes, or session hijacking. Local MCP servers can run arbitrary commands.

**Why it happens:**
MCP connects agents to external systems, so it is easy to treat it as “just a
tool bridge.” The MCP security guidance explicitly calls out confused deputy,
token passthrough, SSRF, session hijacking, local server compromise, and scope
inflation.

**How to avoid:**

- Do not accept token passthrough. Tokens must be issued for the MCP server or
  integration boundary that validates them.
- Require exact redirect URI matching, per-client consent, CSRF/state checks,
  and short-lived state values for OAuth-style flows.
- Block private IP ranges and metadata endpoints for server-side URL discovery;
  require HTTPS in production.
- Bind MCP sessions/events to authenticated user ID plus session ID, not a
  client-provided session ID alone.
- Use least-privilege scopes and incremental elevation. Never request `all`,
  wildcard, or full-account scopes by default.
- For local MCP configuration, show the exact command, require explicit
  consent, and sandbox or disallow local execution in school-hosted deployments.

**Warning signs:**

- MCP connector code follows redirects from arbitrary metadata URLs.
- A connector stores broad OAuth tokens without scope-level audit.
- Tool calls are logged without actor, tenant, resource, and purpose.
- Local MCP server setup is copy-paste shell commands in the UI.

**Phase to address:**
Phase 6 MCP integration design. Do not add third-party MCP connectors before
the integration security model is documented and tested.

**Severity / confidence:** CRITICAL / HIGH.

---

### Pitfall 10: Plugin system accidentally becomes code execution

**What goes wrong:**
The declared “JSON plugin” model slowly grows escape hatches: custom scripts,
dynamic imports, SQL snippets, arbitrary URLs, or unrestricted Core API calls.
One plugin can exfiltrate student data, change classroom state, or run expensive
AI jobs.

**Why it happens:**
Plugin ecosystems face pressure for flexibility. Without a strict manifest
schema and capability model, “temporary” extension points become a security
boundary bypass. OWASP also flags insecure plugin design as a major LLM app
risk.

**How to avoid:**

- Keep plugins declaration-only: JSON manifest, theme tokens, declared hooks,
  and approved actions. No `eval()`, arbitrary JS, user-defined SQL, or direct
  DB/Core API access.
- Validate manifests with a versioned Zod schema at install and at runtime.
- Require explicit permissions: events subscribed, actions callable, resources
  readable, rate limits, and tenant scope.
- Execute `Event -> Hook -> Action -> Core API` through a broker that checks
  plugin permissions and actor permissions together.
- Add plugin signing or trusted registry metadata before third-party sharing.
- Provide a kill switch per plugin and per tenant.

**Warning signs:**

- Plugin manifest includes `script`, `url`, `sql`, `functionBody`, or dynamic
  condition expressions.
- Hook handlers receive raw database objects instead of DTOs.
- Permission prompts say “access everything” or do not list affected data.
- Plugin code runs in the same transaction as core classroom actions.

**Phase to address:**
Phase 7 plugin/theme system must implement schema validation, capability
checks, event broker, rate limits, and audit logs before any plugin marketplace
or third-party extension work.

**Severity / confidence:** CRITICAL / HIGH.

---

### Pitfall 11: LexoRank reorder logic without collision and rebalance plans

**What goes wrong:**
Drag-and-drop ordering works initially, then ranks become too dense, duplicate,
or inconsistent after concurrent teacher edits. Steps appear in different order
for teacher and student, and cache invalidation masks the bug.

**Why it happens:**
LexoRank avoids cascading row updates, but it still needs uniqueness,
transactional moves, conflict handling, and occasional rebalance.

**How to avoid:**

- Enforce unique `(lessonId, rank)` and stable `(lessonId, stepId)` constraints.
- Move a step in a transaction with version check on the lesson or step list.
- Add a deterministic tie-breaker such as `createdAt` only for recovery, not as
  normal ordering.
- Implement rank rebalance as an explicit maintenance action with audit.
- Invalidate `lesson:{lessonId}` and any student player tags after reorder.

**Warning signs:**

- Reorder writes only the moved step and does not check lesson version.
- Two tabs can reorder simultaneously without conflict UI.
- Sorting uses rank but there is no unique constraint.

**Phase to address:**
Phase 3 teacher editor.

**Severity / confidence:** HIGH / MEDIUM.

---

### Pitfall 12: Beautiful classroom UI that fails under teaching pressure

**What goes wrong:**
The UI matches a premium design but teachers cannot quickly answer: “where are
we, who is stuck, what happens if I press this, and can I recover?” Students get
lost in immersive mode. Accessibility suffers because “no-line” design reduces
structure and focus visibility.

**Why it happens:**
The `The Luminous Academy` design system intentionally avoids 1px dividers and
uses tonal layering, glassmorphism, gradients, and asymmetry. This can produce
excellent product feel, but live classrooms need high signal, strong state
feedback, and low cognitive load.

**How to avoid:**

- Preserve the no-line design, but use tonal islands, whitespace, typography,
  and clear state chips for structure.
- Make classroom mode, current step, sync status, unsaved draft status, and
  locked/unlocked state always visible.
- Provide explicit recovery actions: undo step jump, resume from snapshot,
  resend broadcast, retry failed save, and exit immersive mode.
- Keep critical controls reachable with keyboard and visible focus states using
  the approved ghost-border fallback.
- Test with Simplified Chinese copy length, lower-end classroom projectors, and
  small student devices.

**Warning signs:**

- Live classroom control relies on hover-only menus or subtle color changes.
- Focus rings are removed to preserve aesthetics.
- Teacher console lacks a “student view” preview.
- Status text is generic, such as “syncing,” without action or recovery.

**Phase to address:**
Every UI phase. Phase 3 editor, Phase 4 player, and Phase 5 console need
classroom-pressure UX checks.

**Severity / confidence:** HIGH / MEDIUM.

---

## Technical Debt Patterns

Shortcuts that look acceptable in a greenfield MVP can harden into boundaries
that are expensive to repair later.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Querying Drizzle directly from Server Components | Fast prototype | Permission checks and DTO filtering fragment across UI | Never for project code; only throwaway spike |
| Broad cache tags like `lessons` | Fewer invalidation calls | Stale data or over-invalidation across classrooms | Never after Phase 1 |
| Role stored only in Auth.js session | Simple UI branching | Revocation and scoped membership leaks | UI hint only, never authorization |
| In-memory classroom state | Quick SSE demo | Late join/reconnect fails, no audit, multi-instance breakage | Local spike only |
| Updating submissions in place | Easier grading UI | Loses history and invalidates learning analytics | Never; use append-only corrections |
| Plugin “escape hatch” JavaScript | Flexible demos | Remote code execution and data exfiltration | Never in v1 scope |
| AI output without trace metadata | Faster agent development | No evaluation, audit, or rollback path | Never for student/parent-facing output |
| One global vector collection without filters | Simplifies RAG ingestion | Cross-tenant and privacy leaks | Only with mandatory payload filters from day one |
| Auto-save every keystroke | Feels live | SQLite lock contention and noisy history | Use debounce and semantic saves |
| Ignoring design accessibility fallback | Cleaner visuals | Keyboard and low-vision users fail critical flows | Never |

## Integration Gotchas

Integration boundaries are high-risk because they combine school data, OAuth,
AI tools, and untrusted external systems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Next.js cache/PPR | Caching user progress or role-specific content in the static shell | Static shell only; runtime Suspense islands for user/live data |
| Auth.js + Drizzle | Treating session role as final authority | Resolve effective permissions from scoped DB memberships in DAL |
| Drizzle + SQLite | Missing indexes and transactional latest-submission writes | Add hot-path indexes and transaction tests |
| Edge SSE | Keeping classroom state only in stream memory | Persist snapshot and events; stream deltas with event IDs |
| Qdrant RAG | Prompt-based tenant filtering | Mandatory payload filters and payload indexes |
| MCP OAuth | Token passthrough or broad scopes | Audience-bound tokens, per-client consent, exact redirect matching |
| Plugin hooks | Passing raw DB rows to hooks | Pass minimal DTOs through an audited broker |
| AI agents | Letting agents call teacher actions directly | Delegated capability tokens plus human approval for high-impact actions |
| PDF/resource ingestion | Trusting embedded text and metadata | Treat all content as untrusted; sanitize and test prompt injection |
| Enterprise chat | Sending parent/student data to broad channels | Require recipient verification, audit, and explicit teacher approval |

## Performance Traps

These patterns work in a single-user demo and fail in the first realistic
classroom pilot.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-student heartbeat writes | SQLite locks, slow progress UI | Write semantic progress events only | 30 students × frequent pings |
| AI calls inside Server Actions for classroom flows | Teacher clicks hang; retries duplicate work | Queue AI jobs and stream job status | Any slow model or provider outage |
| N+1 RAG retrieval per student | Cost spikes and slow tutor responses | Batch retrieval and cache safe shared context | Whole-class AI analysis |
| Broad `revalidateTag()` after every edit | Pages flicker; server load spikes | Resource-scoped tags and `updateTag()` for local writes | Active lesson editing |
| Multiple SSE connections per tab/component | Browser connection cap; missed events | One classroom event source per session and internal fan-out | Several tabs/components under HTTP/1.1 |
| LexoRank without rebalance | Long rank strings or collisions | Rebalance and unique constraints | Heavy drag-and-drop editing |
| Plugin hooks synchronous with core writes | Slow saves and partial failures | Async hook queue with retry and dead-letter records | Multiple plugins installed |
| Large server action return payloads | Slow hydration, data leak risk | Return `{ success, id, version }` style DTOs | Submission and AI feedback flows |

## Security Mistakes

These are domain-specific issues beyond generic web security. They combine
student privacy, classroom authority, AI agents, and extensibility.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Page/proxy-only auth | Direct Server Action calls mutate protected resources | Re-authorize inside every Server Action and DAL function |
| Raw DB rows passed to client components | Student PII and internal fields leak | DTO minimization and `server-only` DAL |
| Cross-tenant vector retrieval | School data leak through AI answer | Mandatory Qdrant payload filters and negative tests |
| Plugin wildcard permissions | Student data exfiltration or classroom control abuse | Versioned manifest schema, action allowlist, tenant scope, audit |
| MCP token passthrough | Control bypass and poor audit trail | Validate token audience; issue tokens for the MCP boundary |
| SSRF in MCP discovery or ingestion URLs | Cloud metadata or internal service exposure | Block private IP ranges, validate redirects, require HTTPS |
| Agent excessive agency | Wrong content/actions published as teacher | Human approval, delegated scopes, trace metadata |
| Prompt injection from PDFs/submissions/plugins | Tool misuse and data disclosure | Treat all retrieved content as untrusted; structured outputs and tool policy |
| Parent/student relationship modeled loosely | Parent sees unrelated child data | Scoped guardian links with verification and expiration |
| Missing audit logs for high-impact actions | No incident reconstruction | Audit role, actor, resource, before/after version, request ID |

## UX Pitfalls

Classroom workflow UX must optimize trust, recovery, and attention, not only
visual polish.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Locked/unlocked mode is subtle | Students and teachers do not know who controls navigation | Persistent mode chip, explanation text, and transition animation |
| Auto-save status is hidden | Teachers close tabs and lose lesson edits | Always-visible save state with retry and last-saved time |
| Immersive student player hides exits | Younger students get stuck | Clear exit/resume controls and keyboard escape path |
| AI confidence shown as magic | Teachers over-trust output | Show sources, limitations, and approval state |
| No-line design removes focus affordance | Keyboard users cannot operate live controls | Use ghost-border focus fallback and tonal state changes |
| Teacher console lacks recovery | Live class disruption after misclick | Undo, resend, pause, and snapshot restore controls |
| Chinese copy squeezed into English-sized cards | Key labels truncate | Test Simplified Chinese strings and responsive card layouts |
| Student errors use technical language | Students freeze or ask teacher for every issue | Use age-appropriate messages and teacher-visible diagnostics |

## "Looks Done But Isn't" Checklist

These items often pass demos but fail production or pilot classrooms.

- [ ] **Cache invalidation:** Every write path lists exact tags updated or
  revalidated; editor and player show read-your-writes without hard refresh.
- [ ] **Authorization:** Every DAL read/write has role, resource, tenant, and
  ownership tests; `proxy.ts` is not the only guard.
- [ ] **Auth.js roles:** Session role is UI-only; scoped memberships are stored
  and resolved from the database.
- [ ] **PPR boundaries:** Public shells are separated from progress, classroom
  state, submissions, and user controls.
- [ ] **SSE reconnect:** Late join and reconnect receive snapshot plus deltas;
  event IDs and versions are persisted.
- [ ] **Append-only submissions:** Concurrent submits cannot produce two latest
  attempts; task versions are retained.
- [ ] **SQLite pilot load:** A 50-student burst test passes for save, submit,
  progress, and broadcast flows.
- [ ] **RAG isolation:** Cross-school and cross-class retrieval tests return no
  forbidden chunks.
- [ ] **AI evaluation:** Prompt-injection, hallucination, age-appropriateness,
  citation, and refusal tests exist before student-facing AI.
- [ ] **MCP safety:** Connectors have scope minimization, redirect validation,
  SSRF controls, and no token passthrough.
- [ ] **Plugin safety:** Manifests are schema-validated; no dynamic code or raw
  Core API/DB access exists.
- [ ] **Design accessibility:** The no-line UI still has visible focus,
  contrast, state, and recovery affordances.
- [ ] **Audit trail:** High-impact actions record actor, delegated actor,
  resource, version, before/after, and correlation ID.

## Recovery Strategies

When prevention fails, recovery depends on whether the issue corrupted data,
leaked data, or only created stale UI.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stale cached classroom/progress data | MEDIUM | Disable affected cache tags, add scoped tags, backfill tests, and ship read-your-writes regression suite |
| Permission leak | HIGH | Freeze affected endpoints, rotate sessions/tokens, audit access logs, add DAL checks, notify stakeholders if data exposure occurred |
| Realtime divergence | MEDIUM | Pick DB snapshot as source of truth, rebuild event stream from persisted state, add version checks |
| Duplicate latest submissions | MEDIUM | Recompute latest by attempt/version, add constraints/transaction tests, preserve all attempts |
| SQLite contention | MEDIUM | Reduce write frequency, add indexes, move hooks/AI to queues, run pilot load test again |
| Cross-tenant RAG leak | HIGH | Disable retrieval collection, purge/reindex with payload filters, audit AI outputs, add negative evals |
| Unsafe MCP connector | HIGH | Revoke tokens, disable connector, audit tool calls, implement consent/scope/SSRF controls |
| Plugin privilege escalation | HIGH | Kill switch plugin, audit actions, rotate secrets, tighten manifest/action allowlist |
| AI harmful output | MEDIUM/HIGH | Remove or mark output, trace sources/tool calls, update eval set, require stricter human approval |
| Classroom UX failure in pilot | LOW/MEDIUM | Add visible state/recovery controls, run teacher walkthrough, prioritize live-class fixes over cosmetic polish |

## Pitfall-to-Phase Mapping

Roadmap phases must prevent these issues early. Security and data boundaries
must come before feature breadth.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Cached public shell mixed with user/live data | Phase 1 cache/DAL conventions; Phase 4 player | Cache tag map, PPR boundary review, read-your-writes tests |
| `proxy.ts` used as authorization | Phase 1 Auth.js + DAL | Role/resource matrix tests for every DAL function |
| Auth.js role drift | Phase 1 auth schema | Revocation test: role/membership change affects next action |
| Realtime state divergence | Phase 5 classroom console | Late join, reconnect, multi-tab, and version conflict tests |
| Append-only latest correctness | Phase 4 submissions | Concurrent submit test and latest invariant check |
| SQLite write contention | Phase 1 DB setup; Phase 3-5 hot paths | 50-student burst test with save/submit/broadcast |
| RAG tenant leak | Phase 6 AI/RAG foundation | Negative retrieval tests across school/class/student scopes |
| Excessive AI agency | Phase 6 agents | Human-approval gates and trace/eval records for high-impact actions |
| MCP unsafe boundaries | Phase 6 MCP design | Connector security checklist and SSRF/token/scope tests |
| Plugin code execution drift | Phase 7 plugin/theme system | Manifest schema tests, permission broker tests, no dynamic code scan |
| LexoRank collisions | Phase 3 teacher editor | Concurrent reorder and rebalance tests |
| Classroom UX under pressure | Phase 3-5 UI implementation | Teacher scenario walkthrough and accessibility checks |

## Sources

- Project constraints: `.planning/PROJECT.md`, read on 2026-05-04.
- UI constraints: `DESIGN.md`, read on 2026-05-04.
- Next.js 16 documentation via Context7 and official docs: `updateTag()` is for
  Server Actions and read-your-writes; `revalidateTag()` is used from Server
  Actions or Route Handlers; PPR/static shell patterns use runtime Suspense for
  personalized data.
- Next.js Proxy documentation, version 16.2.4, last updated 2026-04-10:
  `https://nextjs.org/docs/app/api-reference/file-conventions/proxy`.
- Next.js data security guide, version 16.2.4, last updated 2026-04-10:
  `https://nextjs.org/docs/app/guides/data-security`.
- Auth.js documentation via Context7: role callbacks and Drizzle adapter custom
  schema support.
- Drizzle documentation via Context7: SQLite unique indexes, constraints,
  indexes, and `onDelete: 'cascade'` references.
- Qdrant documentation via Context7: payload filtering and payload indexes for
  filtered vector search.
- MDN Server-Sent Events guide, last modified 2025-05-15:
  `https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events`.
- MCP security best practices, fetched from official MCP docs on 2026-05-04:
  `https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices`.
- OWASP Top 10 for Large Language Model Applications / OWASP GenAI Security
  Project, fetched on 2026-05-04:
  `https://owasp.org/www-project-top-10-for-large-language-model-applications/`.

---
*Pitfalls research for: OpenLearn Next*
*Researched: 2026-05-04*
