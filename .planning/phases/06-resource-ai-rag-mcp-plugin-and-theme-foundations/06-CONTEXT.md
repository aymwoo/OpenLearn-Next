# Phase 06: Resource, AI/RAG/MCP, plugin, and theme foundations - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 06 establishes safe, auditable foundations for the resource center, AI agent interfaces, RAG metadata contracts, MCP registration, declarative plugins, and theme tokens. It should create durable schemas, DTOs, DAL boundaries, Server Actions, minimal UI surfaces, and verification gates that make future AI/RAG/MCP/plugin work possible without granting raw database access, arbitrary code execution, or unapproved student-visible changes.

This phase does not implement production file upload/storage, PDF parsing, automatic chunking, real embedding generation, real Qdrant search, real MCP connector calls, real LLM provider calls, autonomous AI classroom control, plugin marketplace, arbitrary plugin JavaScript execution, native app workflows, full gradebook, or production-grade multimodal textbook RAG.

</domain>

<decisions>
## Implementation Decisions

### Resource center scope

- **D-01:** The minimal resource center stores links and metadata only. It should not implement local file uploads, file storage, previews, virus scanning, PDF parsing, or automatic content extraction in Phase 06.
- **D-02:** Resources are created by teachers and scoped by `ownerId`, `schoolId`, optional `courseId`, and `visibility`. The minimum visibility model should support private, course-visible, and school-visible resources.
- **D-03:** Resource records should include a textbook-oriented classification metadata layer:学段/grade, subject, textbook version/source,册次/volume, chapter or unit labels, and knowledge tags. This is metadata only, not a production textbook parsing system.
- **D-04:** The resource center UI should be a teacher-facing resource card library, evolving the existing `/resources` `LibrarySurface` from demo cards into DTO-backed cards showing ownership, classification metadata, visibility, and RAG eligibility.

### RAG retrieval boundary

- **D-05:** Phase 06 RAG completion means a Qdrant-ready contract, not a real Qdrant integration. Implement `KnowledgeSource`, chunk metadata contracts, retrieval filter DTOs, and adapter interfaces; do not require embedding generation or live search.
- **D-06:** Default retrieval filters must include `schoolId`, `courseId`, `visibility`, `resourceId`, `grade`, and `subject`. The safe default is same-school, same-course, visible resources only.
- **D-07:** Add chunk metadata placeholders rather than generating chunks. Chunk contracts should include source ID, chunk index, text hash, token estimate, payload/metadata, and embedding/indexing status.
- **D-08:** `ragEligible` defaults to false. Teachers explicitly mark resources as RAG eligible before they can enter any future AI context.

### AI Agent boundary

- **D-09:** Phase 06 implements AI Agent interfaces and audit contracts only. It does not call real LLM providers or ship LessonAgent beta generation.
- **D-10:** LessonAgent, HomeworkAgent, DataAgent, TutorAgent, and ParentAgent should be represented through a unified agent registry with capability manifests and feature flags, not five unrelated table families.
- **D-11:** AI/MCP outputs must become proposals plus audit logs. Store structured output JSON, target reference, status, approval state, actor/context metadata, and timestamps so future approval flows can reuse them.
- **D-12:** Teacher approval is required before any AI-generated or MCP-derived content can change lessons, classroom state, or student-visible output.

### MCP trust model

- **D-13:** Phase 06 implements MCP server, credential, capability, and audit metadata plus a server-side adapter boundary. It does not perform real external connector calls.
- **D-14:** MCP credentials store references only, not secret values. Use `credentialRef`, provider, status, and scopes; real secrets stay in environment variables or a future vault.
- **D-15:** MCP capabilities are disabled by default and require explicit authorization. Capability records should include enabled state, allowed roles, and school/course scoping.
- **D-16:** MCP audit logs should be request-level: actor ID, server ID, capability ID, target reference, status, denied reason, timestamp, and non-sensitive summary. Do not store full sensitive input/output payloads by default.

### Plugin and theme foundations

- **D-17:** Plugin registration uses declarative JSON manifests with `id`, `name`, `version`, `type`, `permissions`, `hooks`, `actions`, `uiSlots`, optional `themeTokens`, and enabled/kill-switch state.
- **D-18:** Plugin manifests may declare actions, but executable handlers must be system-owned allowlisted TypeScript handlers. Do not implement third-party plugin code loading, `eval()`, remote dynamic imports, or arbitrary local plugin modules in Phase 06.
- **D-19:** The minimum UI hook anchors are `dashboard.widget` and `lesson.sidebar`. Do not introduce broad player/classroom/admin hook surfaces yet.
- **D-20:** The initial plugin action allowlist should contain low-risk internal actions such as `addStepSuggestion`, `annotateLesson`, and `createNotificationStub`. These actions should write proposal/audit records and must not directly mutate student-visible state.
- **D-21:** Theme support is a safe token registry. Store declarative color, surface role, radius, and typography mappings; validate against `DESIGN.md` constraints and compile/apply through CSS variables rather than arbitrary CSS or scripts.

### the agent's Discretion

- The agent may choose exact table names, DTO names, component splits, and verification script organization when the decisions above remain intact.
- The agent may decide whether AI/RAG/MCP/plugin audit logs share a generic audit table or use domain-specific audit tables, as long as denied actions, approvals, and actor/resource scope are queryable.
- The agent may design exact resource card layout and filters using existing `Card`, `Badge`, `Button`, and tonal surface primitives, provided it follows `DESIGN.md` and keeps teacher-facing resource management minimal.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and requirements

- `.planning/PROJECT.md` — fixed stack, SQLite-first database, DAL/Server Actions boundary, explicit caching, Edge-only realtime constraint, plugin security constraints, and design system source.
- `.planning/ROADMAP.md` — Phase 06 goal, dependencies, requirements, and success criteria.
- `.planning/REQUIREMENTS.md` — AI-01 through AI-07 and PLUGIN-01 through PLUGIN-07 requirement text, plus v1/v2 out-of-scope boundaries.
- `AGENTS.md` — repository-specific implementation rules and GSD workflow constraints.
- `DESIGN.md` — Lexend, Simplified Chinese, no-line tonal surfaces, glass/gradient accents, accessibility, and Stitch-derived visual language.

### Prior phase context

- `.planning/phases/05-classroom-runtime-and-edge-sse/05-CONTEXT.md` — durable classroom state, Edge SSE, locked/unlocked runtime, conflict recovery, and student snapshot decisions; Phase 06 must not introduce autonomous AI classroom control.
- `.planning/phases/04-student-player-progress-submissions-and-feedback/04-CONTEXT.md` — append-only submissions, lightweight feedback, teacher-forced runtime priority, and no gradebook scope.
- `.planning/phases/03-courses-lessons-steps-and-teacher-authoring/03-CONTEXT.md` — published lesson snapshots, stable lesson/step payloads, material references, LexoRank ordering, and DAL/DTO authoring patterns.
- `.planning/phases/02-auth-roles-schema-and-dal-boundary/02-CONTEXT.md` — RBAC/ABAC, proxy, DAL, DTO, and server-only authorization boundary decisions.

### Existing implementation

- `src/components/surfaces/library-surface.tsx` — current demo resource/course card library to convert into DTO-backed teacher resource cards.
- `src/app/(library)/resources/page.tsx` — resource center route entry point.
- `src/lib/demo-data.ts` — current `resourceCards` demo data to replace with real DTOs.
- `src/lib/dto/lesson-authoring.ts` — existing `materialRefSchema` and lesson material DTO style that Phase 06 should align with.
- `src/lib/dal/lesson-authoring.ts` — established server-only teacher scope, DTO shaping, published snapshot, and material read patterns.
- `src/db/schema.ts` — current auth, school, course, lesson, material, learning, and classroom tables that Phase 06 extends with resource, AI, RAG, MCP, plugin, and theme tables.
- `src/lib/cache-policy.ts` — route cache boundary for `/resources` and existing cache tag vocabulary.
- `src/lib/navigation.ts` — existing resource center nav entry for public, teacher, and admin shells.
- `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/skeleton.tsx` — local primitives to reuse for resource, plugin, MCP, and theme UI.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `LibrarySurface` already provides the Stitch-aligned card-library frame for `/resources`; Phase 06 should replace `demo-data` with resource DTOs and add metadata/visibility/RAG eligibility states rather than redesigning the surface.
- `lesson-authoring` DAL already provides `assertActiveTeacher`, school access checks, DTO parsing, and material reads. Resource DAL should mirror these patterns and remain server-only.
- `lessonStepPayloadSchema` already includes `materialRefs`; resource records should be designed so future lesson material references can point to real resource IDs without changing student/classroom flows.
- `Button`, `Card`, `Badge`, and `Skeleton` already enforce the no-line tonal design language and should be reused.

### Established Patterns

- UI/RSC components receive sanitized DTOs only and must not import database clients or schema tables directly.
- Server Actions validate with Zod, call server-only DAL modules, and update explicit cache tags after successful writes.
- Published lesson snapshots and classroom runtime both treat durable SQLite state as the source of truth; AI/RAG/MCP/plugin foundations should follow the same durable-audit-first posture.
- Request-specific or permission-sensitive data should be streamed/dynamic under Suspense, while public/static shells can use explicit cache tags.

### Integration Points

- Resource route: `src/app/(library)/resources/page.tsx` and `LibrarySurface` become the teacher-facing resource center.
- Data layer: `src/db/schema.ts`, `src/lib/dto/*`, `src/lib/dal/*`, and `src/actions/*` receive resource, AI, RAG, MCP, plugin, and theme contracts.
- Authoring integration: lesson material refs and future step suggestions should connect to resources/proposals through DTOs, not direct DB access from UI.
- Admin/developer visibility: plugin, MCP, AI, and theme foundations may need minimal developer/admin-oriented panels or sections, but Phase 06 should keep them declarative and audit-focused.

</code_context>

<specifics>
## Specific Ideas

- Resource cards should surface title, type/classification, subject, grade, course scope, visibility, owner, and RAG eligibility.
- Resource type taxonomy should feel textbook-aware through metadata, without implementing textbook upload/parsing.
- RAG contracts should make cross-school and cross-course retrieval impossible by default.
- AI/MCP/plugin outputs should accumulate as proposals and audit entries before any teacher-visible or student-visible mutation is possible.
- Plugin “local code” in Phase 06 means core-owned allowlisted action handlers, not loadable third-party plugin modules.

</specifics>

<deferred>
## Deferred Ideas

- Production file upload/storage, local file cleanup, preview generation, virus scanning, and CDN delivery are deferred.
- PDF parsing, automatic chunking, embedding generation, real Qdrant upsert/search, citation rendering, and RAG evaluation are deferred.
- Real LLM provider calls, LessonAgent beta generation, HomeworkAgent authoring, TutorAgent chat, ParentAgent summaries, and autonomous AI classroom control are deferred.
- Real MCP connector execution, OAuth flows, secret vaulting, credential rotation, and production Moodle/GitHub/Notion/WeCom/DingTalk integrations are deferred.
- Third-party plugin code execution, plugin marketplace, broad hook anchors, arbitrary CSS/theme editing, and full visual theme editor are deferred.

</deferred>

---

*Phase: 06-resource-ai-rag-mcp-plugin-and-theme-foundations*
*Context gathered: 2026-05-05*
