# 30-01 Summary

## What shipped

- 在 `createGuardedHostAction()` 上叠加了 `resolveGovernance` 扩展点，保持它仍是唯一的 host action server entry。
- 新增了 typed governance contract：allowed/denied decision、reason code、capability summary、lifecycle snapshot。
- runtime host 与 plugin host 现在都会在真正执行前经过统一 governance decision，而不是各自散落判断。

## Key files

- `src/features/runtime-platform/contracts/permissions.ts`
- `src/features/runtime-platform/host-actions/guards.ts`
- `src/features/runtime-platform/host-actions/runtime-host.ts`
- `src/features/runtime-platform/host-actions/plugin-host.ts`

## Verification

- `pnpm exec vitest --run src/features/runtime-platform/host-actions/guards.test.ts`

## Notes

- denied 语义已统一到 `not_allowlisted`、`capability_missing`、`permission_denied`、`lifecycle_blocked`、`school_mismatch`、`kill_switch`、`unsupported_action`。
