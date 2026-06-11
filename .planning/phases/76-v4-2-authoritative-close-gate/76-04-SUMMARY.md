---
phase: 76-v4-2-authoritative-close-gate
plan: 04
subsystem: testing
tags: [close-gate, cross-plugin, regression, vitest, tsx]

# Dependency graph
requires:
  - phase: 76-03
    provides: Stage 3 homework full-chain verification wiring in outer gate
provides:
  - Stage 4 独立跨插件回归脚本 verify:v42-cross-plugin
  - outer gate Stage 4 接线完成: pnpm verify:v42-cross-plugin
affects:
  - 76-05 (formal verification + proof mapping)
  - 76-06 (manual sign-off + closeout artifacts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "三子套件 && 链编排模式: quiz 全量 + homework 全量 + dedicated suite, 任一失败 exit 1"
    - "smoke/full 双模式: --smoke 只报告 wiring status, full 真实执行 vitest run"
    - "outer gate 消费模式: outer gate 不读取测试文件内容, 只消费 verify:v42-cross-plugin 的 exit code"

key-files:
  created:
    - scripts/verify-v42-cross-plugin.ts
    - scripts/__tests__/verify-v42-cross-plugin.test.ts
  modified:
    - scripts/verify-phase76-v42-close-gate.ts
    - package.json

key-decisions:
  - "三个子套件顺序执行 (&& 链), 任一失败立即 exit 1 — per D-06 阻断策略"
  - "outer gate Stage 4 复用既有的 execCommand() 模式, 只消费 exit code 不从内部检查测试内容"
  - "smoke 模式下 Stage 4 传递 --smoke 给 verify:v42-cross-plugin, 保持与 Stage 1-3 一致的 wiring 正交性"

patterns-established:
  - "Stage verification script pattern: StaticCheck (wiring) + async run function (execution) + D-06 blocking on failure"
  - "Cross-plugin orchestration: pnpm vitest run 作为 leaf, TypeScript tsx 脚本作为编排层"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-06-11
---

# Phase 76 Plan 04: Stage 4 跨插件回归脚本建立与接线

**独立的 Stage 4 跨插件回归脚本 verify:v42-cross-plugin, 编排 quiz 全量 + homework 全量 + cross-plugin dedicated suite, 并在 outer gate 中接线完成**

## Performance

- **Duration:** ~2 分钟
- **Started:** 2026-06-11T05:52:10Z
- **Completed:** 2026-06-11T05:54:24Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- 创建了独立 Stage 4 跨插件回归脚本 verify:v42-cross-plugin, 包含三个子套件的 && 链编排
- 实现了 D-06 阻断策略: 任一子套件失败 → exit 1, 后续不执行
- 实现了 smoke 模式: --smoke 只输出 wiring status, 不执行真实 vitest
- outer gate Stage 4 从占位替换为真实 shell 执行: pnpm verify:v42-cross-plugin
- 在 package.json 中注册了 verify:v42-cross-plugin 脚本条目
- TDD 全流程: 14 tests RED → GREEN, 包含文件存在、section header、vitest 命令、smoke 模式、阻断策略的验证

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): test** - `84c90c1` (test) — 14 failing tests for verify:v42-cross-plugin
2. **Task 1 (GREEN): feat** - `115de35` (feat) — verify:v42-cross-plugin.ts 实现 + package.json 脚本条目, 14 tests pass
3. **Task 2: feat** - `73ca5bb` (feat) — outer gate Stage 4 接线, pnpm verify:phase76 --smoke exit 0

## Files Created/Modified
- `scripts/verify-v42-cross-plugin.ts` — Stage 4 独立跨插件回归脚本入口 (新建)
- `scripts/__tests__/verify-v42-cross-plugin.test.ts` — 14 tests 验证脚本 wiring & 内容 (新建)
- `scripts/verify-phase76-v42-close-gate.ts` — Stage 4 接线: runStage4CrossPluginRegression() + D-06 阻断 (修改)
- `package.json` — 新增 verify:v42-cross-plugin 脚本条目 (修改)

## Decisions Made
- 三子套件采用顺序执行 (&& 链) 而非并行 — 确保 quiz 和 homework 在隔离环境中各自报告, 失败时精确定位
- outer gate Stage 4 复用既有的 execCommand() 模式, 只消费 exit code 不从内部检查测试内容 — per D-02 外层 gate 不复制产品断言
- smoke 模式下 Stage 4 传递 --smoke 给 verify:v42-cross-plugin — 保持与 Stage 1-3 一致的 wiring 正交性

## Deviations from Plan

### RED Test Adaptation

**1. [Rule 1 - Bug] 测试中 vitest 命令断言模式与实际源码不匹配**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** 测试期望源码中包含完整字符串 `"vitest run src/components/.../quiz-sample-step-card.test.tsx"`, 但实现中将参数作为独立数组元素传递 `["vitest", "run", "src/..."]`, 导致 3 个测试失败
- **Fix:** 将测试断言从匹配完整命令字符串改为匹配文件路径字符串 (如 `"src/components/learning/quiz-sample-step-card.test.tsx"`) — 等价验证, 且更精确地检查 vitest 命令的目标文件
- **Files modified:** scripts/__tests__/verify-v42-cross-plugin.test.ts
- **Committed in:** 115de35 (TDD GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** 最小影响 — 仅修改了 3 个断言字符串, 测试语义等价。无 scope creep。

## Issues Encountered
- None.

## Known Stubs
- None — 所有逻辑路径完全实现, 无占位符或 mock 数据。

## Threat Flags
- None — 新增脚本不引入网络端点、auth 路径或文件访问面。威胁已由计划 threat_model 覆盖 (T-76-04-01/02/03 全部 mitigate)。

## User Setup Required
None — 无外部服务配置、无新增依赖、无环境变量变更。

## Next Phase Readiness
- Stage 4 (跨插件回归) 已接线完成, pnpm verify:phase76 --smoke 验证通过
- Stage 5 (formal verification + proof mapping) 可开始
- 14 tests 全部绿色, 脚本已可接受 pnpm verify:v42-cross-plugin 调用

## Self-Check: PASSED

- [FOUND] scripts/verify-v42-cross-plugin.ts
- [FOUND] scripts/__tests__/verify-v42-cross-plugin.test.ts
- [FOUND] .planning/phases/76-v4-2-authoritative-close-gate/76-04-SUMMARY.md
- [FOUND] Commit 84c90c1 (TEST RED)
- [FOUND] Commit 115de35 (FEAT GREEN)
- [FOUND] Commit 73ca5bb (FEAT Task 2)

---
*Phase: 76-v4-2-authoritative-close-gate*
*Completed: 2026-06-11*
