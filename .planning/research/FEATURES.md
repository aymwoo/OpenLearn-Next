# Feature Research

**Domain:** AI-native K-12 classroom workflow engine, teacher AI multi-agent
platform, RAG ecosystem, and safe plugin/theme extension system  
**Researched:** 2026-05-04  
**Confidence:** MEDIUM-HIGH

## Feature Landscape

OpenLearn Next v1 must prove one core loop: teachers can program a class as
ordered steps, run or assign that class, and students can complete it with
tracked progress and submissions. The v1 feature set must therefore be narrower
than a full LMS, but deeper than a generic lesson editor.

Research against Google Classroom, Canvas, 1EdTech LTI, and MCP shows that users
expect roles, classes, assignments, materials, progress, submissions, feedback,
and integrations. The project's distinct value comes from treating a lesson as
an executable step graph, then layering AI agents, RAG, MCP, and safe plugins on
top of that workflow.

### Table Stakes (Users Expect These)

Features in this section are required for the product to feel credible in v1.
Missing these features breaks the core classroom loop or makes the system unsafe
for K-12 use.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Authentication with role-aware routing | Schools expect teachers and students to see different workspaces. | MEDIUM | Use Auth.js v5. Route by role after sign-in. Keep anonymous public pages limited to marketing or sample content. |
| Core RBAC roles: admin, teacher, student | Classroom systems expose different permissions for administrators, teachers, students, and guardians. | MEDIUM | v1 must implement admin, teacher, and student. Parent, developer, and AI Agent can exist in the model but stay hidden or limited until v1.x. |
| Resource-scoped ABAC checks | A student must not access another class, lesson, progress record, or submission. | HIGH | Every DAL and Server Action must verify `userId`, `role`, and ownership or enrollment. Do not rely on UI hiding. |
| Teacher dashboard | Teachers need a starting point for classes, recent lessons, drafts, and active sessions. | MEDIUM | Keep it focused: class cards, lesson drafts, start/resume class, and recent student activity. |
| Student dashboard | Students expect assigned work, current progress, and quick resume. | MEDIUM | Show active lessons, completion state, due or recent tasks, and resume button. |
| Course and lesson model | LMS products organize work into classes, courses, sections, assignments, and materials. | MEDIUM | v1 should support classes/courses, lessons, enrollment, and published/draft state. Avoid full SIS/term hierarchy. |
| Step-based lesson authoring | This is the core product promise: teachers program class flow as steps. | HIGH | v1 must support `content`, `task`, and `quiz` step types with title, instructions, body, settings, and order. |
| Drag-and-drop step ordering | Teachers expect fast editing without manual numbering. | MEDIUM | Use LexoRank or equivalent rank keys to avoid cascading updates during reorder. |
| Draft autosave and publish workflow | Teachers expect work not to be lost and students should only see published content. | HIGH | Autosave drafts, show save status, and separate draft from published classroom execution. |
| Basic content/material attachment | Google Classroom and Canvas normalize attaching documents, links, videos, and resources to work. | MEDIUM | v1 can support URL, rich text, and uploaded resource references. Defer per-student file-copy semantics. |
| Student step player | Students need a guided interface to consume content, answer quizzes, and submit tasks. | HIGH | This is the other half of the core value. Must include step navigation, current step state, and accessible reading layout. |
| Step progress tracking | Students expect resume, and teachers need completion visibility. | HIGH | Implement `StepProgress` with not started, in progress, completed, skipped or equivalent states. |
| Append-only task submissions | Assignment systems expect resubmission and teacher review, while K-12 auditability needs history. | HIGH | Store every attempt, mark `isLatest`, validate payloads with Zod, and never overwrite prior attempts. |
| Quiz answer capture and basic scoring | Quizzes are table stakes for classroom workflows. | MEDIUM | v1 can support multiple choice and short answer. Defer question banks, rubrics, and advanced item types. |
| Teacher submission review | Teachers need to see who submitted, latest answer, and attempt history. | MEDIUM | Provide a simple per-step review table and student detail view. Full gradebook is deferred. |
| Basic teacher feedback | Classroom products support comments, grades, or returned work. | MEDIUM | v1 should support short textual feedback and optional status. Numeric grading can be minimal or deferred if it threatens scope. |
| Classroom run session | Teachers need to launch a lesson as a live class, not only publish static content. | HIGH | Model a session with active lesson, active step, locked/unlocked mode, and roster state. |
| SSE classroom broadcast | Live class execution needs low-latency teacher-to-student state changes. | HIGH | v1 must broadcast active step, lock mode, and lightweight session events through Edge Runtime SSE. |
| Locked and unlocked modes | Teacher-led and self-paced classroom modes are core to the product vision. | MEDIUM | Locked means students follow teacher active step. Unlocked means students can move independently while progress is tracked. |
| Resource center | Teachers expect to reuse teaching materials. | MEDIUM | v1 should provide a simple library for uploaded/linked materials and AI/RAG ingestion candidates. |
| Safe defaults for K-12 data | Schools expect privacy, least privilege, and predictable access. | HIGH | Avoid broad sharing, public student profiles, public class streams, and plugin data access in v1. |
| Simplified Chinese, K-12-friendly UI | The project design requires Simplified Chinese and low-stress Lexend visual language. | MEDIUM | Follow `DESIGN.md`: no heavy borders, tonal surfaces, clear student focus, large readable content. |

### Differentiators (Competitive Advantage)

These features make OpenLearn Next distinct from a generic LMS. v1 should include
only the differentiators that directly strengthen the step-based classroom loop.
The rest should be staged after validation.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Executable lesson workflow engine | Turns a lesson plan into a runnable classroom program, not a static assignment list. | HIGH | Include in v1. This is the product's core category claim. |
| Atomic step schema | Makes lessons composable, analyzable, and extensible by AI agents and plugins. | HIGH | Include in v1 with strict schemas for `content`, `task`, and `quiz`. Add future step types later. |
| Teacher live control console | Gives teachers real-time classroom orchestration: current step, lock mode, progress, and attention signals. | HIGH | Include a minimal v1 console. Defer heatmaps and predictive analytics. |
| AI lesson drafting through LessonAgent | Reduces teacher prep time by generating a structured step sequence. | HIGH | Include as v1 beta only if the workflow engine is stable. Output must be editable before publish. |
| AI homework/task drafting through HomeworkAgent | Speeds creation of practice steps and assignments. | MEDIUM-HIGH | v1.x unless LessonAgent is already working. Use same step schema. |
| RAG-backed lesson assistance | Grounds AI output in teacher-uploaded textbooks and school materials. | HIGH | v1 should define interfaces and optionally ship a minimal ingestion prototype. Full Qdrant search can be v1.x. |
| Multi-agent teaching package generation | Agents collaborate to generate lesson, homework, data insights, tutoring, and parent summaries. | VERY HIGH | Defer to v2. Too broad before validating the base classroom loop. |
| TutorAgent for student help | Provides contextual help inside a step, grounded in the lesson and resources. | HIGH | Defer to v1.x/v2 because it raises safety, hallucination, and age-appropriate response concerns. |
| DataAgent learning insight summaries | Helps teachers understand completion, misconceptions, and class pacing. | HIGH | v1.x after sufficient progress and submission data exists. Start with deterministic dashboards first. |
| ParentAgent summaries | Gives parents digestible updates without exposing classroom internals. | HIGH | v2. Requires parent role, notification preferences, privacy review, and reliable data. |
| MCP connector layer | Lets OpenLearn Next interoperate with Moodle, GitHub, Notion, WeCom, DingTalk, and AI tools. | HIGH | v1 should define adapter boundaries. Ship one internal stub or dev-only connector, not full external sync. |
| Plugin hook and action framework | Enables a safe extension ecosystem without arbitrary code execution. | HIGH | Include minimal v1 foundation: plugin manifest, permission declaration, hook registry, and action allowlist. |
| Declarative JSON themes | Lets schools customize branding safely. | MEDIUM | Include v1 if constrained to tokens, colors, typography, and layout-safe settings. |
| Step-type plugin registry | Allows future step types without changing core lesson code. | HIGH | v1.x. First stabilize built-in step contracts and permissions. |
| AI-generated classroom variants | Lets teachers adapt a lesson for level, pace, or student group. | HIGH | v2. Valuable after base authoring and RAG are validated. |
| Open education workflow templates | Reusable templates for导入、讲授、互动、练习、总结. | MEDIUM | v1.x. Start with a small built-in template set if time permits. |

### Anti-Features (Commonly Requested, Often Problematic)

These features look attractive but conflict with the v1 goal or create security,
privacy, and delivery risk. They should be explicitly excluded from the v1
requirements unless a later phase revalidates them.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full LMS replacement | Schools may ask for grades, attendance, calendars, discussions, imports, standards, and reporting. | It would bury the workflow engine under commodity LMS scope. | Build the step workflow engine first, then integrate with LMS platforms through MCP/LTI-style connectors. |
| Full gradebook | Teachers recognize gradebooks from Canvas and Google Classroom. | Grade policies, weighting, late rules, exports, and SIS sync are a product in themselves. | v1 supports submission review, basic feedback, and optional simple score per step. |
| Native mobile app | K-12 users often expect mobile access. | Native apps multiply QA, auth, offline, push, and release complexity. | Ship responsive web and PWA-friendly layouts first. |
| Arbitrary third-party plugin code | Developers want maximum extensibility. | Unsafe for K-12 data, hard to sandbox, and violates project constraints. | Use declarative JSON plugins, permission manifests, hook events, and Core API actions. |
| Plugin direct database access | Faster for plugin authors. | Breaks permissions, auditability, migrations, and tenant boundaries. | Route all extensions through `Event -> Hook -> Action -> Core API`. |
| Realtime everything | Feels modern and collaborative. | WebSocket/CRDT complexity is unnecessary for v1 and can destabilize progress tracking. | Use SSE only for classroom broadcast; use normal Server Actions for editing and submissions. |
| Collaborative multi-teacher lesson editing | Teams may want co-authoring. | Requires conflict resolution, presence, permissions, and audit trails. | v1 supports single-owner editing and future share/copy. |
| Complex branching lesson graph | Makes lessons feel programmable. | Teachers need a simple mental model first; branching complicates progress, analytics, and live control. | v1 uses linear ordered steps. Add conditional branches after step execution is proven. |
| AI autonomous classroom control | Agents could advance steps or intervene with students. | Unsafe and hard to explain in K-12; teacher must remain in control. | AI suggests, drafts, summarizes, and flags; teacher approves all class-affecting actions. |
| Ungrounded AI tutoring | Fast to demo. | Hallucination and age-appropriateness risk. | Require RAG grounding, safety filters, citations, and teacher-visible logs before launch. |
| Full PDF/multimodal textbook pipeline in v1 | RAG quality depends on textbook ingestion. | Parsing PDFs, images, formulas, tables, and Chinese educational content is a deep subsystem. | v1 defines `KnowledgeSource` and ingestion contracts; v1.x adds robust PDF and Qdrant indexing. |
| SIS/OneRoster full sync | Schools may need roster automation. | Adds procurement, data mapping, and institutional integration complexity. | v1 supports manual class/enrollment management; later add standards-based sync. |
| Public class stream/social feed | Familiar from Classroom streams and social products. | Adds moderation, notification, privacy, and distraction risk. | Use teacher announcements later; keep v1 focused on structured lesson steps. |
| Marketplace for plugins/themes | Attractive ecosystem story. | Marketplace trust, review, billing, ratings, and abuse handling are too large. | v1 ships local/admin-installed declarative plugins and themes only. |

## Feature Dependencies

The dependency graph below should drive roadmap ordering. The workflow engine and
permissions must land before AI, RAG, MCP, and plugin features depend on them.

```text
Auth + core RBAC
    └──requires──> DAL permission checks
                      ├──requires──> classes/courses/enrollment
                      │                 ├──requires──> teacher dashboard
                      │                 └──requires──> student dashboard
                      └──requires──> safe Server Actions

Step schema + lesson model
    ├──requires──> teacher step authoring
    │                 ├──requires──> drag-and-drop LexoRank ordering
    │                 ├──requires──> autosave drafts
    │                 └──requires──> publish workflow
    ├──requires──> student step player
    │                 ├──requires──> StepProgress tracking
    │                 └──requires──> TaskSubmissions / quiz answers
    └──requires──> classroom run session
                      └──requires──> SSE broadcast + locked/unlocked modes

Submission model
    ├──requires──> student player
    ├──requires──> teacher review
    └──enhances──> DataAgent insights

Resource center
    ├──enhances──> lesson authoring attachments
    └──requires──> RAG KnowledgeSource contracts
                      └──enhances──> LessonAgent / TutorAgent grounding

Plugin manifest + permissions
    ├──requires──> hook registry
    │                 └──requires──> Core API action allowlist
    └──enhances──> declarative themes and future step-type plugins

MCP adapter boundary
    ├──enhances──> external LMS/tool integration
    └──conflicts──> full LMS replacement in v1
```

### Dependency Notes

- **RBAC requires DAL permission checks:** Role-aware pages are not sufficient
  for K-12. Every server-side read and write must validate user, role, and
  resource access.
- **Step schema requires authoring before AI:** AI agents must generate and edit
  the same validated schema teachers use manually. Otherwise AI output becomes a
  parallel, fragile content format.
- **Student player requires StepProgress:** Without progress records, the core
  promise of tracked completion fails.
- **SSE requires classroom run sessions:** Broadcasting raw lesson edits is the
  wrong abstraction. SSE should publish session events such as active step and
  lock mode.
- **RAG requires resource center and KnowledgeSource contracts:** Retrieval
  needs explicit source ownership, permissions, chunk metadata, and lifecycle
  before AI agents can safely use it.
- **Plugins require Core API actions:** A hook system without a safe action
  allowlist becomes arbitrary backend access.
- **MCP enhances integrations but conflicts with full LMS replacement:** MCP is
  the right v1 direction for connecting to existing systems instead of cloning
  their entire feature surface.

## MVP Definition

The v1 MVP must validate the smallest complete classroom loop. It should feel
like an executable classroom workflow product, not a broad LMS clone.

### Launch With (v1)

Minimum viable product: teachers can create a step-based class flow, run or
assign it, and students can complete it with tracked progress.

- [ ] Auth.js sign-in with admin, teacher, and student roles — required for all
      role-specific workflows.
- [ ] DAL and Server Action permission checks — required for safe K-12 data
      handling.
- [ ] Class/course, enrollment, lesson, and step data models — required for the
      classroom domain.
- [ ] Teacher dashboard — required to create, edit, publish, and launch lessons.
- [ ] Student dashboard — required to discover assigned lessons and resume work.
- [ ] Step authoring for `content`, `task`, and `quiz` — required to express
      the core teaching workflow.
- [ ] LexoRank drag-and-drop ordering — required to make step authoring feel
      usable.
- [ ] Draft autosave and publish state — required to protect teacher work and
      avoid exposing drafts.
- [ ] Student step player — required for students to complete the programmed
      class.
- [ ] `StepProgress` tracking and resume — required to prove tracked classroom
      completion.
- [ ] Append-only `TaskSubmissions` with `isLatest` — required for task history,
      resubmission, and auditability.
- [ ] Basic quiz capture and simple scoring — required for interactive class
      checks.
- [ ] Teacher review of progress and submissions — required to close the
      teaching loop.
- [ ] Classroom run session with active step — required for live class
      execution.
- [ ] Edge Runtime SSE broadcast for active step and lock mode — required for
      teacher-led classroom orchestration.
- [ ] Locked/unlocked classroom modes — required for teacher-led and self-paced
      execution.
- [ ] Minimal resource center for links/uploads — required for lesson materials
      and future RAG.
- [ ] Minimal AI/RAG interfaces and feature flags — required to preserve the
      AI-native architecture without blocking v1 on full AI quality.
- [ ] Plugin/theme manifest foundation — required to lock extension boundaries
      early while avoiding arbitrary code.

### Add After Validation (v1.x)

Add these features after the v1 classroom loop works with real teachers and
students.

- [ ] LessonAgent beta — add when manual step authoring is stable and there is a
      validated schema for AI output.
- [ ] HomeworkAgent beta — add when task and quiz schemas are stable enough for
      generated practice.
- [ ] Deterministic class analytics — add when progress and submission volume is
      high enough to reveal useful patterns.
- [ ] Qdrant-backed RAG ingestion for PDFs and web resources — add when the
      resource center and KnowledgeSource permissions are stable.
- [ ] Teacher-facing AI citations and source inspection — add before any
      student-facing AI.
- [ ] MCP connector prototype for one system — add after the Core API and auth
      model are stable.
- [ ] Declarative theme editor — add after base UI components are settled.
- [ ] Built-in workflow templates — add when teachers repeat common lesson
      structures.
- [ ] Parent read-only summaries — add after parent role, consent, and privacy
      rules are defined.
- [ ] Developer plugin admin screen — add after plugin manifests, permissions,
      and hook logs exist.

### Future Consideration (v2+)

These features are valuable, but they should wait until product-market fit and
operational safety are stronger.

- [ ] Multi-agent teaching package generation — defer until individual agents
      are proven and grounded.
- [ ] TutorAgent student chat — defer until RAG, safety filters, audit logs, and
      age-appropriate policies are validated.
- [ ] DataAgent predictive insights — defer until enough longitudinal data
      exists.
- [ ] ParentAgent automated digest — defer until parent access and notification
      governance are mature.
- [ ] Conditional/branching step graphs — defer until linear step execution is
      simple and reliable.
- [ ] Full LTI Advantage or OneRoster support — defer until integration demand
      is validated by institutions.
- [ ] Plugin marketplace — defer until local safe plugins prove value.
- [ ] Native mobile apps — defer until responsive web usage shows mobile gaps
      that PWA patterns cannot solve.
- [ ] Full gradebook and SIS export — defer until schools require OpenLearn Next
      to become a system of record.

## Feature Prioritization Matrix

This matrix ranks features by launch relevance. P1 means v1 launch scope, P2
means v1.x, and P3 means v2 or later.

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auth and core RBAC | HIGH | MEDIUM | P1 |
| Resource-scoped DAL permissions | HIGH | HIGH | P1 |
| Course/class/enrollment model | HIGH | MEDIUM | P1 |
| Teacher dashboard | HIGH | MEDIUM | P1 |
| Student dashboard | HIGH | MEDIUM | P1 |
| Step schema and lesson model | HIGH | HIGH | P1 |
| Teacher step authoring | HIGH | HIGH | P1 |
| LexoRank ordering | MEDIUM | MEDIUM | P1 |
| Draft autosave and publish | HIGH | HIGH | P1 |
| Student step player | HIGH | HIGH | P1 |
| StepProgress tracking | HIGH | HIGH | P1 |
| Append-only submissions | HIGH | HIGH | P1 |
| Basic quizzes | HIGH | MEDIUM | P1 |
| Teacher progress/submission review | HIGH | MEDIUM | P1 |
| Classroom run session | HIGH | HIGH | P1 |
| SSE active-step broadcast | HIGH | HIGH | P1 |
| Locked/unlocked modes | HIGH | MEDIUM | P1 |
| Minimal resource center | MEDIUM | MEDIUM | P1 |
| Plugin/theme manifest foundation | MEDIUM | HIGH | P1 |
| AI/RAG interface contracts | MEDIUM | MEDIUM | P1 |
| LessonAgent beta | HIGH | HIGH | P2 |
| HomeworkAgent beta | MEDIUM | HIGH | P2 |
| Qdrant RAG ingestion | HIGH | HIGH | P2 |
| MCP connector prototype | MEDIUM | HIGH | P2 |
| Deterministic analytics | HIGH | MEDIUM | P2 |
| Declarative theme editor | MEDIUM | MEDIUM | P2 |
| Workflow templates | MEDIUM | MEDIUM | P2 |
| Parent summaries | MEDIUM | HIGH | P2 |
| TutorAgent | HIGH | HIGH | P3 |
| Full multi-agent package generation | HIGH | VERY HIGH | P3 |
| Full gradebook | MEDIUM | VERY HIGH | P3 |
| Native mobile apps | MEDIUM | VERY HIGH | P3 |
| Plugin marketplace | MEDIUM | VERY HIGH | P3 |

**Priority key:**

- P1: Must have for launch.
- P2: Add after the v1 classroom loop is validated.
- P3: Future consideration after product-market fit or institutional demand.

## Competitor Feature Analysis

The market baseline comes from general classroom and LMS tools. OpenLearn Next
should not copy their full surface area. It should take table-stakes workflows
and reorganize them around executable lesson steps.

| Feature | Google Classroom | Canvas | Our Approach |
|---------|------------------|--------|--------------|
| Class and role model | Teachers create/manage classes, assignments, materials, grades, and feedback; students track and submit work; guardians receive summaries. | Courses, sections, instructors, students, assignments, analytics, gradebook, apps, and external tools. | Implement only admin/teacher/student v1, with parent/developer/AI Agent modeled for later. |
| Assignments/materials | Teachers attach docs, links, images, videos, Drive files, NotebookLM/Gems, and add-ons. | Assignments, modules, files, pages, quizzes, discussions, external apps, and imports. | Treat materials and tasks as step payloads inside a runnable lesson workflow. |
| Student work | Students submit work, can edit/resubmit in some flows, and see grades/feedback. | Rich submission types, attempts, gradebook, peer review, comments, and statuses. | Use append-only submissions, latest attempt pointers, basic feedback, and future gradebook integration. |
| Realtime classroom flow | Not primarily a programmable live step engine. | Strong LMS/course management; less focused on teacher-led step broadcasting. | Make live step control, lock mode, and student progress the core differentiator. |
| AI | Google Classroom references NotebookLM and Gems for AI-powered study guides and tutors. | Canvas includes IgniteAI translations, summaries, and insights in guide listings. | Use AI as schema-constrained co-teachers: draft, ground, summarize, and suggest, with teacher approval. |
| External tools | Classroom add-ons and Google ecosystem integrations. | LTI external apps, Google Assignments LTI, course imports, and rich ecosystem integrations. | Use safe plugins internally and MCP/LTI-style boundaries for external systems later. |
| Analytics | Basic classwork and guardian summaries. | Course analytics, participation, reports, and gradebook analytics. | Start with deterministic progress/submission views, then layer DataAgent insights. |

## v1 Feature Boundaries by Requested Area

This section maps the user's requested domains directly to v1 versus deferred
scope.

| Area | v1 Include | Defer |
|------|------------|-------|
| RBAC | Admin, teacher, student; resource-scoped checks; model future roles. | Full parent portal, developer console, AI Agent autonomous permissions, institutional role customization. |
| Teacher lesson workflow authoring | Step editor, content/task/quiz, drag reorder, autosave, publish, simple materials. | Branching graphs, co-editing, advanced templates, standards alignment, full lesson marketplace. |
| Step-based classroom execution | Run session, active step, lock/unlock, teacher console, roster progress snapshot. | Automated AI control, complex pacing algorithms, multi-room orchestration. |
| Student player/progress | Step player, resume, progress states, completion tracking. | Offline mode, native mobile, gamified achievements, adaptive branching. |
| Submissions | Append-only tasks, latest pointer, basic quiz answers, simple feedback. | Full gradebook, rubrics, peer review, plagiarism/originality reports, bulk download/upload. |
| SSE realtime | Active step, lock mode, session heartbeat or reconnect. | WebSocket collaboration, realtime editor CRDT, chat, realtime every submission update. |
| AI agents | Interface contracts, feature flags, optional LessonAgent beta. | Full multi-agent team, TutorAgent student chat, ParentAgent, autonomous classroom actions. |
| RAG | KnowledgeSource contracts, resource ownership, optional prototype ingestion. | Production-grade multimodal PDF parsing, vector ops UI, cross-school knowledge sharing. |
| MCP | Adapter boundary and one stub/prototype. | Full Moodle/GitHub/Notion/WeCom/DingTalk sync matrix and production connector marketplace. |
| Safe plugins | JSON manifest, permissions, hooks, action allowlist, theme tokens. | Arbitrary code execution, DB access, marketplace, unreviewed third-party actions. |

## Sources

- Project context and constraints: `.planning/PROJECT.md` (HIGH confidence).
- UI and interaction constraints: `DESIGN.md` (HIGH confidence).
- Google Classroom Help, "About Classroom": roles, classwork, assignments,
  grades, feedback, class stream, guardian summaries, and AI-powered study
  guides/tutors with NotebookLM and Gems (official source, MEDIUM-HIGH
  confidence): https://support.google.com/edu/classroom/answer/6020279
- Google Classroom Help, "How attachments are shared in Classroom": assignment
  attachment workflow, student submission, teacher grading/return, resubmission
  (official source, MEDIUM-HIGH confidence):
  https://support.google.com/edu/classroom/answer/6020260
- Canvas Instructor Guide index: assignments, course analytics, announcements,
  external apps/LTI, grades, course pacing, imports, and elementary workflows
  (official/community documentation, MEDIUM confidence):
  https://community.canvaslms.com/t5/Instructor-Guide/tkb-p/Instructor
- Model Context Protocol documentation: MCP as an open standard for connecting
  AI applications to external data sources, tools, and workflows (official
  source, HIGH confidence): https://modelcontextprotocol.io/docs/getting-started/intro
- 1EdTech Learning Tools Interoperability: LTI 1.3, Assignment and Grade
  Services, Names and Role Provisioning, and Deep Linking for secure learning
  tool integration (official source, HIGH confidence):
  https://www.imsglobal.org/activity/learning-tools-interoperability

---
*Feature research for: OpenLearn Next*  
*Researched: 2026-05-04*
