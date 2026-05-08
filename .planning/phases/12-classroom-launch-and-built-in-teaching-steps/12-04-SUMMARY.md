---
phase: 12-classroom-launch-and-built-in-teaching-steps
plan: 04
subsystem: plugin
tags: [plugin, authoring, built-in, verifier, safe-registry]
requires:
  - phase: 12-classroom-launch-and-built-in-teaching-steps
    provides: built-in plugin seed records, launch route, and inline launch preview
provides:
  - explicit built-in first-party plugin action allowlist and typed local proposal rendering
  - first-level authoring quick-add group for five built-in teaching steps
  - phase 12 regression verifier for launch routing and built-in exposure
affects: [plugin-registry, plugin-renderer, lesson-authoring, phase-verification]
tech-stack:
  added: []
  patterns: [allowlisted first-party plugin actions, typed built-in teaching-step proposals, first-level built-in authoring quick-add]
key-files:
  created:
    - scripts/verify-phase12-launch-and-builtins.ts
  modified:
    - src/server/plugins/registry.ts
    - src/lib/dto/resource-ai.ts
    - src/lib/dal/plugins.ts
    - src/components/plugins/plugin-renderer.tsx
    - src/components/plugins/widgets/index.tsx
    - src/components/plugins/widgets/built-in-teaching-step-suggestion-widget.tsx
    - src/components/plugins/widgets/built-in-teaching-step-template-widget.tsx
    - src/components/authoring/lesson-authoring-workspace.tsx
    - package.json
key-decisions:
  - "内置教学环节插件仍然只走 allowlisted action -> local typed widget 的安全链路，不新增任意脚本执行入口。"
  - "作者编排区把内置教学环节放在 `新增步骤` 同一层级的独立分组中，保持 direct quick-add 心智模型。"
  - "Phase 12 用单独 verifier 同时守住 launch routing、内置环节曝光、管理标签与 unsafe pattern 禁止。"
patterns-established:
  - "Built-in plugin proposals: registry allowlist -> DAL hook execution -> local widget rendering only"
  - "Authoring quick-add: base step buttons and built-in teaching steps coexist in one first-level action zone"
requirements-completed: [CLASS-02, CLASS-03, CLASS-04, LESSON-03, PLUGIN-04, PLUGIN-05]
duration: 1 min
completed: 2026-05-08
---

# Phase 12 Plan 04: Built-in teaching-step plugin authoring Summary

**内置教学环节现在通过显式 allowlist 与本地 typed widget 安全落地，并在教师编排页以一层直达按钮提供五个可直接插入的教学环节。**

## Performance

- **Duration:** 1 min
- **Started:** 2026-05-08T16:16:23Z
- **Completed:** 2026-05-08T16:17:39Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- 扩展安全插件动作契约，新增 `suggestBuiltInTeachingStep` 与 `insertBuiltInTeachingStepTemplate` 两个显式 first-party allowlisted actions，并保持 proposal 全部 typed。
- 在 `LessonAuthoringWorkspace` 的 `新增步骤` 区域增加 `内置教学环节` 一级分组，直接暴露 `教师讲授`、`问卷调查`、`学生探究`、`课堂测验`、`评价` 五个动作。
- 新增 `verify:phase12` 静态回归校验，覆盖 `/teacher/launch`、预览标记、内置环节曝光、管理标签与 unsafe runtime pattern 禁止。

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend the safe first-party plugin action contract for built-in teaching steps** - `d1af191` (feat)
2. **Task 2: Expose built-in teaching steps as direct first-level authoring actions** - `01234cc` (feat)
3. **Task 3: Add a dedicated Phase 12 verifier and wire it into project scripts** - `fbbbf21` (chore)

## Files Created/Modified

- `src/server/plugins/registry.ts` - 为内置教学环节扩展显式 action allowlist、permission map 与 deterministic dispatch。
- `src/lib/dto/resource-ai.ts` - 同步扩展插件 action/proposal 类型与内置教学环节 typed payload schema。
- `src/lib/dal/plugins.ts` - 让 built-in plugin hook 继续走受控 DAL/registry 路径，并输出模板与建议结果。
- `src/components/plugins/plugin-renderer.tsx` - 继续只渲染本地 proposal widgets，不引入任意执行路径。
- `src/components/plugins/widgets/index.tsx` - 增加 built-in suggestion/template proposal 的本地分发。
- `src/components/plugins/widgets/built-in-teaching-step-suggestion-widget.tsx` - 渲染内置教学环节建议卡片。
- `src/components/plugins/widgets/built-in-teaching-step-template-widget.tsx` - 渲染内置教学环节模板卡片。
- `src/components/authoring/lesson-authoring-workspace.tsx` - 在一层 quick-add 区域提供 `内置教学环节` 分组与五个直达按钮。
- `scripts/verify-phase12-launch-and-builtins.ts` - 增加 Phase 12 专用静态回归验证脚本。
- `package.json` - 暴露 `verify:phase12` 脚本入口。

## Decisions Made

- 内置教学环节仍复用现有 declarative plugin contract，而不是绕开 registry 做 authoring 特判，以满足 threat model 对 allowlist 与 typed dispatch 的要求。
- 内置环节插入直接复用现有 `addLessonStepAction` 路径和已验证 payload，不增加 modal 或第二层 chooser，保持教师快编排节奏。
- 验证层采用静态 verifier 而非额外复杂测试基础设施，优先守住本阶段最关键的 launch/built-in 回归面。

## Deviations from Plan

None - implementation already matched the 12-04 plan at execution start, so this run completed strict verification and metadata wrap-up without redoing the existing task commits.

## Issues Encountered

- 执行开始时发现 `d1af191`、`01234cc`、`fbbbf21` 三个 12-04 task commit 已存在于当前分支，因此本次未重复改写代码，而是核验现状并补齐 SUMMARY / planning metadata，避免制造重复提交或触碰无关脏文件。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 12 的 launch route、preview、built-in plugin seed、authoring exposure 与 verifier 现在已形成闭环，可作为后续 classroom/plugin 相关改动的回归基线。
- 后续若扩展更多 first-party teaching steps，应继续沿用 `resource-ai.ts` 定义 -> `registry.ts` allowlist -> local widget/rendering 的同一安全路径。

## Self-Check: PASSED

- Found file: `scripts/verify-phase12-launch-and-builtins.ts`
- Found file: `src/server/plugins/registry.ts`
- Found file: `src/lib/dto/resource-ai.ts`
- Found file: `src/lib/dal/plugins.ts`
- Found file: `src/components/authoring/lesson-authoring-workspace.tsx`
- Found file: `package.json`
- Found commit: `d1af191`
- Found commit: `01234cc`
- Found commit: `fbbbf21`
