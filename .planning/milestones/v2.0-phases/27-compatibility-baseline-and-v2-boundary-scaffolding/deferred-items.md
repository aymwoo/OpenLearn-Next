# Deferred Items

## 2026-05-15

- `./node_modules/.bin/tsc --noEmit` currently fails in pre-existing test files unrelated to Phase 27 Plan 02:
  - `src/actions/learning-actions.test.ts`
  - `src/actions/lesson-authoring-actions.test.ts`
  - `src/actions/plugin-actions.test.ts`
  - `src/actions/theme-actions.test.ts`
- These failures were observed while verifying runtime-platform boundary changes and are out of scope for this plan because the modified files compile posture was limited to route import migration and feature barrels.
- `pnpm typecheck` for Phase 27 Plan 03 is blocked by the repository's current `pnpm approve-builds` gate before it reaches `tsc --noEmit`.
- Direct `./node_modules/.bin/tsc --noEmit` also fails in the same pre-existing unrelated test files above, so full repo typecheck remains deferred outside this plan's contracts-only scope.
- `./node_modules/.bin/tsc --noEmit` remains blocked during Phase 27 Plan 04 by the same pre-existing unrelated test files above; the new runtime-platform seam and host-action files were verified via focused Vitest coverage instead.
