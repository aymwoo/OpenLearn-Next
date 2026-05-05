---
phase: 260505-cin-next-js-16-login-blocking-route-searchpa
plan: 01
subsystem: auth-ui
tags: [nextjs-16, react-suspense, authjs, login]

requires:
  - phase: 02-auth-roles-schema-and-dal-boundary
    provides: Auth.js credentials sign-in and login page baseline
provides:
  - Suspense-bounded login page searchParams handling
  - Preserved Auth.js credentials Server Action and test account autofill
affects: [auth, login, ppr]

tech-stack:
  added: []
  patterns:
    - Next.js route searchParams are awaited inside a Suspense child component

key-files:
  created: []
  modified:
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/login/TestAccountHint.tsx
    - src/actions/auth-actions.ts

key-decisions:
  - "Kept LoginPage as a synchronous shell so /login can render a Suspense boundary before awaiting searchParams."

patterns-established:
  - "Route request data boundary: pass the searchParams promise into an async child below Suspense."

requirements-completed: [QUICK-260505-CIN]

duration: 2min
completed: 2026-05-05
---

# Quick Task 260505-cin: Next.js 16 Login Route Summary

**Login route searchParams now stream behind Suspense while preserving Auth.js credentials sign-in and test-account autofill behavior.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-05T01:01:59Z
- **Completed:** 2026-05-05T01:03:34Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Converted `/login` into a synchronous route shell that returns `<Suspense>` before request data is awaited.
- Moved `await searchParams` into `LoginContent`, an async child rendered under the Suspense boundary.
- Preserved `signIn("credentials", formData)`, the `roleIntent` teacher/student hint, `id="email"`, `id="password"`, and `<TestAccountHint />` placement.

## Task Commits

Each task was committed atomically:

1. **Task 1: 将 searchParams 读取移动到 Suspense 边界内** - `5422349` (fix)

## Files Created/Modified

- `src/app/(auth)/login/page.tsx` - Adds the Suspense shell, fallback card skeleton, and async content boundary for `searchParams`.
- `src/app/(auth)/login/TestAccountHint.tsx` - Removes an unused import so lint can complete for the touched login surface.
- `src/actions/auth-actions.ts` - Replaces `any` in credentials error handling with a guarded `unknown` check so lint can complete.

## Decisions Made

- Used a Suspense fallback that mirrors the centered login card structure without reading `searchParams`.
- Kept the existing Auth.js Server Action behavior in the async content component rather than introducing a separate action file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed lint blockers from auth-related touched surfaces**
- **Found during:** Task 1 verification
- **Issue:** `pnpm lint` failed on an unused import in `TestAccountHint` and `no-explicit-any` in `src/actions/auth-actions.ts`.
- **Fix:** Removed the unused import and narrowed the caught Auth.js error from `any` to `unknown` with a guarded `type` check.
- **Files modified:** `src/app/(auth)/login/TestAccountHint.tsx`, `src/actions/auth-actions.ts`
- **Verification:** `pnpm lint` now exits with warnings only and no errors.
- **Committed in:** `5422349`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep; the fixes were required to pass the planned lint gate.

## Issues Encountered

- `pnpm lint` still reports two pre-existing warnings in `src/components/authoring/lesson-authoring-workspace.tsx` and `src/lib/dal/lesson-authoring.ts`. They are outside this quick task and do not fail the command.

## Known Stubs

None. The `placeholder="you@example.com"` input hint is intentional login form copy, not an unwired data stub.

## User Setup Required

None - no external service configuration required.

## Verification

- `pnpm typecheck` passed.
- `pnpm lint` passed with two unrelated warnings.

## Self-Check: PASSED

- Found `src/app/(auth)/login/page.tsx`.
- Found `src/app/(auth)/login/TestAccountHint.tsx`.
- Found `src/actions/auth-actions.ts`.
- Found commit `5422349`.

---
*Quick task: 260505-cin-next-js-16-login-blocking-route-searchpa*
*Completed: 2026-05-05*
