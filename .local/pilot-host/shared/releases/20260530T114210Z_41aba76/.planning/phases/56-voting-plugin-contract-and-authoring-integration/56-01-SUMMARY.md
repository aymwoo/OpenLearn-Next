---
phase: 56-voting-plugin-contract-and-authoring-integration
plan: "01"
subsystem: ui
tags: [plugin, voting, authoring, zod, lesson-editor]
requires:
  - phase: 55-pilot-scope-and-acceptance-gate
    provides: classroom voting sample chain scope freeze and plugin-first acceptance gate
provides:
  - classroom voting built-in authoring contract on existing quiz step shell
  - school-scoped voting template visibility gate with compatibility filtering
  - focused TDD coverage for voting template insertion and filtering
affects: [phase-56-02, publish-preflight, lesson-editor]
tech-stack:
  added: []
  patterns: [built-in template contract extension, compatibility-gated authoring visibility, public-metadata-only step insertion]
key-files:
  created: [.planning/phases/56-voting-plugin-contract-and-authoring-integration/56-01-SUMMARY.md]
  modified:
    - src/lib/dto/lesson-authoring.ts
    - src/lib/dto/resource-ai.ts
    - src/lib/dal/plugins.ts
    - src/components/authoring/lesson-authoring-workspace.tsx
    - src/components/authoring/lesson-authoring-workspace.test.tsx
    - src/lib/dal/plugins.builtins.test.ts
key-decisions:
  - "课堂投票样板复用 quiz step shell，只在 step payload 上写入最小 public builtInSource 元数据。"
  - "课堂投票模板只有在 built-in、enabled、allowlisted 且 runtime contract compatible 时才出现在 editor。"
patterns-established:
  - "Built-in voting templates extend BuiltInTeachingStepTemplatePayload with a typed authoringContract instead of free JSON."
  - "Authoring insertion keeps plugin-private config out of lessonStep.payloadJson and reuses existing addLessonStepAction path."
requirements-completed: [PLUG-01, PLUG-02, CHAIN-01]
duration: 35min
completed: 2026-05-24
---

# Phase 56 Plan 01: Voting Plugin Contract & Authoring Integration Summary

**Classroom voting built-in authoring contract with compatibility-gated visibility and quiz-shell insertion in the existing lesson editor**

## Performance

- **Duration:** 35 min
- **Started:** 2026-05-24T09:49:00Z
- **Completed:** 2026-05-24T10:24:13Z
- **Tasks:** 1
- **Files modified:** 6

## Accomplishments

- 为课堂投票样板定义了正式 `authoringContract`，包含 schema、默认值和 teacher-facing summary。
- 保持三种 core step type 不变，让课堂投票复用现有 `quiz` shell 插入 lesson flow。
- 在 DAL 中为课堂投票模板补上 compatibility gate，避免不兼容插件出现在 teacher editor。
- 用 focused TDD 覆盖了可见性门禁和插入 contract。

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the voting plugin authoring contract and inject it into the existing editor workspace (RED)** - `ab8af8e` (test)
2. **Task 1: Define the voting plugin authoring contract and inject it into the existing editor workspace (GREEN)** - `311a85d` (feat)

## Files Created/Modified

- `src/lib/dto/lesson-authoring.ts` - 扩展 built-in key allowlist，纳入 `classroomVoting`。
- `src/lib/dto/resource-ai.ts` - 定义课堂投票 authoring contract、默认配置与 built-in template。
- `src/lib/dal/plugins.ts` - 为课堂投票模板增加 runtime contract compatibility 过滤。
- `src/components/authoring/lesson-authoring-workspace.tsx` - 让课堂投票沿现有 built-in 插入路径落到 `quiz` step，并只附带最小 public metadata。
- `src/components/authoring/lesson-authoring-workspace.test.tsx` - 增加课堂投票插入测试。
- `src/lib/dal/plugins.builtins.test.ts` - 增加课堂投票 contract 与 visibility gate 测试。

## Decisions Made

- 使用 `quiz` 作为课堂投票样板的最小承载 shell，避免引入第四种核心 step type。
- `authoringContract` 只挂在 built-in template contract 上，不直接写入 lesson step payload。
- step 插入时仅保留 `builtInSource` 作为 public metadata，后续 plugin-private truth 交给 extension/publish 阶段处理。
- 兼容性门禁以 built-in plugin 的 `manifestVersion === 2` 且 `governance.contractVersion === v2` 为课堂投票样板标准。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- GitNexus `detect-changes` 在当前环境不可用，因此改为手工调用链分析：`listBuiltInTeachingStepTemplates -> teacher editor page -> LessonEditorSurface -> LessonAuthoringWorkspace`，以及 `BUILT_IN_TEACHING_STEP_DEFINITIONS -> dispatchPluginAction`。
- RED 阶段初版 incompatibility 测试使用了 schema 不允许的 `contractVersion: v1`，后调整为 `manifestVersion: 1` 来表达“不兼容且可被当前 schema 接受”的真实输入。

## Known Stubs

- `src/lib/dto/resource-ai.ts` - 课堂投票默认 `initialPayload.options` 与 `defaultConfig.options` 使用 teacher-editable 示例文案（如“选项 A”）。这是 authoring 默认值，不是 runtime placeholder。

## Next Phase Readiness

- Phase 56-02 可以在现有 `authoringContract` 和 visibility gate 基础上，把 voting config 接到 publish preflight 与 snapshot freeze。
- 当前 lesson step payload 仅保存最小公开元数据，后续 publish/runtime 阶段仍需通过 DAL 接入 plugin extension truth。

## Self-Check: PASSED

- Summary file exists at `.planning/phases/56-voting-plugin-contract-and-authoring-integration/56-01-SUMMARY.md`
- Referenced commits `ab8af8e` and `311a85d` exist in git log

---
*Phase: 56-voting-plugin-contract-and-authoring-integration*
*Completed: 2026-05-24*
