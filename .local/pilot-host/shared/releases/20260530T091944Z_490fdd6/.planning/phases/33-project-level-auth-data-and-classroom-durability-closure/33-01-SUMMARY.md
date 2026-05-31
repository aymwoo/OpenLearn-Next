---
phase: 33
plan: 01
status: completed
created: 2026-05-17
files_changed:
  - src/actions/auth-actions.ts
  - src/actions/auth-actions.test.ts
  - src/lib/auth/auth.config.ts
  - src/lib/auth/auth.config.test.ts
  - src/lib/auth/auth.test.ts
  - src/lib/auth/auth.ts
  - src/lib/dal/auth.ts
  - src/lib/dto/membership.ts
  - src/lib/dto/user.ts
  - src/proxy.ts
  - src/types/next-auth.d.ts
---

# Plan 33-01 summary

## What changed

- Unified Auth.js credential sign-in around `WorkspaceRoleSchema`, so
  `teacher` / `student` / `admin` all resolve through the same role-aware
  entry contract instead of separate local assumptions.
- Added `workspaceRole` to the Auth.js user, JWT, and session shape, which
  keeps the login intent explicit without exposing unfinished future-role UI.
- Added `CurrentActorDTO` in the auth DAL so later server code can consume one
  sanitized actor truth with active membership roles, workspace roles, and
  school scope.
- Replaced the broad proxy matcher with explicit protected route families for
  `/teacher`, `/student`, `/classroom`, `/admin`, and `/api/classroom`, while
  keeping resource authorization inside DAL or Server Actions.
- Expanded auth regressions to cover admin workspace sign-in and the explicit
  protected-family contract.

## Verification

- `pnpm test --run src/lib/auth/auth.test.ts src/actions/auth-actions.test.ts src/lib/auth/auth.config.test.ts`
- `pnpm verify:phase33`

## Notes

- `AUTH-01` to `AUTH-04` now have executable proof instead of only roadmap
  intent.
- Future roles such as `super_admin`, `school_admin`, `parent`, `developer`,
  and `ai_agent` are modeled in server DTO vocabulary only; this plan does not
  claim those workflows have product surfaces yet.
