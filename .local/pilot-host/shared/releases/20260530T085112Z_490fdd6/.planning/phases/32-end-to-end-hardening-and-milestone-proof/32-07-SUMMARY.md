---
phase: 32
plan: 07
status: completed
created: 2026-05-17
files_changed:
  - src/features/runtime-platform/host/runtime-host-frame.tsx
  - src/features/runtime-platform/host/runtime-host.test.tsx
  - scripts/verify-phase32-end-to-end.ts
  - .planning/phases/32-end-to-end-hardening-and-milestone-proof/32-VALIDATION.md
---

# Plan 32-07 summary

## What changed

- Added `allow-same-origin` to `RuntimeHostFrame`'s iframe sandbox so the
  current same-origin Next.js pilot route can boot without falling back to the
  opaque-origin 403 posture.
- Extended `runtime-host.test.tsx` with a focused regression that locks the
  required sandbox token set and rejects wider permissions such as top
  navigation, popups, and downloads.
- Updated `verify:phase32` to include a permanent `sandbox startup drift`
  guard, so the same-origin startup requirement remains part of the canonical
  close gate.
- Updated `32-VALIDATION.md` to register the new automated evidence and exit
  criteria for this gap closure.

## Verification

- `pnpm test --run src/features/runtime-platform/host/runtime-host.test.tsx`
- `pnpm verify:phase32`

## Outcome

The seeded runtime proof path keeps its restricted iframe posture, but no
longer blocks startup because the pilot route loads inside an opaque-origin
sandbox.
