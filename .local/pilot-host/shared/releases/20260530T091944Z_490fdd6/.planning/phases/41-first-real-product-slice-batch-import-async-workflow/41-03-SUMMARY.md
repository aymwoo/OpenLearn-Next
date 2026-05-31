---
phase: 41-first-real-product-slice-batch-import-async-workflow
plan: 03
subsystem: testing
tags: [batch-import, async-tasks, verifier, vitest, regression]

# Dependency graph
requires:
  - phase: 41-first-real-product-slice-batch-import-async-workflow
    provides: async batch import trigger path, honest batch detail surface, recent import hero card
provides:
  - canonical verify:phase41 gate with static guards and focused suites
  - backend regressions for active-task reuse, dispatch failure honesty, and partial-success execution semantics
  - UI regressions for honest async copy, summary-before-detail ordering, and recent-task progress card
affects: [ATP-11, ATP-12, ATP-13, ATP-14, ATP-19, 42-operator-visibility]

# Tech tracking
tech-stack:
  added: []
  patterns: [phase verifier with exact-token static guards, focused async contract regressions, DTO cycle avoidance in test paths]

key-files:
  created: [src/features/async-tasks/worker/processors/course-import.test.ts, scripts/verify-phase41-batch-import.ts]
  modified: [src/actions/course-import-actions.test.ts, src/lib/dal/course-import.test.ts, src/lib/dto/course-import.ts, src/components/surfaces/course-import-review-surface.test.tsx, src/components/surfaces/teacher-course-center-surface.test.tsx, src/components/surfaces/teacher-course-center-surface.tsx, package.json]

key-decisions:
  - "Phase 41 verifier 采用 exact import/string guards + focused suites，避免宽泛 grep 或注释噪音造成误判。"
  - "课程中心 recent import card 在 active 状态必须展示 progress copy，而不是只保留 terminal summary。"
  - "课程导入 DTO 在测试路径内使用本地 status schema，避免与 course-authoring DTO 形成循环初始化。"

patterns-established:
  - "Pattern 1: phase verifier 直接跑脚本真实入口，同时在脚本内自带 vitest fallback runner。"
  - "Pattern 2: async honest UI regressions 同时锁住状态文案、信息层级和回详情入口。"

requirements-completed: [ATP-11, ATP-12, ATP-13, ATP-14, ATP-19]

# Metrics
duration: 9 min
completed: 2026-05-18
---

# Phase 41 Plan 03: First real product slice - batch import async workflow Summary

**Batch import async contract 现已通过 `verify:phase41`、focused backend regressions 与 honest UI regressions 被持续锁定。**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-18T23:23:47Z
- **Completed:** 2026-05-18T23:32:34Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- 为 action / DAL / worker 补齐了 active-task reuse、dispatch-failed honesty、prepare/execute split、partial-success rich summary 等 focused regressions。
- 为 batch detail 与 course center 补齐了 queued/running/retrying/dispatch_failed/partial/failed 的 honest UI 断言，并锁住 summary-before-detail 层级。
- 新增 `scripts/verify-phase41-batch-import.ts` 与 `verify:phase41`，把 Phase 41 的反漂移校验收敛成一个 canonical gate。

## Task Commits

Each task was committed atomically:

1. **Task 1: 补 action / DAL / worker focused regressions** - `3a3648b` (fix)
2. **Task 2: 补 review surface 与 course center hero 的 honest UI regressions** - `35924b4` (feat)
3. **Task 3: 新增 canonical `verify:phase41` gate** - `f7ea2d0` (feat)

**Plan metadata:** Pending

## Files Created/Modified

- `src/actions/course-import-actions.test.ts` - 补 active task reuse 与 dispatch-failed honest return regressions。
- `src/lib/dal/course-import.test.ts` - 锁住 prepare/execute split、terminal rerun、新任务尝试与 partial-success rich summary 断言。
- `src/lib/dto/course-import.ts` - 提取本地 course status schema，修复测试链路的 DTO 循环初始化阻塞。
- `src/features/async-tasks/worker/processors/course-import.test.ts` - 新增 worker processor discipline 与 structured result regressions。
- `src/components/surfaces/course-import-review-surface.test.tsx` - 锁住 honest async status copy 与 summary-before-detail 顺序。
- `src/components/surfaces/teacher-course-center-surface.tsx` - recent import card 在 active 状态下展示 progress copy。
- `src/components/surfaces/teacher-course-center-surface.test.tsx` - 锁住 recent import hero card 的 active progress 与 batch-detail link。
- `scripts/verify-phase41-batch-import.ts` - Phase 41 canonical verifier。
- `package.json` - 注册 `verify:phase41` 脚本。

## Decisions Made

- `verify:phase41` 静态守卫只检查真实 source import / exact string / exact script path，避免 verifier 自己制造误报。
- recent import card 的 honest posture 不区分“只显示终态”与“active 隐藏细节”；active 任务同样要显式展示 progress copy。
- 为避免 DTO 循环把测试与 verifier 入口直接打断，课程导入领域在本文件内保留独立 status schema，而不是跨 DTO 文件相互引用。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 用本地 vitest / node 入口替代被 `pnpm approve-builds` gate 阻断的计划命令**
- **Found during:** Task 1、Task 3
- **Issue:** `pnpm test` 与 `pnpm verify:phase41` 会先触发 install，并被 `ERR_PNPM_IGNORED_BUILDS` 阻断，无法完成计划要求的 focused verification。
- **Fix:** 改用本地 `./node_modules/.bin/vitest --run ...` 与 `node --import tsx scripts/verify-phase41-batch-import.ts` 执行等价验证。
- **Files modified:** None
- **Verification:** 所有 focused suites 与 verifier 真实入口均已成功跑通。
- **Committed in:** `3a3648b`, `f7ea2d0`（验证路径调整，无额外代码文件变更）

**2. [Rule 3 - Blocking] 修复 `course-import` / `course-authoring` DTO 循环引用导致的 schema 初始化失败**
- **Found during:** Task 1
- **Issue:** `course-import.ts` 引用 `TeacherCourseStatusSchema`，而 `course-authoring.ts` 又引用 `CourseImportApplySummarySchema`，导致测试和 verifier 入口加载时 `CourseImportApplySummarySchema` 为 `undefined`。
- **Fix:** 在 `course-import.ts` 内提取本地 `CourseImportTeacherCourseStatusSchema`，消除循环初始化。
- **Files modified:** `src/lib/dto/course-import.ts`
- **Verification:** backend focused suites、UI focused suites、`node --import tsx scripts/verify-phase41-batch-import.ts`
- **Committed in:** `3a3648b`

**3. [Rule 2 - Missing Critical] recent import hero card 补上 active progress copy**
- **Found during:** Task 2
- **Issue:** 课程中心 recent import card 在 active task 下只显示默认回详情文案，未诚实暴露进行中的 progress summary，与 D-41-06 ~ D-41-12 的用户可见 contract 不一致。
- **Fix:** `TeacherCourseCenterSurface` 在 `isActive=true` 时优先展示 `progressLabel` / `progressPercent`。
- **Files modified:** `src/components/surfaces/teacher-course-center-surface.tsx`, `src/components/surfaces/teacher-course-center-surface.test.tsx`
- **Verification:** `./node_modules/.bin/vitest --run src/components/surfaces/course-import-review-surface.test.tsx src/components/surfaces/teacher-course-center-surface.test.tsx`
- **Committed in:** `35924b4`

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 missing critical)
**Impact on plan:** 所有偏差都直接服务于验证链路或 honest async posture，没有扩展到 Phase 41 范围之外。

## Issues Encountered

- 当前主工作区存在大量与本计划无关的未提交文件；本次执行仅逐文件 stage 当前任务产物，避免污染原子提交。

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 42 可以直接复用 `verify:phase41` 作为 batch import product slice 的回归 gate。
- batch import async contract 的 dedupe、partial success、honest copy 与 recent-task re-entry posture 已被自动化锁住，后续可安全扩到 operator visibility / recovery。

## Self-Check: PASSED

- Found summary file: `.planning/phases/41-first-real-product-slice-batch-import-async-workflow/41-03-SUMMARY.md`
- Found task commit: `3a3648b`
- Found task commit: `35924b4`
- Found task commit: `f7ea2d0`
