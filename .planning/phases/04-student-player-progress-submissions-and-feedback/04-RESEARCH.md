# Phase 04 — Research

## Research Complete

Phase 04 should extend the Phase 03 published-lesson snapshot boundary into a
student learning loop. The implementation must keep the existing stack: Next.js
16 App Router, React 19.2, Drizzle SQLite, Auth.js v5, DAL + Server Actions,
explicit cache tags, and the `DESIGN.md` no-line tonal UI system.

## Standard Stack

- **Persistence:** Add SQLite/Drizzle tables for step progress, task attempts,
  quiz attempts, and attempt feedback. Every child relation must use cascade
  deletion.
- **DTO boundary:** Create `src/lib/dto/learning.ts` with Zod schemas for
  student dashboard, player shell, progress, latest attempts, attempt history,
  quiz outcomes, teacher review, and feedback results.
- **DAL:** Create `src/lib/dal/learning.ts` with `import "server-only";`,
  student/teacher scope checks, published snapshot reads only, DTO parsing, and
  append-only attempt mutations.
- **Server Actions:** Create `src/actions/learning-actions.ts` with Zod input
  validation and `updateTag()` calls for progress, submissions, and teacher
  review freshness.
- **Verification:** Add `scripts/verify-phase4-learning.ts` and
  `pnpm verify:phase4` to protect schema, DTO, DAL, Server Action, UI, cache,
  and deferred-scope invariants.

## Architecture Patterns

1. **Published snapshot consumption:** Student/player reads must consume
   `publishedLessonVersions.snapshotJson` through the DAL. They must not read
   mutable drafts or archived steps.
2. **Append-only attempts:** Task and quiz submissions insert new attempt rows.
   The previous latest attempt for the same `(publishedVersionId, stepId,
   studentId)` must have `isLatest` cleared in the same mutation before the new
   latest row is inserted.
3. **Latest-read optimization:** Student and teacher DTOs should read latest
   attempts through `isLatest` markers and expose historical attempts through a
   summary/detail entry point.
4. **Resume target:** DTOs compute `resumeStepId` by checking a Phase 05-ready
   runtime placeholder first, then the first incomplete step, then the first
   step. Phase 04 does not implement live SSE or durable classroom state.
5. **Explicit cache invalidation:** Progress/submission/feedback writes must
   update `progress:${lessonId}:${userId}` and submission/teacher-review tags
   before returning success to UI.
6. **Data-backed UI:** Existing `StudentDashboardSurface` and `PlayerSurface`
   should be converted from demo data to sanitized DTO props. New teacher review
   components should live under the existing teacher workspace, not a full
   gradebook.

## Recommended Schema Shape

- `lessonStepProgress`: `id`, `publishedVersionId`, `lessonId`, `stepId`,
  `studentId`, `state`, `completedAt`, `updatedAt`; indexes on
  `(publishedVersionId, studentId)` and `(lessonId, studentId)`.
- `taskSubmissions`: `id`, `publishedVersionId`, `lessonId`, `stepId`,
  `studentId`, `attemptNo`, `payloadJson`, `isLatest`, `createdAt`; indexes on
  `(publishedVersionId, stepId, studentId)` and latest read columns.
- `quizAttempts`: `id`, `publishedVersionId`, `lessonId`, `stepId`,
  `studentId`, `attemptNo`, `answerJson`, `outcomeJson`, `isLatest`,
  `createdAt`; same latest/history indexes.
- `attemptFeedback`: `id`, `targetType`, `targetId`, `teacherId`, `studentId`,
  `body`, `createdAt`, `updatedAt`; one feedback record per task submission or
  quiz attempt target.

## Security and Authorization Notes

- Student reads/writes require an authenticated active student membership and
  course enrollment or class membership connected to the published lesson.
- Teacher review and feedback require an authenticated active teacher membership
  scoped to the lesson school/course.
- Inaccessible lessons must return a unified student-facing state such as
  `课时暂不可学习`; do not reveal draft, missing, or permission details.
- Feedback body must be validated at maximum 200 Chinese characters.
- UI components must not import `@/db`, schema tables, or database clients.

## UI Constraints from UI-SPEC

- Student dashboard orders lessons as in-progress, not-started, then completed.
- Player uses cached shell plus Suspense-streamed progress/runtime/submission
  regions.
- Mobile step rail becomes a horizontal rounded pill list.
- Task and quiz failure states preserve local input/selection until the Server
  Action succeeds.
- Teacher review is a lightweight cockpit with status filters only: all,
  not-started, in-progress, completed, and needs-feedback.

## Common Pitfalls

- Do not compute latest attempts on the client from raw arrays.
- Do not mutate existing submissions in place.
- Do not show correct quiz answers unless the server DTO says reveal is allowed.
- Do not introduce notification center, gradebook, rubrics, weighted scores,
  bulk grading, or SSE classroom behavior in Phase 04.
- Do not add border-heavy UI libraries or shadcn registry initialization.

## Validation Architecture

`pnpm verify:phase4` should check:

- Schema contains progress, task attempt, quiz attempt, and feedback tables with
  cascade deletes and latest/history indexes.
- DTOs expose resume target, retry/reveal booleans, latest attempt, history,
  teacher review, and 200-character feedback validation.
- DAL is server-only, parses DTOs, reads published snapshots, enforces student
  and teacher authorization, and uses append-only insert semantics.
- Server Actions validate with Zod and call `updateTag()` for progress,
  submissions, and review freshness.
- Student and teacher UI files have no direct DB imports and contain required
  Chinese copy from `04-UI-SPEC.md`.
- No source file introduces gradebook, rubric, bulk grading, SSE stream setup,
  notification center, or mutable submission overwrite behavior.
