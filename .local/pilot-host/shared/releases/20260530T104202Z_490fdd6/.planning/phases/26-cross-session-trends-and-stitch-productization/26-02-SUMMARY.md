---
phase: 26-cross-session-trends-and-stitch-productization
plan: 02
subsystem: ui
tags: [nextjs, react, teacher-shell, navigation, trends, analytics]

# Dependency graph
requires:
  - phase: 26-01
    provides: recent session trend DTO and teacher-scoped trend DAL
provides:
  - `/teacher/trends` first-class teacher route
  - teacher shell and navigation entry for trends
  - class-first trends surface with inline anomaly detail and classroom-first CTA hierarchy
affects: [26-03, 26-04, 26-05, phase-26-verification]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared teacher shell route registration, class-first inline trend drill-down]

key-files:
  created:
    - src/app/(teacher)/teacher/trends/page.tsx
    - src/app/(teacher)/teacher/trends/page.test.tsx
    - src/components/surfaces/teacher-trends-surface.tsx
    - src/components/surfaces/teacher-trends-surface.test.tsx
  modified:
    - src/lib/theme-layout/route-surface-registry.ts
    - src/lib/theme-layout/shell-surface-resolver.test.ts
    - src/lib/navigation.ts
    - src/components/shell/teacher-sidebar-shell.tsx
    - src/components/shell/teacher-sidebar-shell.test.tsx

key-decisions:
  - "默认 classId 通过现有 getClassroomConsoleDTO() 推导，避免为 26-02 新增额外 DAL 接口。"
  - "趋势详情保持 inline-first，主 CTA 固定回到 /classroom recap，/teacher/review 仅在存在待反馈工作时作为 secondary CTA。"

patterns-established:
  - "Teacher trends route: 通过 route-surface-registry 注册新 route key，让 shell runtime 与 active theme runtime 自动继承。"
  - "Trend product entry: teacher 顶部导航与侧边导航统一指向 /teacher/trends，不再复活 /teacher/reports。"

requirements-completed: [ANALYTICS-02, UI-05]

# Metrics
duration: 45min
completed: 2026-05-14
---

# Phase 26-02 Summary

**`/teacher/trends` 已作为独立教师入口接入共享 shell，并提供 class-first recent-session 趋势页内详情与 classroom-first 回跳主链。**

## Performance

- **Duration:** 45 min
- **Started:** 2026-05-14T20:00:00Z
- **Completed:** 2026-05-14T20:25:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- 为 `/teacher/trends` 注册了 teacher shell route metadata，并验证 resolver 会落到共享 rounded shell。
- 在 teacher 顶部导航与侧边导航中加入 `班级趋势`，移除了 `数据报表 -> /teacher/reports` 的主入口漂移。
- 新增 trends route 与 trends surface，默认按班级查看最近 session，对异常先做页内展开，再回到 `/classroom` 复盘。
- 为 route、shell、surface 增加定向测试，覆盖默认 class-first、inline detail、CTA hierarchy 与 responsive class guard。

## Task Commits

当前未创建 commit；本轮变更仍在工作树中，待后续 wave/gate 一并处理。

## Files Created/Modified
- `src/lib/theme-layout/route-surface-registry.ts` - 注册 `/teacher/trends` route key、surface metadata 与 pathname resolver
- `src/lib/navigation.ts` - 新增 teacher top nav 的 `班级趋势` 入口
- `src/components/shell/teacher-sidebar-shell.tsx` - 新增侧边导航 trends 入口并移除 `/teacher/reports`
- `src/lib/theme-layout/shell-surface-resolver.test.ts` - 覆盖 `/teacher/trends` shell 解析断言
- `src/components/shell/teacher-sidebar-shell.test.tsx` - 覆盖 trends 可见入口与 active state
- `src/app/(teacher)/teacher/trends/page.tsx` - 新增 server route，解析 query 并调用 `getTeacherRecentSessionTrendDTO`
- `src/app/(teacher)/teacher/trends/page.test.tsx` - 覆盖默认 class 选择与 query passthrough
- `src/components/surfaces/teacher-trends-surface.tsx` - 新增 class-first trends UI、inline detail 与 CTA hierarchy
- `src/components/surfaces/teacher-trends-surface.test.tsx` - 覆盖 available sessions、inline detail、secondary review gating 与 responsive guards

## Decisions Made

- 复用现有 `getClassroomConsoleDTO()` 作为默认 class 入口来源，保持 26-02 只做入口 productization，不扩展新的 teacher class lookup API。
- trends detail 中不做立即跳转；先给出 `Session summary`、`Key signals`、`Impacted students`，之后才提供行动按钮。
- `/teacher/review` 只在 trend detail 存在 `secondaryReviewHref` 时出现，避免把 feedback workflow 误提升为默认主路径。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 新 page 默认 `view` 解析初版把 `undefined` 透传给 DAL，已改为使用 schema parse 结果回落到 `sessions`。
- surface 测试初版因重复文本与跨用例残留导致断言冲突，已通过 `cleanup()` 与更稳健断言修复。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 2 的入口与页内交互已落地，后续可以继续推进 `26-03` 的 recap-to-trends、editor、launch productization。
- 当前已验证命令：`pnpm test --run src/lib/theme-layout/shell-surface-resolver.test.ts src/components/shell/teacher-sidebar-shell.test.tsx "src/app/(teacher)/teacher/trends/page.test.tsx" src/components/surfaces/teacher-trends-surface.test.tsx`

---
*Phase: 26-cross-session-trends-and-stitch-productization*
*Completed: 2026-05-14*
