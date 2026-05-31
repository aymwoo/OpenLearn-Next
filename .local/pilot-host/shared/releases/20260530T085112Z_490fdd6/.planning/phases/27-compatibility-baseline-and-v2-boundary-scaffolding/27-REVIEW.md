---
phase: 27-compatibility-baseline-and-v2-boundary-scaffolding
reviewed: 2026-05-15T15:23:59Z
depth: deep
files_reviewed: 46
files_reviewed_list:
  - package.json
  - scripts/verify-phase27-runtime-platform.ts
  - scripts/verify-phase3-authoring.ts
  - scripts/verify-phase5-classroom.ts
  - src/app/(teacher)/teacher/editor/page.tsx
  - src/app/(teacher)/teacher/launch/page.tsx
  - src/app/(classroom)/classroom/page.tsx
  - src/app/(student)/student/player/page.tsx
  - src/app/(teacher)/teacher/editor/page.test.tsx
  - src/app/(teacher)/teacher/launch/page.test.tsx
  - src/app/(classroom)/classroom/page.test.tsx
  - src/app/(student)/student/player/page.test.tsx
  - src/features/runtime-platform/index.ts
  - src/features/runtime-platform/shared/boundary-map.ts
  - src/features/runtime-platform/authoring/index.ts
  - src/features/runtime-platform/launch/index.ts
  - src/features/runtime-platform/classroom/index.ts
  - src/features/runtime-platform/player/index.ts
  - src/features/runtime-platform/plugins/index.ts
  - src/features/runtime-platform/contracts/version.ts
  - src/features/runtime-platform/contracts/bridge.ts
  - src/features/runtime-platform/contracts/events.ts
  - src/features/runtime-platform/contracts/permissions.ts
  - src/features/runtime-platform/contracts/descriptors.ts
  - src/features/runtime-platform/contracts/index.ts
  - src/features/runtime-platform/contracts/contracts.test.ts
  - src/features/runtime-platform/seams/index.ts
  - src/features/runtime-platform/seams/database/contract.ts
  - src/features/runtime-platform/seams/database/sqlite-adapter.ts
  - src/features/runtime-platform/seams/event-bus/contract.ts
  - src/features/runtime-platform/seams/event-bus/default-adapter.ts
  - src/features/runtime-platform/seams/transport/contract.ts
  - src/features/runtime-platform/seams/transport/sse-adapter.ts
  - src/features/runtime-platform/seams/seams.test.ts
  - src/features/runtime-platform/host-actions/guards.ts
  - src/features/runtime-platform/host-actions/runtime-host.ts
  - src/features/runtime-platform/host-actions/plugin-host.ts
  - src/features/runtime-platform/host-actions/guards.test.ts
  - src/lib/dal/classroom.ts
  - src/lib/dal/learning.ts
  - src/lib/dal/lesson-authoring.ts
  - src/components/learning/classroom-runtime-client.tsx
  - src/components/surfaces/player-surface.tsx
  - src/components/surfaces/classroom-console-surface.tsx
  - src/lib/dto/classroom.ts
  - src/lib/dto/learning.ts
findings:
  critical: 2
  warning: 2
  info: 0
  total: 4
status: issues_found
---

# Phase 27: Code Review Report

**Reviewed:** 2026-05-15T15:23:59Z  
**Depth:** deep  
**Files Reviewed:** 46  
**Status:** issues_found

## Summary

本次 review 重点检查了 Phase 27 的 compatibility gate、runtime-platform boundary、contracts/seams 纯度，以及 host-action 安全边界。

结论：主链 scaffold 基本成形，但当前 **安全门会误报通过**，且新增 host-action guard **实际上信任来路不明的 actor/permission 输入**，这两个问题都直接削弱了本阶段最核心的“fail loudly + boundary purity”目标。

## Critical Issues

### CR-01: `verify:phase27` 会在 boundary 已泄漏时仍然通过

**Classification:** BLOCKER  
**File:** `scripts/verify-phase27-runtime-platform.ts:56-61`  
**Related:** `src/app/(teacher)/teacher/editor/page.tsx:7-10`

**Issue:**
Phase 27 的 canonical gate 只检查 route 是否“包含” `@/features/runtime-platform/*` import，
但没有检查是否仍然保留 `@/lib/dal/*` 深层依赖。结果是 gate 会报告
“route consumers import runtime-platform public barrels”，但 `editor/page.tsx`
仍直接依赖 `@/lib/dal/themes` 和 `@/lib/dal/plugins`，boundary purity 已经破坏却不会 fail。

**Fix:**
同时检查“存在新边界 import”与“禁止旧 deep import”，并把这两个能力收进
`runtime-platform` public API。

```ts
const routeSources = [editorPage, launchPage, classroomPage, playerPage];

const hasOnlyApprovedRouteImports = routeSources.every((source) =>
  !source.includes("@/lib/dal/") && !source.includes("@/actions/")
);

if (!hasOnlyApprovedRouteImports) {
  failPhase27Boundary("route consumers still use legacy deep imports");
}
```

##

### CR-02: host-action “guard” 信任调用方自带的 actor / permission，授权可伪造

**Classification:** BLOCKER  
**File:** `src/features/runtime-platform/host-actions/guards.ts:55-61`

**Issue:**
`createGuardedHostAction()` 直接从入参解析 `envelope.actor`，然后基于同一个
调用方提供的 `hostPermissions`、`actorScope`、`schoolId` 做授权判断。也就是说，
调用者只要自己构造一个带有 `host:classroom:control` 或
`host:plugin:lifecycle:read` 的 actor 对象，就能绕过 guard。

这不是 guard，只是“校验调用方伪造的数据长得像不像”。对后续 runtime host /
plugin host 来说，这是实质性的授权绕过风险。

**Fix:**
不要从 envelope 接受可信 actor。应从服务端认证上下文、已校验 session，或签名过的
bridge token 中派生 actor，再只让调用方提交业务 input。

```ts
type TrustedActorContext = {
  actor: SchoolScopedActorConstraint;
};

export function createGuardedHostAction<TInput extends z.ZodTypeAny, TOutput>(...) {
  return async (input: z.input<TInput>, trusted: TrustedActorContext) => {
    const actor = trusted.actor;
    const parsedInput = inputSchema.parse(input);

    assertActorScope(actor, actorScopes);
    assertSchoolScope(actor);
    assertPermission(actor, requiredPermission);

    return execute({ actor, input: parsedInput });
  };
}
```

## Warnings

### WR-01: runtime/plugin host actions 对未实现分支返回成功，掩盖缺失实现

**Classification:** WARNING  
**File:** `src/features/runtime-platform/host-actions/runtime-host.ts:12-40`  
**Related:** `src/features/runtime-platform/host-actions/plugin-host.ts:6-35`

**Issue:**
`runtime-host` 暴露了 `snapshot` / `deliver-transport`，但实际只实现了
`deliver-transport`；`plugin-host` 暴露了 `publish-event` / `read-lifecycle`，
但实际只实现了 `publish-event`。两个文件都会在未执行任何真实动作时返回
`{ ok: true }`。

这会把“功能未实现”伪装成“调用成功”，后续接入时很容易把集成缺失静默吞掉。

**Fix:**
对未实现 action 明确抛出 `HOST_ACTION_UNSUPPORTED`，直到真实行为落地。

```ts
switch (input.action) {
  case "deliver-transport":
    await sseRuntimeTransportAdapter.deliver(...);
    break;
  default:
    throw new Error("HOST_ACTION_UNSUPPORTED");
}
```

### WR-02: student player 把所有加载异常都吞成“课时暂不可学习”

**Classification:** WARNING  
**File:** `src/app/(student)/student/player/page.tsx:47-58`

**Issue:**
`StudentPlayerPage` 对整个加载链用了裸 `catch {}`。只要是任意异常——包括
DB 故障、DTO 解析错误、runtime-platform 回归、意外 null——最终都会退化成
不可学习空态。这会隐藏真实回归，破坏 compatibility baseline 的 fail-loud 目标。

**Fix:**
只吞掉预期的 access-denied / inaccessible lesson 异常，其余异常直接 rethrow。

```ts
} catch (error) {
  if (error instanceof Error && error.message === "课时暂不可学习") {
    shell = null;
    scope = null;
  } else {
    throw error;
  }
}
```

---

_Reviewed: 2026-05-15T15:23:59Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: deep_
