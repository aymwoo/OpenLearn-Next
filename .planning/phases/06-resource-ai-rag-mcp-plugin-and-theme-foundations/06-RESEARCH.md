# Phase 06 research: Resource, AI/RAG/MCP, plugin, and theme foundations

**Status:** Complete  
**Phase:** 06-resource-ai-rag-mcp-plugin-and-theme-foundations  
**Date:** 2026-05-05

## Research question

What does Phase 06 need to plan well while honoring the project constraints:
Next.js 16 App Router, Auth.js v5, Drizzle + SQLite, DAL + Server Actions only,
explicit cache tags, and a declarative plugin/theme safety model?

## Existing project patterns to reuse

- Schema lives in `src/db/schema.ts` and uses Drizzle `sqliteTable`, `text`,
  `integer`, `index`, `uniqueIndex`, and cascade FKs for parent-owned records.
- DTO contracts live in `src/lib/dto/*.ts` and use Zod as the boundary validator.
- Server-only data access lives in `src/lib/dal/*.ts` and starts with
  `import "server-only";`.
- Server Actions live in `src/actions/*.ts`, start with `"use server";`, validate
  inputs with `safeParse`, call DAL functions, and call `updateTag()` after
  successful writes.
- Phase verification scripts live in `scripts/verify-phase*.ts`, inspect source
  invariants, avoid comment-sensitive gates, and are wired through `package.json`.
- `/resources` currently renders `LibrarySurface` from demo `resourceCards`; Phase
  06 should convert this into a DTO-backed teacher resource center rather than
  redesigning the surface.

## Standard stack for this phase

| Area | Decision | Reason |
|------|----------|--------|
| Resource center | Drizzle tables + Zod DTO + server-only DAL + Server Actions | Matches existing authoring/learning boundaries and avoids UI DB access. |
| AI agent registry | Capability manifest table, run/proposal table, audit table, typed adapter interfaces | Phase 06 is contract/audit only, not provider execution. |
| RAG | `KnowledgeSource` and chunk metadata contracts plus retrieval filter DTOs | Gives Qdrant-ready safety filters without embedding/search work. |
| MCP | Server, credential reference, capability, and audit metadata behind `server/ai/mcp` adapter boundary | Keeps secrets out of DB and avoids live connector calls. |
| Plugins | Declarative manifest JSON validated by Zod; allowlisted system-owned handlers only | Enforces no `eval`, no remote code, no direct DB/API access. |
| Themes | Declarative token registry validated against `DESIGN.md`; CSS-variable compiler only | Prevents arbitrary CSS/script injection while preserving visual language. |

## Architecture patterns

### Resource center

- Add a `resources` table with `ownerId`, `schoolId`, nullable `courseId`,
  `visibility`, textbook metadata, `ragEligible`, and link-only `url` metadata.
- Use a teacher-scoped DAL that mirrors `assertActiveTeacher()` and school access
  checks from `src/lib/dal/lesson-authoring.ts`.
- Return sanitized `ResourceCardDTO` rows to `LibrarySurface`; do not pass raw DB
  rows to UI.
- Use cache tags such as `resource:${id}` and `resources:${schoolId}`. Writes
  must call `updateTag()` for read-your-writes freshness.

### RAG and Qdrant-ready contracts

- Model `KnowledgeSource` and `KnowledgeChunk` metadata in SQLite, but treat
  Qdrant as a future adapter boundary.
- Retrieval filters must include `schoolId`, `courseId`, `visibility`,
  `resourceId`, `grade`, and `subject` by default.
- Safe default is same-school, same-course, visible, and explicitly
  `ragEligible` resources only.
- Chunk rows are placeholders with source ID, chunk index, text hash, token
  estimate, metadata payload, and indexing status; Phase 06 must not generate
  embeddings or run search.

### AI agent contracts

- Use one registry for `LessonAgent`, `HomeworkAgent`, `DataAgent`, `TutorAgent`,
  and `ParentAgent` instead of five unrelated subsystems.
- Store capability manifests and feature flags as validated JSON.
- Store agent proposals and audit entries with structured output JSON, target
  reference, approval state, actor/context metadata, and timestamps.
- Any content-affecting output must remain a proposal until teacher approval.

### MCP trust model

- Store MCP server metadata, credential references, capability scopes, and audit
  logs only.
- `credentialRef` points to environment variables or a future vault. Do not store
  secret values in SQLite.
- Capabilities are disabled by default, role-scoped, and school/course-scoped.
- Audit entries are request-level and contain non-sensitive summaries only.

### Plugin and theme safety

- Plugin manifests are declarative JSON with `id`, `name`, `version`, `type`,
  `permissions`, `hooks`, `actions`, `uiSlots`, optional `themeTokens`, and
  enabled/kill-switch state.
- Plugin action handlers are system-owned TypeScript functions in an allowlist:
  `addStepSuggestion`, `annotateLesson`, and `createNotificationStub`.
- Plugin actions write proposals/audit entries and do not directly mutate
  student-visible state.
- Minimum hook anchors are `dashboard.widget` and `lesson.sidebar` only.
- Theme tokens store color/surface/radius/typography mappings and compile to CSS
  variables; arbitrary CSS and scripts remain out of scope.

## Common pitfalls

- Do not add real provider calls for AI SDK, Qdrant, MCP, or LLMs in this phase.
- Do not store MCP secret values in SQLite.
- Do not let plugin manifests declare executable code paths, dynamic imports, or
  arbitrary CSS.
- Do not let resource UI import `db`, `src/db/schema.ts`, or DAL modules directly.
- Do not make RAG retrieval filters optional in the default helper; safe scoping
  must be the default.
- Do not implement v2 items from REQUIREMENTS.md such as production multimodal RAG,
  TutorAgent chat, ParentAgent summaries, plugin marketplace, or full theme editor.

## Validation architecture

Create `scripts/verify-phase6-foundations.ts` and wire `pnpm verify:phase6`.
The verifier should check:

- Schema exports resource, AI/RAG, MCP, plugin, theme, proposal, and audit tables.
- Resource/RAG/MCP/plugin/theme DTO schemas exist and export required types.
- DAL modules are server-only and use scoped authorization helpers.
- Server Actions validate inputs and call `updateTag()` for resource/theme/plugin
  writes.
- `/resources` no longer imports `resourceCards` from `demo-data` and renders
  DTO-backed cards with ownership, classification, visibility, and RAG eligibility.
- Plugin code forbids `eval`, `new Function`, remote dynamic import, and arbitrary
  manifest-provided handler execution.
- MCP credential schema uses `credentialRef` and does not contain secret fields.
- RAG default filters include school/course/visibility/resource/grade/subject.
- Deferred-scope tokens are absent outside comments.

## Security focus

Trust boundaries in Phase 06 are resource writes, AI/MCP proposal creation,
retrieval filter construction, MCP credential references, plugin manifest
registration, plugin action dispatch, and theme token compilation. Plans must
include STRIDE mitigations for spoofing actor identity, tampering with manifests,
cross-school information disclosure, elevation through plugin actions, and denial
through unbounded metadata payloads.

## Research complete

Phase 06 can be planned as contract-first vertical slices with a schema foundation,
resource UI slice, AI/RAG/MCP backend slices, plugin/theme safety slices, and a
final verification gate.
