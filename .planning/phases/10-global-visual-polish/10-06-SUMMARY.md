---
phase: 10-global-visual-polish
plan: 06
subsystem: ui
tags: [auth, classroom, ghost-focus, no-line, design-system]

# Dependency graph
requires:
  - phase: 10-02
    provides: unified-login-entry-surfaces
  - phase: 10-04
    provides: semantic-launch-form-polish
provides:
  - shared-ghost-focus-control-contract
  - auth-toggle-no-line-compliance
  - classroom-launch-no-line-compliance
affects: [auth-entry, home-login, classroom-launch]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared-ghost-focus-fields, pressed-toggle-hidden-input, tokenized-launch-selects]

key-files:
  created:
    - .planning/phases/10-global-visual-polish/10-06-SUMMARY.md
    - src/components/ui/ghost-field.ts
  modified:
    - src/app/(auth)/login/LoginForm.tsx
    - src/components/home/home-login-card.tsx
    - src/components/classroom/classroom-launch-panel.tsx

key-decisions:
  - "将 ghost-focus 输入、下拉与切换控件收敛到同一个 shared contract，避免登录与课堂 launch 再出现局部焦点漂移。"
  - "首页 remember-me 改成 aria-pressed 可见切换按钮并通过 hidden input 提交值，既去掉 checkbox 边框例外，也保留明确表单语义。"
  - "课堂 launch select 直接复用 tokenized ghost-focus field，不再保留任何本地 inset 1px outline 或自定义 RGBA focus recipe。"

patterns-established:
  - "Pattern 1: auth 与 classroom 高风险输入控件统一使用 ghost-focus shared classes，而不是每个页面内联 focus recipe。"
  - "Pattern 2: 无边框 toggle 通过 pressed visual state + hidden form field 保持可见状态与显式提交值一致。"

requirements-completed: [UI-04]

# Metrics
duration: 4 min
completed: 2026-05-07
---

# Phase 10 Plan 06: Close remaining ghost-focus and no-line interaction gaps Summary

**共享 ghost-focus 字段契约覆盖登录输入、记住我切换与课堂 launch 下拉，清除了 Phase 10 最后两处 1px/ring 交互残留。**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-06T23:09:49Z
- **Completed:** 2026-05-06T23:13:49Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- 新增 `ghost-field.ts`，把文本输入、select 与 toggle 的 ghost-focus 样式收敛为共享 contract。
- 登录页与首页登录卡统一复用 shared auth field，并把 remember-me 改成无边框 pressed toggle。
- 课堂 launch 下拉移除本地 1px inset outline 与自定义 focus recipe，回到同一套 tokenized no-line 语言。

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the shared ghost-focus control contract and remove the login checkbox exception** - `03e8c30` (feat)
2. **Task 2: Rewire classroom launch fields to the shared no-line field treatment** - `fe080c9` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/components/ui/ghost-field.ts` - 导出共享 ghost-focus text/select/toggle class contract。
- `src/app/(auth)/login/LoginForm.tsx` - 改为 canonical shared ghost text field consumer。
- `src/components/home/home-login-card.tsx` - 用 pressed toggle + hidden input 替换 remember-me checkbox 边框例外。
- `src/components/classroom/classroom-launch-panel.tsx` - 两个 launch select 改为 shared ghost select field。

## Decisions Made

- 用 shared class contract 解决 D-03 / D-04 的局部交互漂移，而不是继续在页面里复制内联 class string。
- remember-me 保持 semantic state 明确可见，采用 `aria-pressed` 和 hidden input 一起满足可见性与提交一致性。
- launch form 继续保留唯一主 CTA 和语义错误样式，只替换局部 field emphasis 实现。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 10 剩余的 ghost-focus / no-line blocker 已清理，可重新验证 `UI-04` 的全局视觉一致性。
- 后续如果新增 auth 或 launch 类表单，可直接复用 `ghost-field.ts`，避免再次引入 1px outline 漂移。

## Self-Check: PASSED

- Found summary file: `.planning/phases/10-global-visual-polish/10-06-SUMMARY.md`
- Found commit: `03e8c30`
- Found commit: `fe080c9`
