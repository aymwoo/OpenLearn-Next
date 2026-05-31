# Phase 19: Teacher shell route metadata system - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning
**Source:** plan-phase recovery from direct user brief

<domain>
## Phase Boundary

本阶段聚焦 teacher-facing shell 的架构硬化：把 `teacher-sidebar-shell.tsx`
内基于 route string 的分支判断迁移到统一的 route metadata + shell config
resolver 路径上，使教师端壳层能从中心化 metadata 解析 radius、width、chrome
与后续 presentation/focus/fullscreen 等变体能力。

本阶段不是一次视觉改版。现有 `/teacher` 页面保持当前 square/full-width/immersive
视觉结果不变；改动目标是消除硬编码 route 判断、收敛扩展点、降低未来新增 route
时出现 `routeA || routeB || routeC` 架构退化的风险。

</domain>

<decisions>
## Implementation Decisions

### Shell metadata contract
- **D-01:** 必须建立 route metadata registry，route surface 需要能声明 shell 行为，而不是只返回 label 或 split。
- **D-02:** route metadata 至少要覆盖 `path`/route key 与 `shell` 配置；`shell` 需要能表达 `radius`、`width`、`chrome`，并预留 `rounded`、`square`、`fullscreen`、`immersive`、`presentation`、`minimal chrome` 等扩展枚举。
- **D-03:** `/teacher` 当前 square shell 行为必须通过 metadata 表达，不允许继续在 JSX 内以 `routeKey === "/teacher"` 这种形式硬编码。

### Resolver contract
- **D-04:** 必须新增统一 resolver（可命名为 `resolveShellVariant()`、`getShellSurfaceConfig()` 或等价命名），由它集中解析 shellVariant、shellConfig、surface metadata。
- **D-05:** UI shell 组件不能自己推导业务 route 规则；route 到 shell 的映射逻辑必须收敛在 registry/resolver 层。
- **D-06:** resolver 输出必须足够让 `teacher-sidebar-shell.tsx` 只消费 `shellVariant`、`shellConfig`、`surface metadata`，而不再包含业务 route 判断。

### Teacher shell constraints
- **D-07:** `teacher-sidebar-shell.tsx` 只能基于 resolver 输出渲染；禁止保留 `routeKey === "/teacher"`、`pathname.startsWith(...)` 或同类业务 route 分支。
- **D-08:** 保持当前 `/teacher`、`/settings`、`/resources` 共享 teacher shell 主路径，不新增平行 shell 系统。
- **D-09:** 本次迁移不得改变现有视觉结果，尤其是 `/teacher` 的 square shell、全宽 header/main 行为必须保持一致。

### Migration and risk control
- **D-10:** 迁移方式必须最小风险、可原子提交；优先接口先行，再替换消费方，最后补回归验证。
- **D-11:** 需要显式分析 shell/layout dependencies、route usage graph、theme coupling、sidebar coupling，并据此规划影响范围。
- **D-12:** 必须补回归覆盖，防止未来新增 presentation mode、focus mode、live classroom、immersive workspace、fullscreen teaching 时重新退回 route string branching。

### the agent's Discretion
- metadata 字段的精确命名、resolver 返回 DTO 的具体 shape、是否把部分展示文案/summary 一并并入 surface metadata，可由 planner 在不违背上述锁定决策的前提下收敛。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/ROADMAP.md` — Phase 19 goal, success criteria, and plan placeholders.
- `.planning/STATE.md` — Existing teacher shell, theme, and UI decisions accumulated from earlier phases and quick tasks.
- `.planning/REQUIREMENTS.md` — Project-level constraints around shells, layout safety, and theme/plugin boundaries.

### Prior phase architecture
- `.planning/phases/16-theme-plugins-and-layout-orchestration/16-CONTEXT.md` — Locked decisions for theme runtime, route registry, and teacher shell single-path architecture.
- `.planning/phases/16-theme-plugins-and-layout-orchestration/16-RESEARCH.md` — Existing route surface registry and runtime compiler recommendations.
- `.planning/phases/16-theme-plugins-and-layout-orchestration/16-03-SUMMARY.md` — How the shared teacher shell path was wired across `/teacher`, `/settings`, and `/resources`.

### Current code to extend
- `src/lib/theme-layout/route-surface-registry.ts` — Current allowlisted teacher route surface registry and route resolver.
- `src/components/shell/teacher-sidebar-shell.tsx` — Current shell renderer containing route-specific branching that must be removed.
- `src/app/(teacher)/teacher/layout.tsx` — Current teacher layout entry that resolves route surface keys.
- `src/app/settings/layout.tsx` — Secondary consumer of the shared teacher shell path.
- `src/app/(library)/resources/layout.tsx` — Secondary consumer of the shared teacher shell path.
- `src/server/themes/tokens.ts` — Current theme runtime compiler and page surface runtime shape.
- `src/lib/dto/resource-ai.ts` — Current theme layout runtime DTOs and schema contracts.
- `src/lib/dal/themes.ts` — Active theme runtime resolution path consumed by the shell.
- `src/components/shell/sidebar.tsx` — Sidebar renderer coupled to current shell variants.
- `src/components/shell/glass-nav.tsx` — Top-nav renderer coupled to current shell variants.
- `src/components/shell/teacher-sidebar-shell.test.tsx` — Existing source-guard regression coverage around teacher shell behavior.

</canonical_refs>

<specifics>
## Specific Ideas

- route metadata 可以形如：
  - `{ routeKey: "/teacher", shell: { radius: "square", width: "full", chrome: "immersive" } }`
- resolver 输出建议同时覆盖：
  - shell variant（供组件判断布局分支）
  - shell config（供样式与 structural decisions 使用）
  - surface metadata（供标题/summary/route identity 使用）
- Phase 19 final planning output需要明确：
  - 新架构图
  - route metadata schema
  - 修改影响范围
  - 是否存在未来扩展风险

</specifics>

<deferred>
## Deferred Ideas

None — current request stays within this phase scope.

</deferred>

---

*Phase: 19-teacher-shell-route-metadata-system*
*Context gathered: 2026-05-11 via plan-phase recovery*
