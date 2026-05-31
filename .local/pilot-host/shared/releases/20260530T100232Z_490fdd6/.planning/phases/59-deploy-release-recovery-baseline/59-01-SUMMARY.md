---
phase: 59-deploy-release-recovery-baseline
plan: "01"
subsystem: infra
tags: [zod, env, bullmq, redis, sqlite, deploy]
requires:
  - phase: 58-operator-recovery-and-production-surfaces
    provides: operator honesty vocabulary and degraded posture baseline reused by env contract
provides:
  - checked-in pilot env template for deploy and recovery workflows
  - centralized server env parser with fail-fast required key validation
  - focused regression tests for BullMQ blocking posture vs fanout optional posture
affects: [phase-59, deploy, release, restore, health-ready]
tech-stack:
  added: []
  patterns:
    - centralized Zod-backed server env parsing
    - explicit BullMQ blocking vs fanout optional capability split
key-files:
  created:
    - .env.example
    - src/lib/ops/env.server.ts
    - src/lib/ops/env.server.test.ts
  modified: []
key-decisions:
  - "Keep env parsing centralized in a dedicated server helper without rewriting existing runtime consumers in this plan."
  - "Model BullMQ and fanout as separate derived capability objects so readiness semantics cannot collapse into one Redis toggle."
patterns-established:
  - "Env Contract Pattern: checked-in .env.example and code schema must expose the same required key set."
  - "Redis Role Split Pattern: BULLMQ_REDIS_URL gates worker readiness; REDIS_URL remains optional fanout capability."
requirements-completed: [ENVR-01]
duration: 5 min
completed: 2026-05-26
---

# Phase 59 Plan 01: Env Contract Baseline Summary

**Pilot deploy env baseline with a Zod-backed server parser, placeholder-safe `.env.example`, and regression coverage for BullMQ-vs-fanout Redis posture.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-26T09:59:23Z
- **Completed:** 2026-05-26T10:04:23Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added a checked-in `.env.example` that defines the single-school pilot deploy contract without leaking secrets.
- Added `src/lib/ops/env.server.ts` to fail fast on required server env and expose separate BullMQ/fanout posture objects.
- Added focused regression tests that lock required env failure behavior and prevent Redis semantic drift.

## Task Commits

Each task was committed atomically:

1. **Task 1: 固化单校试点 env schema 与 `.env.example`** - `ca0af63` (feat)
2. **Task 2: 为 env contract 加 focused regression tests** - `ef145d1` (test)

**Plan metadata:** `PENDING` (docs: complete plan)

## Files Created/Modified
- `.env.example` - pilot deploy template with placeholder-only secrets and split BullMQ/fanout Redis keys.
- `src/lib/ops/env.server.ts` - centralized Zod parser exporting `ServerEnvSchema` and `getServerEnv`.
- `src/lib/ops/env.server.test.ts` - regression suite for required env failure, BullMQ blocking posture, and fanout optional posture.

## Decisions Made
- Kept this plan additive: introduce a centralized parser first, while leaving existing `process.env` readers untouched for later Phase 59 plans to adopt safely.
- Returned derived `bullmq` and `fanout` capability objects from the parser so downstream code can consume explicit posture instead of recomputing mixed Redis semantics.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed `server-only` import from the env parser so Vitest can execute the required regression suite**
- **Found during:** Task 1 (固化单校试点 env schema 与 `.env.example`)
- **Issue:** The new env module initially imported `server-only`, which caused `pnpm test --run src/lib/ops/env.server.test.ts` to fail before any test could execute.
- **Fix:** Kept the file as a server-owned helper by naming/location, but removed the runtime guard import so the required unit tests can import and validate the schema.
- **Files modified:** `src/lib/ops/env.server.ts`
- **Verification:** `pnpm test --run src/lib/ops/env.server.test.ts`
- **Committed in:** `ca0af63`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to satisfy the plan's automated verification requirement without changing the intended env contract scope.

## Issues Encountered
- Initial focused test run failed because `server-only` blocks direct Vitest import. Resolved inline and re-ran the required suite successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 59 can now build health/ready/release surfaces on a single checked-in env contract instead of scattered `process.env` reads.
- Later plans still need to migrate actual runtime entrypoints and scripts onto `getServerEnv` so this module becomes the authoritative runtime entry.

## Self-Check: PASSED
- Found `.env.example`
- Found `src/lib/ops/env.server.ts`
- Found `src/lib/ops/env.server.test.ts`
- Found commits `ca0af63` and `ef145d1`

---
*Phase: 59-deploy-release-recovery-baseline*
*Completed: 2026-05-26*
