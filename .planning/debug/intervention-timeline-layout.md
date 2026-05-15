---
status: resolved
trigger: "Phase 21 UAT Test 5: teacher records intervention via recordClassroomInterventionAction, sees it in classroomTimeline with teacher-only visibility, but the interface layout becomes messy/unusable. Goal: find_root_cause_only."
created: 2026-05-13T00:00:00Z
updated: 2026-05-14T15:10:00Z
---

## Current Focus

hypothesis: 已关闭。根因判断被后续 Phase 21 实现验证为正确。
test: 对照 `.planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-04-SUMMARY.md` 与当前 classroom runtime 组件，确认独立 timeline panel 已落地。
expecting: debug 记录应转为 resolved，而不是继续保留 investigating。
next_action: none

## Symptoms

expected: Teacher records an intervention and the timeline/UI presentation remains clear and usable.
actual: 用户报告界面布局混乱。
errors: None reported.
reproduction: UAT Test 5 in Phase 21.
started: Discovered during UAT.

## Eliminated

## Evidence

- timestamp: 2026-05-13T00:03:00Z
  checked: Phase 21 UAT gap and STATE context
  found: Test 5 says intervention write succeeds and appears in classroomTimeline with teacher-only visibility; issue is cosmetic "界面布局混乱" rather than data failure.
  implication: Root cause is probably in presentation/layout code, not permission, write-path, or missing timeline persistence.

- timestamp: 2026-05-13T00:04:00Z
  checked: .planning/debug/knowledge-base.md
  found: Knowledge base file does not exist.
  implication: No prior known-pattern session to prioritize.

- timestamp: 2026-05-13T00:08:00Z
  checked: src/actions/classroom-actions.ts and src/lib/dal/classroom.ts
  found: recordClassroomInterventionAction simply validates and writes a classroomTimeline entry with payload { title, body, targetScope, visibility: "teacher-only" }; the write path has no presentation logic.
  implication: The cosmetic bug is downstream in snapshot DTO consumption/rendering, not in the Server Action or DAL write itself.

- timestamp: 2026-05-13T00:09:00Z
  checked: src/components/surfaces/classroom-console-surface.tsx, src/components/classroom/classroom-control-panel.tsx, src/components/classroom/classroom-roster-panel.tsx
  found: These components render hero metrics, classroom controls, step flow, markdown broadcast, and roster only; no classroomTimeline or intervention form is present there.
  implication: The reported layout issue must come from another classroom runtime component that was not yet inspected.

- timestamp: 2026-05-13T00:12:00Z
  checked: src/lib/dto/classroom.ts and src/lib/dal/classroom.ts#getClassroomSnapshotDTO
  found: Although ClassroomTimelineEntryDTOSchema exists, ClassroomSnapshotDTOSchema has no timeline field, and getClassroomSnapshotDTO never queries classroomTimeline/intervention rows.
  implication: The teacher runtime UI has no typed read model for rendering intervention timeline entries in a stable layout.

- timestamp: 2026-05-13T00:14:00Z
  checked: src/app/(classroom)/classroom/page.tsx plus repo-wide grep for classroom timeline/intervention rendering
  found: The /classroom page passes only snapshot + consoleData into ClassroomConsoleSurface, and repo-wide search finds no component that consumes ClassroomTimelineEntryDTO or renders intervention_noted entries.
  implication: Phase 21 persisted intervention data but never integrated a dedicated teacher timeline surface; any visible intervention presentation is necessarily improvised outside a proper layout contract.

## Resolution

root_cause:
  Phase 21 only implemented durable intervention persistence, but did not add a classroom timeline read path or a dedicated runtime UI section/component for intervention entries. The teacher /classroom surface still renders only hero metrics, controls, step flow, markdown broadcast, and roster. Because ClassroomSnapshotDTO has no timeline field and no component consumes ClassroomTimelineEntryDTO, intervention content lacks a stable bounded layout contract, which makes the current presentation appear messy when surfaced in the live classroom UI.
fix:
  Add a typed classroom timeline read model to getClassroomSnapshotDTO (or a dedicated teacher runtime DTO), then render interventions inside a dedicated timeline panel/card with explicit responsive width, wrapping, and entry sublayout instead of ad hoc insertion into existing control/roster sections.
verification:
  后续 Phase 21-04 已按该方向落地 typed teacher timeline read model 与独立 `ClassroomTimelinePanel`。当前 `src/lib/dal/classroom.ts` 已暴露 `teacherTimeline`，`src/components/classroom/classroom-control-panel.tsx` 已在右侧次级栏渲染 timeline panel。
files_changed:
  - src/lib/dal/classroom.ts
  - src/components/classroom/classroom-timeline-panel.tsx
  - src/components/classroom/classroom-control-panel.tsx
