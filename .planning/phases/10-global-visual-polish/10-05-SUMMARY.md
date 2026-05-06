---
phase: 10-global-visual-polish
plan: 05
subsystem: ui
tags: [public, student, library, settings, tonal-layering]

# Dependency graph
requires:
  - phase: 10-01
    provides: shared button, badge, card, and tonal layering primitives
  - phase: 10-04
    provides: single-hero hierarchy and semantic risk treatment patterns
provides:
  - public-student-shared-design-language
  - calm-library-settings-tonal-polish
  - semantic-management-action-preservation
affects: [home surface, student dashboard, player, library, settings]

# Tech tracking
tech-stack:
  added: []
  patterns: [single-hero-per-surface, tonal-support-cards, shared-button-cta-hierarchy, semantic-settings-actions]

key-files:
  created: []
  modified:
    - src/components/surfaces/home-surface.tsx
    - src/components/surfaces/student-dashboard-surface.tsx
    - src/components/surfaces/player-surface.tsx
    - src/components/surfaces/library-surface.tsx
    - src/components/surfaces/settings-surface.tsx

key-decisions:
  - "首页与学生中心继续保留单一 justified gradient stage，次级动作和说明模块全部退回 tonal cards。"
  - "student/player 保持沉浸式主舞台，但把步骤骨架和回退态保持在低对比 tonal 容器中，优先保证当前学习上下文。"
  - "settings 与 labs 快捷操作保留语义红橙风险色，不把危险动作并入品牌蓝 CTA 体系。"

patterns-established:
  - "Pattern 1: Public 和 student 页面最多保留一个真正的 gradient hero，其余信息模块统一用 surface-container 分层。"
  - "Pattern 2: Calm management 页面用 tonal shells + shared Button CTA，而不是新增 hero 或 route-local action chips。"

requirements-completed: [UI-04]

# Metrics
duration: 7 min
completed: 2026-05-06
---

# Phase 10 Plan 05: Harmonize public, student, library, and settings page polish Summary

**首页、学生中心、播放器、资源页和设置页统一到同一套单主舞台加 tonal support 的设计语言，同时保留 public、learning 与 management 各自的页面气质。**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-06T22:31:00Z
- **Completed:** 2026-05-06T22:38:11Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- 收紧 `home-surface`，保留首页唯一品牌主舞台，并让次级教师路径、指标与推荐区回到更克制的 tonal hierarchy。
- 刷新 `student-dashboard-surface` 与 `player-surface`，保证学生主 CTA、当前课时和学习上下文优先，其余卡片不再与主舞台竞争。
- 统一 `library-surface` 与 `settings-surface` 的 calm management 语言，保留语义风险色并用共享 Button/Card/Badge 节奏替代局部样式漂移。

## Task Commits

Each task was committed atomically:

1. **Task 1: Preserve justified heroes on public and student learning pages** - `98f8182` (feat)
2. **Task 2: Keep library and settings surfaces calm, tonal, and semantically correct** - `1ec9a1e` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/components/surfaces/home-surface.tsx` - 将首页保留为单一 public hero，并把次级教师引导与支持模块收束到 tonal cards。
- `src/components/surfaces/student-dashboard-surface.tsx` - 把学生续学 hero 与 resume CTA 置前，同时将进度和课时列表维持为稳定的 tonal 信息层。
- `src/components/surfaces/player-surface.tsx` - 保留沉浸式学习主舞台，并让 fallback 步骤骨架与加载区更克制可读。
- `src/components/surfaces/library-surface.tsx` - 收紧课程/资源卡片密度，统一 CTA 语气，避免额外视觉竞争。
- `src/components/surfaces/settings-surface.tsx` - 让通用设置与 labs 保持 calm shell，并保留 destructive/fault 操作的语义红橙提示。

## Decisions Made

- 首页与学生 dashboard 继续保留一个 justified gradient hero，但 supporting modules 一律回落到 `bg-surface-container-low` / `bg-surface-container-lowest`。
- 学生续学和播放器优先展示当前任务、主 CTA 与学习状态，移动端不再让次级统计块抢占主层级。
- settings/labs 的扩展入口和危险操作改为 tonal + semantic treatments，避免管理页出现不必要的品牌化 hero 竞争。

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `src/components/surfaces/library-surface.tsx:94` - `年级/学科: (暂无数据)`；资源元数据 DTO 仍未接入真实字段，本计划仅做视觉收束。
- `src/components/surfaces/library-surface.tsx:95` - `教材/版本: (暂无数据)`；资源详情结构尚未提供对应数据。
- `src/components/surfaces/library-surface.tsx:96` - `册/章/节: (暂无数据)`；保留占位以维持卡片节奏，待后续数据补齐。
- `src/components/surfaces/library-surface.tsx:97` - `知识标签: (暂无数据)`；当前资源卡 DTO 未返回标签集合。

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 10 的 remaining public、student、catalog 与 settings surface 已统一到单 hero + tonal support 体系，可直接进入阶段级最终验收。
- 没有新的 blocker；可继续做 Phase 10 总体验证与收尾。

## Self-Check: PASSED

- Verified `10-05-SUMMARY.md` exists on disk.
- Verified task commits `98f8182` and `1ec9a1e` exist in `git log --oneline --all`.
- Verified all modified plan files exist on disk.

---
*Phase: 10-global-visual-polish*
*Completed: 2026-05-06*
