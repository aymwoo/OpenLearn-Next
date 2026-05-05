# Phase 3 Research: Courses, lessons, steps, and teacher authoring

**Phase:** 3 — Courses, lessons, steps, and teacher authoring  
**Goal:** 教师可以从课程/班级出发创建、编排、保存并发布由 `content`、`task`、`quiz` 步骤组成的稳定课时。  
**Requirements:** LESSON-01, LESSON-02, LESSON-03, LESSON-04, LESSON-05, LESSON-06, LESSON-07, LESSON-08

## Research summary

Phase 3 should extend the Phase 2 schema and DAL rather than introduce a new
data path. The core implementation boundary is:

`Teacher UI -> Server Actions -> server-only DAL -> Drizzle SQLite -> DTOs -> UI`

The most important implementation risk is publish stability. Draft lesson rows
and mutable step rows must not be the student-facing contract. Publishing should
write a stable version/snapshot record with enough data for Phase 4 and Phase 5
to read a lesson consistently.

## Standard stack and package decisions

- Use the existing Next.js 16 App Router, React 19.2, Auth.js v5, Drizzle ORM,
  SQLite/libSQL, Zod, and Tailwind v4 stack.
- Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, and
  `@dalet-oss/lexorank` only if implementation needs production drag-and-drop
  primitives in this phase.
- If avoiding new dependencies, implement a small local rank helper in
  `src/lib/ranking/lexorank.ts` and validate it with Vitest. The helper must
  create sortable strings between neighboring ranks and must not use integer
  position updates.

## Data model guidance

Extend `src/db/schema.ts` with SQLite-first tables and cascade deletes:

- `courses`: teacher-owned course/class container with `schoolId`, `ownerId`,
  `title`, `subject`, `grade`, `status`, `createdAt`, and `updatedAt`.
- `courseClasses`: association table between `courses` and `classes`.
- `courseEnrollments`: course-level student enrollment when a course is not tied
  to a class roster directly.
- `lessons`: draft lesson metadata with `courseId`, `createdById`, `title`,
  `objective`, `status`, `revision`, `publishedVersionId`, `createdAt`, and
  `updatedAt`.
- `lessonSteps`: ordered mutable draft steps with `lessonId`, `type`, `title`,
  `rank`, `payloadJson`, `createdAt`, and `updatedAt`; index `(lessonId, rank)`.
- `lessonMaterials`: minimal material references for links/rich text/resource
  placeholders until Phase 6 resource center becomes authoritative.
- `publishedLessonVersions`: immutable or append-only published snapshots with
  `lessonId`, `version`, `snapshotJson`, `publishedById`, and `publishedAt`.

All foreign keys that belong to a parent must use `{ onDelete: "cascade" }`.

## DTO and validation guidance

Create Zod schemas for all UI-facing DTOs and all Server Action inputs:

- `CourseDTO`, `ClassRosterDTO`, `LessonSummaryDTO`, `LessonEditorDTO`,
  `LessonStepDTO`, `LessonMaterialDTO`, `PublishResultDTO`, and `AutosaveResultDTO`.
- `contentStepPayloadSchema`, `taskStepPayloadSchema`, and
  `quizStepPayloadSchema` with a discriminated `stepPayloadSchema`.
- Server Action inputs for course creation, lesson creation/update, step add,
  step update, step duplicate, step archive/delete, reorder, autosave, and
  publish.

DAL functions must verify teacher membership and ownership before returning or
mutating data. UI components must never import `src/db` or raw schema tables.

## Cache and freshness guidance

After any mutation that changes lesson/course authoring state, call `updateTag()`
for the tags that the teacher reads immediately:

- `cacheTags.course(courseId)` for course or enrollment changes.
- `cacheTags.lesson(lessonId)` for lesson metadata and publish state changes.
- `cacheTags.steps(lessonId)` for step add/update/reorder/archive changes.

Use conflict detection through lesson or step `revision`/`updatedAt` values.
Stale writes must return a deterministic conflict result instead of silently
overwriting newer data.

## UI design contract summary

Teacher authoring UI should build on `LessonEditorSurface` and keep the existing
three-pane mental model:

- Left pane: course/class/lesson list and step rail.
- Center pane: lesson canvas and selected step editor.
- Right pane: settings, material references, autosave, publish, and conflict
  feedback.

All UI copy must be Simplified Chinese. Use tonal layer separation instead of
1px dividers. Primary actions such as `发布课时` use the gradient Button. Save,
publish, conflict, and freshness states must be visible without relying only on
color.

## Common pitfalls

- Do not let student/classroom phases read draft `lessons` and `lessonSteps`.
  Always provide a published snapshot boundary.
- Do not put database queries in UI/RSC components. Use DAL functions and Server
  Actions only.
- Do not model ordering with integer `position`; reorder must update only the
  moved step rank.
- Do not add production file upload in this phase; minimal material references
  are enough.
- Do not rely on implicit Next.js caching. Mutations must update tags.

## Validation architecture

Phase 3 needs automated checks for:

- Schema contains `courses`, `lessons`, `lessonSteps`, and
  `publishedLessonVersions` with cascade references and `(lessonId, rank)` index.
- DAL modules start with `import "server-only"` and UI does not import `src/db`.
- Step payload schemas include `content`, `task`, and `quiz`.
- Server Actions use Zod parsing and call `updateTag()` for course/lesson/steps
  mutations.
- Ranking tests verify between-rank generation and no integer `position` field.
- Authoring UI contains Chinese save/publish/conflict/freshness feedback.

## Architectural Responsibility Map

| Responsibility | Tier | Files |
|----------------|------|-------|
| Database shape | DB schema | `src/db/schema.ts` |
| Teacher authz and DTO shaping | DAL | `src/lib/dal/lesson-authoring.ts`, `src/lib/dto/lesson-authoring.ts` |
| Mutation validation and cache invalidation | Server Actions | `src/actions/lesson-authoring-actions.ts` |
| Rank generation | Shared server utility | `src/lib/ranking/lexorank.ts` |
| Teacher authoring route loading | RSC route | `src/app/(teacher)/teacher/editor/page.tsx` |
| Interactive editing controls | Client component | `src/components/authoring/lesson-authoring-workspace.tsx` |
| Verification | Script/test | `scripts/verify-phase3-authoring.ts`, Vitest tests |
