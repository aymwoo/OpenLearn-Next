---
phase: 25-teaching-data-capture-and-session-analytics
plan: 03
subsystem: verification
tags: [classroom, analytics, verifier, vitest]
requires:
  - phase: 25-01
    provides: recap dal and route contracts
  - phase: 25-02
    provides: recap ui surfaces and history reopen workflow
provides:
  - focused DAL/UI regression coverage for phase 25 recap semantics
  - dedicated `verify:phase25` command
  - static guards against route drift, second truth source, and hidden `未评价` semantics
affects: [phase-26-trends, classroom-console, verification]
key-files:
  created:
    - scripts/verify-phase25-session-analytics.ts
    - src/app/(classroom)/classroom/page.test.tsx
    - src/components/classroom/classroom-session-history-panel.test.tsx
    - src/components/classroom/classroom-session-recap-surface.test.tsx
    - src/components/surfaces/classroom-console-surface.test.tsx
  modified:
    - src/lib/dal/classroom.test.ts
    - src/lib/dal/learning.test.ts
    - package.json
key-decisions:
  - "Phase 25 verifier 继续遵循仓库模式：先做静态 guard，再跑 focused `pnpm test --run`。"
  - "验证必须同时守住 `/classroom` 主域、split workload、`未评价` 语义和 second-source-of-truth anti-pattern。"
completed: 2026-05-14
---

# Phase 25 Plan 03 Summary

为 Phase 25 建立了可重复执行的验证闭环。

- 补充 DAL、route posture、surface、history rail、student detail 等 focused tests。
- 新增 `scripts/verify-phase25-session-analytics.ts`，静态检查 recap 仍留在 `/classroom`、没有新的 analytics 主路径、没有 second truth source，并要求 `未评价` 与 workload split 语义存在。
- 在 `package.json` 注册 `verify:phase25`。

验证：

- `pnpm test --run src/lib/dal/classroom.test.ts src/lib/dal/learning.test.ts src/app/(classroom)/classroom/page.test.tsx src/components/surfaces/classroom-console-surface.test.tsx src/components/classroom/classroom-session-history-panel.test.tsx src/components/classroom/classroom-session-recap-surface.test.tsx src/components/classroom/classroom-student-detail-panel.test.tsx`
- `pnpm verify:phase25`
