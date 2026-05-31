# Phase 34: Course membership management loop - Research

**Researched:** 2026-05-17
**Phase:** 34-course-membership-management-loop
**Status:** Ready for planning

## Research question

How should Phase 34 complete `COURSE-07` inside the existing course detail workflow
without widening roster scope, bypassing the Phase 33 DAL or DTO safety posture, or
creating a parallel course-membership subsystem?

## Executive summary

Phase 34 should extend the existing `course-authoring` stack rather than creating new
routes or a new feature root. The safest path is:

1. Extend `TeacherCourseDetailDTO` with two server-owned slices: current course members
   and eligible students derived only from currently linked classes.
2. Add single-student add or remove enrollment DAL functions and matching Server Actions
   that reuse the current teacher-owned course scope, return the refreshed detail DTO,
   block duplicates, and reject archived-course writes.
3. Productize the loop inside `CourseDetailForm` and `TeacherCourseDetailSurface` with an
   in-page feedback region, a searchable eligible-student picker, read-only archived
   behavior, and delete-eligibility coupling.

## What already exists

### Existing course detail contract

- `src/lib/dto/course-authoring.ts` already defines `TeacherCourseDetailDTO` with
  `classLinks`, `availableClasses`, `enrollmentCount`, and `deleteEligibility`.
- `src/lib/dal/course-authoring.ts` already enforces teacher ownership through
  `assertActiveTeacher()`, `assertSchoolAccess()`, and `getScopedOwnedCourse()`.
- `getTeacherCourseDetailDTO()` is the single course-detail read model and already feeds
  both the detail page and mutation read-your-writes responses.
- `src/actions/course-authoring-actions.ts` already owns Zod parsing, auth failure
  mapping, and `teacherCourses(actorId)` plus `course(courseId)` tag invalidation.
- `src/components/courses/course-detail-form.tsx` already implements in-page save,
  publish, archive, class association, delete blocking, and success or error feedback.

### Existing roster and student identity sources

- `src/db/schema.ts` already has `courseEnrollments`, `courseClasses`, `classMembers`,
  `memberships`, and `users.studentNumber`.
- `src/lib/dal/class-management.ts` shows the canonical class roster join path:
  `classMembers -> users`, with student identity coming from `user.id`, `name`, and
  `studentNumber`.
- `src/lib/dto/class-management.ts` already normalizes the minimum student summary shape
  needed for Phase 34: stable user id, display name, and student number.

### Existing verification anchors

- `src/lib/dal/course-authoring.test.ts` already covers owner or school scope, detail DTO
  shape, class association add or remove, and delete eligibility reasons.
- `src/actions/course-authoring-actions.test.ts` already covers action error mapping and
  cache invalidation posture.
- `src/components/courses/course-detail-form.test.tsx` already covers same-page lifecycle,
  class association, delete guardrails, and success or error retention.
- `package.json` already registers `verify:phase33`; the repo also has a precedent for
  dedicated phase verifiers such as `verify:phase15`, `verify:phase21`, and
  `verify:phase33`.

## Recommended implementation approach

### 1. Membership read model

Add membership-aware DTO slices directly to `src/lib/dto/course-authoring.ts` and keep
them under `TeacherCourseDetailDTO`.

Recommended DTO additions:

```ts
type TeacherCourseMemberDTO = {
  studentId: string;
  studentName: string;
  studentNumber: string;
  classLabels: string[];
  enrollmentStatus: "active";
};

type TeacherCourseEligibleStudentDTO = {
  studentId: string;
  studentName: string;
  studentNumber: string;
  classLabels: string[];
  isAlreadyEnrolled: boolean;
};
```

The DAL should derive these two slices as follows:

1. Load linked class ids from `courseClasses` for the current course.
2. Load student memberships for those classes from `classMembers` filtered to
   `role === "student"`.
3. Join those user ids to `users` for `name` and `studentNumber`.
4. Load current `courseEnrollments` for the course.
5. Build:
   - `members`: only students already in `courseEnrollments`.
   - `eligibleStudents`: students from linked classes who are not enrolled yet, or the
     full candidate list with `isAlreadyEnrolled` if the UI wants disabled rows.

Why this is the right source:

- It honors D-01 and D-02 by limiting the pool to the current course's linked classes.
- It reuses existing teacher-owned course scope instead of introducing class-management
  reads in the UI layer.
- It keeps the client from reconstructing school or class scope from raw rows.

### 2. Enrollment mutations

Add two DAL functions in `src/lib/dal/course-authoring.ts`:

- `addCourseEnrollmentForTeacherScoped({ courseId, studentId })`
- `removeCourseEnrollmentForTeacherScoped({ courseId, studentId })`

Required behavior:

1. Reuse `getScopedOwnedCourse()` for teacher-owned course scope.
2. Reject archived courses with an explicit domain error such as
   `COURSE_MEMBERSHIP_READ_ONLY`.
3. Resolve the allowed student set from linked classes before writing.
4. If `studentId` is outside that set, return a clear domain error such as
   `STUDENT_NOT_ELIGIBLE`.
5. On add, treat an existing `courseEnrollment` as idempotent or reject it explicitly via
   `COURSE_ENROLLMENT_EXISTS`.
6. On remove, delete the enrollment row if present and still return the refreshed detail
   DTO, keeping the operation effectively idempotent.
7. Always return `getTeacherCourseDetailDTO({ courseId })` so page metrics, members,
   eligible students, and delete eligibility update together.

Recommended schema hardening:

- Add a unique constraint on `courseEnrollment(courseId, studentId)` if it does not
  already exist. The current schema only has separate indexes, so duplicate prevention is
  otherwise application-only.

### 3. Server Action contract

Keep the action layer in `src/actions/course-authoring-actions.ts` and mirror the class
association helper pattern.

Recommended additions:

- `CourseEnrollmentInputSchema = z.object({ courseId: z.string().min(1), studentId: z.string().min(1) }).strict()`
- `addCourseEnrollmentAction()`
- `removeCourseEnrollmentAction()`

Recommended error mapping additions:

- `COURSE_ENROLLMENT_EXISTS` -> `DUPLICATE` with message `该学生已经在当前课程中，无需重复添加。`
- `STUDENT_NOT_ELIGIBLE` -> `NOT_FOUND` or `OUT_OF_SCOPE` with message
  `你当前无法管理这名学生的课程关联。`
- `COURSE_MEMBERSHIP_READ_ONLY` -> `READ_ONLY` with message
  `归档课程仅支持查看成员，暂不支持修改。`

This keeps Phase 34 aligned with Phase 33's tightened action boundary.

### 4. UI productization

Implement the loop inside `CourseDetailForm` rather than adding a new route.

Recommended surface changes:

1. Add a new membership section between class association and dangerous actions.
2. Show one feedback region shared by course save, class association, and membership
   writes, or split membership feedback into its own local state if that reduces message
   collisions.
3. For current members, render compact cards or chips with:
   - `studentName`
   - `studentNumber`
   - `classLabels`
   - `移出课程`
4. For eligible students, start with a small search input on top of a client-side filtered
   list derived from the server DTO. This is the smallest change that still satisfies the
   UI contract.
5. Disable add or remove controls and show read-only copy when `course.status === "archived"`.
6. Keep the hero metric `学生数` bound to the refreshed DTO so read-your-writes is visible
   immediately.
7. Keep delete blocking on the same page and make sure the `COURSE_HAS_ENROLLMENTS`
   reason points back to the membership section.

Why a client-side search over the DTO list is enough for now:

- Phase 34 is constrained to students already inside linked classes, not the whole school.
- This avoids adding a new query route or server search action.
- The expected roster size per linked course is small enough for a compact detail-page
  experience.

## Risks and landmines

### Duplicate enrollment drift

Risk: The current schema does not prove a unique `(courseId, studentId)` constraint.

Mitigation:

- Add the unique constraint if missing.
- Keep the DAL duplicate guard even after adding the constraint, so the UI still gets a
  friendly message instead of a raw database error.

### Foreign roster leakage

Risk: If eligible students are derived from same-school memberships instead of linked
classes, the page will leak students from other classes or other teachers' contexts.

Mitigation:

- Build eligibility strictly from `courseClasses -> classMembers -> users`.
- Keep the teacher-owned course scope at the top of the read path.

### Archived-course write drift

Risk: Existing class association actions currently do not appear to block archived-course
writes, so Phase 34 could accidentally introduce a stricter rule for members than for the
rest of the page.

Mitigation:

- Phase 34 should at least block membership writes for archived courses per D-09.
- If the team wants a fully consistent page-level read-only posture, that can be folded into
  the same touch as a minimal follow-through in `course-authoring`.

### Message collision inside `CourseDetailForm`

Risk: The form currently has one `successMessage` and one `error` state for several action
families. Membership writes could overwrite unrelated feedback.

Mitigation:

- Either keep a single message area but make messages explicit and course-section aware, or
  introduce a separate `membershipFeedback` state slice while preserving the existing save
  semantics.

## Testing strategy

### DAL

Add focused tests in `src/lib/dal/course-authoring.test.ts` for:

1. detail DTO returns `members` and `eligibleStudents` limited to linked classes only.
2. same-school foreign course still throws `COURSE_NOT_FOUND`.
3. add enrollment succeeds for eligible students and updates `enrollmentCount` plus
   `deleteEligibility`.
4. add enrollment rejects duplicates.
5. add enrollment rejects students outside linked classes.
6. archived-course add or remove is blocked.
7. remove enrollment succeeds and reintroduces the student into the eligible pool.

### Actions

Add tests in `src/actions/course-authoring-actions.test.ts` for:

1. validation failure on missing `studentId`.
2. duplicate error mapping.
3. read-only archived-course error mapping.
4. success path invalidates both `teacherCourses(actorId)` and `course(courseId)`.

### UI

Add tests in `src/components/courses/course-detail-form.test.tsx` for:

1. rendering the membership section with current members and searchable eligible students.
2. add flow updates the page and shows success feedback.
3. remove flow updates the page and shows success feedback.
4. archived courses render member lists but disable mutation controls.
5. duplicate or stale candidate failures remain visible in-page.
6. delete-blocking copy references course members when enrollments remain.

### Phase verifier

Add `scripts/verify-phase34-course-membership.ts` and `pnpm verify:phase34` to guard:

1. `TeacherCourseDetailDTO` still contains membership slices.
2. actions still parse `courseId` and `studentId` with Zod.
3. DAL still derives eligibility from `courseClasses` and `classMembers`, not same-school
   global membership scans.
4. archived courses still disable membership writes.
5. UI still keeps the workflow inside `/teacher/courses/[courseId]` rather than a new
   members route.

## Recommended plan split

Phase 34 naturally splits into three plans:

1. Read model and DTO expansion.
2. Mutation contract and cache-safe write path.
3. UI loop, regression coverage, and phase verifier.

This matches the roadmap slots and keeps the first two plans mostly server-side before the
final UI integration wave.

## Planning implications

- Plan 01 should touch DTO, DAL read model, and DAL tests first.
- Plan 02 should touch schema if needed, DAL mutations, Server Actions, and action tests.
- Plan 03 should touch `CourseDetailForm`, `TeacherCourseDetailSurface`, UI tests, and the
  new phase verifier registration.
- The final verification command should include the targeted DAL, action, and component
  suites plus `pnpm verify:phase34`.

## Conclusion

The repo already has almost all the infrastructure Phase 34 needs. The correct move is to
extend `course-authoring` as the single course-detail truth source, derive eligible students
only from linked classes, and keep add or remove enrollment writes inside the same
Server Action plus DTO plus cache-invalidated loop used by the existing detail page.

That approach satisfies `COURSE-07`, respects the UI contract, and minimizes architecture
risk.

---

*Phase: 34-course-membership-management-loop*
*Research completed: 2026-05-17*
