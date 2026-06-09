# Phase 74 Deferred Items

## 2026-06-09 — 74-05 final alias cutover blockers

These issues were discovered while executing Plan 74-05 Task 3. They block the final `pnpm verify:phase` cutover, but they are pre-existing upstream failures outside the direct scope of this task, so they were not auto-fixed here.

1. **Phase 68 verifier regression**
   - Command: `pnpm verify:phase68`
   - Failure: `src/features/platform-core/plugin-data-access/allowlist.test.ts` has three failing enum / allowlist assertions.

2. **Phase 69 local verification DB drift**
   - Command: `pnpm verify:phase69`
   - Failure: local SQLite verification database reports `plugin_owned_quiz_questions` has no column named `questionType`.

3. **Phase 70 recap surface test drift**
   - Command: `pnpm verify:phase70`
   - Failure: `src/components/classroom/classroom-session-recap-surface.test.tsx` still expects legacy text `正确率`, which no longer appears in the rendered surface.
