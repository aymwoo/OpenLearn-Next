# Phase 3: Courses, lessons, steps, and teacher authoring - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning
**Source:** Roadmap + requirements + established project constraints

<domain>

## Phase Boundary

Phase 3 turns the existing protected teacher workspace and static lesson editor
surface into a DAL-backed authoring workflow. Teachers can manage courses and
classes, create lessons, compose ordered `content`, `task`, and `quiz` steps,
autosave drafts, reorder steps with rank strings, and publish stable lesson
versions that later student and classroom phases consume.

This phase does not implement student progress, submissions, live classroom SSE,
AI-generated lessons, production uploads, or a full resource center. It may add
minimal material reference fields on lesson steps so Phase 6 can replace them
with the resource center boundary later.

</domain>

<decisions>

## Decisions

### Authoring scope

- **D-01:** Implement teacher-owned course, class, enrollment, lesson, step, and
  published-version authoring through the existing DAL + Server Actions boundary.
- **D-02:** Keep drafts hidden from students by storing lesson draft status and a
  separate stable published snapshot/version that downstream student and
  classroom flows consume.
- **D-03:** Support exactly three built-in step types in this phase: `content`,
  `task`, and `quiz`; every payload must be Zod-validated before persistence.
- **D-04:** Use LexoRank-style string ordering for `lessonSteps.rank`; do not use
  integer positions that require cascading updates during drag-and-drop.
- **D-05:** Autosave and publish mutations must call `updateTag()` for
  `lesson:${lessonId}` and `steps:${lessonId}` so teacher read-your-writes works
  with Next.js 16 explicit caching.
- **D-06:** Teacher UI must remain in Simplified Chinese and follow `DESIGN.md`:
  Lexend, tonal surfaces, no 1px divider lines, glass/gradient CTA, rounded
  surfaces, and clear save/publish/conflict/cache freshness feedback.
- **D-07:** UI and RSC surfaces must receive sanitized DTOs only; no UI component
  may import `src/db`, raw schema tables, or database clients.
- **D-08:** Add a focused Phase 3 verification script that checks schema shape,
  server-only DAL boundaries, Server Action cache updates, DTO use, and authoring
  UI wiring.

### the agent's Discretion

- The agent may choose exact DTO field names and UI component splits when they
  preserve the locked behavior above and the existing project conventions.
- The agent may implement rank string generation with a local deterministic
  helper instead of adding an external package if the helper supports insert
  before/after/between and avoids integer position updates.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and roadmap

- `.planning/PROJECT.md` — fixed tech stack, DAL, cache, database, runtime, and
  design constraints.
- `.planning/ROADMAP.md` — Phase 3 goal, dependencies, requirements, and success
  criteria.
- `.planning/REQUIREMENTS.md` — LESSON-01 through LESSON-08 requirement text.
- `DESIGN.md` — visual system constraints for teacher authoring UI.
- `AGENTS.md` — project-specific rules and non-negotiable implementation
  constraints.

### Existing implementation

- `.planning/phases/02-auth-roles-schema-and-dal-boundary/02-03-SUMMARY.md` —
  established DTO, DAL, and RBAC layout patterns.
- `src/db/schema.ts` — current Auth.js, school, membership, class, and
  class-member schema baseline.
- `src/lib/dal/auth.ts` — current server-only current-user DAL pattern.
- `src/lib/dal/membership.ts` — current server-only membership DAL pattern.
- `src/components/surfaces/lesson-editor-surface.tsx` — existing static editor
  surface to convert into data-backed authoring UI.
- `src/lib/cache-policy.ts` — existing cache tag vocabulary.

</canonical_refs>

<specifics>

## Specific Ideas

- Course/class management may start from the existing `schools`, `classes`, and
  `classMembers` tables, extending them only where Phase 3 needs teacher
  authoring semantics.
- Lesson publish should produce a stable snapshot record such as
  `publishedLessonVersions.snapshotJson` instead of letting student/classroom
  phases read mutable drafts.
- Step payload examples:
  - `content`: `{ title, body, teacherNotes?, materialRefs? }`
  - `task`: `{ prompt, submissionType, successCriteria?, materialRefs? }`
  - `quiz`: `{ question, options, correctOptionIndex?, explanation? }`
- Conflict and freshness feedback can use revision numbers or `updatedAt` checks;
  the concrete mechanism is discretionary if stale writes return a deterministic
  conflict result to the UI.

</specifics>

<deferred>

## Deferred Ideas

- Student lesson player, progress, submissions, quiz scoring for students, and
  teacher feedback are Phase 4.
- Live classroom sessions, locked/unlocked mode, and Edge SSE are Phase 5.
- Production upload pipeline, RAG eligibility processing, AI-generated lesson
  content, MCP, plugins, and theme marketplace are Phase 6 or v2.
- Realtime collaborative editing is v2 and must not be implemented in Phase 3.

</deferred>

---

*Phase: 03-courses-lessons-steps-and-teacher-authoring*
*Context gathered: 2026-05-05 via plan-phase auto context synthesis*
