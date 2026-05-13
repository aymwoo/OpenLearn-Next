## ROADMAP

**Milestone:** v1.3 Teaching Orchestration & Classroom Intelligence
**Phases:** 6
**Granularity:** coarse
**Coverage:** 12/12 v1.3 requirements mapped ✓ + v1.2 carry-over backlog frozen separately

### Current milestone phases

- [x] **Phase 21: Teaching design contracts and evidence foundation** - Extend the current linear lesson model with teaching-design metadata, class-launch contracts, and durable classroom evidence primitives. (completed 2026-05-13)
- [x] **Phase 22: Teacher orchestration workspace and launch preparation** - Turn the current editor and launch path into a class-ready teaching orchestration workspace with readiness gating. (completed 2026-05-13)
- [ ] **Phase 23: Student in-class activity flow** - Upgrade the student runtime into a clearer classroom activity experience with durable quick-response and evidence capture.
- [ ] **Phase 24: Live classroom operations and formative evaluation** - Bring runtime monitoring, participation tracking, observation notes, and unified evaluation workflow into the teacher classroom product surface.
- [ ] **Phase 25: Teaching data capture and session analytics** - Aggregate classroom evidence into deterministic session-level metrics, recap views, and teacher workload summaries.
- [ ] **Phase 26: Cross-session trends and Stitch productization** - Deliver student/class trend analysis and complete high-quality Stitch-aligned productization across planning, runtime, evaluation, and analytics pages.

### Carry-over backlog from v1.2

- [ ] **Phase 14: Course lifecycle and associations** - Add publish, unpublish, archive, delete, and class/student association workflows with school-scoped guardrails.
- [ ] **Phase 15: Batch course import** - Add structured batch import, duplicate detection, and import-result feedback on top of the same course rules.

### Completed history

- [x] **Phase 13: Course center foundation** - Build the teacher course center, manual create and edit flows, and the course-to-lesson entry path. (completed 2026-05-09)
- [x] **Phase 16: Theme plugins and layout orchestration** - Expand theme plugins from token-only styling into validated layout composition, navigation placement, and page-surface orchestration. (completed 2026-05-09)
- [x] **Phase 17: Teacher flow editor enhancement** - Upgrade `/teacher/editor` into a flexible classroom-flow editor with composable teaching steps, structured property editing, preview, and publish-readiness checks. (completed 2026-05-10)
- [x] **Phase 18: Teaching schedule OS** - Build a production-grade teaching schedule system around `Import Layer -> Normalized Schedule Model -> Runtime Daily Agenda Engine`, covering import, normalization, daily agenda generation, rescheduling, holidays, reminders, AI assistance, and plugin-safe extensibility. (completed 2026-05-10)
- [x] **Phase 19: Teacher shell route metadata system** - Replace teacher-shell route string conditionals with route metadata-driven shell behavior, centralized shell config resolution, and future-safe layout variants without changing current visuals. (completed 2026-05-11)
- [x] **Phase 20: Help center and developer guides** - Build `/help` as a structured help center covering plugin development, theme development, and the currently available data interfaces and actions with codebase-accurate guidance. (completed 2026-05-11)

### Phase Details

### Phase 13: Course center foundation
**Goal**: Teachers can open a usable course center, create and edit courses, and move from a course into lesson or teaching-plan management.
**Depends on**: Phase 12
**Requirements**: COURSE-01, COURSE-02, COURSE-03, COURSE-10
**Success Criteria**:
  1. Teacher can open `/teacher/courses` and see only teacher-scoped courses with status, subject, grade, lesson count, class links, enrollment count, and updated time.
  2. Teacher can create a course manually through a validated form and immediately see it appear in the course center.
  3. Teacher can edit course base information and receive clear read-your-writes feedback after save.
  4. Teacher can open a course detail or equivalent entry and continue directly into lesson or teaching-plan management.
**Plans**: 5 plans
- [x] 13-01-PLAN.md — Build the teacher-scoped course center read model and route surface.
- [x] 13-02-PLAN.md — Add manual course create and edit flows through Server Actions and DAL.
- [x] 13-03-PLAN.md — Wire the course detail workflow into lesson and teaching-plan management entry points.
- [x] 13-04-PLAN.md — Close the teacher-owned read leak and expose real course-center school scope metadata.
- [x] 13-05-PLAN.md — Replace hardcoded create scope with DTO-driven single-school and multi-school create flow wiring.
**UI hint**: yes

### Phase 14: Course lifecycle and associations
**Goal**: Teachers can safely manage course visibility, cleanup, and roster associations inside the course workflow.
**Depends on**: Phase 13
**Requirements**: COURSE-04, COURSE-05, COURSE-06, COURSE-07
**Success Criteria**:
  1. Teacher can publish, unpublish, and archive a course and see consistent status behavior across the course center and adjacent teacher flows.
  2. Teacher can delete an eligible course only through a guarded path with explicit confirmation and clear failure feedback when deletion is blocked.
  3. Teacher can associate and remove classes within the teacher's school scope.
  4. Teacher can manage student enrollments for a course without bypassing existing school and membership boundaries.
**Plans**: 3 plans
- [ ] 14-01-PLAN.md — Add course lifecycle actions and status-safe visibility rules.
- [ ] 14-02-PLAN.md — Build class association management within school scope.
- [ ] 14-03-PLAN.md — Build course enrollment management and deletion guardrails.
**UI hint**: yes

### Phase 15: Batch course import
**Goal**: Teachers can import courses in bulk through a safe structured-file workflow with validation, duplicate handling, and clear outcomes.
**Depends on**: Phase 14
**Requirements**: COURSE-08, COURSE-09
**Success Criteria**:
  1. Teacher can upload a structured batch file and preview row-level validation outcomes before changes are applied.
  2. System applies successful rows through the same teacher-scoped course mutation rules as manual management.
  3. Teacher sees import outcomes as created, updated, skipped, or failed rows with explicit reasons.
  4. Duplicate records are not silently created inside the same school scope.
**Plans**: 3 plans
- [ ] 15-01-PLAN.md — Define the batch import template, parsing pipeline, and validation DTOs.
- [ ] 15-02-PLAN.md — Implement preview and apply flows with duplicate detection and scoped writes.
- [ ] 15-03-PLAN.md — Surface import results, failure reasons, and regression coverage for course management flows.
**UI hint**: yes

### Phase 16: Theme plugins and layout orchestration
**Goal**: Theme plugins can evolve from visual token swaps into a richer, validated layout system that defines shell composition, component placement, and navigation position while staying on the existing `manifest.theme -> ThemeInjector -> settings switch -> teacher shell` path.
**Depends on**: Phase 15, Phase 6
**Requirements**: PLUGIN-05, PLUGIN-06
**Success Criteria**:
  1. Theme plugins can declaratively define allowlisted layout structure for teacher-facing pages, including component regions, order, size, and position, without introducing arbitrary code execution or unrestricted CSS injection.
  2. A theme can switch primary navigation between top and left layouts and safely control page-level component placement while preserving responsive fallbacks and the current default layout when theme layout data is absent or invalid.
  3. Existing school-scoped `manifest.theme` registration, `ThemeInjector`, settings-page theme switching, and teacher shell theme application continue to work as the single runtime path for both visual tokens and layout orchestration.
  4. Teacher shell and selected page surfaces can render theme-defined component arrangements consistently, so themes can express materially different information architecture rather than only color and spacing changes.
**Plans**: 4 plans
- [x] 16-01-PLAN.md — Extend the `manifest.theme` contract with validated layout-composition primitives and guardrails for regions, slots, sizing, and navigation mode.
- [x] 16-02-PLAN.md — Compile theme layout definitions through the existing theme registry and `ThemeInjector` path with stable fallback behavior.
- [x] 16-03-PLAN.md — Apply theme-driven layout orchestration to the teacher shell and selected page surfaces, including top-vs-left navigation and component placement.
- [x] 16-04-PLAN.md — Expand settings, preview copy, and regression coverage so richer theme plugins remain school-scoped, safe, and understandable.
**UI hint**: yes

### Phase 17: Teacher flow editor enhancement
**Goal**: Teachers can use `/teacher/editor` as a flexible, powerful, composable classroom-flow editor that combines content, task, quiz, and built-in teaching-step plugins with ordering, property editing, preview, and publish-readiness checks.
**Depends on**: Phase 3, Phase 6, Phase 12, Phase 16
**Requirements**: LESSON-03, LESSON-04, LESSON-07, LESSON-08, PLUGIN-01, PLUGIN-02, PLUGIN-05
**Success Criteria**:
  1. Teacher can add, reorder, and remove `content`, `task`, `quiz`, and enabled built-in teaching-step plugins inside `/teacher/editor` within the same teacher-owned lesson flow.
  2. Teacher can edit structured properties for each flow item and preview the rendered classroom sequence before publish without bypassing DAL + Server Actions boundaries.
  3. Editor shows pre-publish checks for missing required fields, invalid payloads, disabled or unavailable built-in plugins, and other blocking issues before a lesson version can be published.
  4. All editor mutations keep explicit cache invalidation, teacher-owned scope checks, and plugin safety rules, and the route does not introduce direct DB access or arbitrary plugin code execution.
**Plans**: 4 plans
- [x] 17-01-PLAN.md — Add built-in provenance, preview/readiness DTOs, and server-side publish gating on the existing lesson authoring path.
- [x] 17-02-PLAN.md — Upgrade the workspace into an integrated flow-composition editor with source-aware step editing.
- [x] 17-03-PLAN.md — Add a real teacher preview route and wire the editor shell to executable preview entry points.
- [x] 17-04-PLAN.md — Replace static publish hints with structured readiness checks and add a dedicated Phase 17 verification command.
**UI hint**: yes

### Phase 18: Teaching schedule OS
**Goal**: Schools and teachers can operate a long-lived, production-grade teaching schedule system that ingests raw timetable data, normalizes it into an extensible schedule domain, and generates reliable daily agendas with runtime overrides, holiday rules, reminders, AI-assisted suggestions, and plugin-safe extension points.
**Depends on**: Phase 2, Phase 6, Phase 13, Phase 14, Phase 15, Phase 16
**Requirements**: SCHEDULE-01, SCHEDULE-02, SCHEDULE-03, SCHEDULE-04, SCHEDULE-05, SCHEDULE-06, SCHEDULE-07, SCHEDULE-08, SCHEDULE-09
**Success Criteria**:
  1. School-scoped users can import timetable data from structured sources into a reviewed import layer that records source metadata, validation issues, and approval-safe writes before affecting runtime schedules.
  2. The system persists a normalized schedule model for terms, week patterns, teaching assignments, class groups, bell slots, recurring schedule entries, runtime overrides, and holiday exceptions without coupling UI surfaces directly to raw imports.
  3. A runtime daily agenda engine can deterministically generate teacher-facing and class-facing daily schedules from normalized data, holidays, and overrides, while preserving explicit cache invalidation, DTO boundaries, and Auth/RBAC scope checks.
  4. Teachers or authorized operators can manage rescheduling, substitutions, holiday calendars, reminders, and AI-generated schedule suggestions with audit logs, explicit approval, and plugin-safe extension hooks rather than arbitrary code execution.
**Plans**: 6 plans
- [x] 18-01-PLAN.md — Define the import layer contracts, staging records, review flow, and normalized schedule schema boundaries.
- [x] 18-02-PLAN.md — Implement school-scoped timetable import, validation, duplicate/conflict detection, and approved write paths into the normalized model.
- [x] 18-03-PLAN.md — Build the runtime daily agenda engine that materializes daily teacher and class agendas from recurring schedules, holidays, and overrides.
- [x] 18-04-PLAN.md — Add rescheduling, substitution, and holiday/calendar management with audit-safe mutations and read-your-writes feedback.
- [x] 18-05-PLAN.md — Add reminder and notification orchestration for upcoming classes, changes, and daily agenda events.
- [x] 18-06-PLAN.md — Expose AI schedule assistant workflows and plugin extension hooks through approval-gated, allowlisted schedule actions.
**UI hint**: yes

### Phase 19: Teacher shell route metadata system
**Goal**: Teacher-facing shells can resolve radius, width, chrome, and future presentation modes from route metadata and centralized shell config resolvers instead of hardcoded route string checks inside UI components.
**Depends on**: Phase 16
**Requirements**: Extension phase — teacher shell architecture hardening and future layout-variant expansion.
**Success Criteria**:
  1. `teacher-sidebar-shell.tsx` no longer contains business route checks such as `routeKey === "/teacher"`, and instead consumes centralized shell metadata or shell resolver output.
  2. Route metadata can express shell behaviors such as `rounded`, `square`, `fullscreen`, `immersive`, `presentation`, and `minimal chrome` without forcing JSX condition explosion or `routeA || routeB || routeC` logic.
  3. Existing `/teacher` visuals remain unchanged after the migration, including square shell behavior on the current teacher home route.
  4. Regression coverage exists for shell metadata resolution, theme coupling, and sidebar/shell behavior so future route expansions do not reintroduce hardcoded branching.
**Plans**: 3 plans
- [x] 19-01-PLAN.md — Extend route surface metadata with shell behavior primitives, define the typed resolver contract, and document the Phase 19 shell architecture.
- [x] 19-02-PLAN.md — Refactor teacher shell rendering so `TeacherSidebarShell` consumes centralized resolver output instead of route string conditionals.
- [x] 19-03-PLAN.md — Add resolver-driven regression coverage and a dedicated `verify:phase19` safety command for future route expansion.
**UI hint**: yes

### Phase 20: Help center and developer guides
**Goal**: Teachers and developers can open `/help` and find a codebase-accurate help center that explains plugin development, theme development, and the currently available data interfaces and actions without reverse-engineering the source tree.
**Depends on**: Phase 6, Phase 16, Phase 18, Phase 19
**Requirements**: Extension phase — product help center and developer-facing implementation guidance.
**Success Criteria**:
  1. Users can open `/help` and see a structured Chinese help page with clear sections for plugin development, theme development, and available data interfaces/actions.
  2. The plugin and theme guides accurately reflect the current manifest, theme runtime, safety boundaries, and school-scoped activation path already implemented in the codebase.
  3. The help content documents the currently available data interfaces, allowlisted actions, and usage patterns with concrete examples, limitations, and boundary notes instead of vague summaries.
  4. The help route follows the established teacher-facing visual language and has regression coverage or verification guardrails so future platform changes don't silently stale the guidance.
**Plans**: 3 plans
- [x] 20-01-PLAN.md — Design the `/help` route structure, page surface, and content information architecture for mixed teacher/developer guidance.
- [x] 20-02-PLAN.md — Write codebase-accurate plugin and theme development guides, including manifest/theme contracts, safety rules, and activation flow.
- [x] 20-03-PLAN.md — Document currently available data interfaces and actions with examples, link the help route into the product, and add regression or verification coverage for guide drift.
**UI hint**: yes

### Phase 21: Teaching design contracts and evidence foundation
**Goal**: Keep the existing step-based classroom model, but add the structured teaching-design and evidence contracts needed for real lesson implementation and later analytics.
**Depends on**: Phase 17, Phase 18
**Requirements**: ORCH-01, EVAL-03
**Success Criteria**:
  1. Existing lesson steps can carry structured teaching metadata such as activity intent, estimated duration, delivery mode, and evidence expectations without breaking the current authoring or player pipeline.
  2. Classroom sessions durably record the evidence and timeline primitives needed for later recap and analytics, rather than relying only on transient UI state.
  3. DAL, DTO, schema, cache tags, and Server Actions remain explicit and school-scoped; no UI route bypasses the existing server boundary.
  4. The new contracts are backward-compatible with already-authored lessons and can safely default when teaching metadata is missing.
**Plans**: 5 plans
- [x] 21-01-PLAN.md — Define teaching-design payload contracts, backward-safe defaults, and launch-preview mapping on the current lesson snapshot path.
- [x] 21-02-PLAN.md — Add durable classroom evidence, presence, and intervention timeline persistence through DAL and Server Actions.
- [x] 21-03-PLAN.md — Surface fallback cues in teacher planning views and add `verify:phase21` for evidence wiring and cache-boundary safety.
- [x] 21-04-PLAN.md — Add a teacher timeline read model and dedicated runtime panel for intervention visibility and layout stability.
- [x] 21-05-PLAN.md — Strengthen editor step-duration visibility with labeled metadata and UI regression coverage.
**UI hint**: yes

### Phase 22: Teacher orchestration workspace and launch preparation
**Goal**: Upgrade the existing editor and launch path into a teacher-ready classroom orchestration workspace with explicit preparation and readiness checks.
**Depends on**: Phase 21
**Requirements**: ORCH-02, ORCH-03
**Success Criteria**:
  1. Teacher can configure class-facing launch context from a published lesson, including roster scope, runtime emphasis, and materials summary.
  2. Teacher can see readiness issues before launch, including missing teaching metadata, missing evidence setup, or missing classroom prerequisites.
  3. The orchestration workspace preserves the current course/lesson entry discipline and does not regress existing editor or launch safety constraints.
  4. The page follows the existing Stitch-aligned teacher product language instead of introducing a utilitarian admin-only workflow.
**Plans**: 3 plans
- [x] 22-01-PLAN.md — Expand teacher editor read/write models to expose teaching-design metadata and preparation summary.
- [x] 22-02-PLAN.md — Upgrade `/teacher/launch` into a structured launch-preparation surface with class-facing run sheet and blocking readiness issues.
- [x] 22-03-PLAN.md — Add regression coverage for orchestration wiring, readiness gating, and teacher-owned route boundaries.
**UI hint**: yes

### Phase 23: Student in-class activity flow
**Goal**: Make the student player feel like a real in-class activity surface, not only a generic lesson reader, while keeping current progress and SSE semantics.
**Depends on**: Phase 21, Phase 22
**Requirements**: ACT-01, ACT-02
**Success Criteria**:
  1. Student sees active-step activity guidance, expected output, and evidence expectations in a classroom-friendly layout.
  2. Student can submit quick in-class evidence or check-in responses that are durably stored alongside existing learning evidence.
  3. Existing task, quiz, progress, resume, and classroom lock/unlock flows continue to work without hidden regressions.
  4. The runtime remains compatible with cached shell + Suspense-streamed personal state and does not move DB logic into the client.
**Plans**: 3 plans
- [x] 23-01-PLAN.md — Extend player DTOs and runtime cards to surface activity guidance and evidence expectations cleanly.
- [x] 23-02-PLAN.md — Add quick-response or evidence-capture submission paths that reuse existing learning boundaries and auditability.
- [ ] 23-03-PLAN.md — Add regression coverage for player UX, persistence semantics, and classroom runtime compatibility.
**UI hint**: yes

### Phase 24: Live classroom operations and formative evaluation
**Goal**: Turn classroom runtime and teacher review into one coherent operational surface for monitoring, intervention, and process evaluation.
**Depends on**: Phase 21, Phase 22, Phase 23
**Requirements**: ACT-03, EVAL-01, EVAL-02
**Success Criteria**:
  1. Teacher can monitor live roster presence, progress, submission counts, and students needing intervention from the classroom surface.
  2. Teacher can record participation marks, observation notes, or lightweight evaluation tags during or after class without a separate gradebook system.
  3. Teacher can review multi-source student evidence in one workflow instead of switching between isolated runtime and review pages.
  4. All writes stay teacher-scoped, durable, auditable, and explicit about cache invalidation and failure feedback.
**Plans**: 4 plans
- [ ] 24-01-PLAN.md — Add live classroom monitoring cards and intervention-aware roster summaries.
- [ ] 24-02-PLAN.md — Introduce participation and observation capture flows with durable persistence and teacher-only scope checks.
- [ ] 24-03-PLAN.md — Unify runtime evidence and review data into a product-grade formative evaluation surface.
- [ ] 24-04-PLAN.md — Add verification coverage for runtime metrics, observation writes, and evaluation aggregation boundaries.
**UI hint**: yes

### Phase 25: Teaching data capture and session analytics
**Goal**: Convert collected classroom evidence into deterministic session recap metrics that teachers can trust immediately after class.
**Depends on**: Phase 24
**Requirements**: ANALYTICS-01
**Success Criteria**:
  1. Teacher can open a session recap and see completion, participation, submission, and feedback-workload metrics derived from durable data.
  2. Metrics drill down to the supporting raw evidence, rather than presenting opaque or AI-only summaries.
  3. Recap data is scoped by school, class, teacher, lesson, and session, with stable DTOs and explicit cache behavior.
  4. The analytics layer reuses the same evidence contracts from previous phases and does not create a second source of truth.
**Plans**: 3 plans
- [ ] 25-01-PLAN.md — Build session recap read models and deterministic metric aggregation helpers.
- [ ] 25-02-PLAN.md — Add teacher-facing recap surfaces with evidence drill-down and workload summary.
- [ ] 25-03-PLAN.md — Add verification coverage for aggregation correctness, scoping, and empty-state behavior.
**UI hint**: yes

### Phase 26: Cross-session trends and Stitch productization
**Goal**: Finish the milestone with trend analysis and a coherent, high-quality product surface across planning, runtime, evaluation, and analytics.
**Depends on**: Phase 25
**Requirements**: ANALYTICS-02, UI-05
**Success Criteria**:
  1. Teacher can compare recent sessions or lessons at class and student level through stable trend views and drill-down paths.
  2. New planning, runtime, evaluation, and analytics pages share one Stitch-aligned interaction language, responsive rhythm, and information hierarchy.
  3. The final product surfaces feel intentionally designed for teacher daily work, not like disconnected admin tools.
  4. Regression or verification coverage exists for the major routes so later feature work does not silently degrade the milestone quality bar.
**Plans**: 4 plans
- [ ] 26-01-PLAN.md — Build cross-session trend read models for class and student comparisons.
- [ ] 26-02-PLAN.md — Design and implement the analytics navigation and drill-down product surfaces.
- [ ] 26-03-PLAN.md — Run Stitch-aligned productization pass across orchestration, runtime, evaluation, and analytics pages.
- [ ] 26-04-PLAN.md — Add final milestone verification coverage for route quality, responsive behavior, and analytics safety boundaries.
**UI hint**: yes

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 13. Course center foundation | 5/5 | Complete   | 2026-05-09 |
| 14. Course lifecycle and associations | 0/3 | Not started | - |
| 15. Batch course import | 0/3 | Not started | - |
| 16. Theme plugins and layout orchestration | 4/4 | Complete | 2026-05-09 |
| 17. Teacher flow editor enhancement | 4/4 | Complete   | 2026-05-10 |
| 18. Teaching schedule OS | 6/6 | Complete | 2026-05-10 |
| 19. Teacher shell route metadata system | 3/3 | Complete | 2026-05-11 |
| 20. Help center and developer guides | 3/3 | Complete | 2026-05-11 |
| 21. Teaching design contracts and evidence foundation | 5/5 | Complete   | 2026-05-13 |
| 22. Teacher orchestration workspace and launch preparation | 3/3 | Complete | 2026-05-13 |
| 23. Student in-class activity flow | 2/3 | In Progress|  |
| 24. Live classroom operations and formative evaluation | 0/4 | Not started | - |
| 25. Teaching data capture and session analytics | 0/3 | Not started | - |
| 26. Cross-session trends and Stitch productization | 0/4 | Not started | - |
