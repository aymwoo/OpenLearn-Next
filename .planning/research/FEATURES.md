# Feature research

**Milestone:** v1.2 Course Import & Management  
**Researched:** 2026-05-09  
**Confidence:** HIGH

## Feature landscape

OpenLearn Next already has the underlying course and lesson model, but it still
needs a teacher-ready course center. For this milestone, the table stakes are
not new AI or platform features. They are the operational workflows that let a
teacher create, manage, associate, and import courses without leaving the
existing permission and authoring boundaries.

## Table stakes for v1.2

| Feature | Why it matters | Complexity | Notes |
|---------|----------------|------------|-------|
| Teacher-scoped course list | Teachers need one place to see all courses they can operate on | MEDIUM | Must show title, subject, grade, status, class links, lesson count, and updated time. |
| Manual course creation | A school cannot test course management without a reliable create path | LOW-MEDIUM | Reuse existing DAL and Server Action patterns. |
| Course base-info editing | Teachers need to fix title, subject, grade, and status after creation | MEDIUM | Read-your-writes feedback is required. |
| Publish / unpublish / archive lifecycle | Teachers need clear course visibility states | MEDIUM | Status rules must stay consistent with lesson authoring and launch flows. |
| Safe delete path | Schools need cleanup controls without accidental data loss | MEDIUM | Add guardrails and explicit feedback when deletion is blocked or destructive. |
| Class association management | A course is not useful unless it can be linked to actual classes | MEDIUM | Must stay within teacher school scope. |
| Student enrollment management | Teachers need to confirm who is attached to the course | MEDIUM | Reuse existing enrollment tables instead of inventing a parallel roster system. |
| Batch course import | Manual creation alone is too slow for a practical school workflow | HIGH | Start with structured file import and row-level validation. |
| Import result review | Teachers must understand what was created, updated, skipped, or rejected | HIGH | Silent partial failures or duplicates are unacceptable. |
| Course-to-lesson entry | The course center must connect directly to lesson and teaching-plan management | MEDIUM | A course detail page or equivalent entry is required. |

## Differentiators for this milestone

| Feature | Product value | Notes |
|---------|---------------|-------|
| Unified course center | Turns the existing schema into a usable teacher workflow instead of a hidden backend capability | This is the milestone's primary user-facing win. |
| Import preview and duplicate reporting | Makes batch import safe for real schools instead of a one-shot risky upload | Prefer explicit created / updated / skipped / failed outcomes. |
| Direct handoff into lesson authoring | Keeps the product centered on executable classroom workflows rather than static catalog management | Course management must feed the lesson engine, not compete with it. |

## Anti-features for v1.2

| Feature | Why to exclude now |
|---------|--------------------|
| Real Moodle or Notion import | External auth, mapping, and sync semantics would dominate the milestone. |
| Bidirectional sync | Requires conflict ownership, remote identifiers, and retry semantics not needed for first delivery. |
| Full SIS / OneRoster automation | This is a separate institutional integration problem. |
| Semester scheduling, calendars, and attendance | Important later, but not required to validate course creation and management. |

## Dependency notes

1. Course list, edit, lifecycle, and import must all share the same DAL write
   boundary so authorization and cache invalidation do not drift.
2. Class and student association work should land after the course center exists,
   because those controls depend on a usable course detail workflow.
3. Batch import should reuse the same create and update rules as manual course
   management, not create a second set of persistence rules.
4. The milestone should end with a direct path from course management into lesson
   authoring so the teacher workflow remains anchored to the classroom engine.
