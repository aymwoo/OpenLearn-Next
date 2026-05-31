---
phase: 36
plan: 04
status: completed
created: 2026-05-18
files_changed:
  - package.json
  - scripts/verify-phase36-websocket-cutover.ts
  - src/components/classroom/classroom-control-panel.test.tsx
---

# Plan 36-04 summary

## What changed

- Added the canonical `verify:phase36` gate and registered it in `package.json`.
- Implemented `scripts/verify-phase36-websocket-cutover.ts` with non-comment
  static guards, the eight focused suites, and a final `pnpm typecheck` gate.
- Made the verifier robust to the current repo environment by using
  `node --import tsx` for the script entry and a direct `node_modules/vitest`
  runner fallback when the local `.bin` links are missing.
- Tightened the control-panel regression so fallback is proven after a real
  `transport.error` message, not only when the socket is locally unavailable.
- Fixed the closeout posture in the verifier output: it now explicitly states
  that SSE remains the rollback surface and Redis fanout is out of scope for
  Phase 36.

## Verification

- `pnpm verify:phase36`

## Notes

- Phase 36 now has one honest external gate. Whether the cutover is complete no
  longer depends on prose-only summary claims.
