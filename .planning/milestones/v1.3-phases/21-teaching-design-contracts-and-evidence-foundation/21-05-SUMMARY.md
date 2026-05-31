---
phase: 21-teaching-design-contracts-and-evidence-foundation
plan: 05
subsystem: ui
tags: [teacher-editor, teaching-design, duration-metadata, vitest]
requires:
  - phase: 21-teaching-design-contracts-and-evidence-foundation
    provides: teachingDesign fallback defaults and teacher-facing editor cues
provides:
  - labeled duration metadata on every editor flow card
  - card-scoped regression coverage for explicit and legacy duration visibility
affects: [teacher-editor, phase22-orchestration, uat-regression]
tech-stack:
  added: []
  patterns: [labeled metadata slot for card durations, card-scoped semantic UI assertions]
key-files:
  created: [.planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-05-SUMMARY.md]
  modified: [src/components/authoring/lesson-authoring-workspace.tsx, src/components/authoring/lesson-authoring-workspace.test.tsx]
key-decisions:
  - "步骤卡时长必须作为独立中文标签元信息展示，而不是继续依赖右上角弱 badge。"
  - "回归测试固定用 card-scoped labeled assertions，避免被顶部总时长文案误判为通过。"
patterns-established:
  - "Editor metadata contract: per-step duration lives in a stable labeled slot with icon and non-shrinking container."
  - "UI regression contract: duration visibility is proven inside each flow card, not by global raw text search."
requirements-completed: [ORCH-01]
duration: 3 min
completed: 2026-05-13
---

# Phase 21 Plan 05: Step duration visibility summary

**教师现在能在编排器每张步骤卡中稳定看到带“预计时长”标签的分钟元信息，且回归测试会阻止它退化回弱感知 badge。**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-13T00:01:30Z
- **Completed:** 2026-05-13T00:04:39Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- 将步骤卡时长从无标签 `xx min` 小 badge 升级为带 `Clock3` 图标和“预计时长”标签的独立元信息位。
- 保持步骤卡时长继续通过 `getStepMinutes(step)` 读取 explicit `teachingDesign.estimatedMinutes` 和 legacy fallback。
- 补充 scoped UI 回归测试，覆盖 explicit、legacy fallback 与拥挤卡片场景，并保留总时长汇总验证。

## Task Commits

Each task was committed atomically:

1. **Task 1: 把步骤时间提升为明确的卡片元信息位，而不是右上角弱感知 badge** - `525faa2` (test), `df35c9c` (feat)
2. **Task 2: 补真实卡片可见性的 UI 回归测试，禁止“只有 DOM 文本存在”式假通过** - `a623a21` (test)

## Files Created/Modified

- `src/components/authoring/lesson-authoring-workspace.tsx` - 在步骤卡标题下方新增带标签的预计时长元信息位，并补上可访问分组语义。
- `src/components/authoring/lesson-authoring-workspace.test.tsx` - 用 `within()` 锁定步骤卡，验证 labeled duration metadata、拥挤卡片可见性和顶部总时长汇总。

## Decisions Made

- 时长信息继续留在步骤卡主体内容区，而不是重新放回右上角角标，以保证长标题和多 badge 场景下仍可感知。
- 测试通过 `role="group"` + `aria-label="预计时长"` 建立语义锚点，避免只靠文案字符串检索。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 仓库本身存在未跟踪的 planning/debug 与未提交 PLAN 文件。执行时只按文件精确 stage/commit，避免把无关文件带入本计划提交。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Editor 中的步骤时长可见性 gap 已闭合，Phase 22 可以直接复用该 metadata slot 承载更强的 orchestration 信息。
- 当前回归测试已能在时长再次退化成弱 badge、无标签文本或被全局汇总掩盖时直接失败。

## Self-Check: PASSED

- Verified `.planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-05-SUMMARY.md` exists.
- Verified commits `525faa2`, `df35c9c`, and `a623a21` exist in git history.

---

*Phase: 21-teaching-design-contracts-and-evidence-foundation*
*Completed: 2026-05-13*
