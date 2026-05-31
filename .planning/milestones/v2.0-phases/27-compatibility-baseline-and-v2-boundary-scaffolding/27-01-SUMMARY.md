---
phase: 27-compatibility-baseline-and-v2-boundary-scaffolding
plan: 01
subsystem: testing
tags: [compatibility, runtime-platform, vitest, verifier, classroom]
requires:
  - phase: 26-cross-session-trends-and-stitch-productization
    provides: teacher launch classroom player baseline and existing regression posture
provides:
  - focused route regressions for editor launch classroom and player
  - canonical verify:phase27 compatibility gate
  - refreshed legacy verifier assertions aligned to current route contracts
affects: [phase-27, phase-28, runtime-platform, compatibility-gates]
tech-stack:
  added: []
  patterns: [composed phase verifier, focused route regressions, fail-loud boundary guards]
key-files:
  created:
    - scripts/verify-phase27-runtime-platform.ts
    - src/app/(teacher)/teacher/launch/page.test.tsx
    - src/app/(student)/student/player/page.test.tsx
  modified:
    - package.json
    - scripts/verify-phase3-authoring.ts
    - scripts/verify-phase5-classroom.ts
    - src/app/(teacher)/teacher/editor/page.test.tsx
    - src/app/(classroom)/classroom/page.test.tsx
key-decisions:
  - "verify:phase27 采用组合旧 verifier 加 Phase 27 静态 guards 与 focused route tests 的模式。"
  - "兼容回归优先锁住 editor 的 courseId/lessonId、launch published snapshot、classroom sessionId 分支与 player shell/personal split。"
patterns-established:
  - "Pattern: canonical phase gate composes legacy verifiers plus phase-specific static guards and focused Vitest suites."
  - "Pattern: route compatibility tests use DTO or loader mocks and explicit guardrail assertions instead of prose or snapshot-only checks."
requirements-completed: [SAFE-01]
duration: 4 min
completed: 2026-05-15
---

# Phase 27 Plan 01: Compatibility baseline summary

**冻结 editor、launch、classroom、player 四条主链兼容语义，并交付单一 `verify:phase27` 安全门。**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-15T15:02:37Z
- **Completed:** 2026-05-15T15:08:39Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 为 `/teacher/editor`、`/teacher/launch`、`/classroom`、`/student/player`
  补齐 focused compatibility regressions，锁住关键 guardrail。
- 新增 `scripts/verify-phase27-runtime-platform.ts`，把旧
  `verify:phase3/4/5`、Phase 27 静态 guards 与 focused route tests 收束成单一入口。
- 修正已漂移的 Phase 3 与 Phase 5 verifier 断言，使 compatibility gate
  基于当前真实 contract fail loudly。

## Task Commits

Each task was committed atomically:

1. **Task 1: 为四条课堂主链补 focused compatibility regressions** - `3c6c923`
   (test)
2. **Task 2: 组装 canonical `verify:phase27` compatibility gate** - `84b1cd3`
   (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/app/(teacher)/teacher/editor/page.test.tsx` - 锁住 editor 的
  `courseId + lessonId` 入口约束与 scoped pair 行为。
- `src/app/(teacher)/teacher/launch/page.test.tsx` - 锁住 launch 继续只消费
  published snapshot console DTO，不引入 runtime host 新入口。
- `src/app/(classroom)/classroom/page.test.tsx` - 锁住 `/classroom` 以
  `sessionId` 驱动 live snapshot、ended recap 与 same-route student detail。
- `src/app/(student)/student/player/page.test.tsx` - 锁住 player 的
  shell/personal split、locked/unlocked copy 与 resume 优先级。
- `scripts/verify-phase27-runtime-platform.ts` - 实现 canonical
  compatibility gate，组合旧 verifier、新静态检查与 focused route tests。
- `scripts/verify-phase3-authoring.ts` - 对齐当前 editor/auth contract，避免旧静态
  断言误报。
- `scripts/verify-phase5-classroom.ts` - 对齐当前 classroom/player UI contract，避免旧
  静态断言误报。
- `package.json` - 注册 `verify:phase27` 脚本入口。

## Decisions Made

- `verify:phase27` 继续沿用仓库既有 `verify:phaseN` 脚本模式，不新增平行 gate
  机制。
- 兼容回归优先使用结构化断言、mock loader 行为与源码 contract 检查，不用 prose
  checklist 或 snapshot-only gating。
- 旧 verifier 若已与当前真实 contract 漂移，先最小修正旧 gate，再把它们纳入
  Phase 27 canonical verifier。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `pnpm test --run` 被 build approval gate 阻断**
- **Found during:** Task 1 verification
- **Issue:** `pnpm test --run ...` 在执行前触发 pnpm install/check，因
  ignored builds gate 中断，无法进入真实 Vitest。
- **Fix:** 改用 `pnpm exec vitest --run ...` 执行同一组回归文件，保持验证面不变。
- **Files modified:** None
- **Verification:** `pnpm exec vitest --run src/app/(teacher)/teacher/editor/page.test.tsx src/app/(teacher)/teacher/launch/page.test.tsx src/app/(classroom)/classroom/page.test.tsx src/app/(student)/student/player/page.test.tsx`
- **Committed in:** `3c6c923` (verification path only)

**2. [Rule 1 - Bug] 修正已漂移的 Phase 3 / Phase 5 verifier 静态断言**
- **Found during:** Task 2 verification
- **Issue:** 旧 verifier 仍检查已被后续 phase 合法更新的 copy 与按钮 contract，导致组合 gate 误报失败。
- **Fix:** 将 Phase 3 断言对齐到当前 editor workspace/auth contract，将 Phase 5
  断言对齐到当前 classroom/player UI contract。
- **Files modified:** `scripts/verify-phase3-authoring.ts`, `scripts/verify-phase5-classroom.ts`
- **Verification:** `pnpm verify:phase3 && pnpm verify:phase5 && pnpm verify:phase27`
- **Committed in:** `84b1cd3`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** 都是为让 compatibility gate 对当前真实基线 fail loudly，未扩展
范围。

## Issues Encountered

- `pnpm test --run` 在当前仓库会被 build approval gate 拦截，不能直接作为 focused
  suite 的执行入口。
- 旧 phase verifier 存在少量静态字符串漂移，若不修正会让 Phase 27 canonical gate
  无法真实反映当前兼容状态。

## Authentication Gates

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 后续 V2 phases 可以直接运行 `pnpm verify:phase27` 守住当前课堂产品主链。
- runtime-platform boundary、contracts purity、default-only seams 与 host action guard
  posture 已被纳入同一 compatibility gate。

## Self-Check: PASSED

- FOUND: `.planning/phases/27-compatibility-baseline-and-v2-boundary-scaffolding/27-01-SUMMARY.md`
- FOUND: `3c6c923`
- FOUND: `84b1cd3`
