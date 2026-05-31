---
status: complete
phase: 32-end-to-end-hardening-and-milestone-proof
source: [32-VERIFICATION.md]
started: 2026-05-17T01:43:20Z
updated: 2026-05-17T10:57:55Z
---

## Current Test

[testing complete — superseded by `32-UAT.md` final re-test after plans 32-05, 32-06, and 32-07]

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
  root_cause: "学生端 iframe 在收到 bootstrap 前就发送 `runtime-frame-ready`，但宿主侧按最终 `runtimeInstanceId` 过滤握手事件，导致首个 ready 被忽略，`frameReady` 一直不成立，页面卡在等待 iframe ready。"
  artifacts:
    - path: "src/features/runtime-platform/host/runtime-host-client.tsx"
      issue: "宿主依赖 `frameReady` 才能进入终态，但 pre-bootstrap ready 握手会被实例过滤丢弃。"
    - path: "src/app/runtime/html-courseware/pilot/page.tsx"
      issue: "iframe 首次 ready 使用占位 `runtimeInstanceId` `runtime-pilot-pending`。"
    - path: "src/features/runtime-platform/host/runtime-host.test.tsx"
      issue: "已有回归测试说明必须接受 pre-bootstrap 的 iframe ready 握手。"
  missing:
    - "在 bootstrap 前接受 `runtime-frame-ready` 握手，而不是要求最终 `runtimeInstanceId` 先完全匹配。"
    - "保留其余 runtime 消息的实例级过滤，避免放宽过度。"
  debug_session: ".planning/debug/runtime-bootstrap-waits-for-iframe-ready.md"

- truth: "After student submit or failure, `/classroom` shows teacher-first proof feedback and the deep link opens `/settings/labs/runtime-inspector?runtimeSessionId=...` for the same proof session."
  status: failed
  reason: "User reported: 找不到链接或者入口，同时在有学生进入课堂live之后，仍然显示在线人数0人"
  severity: major
  test: 2
  root_cause: "教师端 `/classroom` 只在首屏读取一次 snapshot，没有 live refresh，导致学生进入后的在线人数和 runtime proof 写入后都不会自动显示；同时 proof first-feedback 区块又被 `currentRuntimeDescriptor` 条件包裹，当前步骤不在 runtime 上时入口会继续缺失。"
  artifacts:
    - path: "src/app/(classroom)/classroom/page.tsx"
      issue: "页面只调用一次 `getClassroomSnapshotDTO()`，没有 teacher-side 实时刷新机制。"
    - path: "src/components/classroom/classroom-control-panel.tsx"
      issue: "在线人数直接消费静态 `initialSnapshot`，proof 反馈区块被 `currentRuntimeDescriptor` 错误 gating。"
    - path: "src/lib/dal/classroom.ts"
      issue: "presence 与 runtime proof 已可从 snapshot 真相源读取，问题在展示层未刷新。"
  missing:
    - "给教师 `/classroom` 接入 live snapshot refresh，让 presence 和 proof 更新后能自动可见。"
    - "将 proof first-feedback 展示条件从 `currentRuntimeDescriptor` 解耦，只要 snapshot 中存在 `runtimeProof` 就展示 deep link。"
  debug_session: ".planning/debug/classroom-feedback-link-pres.md"
