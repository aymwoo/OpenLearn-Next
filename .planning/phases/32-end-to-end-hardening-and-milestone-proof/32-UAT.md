---
status: complete
phase: 32-end-to-end-hardening-and-milestone-proof
source: [32-01-SUMMARY.md, 32-02-SUMMARY.md, 32-04-SUMMARY.md, 32-05-SUMMARY.md, 32-06-SUMMARY.md]
started: 2026-05-17T09:23:37Z
updated: 2026-05-17T09:57:19Z
---

## Current Test

[testing complete]

## Tests

### 1. Launch surface proof discoverability
expected: 在 `/teacher/launch` 页面，教师能直接看到 canonical seeded proof 的次级入口或提示，且主动作仍然是“开启新课堂”，不需要去其他 dashboard 才能找到演示入口。
result: pass

### 2. Canonical proof live browser walkthrough
expected: 教师从 seeded lesson 开课后，学生端 runtime 能正常进入，不再停在“等待 iframe ready”；学生提交一次后，界面进入终态，保存和提交被锁定，并显示本次 proof 摘要。
result: issue
reported: "仍然显示等待 iframe ready,控制台有如下错误：[Pasted ~3 lineUnsafe attempt to load URL http://localhost:3000/runtime/html-courseware/pilot from frame with URL http://localhost:3000/runtime/html-courseware/pilot. Domains, protocols and ports must match. %5Broot-of-the-server%5D__0b-dwpu._.css:1 Failed to load resource: the server responded with a status of 403 (Forbidden)"
severity: major

### 3. Classroom-first live feedback and inspector handoff
expected: 学生进入 live 课堂后，`/classroom` 在线人数会自动更新；学生提交成功或失败后，教师会先在 `/classroom` 看到 proof 反馈，并能通过同一条反馈中的链接打开对应 `runtimeSessionId` 的 inspector。
result: pass

### 4. Reconnect and same-surface recovery posture
expected: live student session 中若 save 或 submit 失败，页面仍停留在 `/student/player`，保留当前上下文，并提供“重试刚才的操作”；恢复后不需要跳出当前 surface。
result: pass

## Summary

total: 4
passed: 3
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "教师从 seeded lesson 开课后，学生端 runtime 能正常进入，不再停在“等待 iframe ready”；学生提交一次后，界面进入终态，保存和提交被锁定，并显示本次 proof 摘要。"
  status: failed
  reason: "User reported: 仍然显示等待 iframe ready,控制台有如下错误：[Pasted ~3 lineUnsafe attempt to load URL http://localhost:3000/runtime/html-courseware/pilot from frame with URL http://localhost:3000/runtime/html-courseware/pilot. Domains, protocols and ports must match. %5Broot-of-the-server%5D__0b-dwpu._.css:1 Failed to load resource: the server responded with a status of 403 (Forbidden)"
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
