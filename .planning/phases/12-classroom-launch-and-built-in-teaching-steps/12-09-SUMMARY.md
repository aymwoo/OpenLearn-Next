---
phase: 12-classroom-launch-and-built-in-teaching-steps
plan: 09
subsystem: testing
tags: [phase12, vitest, verifier, plugins, classroom]
requires:
  - phase: 12-05
    provides: school-scoped launch DTO and session-aware classroom redirect behavior
  - phase: 12-06
    provides: enabled built-in template resolution through registry-backed plugin hooks
  - phase: 12-07
    provides: school-enabled built-in quick-add visibility in the authoring workspace
  - phase: 12-08
    provides: marketplace visibility and settings regression surface for built-in plugins
provides:
  - behavior-first Phase 12 verifier that runs launch, built-in, authoring, and marketplace regressions
  - executable regression tests for school scope, session redirect, disabled built-in hiding, and seeded built-in hook execution
affects: [phase-12-verification, release-gates, classroom-launch, built-in-plugins]
tech-stack:
  added: []
  patterns: [behavior-first release verification, verifier-owned targeted vitest suites]
key-files:
  created:
    - src/lib/dal/plugins.builtins.test.ts
    - src/components/authoring/lesson-authoring-workspace.test.tsx
  modified:
    - src/lib/dal/classroom.test.ts
    - src/components/classroom/classroom-launch-panel.test.tsx
    - scripts/verify-phase12-launch-and-builtins.ts
key-decisions:
  - "将 Phase 12 release gate 的主证明面切到定向行为测试，而不是继续依赖源码字符串命中。"
  - "verify:phase12 同时保留 unsafe pattern 静态检查与 required-file 守卫，但任何成功结论都必须建立在目标 Vitest 回归套件通过之上。"
patterns-established:
  - "Pattern: 阶段 verifier 负责执行最小但真实的行为回归套件，而不是只验证文件存在或 token 命中。"
  - "Pattern: built-in plugin 回归覆盖必须同时证明 enabled hook execution 与 disabled visibility 两端合同。"
requirements-completed: [CLASS-01, CLASS-07, PLUGIN-04, PLUGIN-05]
duration: 12 min
completed: 2026-05-09
---

# Phase 12 Plan 09: Behavior-first Phase 12 verification Summary

**用真实 Vitest 回归套件替换 Phase 12 的浅层字符串校验，锁定 classroom launch、built-in hook、authoring visibility 与 marketplace discoverability。**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-09T00:02:33Z
- **Completed:** 2026-05-09T00:14:41Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- 为 school scope、session redirect、disabled built-in 隐藏、seeded built-in hook 执行补齐可执行行为测试。
- 新增 `src/lib/dal/plugins.builtins.test.ts`，证明只有启用且声明 template action 的 built-in plugin 才会返回模板提案。
- 重写 `verify:phase12`，让阶段校验在输出成功前必须执行真实回归套件，并继续拦截 `eval(`、`dangerouslySetInnerHTML`、`<script` 等 unsafe pattern。

## Task Commits

Each task was committed atomically:

1. **Task 1: Add behavior-level regression tests for every failed Phase 12 truth** - `6c87ed1` (test)
2. **Task 2: Make `verify:phase12` execute the real regression suite and block shallow passes** - `3fa5cb3` (fix)

## Files Created/Modified

- `src/lib/dal/classroom.test.ts` - 用可执行 DTO 行为断言替换 launch school scope 的浅层证明。
- `src/components/classroom/classroom-launch-panel.test.tsx` - 锁定 launch 成功后跳转到精确 `/classroom?sessionId=` 运行台。
- `src/lib/dal/plugins.builtins.test.ts` - 覆盖 enabled hook execution、disabled built-in、缺失 template action 三类 built-in 模板回归。
- `src/components/authoring/lesson-authoring-workspace.test.tsx` - 证明 authoring quick-add 只显示注入的 enabled built-in templates。
- `scripts/verify-phase12-launch-and-builtins.ts` - 运行真实回归套件并保留 unsafe pattern 与 required-file 守卫。

## Decisions Made

- 将 Phase 12 verifier 的主职责定义为执行“最小但真实”的回归测试集合，而不是继续把源码 token 当作完成证据。
- 把 settings marketplace 回归纳入 `verify:phase12`，确保 built-in plugin visibility 合同和 launch/built-in 主链路一起受 release gate 保护。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Task 1 首轮测试失败，原因是测试夹具缺少 `PluginManifestSchema` 要求的 `id` 字段，且 authoring spec 使用了当前仓库未注入的 `toBeInTheDocument` matcher；补齐 fixture 并改为 Vitest 原生断言后回归通过。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 12 的 release gate 现在会在 launch routing、seeded built-in hook、authoring enabled visibility 或 settings marketplace 回归时直接失败。
- 当前阶段全部 9 个计划已具备 summary 与行为级验证护栏，可进入后续 roadmap 工作。

## Self-Check: PASSED
