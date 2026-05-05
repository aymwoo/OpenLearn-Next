# Phase 04: Student player, progress, submissions, and feedback - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 04 turns the existing static student dashboard and player surfaces into a DAL-backed learning loop. Students can see published or assigned lessons, resume from the right step, complete content steps, submit task and quiz attempts, review latest and historical attempts, and see teacher feedback. Teachers can review progress and learning evidence for published lessons and leave short feedback without building a full gradebook.

This phase does not implement live classroom SSE, locked/unlocked runtime control, AI tutoring, resource ingestion, notifications, full gradebook, weighted grades, rubrics, SIS export, bulk grading, or collaborative editing.

</domain>

<decisions>
## Implementation Decisions

### Resume and progression rules
- **D-01:** Student `继续学习` resumes the first incomplete step by default.
- **D-02:** Future teacher-forced active steps from Phase 05 take precedence over the student's first incomplete step when a classroom state says the teacher is currently directing the lesson.
- **D-03:** Completing the current step shows completion feedback first; the student manually chooses to enter the next step instead of being auto-advanced.
- **D-04:** Student dashboard lesson ordering prioritizes in-progress lessons, then not-started lessons, then completed lessons; ties may use recent activity or updated time.

### Submission and retry behavior
- **D-05:** Task retry policy is teacher-configured. Submissions remain append-only attempts and the latest attempt is the default read model.
- **D-06:** Quiz retry policy is teacher-configured and exposed through DTO fields that decide whether the UI shows `再试一次`.
- **D-07:** Student attempt history is available through a summary entry point. The default student view shows the latest attempt and lets the student expand or open historical attempts.
- **D-08:** If a task or quiz submission fails, the UI preserves the local draft/selection and offers retry. It must not clear input until the Server Action succeeds.

### Teacher feedback scope
- **D-09:** Teacher feedback applies to task submissions and quiz attempts only. Content-step progress does not receive teacher feedback in Phase 04.
- **D-10:** Each task submission or quiz attempt has one short feedback record that can be updated. Do not implement threaded comments or multiple feedback messages per attempt.
- **D-11:** Student feedback appears inside the corresponding current step card or attempt area, not as a separate notification center.
- **D-12:** Feedback is limited to 200 Chinese characters and should focus on the next improvement step.

### Teacher review granularity
- **D-13:** Teacher review opens at a lesson overview: class progress, submission status, quiz outcome status, and feedback status for a published lesson.
- **D-14:** Student detail views prioritize progress first, then latest task/quiz submissions, attempt history, outcomes, and feedback status.
- **D-15:** Teacher review supports basic status filters: all, not started, in progress, completed, and needs feedback. Do not add gradebook-style sort/filter complexity.
- **D-16:** Feedback composition lives inside the selected student detail view, attached to the relevant task or quiz latest attempt.

### Empty and error states
- **D-17:** When a student has no published or assigned lessons, the primary action is `查看课程列表` with the empty-state copy from `04-UI-SPEC.md`.
- **D-18:** If a student opens an unpublished, unauthorized, or missing lesson, show one unified inaccessible state such as `课时暂不可学习` with a route back to the student space. Do not leak draft or permission details.
- **D-19:** If a submission succeeds but progress refresh fails, the UI must prioritize confirming the submission: `提交已记录，进度稍后同步` or equivalent. Do not imply the submission was lost.
- **D-20:** Teacher review empty states explain waiting conditions (`还没有提交学习证据`, `暂无学生数据`) and must not introduce class-management or gradebook actions.

### Responsive behavior
- **D-21:** Phase 04 optimizes desktop first while keeping tablet/mobile fully usable.
- **D-22:** On small screens, the step rail becomes a top horizontal rounded pill list.
- **D-23:** Task text input remains inline on the page on mobile; do not introduce full-screen editors, bottom sheets, or modals in this phase.
- **D-24:** Desktop may show richer side-by-side information; mobile should show the current step and essential entry points only.

### Quiz result display
- **D-25:** Correct-answer reveal is teacher-configured. The server DTO controls whether the student sees the correct answer and explanation after submission.
- **D-26:** Quiz outcome display can show correct/incorrect and explanation when allowed. Do not introduce percentage scoring or gradebook semantics.
- **D-27:** Quiz attempts are append-only. Student and teacher views preserve history while highlighting the latest attempt.
- **D-28:** Teacher review shows quiz status plus latest outcome. Avoid full answer-detail tables unless required for the selected student's detail view.

### Feedback visibility and failure handling
- **D-29:** Teacher feedback editing does not need a draft state. The input is saved only on send; failed sends preserve the input for retry.
- **D-30:** Feedback becomes visible to students immediately after the Server Action succeeds and cache tags are updated or invalidated. No notification center is introduced.
- **D-31:** When feedback is updated, students see the latest feedback content and updated time only. Do not expose feedback edit history.
- **D-32:** Teacher-side feedback failure keeps the typed content and shows a clear retry path.

### the agent's Discretion
- The agent may choose exact schema names, DTO field names, component splits, and route placement when they preserve the decisions above and project constraints.
- The agent may decide whether teacher-configured retry/reveal flags live in step payloads, published snapshots, or derived DTOs, as long as draft data does not leak to students and published lessons provide stable behavior.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and requirements
- `.planning/PROJECT.md` — fixed scope, tech stack, DAL, cache, runtime, database, and design constraints.
- `.planning/ROADMAP.md` — Phase 04 goal, dependencies, requirements, and success criteria.
- `.planning/REQUIREMENTS.md` — LEARN-01 through LEARN-09 requirement text.
- `AGENTS.md` — repository-specific implementation and GSD workflow rules.
- `DESIGN.md` — visual system constraints for student and teacher review UI.

### Phase context and design
- `.planning/phases/03-courses-lessons-steps-and-teacher-authoring/03-CONTEXT.md` — published lesson snapshot, DTO, DAL, and authoring boundary decisions consumed by Phase 04.
- `.planning/phases/04-student-player-progress-submissions-and-feedback/04-UI-SPEC.md` — approved UI design contract for dashboard, player, task, quiz, teacher review, copy, spacing, color, and accessibility.

### Existing implementation
- `src/components/surfaces/student-dashboard-surface.tsx` — static student dashboard surface to convert to DTO-backed lessons and resume state.
- `src/components/surfaces/player-surface.tsx` — static player surface to convert to cached lesson shell plus streamed progress/submission regions.
- `src/lib/dal/lesson-authoring.ts` — established server-only DAL authorization, DTO shaping, and publish snapshot read/write patterns.
- `src/lib/dto/lesson-authoring.ts` — existing lesson, step, and payload DTO validation style.
- `src/db/schema.ts` — existing courses, enrollments, lessons, steps, materials, and published snapshot schema baseline.
- `src/lib/cache-policy.ts` — existing route cache boundaries and `progress:${lessonId}:${userId}` cache tag vocabulary.
- `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/skeleton.tsx` — local design primitives to reuse.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StudentDashboardSurface` currently renders the correct Stitch-inspired student shell using `demo-data`; Phase 04 should replace demo inputs with published lesson/progress DTOs.
- `PlayerSurface` already has a two-column desktop player structure and step rail; Phase 04 should preserve the visual language while making it data-backed and responsive per `04-UI-SPEC.md`.
- `Button`, `Card`, `Badge`, and `Skeleton` provide local design primitives that match the no-line tonal system.
- `lesson-authoring` DAL and DTO modules show the server-only boundary pattern to mirror for student learning reads and writes.

### Established Patterns
- UI/RSC surfaces must receive sanitized DTOs only and must not import `src/db` or raw schema tables.
- Server Actions validate inputs with Zod, call DAL methods, and update or invalidate explicit Next.js cache tags after mutations.
- Published lesson versions are stable snapshots; Phase 04 should consume published data and not mutable drafts.
- Cache boundaries already distinguish `/student` shell, `/student/player` shell, personal progress, latest submission, and future classroom runtime state.

### Integration Points
- Student dashboard route: `src/app/(student)/student/page.tsx` currently wraps `StudentDashboardSurface`.
- Student player route: `src/app/(student)/student/player/page.tsx` currently wraps `PlayerSurface`.
- Teacher review should extend the existing teacher workspace rather than create a full gradebook surface.
- Phase 04 likely needs new learning DAL, DTO, Server Actions, schema tables for progress/submissions/feedback, and verification scripts consistent with Phase 03.

</code_context>

<specifics>
## Specific Ideas

- Resume target priority: teacher-forced active step when present, otherwise first incomplete step.
- Progress states should support at least `not started`, `in progress`, `completed`, and optionally `skipped` only when the server permits it.
- Attempt cards should be labelled `第 1 次尝试`, `第 2 次尝试`, etc., with the latest attempt visually emphasized.
- Teacher review should feel like a lightweight cockpit: lesson overview first, student detail second, feedback composer attached to task/quiz attempt.
- Failure copy should reassure students that submitted records are not lost.

</specifics>

<deferred>
## Deferred Ideas

- Live classroom SSE, locked/unlocked runtime behavior, reconnect snapshots, and teacher-forced step source of truth belong to Phase 05. Phase 04 only reserves visual and DTO placeholders.
- Full gradebook, weighted scores, rubric builder, SIS export, bulk grading, feedback threads, notification center, and edit history are out of scope for v1 Phase 04.
- AI tutoring, AI feedback generation, RAG, MCP, and plugins remain Phase 06 or v2 concerns.

</deferred>

---

*Phase: 04-student-player-progress-submissions-and-feedback*
*Context gathered: 2026-05-05*
