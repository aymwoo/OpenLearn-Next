## ROADMAP

**Milestone:** v1.2 Course Import & Management
**Phases:** 8
**Granularity:** coarse
**Coverage:** 10/10 v1.2 requirements mapped ✓ + 5 extension phases

### Phases

- [x] **Phase 13: Course center foundation** - Build the teacher course center, manual create and edit flows, and the course-to-lesson entry path. (completed 2026-05-09)
- [ ] **Phase 14: Course lifecycle and associations** - Add publish, unpublish, archive, delete, and class/student association workflows with school-scoped guardrails.
- [ ] **Phase 15: Batch course import** - Add structured batch import, duplicate detection, and import-result feedback on top of the same course rules.
- [x] **Phase 16: Theme plugins and layout orchestration** - Expand theme plugins from token-only styling into validated layout composition, navigation placement, and page-surface orchestration. (completed 2026-05-09)
- [x] **Phase 17: Teacher flow editor enhancement** - Upgrade `/teacher/editor` into a flexible classroom-flow editor with composable teaching steps, structured property editing, preview, and publish-readiness checks. (completed 2026-05-10)
- [x] **Phase 18: Teaching schedule OS** - Build a production-grade teaching schedule system around `Import Layer -> Normalized Schedule Model -> Runtime Daily Agenda Engine`, covering import, normalization, daily agenda generation, rescheduling, holidays, reminders, AI assistance, and plugin-safe extensibility. (completed 2026-05-10)
- [ ] **Phase 19: Teacher shell route metadata system** - Replace teacher-shell route string conditionals with route metadata-driven shell behavior, centralized shell config resolution, and future-safe layout variants without changing current visuals.
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
