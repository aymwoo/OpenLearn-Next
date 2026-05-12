---
status: partial
phase: 21-teaching-design-contracts-and-evidence-foundation
source: 21-01-SUMMARY.md, 21-02-SUMMARY.md, 21-03-SUMMARY.md
started: 2026-05-13T15:47:00Z
updated: 2026-05-12T23:06:48Z
---

## Current Test

[testing paused - 1 blocked item outstanding]

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
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "In editor, step card shows estimatedMinutes from teachingDesign (or legacy default if missing), not hardcoded duration."
  status: failed
  reason: "User reported: 看不到模块的时间"
  severity: major
  test: 7
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
