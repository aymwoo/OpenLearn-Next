---
phase: 32-end-to-end-hardening-and-milestone-proof
plan: 06
subsystem: classroom
tags: [classroom, runtime-proof, sse, inspector]

# Dependency graph
requires:
  - phase: 31-transport-boundary-and-runtime-inspector
    provides: classroom SSE route and runtime inspector deep-link contract
  - phase: 32-end-to-end-hardening-and-milestone-proof
    plan: 04
    provides: classroom-first proof wording and inspector drill-down posture
provides:
  - teacher live refresh bridge for durable classroom snapshot updates
  - ungated classroom-first runtime proof feedback with runtimeSessionId drill-down
  - canonical verifier coverage for teacher live refresh proof
affects: [phase-32-verification, classroom, inspector, runtime-proof]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - teacher `/classroom` consumes SSE only as a refresh trigger and re-reads the DTO on the server
    - proof first-feedback stays in classroom even after the current step leaves the runtime stage

key-files:
  created:
    - src/components/classroom/classroom-live-snapshot-refresh.tsx
    - src/components/classroom/classroom-live-snapshot-refresh.test.tsx
  modified:
    - src/app/(classroom)/classroom/page.tsx
    - src/components/classroom/classroom-control-panel.tsx
    - src/components/classroom/classroom-student-detail-panel.test.tsx
    - src/components/surfaces/classroom-console-surface.test.tsx
    - scripts/verify-phase32-end-to-end.ts
    - .planning/phases/32-end-to-end-hardening-and-milestone-proof/32-VALIDATION.md

key-decisions:
  - 教师端 live refresh 只做 `router.refresh()`，不在客户端维护第二份 snapshot 真相源。
  - proof first-feedback 改为基于 `runtimeProof` 或 attention 状态展示，但 runtime 主舞台仍只在 `currentRuntimeDescriptor` 存在时渲染。

requirements-completed: [RHOST-04]

# Metrics
duration: pending
completed: 2026-05-17
---

# Phase 32 Plan 06 summary

补齐了教师 `/classroom` 的 live proof 闭环：页面现在会跟随 SSE snapshot
版本变化自动刷新，教师能先在课堂控制台看到 proof 成功或异常反馈，再通过同一
`runtimeSessionId` 进入 inspector；这些回归也已进入 `verify:phase32`。

## Accomplishments

- 新增 `ClassroomLiveSnapshotRefresh`，仅监听 `/api/classroom/[sessionId]/events`
  的 `snapshot` 事件，并在版本前进时触发 `router.refresh()`。
- 将 proof first-feedback 从 runtime-step gating 解耦，只要 snapshot 中已有
  `runtimeProof` 或 runtime attention，就继续显示课堂内反馈和 inspector 深链。
- 扩展 focused tests、`verify:phase32` 和 `32-VALIDATION.md`，把 teacher live
  refresh proof 收入口径一致的 close gate。

## Self-Check: PASSED

- FOUND: `src/components/classroom/classroom-live-snapshot-refresh.tsx`
- FOUND: `src/components/classroom/classroom-live-snapshot-refresh.test.tsx`
- FOUND: `scripts/verify-phase32-end-to-end.ts`

---

*Phase: 32-end-to-end-hardening-and-milestone-proof*
*Completed: 2026-05-17*
