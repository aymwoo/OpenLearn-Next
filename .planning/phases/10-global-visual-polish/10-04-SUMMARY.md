---
phase: 10-global-visual-polish
plan: 04
subsystem: ui
tags: [classroom, launch, roster, review, tonal-layering]

# Dependency graph
requires:
  - phase: 10-01
    provides: shared button/card/badge visual primitives
provides:
  - classroom-runtime-density-refresh
  - semantic-launch-form-polish
  - teacher-review-control-language-alignment
affects: [classroom runtime, classroom launch, roster panel, teacher review]

# Tech tracking
tech-stack:
  added: []
  patterns: [single-runtime-hero, semantic-risk-actions, tonal-supporting-panes, ghost-outline-inputs]

key-files:
  created: []
  modified:
    - src/components/classroom/classroom-control-panel.tsx
    - src/components/classroom/classroom-launch-panel.tsx
    - src/components/classroom/classroom-roster-panel.tsx
    - src/components/learning/teacher-review-surface.tsx

key-decisions:
  - "将课堂运行页保持为单一渐变主舞台，其余控制与名册模块全部回落到 tonal cards，避免高频教师页面出现多重 hero 竞争。"
  - "结束课堂与待反馈状态继续使用语义色，而不是并入品牌蓝 CTA 体系，满足实时操作风险识别。"
  - "课堂 launch 表单改为 ghost-outline input treatment，并让 review 筛选 pills 明显退居主 hero 之后。"

patterns-established:
  - "Pattern 1: 高密度教师操作页仅保留一个真正的 gradient hero，辅助模块统一使用 tonal layering。"
  - "Pattern 2: 语义风险动作与反馈状态使用共享 Badge/Button 语义色扩展，不再用品牌蓝替代。"

requirements-completed: [UI-04]

# Metrics
duration: 2 min
completed: 2026-05-06
---

# Phase 10 Plan 04: Tighten classroom runtime, launch, roster, and review flows Summary

**课堂运行、launch 与 teacher review 统一为单主舞台加高密度 tonal 控制语言，同时保留结束课堂和待反馈等语义状态的可辨识度。**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-06T22:27:56Z
- **Completed:** 2026-05-06T22:30:19Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- 收紧 `classroom-control-panel`，保留单一 runtime hero，并把步骤流转、模式切换、移动端主控制收束到更高密度的 tonal 模块。
- 重构 `classroom-launch-panel` 的输入与摘要区，让 launch 表单使用 ghost-outline 焦点样式，并保持唯一主 CTA `开始课堂`。
- 刷新 `teacher-review-surface` 与 `classroom-roster-panel`，让筛选、名册、反馈状态都复用共享 Badge/Card/Button 语义语言。

## Task Commits

Each task was committed atomically:

1. **Task 1: Tighten classroom runtime hierarchy without losing semantic states** - `1df71c1` (feat)
2. **Task 2: Align classroom launch and teacher review flows to the same control language** - `b06c7af` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/components/classroom/classroom-control-panel.tsx` - 压缩课堂运行主舞台以下的控制层级，补齐移动端优先控制块并保留 red-toned 结束课堂动作。
- `src/components/classroom/classroom-roster-panel.tsx` - 将名册与出勤摘要整理为 tonal cards，移除本地重阴影漂移并强化待连接信息。
- `src/components/classroom/classroom-launch-panel.tsx` - 将 launch 摘要与表单切换为更统一的 control language，使用 ghost-outline input 与单一 dominant CTA。
- `src/components/learning/teacher-review-surface.tsx` - 保留单一 review hero，压低筛选 pills 权重，并用 badge/semantic chips 强化待反馈与同步状态。

## Decisions Made

- 课堂运行页继续保留一个真正的渐变主舞台，其余模块全部退回 tonal layering，避免高频教师操作面出现层级冲突。
- 移动端课堂运行页把模式切换、结束课堂等主控制提前到步骤区域上方，优先保证当前步骤、模式、在线人数与主操作先出现。
- teacher review 的待反馈语义采用 badge 和暖色 chips 呈现，而不是用 brand blue 重绘风险状态。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tightened classroom panel DTO typing to clear verification**
- **Found during:** Task 1 (Tighten classroom runtime hierarchy without losing semantic states)
- **Issue:** 更新运行页与名册面板后，`eslint` 因本地 `any` 类型报错，阻塞任务验收。
- **Fix:** 为运行页与名册面板改用 `ClassroomSnapshotDTO`、`ClassroomStepDTO`、`ClassroomParticipantDTO` 等现有 DTO 类型，并加上冲突快照类型守卫。
- **Files modified:** `src/components/classroom/classroom-control-panel.tsx`, `src/components/classroom/classroom-roster-panel.tsx`
- **Verification:** `pnpm typecheck && pnpm exec eslint src/components/classroom/classroom-control-panel.tsx src/components/classroom/classroom-roster-panel.tsx`
- **Committed in:** `1df71c1`

**2. [Rule 3 - Blocking] Typed launch lesson options so launch polish could pass lint**
- **Found during:** Task 2 (Align classroom launch and teacher review flows to the same control language)
- **Issue:** launch 面板视觉改造后，`eslint` 仍因 `publishedLessons` 与班级映射使用 `any` 报错。
- **Fix:** 为 launch 面板补充本地 `PublishedLessonOption` 类型，保证表单与班级选择映射通过静态检查。
- **Files modified:** `src/components/classroom/classroom-launch-panel.tsx`
- **Verification:** `pnpm typecheck && pnpm exec eslint src/components/classroom/classroom-launch-panel.tsx src/components/learning/teacher-review-surface.tsx`
- **Committed in:** `b06c7af`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** 都是为完成当前计划验证所必需的局部修正，没有引入额外范围。

## Issues Encountered

- Task 1 首轮验证被 `no-explicit-any` 阻塞，已通过收紧 DTO 类型解决。
- Task 2 首轮验证被 launch 面板的本地类型缺失阻塞，已在同文件内补齐。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Classroom 与 teacher review 高频教师页面已经对齐到同一套单 hero + tonal support 语言，可继续复用到剩余公共页与学生页抛光。
- 没有遗留 blocker，可继续执行 `10-05`。

## Self-Check: PASSED

- Verified `10-04-SUMMARY.md` exists on disk.
- Verified task commits `1df71c1` and `b06c7af` exist in `git log --oneline --all`.
- Verified all modified plan files exist on disk.

---
*Phase: 10-global-visual-polish*
*Completed: 2026-05-06*
