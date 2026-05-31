---
phase: 20-help-center-and-developer-guides
plan: 03
subsystem: help-center-actions-and-verification
tags: [help-center, actions-guide, proposal-only, verifier, tests]
requires:
  - phase: 20-help-center-and-developer-guides
    provides: help route family, overview surface, shared detail template, plugin/theme guides
provides:
  - actions/interfaces guide grounded in current schedule extension contracts
  - finalized teacher-help overview content
  - overview surface regression tests
  - dedicated verify:phase20 command
affects: [help-center, schedule-extensions, verification]
tech-stack:
  added: []
  patterns: [proposal-only help docs, phase verifier, semantic surface tests]
key-files:
  created:
    - .planning/phases/20-help-center-and-developer-guides/20-03-SUMMARY.md
    - src/components/surfaces/help-center-overview-surface.test.tsx
    - scripts/verify-phase20-help-center.ts
  modified:
    - src/lib/help/help-center-content.ts
    - package.json
key-decisions:
  - "`/help/actions-interfaces` 只记录当前已开放的插件、主题与 schedule 扩展边界，不扩写成全系统 API 目录。"
  - "schedule 扩展文案继续以 `proposal-only` 为硬边界，明确禁止 direct runtime schedule write 叙事。"
  - "帮助中心 drift 通过 `verify:phase20` 和 help surface 语义测试一起守住，而不是依赖人工复查。"
patterns-established:
  - "Pattern 7: 产品内帮助中心需要 phase-specific verifier 来同时校验 route metadata、shell path、关键文案边界和目标测试套件。"
requirements-completed: [Extension phase — product help center and developer-facing implementation guidance.]
duration: unknown
completed: 2026-05-11
---

# Phase 20 Plan 03: Actions/interfaces and verification summary

**`/help/actions-interfaces` 已收口为 proposal-only 的 schedule 扩展指南，帮助中心首页教师区保持轻量无代码，同时补上了 `verify:phase20` 护栏。**

## Performance

- **Duration:** unknown
- **Completed:** 2026-05-11
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- 扩写 `src/lib/help/help-center-content.ts` 中的 actions/interfaces 指南，补齐“为什么只写这些接口”“当前可用”“运行语义”“最小示例”“使用边界”“后续扩展”六段结构。
- actions/interfaces 页现在明确写出 `schedule.assistant`、`createScheduleOverrideProposal`、`createScheduleReminderDraft`、`annotateScheduleConflict`，并把 `proposal-only` 作为当前 schedule 扩展的硬边界。
- 首页教师帮助区继续保持面向产品入口的轻量说明，不增加代码块或开发者 contract 解释。
- 新增 `src/components/surfaces/help-center-overview-surface.test.tsx`，对首页分流、开发者入口与“教师区无代码示例”约束增加语义测试。
- 新增 `scripts/verify-phase20-help-center.ts` 并在 `package.json` 注册 `verify:phase20`，统一校验 `/help` route metadata、shell 包装、三张详细页存在性、关键文案边界与 help surface 测试套件。

## Task Commits

No commit was created in this execution. The plan changes remain in the working tree.

## Files Created/Modified

- `src/lib/help/help-center-content.ts` - 补齐 actions/interfaces 正文、proposal/result 示例与更明确的边界说明。
- `src/components/surfaces/help-center-overview-surface.test.tsx` - 首页 teacher/developer split 与无代码教师区回归测试。
- `scripts/verify-phase20-help-center.ts` - Phase 20 专用验证脚本。
- `package.json` - 注册 `verify:phase20`。

## Decisions Made

- actions/interfaces 页继续只覆盖插件、主题与 schedule 扩展接口，不把内部 helper 或全系统 DAL 暴露成公开文档面。
- overview 测试直接断言教师区没有代码块和 `pre`，避免未来把开发者示例误塞回首页教师模块。
- verifier 采用与 `verify:phase19` 一致的 `StaticCheck + runPnpm()` 模式，保持仓库内 phase verifier 形态一致。

## Deviations from Plan

- 无功能性偏离；仅在 actions/interfaces 页额外补了一段“为什么只写这些接口”的导语，帮助读者理解帮助中心的边界而不是误以为内容缺失。

## Issues Encountered

- 无阻塞问题；现有 `/help` 路由和 detail template 已足够承接 Wave 3 的内容与验证护栏。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 20 三个 plan 已全部具备实现与验证文件，后续只需在真实 contract 变化时同步更新帮助内容并重跑 `pnpm verify:phase20`。
- 如果未来新增 hook、action 或 theme runtime 入口，应先更新 verifier 和语义测试，再扩帮助中心文案。

## Self-Check: PASSED

- Verified `pnpm test --run src/components/surfaces/help-center-overview-surface.test.tsx src/components/surfaces/help-guide-detail-surface.test.tsx`
- Verified `pnpm verify:phase20`
- Verified `pnpm typecheck`

---

*Phase: 20-help-center-and-developer-guides*
*Completed: 2026-05-11*
