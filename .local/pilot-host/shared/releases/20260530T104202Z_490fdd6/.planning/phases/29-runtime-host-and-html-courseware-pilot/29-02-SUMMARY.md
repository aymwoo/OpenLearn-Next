---
phase: 29-runtime-host-and-html-courseware-pilot
plan: 02
subsystem: surfaces
tags: [runtime-platform, preview, player, classroom, runtime-host]
requires:
  - phase: 29-01
    provides: shared Runtime Host client and typed browser bridge
provides:
  - draft-only runtime preview embedding
  - player current-step runtime rendering on the personal/runtime branch
  - classroom teacher-stage runtime embedding on the live control path
affects: [phase-29, teacher-preview, student-player, classroom]
tech-stack:
  added: []
  patterns: [same host across surfaces, preview stays draft-only, classroom stays same-route]
key-files:
  created: []
  modified:
    - src/components/surfaces/teacher-lesson-preview-surface.tsx
    - src/components/learning/classroom-runtime-client.tsx
    - src/components/classroom/classroom-control-panel.tsx
    - src/components/surfaces/student-player-surfaces.test.ts
    - src/components/surfaces/classroom-console-surface.test.tsx
key-decisions:
  - "preview 继续只下发草稿步骤与静态说明，不读取个人进度或 live classroom state。"
  - "student runtime host 嵌在 `classroom-runtime-client` 当前步骤分支里，继续服从 shell/personal split。"
  - "classroom 集成点最终落在 `ClassroomControlPanel` 主舞台区，而不是 route posture 更外层的 `ClassroomConsoleSurface`。"
patterns-established:
  - "Pattern: runtime-capable step detection happens at the surface-specific step renderer, but all actual runtime UI comes from the shared Runtime Host."
requirements-completed: [RHOST-01, RHOST-02]
duration: not-recorded
completed: 2026-05-16
---

# Phase 29 Plan 02: Surface embedding summary

**Shared Runtime Host embedded into teacher preview, student player, and classroom live control surfaces without changing route posture**

## Performance

- **Duration:** 未单独记录
- **Started:** 未单独记录
- **Completed:** 2026-05-16
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `teacher-lesson-preview-surface.tsx` 在 `step.payload.runtime` 存在时直接嵌入 `RuntimeHostClient`，并显式提示“教师草稿预览 / 不包含学生进度与课堂运行态”。
- `classroom-runtime-client.tsx` 在 current step 带 runtime descriptor 时优先渲染 `RuntimeHostClient`，继续保留 `StepActivityShell`、player reconnect banner、以及 shell/personal split。
- classroom 集成最终落在 `src/components/classroom/classroom-control-panel.tsx` 的主舞台区域：当前 live step 带 runtime descriptor 时，以 `surface="classroom-stage"` 接入 shared host，并继续复用现有 classroom snapshot。
- focused tests 锁住 preview/player/classroom 三条链的 shared host 使用点与 route posture。

## Task Commits

No task commits recorded yet. 当前改动仍在工作树中；若后续需要提交，应只精确提交 Phase 29 相关文件。

**Plan metadata:** pending

## Files Created/Modified

- `src/components/surfaces/teacher-lesson-preview-surface.tsx` - 接入 draft-only Runtime Host，并补草稿语义提示。
- `src/components/learning/classroom-runtime-client.tsx` - 在 runtime-capable current step 时切到 shared Runtime Host。
- `src/components/classroom/classroom-control-panel.tsx` - 在 live classroom 主舞台区嵌入 teacher-facing Runtime Host。
- `src/components/surfaces/student-player-surfaces.test.ts` - 锁住 player 仍保留 shell/personal split 且使用 `RuntimeHostClient`。
- `src/components/surfaces/classroom-console-surface.test.tsx` - 保留 live/recap route posture 回归，证明 `/classroom` 仍走同一路由结构。

## Decisions Made

- preview 的 host 接入保留只读草稿语义，避免误把 live 或 personal truth 泄露给教师预览。
- player 的 host 集成保持在 `CurrentStepRenderer` 路径，不新开 runtime player 分支。
- classroom 真实集成点收敛在 `ClassroomControlPanel`，这样可以直接消费当前 `initialSnapshot` 和 active step，而不改上层 surface 的整体布局。

## Deviations from Plan

### Intentional Adjustments

**1. Classroom host 最终落点从 `classroom-console-surface.tsx` 下沉到 `classroom-control-panel.tsx`**
- **Reason:** 上层 `ClassroomConsoleSurface` 主要负责 route posture 和 hero/shell framing；真正持有当前 step、live snapshot 和 teacher action 的是 `ClassroomControlPanel`。
- **Impact:** 保持了原计划的 same-route classroom integration 目标，但把接入点放在更贴近 live truth 的组件层，减少 props 穿透和重复判断。
- **Verification:** `pnpm verify:phase29`

---

**Total deviations:** 1 intentional adjustment
**Impact on plan:** 没有改变 classroom same-route 集成目标，只优化了接入层次。

## Issues Encountered

None remaining.

## User Setup Required

None.

## Next Phase Readiness

- Plan 03 可以直接围绕 editor built-in template 和 publish snapshot freeze 接入本地 HTML runtime pilot。
- Plan 04 已可复用三条 surface 的 shared host wiring 做 verifier 收口。

## Self-Check: PASSED

- Found `RuntimeHostClient` in `teacher-lesson-preview-surface.tsx`
- Found `RuntimeHostClient` in `classroom-runtime-client.tsx`
- Found `RuntimeHostClient` in `classroom-control-panel.tsx`
- Found `surface="teacher-preview"`, `surface="student-player"`, and `surface="classroom-stage"`

---

*Phase: 29-runtime-host-and-html-courseware-pilot*
*Completed: 2026-05-16*
