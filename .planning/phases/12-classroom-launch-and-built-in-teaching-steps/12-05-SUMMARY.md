---
phase: 12-classroom-launch-and-built-in-teaching-steps
plan: 05
subsystem: testing
tags: [classroom, launch, school-scope, redirect, vitest]
requires:
  - phase: 12-classroom-launch-and-built-in-teaching-steps
    provides: dedicated launch route, inline launch preview, live classroom handoff
provides:
  - teacher-scoped launch DTO filtering for published lessons and classes
  - session-aware launch redirect that lands on the exact live classroom
  - behavior regression coverage for school scope filtering and launch redirect
affects: [teacher-launch, classroom-runtime, verification]
tech-stack:
  added: []
  patterns: [teacher school-scoped launch queries, session-aware runtime handoff, behavior-first launch regression tests]
key-files:
  created:
    - src/components/classroom/classroom-launch-panel.test.tsx
  modified:
    - src/lib/dal/classroom.ts
    - src/components/classroom/classroom-launch-panel.tsx
    - src/lib/dal/classroom.test.ts
key-decisions:
  - "开课成功后优先使用 Server Action 返回的 sessionId 跳转，避免多 live session 时落回错误课堂。"
  - "launch DTO 与 launch mutation 都在 DAL 层按教师 school scope 收口，避免仅靠 UI 过滤。"
patterns-established:
  - "Launch security: teacher-visible options and launch execution both enforce school scope"
  - "Launch verification: use behavior tests instead of source-string assertions for classroom regressions"
requirements-completed: [CLASS-01, CLASS-07]
duration: 2 min
completed: 2026-05-08
---

# Phase 12 Plan 05: Launch scope and session handoff Summary

**教师端开课链路现在会按学校范围过滤可开课数据，并在创建课堂后精确进入返回的 live session。**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-08T22:59:15Z
- **Completed:** 2026-05-08T23:00:42Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- 在 `getClassroomConsoleDTO()` 中把可开课课时、班级与 course-class 关系收敛到教师 `schoolIds` 范围内。
- 在 `launchClassroomSession()` 中补上服务端学校范围校验，避免通过构造请求绕过 UI 过滤。
- 用行为级测试覆盖 school scope 过滤和 `/classroom?sessionId=` 精确跳转回归。

## Task Commits

Each task was committed atomically:

1. **Task 1: Scope launchable classroom data and use the returned session id for runtime handoff** - `ec3cc87` (fix)
2. **Task 2: Replace string checks with behavior tests for launch scoping and redirect** - `52b9b5b` (test)

## Files Created/Modified

- `src/lib/dal/classroom.ts` - 仅返回教师学校范围内的可开课课时/班级，并在 launch mutation 再次校验 school scope。
- `src/components/classroom/classroom-launch-panel.tsx` - 读取 `launchClassroomSessionAction()` 返回的 `sessionId`，成功后跳转到精确 classroom session。
- `src/lib/dal/classroom.test.ts` - 改为 mock teacher scope 与查询层，直接断言 DTO 不包含越权班级。
- `src/components/classroom/classroom-launch-panel.test.tsx` - 新增 launch 成功后 push `/classroom?sessionId=<id>` 的行为测试。

## Decisions Made

- 开课跳转优先信任服务端返回的 `sessionId`，只有缺失时才回退到 `successHref`。
- 学校范围保护不能只停留在 launch DTO，launch mutation 也必须拒绝 out-of-scope lesson/class 组合。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] 为 launch mutation 补上服务端 school scope 校验**
- **Found during:** Task 1
- **Issue:** 仅过滤 launch DTO 仍可能被手工构造请求绕过，越权开启其他学校课堂。
- **Fix:** 在 `launchClassroomSession()` 中校验 lesson 所属 course 与 class 都落在当前教师 `schoolIds` 内。
- **Files modified:** `src/lib/dal/classroom.ts`
- **Verification:** `pnpm typecheck`；`pnpm exec eslint src/lib/dal/classroom.ts src/components/classroom/classroom-launch-panel.tsx`
- **Committed in:** `ec3cc87`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** 偏差仅用于补齐必要权限边界，避免 launch 修复停留在 UI 层，无额外 scope creep。

## Issues Encountered

- `src/lib/dal/classroom.ts` 带有 `server-only` 边界，DAL 行为测试需要显式 mock `server-only` 与 auth 依赖后才能在 Vitest 中导入。

## Verification

- `pnpm typecheck` ✅
- `pnpm exec eslint src/lib/dal/classroom.ts src/components/classroom/classroom-launch-panel.tsx` ✅
- `pnpm test -- src/lib/dal/classroom.test.ts src/components/classroom/classroom-launch-panel.test.tsx` ✅

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 12-06 可以继续修复 built-in seed manifest 与 registry action vocabulary 不一致的问题。
- 12-09 可以沿用本次 behavior-first 测试模式，继续替换 Phase 12 其余字符串断言验证。

## Self-Check: PASSED

- Found file: `.planning/phases/12-classroom-launch-and-built-in-teaching-steps/12-05-SUMMARY.md`
- Found commit: `ec3cc87`
- Found commit: `52b9b5b`

---
*Phase: 12-classroom-launch-and-built-in-teaching-steps*
*Completed: 2026-05-08*
