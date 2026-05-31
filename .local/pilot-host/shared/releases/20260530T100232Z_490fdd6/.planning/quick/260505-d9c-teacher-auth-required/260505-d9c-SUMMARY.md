---
phase: 260505-d9c-teacher-auth-required
plan: 01
status: complete
subsystem: auth
tags: [authjs, jwt, credentials, drizzle, sqlite, teacher-auth]
requires:
  - phase: 02-auth-roles-schema-and-dal-boundary
    provides: Auth.js v5, Drizzle auth tables, membership DAL, and teacher authorization boundary
provides:
  - Credentials login sessions now expose `session.user.id` for DAL reads
  - Test teacher seed creates active teacher membership and school context
  - Phase 3 regression gate covers teacher auth, seed, redirect, proxy, and edge-safe split
affects: [teacher-authoring, auth, dal, seed-data, regression-gates]
tech-stack:
  added: []
  patterns:
    - Auth.js v5 JWT callback propagates credentials user id to `session.user.id`
    - Seed scripts upsert authorization context idempotently through Drizzle
key-files:
  created:
    - src/types/next-auth.d.ts
  modified:
    - src/lib/auth/auth.ts
    - src/actions/auth-actions.ts
    - scripts/seed-test-accounts.ts
    - scripts/verify-phase3-authoring.ts
key-decisions:
  - "Keep CredentialsProvider, DrizzleAdapter, DB, and bcrypt in Node-backed auth.ts while only adding edge-safe callback merging."
  - "Seed teacher authorization through membership rows rather than weakening DAL assertActiveTeacher."
patterns-established:
  - "Credentials sessions must expose `session.user.id` before DAL code reads the current user."
  - "Teacher route login gates stay in proxy, but teacher authorization remains membership-based in DAL."
requirements-completed: [QUICK-260505-D9C]
duration: 2min
completed: 2026-05-05
---

# Quick task 260505-d9c: Teacher auth required summary

**Auth.js credentials JWT sessions now carry `session.user.id`, and the seeded
teacher account has active membership for teacher authoring DAL checks.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-05T01:34:52Z
- **Completed:** 2026-05-05T01:36:49Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added Auth.js v5 `jwt` and `session` callbacks so credentials sign-in stores
  the authenticated user id in the JWT and exposes it as `session.user.id`.
- Redirected successful credentials login to `/teacher/editor`, preserving the
  existing generic `CredentialsSignin` error mapping.
- Made `pnpm seed:test-accounts` idempotently create a test school and assign
  only `teacher@example.com` an active teacher membership.
- Extended `pnpm verify:phase3` to guard JWT session id propagation, teacher
  redirect, seed membership, proxy coverage, and edge-safe auth config.

## Task commits

Each task was committed atomically:

1. **Task 1: 修复 Auth.js credentials JWT session id 链路** - `251867f` (fix)
2. **Task 2: 补全测试教师账号 active teacher membership seed** - `82e4661` (fix)
3. **Task 3: 加固 Phase 3 authoring 回归检查** - `38905ca` (test)

## Files created/modified

- `src/types/next-auth.d.ts` - Extends Auth.js session and JWT types with the
  custom user id field used by DAL.
- `src/lib/auth/auth.ts` - Merges edge-safe callbacks and adds JWT/session id
  propagation while preserving JWT strategy and Node-only provider setup.
- `src/actions/auth-actions.ts` - Sends successful credentials login to the
  teacher editor.
- `scripts/seed-test-accounts.ts` - Creates/reuses the test school and ensures
  active teacher membership only for the teacher test account.
- `scripts/verify-phase3-authoring.ts` - Adds focused auth, redirect, seed,
  proxy, and edge-safety regression checks.

## Decisions made

- Kept the Auth.js Node/Edge split intact: DB, `DrizzleAdapter`,
  `CredentialsProvider`, and `bcrypt` remain only in `src/lib/auth/auth.ts`.
- Fixed teacher access by creating membership seed data instead of bypassing or
  relaxing `assertActiveTeacher()`.

## Deviations from plan

### Auto-fixed issues

**1. [Rule 3 - Blocking] Added Auth.js type augmentation**

- **Found during:** Task 1 (修复 Auth.js credentials JWT session id 链路)
- **Issue:** TypeScript needs explicit module augmentation for custom
  `session.user.id` and `token.id` fields.
- **Fix:** Added `src/types/next-auth.d.ts` so the planned callbacks typecheck
  without weakening types.
- **Files modified:** `src/types/next-auth.d.ts`
- **Verification:** `pnpm typecheck`
- **Committed in:** `251867f`

---

**Total deviations:** 1 auto-fixed (Rule 3)
**Impact on plan:** Required for typed Auth.js callback implementation. No scope
creep.

## Issues encountered

- `pnpm lint` passes with pre-existing warnings in
  `src/components/authoring/lesson-authoring-workspace.tsx` and
  `src/lib/dal/lesson-authoring.ts`; no errors were introduced by this task.

## Known stubs

None. The grep hit for `placeholder: "you@example.com"` is an existing
credentials field hint, not a runtime UI/data stub.

## Threat flags

None. The changed surfaces match the plan threat model: login credentials,
Auth.js session propagation, seed writes, proxy coverage, and DAL membership
authorization.

## Verification

- `pnpm seed:test-accounts` — passed
- Teacher/student membership SQL assertion — passed
- `pnpm typecheck` — passed
- `pnpm verify:phase3` — passed
- `pnpm lint` — passed with 2 existing warnings and 0 errors

## Self-check: PASSED

- Found `src/types/next-auth.d.ts`
- Found `src/lib/auth/auth.ts`
- Found `src/actions/auth-actions.ts`
- Found `scripts/seed-test-accounts.ts`
- Found `scripts/verify-phase3-authoring.ts`
- Found commit `251867f`
- Found commit `82e4661`
- Found commit `38905ca`

## User setup required

None. No external service configuration is required.

## Next phase readiness

Teacher authoring can rely on credentials login producing `session.user.id` and
the seeded teacher account passing `assertActiveTeacher()` membership checks.

---

*Phase: 260505-d9c-teacher-auth-required*
*Completed: 2026-05-05*
