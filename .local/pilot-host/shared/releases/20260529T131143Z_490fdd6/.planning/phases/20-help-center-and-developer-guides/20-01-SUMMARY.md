---
phase: 20-help-center-and-developer-guides
plan: 01
subsystem: help-center-routing-and-surfaces
tags: [help-center, teacher-shell, route-metadata, surface-template, product-docs]
requires:
  - phase: 19-teacher-shell-route-metadata-system
    provides: route metadata-driven teacher shell integration
provides:
  - /help route family inside teacher shell
  - help overview surface with teacher/developer split
  - shared developer detail-page template
  - centralized help content map
affects: [teacher-shell, help-center, route-registry]
tech-stack:
  added: []
  patterns: [route metadata allowlist, shared content map, product-native help surfaces]
key-files:
  created:
    - .planning/phases/20-help-center-and-developer-guides/20-01-SUMMARY.md
    - src/app/help/layout.tsx
    - src/app/help/page.tsx
    - src/app/help/plugins/page.tsx
    - src/app/help/themes/page.tsx
    - src/app/help/actions-interfaces/page.tsx
    - src/components/surfaces/help-center-overview-surface.tsx
    - src/components/surfaces/help-guide-detail-surface.tsx
    - src/lib/help/help-center-content.ts
  modified:
    - src/lib/theme-layout/route-surface-registry.ts
key-decisions:
  - "`/help` 与所有 `/help/*` 路由继续走 `TeacherSidebarShell`，不新建 docs-only layout。"
  - "帮助中心首页先做 `我是教师` / `我是开发者` 分流，教师帮助保持轻量，开发者指南拆到三个正式子页。"
  - "帮助内容统一收敛到 `src/lib/help/help-center-content.ts`，避免各页面内联复制标签与结构。"
patterns-established:
  - "Pattern 5: teacher-facing help pages 也必须先通过 route metadata 注册，再进入 shell。"
requirements-completed: [Extension phase — product help center and developer-facing implementation guidance.]
duration: unknown
completed: 2026-05-11
---

# Phase 20 Plan 01: Help center route and surface summary

**`/help` 已从侧边栏空入口变成 teacher-shell 内的正式帮助中心路由家族，并落下首页分流、三个详细页与共享 surface 模板。**

## Performance

- **Duration:** unknown
- **Completed:** 2026-05-11
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- 扩展 `src/lib/theme-layout/route-surface-registry.ts`，把 `/help`、`/help/plugins`、`/help/themes`、`/help/actions-interfaces` 纳入 allowlisted teacher route metadata，并为帮助中心新增 `help-overview`、`help-guide-detail` 模块身份。
- 新增 `src/app/help/layout.tsx`，让整组 `/help` 路由通过 `TeacherSidebarShell` 渲染，并保持侧边栏 `/help` 单入口高亮语义。
- 新增帮助中心首页与三个详细页页面文件，全部使用产品内 surface，而不是 markdown/docs layout。
- 新增 `src/components/surfaces/help-center-overview-surface.tsx`，完成“我是教师 / 我是开发者”分流、教师轻量帮助模块、开发者入口卡和 `当前可用 / 使用边界 / 后续扩展` 状态说明。
- 新增 `src/components/surfaces/help-guide-detail-surface.tsx`，提供返回帮助中心、intro card、正文 section、代码示例区与右侧 `本页覆盖` / 边界提示的共享模板。
- 新增 `src/lib/help/help-center-content.ts`，统一维护首页模块、开发者指南卡片和三张详细页的结构化内容源。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `src/lib/theme-layout/route-surface-registry.ts` - 帮助中心 route metadata allowlist。
- `src/app/help/layout.tsx` - `/help` 路由家族的 shell layout。
- `src/app/help/page.tsx` - 帮助中心首页入口。
- `src/app/help/plugins/page.tsx` - 插件开发详细页入口。
- `src/app/help/themes/page.tsx` - 主题开发详细页入口。
- `src/app/help/actions-interfaces/page.tsx` - schedule 扩展详细页入口。
- `src/components/surfaces/help-center-overview-surface.tsx` - 首页总览 surface。
- `src/components/surfaces/help-guide-detail-surface.tsx` - 开发者详细页共享模板。
- `src/lib/help/help-center-content.ts` - 统一帮助中心内容映射。

## Decisions Made

- 首页教师帮助区只讲产品入口和能力边界，不包含代码块或底层 contract 术语。
- 详细页统一通过共享模板承载，避免插件、主题、actions/interfaces 三页各自长出不同的 docs UI。
- `activePath` 固定为 `/help`，而 routeKey 则按当前 pathname 解析，兼顾侧边栏高亮和 page-level route metadata。

## Deviations from Plan

- 计划里提到的“最小结构化骨架”之外，这次已经先填入一版代码库对齐的初始开发者内容，便于 20-02/20-03 继续细化，而不是只留空壳模板。

## Issues Encountered

- 无阻塞问题；现有 route metadata 和 shell 架构足以直接承接 `/help`，不需要在 `TeacherSidebarShell` 内增加特判。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `20-02` 可以直接在当前 detail template 上细化插件与主题页内容，无需再改 route 和 shell 结构。
- `20-03` 可以在现有 actions/interfaces 页基础上补 phase-specific verification guardrails。

## Self-Check: PASSED

- Verified route registration static check
- Verified help surface/content static check
- Verified `pnpm typecheck`

---

*Phase: 20-help-center-and-developer-guides*
*Completed: 2026-05-11*
