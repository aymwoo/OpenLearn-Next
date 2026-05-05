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

- [ ] **CLASS-01**: Teacher can launch a published lesson as a classroom session with a roster of participants.
- [ ] **CLASS-02**: Teacher can see and change the active step of a live classroom session.
- [ ] **CLASS-03**: Teacher can switch a classroom session between locked mode, where students follow the active step, and unlocked mode, where students can move independently.
- [ ] **CLASS-04**: Student player reflects active step and lock mode changes through an Edge Runtime SSE stream.
- [ ] **CLASS-05**: Classroom session state, current step, lock mode, participants, and events are durable in SQLite and not stored only in SSE memory.
- [ ] **CLASS-06**: Reconnecting or late-joining students receive a consistent snapshot of classroom session state.
- [ ] **CLASS-07**: Teacher can recover from classroom control conflicts or stale UI with clear state feedback.

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
| CLASS-01 | Phase 5 | Pending |
| CLASS-02 | Phase 5 | Pending |
| CLASS-03 | Phase 5 | Pending |
| CLASS-04 | Phase 5 | Pending |
| CLASS-05 | Phase 5 | Pending |
| CLASS-06 | Phase 5 | Pending |
| CLASS-07 | Phase 5 | Pending |
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

**Coverage:**
- v1 requirements: 55 total
- Mapped to phases: 55
- Unmapped: 0
- Duplicate mappings: 0

---
*Requirements defined: 2026-05-04*  
*Last updated: 2026-05-04 after roadmap creation*
