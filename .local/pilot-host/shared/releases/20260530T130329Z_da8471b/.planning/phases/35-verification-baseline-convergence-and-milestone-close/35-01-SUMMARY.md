---
phase: 35
plan: 01
status: completed
created: 2026-05-17
files_changed:
  - src/app/(teacher)/teacher/courses/[courseId]/page.tsx
  - src/app/(teacher)/teacher/courses/[courseId]/lessons/page.tsx
  - src/app/(teacher)/teacher/courses/import/[batchId]/page.tsx
  - src/components/courses/course-detail-form.tsx
  - src/components/surfaces/teacher-course-detail-surface.tsx
  - src/components/classroom/classroom-roster-panel.test.tsx
  - src/components/classroom/classroom-student-detail-panel.test.tsx
  - src/features/runtime-platform/classroom/runtime-session.test.ts
---

# Plan 35-01 summary

## What changed

- Moved three teacher course routes away from returning JSX inside `try/catch`,
  removing the new `react-hooks/error-boundaries` blockers from the active
  milestone scope.
- Removed the prop-sync `useEffect` from `CourseDetailForm` and switched the
  parent surface to a deterministic `key` remount strategy so the course detail
  form no longer triggers `set-state-in-effect` while preserving the current
  course membership workflow.
- Updated classroom and runtime proof tests to match the tightened DTO shape by
  adding explicit `runtimeProof: null` fixtures and aligning runtime proof test
  expectations with the current typed payload contract.
- Confirmed that the full repository `typecheck` is now green.

## Verification

- `pnpm exec eslint "src/app/(teacher)/teacher/courses/[courseId]/page.tsx" "src/app/(teacher)/teacher/courses/[courseId]/lessons/page.tsx" "src/app/(teacher)/teacher/courses/import/[batchId]/page.tsx" "src/components/courses/course-detail-form.tsx" "src/components/surfaces/teacher-course-detail-surface.tsx" "src/components/classroom/classroom-roster-panel.test.tsx" "src/components/classroom/classroom-student-detail-panel.test.tsx" "src/features/runtime-platform/classroom/runtime-session.test.ts"`
- `pnpm typecheck`

## Notes

- The active milestone scope no longer has route or course-detail form lint
  blockers.
- A remaining warning still exists in `src/lib/dal/classroom.ts`, but it is not
  a blocking lint error for the milestone gate.
