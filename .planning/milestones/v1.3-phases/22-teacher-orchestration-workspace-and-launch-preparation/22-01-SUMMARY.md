---
phase: 22-teacher-orchestration-workspace-and-launch-preparation
plan: 01
subsystem: teacher-editor
tags: [lesson-authoring, teacher-editor, launch-preparation, dto, dal]
requires:
  - phase: 17-teacher-flow-editor-enhancement
    provides: teacher-owned editor DTOs, publish readiness wiring, editor shell boundaries
  - phase: 21-teaching-design-contracts-and-evidence-foundation
    provides: teaching-design status markers, evidence expectation contract, published-snapshot launch preview foundation
provides:
  - lesson-side preparationSummary contract on LessonEditorDTO
  - server-owned launch-preparation grading inside getLessonEditorDTO
  - editor-side preparation summary UI and /teacher/launch handoff
affects: [teacher-editor, teacher-launch-handoff, lesson-authoring-dal]
tech-stack:
  added: []
  patterns: [typed launch-preparation summary, lesson-side readiness grading, editor-to-launch handoff]
key-files:
  created: [.planning/phases/22-teacher-orchestration-workspace-and-launch-preparation/22-01-SUMMARY.md]
  modified: [src/lib/dto/lesson-authoring.ts, src/lib/dal/lesson-authoring.ts, src/lib/dal/lesson-authoring.test.ts, src/components/authoring/authoring-status-panel.tsx, src/components/authoring/authoring-status-panel.test.tsx, src/components/authoring/lesson-editor-header-actions.tsx, src/components/authoring/lesson-editor-header-actions.test.tsx, src/components/surfaces/lesson-editor-surface.tsx, src/components/surfaces/lesson-editor-surface.test.tsx]
key-decisions:
  - "editor 侧 preparation summary 直接挂在 LessonEditorDTO 上，不发明第二套 launch/readiness truth。"
  - "开课阻断项沿用现有 publish readiness blockers；teaching-design/material/evidence 缺口只进入 需关注/建议完善。"
  - "editor 只新增 /teacher/launch handoff，不直接创建 classroom session，也不复制 launch workspace。"
patterns-established:
  - "Preparation summary grading: publish blockers map to blockingIssues, authored teaching-design gaps map to attention/advisory buckets, and launch handoff stays read-only."
  - "Editor handoff pattern: authoring shell keeps preview/save/publish while exposing a focused /teacher/launch cue."
requirements-completed: [ORCH-02, ORCH-03]
duration: 1 session
completed: 2026-05-13
---

# Phase 22 Plan 01: Lesson-side launch preparation summary

**`/teacher/editor` 现在已经能直接展示 lesson-side 开课前摘要，并通过同一套服务端 DTO 为后续 `/teacher/launch` orchestration workspace 提供稳定上游事实。**

## Performance

- **Duration:** 1 session
- **Completed:** 2026-05-13
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- 为 `LessonEditorDTO` 增加 `preparationSummary`，明确输出 `activeStepCount`、`totalEstimatedMinutes`、`materialCueCount`、`evidenceReadyStepCount`、`launchHref` 以及 `blockingIssues / attentionIssues / advisoryIssues`。
- 在 `getLessonEditorDTO()` 内基于现有 publish readiness、原始 authored teaching design/material/evidence facts 和 hydrated teaching-design markers 计算 lesson-side 开课前摘要。
- 更新 editor 侧 `AuthoringStatusPanel`、`LessonEditorHeaderActions`、`LessonEditorSurface`，在不破坏 `courseId + lessonId` 边界和现有 preview/save/publish 路径的前提下，增加 `开课前摘要` 和 `/teacher/launch` handoff。

## Files Created/Modified

- `src/lib/dto/lesson-authoring.ts` - 新增 `LessonPreparationIssueDTOSchema`、`LessonPreparationSummaryDTOSchema` 与 `LessonEditorDTO.preparationSummary`。
- `src/lib/dal/lesson-authoring.ts` - 新增 lesson-side launch preparation summary 聚合与分桶逻辑，并保持 teacher-owned read path 不变。
- `src/lib/dal/lesson-authoring.test.ts` - 增加 preparation summary 计数和 `阻断项 / 需关注 / 建议完善` 分桶回归。
- `src/components/authoring/authoring-status-panel.tsx` - 新增开课前摘要 UI，显式渲染三层分桶。
- `src/components/authoring/authoring-status-panel.test.tsx` - 增加 preparation summary 面板断言。
- `src/components/authoring/lesson-editor-header-actions.tsx` - 新增 `开课准备` handoff，保留原有 `预览课堂` / `发布课时`。
- `src/components/authoring/lesson-editor-header-actions.test.tsx` - 验证 `/teacher/launch` handoff 与原动作共存。
- `src/components/surfaces/lesson-editor-surface.tsx` - 在 editor header 加入 preparation 状态摘要文案。
- `src/components/surfaces/lesson-editor-surface.test.tsx` - 补充 surface 层字符串回归。

## Decisions Made

- `blockingIssues` 不扩张为“所有准备缺口”，继续只承接真实会阻断发布/开课准备的 lesson facts。
- `evidenceReadyStepCount` 只统计作者显式提供过 evidence prompt 的步骤，不把 fallback 默认值误判为“采证已就绪”。
- `TEACHING_DESIGN_NEEDS_REFINEMENT` 与 `TEACHING_DESIGN_INFERRED` 分离处理：partial authored design 进 `需关注`，纯默认推断才进 `建议完善`。

## Verification

- `pnpm test --run src/lib/dal/lesson-authoring.test.ts src/components/authoring/authoring-status-panel.test.tsx src/components/authoring/lesson-editor-header-actions.test.tsx src/components/surfaces/lesson-editor-surface.test.tsx`

## Deviations from Plan

- 没有改动 `/teacher/launch` 页面或 `classroom` DTO；本计划只完成 lesson-side truth 与 editor handoff。
- 未更新 `/.planning/STATE.md`，因为该文件已存在本轮外部脏改且 frontmatter/body 先前就不一致，避免把本计划范围扩大到 planning 状态修复。

## Next Phase Readiness

- `/teacher/launch` 后续可以直接消费 lesson-side `preparationSummary` 的分桶语义，与 run sheet/roster summary 合并成 orchestration workspace。
- editor 端已经具备清晰 handoff 和非阻断准备提示，可以继续进入 `22-02` 的 launch workspace 改造。

## Self-Check: PASSED

- Verified `.planning/phases/22-teacher-orchestration-workspace-and-launch-preparation/22-01-SUMMARY.md` exists.
- Verified targeted Phase 22-01 Vitest suites pass after the final preparation summary grading fix.

---

*Phase: 22-teacher-orchestration-workspace-and-launch-preparation*
*Completed: 2026-05-13*
