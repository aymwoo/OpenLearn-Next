# Requirements: OpenLearn Next

**Defined:** 2026-05-04  
**Core Value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation and design

- [x] **FOUND-01**: User can open a Next.js 16 App Router application bootstrapped with React 19.2, TypeScript, Turbopack, and the required project structure.
- [x] **FOUND-02**: User sees public, teacher, student, classroom, and admin route areas with separate layouts and navigation shells.
- [x] **FOUND-03**: User sees Simplified Chinese UI copy using the Lexend-based design system from `DESIGN.md`.
- [x] **FOUND-04**: User sees homepage, teacher dashboard, student dashboard, editor, player, classroom console, resource, and course surfaces implemented from Stitch project `5322129002350954765` mappings.
- [x] **FOUND-05**: Developer can use shared design tokens and components that enforce tonal layering, no 1px divider lines, glass surfaces, gradient primary actions, and accessible focus states.
- [x] **FOUND-06**: Developer can identify explicit Next.js cache boundaries, cache tags, and PPR/Suspense rules for all route groups.

### Authentication and authorization

- [ ] **AUTH-01**: User can sign in and maintain a session through Auth.js v5 with Drizzle-backed auth tables.
- [ ] **AUTH-02**: Admin, teacher, and student roles can access role-appropriate workspaces after sign-in.
- [ ] **AUTH-03**: Server code models future super admin, school admin, parent, developer, and AI Agent roles without exposing unfinished workflows in the UI.
- [ ] **AUTH-04**: `proxy.ts` redirects unauthenticated users away from protected teacher, student, classroom, admin, and API route families.
- [ ] **AUTH-05**: Server Actions and DAL functions verify actor identity, role, school membership, ownership, enrollment, and resource scope before returning or mutating data.
- [ ] **AUTH-06**: UI receives sanitized DTOs only and never receives raw database rows, credentials, provider tokens, internal prompts, or private plugin data.

### Data layer and schema

- [ ] **DATA-01**: Developer can use a SQLite-first Drizzle database with migrations and table groups for auth, schools, courses, lessons, steps, progress, submissions, classroom sessions, AI/RAG metadata, MCP metadata, plugins, and themes.
- [ ] **DATA-02**: Developer can rely on `onDelete: cascade` or equivalent cascade behavior for all parent-owned child records.
- [ ] **DATA-03**: Developer can access all persistent data only through DAL modules under a server-only boundary.
- [ ] **DATA-04**: Developer can validate all user, AI, MCP, plugin, step payload, and submission inputs with Zod before persistence.
- [ ] **DATA-05**: Developer can use documented indexes and unique constraints for high-frequency reads and writes, including lesson step order, progress identity, latest submissions, classroom sessions, and scoped permissions.

### Courses, lessons, and teacher authoring

- [x] **LESSON-01**: Teacher can create and manage courses or classes with enrolled students.
- [x] **LESSON-02**: Teacher can create, edit, duplicate, archive, and publish lessons inside a course or class.
- [x] **LESSON-03**: Teacher can add ordered lesson steps of type `content`, `task`, and `quiz` with validated structured payloads.
- [x] **LESSON-04**: Teacher can attach or reference basic materials such as links, uploaded resources, and rich text content from a minimal resource center.
- [x] **LESSON-05**: Teacher can autosave draft lesson and step changes without exposing drafts to students.
- [x] **LESSON-06**: Teacher can publish a stable lesson version that students and classroom sessions consume.
- [x] **LESSON-07**: Teacher can drag and drop steps using LexoRank ordering without cascading updates across all steps.
- [x] **LESSON-08**: Teacher receives clear save, publish, conflict, and cache freshness feedback after Server Actions mutate lesson data.

### Student learning and submissions

- [x] **LEARN-01**: Student can view assigned or published lessons from a student dashboard and resume the most relevant lesson.
- [x] **LEARN-02**: Student can open a PPR lesson player with a cached lesson shell and Suspense-streamed personal progress, runtime state, and latest submission data.
- [x] **LEARN-03**: Student can navigate content, task, and quiz steps when classroom mode permits navigation.
- [x] **LEARN-04**: Student progress is recorded per step with states such as not started, in progress, completed, and skipped or equivalent.
- [x] **LEARN-05**: Student can resume a lesson from the first incomplete step or the teacher-forced active step.
- [x] **LEARN-06**: Student can submit task responses as immutable append-only attempts with an `isLatest` marker for latest-read optimization.
- [x] **LEARN-07**: Student can answer basic quiz questions and receive simple captured or scored outcomes.
- [x] **LEARN-08**: Teacher can review student progress, latest task submissions, attempt history, quiz outcomes, and basic feedback status.
- [x] **LEARN-09**: Teacher can leave short feedback on student submissions without requiring a full gradebook.

### Classroom runtime

- [x] **CLASS-01**: Teacher can launch a published lesson as a classroom session with a roster of participants.
- [x] **CLASS-02**: Teacher can see and change the active step of a live classroom session.
- [x] **CLASS-03**: Teacher can switch a classroom session between locked mode, where students follow the active step, and unlocked mode, where students can move independently.
- [x] **CLASS-04**: Student player reflects active step and lock mode changes through an Edge Runtime SSE stream.
- [ ] **CLASS-05**: Classroom session state, current step, lock mode, participants, and events are durable in SQLite and not stored only in SSE memory.
- [x] **CLASS-06**: Reconnecting or late-joining students receive a consistent snapshot of classroom session state.
- [x] **CLASS-07**: Teacher can recover from classroom control conflicts or stale UI with clear state feedback.

### Resource, AI, RAG, and MCP foundations

- [x] **AI-01**: Teacher can manage a minimal resource center that records resource metadata, ownership, visibility, and future RAG eligibility.
- [x] **AI-02**: Developer can register AI agent capability interfaces for LessonAgent, HomeworkAgent, DataAgent, TutorAgent, and ParentAgent without granting raw database access.
- [x] **AI-03**: Developer can store agent run metadata, audit logs, feature flags, and structured outputs for future AI workflows.
- [x] **AI-04**: Developer can define RAG `KnowledgeSource` and chunk metadata contracts with school, course, subject, grade, visibility, and source filters.
- [x] **AI-05**: Developer can configure a Qdrant-ready retrieval boundary without enabling cross-school or cross-course retrieval by default.
- [x] **AI-06**: Developer can define MCP server, credential, capability, and audit-log tables behind a server-side adapter boundary.
- [x] **AI-07**: Teacher approval is required before AI-generated or MCP-derived content changes lessons, classroom state, or student-visible output.

### Plugin and theme foundations

- [x] **PLUGIN-01**: Developer can register plugins through validated declarative JSON manifests containing name, type, version, permissions, UI declarations, and hooks.
- [x] **PLUGIN-02**: Plugin execution follows `Event -> Hook -> Action -> Core API` and cannot use `eval()`, dynamic third-party code execution, direct database access, or direct core API access.
- [x] **PLUGIN-03**: Plugin permissions are checked before injecting safe context parameters such as `userId`, `lessonId`, and `courseId`.
- [x] **PLUGIN-04**: Developer can expose a limited action allowlist, including safe actions such as `addPoints` and `createNotification`.
- [x] **PLUGIN-05**: Developer can register UI hook anchors such as `dashboard.widget` and `lesson.sidebar` without allowing arbitrary script execution.
- [x] **PLUGIN-06**: Admin or developer can define declarative theme tokens that respect `DESIGN.md`, Lexend, Simplified Chinese UI, no-line surfaces, tonal layering, and accessibility constraints.
- [x] **PLUGIN-07**: System records plugin hook runs, denied actions, permission failures, and kill-switch state for auditability.

### v1.1 Stitch UI Alignment & Release Polish

- [x] **UI-01**: System can access Stitch MCP to retrieve remote design system tokens and page structural data.
- [x] **UI-02**: Home page is refactored to align 1:1 with the Stitch "首页" design, optimizing compactness and aesthetics.
- [x] **UI-03**: Teacher dashboard is refactored to align 1:1 with the Stitch "教师工作台" design, improving layout density.
- [x] **UI-04**: Application globally eliminates 1px borders, enforces correct tonal layering, shadows, and color usage strictly per `DESIGN.md`.

### v1.2 Course import and management

- [x] **COURSE-01**: Teacher can open a teacher-scoped course center that lists each visible course with title, subject, grade, status, lesson count, class links, enrollment count, and updated time.
- [x] **COURSE-02**: Teacher can create a course manually through a validated form inside the teacher workflow.
- [x] **COURSE-03**: Teacher can edit course base information such as title, subject, grade, and status and see read-your-writes feedback after save.
- [ ] **COURSE-04**: Teacher can publish, unpublish, or archive a course without making archived or inactive courses appear in the wrong teacher flows.
- [ ] **COURSE-05**: Teacher can delete an eligible course with explicit confirmation and clear feedback when deletion is blocked.
- [ ] **COURSE-06**: Teacher can associate or remove classes from a course within the teacher's school scope.
- [ ] **COURSE-07**: Teacher can manage course student enrollment associations within the course management workflow.
- [ ] **COURSE-08**: Teacher can import multiple courses from a structured batch file and receive row-level validation results before changes are applied.
- [ ] **COURSE-09**: Teacher can review import outcomes as created, updated, skipped, or failed rows without silently creating duplicates.
- [x] **COURSE-10**: Teacher can open a course and continue directly into lesson or teaching-plan management from a dedicated entry point.

### v1.x Teaching schedule OS extension

- [x] **SCHEDULE-01**: School-scoped operators can import timetable data from structured files or approved connectors through a staging layer that preserves source metadata, row-level validation, and reviewable import outcomes.
- [x] **SCHEDULE-02**: Developer can use a normalized schedule domain model for terms, week patterns, class groups, teacher-course assignments, bell slots, recurring schedule entries, runtime overrides, and source lineage without exposing raw import rows to UI consumers.
- [x] **SCHEDULE-03**: Teacher and authorized staff can view deterministic daily agendas generated from the normalized model, holiday rules, and runtime overrides for a given day.
- [x] **SCHEDULE-04**: Authorized users can reschedule, substitute, cancel, or relocate classes through audited mutations that preserve original schedule lineage and explicit effective dates.
- [x] **SCHEDULE-05**: School can manage holiday calendars, make-up days, and non-teaching exceptions that participate in daily agenda generation instead of living as UI-only annotations.
- [x] **SCHEDULE-06**: System can send schedule reminders and change notifications for upcoming classes, agenda updates, and exceptions through the existing notification boundary.
- [x] **SCHEDULE-07**: Teacher can use an AI schedule assistant to draft import mappings, conflict resolutions, and rescheduling suggestions, but every schedule-affecting write requires explicit user approval and audit logs.
- [x] **SCHEDULE-08**: Developer can expose plugin-safe schedule hooks and allowlisted actions so themes or plugins can extend schedule surfaces, reminders, and assistant workflows without direct DB access or arbitrary code execution.
- [x] **SCHEDULE-09**: All schedule reads and writes enforce Auth/RBAC, school scope, DTO shaping, explicit cache invalidation, and the required `Import Layer -> Normalized Schedule Model -> Runtime Daily Agenda Engine` architecture.

### v1.3 Teaching orchestration and classroom intelligence

- [x] **ORCH-01**: Teacher can enrich each teaching step with structured teaching intent, estimated duration, activity mode, and evidence expectations without replacing the current linear step model.
- [ ] **ORCH-02**: Teacher can prepare a class-facing launch plan from a published lesson, including roster scope, key materials, and runtime emphasis before class starts.
- [ ] **ORCH-03**: Teacher can see launch readiness and missing prerequisites for classroom implementation before starting a live session.
- [x] **ACT-01**: Student can see classroom-friendly activity guidance, expected output, and current completion state for the active teaching step.
- [x] **ACT-02**: Student can submit quick in-class evidence or check-in responses that are durably recorded alongside existing task and quiz evidence.
- [ ] **ACT-03**: Teacher can monitor live roster presence, step adoption, progress, submission counts, and students needing intervention during class.
- [ ] **EVAL-01**: Teacher can capture lightweight participation marks, observation notes, or evaluation tags during or after class without introducing a full gradebook.
- [ ] **EVAL-02**: Teacher can review aggregated evidence from progress, tasks, quizzes, quick responses, presence, observations, and feedback for each student.
- [x] **EVAL-03**: Classroom sessions durably store presence, intervention, and evidence timeline data for recap, audit, and later analytics.
- [ ] **ANALYTICS-01**: Teacher can view lesson or session summary metrics for completion, participation, submissions, and feedback workload.
- [ ] **ANALYTICS-02**: Teacher can inspect class-level and student-level trends across recent teaching sessions with drill-down to raw evidence.
- [ ] **UI-05**: System provides high-quality Stitch-aligned planning, runtime, evaluation, and analytics surfaces with responsive, product-level interaction polish.

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### AI and learning intelligence

- **AI-V2-01**: Teacher can use LessonAgent beta to generate editable step schemas grounded in approved resources.
- **AI-V2-02**: Teacher can use HomeworkAgent beta to draft task and quiz steps.
- **AI-V2-03**: Teacher can view deterministic class analytics and later DataAgent-generated insight summaries.
- **AI-V2-04**: Student can use TutorAgent only after RAG grounding, safety filters, citations, audit logs, and age-appropriate policies are validated.
- **AI-V2-05**: Parent can receive ParentAgent summaries after parent roles, consent, notifications, and privacy rules are implemented.
- **AI-V2-06**: Teacher can use multi-agent teaching package generation after individual agents are proven safe and useful.

### Ecosystem and integrations

- **COURSE-V2-01**: School can import courses from real external systems such as Moodle, Notion, or other MCP-connected sources after the local course-center workflow is stable.
- **COURSE-V2-02**: School can run bidirectional course sync with remote systems after remote identifiers, conflict ownership, and retry semantics are validated.
- **ECO-V2-01**: School can connect production Moodle, GitHub, Notion, WeCom, or DingTalk integrations through scoped MCP connectors.
- **ECO-V2-02**: School can use LTI or OneRoster-style integrations after institutional demand validates the scope.
- **ECO-V2-03**: Developer can build step-type plugins after built-in step contracts and plugin security are stable.
- **ECO-V2-04**: Admin can manage a plugin or theme marketplace after local/admin-installed extensions prove value.
- **ECO-V2-05**: School can use a full gradebook or SIS export after OpenLearn Next becomes a system of record.

### Advanced classroom workflows

- **CLASS-V2-01**: Teacher can build conditional or branching step graphs after linear classroom execution is reliable.
- **CLASS-V2-02**: Teacher can co-edit lessons with conflict resolution and audit trails.
- **CLASS-V2-03**: Student can use native mobile or offline workflows if responsive web/PWA behavior is insufficient.
- **CLASS-V2-04**: Teacher can use richer rubrics, peer review, originality checks, and bulk submission workflows.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full LMS replacement in v1 | It would bury the workflow engine under commodity LMS scope before the core classroom loop is validated. |
| Full gradebook in v1 | Grade policies, weighting, exports, and SIS sync are a separate product surface. |
| PostgreSQL as the first implemented database | The project explicitly starts with SQLite to reduce deployment complexity. |
| Native mobile app in v1 | Responsive web and PWA-friendly layouts should validate mobile needs first. |
| Arbitrary plugin JavaScript execution | It violates the security model and is unsafe for K-12 data. |
| Plugin direct database or core API access | All extensions must go through events, hooks, allowlisted actions, and Core API. |
| Realtime collaborative editor in v1 | WebSocket/CRDT complexity is not needed to validate step-based classroom execution. |
| AI autonomous classroom control | Teachers must remain in control of classroom-affecting actions. |
| Ungrounded student AI tutoring in v1 | Hallucination, age appropriateness, and privacy risks require dedicated evaluation first. |
| Production-grade multimodal textbook RAG in v1 | Chinese PDF parsing, formulas, images, tables, chunking, and evaluation need separate validation. |
| Public social feed or public class stream | Adds moderation, privacy, and distraction risks outside the core workflow. |
| Real external system course import in v1.2 | This milestone focuses on local course-center usability; external auth and mapping are deferred. |
| Bidirectional course sync in v1.2 | Remote conflict ownership and retry behavior need separate validation after local import works. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| AUTH-06 | Phase 2 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 2 | Pending |
| DATA-05 | Phase 2 | Pending |
| LESSON-01 | Phase 3 | Complete |
| LESSON-02 | Phase 3 | Complete |
| LESSON-03 | Phase 3 | Complete |
| LESSON-04 | Phase 3 | Complete |
| LESSON-05 | Phase 3 | Complete |
| LESSON-06 | Phase 3 | Complete |
| LESSON-07 | Phase 3 | Complete |
| LESSON-08 | Phase 3 | Complete |
| LEARN-01 | Phase 4 | Complete |
| LEARN-02 | Phase 4 | Complete |
| LEARN-03 | Phase 4 | Complete |
| LEARN-04 | Phase 4 | Complete |
| LEARN-05 | Phase 4 | Complete |
| LEARN-06 | Phase 4 | Complete |
| LEARN-07 | Phase 4 | Complete |
| LEARN-08 | Phase 4 | Complete |
| LEARN-09 | Phase 4 | Complete |
| CLASS-01 | Phase 5 | Complete |
| CLASS-02 | Phase 5 | Complete |
| CLASS-03 | Phase 5 | Complete |
| CLASS-04 | Phase 5 | Complete |
| CLASS-05 | Phase 5 | Pending |
| CLASS-06 | Phase 5 | Complete |
| CLASS-07 | Phase 5 | Complete |
| AI-01 | Phase 6 | Complete |
| AI-02 | Phase 6 | Complete |
| AI-03 | Phase 6 | Complete |
| AI-04 | Phase 6 | Complete |
| AI-05 | Phase 6 | Complete |
| AI-06 | Phase 6 | Complete |
| AI-07 | Phase 6 | Complete |
| PLUGIN-01 | Phase 6 | Complete |
| PLUGIN-02 | Phase 6 | Complete |
| PLUGIN-03 | Phase 6 | Complete |
| PLUGIN-04 | Phase 6 | Complete |
| PLUGIN-05 | Phase 6 | Complete |
| PLUGIN-06 | Phase 6 | Complete |
| PLUGIN-07 | Phase 6 | Complete |
| UI-01 | Phase 8 | Complete |
| UI-02 | Phase 9 | Complete |
| UI-03 | Phase 9 | Complete |
| UI-04 | Phase 10 | Complete |
| COURSE-01 | Phase 13 | Complete |
| COURSE-02 | Phase 13 | Complete |
| COURSE-03 | Phase 13 | Complete |
| COURSE-04 | Phase 14 | Pending |
| COURSE-05 | Phase 14 | Pending |
| COURSE-06 | Phase 14 | Pending |
| COURSE-07 | Phase 14 | Pending |
| COURSE-08 | Phase 15 | Pending |
| COURSE-09 | Phase 15 | Pending |
| COURSE-10 | Phase 13 | Complete |
| SCHEDULE-01 | Phase 18 | Complete |
| SCHEDULE-02 | Phase 18 | Complete |
| SCHEDULE-03 | Phase 18 | Complete |
| SCHEDULE-04 | Phase 18 | Complete |
| SCHEDULE-05 | Phase 18 | Complete |
| SCHEDULE-06 | Phase 18 | Complete |
| SCHEDULE-07 | Phase 18 | Complete |
| SCHEDULE-08 | Phase 18 | Complete |
| SCHEDULE-09 | Phase 18 | Complete |
| ORCH-01 | Phase 21 | Complete |
| ORCH-02 | Phase 22 | Pending |
| ORCH-03 | Phase 22 | Pending |
| ACT-01 | Phase 23 | Complete |
| ACT-02 | Phase 23 | Complete |
| ACT-03 | Phase 24 | Pending |
| EVAL-01 | Phase 24 | Pending |
| EVAL-02 | Phase 24 | Pending |
| EVAL-03 | Phase 21 | Complete |
| ANALYTICS-01 | Phase 25 | Pending |
| ANALYTICS-02 | Phase 26 | Pending |
| UI-05 | Phase 26 | Pending |

**Coverage:**
- v1/v1.1/v1.2/v1.x/v1.3 requirements: 90 total
- Mapped to phases: 90
- Unmapped: 0
- Duplicate mappings: 0

---
*Requirements defined: 2026-05-04*  
*Last updated: 2026-05-12 after defining milestone v1.3 teaching orchestration requirements*
