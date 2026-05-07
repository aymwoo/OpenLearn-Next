# 11-01 Summary

## Outcome

Completed Plan 11-01 by hardening plugin DAL and Server Actions around authenticated actor scope, school isolation, permission checks, denied audit reasons, and theme registration on enable.

## Changes

- Extended `PluginManifestSchema` with optional `theme` payload support in `src/lib/dto/resource-ai.ts`.
- Added `PLUGIN_ACTION_PERMISSION_REQUIREMENTS` in `src/server/plugins/registry.ts`.
- Reworked `src/lib/dal/plugins.ts` to:
  - require non-null `actorId` on public school-scoped interfaces,
  - reuse teacher/membership checks before plugin CRUD and enable paths,
  - deny and audit `disabled`, `kill_switch`, `school_mismatch`, `not_allowed`, and `permission_denied` hook paths before dispatch,
  - register school-scoped theme tokens when enabling a plugin whose manifest declares `theme`.
- Reworked `src/actions/plugin-actions.ts` to:
  - validate manifest input with `PluginManifestSchema` at the action boundary,
  - resolve authenticated actor context before DAL calls,
  - expose list/get/delete/enable/kill-switch/hook actions,
  - invalidate plugin and theme cache tags after successful mutations.
- Tightened `src/lib/dal/themes.ts` typing so plugin-triggered theme registration can audit actor context without `any`.
- Added focused regression tests in `src/lib/dal/plugins.test.ts` and `src/actions/plugin-actions.test.ts`.

## Verification

- `pnpm test -- src/lib/dal/plugins.test.ts src/actions/plugin-actions.test.ts`
- `pnpm typecheck`
- `pnpm exec eslint src/lib/dto/resource-ai.ts src/server/plugins/registry.ts src/lib/dal/themes.ts src/lib/dal/plugins.ts src/actions/plugin-actions.ts src/lib/dal/plugins.test.ts src/actions/plugin-actions.test.ts`

## Notes

- Full-repo `pnpm lint` still fails on pre-existing issues in `.claude/`, `.opencode/`, and unrelated source files; Plan 11-01 changed files pass targeted ESLint.
