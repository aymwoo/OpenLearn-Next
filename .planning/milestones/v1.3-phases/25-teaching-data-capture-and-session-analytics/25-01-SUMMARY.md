---
phase: 25-teaching-data-capture-and-session-analytics
plan: 01
subsystem: classroom-dal
tags: [classroom, recap, analytics, dal, dto]
requires:
  - phase: 24-04
    provides: classroom monitoring, formative evaluation, same-route detail baseline
provides:
  - session-first recap dto contracts and deterministic aggregation helper
  - same-domain session history entries in classroom console dto
  - server-side `/classroom` ended/history recap branch
affects: [classroom-runtime, session-recap, phase-26-trends]
key-files:
  modified:
    - src/lib/dto/classroom.ts
    - src/lib/dal/classroom.ts
    - src/app/(classroom)/classroom/page.tsx
key-decisions:
  - "Session recap 继续留在 `/classroom` 域内，用 `sessionId` 驱动 live 与 ended/history 两种服务端读路径。"
  - "待反馈提交继续桥接 latest task/quiz attempts + attemptFeedback；不新增 analytics 持久化表。"
  - "参与度 bucket 显式保留 `未评价`，不把缺失评价默认并入 `正常参与`。"
completed: 2026-05-14
---

# Phase 25 Plan 01 Summary

为课堂域补上了 Phase 25 的核心 recap 读模型。

- 在 `src/lib/dto/classroom.ts` 新增 session recap、history entry、student/step summary、workload split 等 typed DTO。
- 在 `src/lib/dal/classroom.ts` 新增 `getClassroomSessionRecapDTO()`，基于 `classroomSessions`、`classroomParticipants`、`classroomEvidence`、`classroomTimeline` 聚合 deterministic recap，并只读桥接 latest attempts + `attemptFeedback`。
- 扩展 `getClassroomConsoleDTO()` 返回 `sessionEntries`，允许 `/classroom` 在同域内回看 recent ended sessions。
- 更新 `src/app/(classroom)/classroom/page.tsx`，让 ended session 直接走 recap DTO，live session 继续走 snapshot DTO。

验证：`pnpm test --run src/lib/dal/classroom.test.ts src/lib/dal/learning.test.ts src/app/(classroom)/classroom/page.test.tsx`
