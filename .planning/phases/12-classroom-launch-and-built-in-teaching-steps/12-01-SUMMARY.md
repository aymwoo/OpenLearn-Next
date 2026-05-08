---
phase: 12-classroom-launch-and-built-in-teaching-steps
plan: 01
subsystem: ui
tags: [classroom, teacher, launch, routing, nextjs]
requires:
  - phase: 11-plugin-theme-classroom-readiness
    provides: teacher classroom runtime, snapshot recovery, launch server actions
provides:
  - dedicated /teacher/launch classroom preparation route
  - secondary live-session resume cards backed by teacher-scoped DAL data
  - teacher CTA routing that keeps /classroom focused on active runtime control
affects: [teacher-shell, classroom-runtime, classroom-launch]
tech-stack:
  added: []
  patterns: [teacher-scoped launch route, secondary live-session recovery card, runtime-console handoff]
key-files:
  created:
    - src/app/(teacher)/teacher/launch/page.tsx
    - src/components/surfaces/classroom-launch-surface.tsx
  modified:
    - src/components/classroom/classroom-launch-panel.tsx
    - src/components/shell/sidebar.tsx
    - src/app/(teacher)/teacher/layout.tsx
    - src/app/(classroom)/classroom/page.tsx
    - src/components/surfaces/classroom-console-surface.tsx
    - src/lib/dal/classroom.ts
key-decisions:
  - "将 /teacher/launch 作为教师唯一的新开课堂准备入口，/classroom 保持为 live runtime 控制台。"
  - "恢复卡片仅暴露 teacher-scoped DTO 字段，并通过 query sessionId 精确回到对应 live classroom。"
patterns-established:
  - "Teacher launch preparation: dedicated gradient stage + tonal secondary recovery column"
  - "Runtime handoff: launch success navigates to /classroom while runtime page owns active controls"
requirements-completed: [CLASS-01, CLASS-06, CLASS-07]
duration: 2 min
completed: 2026-05-08
---

# Phase 12 Plan 01: Dedicated classroom launch route Summary

**教师专用开课准备页现已独立落在 `/teacher/launch`，并提供次级 live classroom 恢复卡片与运行台回跳链路。**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-08T21:23:31+08:00
- **Completed:** 2026-05-08T13:25:40Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 新增教师专用 `/teacher/launch` 路由与 `ClassroomLaunchSurface`，让新开课堂成为主动作。
- 扩展教师侧课堂 DAL，提供 live session 恢复卡片所需的课时、班级、锁定态、更新时间与版本信息。
- 将教师壳层 CTA 全部重定向到新开课页，并把 `/classroom` 的非 live 态降级为运行台引导入口。

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the dedicated teacher launch route and surface** - `dc03228` (feat)
2. **Task 2: Re-route existing teacher launch CTAs to the new page while keeping `/classroom` as the active runtime** - `f265372` (feat)

## Files Created/Modified

- `src/app/(teacher)/teacher/launch/page.tsx` - 新增教师开课准备路由。
- `src/components/surfaces/classroom-launch-surface.tsx` - 新的开课主舞台与次级恢复区布局。
- `src/components/classroom/classroom-launch-panel.tsx` - 抽象为可复用 launch form，并支持成功后跳转到运行台。
- `src/lib/dal/classroom.ts` - 输出恢复卡片所需的 teacher-scoped live session DTO。
- `src/components/shell/sidebar.tsx` - 侧边栏 `开启新课堂` 入口改为 `/teacher/launch`。
- `src/app/(teacher)/teacher/layout.tsx` - 教师头部 CTA 改为 `/teacher/launch`。
- `src/app/(classroom)/classroom/page.tsx` - 支持通过 `sessionId` 精确恢复指定 live classroom。
- `src/components/surfaces/classroom-console-surface.tsx` - 将非 live 状态改为运行台说明与开课页回链，而不再内嵌主开课准备区。

## Decisions Made

- 使用独立教师路由承接开课准备，避免 `/classroom` 同时承担准备页和运行台双重职责。
- 恢复区只显示次级 live classroom 摘要，不复制任何 active control surface，满足 threat model 的 runtime ownership 边界。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 修正恢复卡片跳回运行台时总是落到第一节 live classroom 的问题**
- **Found during:** Task 2
- **Issue:** 新恢复卡片需要按 session 精确回到对应运行中的课堂，但 `/classroom` 原逻辑只读取第一条 live session。
- **Fix:** 为 `/classroom` 增加 `searchParams.sessionId` 解析，并优先加载目标 live classroom 的 snapshot。
- **Files modified:** `src/app/(classroom)/classroom/page.tsx`
- **Verification:** `pnpm typecheck`；`pnpm exec eslint src/app/(classroom)/classroom/page.tsx src/components/surfaces/classroom-console-surface.tsx`
- **Committed in:** `f265372`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** 偏差仅用于保证恢复卡片在多课堂场景下正确落位，无额外 scope creep。

## Issues Encountered

- `Badge` 组件不支持 `secondary` variant，改为复用已有 `success` variant 表示进行中状态。
- `getClassroomConsoleDTO()` 新增恢复字段后，运行台类型约束需要同步收紧为 `status: 'live'`。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 12-02 可以直接在新的 `/teacher/launch` 页面上补齐 inline orchestration preview。
- 运行台 ownership 已明确，后续 preview 与 built-in step 工作不需要再改动 active runtime 边界。

## Self-Check: PASSED

- Found file: `src/app/(teacher)/teacher/launch/page.tsx`
- Found file: `src/components/surfaces/classroom-launch-surface.tsx`
- Found commit: `dc03228`
- Found commit: `f265372`

---
*Phase: 12-classroom-launch-and-built-in-teaching-steps*
*Completed: 2026-05-08*
