# Stack research

**Milestone:** v1.2 Course Import & Management  
**Researched:** 2026-05-09  
**Confidence:** HIGH

## Executive summary

This milestone does not need a new platform stack. It should extend the current
Next.js 16, Auth.js v5, Drizzle, SQLite, DAL, and Server Action foundation so
course management becomes operational for teachers. The only new technical seam
is a batch-import pipeline that stays on the Node runtime and returns typed
validation results.

## Recommended baseline

| Area | Recommendation | Why |
|------|----------------|-----|
| App architecture | Keep Next.js 16 App Router + Server Actions | Course CRUD and import fit the existing full-stack mutation model. |
| Authorization | Reuse teacher-scoped DAL guards | Course, class, and student associations are school-scoped data and must not bypass existing authz logic. |
| Persistence | Reuse `courses`, `courseClasses`, `courseEnrollments`, and `lessons` | The schema already covers the milestone's domain and does not need a parallel course model. |
| Validation | Keep Zod at the action and DTO boundaries | Manual forms and batch import both require deterministic validation and user-safe errors. |
| Runtime | Keep import parsing in Node runtime | Structured file parsing and multi-row writes should not run in Edge. |
| Caching | Continue explicit `cacheTag()` / `updateTag()` invalidation | Course center and lesson-entry flows need read-your-writes after create, edit, publish, archive, delete, and import. |

## Additions worth making

| Area | Recommendation | Why |
|------|----------------|-----|
| Batch import contract | Add a structured import schema with row DTOs and result DTOs | Teachers need predictable import previews and apply results instead of opaque failures. |
| Duplicate guardrails | Add deterministic matching and conflict reporting for imported rows | Batch import must not silently create duplicate course records. |
| Course lifecycle contract | Normalize `draft`, `published`, and `archived` behavior across list and detail surfaces | Status drift will make course visibility inconsistent across launch, authoring, and management flows. |
| Association writes | Centralize class and student association updates in DAL methods | These writes need the same school-scope enforcement as existing lesson and classroom APIs. |

## What not to add in v1.2

| Avoid | Why |
|------|-----|
| Real Moodle, Notion, or MCP-backed import | External system mapping, auth, and sync semantics would bury the core course-center milestone. |
| Arbitrary Excel-only parsing paths | Batch import can validate the workflow with a structured template first; deeper spreadsheet parity can come later. |
| Background job infrastructure for import | The initial course-import scale can remain request-scoped if the payload stays teacher-sized. |
| UI-side authorization shortcuts | Hiding actions in the interface is not sufficient for school-scoped data safety. |
