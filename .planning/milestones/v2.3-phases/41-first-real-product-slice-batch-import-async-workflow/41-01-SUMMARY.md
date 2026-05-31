---
phase: 41-first-real-product-slice-batch-import-async-workflow
plan: 01
subsystem: api
tags: [async-tasks, course-import, bullmq, worker, dal]

# Dependency graph
requires:
  - phase: 40-bullmq-infra-seam-and-worker-reliability-posture
    provides: BullMQ worker runtime, QueueEvents durable projection, registry-driven reliability metadata
provides:
  - course import async task registry contract and worker processor
  - batch-level active task dedupe with durable task reuse semantics
  - async apply server action returning honest queued or dispatch_failed posture
affects: [ATP-11, ATP-14, ATP-19, 41-02-product-surfaces]

# Tech tracking
tech-stack:
  added: []
  patterns: [entity-scoped active task reuse, prepare-or-enqueue then worker-execute DAL split, rich worker returnvalue projection]

key-files:
  created: [src/features/async-tasks/server/registry.ts, src/features/async-tasks/infra/queue-events.ts, src/features/async-tasks/worker/processors/course-import.ts, src/features/async-tasks/worker/processors/platform-healthcheck.ts]
  modified: [src/features/async-tasks/worker/registry.ts, src/lib/dto/course-import.ts, src/lib/dal/course-import.ts, src/actions/course-import-actions.ts, src/actions/course-import-actions.test.ts]

key-decisions:
  - "同一 course import batch 的 active task 通过 entityType/entityId + active status 集合在 DAL 层复用，而不是只依赖 BullMQ job id 去重。"
  - "worker completed 事件优先解析 typed AsyncTaskResultSummary，partial success 直接投影为 partially_completed rich result，而不是 generic done payload。"

patterns-established:
  - "Pattern 1: 真实 workload 走 prepare helper 冻结 durable rows，再由 worker execute helper 重读 durable truth 执行。"
  - "Pattern 2: batch import action 返回 task-aware posture，dispatch_failed 与 reusedExistingTask 都是显式产品语义。"

requirements-completed: [ATP-11, ATP-14, ATP-19]

# Metrics
duration: 0 min
completed: 2026-05-18
---

# Phase 41 Plan 01: First real product slice - batch import async workflow Summary

**课程批量导入已切到 durable async task 触发链路，具备单批次 active task 复用、worker 执行与 partial-result rich summary 投影。**

## Performance

- **Duration:** 0 min
- **Started:** 2026-05-18T23:11:27Z
- **Completed:** 2026-05-18T23:11:43Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- 新增 `course_import.apply_batch` registry contract、worker processor 与 QueueEvents rich result projection。
- 把原同步 `applyCourseImport()` 拆成 `prepareCourseImportApplyTask()` 与 `executeCourseImportApplyTask()`，worker 按 durable rows truth 执行。
- `applyCourseImportAction()` 现在返回 durable task id、复用中的 active task 语义，且对 batch/task 双侧 cache tag 做 honest invalidation。

## Task Commits

Each task was committed atomically:

1. **Task 1: 定义 course import async contract 与 worker 执行器** - `f44acdd` (feat)
2. **Task 2: 把 apply server action 改成 async trigger + honest dispatch result** - `7646425` (feat)

**Plan metadata:** Pending

## Files Created/Modified

- `src/features/async-tasks/server/registry.ts` - 注册 `course_import.apply_batch` typed task definition。
- `src/features/async-tasks/worker/processors/course-import.ts` - 新增 course import worker processor，仅走 DAL execute helper。
- `src/features/async-tasks/infra/queue-events.ts` - completed 事件现在支持 rich result / partially_completed projection，并联动 course import cache tags。
- `src/lib/dal/course-import.ts` - 新增 prepare/execute split、active task lookup、task snapshot 读取与 rerun-safe durable row refresh。
- `src/lib/dto/course-import.ts` - 新增 async payload、trigger result 与 worker result schema。
- `src/actions/course-import-actions.ts` - apply action 改成 async trigger，并失效 async task + batch tags。
- `src/actions/course-import-actions.test.ts` - 更新 action test，覆盖 async trigger result 与 tag invalidation。

## Decisions Made

- 用 `course_import_batch` entity ref 做 batch-level active task dedupe，满足同批次只保留一个 active task 的产品语义。
- worker terminal result 采用 `AsyncTaskResultSummary` 统一格式，让 queue projector 可以直接写入 `latestResultJson` rich summary。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 修复 registry 扩展后 worker processor 的 payload 联合类型阻塞**
- **Found during:** Task 1 (定义 course import async contract 与 worker 执行器)
- **Issue:** 新增 `course_import.apply_batch` 后，原 healthcheck processor 通过 registry 读取 payload schema，导致 TypeScript 把 payload 推断成联合类型并阻塞 typecheck。
- **Fix:** 让 `platform-healthcheck` 与 `course-import` processor 都显式解析各自 payload schema，避免 registry 扩展带来的错误联合推断。
- **Files modified:** `src/features/async-tasks/worker/processors/platform-healthcheck.ts`, `src/features/async-tasks/worker/processors/course-import.ts`
- **Verification:** `./node_modules/.bin/tsc --noEmit`
- **Committed in:** `f44acdd`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 仅修复新增 task type 带来的类型阻塞，没有扩大 Phase 41-01 范围。

## Issues Encountered

- `pnpm typecheck` 受仓库当前 `pnpm approve-builds` gate 影响，会在执行前触发 install 并失败；本次改用 `./node_modules/.bin/tsc --noEmit` 完成同等 TypeScript 校验，业务代码本身已通过类型检查。

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 41-02 可以直接消费 batch-level async task posture，在 batch detail 与 course center surface 上展示 queued/running/partial/completed/failed 语义。
- course import worker 已返回 structured counts/result summary，后续 UI 不需要再猜测 partial success。

## Self-Check: PASSED

- Found summary file: `.planning/phases/41-first-real-product-slice-batch-import-async-workflow/41-01-SUMMARY.md`
- Found task commit: `f44acdd`
- Found task commit: `7646425`

---
*Phase: 41-first-real-product-slice-batch-import-async-workflow*
*Completed: 2026-05-18*
