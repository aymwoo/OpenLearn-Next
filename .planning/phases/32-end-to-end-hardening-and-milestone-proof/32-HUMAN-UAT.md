---
status: complete
phase: 32-end-to-end-hardening-and-milestone-proof
source: [32-VERIFICATION.md]
started: 2026-05-17T01:43:20Z
updated: 2026-05-17T06:39:52Z
---

## Current Test

[testing complete]

## Tests

### 1. Canonical proof live browser walkthrough
expected: Teacher can launch the seeded lesson, student can submit once, and the student UI stays in terminal success state with locked inputs and summary visible.
result: issue
reported: "runtime bootstrap 已返回，等待 iframe ready。"
severity: major

### 2. Classroom-first feedback before inspector drill-down
expected: After student submit or failure, `/classroom` shows teacher-first proof feedback and the deep link opens `/settings/labs/runtime-inspector?runtimeSessionId=...` for the same proof session.
result: issue
reported: "找不到链接或者入口，同时在有学生进入课堂live之后，仍然显示在线人数0人"
severity: major

### 3. Reconnect and same-surface recovery posture
expected: When save or submit fails during a live student session, the player stays on the same runtime surface, preserves draft context, and retry works without leaving `/student/player`.
result: pass

## Summary

total: 3
passed: 1
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Teacher can launch the seeded lesson, student can submit once, and the student UI stays in terminal success state with locked inputs and summary visible."
  status: failed
  reason: "User reported: runtime bootstrap 已返回，等待 iframe ready。"
  severity: major
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "After student submit or failure, `/classroom` shows teacher-first proof feedback and the deep link opens `/settings/labs/runtime-inspector?runtimeSessionId=...` for the same proof session."
  status: failed
  reason: "User reported: 找不到链接或者入口，同时在有学生进入课堂live之后，仍然显示在线人数0人"
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
