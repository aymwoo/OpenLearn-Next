---
status: diagnosed
phase: 21-teaching-design-contracts-and-evidence-foundation
source: 21-01-SUMMARY.md, 21-02-SUMMARY.md, 21-03-SUMMARY.md
started: 2026-05-13T15:47:00Z
updated: 2026-05-12T23:12:04Z
---

## Current Test

[testing complete]

## Tests

### 1. Editor shows teaching design contract
expected: Teacher opens /teacher/editor and edits a content/task/quiz step. Step form shows teachingDesign fields: activityIntent, estimatedMinutes, activityMode, evidenceExpectation.
result: blocked
blocked_by: ui-limitation
reason: "Step editing modal doesn't have pagination, can't navigate to teaching design fields"

### 2. Launch preview shows structured teaching intent
expected: Teacher opens /teacher/launch, selects a lesson. Launch preview shows activityIntent, activityMode, estimatedMinutes, evidenceSummary for each step.
result: pass

### 3. Legacy lesson shows fallback markers
expected: Open a lesson that existed before Phase 21 (no explicit teachingDesign). In editor/preview, it shows "默认推断" or "待完善" badge with fallback reason.
result: pass

### 4. Student can submit classroom evidence
expected: In a live classroom, student can submit evidence via recordClassroomEvidenceAction. Evidence is stored with session ownership and studentId.
result: pass

### 5. Teacher can record classroom intervention
expected: In a live classroom, teacher can record an intervention via recordClassroomInterventionAction. Intervention appears in classroomTimeline with teacher-only visibility.
result: issue
reported: "界面布局混乱，需要修复"
severity: cosmetic

### 6. verify:phase21 passes
expected: Run `pnpm verify:phase21` locally. Script exits with success code, confirming fallback cue copy, evidence wiring, and cache invalidation patterns exist.
result: pass

### 7. Editor step duration matches teachingDesign
expected: In editor, step card shows estimatedMinutes from teachingDesign (or legacy default if missing), not hardcoded duration.
result: issue
reported: "看不到模块的时间"
severity: major

## Summary

total: 7
passed: 4
issues: 2
pending: 0
skipped: 0
blocked: 1

## Gaps

- truth: "In a live classroom, teacher can record an intervention via recordClassroomInterventionAction and see it in classroomTimeline with teacher-only visibility."
  status: failed
  reason: "User reported: 界面布局混乱，需要修复"
  severity: cosmetic
  test: 5
  root_cause: "Phase 21 只补了 intervention 写入 classroomTimeline 的持久化链路，但没有补教师运行台对应的 timeline 读模型和专用展示容器，导致 intervention 没有稳定的 UI layout contract。"
  artifacts:
    - path: "src/lib/dal/classroom.ts"
      issue: "有 intervention 写入，但没有 timeline 读取并注入 snapshot"
    - path: "src/lib/dto/classroom.ts"
      issue: "ClassroomSnapshotDTOSchema 未承载 timeline"
    - path: "src/components/surfaces/classroom-console-surface.tsx"
      issue: "运行台壳层未给 intervention/timeline 预留独立版块"
    - path: "src/components/classroom/classroom-control-panel.tsx"
      issue: "缺少 timeline entry 的稳定布局容器"
  missing:
    - "补一个 typed 的 teacher timeline read model"
    - "在 classroom snapshot 或独立 teacher runtime DTO 中暴露 timeline 数据"
    - "新增专门的 timeline/intervention panel 展示 title/body/targetScope/createdAt"
  debug_session: ".planning/debug/intervention-timeline-layout.md"
- truth: "In editor, step card shows estimatedMinutes from teachingDesign (or legacy default if missing), not hardcoded duration."
  status: failed
  reason: "User reported: 看不到模块的时间"
  severity: major
  test: 7
  root_cause: "步骤卡片时间只被渲染成标题行右上角一个很小的 xx min badge，没有独立中文标签或稳定 metadata 区域，真实 UI 中容易被挤压或忽略。"
  artifacts:
    - path: "src/components/authoring/lesson-authoring-workspace.tsx"
      issue: "FlowStepCard 仅用小型右侧 badge 呈现时间，UI 可见性不足"
    - path: "src/components/authoring/lesson-authoring-workspace.test.tsx"
      issue: "只断言 DOM 存在 18 min，未验证时间信息是否真正清晰可见"
  missing:
    - "把步骤时间提升为更明确的元信息展示位"
    - "增加中文标签或图标，让时间信息可感知"
    - "补充面向真实卡片可见性的 UI 测试"
  debug_session: ".planning/debug/editor-missing-step-time.md"
