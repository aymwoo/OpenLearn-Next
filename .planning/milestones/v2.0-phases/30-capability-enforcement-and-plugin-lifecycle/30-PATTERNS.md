# Phase 30 Patterns

## File analog map

| Target area | Closest analog | Pattern to reuse |
|---|---|---|
| Runtime host governance gate | `src/features/runtime-platform/host-actions/guards.ts` | server resolves trusted actor first, then validates requested operation |
| Runtime action concentration | `src/features/runtime-platform/host-actions/runtime-host.ts` | one shared gateway owns all runtime verbs |
| Plugin denied audit | `src/lib/dal/plugins.ts` | denied path writes audit before returning null or refusal |
| Manifest truth ownership | `src/lib/dto/resource-ai.ts` + `src/lib/dal/plugins.ts` | school-scoped `manifestJson` remains the package truth |
| Durable latest + history model | `src/features/runtime-platform/classroom/runtime-session.ts` | current latest record plus append-only history |
| Phase verifier pattern | `scripts/verify-phase28-runtime-bridge.ts` | static guards plus focused tests behind one `verify:phaseN` entry |

## Concrete excerpts to mirror

### 1. Guard wrapper stays the only host action entry

```ts
export function createGuardedHostAction<TInput extends z.ZodTypeAny, TOutput>({
  inputSchema,
  actorScopes,
  requiredPermission,
  resolveActor,
  execute,
}: GuardWrapperOptions<TInput, TOutput>) {
  return async (input: z.input<TInput>) => {
    const parsedTrustedContext = GuardedHostActionContextSchema.parse({
      actor: await resolveActor(),
    });
    const parsedInput = inputSchema.parse(input);
    ...
  };
}
```

Phase 30 必须把 capability 与 lifecycle decision 叠加在这条路径上，而不是
再起一条新的 host dispatch 入口。

### 2. Runtime verbs should keep one gateway

```ts
export const invokeRuntimeHostAction = createGuardedHostAction({
  inputSchema: RuntimeHostRequestSchema,
  execute: async ({ actor, input }) => { ... },
});
```

所有 runtime host verb 的 capability gate、reason code、audit 写入都应该在
这一共享 gateway 收口。

### 3. Plugin denied path already has a reusable audit posture

```ts
await createPluginAudit(
  input.pluginId,
  input.action,
  {
    ...input.payload,
    denied: true,
    reason: input.reason,
  },
  input.actorId,
);
```

Phase 30 应该把 runtime allowed / denied 也提升到等价的治理语义，而不是让
 plugin 和 runtime 各写各的格式。

### 4. Current plugin manifest stays school-scoped

```ts
export const PluginManifestSchema = z.object({
  id: z.string(),
  version: z.string(),
  permissions: z.array(z.string()).default([]),
  anchors: z.array(PluginHookAnchorSchema),
  actions: z.array(PluginActionSchema),
  ...
});
```

manifest v2 应在现有 `PluginManifestSchema` / `manifestJson` 路径上升级，而不
是引入第二套 registry truth。

### 5. Built-in HTML runtime already proves local runtime descriptor freeze

```ts
runtime: {
  kind: "html-courseware",
  entry: {
    sandbox: "iframe",
    bootstrap: "/runtime/html-courseware/pilot",
  },
  requestedCapabilities: [
    "runtime:ready",
    "runtime:event:emit",
    "runtime:state:save",
    "runtime:submission:create",
  ],
}
```

Phase 30 不应改变 `payload.runtime` freeze posture，只需要把 plugin manifest 与
host gate 升级到同一治理语言。

### 6. Latest-plus-history persistence is already established

```ts
await tx.update(taskSubmissions).set({ isLatest: false }).where(...);
await tx.insert(taskSubmissions).values({ ..., isLatest: true });
```

Lifecycle state 建议沿用同样思路：current state 可直读，transition log 追加
保留完整治理轨迹。

### 7. Phase verifier pattern should remain code-anchored

```ts
"verify:phase28": "tsx scripts/verify-phase28-runtime-bridge.ts"
```

Phase 30 也应采用单一 `verify:phase30` 入口，组合静态 drift guard 与 focused
governance tests。
