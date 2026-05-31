---
phase: 40-bullmq-infra-seam-and-worker-reliability-posture
plan: 03
subsystem: infra
tags: [bullmq, reliability, idempotency, worker, verification]

# Dependency graph
requires:
  - phase: 40-bullmq-infra-seam-and-worker-reliability-posture
    provides: BullMQ runtime seam, QueueEvents durable projection, worker bootstrap
provides:
  - Explicit retry/backoff/dead-letter/idempotency metadata in the async task registry
  - Stable BullMQ job identity helper reused by the enqueue seam
  - Minimal platform healthcheck processor plus Phase 40 runtime verification gate
affects: [ATP-06, ATP-07, ATP-10, 41-batch-import-and-product-surfaces]

# Tech tracking
tech-stack:
  added: []
  patterns: [registry-driven reliability policy, shared stable job identity helper, phase-specific runtime verifier]

key-files:
  created: [src/features/async-tasks/shared/idempotency.ts, src/features/async-tasks/server/registry.reliability.test.ts, src/features/async-tasks/shared/idempotency.test.ts, src/features/async-tasks/worker/processors/platform-healthcheck.ts, src/features/async-tasks/worker/processors/platform-healthcheck.test.ts, scripts/verify-phase40-bullmq-runtime.ts]
  modified: [src/features/async-tasks/shared/contract.ts, src/features/async-tasks/server/registry.ts, src/features/async-tasks/server/enqueue.ts, src/features/async-tasks/server/enqueue.runtime.test.ts, src/features/async-tasks/worker/registry.ts, src/features/async-tasks/worker/bootstrap.test.ts, src/features/async-tasks/index.ts, package.json]

key-decisions:
  - "平台级幂等先固定为 registry-driven stable job identity，不提前混入 Phase 41 的业务唯一键。"
  - "最小 healthcheck processor 只证明 worker loop 与 typed progress/result contract，可运行但不承载真实业务 workload。"
  - "verify:phase40 先做静态边界守卫，再跑 focused suites 与本地 tsc，以避免被全仓无关噪音阻断。"

patterns-established:
  - "Pattern 1: enqueue 通过 buildAsyncTaskJobOptions 统一消费 reliability metadata，而不是手写 jobId/attempts/backoff。"
  - "Pattern 2: worker processor 只做 typed payload/progress/result 处理，不直接写 DB。"
  - "Pattern 3: phase verifier 用 source guard + focused suites + phase-slice typecheck 固定运行时边界。"

requirements-completed: [ATP-06, ATP-07, ATP-10]

# Metrics
duration: 37 min
completed: 2026-05-18
---

# Phase 40 Plan 03: BullMQ infra seam and worker reliability posture Summary

**显式 reliability contract、稳定 job identity、最小 platform healthcheck processor 与 `verify:phase40` gate 已落地。**

## Performance

- **Duration:** 37 min
- **Started:** 2026-05-18T22:15:00Z
- **Completed:** 2026-05-18T22:52:00Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- 扩展 async task registry reliability metadata，显式表达 attempts、backoff、dead-letter 与 idempotency posture。
- 新增 `buildAsyncTaskJobId` / `buildAsyncTaskJobOptions`，让 enqueue 路径复用稳定 job identity，而不是继续手写 `jobId`。
- 新增最小 `platform.healthcheck` processor，并通过 worker registry 正式注册。
- 新增 `verify:phase40`，静态检查 dedicated worker boundary、QueueEvents projector、DAL/actions 不直连 BullMQ、graceful shutdown token 与 reliability helper，再跑 focused suites 和 phase-slice typecheck。

## Task Commits

Each task was committed atomically:

1. **Task 1: 扩展 reliability metadata 与 stable job identity helper** - Not committed
2. **Task 2: 增加 minimal platform processor 与 verify:phase40 gate** - Not committed

**Plan metadata:** Not committed

## Files Created/Modified

- `src/features/async-tasks/shared/contract.ts` - 扩展 reliability schema，显式纳入 attempts/backoff/dead-letter/idempotency。
- `src/features/async-tasks/shared/idempotency.ts` - 提供 stable job identity、deduplication key 与 BullMQ job options helper。
- `src/features/async-tasks/server/registry.ts` - 为 `platform.healthcheck` 固定 reliability posture。
- `src/features/async-tasks/server/enqueue.ts` - 通过 shared helper 构建 BullMQ dispatch options。
- `src/features/async-tasks/worker/processors/platform-healthcheck.ts` - 最小 platform processor，写 typed progress 并返回 typed result。
- `src/features/async-tasks/worker/registry.ts` - 将 `platform.healthcheck` 路由到独立 processor。
- `scripts/verify-phase40-bullmq-runtime.ts` - Phase 40 runtime gate。
- `package.json` - 注册 `verify:phase40`。

## Decisions Made

- 平台级 dedupe 先以 durable task id 为默认 job identity，后续 workload 再叠加业务唯一键。
- `verify:phase40` 的 direct BullMQ import 守卫只扫描真实 source import，不把测试文件里的字符串误判为 drift。
- 保持 `server.ts` web-only；40-03 只验证 worker/runtime 边界，不把真实 workload 提前带入。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 缩小 verifier 的 BullMQ drift 扫描范围**
- **Found during:** Task 2
- **Issue:** 初版 verifier 直接扫 `bullmq` token，会把测试文件中的 mock/断言误判成 actions 或 DAL 直连 BullMQ。
- **Fix:** 改为只扫描非测试源文件里的真实 `import ... from "bullmq"` 语句。
- **Files modified:** `scripts/verify-phase40-bullmq-runtime.ts`
- **Verification:** `node --import tsx scripts/verify-phase40-bullmq-runtime.ts`
- **Committed in:** Not committed

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** 仅修正 verifier 误报，没有扩大 40-03 范围。

## Issues Encountered

- 当前主工作区存在大量与 40-03 无关的已修改/未跟踪文件，无法安全做原子提交而不混入其它 phase 产物。

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 41 可以直接复用 registry-driven reliability metadata 与 stable job identity helper 接入真实 workload。
- `verify:phase40` 已成为本阶段可执行 gate，可在后续变更中持续阻断 process boundary drift。
- 提交前需要由 orchestrator 或人工先清理/隔离当前脏工作区，避免混入 40-03 范围外文件。

## Self-Check: PASSED

- Found summary file: `.planning/phases/40-bullmq-infra-seam-and-worker-reliability-posture/40-03-SUMMARY.md`
- Found verifier: `scripts/verify-phase40-bullmq-runtime.ts`
- Found helper: `src/features/async-tasks/shared/idempotency.ts`
- Found processor: `src/features/async-tasks/worker/processors/platform-healthcheck.ts`

---
*Phase: 40-bullmq-infra-seam-and-worker-reliability-posture*
*Completed: 2026-05-18*
