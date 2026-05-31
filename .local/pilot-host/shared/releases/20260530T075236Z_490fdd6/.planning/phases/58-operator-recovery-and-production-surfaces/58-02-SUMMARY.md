---
phase: 58-operator-recovery-and-production-surfaces
plan: "02"
subsystem: ui
tags: [operator, recovery, nextjs, server-actions, command-detail, classroom]
requires:
  - phase: 58-operator-recovery-and-production-surfaces/58-01
    provides: classroom incident read model, stable incident truth, command detail DTO inputs
provides:
  - stable incident landing route for classroom shell/operator drill-down
  - stable command detail route and summary-first command surface
  - audited high-risk posture recovery server action entrypoint
  - detail-view confirmation flow for resume, suspend, and fallback actions
affects: [operator-surfaces, classroom-shell, plugin-governance, command-observability]
tech-stack:
  added: []
  patterns: [detail-view high-risk confirmation, server-owned recovery seams, explicit cache invalidation after mutation]
key-files:
  created: [src/actions/operator-posture-recovery-actions.ts, src/actions/operator-posture-recovery-actions.test.ts]
  modified: [src/app/settings/labs/incidents/[sessionId]/page.tsx, src/app/settings/labs/commands/[commandId]/page.tsx, src/components/classroom/classroom-control-panel.tsx, src/components/classroom/classroom-control-panel.test.tsx, src/components/surfaces/platform-command-operator-detail-surface.tsx, src/components/surfaces/platform-command-operator-detail-surface.test.tsx, src/components/surfaces/plugin-lifecycle-operator-surface.tsx, src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx]
key-decisions:
  - "高风险姿态恢复只允许在 detail view 内确认，classroom shell 只做导流与轻量恢复。"
  - "plugin fallback 复用 kill-switch server-owned seam，而不是新增旁路 mutation。"
  - "Server Action 同时承担 updateTag 与 revalidatePath，保证 detail/read-model 页面 read-your-own-writes。"
patterns-established:
  - "Pattern: 高风险动作保持可见，但通过 disabled + reason 或确认层表达可执行边界。"
  - "Pattern: command detail 保留 summary-first rhythm，同时承接 operator mutation confirmation。"
requirements-completed: [OPS-01, OPS-03, PLUG-03]
duration: 10min
completed: 2026-05-26
---

# Phase 58 Plan 02: Operator recovery and production surfaces Summary

**稳定 classroom incident/command 下钻，并把 resume、suspend、fallback 收敛到 detail-view 强确认与 audited Server Action。**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-26T11:41:38+08:00
- **Completed:** 2026-05-26T11:51:19+08:00
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- 补齐 `/settings/labs/incidents/[sessionId]` 与 `/settings/labs/commands/[commandId]` 稳定落点，classroom shell 不再依赖 Labs 内联状态。
- 为 command detail 与 plugin lifecycle surface 增加 `resume` / `suspend` / `fallback` 二次确认层，固定展示 `影响范围`、`姿态变化`、`将写入的审计记录`。
- 新增 `operator-posture-recovery-actions`，复用 plugin/classroom 既有 server-owned seams，并承担 `updateTag()` 与 `revalidatePath()`。

## Task Commits

Each task was committed atomically:

1. **Task 1: 先补稳定 landing route，再抽出 command detail route** - `c8ca3ce` (feat)
2. **Task 2: 在 detail surfaces 实现高风险恢复动作的强确认与 audited Server Action 接线** - `5d9a6c7` (feat)
3. **Task 3: 收紧 classroom shell recovery quick path 并升级 incident CTA** - `c8ca3ce` (feat, 与 Task 1 同次原子提交完成)

**Plan metadata:** 未提交（按当前约束不更新 `STATE.md` / `ROADMAP.md`，仅写入 summary）

## Files Created/Modified
- `src/actions/operator-posture-recovery-actions.ts` - 新增 operator 高风险姿态恢复 Server Action 入口，统一接 plugin/classroom recovery seam 与缓存失效。
- `src/actions/operator-posture-recovery-actions.test.ts` - 覆盖 plugin resume/fallback、classroom suspend 与失败路径。
- `src/components/surfaces/platform-command-operator-detail-surface.tsx` - 新增 detail-view 高风险确认 host 与 command summary/timeline 一体化呈现。
- `src/components/surfaces/platform-command-operator-detail-surface.test.tsx` - 覆盖确认层、disabled+reason、summary/timeline 回归。
- `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` - 将 resume/fallback 收敛到 detail confirm，不再直接裸触发。
- `src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` - 覆盖 detail confirm 行为与 action payload。
- `src/components/classroom/classroom-control-panel.tsx` - 固定 incident CTA、honesty 三段口径、移除 shell 内高风险 quick path。
- `src/components/classroom/classroom-control-panel.test.tsx` - 覆盖 CTA 升级、honesty 文案与高风险动作导流。

## Decisions Made
- 高风险动作不在 classroom shell 或 diagnostics summary 中直接执行，必须跳到 detail view 二次确认。
- plugin `fallback` 不新增新 command type，直接复用 `plugin.kill_switch.set` 作为 audited fallback posture。
- command detail 页允许承接 operator mutation confirm，但仍保持 summary-first，而不是退化为控制台式 dense log 页面。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] 为高风险恢复补齐显式缓存失效**
- **Found during:** Task 2 (high-risk recovery action wiring)
- **Issue:** 仅调用底层 seam 不足以保证 command/plugin detail route 立刻读到最新状态。
- **Fix:** 在 `operator-posture-recovery-actions` 中统一执行 `updateTag()` 与 `revalidatePath()`。
- **Files modified:** `src/actions/operator-posture-recovery-actions.ts`
- **Verification:** `pnpm exec vitest --run src/actions/operator-posture-recovery-actions.test.ts ...`
- **Committed in:** `5d9a6c7`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** 属于保证 detail route read-your-own-writes 的必要补充，无额外 scope creep。

## Issues Encountered
- Context7 MCP API key 不可用；按执行规范改用 `ctx7` CLI fallback 获取 Next.js 16 `updateTag` / `revalidatePath` 文档。
- GitNexus 无法解析 `PluginLifecycleOperatorSurface` / `PlatformCommandOperatorDetailSurface` 精确 symbol，改为记录 `UNKNOWN` 风险并继续在文件级做最小修改。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 58-03 可以在现有稳定 incident landing route 之上扩展完整 summary-first incident surface。
- 高风险动作的 server-owned confirm boundary 已建立，后续只需扩展 DTO/read model，而不必回头改 mutation contract。

## Self-Check: PASSED

- FOUND: `.planning/phases/58-operator-recovery-and-production-surfaces/58-02-SUMMARY.md`
- FOUND: `c8ca3ce`
- FOUND: `5d9a6c7`
