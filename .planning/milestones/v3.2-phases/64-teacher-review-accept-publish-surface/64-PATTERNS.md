# Phase 64: Teacher Review & Accept-Publish Surface - Pattern Map

**Mapped:** 2026-05-31
**Status:** Complete

## Files to Modify or Create

| Target | Role | Closest analog | Pattern to preserve |
|--------|------|----------------|---------------------|
| `src/db/schema.ts` | Add draft lifecycle and lesson backlink columns | `draftLessonVersions`, `publishedLessonVersions`, `lessons` | SQLite Drizzle tables, camelCase column names, cascade FKs, explicit indexes |
| `drizzle/*phase64*.sql` and `drizzle/meta/*` | Migration | `drizzle/0014_phase63_draft_lesson_versions.sql` | Migration-first schema changes; no `push` as default source of truth |
| `src/db/schema.draft-lesson-versions.test.ts` | Schema source assertions | Existing Phase 63 draft schema tests | Read `schema.ts` source and assert table/column/index/FK invariants |
| `src/lib/dto/lesson-authoring.ts` | Review DTOs and diff row schemas | `LessonEditorDTOSchema`, `LessonStepDTOSchema`, publish/readiness DTOs | Zod schemas first, inferred TS types, no raw DB rows to UI |
| `src/lib/dal/lesson-authoring.ts` | Review read/apply/discard business logic | `getLessonEditorDTO`, `publishLesson`, `persistDraftLessonVersion` | `server-only`, `assertActiveTeacher`, scoped lesson auth, DTO parse before return |
| `src/lib/dal/lesson-authoring.test.ts` | DAL behavior tests | Existing publish/add/reorder tests | Mock/fixture tests for authorization, live-step mutation, DTO parse, unchanged published flow |
| `src/actions/lesson-authoring-actions.ts` | Server Actions for apply/discard | `publishLessonAction`, `addLessonStepAction`, `archiveLessonStepAction` | Zod input parse, `ActionResult`, `handleActionError`, `updateTag` invalidation |
| `src/actions/lesson-authoring-actions.test.ts` | Action tests | Existing authoring action tests | Mock DAL, assert error mapping and cache tag updates |
| `src/app/(teacher)/teacher/editor/page.tsx` | Parse `mode=review` and load review DTO | Current course/lesson scoping | Keep course-aware guard; pass DTOs to surface; no DB in component |
| `src/components/surfaces/lesson-editor-surface.tsx` | Discovery prompt and header mode switch | Existing editor header, `teacherSurfaceRhythm`, `Badge`, `LessonEditorHeaderActions` | Tonal/glass surfaces, no horizontal overflow rails, no new UI kit |
| `src/components/authoring/lesson-authoring-workspace.tsx` | Conditional review-mode render, or host a new component | Existing workspace layout and local step card functions | Keep edit mode unchanged; prefer extracting review component if complexity grows |
| `src/components/authoring/lesson-draft-review-workspace.tsx` | New focused review UI component | `CourseImportReviewSurface`, `FlowStepCard` rhythm | Single-column diff, local client state, inline side panel, per-step/global actions |
| `src/components/authoring/lesson-authoring-workspace.test.tsx` | Review-mode RTL tests | Existing workspace jsdom tests | Mock Server Actions; assert copy, buttons, panel fields, local state |
| `src/components/surfaces/lesson-editor-surface.test.tsx` | Surface source/layout assertions | Existing source assertion tests | Assert prompt/mode switch and UI-SPEC copy/classes |

## Data Flow

1. `lesson.draft.persist` writes immutable `draftLessonVersions.snapshotJson` in Phase 63.
2. `/teacher/editor?courseId=&lessonId=&mode=review` loads normal editor DTO plus latest pending draft review DTO through DAL.
3. Server component passes sanitized DTOs to `LessonEditorSurface`.
4. Client review workspace computes/receives diff rows and holds local accept/discard/edit state.
5. `applyDraftLessonVersionAction` validates payload and calls DAL apply.
6. DAL archives active `lessonSteps`, inserts chosen draft steps as new active steps, marks draft applied, updates lesson backlinks/revision.
7. Server Action invalidates draft/lesson/steps/course/teacher tags and returns success copy.
8. Existing publish button remains the only path to `publishLesson()`.

## Concrete Pattern Excerpts

### Server Action Cache Pattern

Source: `src/actions/lesson-authoring-actions.ts`

- Parse with a Zod schema.
- Call `assertActiveTeacher()` before DAL write when tag invalidation needs actor id.
- On success, call `invalidateLessonAuthoringTags(actor.userId, courseId, lessonId)`.
- On partial result, at least call `updateTag(cacheTags.lesson(lessonId))` and `updateTag(cacheTags.steps(lessonId))`.

### DAL Version Pattern

Source: `src/lib/dal/lesson-authoring.ts`

- `publishLesson()` reads scoped lesson, checks readiness, builds a snapshot, inserts a version row, then updates `lessons`.
- `persistDraftLessonVersion()` gets `max(version)+1`, inserts `draftLessonVersions`, and returns a small result.
- Phase 64 apply should combine these patterns: scoped lesson auth + version/draft validation + live-step mutation + small DTO return.

### UI Review Pattern

Source: `src/components/surfaces/course-import-review-surface.tsx`

- Global action plus per-row choices.
- Local `useState` decisions before applying.
- Feedback state for success/error.
- Tonal sections and cards without divider-heavy lists.

### Editor Shell Pattern

Source: `src/components/surfaces/lesson-editor-surface.tsx`

- Surface owns header/context and delegates body to `LessonAuthoringWorkspace`.
- Keep the course-aware route guidance unchanged.
- Use `teacherSurfaceRhythm.hero` and `.section` for page rhythm.

## Plan Landmines

- Do not put apply/discard command registration into the existing Phase 63 `lesson.draft.persist` command unless the plan explicitly needs command-bus auditing. The phase context asks for command naming as planner discretion, but the current UI can safely use Server Action -> DAL if event/command expansion is not required by REVIEW-01..04.
- If adding `latestDraftVersionId` as an FK, SQLite cascade semantics may delete the lesson if the draft is deleted only when FK direction is wrong. The FK must be `lessons.latestDraftVersionId -> draftLessonVersions.id` with `onDelete: "set null"` if Drizzle supports it, or avoid FK and use text backlink. AGENTS says all relations cascade; this is a tension to surface in the plan. Recommended: use nullable text backlink without FK unless the schema pattern clearly supports non-cascade.
- `LessonAuthoringWorkspace` is already large. Prefer a new `lesson-draft-review-workspace.tsx` to keep review code testable.
- Do not treat RTL/source assertions as sufficient for REVIEW-04; include a final manual desktop visual check against `64-UI-SPEC.md`.

## PATTERN MAPPING COMPLETE

