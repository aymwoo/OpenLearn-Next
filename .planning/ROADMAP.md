## ROADMAP

**Milestone:** v2.0 Runtime Platform Foundations
**Phases:** 6
**Granularity:** coarse
**Coverage:** Covers Phase 27-32 for milestone `v2.0 Runtime Platform Foundations`. Historical phases remain below as reference; archived v1.3 facts still live in `.planning/MILESTONES.md` and `.planning/milestones/v1.3-MILESTONE-AUDIT.md`.

### Current milestone phases

- [x] **Phase 27: Compatibility baseline and V2 boundary scaffolding** - Freeze the existing classroom-critical flows, establish compatibility guardrails, and introduce the first explicit runtime-platform boundaries in the main project. (completed 2026-05-15)
- [x] **Phase 28: Runtime bridge contracts and session persistence** - Define runtime descriptors and TeachingBridge contracts, add runtime session persistence, and append canonical runtime events through a durable outbox path. (completed 2026-05-16)
- [x] **Phase 29: Runtime Host and HTML courseware pilot** - Deliver the first sandboxed HTML courseware runtime through teacher preview, student player, and classroom-compatible host surfaces. (completed 2026-05-16)
- [x] **Phase 30: Capability enforcement and plugin lifecycle** - Upgrade platform governance with capability-checked host actions, plugin manifest v2, lifecycle state, and allowed or denied audit semantics. (completed 2026-05-16)
- [x] **Phase 31: Transport boundary and runtime inspector** - Add a transport gateway around the current SSE model and expose an operator-grade runtime or plugin timeline and health inspector. (completed 2026-05-16)
- [ ] **Phase 32: End-to-end hardening and milestone proof** - Close remaining integration gaps, prove the full runtime-hosted lesson path end-to-end, and ship the milestone demo with regression and safety verification.

### Current planning posture

- 当前 active milestone 为 `v2.0 Runtime Platform Foundations`，从 Phase 27 开始继续编号。
- 本轮 roadmap 的成功线不是基础设施正式 cutover，而是交付一个可运行、可审计、可受控的 runtime-hosted HTML courseware step。
- PostgreSQL、Redis/Event Bus、WebSocket 在本轮只建立 seam 和 transport boundary，不作为正式切换完成条件。
- `COURSE-07` 与 `AUTH-01`~`AUTH-06`、`DATA-01`~`DATA-05`、`CLASS-05` 继续作为 project-level safety gaps 保留。

### Archived v1.3 phases (reference only)

- [x] **Phase 21: Teaching design contracts and evidence foundation** - Extend the current linear lesson model with teaching-design metadata, class-launch contracts, and durable classroom evidence primitives. (completed 2026-05-13)
- [x] **Phase 22: Teacher orchestration workspace and launch preparation** - Turn the current editor and launch path into a class-ready teaching orchestration workspace with readiness gating. (completed 2026-05-13)
- [x] **Phase 23: Student in-class activity flow** - Upgrade the student runtime into a clearer classroom activity experience with durable quick-response and evidence capture. (completed 2026-05-13)
- [x] **Phase 24: Live classroom operations and formative evaluation** - Bring runtime monitoring, participation tracking, observation notes, and unified evaluation workflow into the teacher classroom product surface. (completed 2026-05-14 after re-verifying EVAL-02 on `/classroom` single-student detail)
- [x] **Phase 25: Teaching data capture and session analytics** - Aggregate classroom evidence into deterministic session-level metrics, recap views, and teacher workload summaries. (completed 2026-05-14)
- [x] **Phase 26: Cross-session trends and Stitch productization** - Deliver student/class trend analysis and complete high-quality Stitch-aligned productization across planning, runtime, evaluation, and analytics pages. (completed 2026-05-14)

### Archived v1.3 close note

- 本次 v1.3 close 只覆盖 Phase 21-26。
- Phase 13、16-20 属于已完成历史，不是本次 close 的新增 scope。
- Phase 14、15 都是 v1.3 归档后的 carry-over scope；现已分别在 2026-05-15 完成，不计入 v1.3 close 本身。
- `AUTH-01`~`AUTH-06`、`DATA-01`~`DATA-05`、`CLASS-05` 仍是项目级 known gaps。

### Carry-over backlog from v1.2

- [x] **Phase 14: Course lifecycle and associations** - Complete the course detail workflow short scope: `14-01` lifecycle, `14-02` class association, and `14-03` delete guardrails are all done; `COURSE-07` remains explicitly deferred. (completed 2026-05-15)
- [x] **Phase 15: Batch course import** - Add structured batch import, duplicate detection, and import-result feedback on top of the same course rules. (completed 2026-05-15)

### Completed history

- [x] **Phase 13: Course center foundation** - Build the teacher course center, manual create and edit flows, and the course-to-lesson entry path. (completed 2026-05-09)
- [x] **Phase 16: Theme plugins and layout orchestration** - Expand theme plugins from token-only styling into validated layout composition, navigation placement, and page-surface orchestration. (completed 2026-05-09)
- [x] **Phase 17: Teacher flow editor enhancement** - Upgrade `/teacher/editor` into a flexible classroom-flow editor with composable teaching steps, structured property editing, preview, and publish-readiness checks. (completed 2026-05-10)
- [x] **Phase 18: Teaching schedule OS** - Build a production-grade teaching schedule system around `Import Layer -> Normalized Schedule Model -> Runtime Daily Agenda Engine`, covering import, normalization, daily agenda generation, rescheduling, holidays, reminders, AI assistance, and plugin-safe extensibility. (completed 2026-05-10)
- [x] **Phase 19: Teacher shell route metadata system** - Replace teacher-shell route string conditionals with route metadata-driven shell behavior, centralized shell config resolution, and future-safe layout variants without changing current visuals. (completed 2026-05-11)
- [x] **Phase 20: Help center and developer guides** - Build `/help` as a structured help center covering plugin development, theme development, and the currently available data interfaces and actions with codebase-accurate guidance. (completed 2026-05-11)

### Phase Details

### Phase 27: Compatibility baseline and V2 boundary scaffolding
**Goal**: Establish the compatibility baseline, regression harness, and main-project runtime-platform boundaries so V2 work can proceed without breaking the current classroom product.
**Depends on**: Phase 26
**Requirements**: SAFE-01, SAFE-02, ARCH-01, ARCH-02, ARCH-03
**Success Criteria**:
  1. Existing teacher authoring, publish, launch, student player, and classroom control flows have committed parity checks that fail loudly if V2 refactors regress them.
  2. The main project exposes initial runtime-platform feature boundaries and compatibility re-exports without forcing a multi-app deployment rewrite.
  3. Shared contract packages or equivalent extracted boundaries exist for runtime bridge, runtime events, permissions, and descriptors.
  4. PostgreSQL, Redis/Event Bus, and WebSocket seams exist as future adapters without becoming required services in this phase.
**Plans**: 4 plans
- [x] 27-01-PLAN.md — Freeze the compatibility baseline for the current classroom-critical flows and add regression harness coverage.
- [x] 27-02-PLAN.md — Introduce runtime-platform feature roots, public barrels, and compatibility re-export rules in the main project. (completed 2026-05-15)
- [x] 27-03-PLAN.md — Extract shared runtime contracts, permissions, and descriptor packages or equivalent stable boundaries.
- [x] 27-04-PLAN.md — Add infrastructure seam adapters for PostgreSQL, Redis/Event Bus, and WebSocket without enabling cutover. (completed 2026-05-15)
**UI hint**: yes

### Phase 28: Runtime bridge contracts and session persistence
**Goal**: Define the versioned runtime bridge and persist runtime sessions, canonical events, and cache-safe write semantics behind the existing server boundary.
**Depends on**: Phase 27
**Requirements**: SAFE-03, BRDG-01, BRDG-02, BRDG-03, BRDG-04, RTSE-01, RTSE-02, RTSE-03, RTSE-04
**Success Criteria**:
  1. Runtime-capable lesson steps carry a versioned runtime descriptor without replacing the current linear lesson snapshot contract.
  2. Host and runtime share typed TeachingBridge message schemas and typed result envelopes.
  3. The system can create durable runtime sessions linked to lesson step, classroom session, and actor scope.
  4. Runtime ready, interaction, save, submit, and teacher-control events are appended through a canonical event log or outbox path while preserving DAL and cache discipline.
**Plans**: 4 plans
**Wave 1**
- [x] 28-01-PLAN.md — Define runtime descriptor, bridge schema, capability token, and host result contracts.

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 28-02-PLAN.md — Add runtime session persistence and scope-safe bootstrap metadata loaders.

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 28-03-PLAN.md — Append canonical runtime events and outbox records through host-side server actions or route handlers.

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 28-04-PLAN.md — Add cache invalidation matrix coverage and durability checks for runtime-related writes.
**UI hint**: yes

### Phase 29: Runtime Host and HTML courseware pilot
**Goal**: Deliver the first sandboxed HTML courseware runtime pilot inside the existing teacher preview, student player, and classroom-compatible flow.
**Depends on**: Phase 28
**Requirements**: RHOST-01, RHOST-02, RHOST-03
**Success Criteria**:
  1. Teacher preview, student player, and classroom-compatible surfaces can render a sandboxed iframe Runtime Host for a runtime-capable step.
  2. The Runtime Host can bootstrap the iframe, sync runtime height, and push classroom snapshot updates into the runtime.
  3. Teachers can add and publish one built-in HTML courseware runtime step inside the existing lesson authoring flow.
  4. Students can complete one real interaction inside the HTML runtime and submit a structured result through the existing server boundary.
**Plans**: 4 plans
- [x] 29-01-PLAN.md — Build the Runtime Host shell, sandboxed iframe container, and host bootstrap wiring.
- [x] 29-02-PLAN.md — Wire runtime-capable step rendering into teacher preview, student player, and classroom-compatible read models.
- [x] 29-03-PLAN.md — Add built-in HTML courseware runtime authoring, publish, and descriptor persistence.
- [x] 29-04-PLAN.md — Prove end-to-end HTML runtime interaction and structured submit flow with regression coverage.
**UI hint**: yes

### Phase 30: Capability enforcement and plugin lifecycle
**Goal**: Upgrade platform governance so runtime and plugin actions are capability-checked, lifecycle-driven, and explicitly auditable.
**Depends on**: Phase 29
**Requirements**: GOVR-01, GOVR-02, GOVR-03
**Success Criteria**:
  1. Runtime or plugin actions can invoke host operations only through allowlisted, capability-checked host adapters.
  2. Plugin manifest v2 can declare runtime type, requested capabilities, permissions, and lifecycle metadata without enabling arbitrary remote execution.
  3. Built-in runtime or plugin lifecycle state flows across installed, enabled, mounted, ready, suspended, disabled, and failed.
  4. Allowed and denied action outcomes are persisted with enough detail to support later operator inspection.
**Plans**: 4 plans
- [x] 30-01-PLAN.md — Add capability-gated host action dispatch for runtime and plugin requests.
- [x] 30-02-PLAN.md — Extend plugin manifest contracts to v2 runtime and lifecycle metadata.
- [x] 30-03-PLAN.md — Persist and expose lifecycle state transitions for built-in runtime or plugin packages.
- [x] 30-04-PLAN.md — Add allowed or denied action audit records and governance-focused regression coverage.
**UI hint**: yes

### Phase 31: Transport boundary and runtime inspector
**Goal**: Decouple runtime and classroom event semantics from transport and expose an operator-grade inspector for runtime or plugin health and timeline debugging.
**Depends on**: Phase 30
**Requirements**: GOVR-04, TRNS-01, TRNS-02
**Success Criteria**:
  1. Runtime and classroom events flow through a transport gateway that preserves current SSE delivery while making room for a future WebSocket adapter.
  2. Durable classroom and runtime session state remains the source of truth while transport adapters act only as delivery channels.
  3. Teacher, admin, or developer can inspect actor, event, result, timestamp, health, and allowed or denied traces in a runtime or plugin timeline.
  4. The inspector helps explain producer-to-transport-to-consumer behavior without introducing a second source of truth.
**Plans**: 4 plans
**Wave 1**
- [x] 31-01-PLAN.md — Introduce the transport gateway contract, SSE-first adapter registry, and durable delivery-attempt truth.

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 31-02-PLAN.md — Connect runtime and classroom canonical events to the transport boundary while preserving durable truth ownership and current SSE delivery.

**Wave 3** *(blocked on Waves 1-2 completion)*
- [x] 31-03-PLAN.md — Build the independent runtime inspector read model and single-timeline operator surface with deterministic health.

**Wave 4** *(blocked on Waves 2-3 completion)*
- [x] 31-04-PLAN.md — Add canonical transport and inspector verification coverage for parity, scope safety, and rollback-safe semantics.
**UI hint**: yes

### Phase 32: End-to-end hardening and milestone proof
**Goal**: Harden the full runtime-platform path, close milestone integration gaps, and prove the end-to-end HTML runtime lesson flow as a shippable V2 foundation.
**Depends on**: Phase 31
**Requirements**: RHOST-04
**Success Criteria**:
  1. The end-to-end runtime-hosted HTML courseware demo works through lesson authoring, publish, launch or player entry, interaction, submit, event log, and inspector review.
  2. Existing classroom-critical routes still pass the committed compatibility baseline after all runtime-platform changes.
  3. The milestone ships with explicit hardening around cache freshness, session durability, capability denial, and rollback-safe transport behavior.
  4. The project can demonstrate a real Runtime Platform foundation without having performed PostgreSQL, Redis/Event Bus, or WebSocket cutover.
**Plans**: 4 plans
- [x] 32-01-PLAN.md — Fix the deterministic proof seed and thread runtimeSessionId plus submit summary through the classroom truth path.
- [x] 32-02-PLAN.md — Harden terminal submit posture and same-surface failure recovery in the shared host and student runtime flow.
- [ ] 32-03-PLAN.md — Add the canonical `verify:phase32` gate with proof-focused drift guards and regression coverage.
- [ ] 32-04-PLAN.md — Productize launch/classroom/inspector proof affordances and publish the explicit demo handoff.
**UI hint**: yes

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
**Requirements**: COURSE-04, COURSE-05, COURSE-06
**Success Criteria**:
   1. Teacher can publish, unpublish, and archive a course and see consistent status behavior across the course center and adjacent teacher flows.
   2. Teacher can delete an eligible course only through a guarded path with explicit confirmation and clear failure feedback when deletion is blocked.
   3. Teacher can associate and remove classes within the teacher's school scope.
   4. Current live planning intentionally defers student enrollment management (`COURSE-07`) to a later scope instead of folding it into this short draft.
**Plans**: 3 plans
- [x] 14-01-PLAN.md — Add course lifecycle actions and status-safe visibility rules.
- [x] 14-02-PLAN.md — Build class association management within school scope.
- [x] 14-03-PLAN.md — Add deletion guardrails and explicit blocked-delete feedback.
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
- [x] 15-01-PLAN.md — Define the batch import template, parsing pipeline, and validation DTOs.
- [x] 15-02-PLAN.md — Implement preview and apply flows with duplicate detection and scoped writes.
- [x] 15-03-PLAN.md — Surface import results, failure reasons, and regression coverage for course management flows.
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
- [x] 23-03-PLAN.md — Add regression coverage for player UX, persistence semantics, and classroom runtime compatibility.
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
- [x] 24-01-PLAN.md — Add live classroom monitoring cards and intervention-aware roster summaries.
- [x] 24-02-PLAN.md — Introduce participation and observation capture flows with durable persistence and teacher-only scope checks.
- [x] 24-03-PLAN.md — Unify runtime evidence and review data into a product-grade formative evaluation surface.
- [x] 24-04-PLAN.md — Add verification coverage for runtime metrics, observation writes, and evaluation aggregation boundaries.
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
- [x] 25-01-PLAN.md — Build session recap read models and deterministic metric aggregation helpers.
- [x] 25-02-PLAN.md — Add teacher-facing recap surfaces with evidence drill-down and workload summary.
- [x] 25-03-PLAN.md — Add verification coverage for aggregation correctness, scoping, and empty-state behavior.
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
**Plans**: 6 plans
- [x] 26-01-PLAN.md — Build cross-session trend read models for class and student comparisons.
- [x] 26-02-PLAN.md — Register the trends route inside the shared teacher shell and deliver the first class-first trends page.
- [x] 26-03-PLAN.md — Add recap-to-trends dual entry and productize editor/launch as the start of the teacher chain.
- [x] 26-04-PLAN.md — Productize trends, dashboard, help, and settings into the same Stitch-aligned teacher system.
- [x] 26-05-PLAN.md — Productize classroom and review while preserving their route ownership.
- [x] 26-06-PLAN.md — Add `verify:phase26` static guards and final regression wiring for route quality, responsive behavior, and analytics safety boundaries.
**UI hint**: yes

### Progress

Current milestone phases plus historical snapshot retained for planning reference.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 27. Compatibility baseline and V2 boundary scaffolding | 4/4 | Complete   | 2026-05-15 |
| 28. Runtime bridge contracts and session persistence | 4/4 | Complete    | 2026-05-16 |
| 29. Runtime Host and HTML courseware pilot | 4/4 | Complete | 2026-05-16 |
| 30. Capability enforcement and plugin lifecycle | 4/4 | Complete | 2026-05-16 |
| 31. Transport boundary and runtime inspector | 0/4 | Not started | - |
| 32. End-to-end hardening and milestone proof | 2/4 | In Progress|  |
| 13. Course center foundation | 5/5 | Complete   | 2026-05-09 |
| 14. Course lifecycle and associations | 3/3 | Complete | 2026-05-15 |
| 15. Batch course import | 3/3 | Complete | 2026-05-15 |
| 16. Theme plugins and layout orchestration | 4/4 | Complete | 2026-05-09 |
| 17. Teacher flow editor enhancement | 4/4 | Complete   | 2026-05-10 |
| 18. Teaching schedule OS | 6/6 | Complete | 2026-05-10 |
| 19. Teacher shell route metadata system | 3/3 | Complete | 2026-05-11 |
| 20. Help center and developer guides | 3/3 | Complete | 2026-05-11 |
| 21. Teaching design contracts and evidence foundation | 5/5 | Complete   | 2026-05-13 |
| 22. Teacher orchestration workspace and launch preparation | 3/3 | Complete | 2026-05-13 |
| 23. Student in-class activity flow | 3/3 | Complete   | 2026-05-13 |
| 24. Live classroom operations and formative evaluation | 4/4 | Complete | 2026-05-14 |
| 25. Teaching data capture and session analytics | 3/3 | Complete | 2026-05-14 |
| 26. Cross-session trends and Stitch productization | 6/6 | Complete    | 2026-05-14 |
