---
phase: 17-teacher-flow-editor-enhancement
plan: 02
subsystem: ui
tags: [teacher-editor, flow-composition, step-editor, built-in-provenance]
requires:
  - phase: 17-teacher-flow-editor-enhancement
    provides: built-in lesson step provenance and readiness/preview DTO contracts
provides:
  - integrated flow composition workspace for ordinary steps and built-in teaching-step plugins
  - built-in source badges across the flow rail and selected-step summary
  - step editor saves that preserve built-in source metadata
affects: [teacher-editor, lesson-authoring-workspace, lesson-step-editor]
tech-stack:
  added: []
  patterns: [integrated flow composer, source-aware step cards, provenance-preserving autosave]
key-files:
  created: [.planning/phases/17-teacher-flow-editor-enhancement/17-02-SUMMARY.md]
  modified:
    [src/components/authoring/lesson-authoring-workspace.tsx, src/components/authoring/lesson-authoring-workspace.test.tsx, src/components/authoring/lesson-step-editor.tsx, src/components/authoring/lesson-step-editor.test.tsx]
key-decisions:
  - "普通步骤和内置教学环节合并到同一 composer rail，避免编辑器继续分裂成资源卡片和步骤按钮两套心智模型。"
  - "流程卡片、侧边摘要和属性编辑器统一展示 builtInSource，来源信息不再只停留在服务端 DTO。"
  - "step editor 重建 payload 时显式保留 builtInSource，防止教师编辑后丢失内置环节 provenance。"
patterns-established:
  - "Integrated flow composition: ordinary steps and built-in teaching steps are inserted from one source-aware workspace rail."
  - "Provenance-safe autosave: step editor preserves built-in source metadata while still validating through lessonStepPayloadSchema."
requirements-completed: [LESSON-03, LESSON-04, LESSON-07, PLUGIN-05]
duration: 7 min
completed: 2026-05-10
---

# Phase 17 Plan 02: Integrated flow editor summary

**教师编排页现在把普通步骤和内置教学环节收敛到同一个流程编辑器工作区，并让步骤来源在流程主线、选中摘要和属性编辑器里保持一致可见。**

## Performance

- **Duration:** 7 min
- **Completed:** 2026-05-10
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- 重构 `LessonAuthoringWorkspace`，把普通步骤入口、内置教学环节入口和流程概览合并成一个 integrated flow composition 区域。
- 流程主线与右侧摘要新增 `内置环节 · ...` 来源 badge，让教师能区分普通步骤与 built-in teaching-step plugins。
- 修复 `LessonStepEditor` 保存时丢失 `builtInSource` 的问题，并在编辑器头部显示只读来源元数据。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `src/components/authoring/lesson-authoring-workspace.tsx` - 把编排区升级为 source-aware 的 integrated flow editor。
- `src/components/authoring/lesson-authoring-workspace.test.tsx` - 增加 built-in source badge 与 composer contract 回归断言。
- `src/components/authoring/lesson-step-editor.tsx` - 显示步骤来源，并在 autosave payload 中保留 `builtInSource`。
- `src/components/authoring/lesson-step-editor.test.tsx` - 覆盖 built-in source 显示与保存不丢 provenance 的回归测试。

## Decisions Made

- 组合区不再伪装成资源库，而是直接以课堂流程组件为中心，降低步骤编排心智切换成本。
- built-in provenance 统一渲染为 `内置环节 · 插件名`，避免在不同面板出现不同称呼。
- payload 重建逻辑以“保留现有 provenance + 仅编辑结构化字段”为原则，继续复用现有 `autosaveLessonStepAction`。

## Deviations from Plan

- 为保证来源元数据真正稳定，本轮额外修复了 step editor 保存时遗漏 `builtInSource` 的实际数据回归风险。

## Issues Encountered

- `lesson-authoring-workspace` 测试因为多次 render 导致重复节点，需要把唯一文本断言改成 `getAllBy...` 形式。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `17-03` 可以直接复用 `builtInSource` badge 形式与已落地的 teacher preview DTO。
- editor shell 已具备更清晰的 flow summary，可继续接入真实 preview route 而不必重做编排页结构。

## Self-Check: PASSED

- Verified `pnpm test --run src/components/authoring/lesson-authoring-workspace.test.tsx src/components/authoring/lesson-step-editor.test.tsx`

---

*Phase: 17-teacher-flow-editor-enhancement*
*Completed: 2026-05-10*
