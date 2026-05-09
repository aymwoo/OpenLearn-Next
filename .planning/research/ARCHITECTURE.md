# Architecture research

**Milestone:** v1.2 Course Import & Management  
**Researched:** 2026-05-09  
**Confidence:** HIGH

## Executive summary

This milestone should extend the existing teacher authoring architecture rather
than create a parallel admin system. Course management belongs in the teacher
route group, all reads and writes stay behind DAL methods and Server Actions,
and batch import should reuse the same mutation rules as manual create and edit.

## Integration points

| Layer | Responsibility |
|------|----------------|
| `src/app/(teacher)/teacher/courses` | Teacher course center entry route and list surface |
| `src/app/(teacher)/teacher/courses/[courseId]` | Course detail, lifecycle actions, associations, and lesson-entry handoff |
| `src/actions/lesson-authoring-actions.ts` or adjacent course actions | Validated create, edit, lifecycle, association, and import action entry points |
| `src/lib/dal/lesson-authoring.ts` or adjacent DAL module | Teacher-scope reads and writes for course CRUD, class links, enrollments, duplicate detection, and import apply logic |
| `src/lib/dto/lesson-authoring.ts` or adjacent DTOs | Course list, detail, import preview, and import result schemas |
| `src/db/schema.ts` | Existing `courses`, `courseClasses`, `courseEnrollments`, `lessons`, and membership tables |

## Recommended build order

1. Expose a teacher-scoped course list and detail route.
2. Close manual create and edit flows on top of existing DAL helpers.
3. Add lifecycle actions for publish, unpublish, archive, and delete.
4. Add class and student association management inside the course detail flow.
5. Add the direct handoff from course detail into lesson or teaching-plan
   management.
6. Add structured batch import preview and apply flows that reuse the same DAL
   mutation logic.

## Architecture rules

1. Keep permission checks server-side. UI visibility is not authorization.
2. Reuse one course mutation contract for manual actions and imported rows.
3. Parse and validate import rows before any write is attempted.
4. Keep import application idempotent enough to avoid accidental duplicate
   courses in the same school scope.
5. Invalidate course, lesson, class, and enrollment cache tags after every
   mutation path that changes what the teacher sees.
