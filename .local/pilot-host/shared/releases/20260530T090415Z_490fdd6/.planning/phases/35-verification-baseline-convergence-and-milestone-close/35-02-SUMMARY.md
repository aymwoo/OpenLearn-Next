---
phase: 35
plan: 02
status: completed
created: 2026-05-17
files_changed:
  - scripts/verify-phase35-milestone-close.ts
  - package.json
---

# Plan 35-02 summary

## What changed

- Added `scripts/verify-phase35-milestone-close.ts` as the canonical Phase 35
  close gate and registered it as `pnpm verify:phase35`.
- Chained the new verifier to `verify:phase33` and `verify:phase34` so the
  milestone-close claim remains grounded in the already-proven safety closure
  and course membership gates.
- Added a milestone-scoped `eslint` partition that checks the auth, data,
  classroom, course-membership, and canonical verification surfaces touched by
  v2.1.
- Kept the full `pnpm lint` run in capture mode and explicitly separated the
  remaining repo-wide lint errors from the shipped milestone scope instead of
  pretending that the whole repository is clean.
- Locked the close claim to the current truth: full `typecheck` is green,
  milestone-scoped lint errors are zero, and runtime or platform expansion
  remains deferred.

## Verification

- `pnpm verify:phase35`

## Notes

- `verify:phase35` currently reports a repo-wide lint backlog outside the
  milestone scope, mostly in older authoring, markdown, runtime-host, and
  unrelated test surfaces.
- This verifier intentionally treats those files as out-of-scope backlog rather
  than silently ignoring them.
