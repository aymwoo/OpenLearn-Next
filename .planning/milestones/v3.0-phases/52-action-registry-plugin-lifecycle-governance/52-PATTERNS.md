# Phase 52 Patterns

## Purpose

给执行 Phase 52 的后续 agent 一个最小 pattern map：当前代码里哪些文件已经证明模式成立，哪些是只能复用不能回退的边界。

## Pattern map

| Target area | Existing analog | Pattern to preserve |
|-------------|-----------------|---------------------|
| Static implementation catalog | `src/server/plugins/registry.ts` | 代码受控实现映射；可抽 descriptor，不能恢复动态 authority |
| Command producer seam | `src/features/platform-core/commands/producers/plugin-governance.ts` | producer 生成 commandId / correlationId / invalidationTags；入口层才调用 `updateTag()` |
| Governance command registration | `src/features/platform-core/commands/registry.ts` | 显式 command family；不回退到泛化 transition authority |
| Plugin DAL truth | `src/lib/dal/plugins.ts` | SQLite + DAL 持有 lifecycle、preflight、audit 真相；projection 可以新增但不能复制 mutation seam |
| Host governance adapter | `src/features/runtime-platform/host-actions/plugin-host.ts` | host path 只做 guarded adapter，不应另造并行 lifecycle authority |
| Operator lifecycle surface | `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` | tonal card、inline governance copy、preflight summary、destructive confirmation |
| Phase verifier | `scripts/verify-phase51-command-bus.ts` | 静态 guard + focused Vitest；避免 brittle 注释/字符串门禁 |

## Must-preserve guardrails

1. `src/server/plugins/registry.ts` 继续只是 static implementation catalog。  
2. blocked actions 不得进入普通 executable catalog。  
3. `mounted` / `ready` / `failed` 只能作为 internal diagnostic substrate，不能继续暴露成长期外部 vocabulary。  
4. `uninstall` 默认 retain；cleanup 必须 explicit opt-in。  
5. built-in/default plugin 复用同治理模型，但保持不可卸载。  

## Useful snippets to mirror

### Command producer seam

来自 `src/features/platform-core/commands/producers/plugin-governance.ts`：

```ts
type GovernanceProducerResult<TData = Record<string, unknown> | null> = {
  success: boolean;
  data: TData;
  commandId: string;
  attemptNumber: number;
  invalidationTags: string[];
};
```

### Static registry authority note

来自 `src/server/plugins/registry.ts`：

```ts
// Phase 50 boundary freeze: static implementation catalog only; not dynamic action authority.
```

### Runnable-state helper

来自 `src/lib/dal/plugins.ts`：

```ts
export const ACTIVE_PLUGIN_STATES = ["enabled", "mounted", "ready"] as const;

export function isRunnablePluginState(state: PluginLifecycleState) {
  return (ACTIVE_PLUGIN_STATES as readonly PluginLifecycleState[]).includes(state);
}
```

### Operator surface tone

来自 `src/components/surfaces/plugin-lifecycle-operator-surface.tsx`：

```tsx
<div className="mt-4 rounded-[1.5rem] bg-surface-container-low px-4 py-4">
```

继续遵守：Lexend、tonal surfaces、No-Line Rule、primary CTA 节制使用。
