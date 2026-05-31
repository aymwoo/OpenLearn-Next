---
phase: 48-lifecycle-and-uninstall-semantics
reviewed: 2026-05-20T23:10:07Z
depth: deep
files_reviewed: 7
files_reviewed_list:
  - src/lib/dal/plugins.ts
  - src/actions/plugin-actions.ts
  - src/components/surfaces/settings-surface.tsx
  - src/components/surfaces/plugin-marketplace-surface.tsx
  - src/components/surfaces/plugin-lifecycle-operator-surface.tsx
  - scripts/verify-phase48-lifecycle-and-uninstall.ts
  - package.json
findings:
  critical: 2
  warning: 2
  info: 0
  total: 4
status: issues_found
---

# Phase 48: Code Review Report

**Reviewed:** 2026-05-20T23:10:07Z  
**Depth:** deep  
**Files Reviewed:** 7  
**Status:** issues_found

## Summary

本次评审聚焦 Phase 48 的 DAL、Server Actions、Settings/Labs UI 与 close gate。
结论：存在 2 个必须修复的行为回归风险，以及 2 个会掩盖故障或制造假失败的稳健性问题。

## Critical Issues

### CR-01: **BLOCKER** 成功执行生命周期操作后，Labs 面板不会刷新，界面持续显示旧状态

**File:** `src/components/surfaces/plugin-lifecycle-operator-surface.tsx:94-186`  
**Related:** `src/components/surfaces/settings-surface.tsx:406-410`

**Issue:**
`PluginLifecycleOperatorSurface` 的展示数据完全来自服务端传入的 `plugins` prop，但 `submitToggle`、`submitKillSwitch`、`confirmUninstall` 成功后只处理错误，不会 `router.refresh()`，也没有本地 optimistic state 更新。这样会导致启用/停用/挂起/卸载成功后界面仍显示旧 posture、旧按钮和旧插件卡片。对卸载场景尤其危险：用户会看到插件仍存在并重复触发 destructive action。

**Fix:**
```tsx
import { useRouter } from "next/navigation";

const router = useRouter();

startTransition(async () => {
  const result = await uninstallPluginAction({ pluginId: dialogPlugin.id, schoolId });
  if (!result.success) {
    setInlineError((current) => ({ ...current, [dialogPlugin.id]: result.error ?? "PLUGIN_DELETE_FAILED" }));
    return;
  }

  closeDialog();
  router.refresh();
});
```
或改为维护本地 `plugins` state，并在成功后同步更新/移除对应项。

### CR-02: **BLOCKER** kill switch 恢复路径破坏 mounted/ready 语义，并错误回写 `enabled`

**File:** `src/lib/dal/plugins.ts:519-534`

**Issue:**
`setPluginKillSwitch()` 在关闭 kill switch 时：

- 如果当前状态是 `suspended`，总是恢复到 `enabled`，会丢失此前的 `mounted` / `ready` posture；
- 写库时使用 `enabled: targetState === "enabled"`，这会把任何非 `enabled` 的 runnable posture 都写成 `enabled: false`。

这与本 phase 要求的 “mounted / ready 属于 active/runnable posture” 直接冲突，也会让恢复后的插件语义退化，甚至让 `mounted` / `ready` 状态与 `enabled` 布尔值再次漂移。

**Fix:**
```ts
const targetState = input.killSwitchEnabled
  ? "suspended"
  : restorePreviousRunnableState(plugin); // 需要持久化上一次 runnable state

const [record] = await db
  .update(pluginRegistrations)
  .set({
    killSwitchEnabled: input.killSwitchEnabled,
    enabled: isRunnablePluginState(targetState),
    lifecycleState: targetState,
    updatedAt: new Date(),
  })
```
至少要先把 `enabled` 改为 `isRunnablePluginState(targetState)`；完整修复还需要在挂起时记录恢复前 posture，并在解除挂起时恢复原状态，而不是硬编码成 `enabled`。

## Warnings

### WR-01: **WARNING** 插件列表加载失败会被静默伪装成“空列表”

**File:** `src/components/surfaces/settings-surface.tsx:407-410`  
**Related:** `src/components/surfaces/plugin-marketplace-surface.tsx:14-15`

**Issue:**
两处 surface 都把 `listPluginsAction()` 的失败结果直接降级为 `[]`。这会把鉴权失败、DAL 异常、回归缺陷伪装成“当前没有插件”，让 operator 无法区分真实空态和系统故障，也会削弱 close gate 对行为回归的可观测性。

**Fix:**
```tsx
if (!pluginResult.success) {
  return <p className="text-sm text-on-error-container">插件列表加载失败：{pluginResult.error}</p>;
}

const plugins = pluginResult.data ?? [];
```
至少应显示显式错误；更好的是抛给错误边界或专用 error surface。

### WR-02: **WARNING** Phase 48 verifier 通过源码字符串精确匹配 `package.json`，会产生脆弱假失败

**File:** `scripts/verify-phase48-lifecycle-and-uninstall.ts:61-70`

**Issue:**
`verifyPackageScript()` 依赖 `packageSource.includes(exactString)`。只要脚本命令发生无害重排（例如空格、参数顺序、换成等价调用包装），verifier 就会误报失败。close gate 本应验证行为，但这里仍保留了非常脆弱的字符串证明路径。

**Fix:**
```ts
const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
const command = pkg.scripts?.[`verify:phase${phase}`];

return typeof command === "string"
  && command.includes(`scripts/verify-phase${phase}`)
  && command.includes("--import tsx");
```
应改为解析 `package.json` 后做语义级校验，而不是全文字符串包含判断。

---

_Reviewed: 2026-05-20T23:10:07Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: deep_
