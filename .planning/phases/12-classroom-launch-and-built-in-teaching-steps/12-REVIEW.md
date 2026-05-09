---
phase: 12-classroom-launch-and-built-in-teaching-steps
reviewed: 2026-05-09T01:00:23Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/actions/plugin-actions.ts
  - src/app/settings/plugins/page.tsx
  - src/components/surfaces/plugin-marketplace-surface.tsx
  - src/components/surfaces/settings-surface.tsx
  - src/components/surfaces/settings-surface.test.tsx
  - scripts/verify-phase12-launch-and-builtins.ts
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-05-09T01:00:23Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

本次只读复审聚焦此前唯一 blocker 和 marketplace warning。

- **此前 blocker 已解决**：`plugin-marketplace-surface.tsx:15-23`、
  `settings-surface.tsx:49-53`、`settings-surface.tsx:194-202`
  的表单 wrapper 现在都已显式声明 `'use server'`，未再发现该问题。
- **marketplace warning 未完全解决**：release gate 仍未覆盖 marketplace
  启停动作的真实提交行为，因此本次结论不是 no findings。

## Warnings

### WR-01: marketplace 回归仍未验证启停表单是否真正触发 Server Action

**Classification:** WARNING

**File:** `scripts/verify-phase12-launch-and-builtins.ts:44-47`, `src/components/surfaces/settings-surface.test.tsx:59-67`

**Issue:** `verify:phase12` 对 marketplace 仍只执行
`settings-surface.test.tsx`；该测试现在会真实渲染
`PluginMarketplaceSurface`，但只断言卡片文案和按钮存在，没有提交表单，
也没有断言 `setPluginEnabledAction` 被调用。因此它仍无法拦截
marketplace 启停链路失效、表单参数错误或 action 未触发这类运行时回归。

**Fix:** 为 marketplace 增加行为级测试：提交“停用环节/重新启用”按钮，
并断言 `setPluginEnabledAction` 以正确 `pluginId`、`schoolId`、`enabled`
 参数被调用；然后把该测试纳入 `verify:phase12`。

```ts
it("submits marketplace toggle action", async () => {
  render(await PluginMarketplaceSurface())

  const form = screen.getByRole("button", { name: "停用环节" }).closest("form")
  expect(form).toBeTruthy()

  fireEvent.submit(form!)

  await waitFor(() => {
    expect(setPluginEnabledAction).toHaveBeenCalledWith({
      pluginId: "plugin-1",
      schoolId: "school-1",
      enabled: false,
    })
  })
})
```

---

_Reviewed: 2026-05-09T01:00:23Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
