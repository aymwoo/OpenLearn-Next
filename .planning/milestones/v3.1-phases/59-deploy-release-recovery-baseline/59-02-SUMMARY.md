---
phase: 59-deploy-release-recovery-baseline
plan: "02"
subsystem: api
tags: [ops, healthcheck, readiness, release, nextjs]
requires:
  - phase: 59-01
    provides: pilot env contract baseline and release manifests directory env
provides:
  - shared release-status payload helper
  - honest /api/health and /api/ready probes
  - canonical /api/release HTTP surface backed by current and green pointers
affects: [phase59-verifier, deploy-baseline, rollback, restore-drill]
tech-stack:
  added: []
  patterns: [shared-ops-payload-builder, canonical-release-pointer-http-surface, blocking-vs-nonblocking-readiness]
key-files:
  created:
    - src/lib/ops/release-status.ts
    - src/lib/ops/release-status.test.ts
    - src/app/api/health/route.ts
    - src/app/api/ready/route.ts
    - src/app/api/release/route.ts
    - src/app/api/ops-routes.test.ts
  modified: []
key-decisions:
  - "health/ready/release 统一复用 src/lib/ops/release-status.ts，避免 route 各自拼装不同 posture 语义。"
  - "release surface 只读取 canonical current.json 与 green.json pointer，不扫描 manifests 目录猜最新文件。"
  - "worker posture 继续作为 blocking readiness，fanout degraded 继续保留 non-blocking honest detail。"
patterns-established:
  - "Shared ops probe helper: helper 负责 contract 组装，route 只映射 HTTP status + no-store headers"
  - "Canonical release pointer read: /api/release 只信 current.json/green.json，不信文件时间戳"
requirements-completed: [OPS-01, ENVR-03]
duration: 6 min
completed: 2026-05-26
---

# Phase 59 Plan 02: honest status probe surfaces Summary

**Shipped shared health/ready/release payload builders plus truthful HTTP probes that separate process liveness, blocking readiness, and canonical release identity.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-26T10:29:16Z
- **Completed:** 2026-05-26T10:35:27Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added a shared `release-status` helper that centralizes health, readiness, and release payload assembly.
- Split `/api/health` from `/api/ready` so only DB/web/worker block readiness while fanout remains visible but non-blocking.
- Added route-level contract tests proving no-store headers, status mapping, canonical pointer behavior, and OPS-01 correlation fields.

## Task Commits

Each task was committed atomically:

1. **Task 1: 建立 shared release-status helper 与 posture tests** - `0ada82a` (test), `b633cfd` (feat)
2. **Task 2: 实现 `/api/health`、`/api/ready`、`/api/release` probes** - `e29abe0` (feat), `69dcdf2` (fix)
3. **Task 3: 为 ops probes 加 route-level contract tests** - `9292342` (test), `69dcdf2` (fix)

**Plan metadata:** pending final docs commit

## Files Created/Modified
- `src/lib/ops/release-status.ts` - shared payload builder for health, ready, and release contracts
- `src/lib/ops/release-status.test.ts` - focused TDD coverage for canonical pointers, blocking worker posture, optional fanout posture, and correlation completeness
- `src/app/api/health/route.ts` - process-alive probe with `Cache-Control: no-store`
- `src/app/api/ready/route.ts` - readiness probe that maps blocking posture to HTTP 503
- `src/app/api/release/route.ts` - release identity probe backed by canonical current/green pointers
- `src/app/api/ops-routes.test.ts` - route-level contract tests for all three ops probes

## Decisions Made
- Kept route handlers thin and delegated all contract assembly to `src/lib/ops/release-status.ts`.
- Treated `current.json` and `green.json` as the only valid release pointer sources for HTTP release identity.
- Preserved Phase 59 honesty semantics: worker is blocking, fanout is observable but non-blocking.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 补齐 release 顶层字段与 ready route 显式 blocking gate**
- **Found during:** Final acceptance criteria pass after Task 3
- **Issue:** `/api/release` 只在 `currentRelease` 嵌套里暴露 `gitSha/releaseId/rollbackTarget`，且 `/api/ready` route 没在 route 层显式体现 blocking vs non-blocking status 判定，未完全满足计划 acceptance criteria。
- **Fix:** 在 shared helper 中追加顶层 release identity fields；在 ready route 中显式按 `db/web/worker` blocking components 计算 HTTP 503；同步扩展 route/helper tests 断言 acceptance-level 语义。
- **Files modified:** `src/lib/ops/release-status.ts`, `src/lib/ops/release-status.test.ts`, `src/app/api/ready/route.ts`, `src/app/api/ops-routes.test.ts`
- **Verification:** `pnpm test --run src/lib/ops/release-status.test.ts src/app/api/ops-routes.test.ts`
- **Committed in:** `69dcdf2`

---

**Total deviations:** 1 auto-fixed (1 rule-1 bug)
**Impact on plan:** Auto-fix brought the shipped probes into exact alignment with the plan’s acceptance contract. No scope creep.

## Issues Encountered

- The first RED run failed on `server-only` test environment enforcement before reaching business assertions; the test file now mocks `server-only` like the existing server-side DAL test pattern.
- The first implementation pass exposed release identity only in nested shape; acceptance review caught the mismatch and the final fix normalized the route contract before completion.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 59 now has truthful HTTP probe surfaces that deploy, rollback, restore, and verifier work can reuse directly.
- The next plans can wire CI gate, deploy scripts, and restore drill around the established canonical release-status contract.

## Self-Check: PASSED

- FOUND: `.planning/phases/59-deploy-release-recovery-baseline/59-02-SUMMARY.md`
- FOUND: `0ada82a`
- FOUND: `b633cfd`
- FOUND: `e29abe0`
- FOUND: `9292342`
- FOUND: `69dcdf2`

---
*Phase: 59-deploy-release-recovery-baseline*
*Completed: 2026-05-26*
