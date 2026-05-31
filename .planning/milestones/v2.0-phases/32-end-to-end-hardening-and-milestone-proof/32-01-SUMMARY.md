---
phase: 32-end-to-end-hardening-and-milestone-proof
plan: 01
subsystem: runtime-platform
tags: [runtime-platform, html-courseware, classroom, runtime-session, proof]
requires:
  - phase: 31-transport-boundary-and-runtime-inspector
    provides: transport gateway, runtime inspector deep-link target, durable runtime transport truth
provides:
  - deterministic canonical runtime proof seed lesson and published snapshot
  - runtime submit contract with runtimeSessionId and UI-ready proof summary
  - classroom monitoring DTO fields for first-feedback runtime proof status
affects: [32-02-terminal-posture, 32-03-verify-phase32, runtime-inspector, classroom-ui]
tech-stack:
  added: []
  patterns:
    - deterministic bootstrap seed reuses existing htmlCourseware descriptor contract
    - runtime submit truth returns server-owned proofSummary instead of client recomposition
    - classroom monitoring reads runtime proof from durable evidence payloads only
key-files:
  created:
    - src/features/runtime-platform/classroom/runtime-session-contracts.ts
    - src/features/runtime-platform/classroom/runtime-session.ts
  modified:
    - scripts/bootstrap-dev-db.ts
    - src/features/runtime-platform/contracts/bridge.ts
    - src/lib/dal/classroom.ts
    - src/lib/dto/classroom.ts
    - src/lib/dal/lesson-authoring.test.ts
    - src/features/runtime-platform/classroom/runtime-session.test.ts
    - src/lib/dal/classroom.test.ts
key-decisions:
  - "canonical proof step 固定复用 htmlCourseware descriptor，而不是派生第二套 runtime payload。"
  - "runtime submit result 必须显式返回 runtimeSessionId、submittedAt 与 proofSummary，供课堂与 inspector 统一消费。"
  - "classroom first-feedback 只读取服务端 durable evidence payload 映射出的 runtimeProof，不让 UI 重解 runtime state。"
patterns-established:
  - "Proof seed pattern: bootstrap-dev-db -> publishLessonVersion -> published snapshot freeze"
  - "Runtime proof pattern: runtime submit -> proofSummary -> classroom monitoring DTO"
requirements-completed: [RHOST-04]
duration: 15min
completed: 2026-05-16
---

# Phase 32 Plan 01: Deterministic proof foundation summary

**Deterministic HTML runtime proof seed with classroom-facing runtime submit summaries and inspector deep-links.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-16T14:08:06Z
- **Completed:** 2026-05-16T14:23:22Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- 固定了 canonical HTML runtime proof seed，确保 bootstrap lesson、published snapshot 与后续 proof 路径可重复。
- 扩展了 runtime submit contract，使 durable result 显式返回 `runtimeSessionId`、`submittedAt` 与结构化 `proofSummary`。
- 将 classroom monitoring DTO 扩展为可直接消费的 `runtimeProof`，教师端可在 `/classroom` 首屏看到 first-feedback 与 inspector deep-link。

## Task commits

Each task was committed atomically:

1. **Task 1: 固定 canonical demo seed lesson 与 published runtime snapshot**
   - `298ec53` (`test`) RED: add failing tests for canonical runtime proof seed
   - `b210e3f` (`feat`) GREEN: seed canonical runtime proof lesson
2. **Task 2: 把 runtimeSessionId 与 submit summary 线程化到课堂真相读模型**
   - `c4ac153` (`test`) RED: add failing tests for runtime proof feedback
   - `839609e` (`feat`) GREEN: expose runtime proof feedback in classroom snapshots

**Plan metadata:** pending final docs commit

## Files created/modified

- `scripts/bootstrap-dev-db.ts` - 增加 canonical runtime proof step definition 与 snapshot seed helper。
- `src/features/runtime-platform/classroom/runtime-session-contracts.ts` - 定义 runtime bootstrap、submit proof summary 与 result schemas。
- `src/features/runtime-platform/contracts/bridge.ts` - 扩展 runtime save/submit typed result envelope。
- `src/features/runtime-platform/classroom/runtime-session.ts` - 生成 proof summary、回写 durable truth，并返回 inspector deep-link 相关字段。
- `src/lib/dal/classroom.ts` - 从课堂证据映射 `runtimeProof` 到 monitoring read model。
- `src/lib/dto/classroom.ts` - 新增 participant monitoring 的 `runtimeProof` DTO contract。
- `src/features/runtime-platform/classroom/runtime-session.test.ts` - 锁定 canonical seed 与 runtime proof submit contract。
- `src/lib/dal/lesson-authoring.test.ts` - 锁定 publish snapshot freeze 仍保留 canonical runtime descriptor。
- `src/lib/dal/classroom.test.ts` - 锁定 classroom first-feedback proof 字段与 action forwarding contract。

## Decisions made

- 继续沿用现有 `htmlCourseware` built-in descriptor，避免 proof lesson 和真实 runtime contract 漂移。
- `proofSummary` 由服务端派生为 UI-ready DTO，并带 `runtimeSessionId` deep-link，避免 transport/UI 二次拼接。
- classroom 只暴露精简 proof 字段，不泄露 raw runtime state JSON，符合本 plan threat model 的信息最小化要求。

## Deviations from plan

None - plan executed exactly as written.

## Issues encountered

- None.

## User setup required

None - no external service configuration required.

## Next phase readiness

- 已具备稳定的 canonical proof 数据基础，Phase 32-02 可以继续做 terminal posture 与 failure recovery hardening。
- `verify:phase32` 后续可直接复用本 plan 锁定的 deterministic seed、runtimeSessionId truth 与 classroom proof DTO。

## Self-check: PASSED

- FOUND: `.planning/phases/32-end-to-end-hardening-and-milestone-proof/32-01-SUMMARY.md`
- FOUND: `298ec53`
- FOUND: `b210e3f`
- FOUND: `c4ac153`
- FOUND: `839609e`
