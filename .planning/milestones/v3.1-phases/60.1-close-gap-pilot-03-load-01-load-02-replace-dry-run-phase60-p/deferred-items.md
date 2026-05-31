## Deferred Items

- 2026-05-30T08:00:00Z — Out-of-scope blocker while executing Task 3 local rehearsal:
  - `pnpm verify:phase60` first failed the static summary gate because `ops/releases/evidence/phase60/rehearsal-summary.md` still contained dry-run wording.
  - Retrying the canonical rehearsal path on the local pilot-host then failed inside `ops/deploy/deploy.sh` -> `pnpm test --run` for a pre-existing unrelated suite error:
    - `src/components/surfaces/classroom-incident-operator-surface.test.tsx`
    - unhandled exception: `ReferenceError: window is not defined`
  - This failure is outside the scoped Phase 60.1 Task 3 evidence/audit update files, so it was not auto-fixed here.
  - Next action: resolve the unrelated Vitest/jsdom test failure (and keep the canonical deploy gate green), then rerun Task 3 local rehearsal.
