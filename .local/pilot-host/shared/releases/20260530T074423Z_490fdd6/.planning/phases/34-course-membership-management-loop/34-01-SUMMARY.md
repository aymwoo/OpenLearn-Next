---
phase: 34
plan: 01
status: completed
created: 2026-05-17
files_changed:
  - src/lib/dto/course-authoring.ts
  - src/lib/dal/course-authoring.ts
  - src/lib/dal/course-authoring.test.ts
---

# Plan 34-01 summary

## What changed

- Extended `TeacherCourseDetailDTO` with server-owned `members` and
  `eligibleStudents` slices so the course detail page now receives sanitized
  membership data directly from the DAL.
- Added linked-class roster derivation inside `getCachedTeacherCourseDetailDTO`
  using `courseClasses -> classMembers -> users -> courseEnrollments`, keeping
  candidate scope locked to currently linked classes only.
- Kept `enrollmentCount` and `deleteEligibility` aligned to the same
  enrollment truth used by the new membership slices.
- Added focused DAL regressions for linked-class-only eligibility,
  same-school foreign-course rejection, membership contents, and archived
  course readability.

## Verification

- `pnpm test --run src/lib/dal/course-authoring.test.ts`

## Notes

- This plan only expanded the read model. It intentionally did not introduce
  enrollment writes or UI controls yet.
- The blast radius for `getTeacherCourseDetailDTO` was `CRITICAL`, so the
  implementation stayed backward-compatible and additive.
