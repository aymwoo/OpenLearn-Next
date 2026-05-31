---
phase: 41-first-real-product-slice-batch-import-async-workflow
plan: 02
subsystem: ui
tags: [course-import, async-tasks, teacher-surface, dal, dto]

# Dependency graph
requires:
  - phase: 41-first-real-product-slice-batch-import-async-workflow
    provides: batch import async trigger path, worker result projection, durable async task truth
provides:
  - async-aware batch detail DTO with latest task summary and durable result mapping
  - teacher course center recent import card linked back to batch detail truth page
  - honest batch detail UI for queued, running, retrying, partially completed, failed, and dispatch_failed states
affects: [ATP-12, ATP-13, ATP-14, 41-03-verification]

# Tech tracking
tech-stack:
  added: []
  patterns: [entity-scoped async task read model for product surfaces, summary-before-detail async result hierarchy, review-controls freeze after task creation]

key-files:
  created: []
  modified: [src/lib/dto/course-import.ts, src/lib/dal/course-import.ts, src/lib/dto/course-authoring.ts, src/lib/dal/course-authoring.ts, src/components/surfaces/course-import-review-surface.tsx, src/components/surfaces/teacher-course-center-surface.tsx, src/components/surfaces/course-import-review-surface.test.tsx, src/components/surfaces/teacher-course-center-surface.test.tsx]

key-decisions:
  - "产品面把 pending_enqueue、dispatching、stalled_recovery 统一折叠为 queued posture，避免把平台内部中间态直接泄露给 teacher/staff。"
  - "课程中心只保留 hero 级最近导入任务卡，完成后继续展示最近摘要，但始终回流到 batch detail 作为单一事实页。"

patterns-established:
  - "Pattern 1: batch detail DTO 同时承载 batch domain status 与 async task summary，两者分字段表达，不混成单一状态枚举。"
  - "Pattern 2: async result UI 固定采用 status/progress -> counts -> row detail 层级，partial success headline 固定为“已完成，但有失败项”。"

requirements-completed: [ATP-12, ATP-13, ATP-14]

# Metrics
duration: 11 min
completed: 2026-05-18
---

# Phase 41 Plan 02: First real product slice - batch import async workflow Summary

**课程导入批次详情与课程中心现已消费 durable async task truth，能诚实展示 queued/running/retrying/partial/failure 状态并回流到同一批次详情页。**

## Performance

- **Duration:** 11 min
- **Started:** 2026-05-18T23:11:43Z
- **Completed:** 2026-05-18T23:22:42Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 扩展 `CourseImportBatchDTO` 与 `TeacherCourseCenterDTO`，让 batch detail 和课程中心都能读取 durable async task summary。
- `CourseImportReviewSurface` 现在是 review、runtime、terminal result 的统一事实页，支持 queued、running、retrying、dispatch_failed、failed、partially_completed 等 honest 分支。
- `TeacherCourseCenterSurface` hero 顶部新增轻量最近导入任务卡，保留最近结果摘要并始终链接回 `/teacher/courses/import/[batchId]`。

## Task Commits

Each task was committed atomically:

1. **Task 1: 扩展 batch detail 与 course center DTO 为 async-aware read model** - `f55c09d` (feat)
2. **Task 2: 按 UI-SPEC 把批次详情页与课程中心改成 honest async surface** - `defdb96` (feat)

**Plan metadata:** Pending

## Files Created/Modified

- `src/lib/dto/course-import.ts` - 新增 batch detail async summary schema，并保持 batch domain status 与 async runtime status 分离。
- `src/lib/dal/course-import.ts` - 通过 entity-scoped async task lookup 组装 batch detail 的 latest task / async summary read model。
- `src/lib/dto/course-authoring.ts` - 新增课程中心 recent import task card DTO。
- `src/lib/dal/course-authoring.ts` - 通过 actor-scoped async task lookup 组装课程中心顶部最近导入任务卡数据。
- `src/components/surfaces/course-import-review-surface.tsx` - 扩展为 honest async review/runtime/result surface，并在任务创建后冻结逐行决策。
- `src/components/surfaces/teacher-course-center-surface.tsx` - 在 hero 顶部新增轻量最近导入任务卡与回 batch detail 的链接。
- `src/components/surfaces/course-import-review-surface.test.tsx` - 补齐 queued/read-only 与 partial-success headline 测试。
- `src/components/surfaces/teacher-course-center-surface.test.tsx` - 补齐 recent import task card 与回详情链接测试。

## Decisions Made

- 将 `pending_enqueue`、`dispatching`、`stalled_recovery` 映射为产品面 `queued`，保证 teacher/staff 只看到可解释的异步语义。
- 课程中心 recent import card 保持轻量 hero 卡定位，不展示 operator 级日志或控制，只做状态摘要与回详情入口。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 用本地 `tsc --noEmit` 替代被环境 gate 阻断的 `pnpm typecheck`**
- **Found during:** Task 1（DTO / DAL async read model 扩展）
- **Issue:** 仓库当前 `pnpm typecheck` 会先触发 install，并被 `pnpm approve-builds` gate 阻断，无法完成计划要求的 typecheck。
- **Fix:** 改用 `./node_modules/.bin/tsc --noEmit` 做等价 TypeScript 校验，并继续补齐因 DTO 新字段引起的 surface fixture 类型错误。
- **Files modified:** `src/components/surfaces/course-import-review-surface.test.tsx`, `src/components/surfaces/teacher-course-center-surface.test.tsx`
- **Verification:** `./node_modules/.bin/tsc --noEmit`
- **Committed in:** `f55c09d`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 仅替换受环境 gate 影响的验证命令，没有扩大 Phase 41-02 范围。

## Issues Encountered

- `pnpm typecheck` 当前受仓库 `pnpm approve-builds` gate 影响，不能作为稳定 verifier；本 plan 继续沿用 `tsc --noEmit` 完成等价类型验证。

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 41-03 可以直接围绕当前 durable DTO 与 honest UI 文案做 focused verification，锁住 partial success、read-only freeze 与 cache-safe updates。
- batch detail 与 course center 已有稳定产品面，下一步只需补强验证与 proof，不需要再开第二个 task detail surface。

## Self-Check: PASSED

- Found summary file: `.planning/phases/41-first-real-product-slice-batch-import-async-workflow/41-02-SUMMARY.md`
- Found task commit: `f55c09d`
- Found task commit: `defdb96`

---
*Phase: 41-first-real-product-slice-batch-import-async-workflow*
*Completed: 2026-05-18*
