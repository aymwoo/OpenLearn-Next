---
phase: 34
plan: 02
status: completed
created: 2026-05-17
files_changed:
  - src/db/schema.ts
  - src/lib/dto/course-authoring.ts
  - src/lib/dal/course-authoring.ts
  - src/lib/dal/course-authoring.test.ts
  - src/actions/course-authoring-actions.ts
  - src/actions/course-authoring-actions.test.ts
---

# Plan 34-02 summary

## What changed

- Added `CourseEnrollmentInputSchema` and teacher-scoped enrollment helpers for
  single-student add/remove mutations inside `course-authoring`.
- Added a unique `(courseId, studentId)` constraint to `courseEnrollments` and
  kept duplicate prevention in the DAL so the UI receives explicit domain
  errors instead of raw database failures.
- Blocked archived-course membership writes with
  `COURSE_MEMBERSHIP_READ_ONLY` and rejected out-of-scope students with
  `STUDENT_NOT_ELIGIBLE`.
- Added `addCourseEnrollmentAction()` and `removeCourseEnrollmentAction()` with
  Zod parsing, cache invalidation, and explicit user-facing error mapping.
- Expanded DAL and action regressions for duplicate guard, read-only posture,
  candidate eligibility, removal rehydration, and tag invalidation.

## Verification

- `pnpm test --run src/lib/dal/course-authoring.test.ts`
- `pnpm test --run src/actions/course-authoring-actions.test.ts`

## Notes

- Enrollment writes continue to return the refreshed `TeacherCourseDetailDTO`
  so the later UI loop can stay on one same-page read-your-writes contract.
- No route handler shortcut or component-side DB access was introduced.
