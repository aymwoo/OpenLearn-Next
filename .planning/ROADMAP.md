## ROADMAP

**Milestone:** v1.2 Course Import & Management
**Phases:** 3
**Granularity:** coarse
**Coverage:** 10/10 v1.2 requirements mapped ✓

### Phases

- [ ] **Phase 13: Course center foundation** - Build the teacher course center, manual create and edit flows, and the course-to-lesson entry path.
- [ ] **Phase 14: Course lifecycle and associations** - Add publish, unpublish, archive, delete, and class/student association workflows with school-scoped guardrails.
- [ ] **Phase 15: Batch course import** - Add structured batch import, duplicate detection, and import-result feedback on top of the same course rules.

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
**Plans**: 3 plans
- [x] 13-01-PLAN.md — Build the teacher-scoped course center read model and route surface.
- [ ] 13-02-PLAN.md — Add manual course create and edit flows through Server Actions and DAL.
- [ ] 13-03-PLAN.md — Wire the course detail workflow into lesson and teaching-plan management entry points.
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

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 13. Course center foundation | 1/3 | In Progress|  |
| 14. Course lifecycle and associations | 0/3 | Not started | - |
| 15. Batch course import | 0/3 | Not started | - |
