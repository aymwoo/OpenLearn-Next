## Deferred Items

- 2026-05-21 — Out-of-scope pre-existing test failure: `src/lib/dal/plugin-data.test.ts` expects `revalidateTag(tag)` but runtime now passes `revalidateTag(tag, "max")`, which causes `pnpm test -- --run src/features/platform-core/commands/bus.test.ts` to fail even though Phase 51 bus tests pass under focused Vitest execution.
