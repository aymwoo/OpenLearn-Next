---
phase: 32-end-to-end-hardening-and-milestone-proof
plan: 03
subsystem: testing
tags: [phase32, verification, runtime-platform, regression, inspector]

# Dependency graph
requires:
  - phase: 27-compatibility-baseline-and-v2-boundary-scaffolding
    provides: compatibility baseline verifier reused by the phase 32 gate
  - phase: 28-runtime-bridge-contracts-and-session-persistence
    provides: durable runtime session and event truth for proof checks
  - phase: 29-runtime-host-and-html-courseware-pilot
    provides: canonical HTML runtime proof step and submit flow
  - phase: 30-capability-enforcement-and-plugin-lifecycle
    provides: governance prerequisite checks reused by the phase 32 gate
  - phase: 31-transport-boundary-and-runtime-inspector
    provides: transport and inspector prerequisite checks reused by the phase 32 gate
provides:
  - single external `verify:phase32` milestone proof gate
  - proof-focused regressions for authoring, launch, submit, recovery, classroom, and inspector posture
  - static drift guards that separate milestone prerequisites from phase 32 proof contracts
affects: [milestone-close, runtime-proof, classroom, inspector]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - single external milestone gate with chained prerequisite verifiers
    - proof-specific drift guards layered on top of prerequisite baselines
    - focused semantic regressions instead of broad snapshot-only proof coverage

key-files:
  created:
    - scripts/verify-phase32-end-to-end.ts
  modified:
    - package.json
    - scripts/verify-phase5-classroom.ts
    - src/lib/dal/lesson-authoring.test.ts
    - src/components/classroom/classroom-launch-panel.test.tsx
    - src/features/runtime-platform/host/runtime-host.test.tsx
    - src/components/surfaces/student-player-surfaces.test.ts
    - src/lib/dal/classroom.test.ts
    - src/lib/dal/runtime-inspector.test.ts
    - src/components/surfaces/runtime-inspector-surface.test.tsx

key-decisions:
  - "`verify:phase32` 作为唯一外部 milestone-close gate，Phase 27-31 verifier 只做内部 prerequisite。"
  - "proof drift 继续用 focused semantic assertions 锁定，不用宽泛 snapshot 或注释字符串计数代替。"
  - "旧 verifier 漂移优先最小修正 verifier 本身，不修改运行时业务代码去迎合过时检查。"

patterns-established:
  - "Pattern: prerequisite baseline 与当前 phase proof contract 在同一个 verifier 中分层输出。"
  - "Pattern: canonical proof gate 同时包含静态 guard 与 focused suites。"

requirements-completed: [RHOST-04]

# Metrics
duration: 9 min
completed: 2026-05-17
---

# Phase 32 Plan 03: Canonical phase verification summary

**Single `verify:phase32` milestone gate with chained prerequisite verifiers
and proof-focused regression suites for launch, submit, recovery,
classroom, and inspector contracts.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-17T01:11:17Z
- **Completed:** 2026-05-17T01:20:08Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- 新增了唯一外部 `verify:phase32` 闸门，在一个命令中串起
  `verify:phase27` 到 `verify:phase31` prerequisite，并继续执行 Phase 32
  自己的 proof drift guards 与 focused suites。
- 为 lesson authoring、launch、runtime host、student player、classroom
  DAL、inspector DAL 与 inspector surface 补齐了 proof-focused 回归断言。
- 收敛了 legacy verifier 与新 gate 的漂移问题，确保 milestone proof
  不会因为过时检查或错误 source 选择出现假失败。

## Task Commits

Each task was committed atomically:

1. **Task 1: 补齐 proof-focused regression suites** - `9bf37df` (test)
2. **Task 2: 建立 `verify:phase32` 单一总闸门** - `2ce2b56` (feat)

**Plan metadata:** 待本 Summary 与状态文件提交时生成。

## Files Created/Modified

- `scripts/verify-phase32-end-to-end.ts` - 新增单一 Phase 32 canonical
  verifier，串联 prerequisite checks、proof drift guards 与 focused suites。
- `package.json` - 注册 `verify:phase32` 脚本入口。
- `scripts/verify-phase5-classroom.ts` - 最小修正 legacy classroom verifier
  的漂移检查，解除 prerequisite 假失败。
- `src/lib/dal/lesson-authoring.test.ts` - 锁定 editor/publish proof step
  仍会冻结进 published snapshot。
- `src/components/classroom/classroom-launch-panel.test.tsx` - 锁定 launch
  surface 仍保留 canonical proof affordance。
- `src/features/runtime-platform/host/runtime-host.test.tsx` - 锁定 submit
  success terminal posture 与 no-save-after-submit。
- `src/components/surfaces/student-player-surfaces.test.ts` - 锁定 same-surface
  retry recovery posture。
- `src/lib/dal/classroom.test.ts` - 锁定 classroom first-feedback 与
  `runtimeSessionId` truth。
- `src/lib/dal/runtime-inspector.test.ts` - 锁定 inspector 默认聚焦 proof
  session 与 unified timeline review posture。
- `src/components/surfaces/runtime-inspector-surface.test.tsx` - 锁定
  inspector proof drill-down 文案与 timeline 姿态。

## Decisions Made

- `verify:phase32` 只暴露一个外部命令，避免 milestone close 分裂成多个手工命令。
- Phase 32 proof coverage 必须同时包含 drift guards 与 focused regressions，
  不能只重跑旧 verifier。
- 对 legacy verifier 的修复保持在 verifier 层，避免引入对业务实现的无关改动。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 修复 legacy classroom verifier 的假失败**
- **Found during:** Task 2 (建立 `verify:phase32` 单一总闸门)
- **Issue:** `scripts/verify-phase5-classroom.ts` 仍按旧结构检查
  `forcedStepId`、student runtime wrapper 和 deferred token，导致当前真实实现
  被误判失败。
- **Fix:** 更新 verifier 的 drift checks，使其匹配当前 runtime/posture，
  并移除会误伤 `schema` 中合法 `websocket` 枚举的扫描源。
- **Files modified:** `scripts/verify-phase5-classroom.ts`
- **Verification:** `pnpm verify:phase5`、`pnpm verify:phase32`
- **Committed in:** `2ce2b56`

**2. [Rule 3 - Blocking] 修复 proof seed guard 的错误 source 选择**
- **Found during:** Task 2 (建立 `verify:phase32` 单一总闸门)
- **Issue:** `verify:phase32` 初版把 bootstrap 文件本身误当成 runtime
  descriptor source，导致 proof seed guard 阻塞通过。
- **Fix:** 将 guard 改为检查 `src/lib/dto/resource-ai.ts` 中的真实
  `bootstrap` URL 来源。
- **Files modified:** `scripts/verify-phase32-end-to-end.ts`
- **Verification:** `pnpm verify:phase32`
- **Committed in:** `2ce2b56`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** 两处修复都用于消除验证漂移与错误阻塞，没有扩大功能范围。

## Issues Encountered

- 当前仓库在 `main` 上已有大量无关脏改动；本计划通过精确暂存目标文件，
  避免把其他改动混入 task commits。

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- Phase 32 现在具备唯一的 canonical verification gate，可直接作为
  milestone proof close 命令。
- proof-focused regression suites 已锁住 authoring、launch、submit、recovery、
  classroom 与 inspector 的关键语义，后续 close 只需同步 planning metadata。

## Self-Check: PASSED

- FOUND: `.planning/phases/32-end-to-end-hardening-and-milestone-proof/32-03-SUMMARY.md`
- FOUND commit: `9bf37df`
- FOUND commit: `2ce2b56`

---

*Phase: 32-end-to-end-hardening-and-milestone-proof*
*Completed: 2026-05-17*
