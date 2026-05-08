---
phase: 12-classroom-launch-and-built-in-teaching-steps
plan: 06
subsystem: plugin
tags: [plugin, built-in, bootstrap, registry, dal]
requires:
  - phase: 12-classroom-launch-and-built-in-teaching-steps
    provides: built-in plugin seed records, typed built-in actions, and authoring/runtime plugin hooks
provides:
  - built-in seed manifests aligned with the shipped first-party action contract
  - built-in template resolution gated by enabled registry records and declared template actions
affects: [bootstrap-dev-db, plugin-registry, lesson-authoring, built-in-templates]
tech-stack:
  added: []
  patterns: [explicit built-in action manifests, registry-backed built-in template gating]
key-files:
  created: []
  modified:
    - scripts/bootstrap-dev-db.ts
    - src/lib/dal/plugins.ts
key-decisions:
  - "五个内置教学环节 seed manifest 直接声明 `suggestBuiltInTeachingStep` 与 `insertBuiltInTeachingStepTemplate`，避免与 registry allowlist 再次漂移。"
  - "内置模板解析只信任启用中的 built-in registry record，并要求 manifest 显式声明 template action 后再执行 hook。"
patterns-established:
  - "Built-in seed truth: bootstrap manifest actions must match `registry.ts` allowlisted first-party actions"
  - "Built-in template truth: school-scoped enabled plugin record -> template action check -> hook execution -> typed template payload"
requirements-completed: [PLUGIN-04, PLUGIN-05]
duration: 2 min
completed: 2026-05-08
---

# Phase 12 Plan 06: Built-in seed/action gap closure Summary

**内置教学环节 seed manifest 与 DAL 模板解析现在都绑定到真实的 first-party action contract 和启用中的 registry 记录。**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-08T23:03:12Z
- **Completed:** 2026-05-08T23:05:21Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- 把五个 built-in plugin 的 seed manifest 全部升级为显式声明 `suggestBuiltInTeachingStep` 与 `insertBuiltInTeachingStepTemplate`。
- 让 built-in template 解析完全依赖 school-scoped、enabled 的 registry record，而不是本地常量回退。
- 收紧 DAL 入口：缺少 template action 或 hook 未返回 typed built-in template 时，一律不产出模板 payload。

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade seeded built-in manifests to the explicit first-party action set** - `cfe5cbb` (feat)
2. **Task 2: Make built-in template resolution trust enabled registry records only** - `f6cf0e4` (feat)

## Files Created/Modified

- `scripts/bootstrap-dev-db.ts` - 将五个内置教学环节 seed manifest 的 actions 与当前 shipped allowlist 对齐。
- `src/lib/dal/plugins.ts` - 通过 enabled built-in registry record + declared template action + hook result 三重约束返回模板。

## Decisions Made

- Seed data 必须直接表达真实 first-party action vocabulary，不能再依赖旧的 `addStepSuggestion` 单动作声明。
- Built-in template resolution 不再从 `BUILT_IN_TEACHING_STEP_DEFINITIONS` 静态重建回退结果，避免绕过 admin 的启停状态。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Task 2 首次 `typecheck` 因模板组装对象重复声明 `pluginName` 失败；已在同一任务内删除重复字段并重新通过 `pnpm typecheck && pnpm exec eslint src/lib/dal/plugins.ts`。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 12-07 可以直接基于 school-enabled built-in template 列表改造 authoring quick-add，不必继续维护 UI-only built-in fallback。
- 12-09 的行为级回归测试现在可以验证 disabled built-in 不再返回模板、seeded built-ins 与 registry action contract 保持一致。

## Verification

- `pnpm run db:bootstrap:dev` ✅
- `pnpm typecheck` ✅
- `pnpm exec eslint src/lib/dal/plugins.ts` ✅

## Self-Check: PASSED

- Found file: `scripts/bootstrap-dev-db.ts`
- Found file: `src/lib/dal/plugins.ts`
- Found file: `.planning/phases/12-classroom-launch-and-built-in-teaching-steps/12-06-SUMMARY.md`
- Found commit: `cfe5cbb`
- Found commit: `f6cf0e4`
