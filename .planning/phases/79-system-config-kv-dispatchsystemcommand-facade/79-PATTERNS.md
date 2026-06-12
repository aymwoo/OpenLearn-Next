# Phase 79: system.config KV 配置 + dispatchSystemCommand facade - Pattern Map

**Mapped:** 2026-06-12
**Files analyzed:** 5 (2 new, 3 modified)
**Analogs found:** 5 / 5

## File Classification

| 新/修改文件 | 角色 | 数据流 | 最近模拟 | 匹配质量 |
|------------|------|--------|----------|----------|
| `src/features/system-commands/facade.ts` (新增) | facade/controller | request-response (治理门→派发) | `src/features/platform-core/plugin-data-access/facade.ts` | exact |
| `src/features/system-commands/handler.ts` (扩展) | handler/service | request-response (authorize/execute) | `src/features/system-commands/handler.ts` (Phase 78, `system.http.request`) | exact |
| `src/features/system-commands/audit.ts` (扩展) | audit/utility | 审计写入 | `src/features/platform-core/plugin-data-access/audit.ts` (writePluginDataAccessAudit) | exact |
| `src/features/platform-core/plugin-data-access/governance-gate.ts` (修改) | middleware/gate | request-response | 自身 (type signature 泛化) | same-file |
| `src/features/platform-core/commands/registry.ts` (修改) | config/registry | request-response | 自身的 `system.http.request` 注册 (line 153-161) | exact |

---

## Pattern Assignments

### 1. `src/features/system-commands/facade.ts` (facade, request-response)

**模拟:** `src/features/platform-core/plugin-data-access/facade.ts`

**导入模式** (lines 1-14):
```typescript
import "server-only";

import { createHash } from "node:crypto";

import { PluginDataAccessError } from "./allowlist";
import type { PluginDataAccessInput } from "./contracts";
import { assertActionExecutable } from "./governance-gate";
import {
  aggregate,
  count,
  getByIndex,
  type ReadVerbAuditContext,
} from "./read-verbs";
```

Phase 79 facade 的导入模式:
```typescript
import "server-only";

import { createHash } from "node:crypto";

import { assertActionExecutable } from "@/features/platform-core/plugin-data-access/governance-gate";
import { writeSystemCommandAudit } from "./audit";
// handler 导入: system.config.set 的 authorize/execute（经 registry 注册），
// system.config.get 的 authorize/execute（直接调用，不过 Command Bus）
import { systemConfigGetAuthorize, systemConfigGetExecute } from "./handler";
import {
  dispatchPlatformCommand,
  type PlatformCommandStore,
} from "@/features/platform-core/commands/bus";
import { defaultInProcessPlatformEventAdapter } from "@/features/platform-core/events/adapters/in-process";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { platformCommands, platformCommandAttempts } from "@/db/schema";
import type {
  PlatformCommand,
  PlatformCommandDispatchResult,
  PlatformCommandType,
} from "@/features/platform-core/commands/contracts";
```

**Governance gate 模式** (lines 43-51):
```typescript
// ① 治理门前置：schoolId 由认证 session 派生注入，绝不取 input.schoolId（SC2 / D-11）。
const correlationId = buildFacadeCorrelationId(input);
const { schoolId, projectionRow } = await assertActionExecutable({
  actorId: input.actor,
  pluginKey: input.pluginKey,
  verb: input.verb,
  correlationId,
});
```

Phase 79: verb 参数从 `PluginDataAccessVerb` 泛化为 `string` 后，直接把 `commandType` 传入即可。

**Discriminated dispatch 模式** (lines 64-118):
```typescript
// ③ 判别派发（D-01）：写经 Command Bus producer、读直连受治理 DAL。
switch (input.verb) {
  case "insert":
    return producePluginDataInsert({ ... });
  case "upsert":
    return producePluginDataUpsert({ ... });
  case "getByIndex":
    return getByIndex({ ... });
  case "count":
    return count({ ... });
  case "aggregate":
    return aggregate({ ... });
  default:
    throw new PluginDataAccessError("invalid_payload_rejected", ...);
}
```

Phase 79 派发模式 (if/else 分支，三个 commandType):
```typescript
// ② 判别派发
if (input.commandType === "system.config.set") {
  // 构造 PlatformCommand envelope → dispatchPlatformCommand
  // → handler.authorize + handler.execute (经 Command Bus 管道)
  const result = await dispatchPlatformCommand(
    { id: commandId, type: "system.config.set", actor, scope, payload, correlation, audit, dedupeKey },
    { store: platformCommandStore, definitions: platformCommandRegistry, publicationPort: defaultInProcessPlatformEventAdapter },
  );
  // ...
}

if (input.commandType === "system.config.get") {
  // 纯读：handler.authorize（manifest re-parse）→ handler.execute（DAL 查询）
  await systemConfigGetAuthorize({ pluginId, schoolId, configKey });
  return systemConfigGetExecute({ pluginId, schoolId, configKey });
}

// system.http.request – Phase 78 已有路径，透传（或不需要 facade 处理，已有独立入口）
```

**correlationId 派生模式** (lines 122-125):
```typescript
/** 由动词 + actor + 目标插件/表稳定派生 correlationId（治理审计 / producer 关联复用）。 */
function buildFacadeCorrelationId(input: PluginDataAccessInput): string {
  const base = `plugin-data-access:${input.verb}:${input.actor}:${input.pluginKey}:${input.table}`;
  return createHash("sha256").update(base).digest("hex");
}
```

Phase 79 的 correlationId 派生:
```typescript
function buildSystemCommandCorrelationId(input: { commandType: string; pluginKey: string; actorId: string }): string {
  const base = `system-cmd:${input.commandType}:${input.actorId}:${input.pluginKey}`;
  return createHash("sha256").update(base).digest("hex");
}
```

**错误处理模式** — facade 层面:
- `assertActionExecutable` 被拒绝时，governance-gate.ts 的 `writeDenial` 内部已写 audit + 抛 `PluginDataAccessError`，facade 层不需要额外 catch。
- Phase 79 facade 需要处理 handler 层的拒绝（`system.config.get` 路径手动 catch handler 抛出的 `PlatformCommandExecutionError` 并重新包装）。

---

### 2. `src/features/system-commands/handler.ts` (扩展: system.config.set + system.config.get, handler/service)

**模拟:** 自身的 `system.http.request` authorize/execute 模式 (lines 125-789)

**导入模式** (lines 1-14):
```typescript
import "server-only";
import { db } from "@/db";
import { pluginRegistrations } from "@/db/schema";
import { PluginManifestSchema } from "@/lib/dto/resource-ai";
import { eq, and } from "drizzle-orm";
import {
  PlatformCommandExecutionError,
  type PlatformCommand,
  type PlatformCommandExecutionResult,
} from "@/features/platform-core/commands/contracts";
import { writeSystemCommandAudit } from "./audit";
import type { z } from "zod";
// system.config 新增:
import { pluginOwnedBusinessData } from "@/db/schema";
import { sql } from "drizzle-orm";
```

**authorize 核心模式** — manifest re-parse (lines 125-324):
```typescript
async function authorize({
  command,
}: {
  command: PlatformCommand;
}): Promise<MatchedHttpRequestEntry> {
  const sysCmd = command as SystemHttpRequestCommand;
  const payload = sysCmd.payload;
  const pluginId = command.scope.pluginId;
  const schoolId = command.scope.schoolId;

  // D-04: Query pluginRegistrations for manifestJson
  const row = await db.query.pluginRegistrations.findFirst({
    where: and(
      eq(pluginRegistrations.id, pluginId),
      eq(pluginRegistrations.schoolId, schoolId),
    ),
  });

  if (!row) {
    await writeSystemCommandAudit({
      pluginId, schoolId, commandId: command.id,
      actorId: command.actor.actorId,
      actorScope: command.actor.actorScope,
      lifecycleState: "ready",
      correlationId: command.correlation.correlationId,
      decision: "denied",
      reasonCode: "not_allowlisted",
      payloadJson: { url: payload.url, method: payload.method },
    });
    throw new PlatformCommandExecutionError({ ... });
  }

  // D-04: Parse manifest
  const manifest = PluginManifestSchema.parse(row.manifestJson);
  const systemCommands = manifest.systemCommands ?? [];
  const lifecycleState = row.lifecycleState ?? "ready";

  // Filter for matching entries (system.http.request → system.config)
  const configEntries = systemCommands.filter(
    (entry): entry is typeof entry & { command: "system.config" } =>
      entry.command === "system.config",
  );

  if (configEntries.length === 0) {
    // deny + audit
  }

  // allowedKeys 匹配循环
  for (const entry of configEntries) {
    for (const allowedKey of entry.allowedKeys) {
      if (matchConfigKey(allowedKey, configKey)) return; // authorized
    }
  }

  // No match → deny + audit + throw
}
```

**execute 核心模式** — system.config.set (lines 343-489, 镜像 system.http.request execute):
```typescript
async function execute({
  command,
  attemptNumber: _attemptNumber,
}: {
  command: PlatformCommand;
  attemptNumber: number;
}): Promise<PlatformCommandExecutionResult> {
  const sysCmd = command as SystemCommand;
  const pluginId = command.scope.pluginId;
  const schoolId = command.scope.schoolId;
  const configKey = (command.payload as SystemConfigSetPayload).configKey;
  const configValue = (command.payload as SystemConfigSetPayload).configValue;

  // 构造隔离 key：{schoolId}:{pluginId}:{configKey}
  const storageKey = `${schoolId}:${pluginId}:${configKey}`;

  // 直接操作 pluginOwnedBusinessData (不经过 producer)
  await db
    .insert(pluginOwnedBusinessData)
    .values({ schoolId, pluginId, key: storageKey, payloadJson: configValue })
    .onConflictDoUpdate({
      target: [pluginOwnedBusinessData.schoolId, pluginOwnedBusinessData.pluginId, pluginOwnedBusinessData.key],
      set: {
        payloadJson: sql`excluded.payloadJson`,
        updatedAt: sql`excluded.updatedAt`,
      },
    });

  // Success audit
  await writeSystemCommandAudit({
    pluginId, schoolId, commandId: command.id,
    actorId: command.actor.actorId,
    actorScope: command.actor.actorScope,
    lifecycleState: "ready",
    correlationId: command.correlation.correlationId,
    decision: "allowed",
    commandType: "system.config.set",
    payloadJson: { configKey, byteLength: JSON.stringify(configValue).length },
  });

  return successResult({ configKey, pluginId, schoolId });
}
```

**successResult helper** (lines 101-109):
```typescript
function successResult(summary: Record<string, unknown>): PlatformCommandExecutionResult {
  return {
    resultSummary: summary,
    invalidation: { tags: [] },
    emittedEvents: [],
    failureEvent: null,
    failureAttribution: null,
  };
}
```

**system.config.get 的 authorize + execute** (纯 DAL 读，不过 Command Bus):
```typescript
// system.config.get authorize —— 镜像 set authorize 的 manifest re-parse 逻辑
async function systemConfigGetAuthorize({
  pluginId, schoolId, configKey
}: {
  pluginId: string; schoolId: string; configKey: string;
}): Promise<void> {
  const row = await db.query.pluginRegistrations.findFirst({
    where: and(
      eq(pluginRegistrations.id, pluginId),
      eq(pluginRegistrations.schoolId, schoolId),
    ),
  });
  if (!row) throw new Error("...");
  const manifest = PluginManifestSchema.parse(row.manifestJson);
  // ... filtered allowedKeys matching ...
  // 不匹配: 写 writeSystemCommandAudit("denied", "config_key_denied") + throw
}

// system.config.get execute —— 直接 DAL 查询
async function systemConfigGetExecute({
  pluginId, schoolId, configKey
}: {
  pluginId: string; schoolId: string; configKey: string;
}): Promise<unknown | null> {
  const storageKey = `${schoolId}:${pluginId}:${configKey}`;
  const row = await db.query.pluginOwnedBusinessData.findFirst({
    where: and(
      eq(pluginOwnedBusinessData.schoolId, schoolId),
      eq(pluginOwnedBusinessData.pluginId, pluginId),
      eq(pluginOwnedBusinessData.key, storageKey),
    ),
    columns: { payloadJson: true },
  });
  return row?.payloadJson ?? null;
}
```

**matchConfigKey** 函数 (镜像 `matchDomain` lines 84-95):
```typescript
function matchConfigKey(pattern: string, key: string): boolean {
  if (pattern.endsWith(":*")) {
    const prefix = pattern.slice(0, -2);
    return key.startsWith(prefix + ":") && !key.slice(prefix.length + 1).includes(":");
  }
  return pattern === key;
}
```

**ConfigKey Zod Schema** — handler 层的独立 schema（不同于 manifest 的 KEY_PATTERN）:
```typescript
const ConfigKeySchema = z.string().min(1).max(256)
  .refine(k => !k.includes(":"), "config key must not contain colon");
```

**导出模式** (lines 787-789, D-17):
```typescript
// Phase 78 已有导出
export const systemHttpRequestHandler = {
  "system.http.request": { authorize, execute },
};

// Phase 79 新增导出
export const systemConfigHandler = {
  "system.config.set": { authorize: systemConfigSetAuthorize, execute: systemConfigSetExecute },
  "system.config.get": { authorize: systemConfigGetAuthorize, execute: systemConfigGetExecute },
};
```

**PlatformCommandExecutionError 构造模式** (lines 156-181):
```typescript
throw new PlatformCommandExecutionError({
  message: "Plugin registration not found",
  failureAttribution: {
    scope: "plugin",
    pluginId,
    reasonCode: "not_allowlisted",
    recommendedRecoveryAction: "install_plugin",
  },
  failureEvent: {
    eventType: "platform.command.failed",
    category: "outcome",
    aggregateType: "plugin",
    aggregateId: pluginId,
    payload: {
      commandType: "system.http.request",
      reasonCode: "not_allowlisted",
      failureAttribution: {
        scope: "plugin", pluginId,
        reasonCode: "not_allowlisted",
        recommendedRecoveryAction: "install_plugin",
      },
    },
    audit: command.audit,
  },
});
```

Phase 79 的拒绝错误构造:
```typescript
throw new PlatformCommandExecutionError({
  message: `Config key "${configKey}" not in manifest allowedKeys`,
  failureAttribution: {
    scope: "plugin",
    pluginId,
    reasonCode: "config_key_denied",
    recommendedRecoveryAction: "update_manifest_allowed_keys",
  },
  failureEvent: {
    eventType: "platform.command.failed",
    category: "outcome",
    aggregateType: "plugin",
    aggregateId: pluginId,
    payload: {
      commandType: "system.config.set",   // 或 "system.config.get"
      reasonCode: "config_key_denied",
      failureAttribution: {
        scope: "plugin", pluginId,
        reasonCode: "config_key_denied",
        recommendedRecoveryAction: "update_manifest_allowed_keys",
      },
    },
    audit: command.audit,
  },
});
```

---

### 3. `src/features/system-commands/audit.ts` (扩展: action 参数化, audit/utility)

**模拟:** 自身的 `writeSystemCommandAudit` (lines 1-69) + `src/features/platform-core/plugin-data-access/audit.ts` (lines 1-67)

**当前 audit 函数** (lines 33-68):
```typescript
export async function writeSystemCommandAudit(
  input: SystemCommandAuditInput,
): Promise<void> {
  await db.insert(governanceAudits).values({
    targetType: "plugin" as const,
    targetId: input.pluginId ?? "",
    pluginId: input.pluginId,
    schoolId: input.schoolId,
    commandId: input.commandId ?? null,
    action: "system.http.request",       // ← 硬编码，Phase 79 参数化
    decision: input.decision,
    reasonCode: input.reasonCode ?? null,
    actorId: input.actorId,
    actorScope: input.actorScope as RuntimeActorScope,
    lifecycleState: input.lifecycleState as PluginLifecycleState,
    killSwitchEnabled: false,
    requestedCapabilitiesJson: [],
    grantedCapabilitiesJson: [],
    requiredPermission: null,
    correlationId: input.correlationId,
    payloadJson: input.payloadJson,
  });
}
```

Phase 79 扩展: 添加 `commandType` 参数，`action` 字段使用传入的 `commandType`:
```typescript
type SystemCommandAuditInput = {
  pluginId: string | null;
  schoolId: string;
  commandId: string | null;
  actorId: string;
  actorScope: string;
  lifecycleState: string;
  correlationId: string;
  decision: "allowed" | "denied";
  reasonCode?: string | null;
  commandType: "system.http.request" | "system.config.set" | "system.config.get";  // Phase 79 新增参数
  payloadJson: Record<string, unknown>;
};

export async function writeSystemCommandAudit(
  input: SystemCommandAuditInput,
): Promise<void> {
  await db.insert(governanceAudits).values({
    targetType: "plugin" as const,
    targetId: input.pluginId ?? "",
    pluginId: input.pluginId,
    schoolId: input.schoolId,
    commandId: input.commandId ?? null,
    action: input.commandType,   // ← Phase 79: 参数化，直接使用 commandType
    decision: input.decision,
    reasonCode: input.reasonCode ?? null,
    actorId: input.actorId,
    actorScope: input.actorScope as RuntimeActorScope,
    lifecycleState: input.lifecycleState as PluginLifecycleState,
    killSwitchEnabled: false,
    requestedCapabilitiesJson: [],
    grantedCapabilitiesJson: [],
    requiredPermission: null,
    correlationId: input.correlationId,
    payloadJson: input.payloadJson,
  });
}
```

**兼容性:** Phase 78 的 `system.http.request` 调用处需添加 `commandType: "system.http.request"` 参数——向后兼容的变更（所有现有调用处都需要显式传入 commandType）。

**审计输入类型引用:** 镜像 `writePluginDataAccessAudit` 的 `RuntimeActorScope` 和 `PluginLifecycleState` cast 模式（`plugin-data-access/audit.ts` line 46-60）。

---

### 4. `src/features/platform-core/plugin-data-access/governance-gate.ts` (修改: verb 参数泛化)

**修改位置:** line 43-48, line 126 的 `writeDenial` 签名

**当前签名** (lines 43-48):
```typescript
export async function assertActionExecutable(input: {
  actorId: string;
  pluginKey: string;
  verb: PluginDataAccessVerb;   // ← 泛化目标: 改为 string
  correlationId: string;
  commandId?: string | null;
}): Promise<AssertActionExecutableResult> {
```

**泛化后签名:**
```typescript
export async function assertActionExecutable(input: {
  actorId: string;
  pluginKey: string;
  verb: string;                  // ← 从 PluginDataAccessVerb 泛化为 string
  correlationId: string;
  commandId?: string | null;
}): Promise<AssertActionExecutableResult> {
```

**writeDenial 的 `verb` 参数同步变更** (line 126):
```typescript
async function writeDenial(
  input: { actorId: string; pluginKey: string; verb: string; correlationId: string; commandId?: string | null },
  //                              ^^^^ 从 PluginDataAccessVerb 改为 string
  detail: { ... },
) {
  await writePluginDataAccessAudit({
    pluginId: detail.pluginId ?? null,
    schoolId: detail.schoolId,
    verb: input.verb,       // writePluginDataAccessAudit 的 verb 字段也需泛化
    // ...
  });
}
```

**导入变更 (line 14):**
```typescript
// 移除:
import type { PluginDataAccessVerb } from "./contracts";
// 如果函数内不再需要 PluginDataAccessVerb 类型，可直接删除此导入
```

**向后兼容:** `dispatchPluginDataAccess` 调用 `assertActionExecutable({ verb: input.verb })` 时，`input.verb` 的类型仍然是 `PluginDataAccessVerb`（是 `string` 的子类型），TypeScript 会自动兼容。不需要修改任何调用方代码。

**连带变更:** `writePluginDataAccessAudit` 的 `verb` 参数类型也需要从 `PluginDataAccessVerb` 泛化为 `string`（`plugin-data-access/audit.ts` line 40）。

---

### 5. `src/features/platform-core/commands/registry.ts` (修改: 替换 system.config.set stub)

**修改位置:** lines 162-172

**当前 stub** (lines 162-172):
```typescript
"system.config.set": createPlatformCommandDefinition({
  commandType: "system.config.set",
  payloadSchema: PlatformCommandPayloadSchemas["system.config.set"],
  dedupe: "required",
  // TODO Phase 79: validate manifest allowedKeys against configKey, schoolId injection
  authorize: async () => {},
  // TODO Phase 79: KV config write via Command Bus producer
  execute: async () => {
    throw new Error("system.config.set handler not implemented — Phase 79");
  },
}),
```

**替换为真实 handler** (镜像 `system.http.request` 的注册模式, lines 153-161):
```typescript
// Phase 79: 导入 system.config handler
import { systemConfigHandler } from "@/features/system-commands/handler";

// 注册列表中的替换：
"system.config.set": createPlatformCommandDefinition({
  commandType: "system.config.set",
  payloadSchema: PlatformCommandPayloadSchemas["system.config.set"],
  dedupe: "required",
  authorize: async (input: { command: PlatformCommand }) => {
    await systemConfigHandler["system.config.set"].authorize(input);
  },
  execute: systemConfigHandler["system.config.set"].execute,
}),
```

**system.http.request 模拟模式** (lines 153-161):
```typescript
"system.http.request": createPlatformCommandDefinition({
  commandType: "system.http.request",
  payloadSchema: PlatformCommandPayloadSchemas["system.http.request"],
  dedupe: "required",
  authorize: async (input: { command: PlatformCommand }) => {
    await systemHttpRequestHandler["system.http.request"].authorize(input);
  },
  execute: systemHttpRequestHandler["system.http.request"].execute,
}),
```

注意 `authorize` 使用了 wrapper `async (input: { command: PlatformCommand }) => { await handler.authorize(input); }` 模式——而不是直接引用。这是因为 handler 的 authorize 返回 `Promise<MatchedEntry>` 而非 `Promise<void>`（Phase 78 handler 的 authorize 返回 match result 供 execute 复用）。对于 `system.config.set`，authorize 返回 void 即可（无 redirect re-validation 需求）。

---

## Shared Patterns

### 授权 / 治理门

**来源:** `src/features/platform-core/plugin-data-access/governance-gate.ts`
**应用于:** `src/features/system-commands/facade.ts`
```typescript
// 治理门后置: schoolId 仅由 session 派生注入，绝不从 payload 读取
const { schoolId, projectionRow } = await assertActionExecutable({
  actorId: input.actorId,
  pluginKey: input.pluginKey,
  verb: input.commandType,  // Phase 79: 泛化为 string
  correlationId,
});
```

### 审计写入

**来源:** `src/features/system-commands/audit.ts` (Phase 78 现有 + Phase 79 扩展)
**应用于:** `src/features/system-commands/handler.ts`, `src/features/system-commands/facade.ts`
```typescript
// 所有 deny 点: 先写 audit 再抛错
await writeSystemCommandAudit({
  pluginId, schoolId, commandId: command.id,
  actorId: command.actor.actorId,
  actorScope: command.actor.actorScope,
  lifecycleState,
  correlationId: command.correlation.correlationId,
  decision: "denied",
  reasonCode: "config_key_denied",  // 或其他具名拒因码
  commandType: "system.config.set",  // Phase 79: 参数化
  payloadJson: { configKey },
});
throw new PlatformCommandExecutionError({ ... });
```

### 错误处理

**来源:** `src/features/platform-core/commands/contracts.ts` (lines 411-426)
**应用于:** 所有 handler authorize/execute 拒绝路径
```typescript
throw new PlatformCommandExecutionError({
  message: "...",
  failureAttribution: {
    scope: "plugin",
    pluginId,
    reasonCode: "config_key_denied",
    recommendedRecoveryAction: "update_manifest_allowed_keys",
  },
  failureEvent: {
    eventType: "platform.command.failed",
    category: "outcome",
    aggregateType: "plugin",
    aggregateId: pluginId,
    payload: { commandType: "system.config.set", reasonCode: "config_key_denied", failureAttribution: { ... } },
    audit: command.audit,
  },
});
```

### Manifest re-parse (每次调用)

**来源:** `src/features/system-commands/handler.ts` (lines 135-186)
**应用于:** system.config.set 和 system.config.get handler 的 authorize
```typescript
const row = await db.query.pluginRegistrations.findFirst({
  where: and(eq(pluginRegistrations.id, pluginId), eq(pluginRegistrations.schoolId, schoolId)),
});
const manifest = PluginManifestSchema.parse(row.manifestJson);
const systemCommands = manifest.systemCommands ?? [];
const configEntries = systemCommands.filter(
  (entry): entry is typeof entry & { command: "system.config" } =>
    entry.command === "system.config",
);
```

### 拒因码

**来源:** `src/features/runtime-platform/contracts/permissions.ts` (line 43)
**应用于:** handler authorize 拒绝、facade 治理门拒绝
- `config_key_denied` — key 不在 manifest allowedKeys 白名单
- `lifecycle_blocked` — 插件 lifecycle 不可执行（由 governance-gate 抛出）
- `kill_switch` — kill-switch 已启用（由 governance-gate 抛出）

---

## No Analog Found

无——所有 5 个文件都在代码库中有 exact 或 same-file 模拟。

---

## 元数据

**模拟搜索范围:**
- `src/features/system-commands/` — Phase 78 handler + audit
- `src/features/platform-core/plugin-data-access/` — facade + governance-gate + audit
- `src/features/platform-core/commands/` — registry + contracts + bus + producers
- `src/lib/dto/resource-ai.ts` — SystemCommandDiscriminatedSchema + PluginManifestSchema
- `src/db/schema.ts` — pluginOwnedBusinessData 表定义
- `src/features/runtime-platform/contracts/permissions.ts` — GovernanceDeniedReasonValues

**文件扫描:** 13 个源文件读取
**模式提取日期:** 2026-06-12
