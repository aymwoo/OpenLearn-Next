---
phase: 22-teacher-orchestration-workspace-and-launch-preparation
plan: 02
subsystem: teacher-launch
tags: [classroom, teacher-launch, run-sheet, readiness, orchestration]
requires:
  - phase: 21-teaching-design-contracts-and-evidence-foundation
    provides: published-snapshot launch preview, teaching-design fallback markers, evidence summary contract
  - phase: 22-teacher-orchestration-workspace-and-launch-preparation
    plan: 01
    provides: lesson-side preparation summary semantics and editor-to-launch handoff
provides:
  - classroom-side orchestration workspace DTO contract
  - roster summary and graded launch readiness on published lesson options
  - three-part /teacher/launch workspace with run sheet as the main stage
affects: [teacher-launch, classroom-runtime-entry, published-snapshot-launch]
tech-stack:
  added: []
  patterns: [launch workspace DTO aggregation, run-sheet-first launch UI, narrow launch blockers]
key-files:
  created: [.planning/phases/22-teacher-orchestration-workspace-and-launch-preparation/22-02-SUMMARY.md]
  modified: [src/lib/dto/classroom.ts, src/lib/dal/classroom.ts, src/lib/dal/classroom.test.ts, src/components/classroom/classroom-launch-preview.tsx, src/components/classroom/classroom-launch-panel.tsx, src/components/classroom/classroom-launch-panel.test.tsx, src/components/surfaces/classroom-launch-surface.tsx]
key-decisions:
  - "launch workspace 继续只读 published snapshot；不回退到 draft lesson，也不新增 session-specific launch config。"
  - "硬阻断只收敛到没有可启动整班名册；默认推断、待完善、材料和采证缺口全部保持非阻断。"
  - "名册在本计划只做整班摘要，不出现排除学生、子集启动或多班联合启动控件。"
patterns-established:
  - "Launch workspace assembly: getClassroomConsoleDTO combines published lesson snapshot, linked class roster counts, run sheet preview, and readiness grading into one server-owned contract."
  - "Run-sheet-first launch UI: launch controls, readiness panel, and live-session recovery stay in one teacher shell while preserving the original lessonId/publishedVersionId/classId action contract."
requirements-completed: [ORCH-02, ORCH-03]
duration: 1 session
completed: 2026-05-13
---

# Phase 22 Plan 02: Teacher launch orchestration workspace

**`/teacher/launch` 现在已经从“选课时 + 选班级”的薄入口升级为三段式 orchestration workspace：主舞台展示 class-facing run sheet，次级区展示整班摘要与 readiness 分层，同时保留 live classroom 恢复区为次级任务。**

## Performance

- **Duration:** 1 session
- **Completed:** 2026-05-13
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- 为 `ClassroomConsoleDTO` 扩展了 `launchReadiness`、`rosterSummary` 和 richer `classes` contract，使 `/teacher/launch` 能直接消费整班摘要与准备分层。
- 在 `getClassroomConsoleDTO()` 中新增 launch workspace 聚合逻辑：基于 published lesson snapshot、linked classes、student roster counts 和 existing launch preview 生成 class-facing run sheet 与 graded readiness。
- 重构 `ClassroomLaunchPanel`、`ClassroomLaunchPreview`、`ClassroomLaunchSurface`，让 run sheet 成为主舞台，同时保留原有 `lessonId + publishedVersionId + classId` 提交链路与 live session recovery 次级区。

## Files Created/Modified

- `src/lib/dto/classroom.ts` - 新增 launch readiness issue/bucket、roster summary 和 richer class option DTO。
- `src/lib/dal/classroom.ts` - 新增 `buildLaunchRosterSummary()`、`buildLaunchReadiness()`，并在 `getClassroomConsoleDTO()` 内聚合整班摘要与分层 readiness。
- `src/lib/dal/classroom.test.ts` - 覆盖 narrow blockers、published-snapshot-only preview 和 non-blocking preparation cues。
- `src/components/classroom/classroom-launch-preview.tsx` - 把 launch preview 升级成主舞台 run sheet，正式展示节奏、材料提示与采证提醒。
- `src/components/classroom/classroom-launch-panel.tsx` - 增加整班摘要与 `阻断项 / 需关注 / 建议完善` readiness 面板，同时保持原有 launch action contract。
- `src/components/classroom/classroom-launch-panel.test.tsx` - 增加 readiness labels、publishedVersionId 提交与 inferred cues 非阻断的回归测试。
- `src/components/surfaces/classroom-launch-surface.tsx` - 调整 hero/description，使 launch workspace 与次级 live recovery 的层级更清晰。

## Decisions Made

- `buildLaunchPreview(snapshot, lesson.id, lesson.title)` 继续作为 run sheet 的唯一事实来源，不引入 draft lesson 或 client-side heuristics。
- `classCount` hero 指标改为只统计有学生的整班名册，避免把 0 人名册误报为“可用班级”。
- `TEACHING_DESIGN_NEEDS_REFINEMENT` 只对应 `needs-refinement` 步骤，`TEACHING_DESIGN_INFERRED` 单独对应纯默认推断步骤，避免重复分桶。

## Verification

- `pnpm test --run src/lib/dal/classroom.test.ts src/components/classroom/classroom-launch-panel.test.tsx`

## Deviations from Plan

- 没有新增独立的 `/teacher/launch` route 或 shell；所有改动继续收敛在现有 teacher shell 内。
- 未更新 `/.planning/STATE.md`，因为该文件已存在外部脏改且 frontmatter/body 仍不一致，避免把本计划范围扩大到 planning state repair。

## Next Phase Readiness

- `/teacher/editor` 与 `/teacher/launch` 现在已经通过 lesson-side 和 classroom-side readiness contract 打通，后续 `22-03` 可以专注回归验证、route boundary 守卫和 verifier。
- launch workspace 的 blocker / attention / advisory 语义已经稳定，可直接进入 phase verifier 与跨页回归测试收口。

## Self-Check: PASSED

- Verified `.planning/phases/22-teacher-orchestration-workspace-and-launch-preparation/22-02-SUMMARY.md` exists.
- Verified targeted Phase 22-02 Vitest suites pass after final readiness-grading and copy cleanup.

---

*Phase: 22-teacher-orchestration-workspace-and-launch-preparation*
*Completed: 2026-05-13*
