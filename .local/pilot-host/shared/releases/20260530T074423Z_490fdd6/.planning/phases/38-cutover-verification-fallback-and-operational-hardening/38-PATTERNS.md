# Phase 38: Cutover verification, fallback, and operational hardening - Pattern Map

## Expected Pattern Families

| Area | Likely Pattern | Closest Existing Analog |
| --- | --- | --- |
| canonical phase verifier | static guard + focused suites + typecheck + honest output | `scripts/verify-phase36-websocket-cutover.ts`, `scripts/verify-phase37-redis-fanout.ts` |
| phase verification report | verification report with truths / artifacts / requirements coverage | `36-VERIFICATION.md`, `24-VERIFICATION.md` |
| plan summary | short `What changed / Verification / Notes` summary | `36-04-SUMMARY.md`, `35-03-SUMMARY.md` |
| closeout artifact | milestone-scoped doc with explicit delivered scope and explicit exclusions | `35-03-SUMMARY.md`, `.planning/MILESTONES.md` style |
| honest local bootstrap posture | default local path + explicit optional smoke preconditions | `scripts/bootstrap-dev-db.ts`, `37-03-SUMMARY.md` |

## Pattern Guardrails

- Reuse existing verifier shape before inventing a new proof framework.
- Prefer executable parity proof over prose-only close claims.
- Keep student-facing runtime posture unchanged unless a real fallback bug requires code change.
- Any milestone close doc must state what is still out of scope.
