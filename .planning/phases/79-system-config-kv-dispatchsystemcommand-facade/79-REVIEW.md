---
phase: 79-system-config-kv-dispatchsystemcommand-facade
reviewed: 2026-06-12T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/features/system-commands/facade.ts
  - src/features/system-commands/facade.test.ts
  - src/features/platform-core/plugin-data-access/governance-gate.ts
  - src/features/platform-core/plugin-data-access/audit.ts
  - src/features/system-commands/audit.ts
  - src/features/system-commands/audit.test.ts
  - src/features/system-commands/handler.ts
  - src/features/platform-core/commands/contracts.ts
  - src/features/platform-core/commands/registry.ts
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 79: Code Review Report

**Reviewed:** 2026-06-12
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

对 Phase 79 的 9 个源文件进行了标准深度审查。整体架构质量较高：治理门前置、system.config.set 走 Command Bus + system.config.get 走纯 DAL 读的分派策略、dedupe key 防重放、correlationId 稳定派生不泄漏 config 值、以及所有拒绝点先写 audit 再抛错的模式都执行良好。

发现 **2 个 BLOCKER** 问题、4 个 WARNING 问题和 3 个 INFO 建议。两个 BLOCKER 均为 correctness 级别的问题：system.config.set 对 `configValue` 的空值检查漏掉了 `null` 的情况，以及 `execute()` 中 `lifecycleState` 仅在 audit success 路径使用正确的运行时值而在 redirect/错误路径中硬编码为 `"ready"`。

---

## Critical Issues

### CR-01: `configValue` 空值检查仅对 `=== undefined` 严格匹配，遗漏了 `null`

**File:** `src/features/system-commands/facade.ts:225`
**Issue:** system.config.set 对 `configValue` 的非空检查使用了 `input.configValue === undefined`，但 TypeScript 的类型声明为 `configValue?: unknown`，调用方可能传入 `configValue: null`。`=== undefined` 会放过 `null` 值，导致 `configValue: null` 被当作合法值写入数据库，而实际上 null 意味着"未提供 configValue"。

对比同文件 system.config.get 对 `configKey` 的检查使用了 `== null`（同时覆盖 `null` 和 `undefined`），此处不一致。

```typescript
// 当前代码 (facade.ts:225)
if (input.configValue === undefined) {
  throw new Error("system.config.set requires configValue");
}

// 修复后
if (input.configValue == null) {
  throw new Error("system.config.set requires configValue");
}
```

### CR-02: `execute()` 和 `executeRequest()` 中审计写入的 `lifecycleState` 在重定向/错误路径使用的是硬编码 `"ready"` 而非运行时查询到的真实值

**File:** `src/features/system-commands/handler.ts:506,518,569,620,691`
**Issue:** 在 `execute()` 函数中（第 362-368 行），`lifecycleState` 由 `db.query.pluginRegistrations.findFirst()` 查询得到 `row?.lifecycleState ?? "ready"`，但该变量仅在成功路径（第 400 行）的 audit 写入中使用。所有重定向路径和异常路径中的 audit 写入（`executeRequest()` 内第 518、569、620、691 行）以及在 `systemConfigSetExecute()` 中（第 1056 行）都硬编码为 `"ready"`，导致当插件实际 lifecycle 状态为 `suspended` 或 `disabled` 时，审计记录的 `lifecycleState` 字段不准确。

影响：治理审计记录失真，在排查安全事件时无法准确追溯插件在命令执行时的真实生命周期状态。

**Fix:** 将 `lifecycleState` 作为参数传入 `executeRequest()` 并在所有 audit 写入点使用，同时 systemConfigSetExecute 中也应查询真实 lifecycle 状态：

```typescript
// execute() 中将 lifecycleState 传入 executeRequest
async function executeRequest(
  // ... existing params
  lifecycleState: string,  // 新增参数
): Promise<{...}> {
  // 所有 writeSystemCommandAudit 调用中
  // lifecycleState: lifecycleState  // 使用参数而非 "ready"
}

// 调用侧传入
const result = await executeRequest(
  // ... existing args
  lifecycleState,  // 使用已查询的值
);
```

---

## Warnings

### WR-01: 治理门 `deriveActiveSchoolScope` 异常被 `catch {}` 静默吞没原始错误信息

**File:** `src/features/platform-core/plugin-data-access/governance-gate.ts:53-55`
**Issue:** `try { scope = await deriveActiveSchoolScope(); } catch { ... }` 使用了无参数 catch 块，吞没了 `deriveActiveSchoolScope` 内部抛出的原始错误信息（如 DB 连接失败、schema 异常等），仅抛出通用的 `"actor is not an active in-school teacher"` 错误。原始错误信息在排查根因时完全丢失。

**Fix:** 在 audit 写入后访问原始错误，或至少将原始错误作为 cause 传递：
```typescript
try {
  scope = await deriveActiveSchoolScope();
} catch (originalError) {
  await writeDenial(input, { schoolId: "", lifecycleState: "disabled", killSwitchEnabled: false });
  throw new PluginDataAccessError("non_school_actor_rejected", "actor is not an active in-school teacher");
}
```
或者至少记录原错误：
```typescript
console.error("[governance-gate] deriveActiveSchoolScope failed:", originalError);
```

### WR-02: `resolveSystemConfigManifestEntry` 使用非标准错误抛出方式 —— 抛出带 `code` 属性的纯对象而非 Error 子类

**File:** `src/features/system-commands/handler.ts:854`
**Issue:** 函数在找不到 registration 时使用 `throw { code: "registration_not_found" } as const` 抛出纯对象，而非抛出 Error 实例。虽然调用方通过捕获后检查 `code` 属性来处理，但这种模式：
1. 不符合 JavaScript 的 `throw Error` 惯例
2. 如果调用方有 `catch (e)` 后 `console.error(e.message)` 的通用逻辑会失败
3. 在未预料到此模式的代码路径中可能导致意外行为

**Fix:** 使用自定义 Error 类：
```typescript
class RegistrationNotFoundError extends Error {
  readonly code = "registration_not_found" as const;
  constructor() {
    super("Plugin registration not found");
    this.name = "RegistrationNotFoundError";
  }
}
throw new RegistrationNotFoundError();
```
或复用已有的 `PlatformCommandExecutionError`。

### WR-03: `systemSystemCommandAudit` 的类型签名中 `actorScope` 和 `lifecycleState` 使用宽泛的 `string` 类型

**File:** `src/features/system-commands/audit.ts:11-12`
**Issue:** `SystemCommandAuditInput` 中 `actorScope: string` 和 `lifecycleState: string` 使用了宽泛的 `string` 类型，而对应的 `writePluginDataAccessAudit`（在 `platform-core/plugin-data-access/audit.ts`）使用了明确的 `RuntimeActorScope` 和 `PluginLifecycleState` 枚举类型。这导致类型不匹配的信息丢失，且函数体内需要手动 `as` 类型断言（第 48-62 行）。

虽然函数体内做了运行时转换（`as "host" | "teacher" | ...`），但这仅在值恰好匹配联合类型时才安全。如果调用方传入了未预期的字符串值（如 `"super_admin"`），TypeScript 编译器无法在编译时捕获。

**Fix:**
```typescript
import type { RuntimeActorScope, PluginLifecycleState } from "@/features/runtime-platform/contracts/permissions";

type SystemCommandAuditInput = {
  actorScope: RuntimeActorScope;
  lifecycleState: PluginLifecycleState;
  // ...
};
```
然后可以移除函数体内的 `as` 断言。

### WR-04: `dispatchSystemCommand` facade 中 `projectionRow` 变量声明为 `let projectionRow`（类型推断为 `any`），存在隐式 any 风险

**File:** `src/features/system-commands/facade.ts:198`
**Issue:** `let projectionRow;` 声明无类型注解，TypeScript 将推断为 `any`。虽然实际运行时该变量必在 `try` 块内被赋值（否则进入 catch 抛出），但隐式 any 会降低类型安全性——如果未来重构改变了赋值路径，编译器不会提示错误。

**Fix:**
```typescript
import type { PluginGovernanceProjectionRow } from "@/features/platform-core/plugins/governance-projection";

let schoolId: string;
let projectionRow: PluginGovernanceProjectionRow;  // 显式类型注解
```

---

## Info

### IN-01: `systemConfigHandler` 在 facade.ts 中被导入但未使用

**File:** `src/features/system-commands/facade.ts:13`
**Issue:** `import { ..., systemConfigHandler, } from "./handler";` 导入了 `systemConfigHandler` 对象，但在 `facade.ts` 的代码体中没有任何引用。实际使用是通过 `registry.ts` → `systemConfigHandler["system.config.set"]` 间接使用，facade 本身只使用了 handler 的命名导出 `systemConfigGetAuthorize` 和 `systemConfigGetExecute`。

**Fix:** 从 facade.ts 的 import 中移除 `systemConfigHandler`：
```typescript
import {
  systemConfigGetAuthorize,
  systemConfigGetExecute,
} from "./handler";
```

### IN-02: `platformCommandRegistry` 中 `system.config.get` 的 handler 定义虽然被注册，但其 `dedupe` 字段与实际使用场景语义不匹配

**File:** `src/features/platform-core/commands/registry.ts:162-170`
**Issue:** `platformCommandRegistry` 注册了 `system.config.set` 并正确标记为 `dedupe: "required"`，但 registry 中 **没有** `system.config.get` 的条目。这是故意设计（system.config.get 不走 Command Bus），但 registry 通过 `satisfies Record<PlatformCommandType, PlatformCommandDefinition>` 验证，而 `SystemCommandTypes` 中明确排除了 `system.config.get`，`PlatformCommandType` 也不包含它。这一设计正确但不够直观，缺少注释解释为何 registry 中只有 `system.config.set`。

同时 `handler.ts` 中 `systemConfigHandler` 对象仍然导出了 `"system.config.get"` 的 handler，但该 handler 中的 `execute` 函数永远不会通过 Command Bus 被调用（只能通过 facade 直接调用 `systemConfigGetExecute`），造成了一定程度的死代码。

**Fix:** 在 `registry.ts` 的 `system.config.set` 条目上方添加注释说明 system.config.get 的排除原因：
```typescript
// system.config.set only — system.config.get is a pure DAL read
// dispatched directly by facade, not through the Command Bus
"system.config.set": createPlatformCommandDefinition({...}),
```

### IN-03: `configKey` 检查在 facade 中使用 `== null` 但 `configValue` 使用 `=== undefined` —— 风格不一致（已在 CR-01 中修复）

**File:** `src/features/system-commands/facade.ts:220,225,286`
**Issue:** 同文件内，`system.config.set` 对 `configKey` 的检查在第 220 行使用了 `input.configKey == null`（正确的同时覆盖 `null` 和 `undefined`），而 `configValue` 在第 225 行使用了 `input.configValue === undefined`。虽然这已在 CR-01 中标记为 BLOCKER，但从代码风格角度也应统一两处的检查方式。

**Fix:** （与 CR-01 相同修复）统一使用 `== null` 进行空值检查。

---

_Reviewed: 2026-06-12T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
