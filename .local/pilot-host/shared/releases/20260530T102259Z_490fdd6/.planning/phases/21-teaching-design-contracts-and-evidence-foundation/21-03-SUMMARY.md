---
phase: 21-teaching-design-contracts-and-evidence-foundation
plan: 03
subsystem: ui
tags: [teaching-design, verifier, classroom-launch, teacher-preview, vitest]
requires:
  - phase: 21-teaching-design-contracts-and-evidence-foundation
    provides: teaching-design fallback DTO markers and durable classroom evidence actions
provides:
  - teacher-facing fallback cues across editor, teacher preview, and launch preview
  - dedicated verify:phase21 contract guard for fallback wording and evidence wiring
  - regression coverage that keeps launch flow bound to published snapshots
affects: [teacher-editor, teacher-preview, teacher-launch, phase-verifier]
tech-stack:
  added: []
  patterns: [teacher-visible inferred metadata cues, phase-specific verifier with static and targeted test gates]
key-files:
  created: [.planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-03-SUMMARY.md, scripts/verify-phase21-contracts.ts]
  modified: [src/components/authoring/lesson-authoring-workspace.tsx, src/components/authoring/lesson-authoring-workspace.test.tsx, src/components/surfaces/teacher-lesson-preview-surface.tsx, src/components/classroom/classroom-launch-preview.tsx, src/components/classroom/classroom-launch-panel.test.tsx, package.json]
key-decisions:
  - "teaching-design fallback 提示继续只停留在教师 editor、教师预览和开课预览，不引入学生端泄漏或 launch blocking。"
  - "verify:phase21 同时检查 teacher-facing cue、evidence wiring、cache invalidation 与 unsafe shortcut，避免只靠单点字符串守卫。"
patterns-established:
  - "Teacher fallback disclosure: inferred teaching design must render 默认推断/待完善 copy instead of伪装成显式配置。"
  - "Phase verifier pattern: static contract checks plus targeted Vitest suites form the final local/CI safety gate."
requirements-completed: [ORCH-01, EVAL-03]
duration: 37 min
completed: 2026-05-12
---

# Phase 21 Plan 03: Teaching design teacher-facing fallback summary

**教师现在能在 editor、教师预览与开课预览中看到诚实的 teaching-design 默认推断提示，并通过 `verify:phase21` 锁定 fallback 与 classroom evidence 合同。**

## Performance

- **Duration:** 37 min
- **Started:** 2026-05-12T14:33:00Z
- **Completed:** 2026-05-12T15:10:16Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- 为教师 editor、教师预览、开课预览统一补上“默认推断 / 待完善”提示，避免旧课时被伪装为已完整配置。
- 在开课预览中明确保留“继续按 published snapshot 启动”的非阻断说明，并展示 evidence expectation 摘要。
- 新增 `verify:phase21`，把 teacher-facing cue、classroom evidence wiring、cache invalidation 与 unsafe shortcut 一起纳入 phase gate。

## Task Commits

Each task was committed atomically:

1. **Task 1: 在教师 editor / preview / launch preview 中显式呈现 teaching-design fallback 提示** - `31772de` (test), `49b8a5c` (feat)
2. **Task 2: 新增 `verify:phase21` 验证脚本守住 fallback 提示、evidence wiring 与安全边界** - `f989896` (feat)

## Files Created/Modified

- `src/components/authoring/lesson-authoring-workspace.tsx` - 在流程卡片里显示 inferred/refinement badge 与 fallback 说明。
- `src/components/authoring/lesson-authoring-workspace.test.tsx` - 为 editor fallback cue 与 teacher preview wording 增加 focused regression。
- `src/components/surfaces/teacher-lesson-preview-surface.tsx` - 在教师预览中显示默认推断说明与待完善状态。
- `src/components/classroom/classroom-launch-preview.tsx` - 在开课预览中加入非阻断 fallback cue 与 evidence summary。
- `src/components/classroom/classroom-launch-panel.test.tsx` - 断言 launch preview cue 存在且真正使用 publishedVersionId 启动课堂。
- `scripts/verify-phase21-contracts.ts` - 新增 Phase 21 专属 verifier。
- `package.json` - 注册 `verify:phase21` 命令。

## Decisions Made

- fallback 提示统一使用简体中文“默认推断 / 待完善”，并保留“当前仍可继续编辑与发布 / 不阻断开课”的诚实语义。
- launch preview 的安全证明不只验证 copy，还要验证 launch action 继续传入 publishedVersionId。
- phase verifier 继续沿用 static checks + targeted Vitest suites 组合，而不是手工 checklist。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 修正 phase verifier 对 schema 表名的静态匹配**
- **Found during:** Task 2
- **Issue:** `verify:phase21` 初版把 `sqliteTable("classroomEvidence"` 当成匹配串，导致真实存在的 `classroomEvidence` / `classroomTimeline` 被误报缺失。
- **Fix:** 改为检查 schema 中的真实表名字面量，保持 verifier 与当前 Drizzle 写法一致。
- **Files modified:** `scripts/verify-phase21-contracts.ts`
- **Verification:** `pnpm verify:phase21`
- **Committed in:** `f989896`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 仅修正 verifier 自身的误报，不影响计划范围，且保证 phase gate 真实可执行。

## Issues Encountered

- 仓库执行前已存在大量 staged 改动，普通 `git commit` 会把无关文件一并提交。执行中改为 `git commit --only -- <files>`，确保本计划仍按任务原子提交。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 21 的 teacher-facing fallback disclosure 已完整落地，后续 Phase 22 可以直接在 orchestration/readiness surface 上决定哪些 inferred 状态需要升级为 blocking gate。
- `verify:phase21` 已就位，后续若删除教师提示、破坏 evidence action wiring 或回退 cache invalidation，会直接失败。

## Self-Check: PASSED

- Verified `.planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-03-SUMMARY.md` exists.
- Verified commits `31772de`, `49b8a5c`, and `f989896` exist in git history.

---

*Phase: 21-teaching-design-contracts-and-evidence-foundation*
*Completed: 2026-05-12*
